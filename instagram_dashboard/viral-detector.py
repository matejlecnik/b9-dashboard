#!/usr/bin/env python3
"""
Instagram Viral Content Detector
Identifies viral content based on 50k+ views AND 5x creator average
"""
import os
import sys
import logging
from datetime import datetime, timezone
from typing import Dict, List, Any
from dotenv import load_dotenv

from supabase import create_client, Client

# Load environment variables
load_dotenv()

# Configuration
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

# Viral criteria
MIN_VIEWS_FOR_VIRAL = 50000  # Minimum 50k views
MULTIPLIER_THRESHOLD = 5.0   # Must be 5x creator's average

# Logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s %(levelname)s %(message)s',
    handlers=[logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger(__name__)

def get_supabase() -> Client:
    """Get Supabase client instance"""
    if not SUPABASE_URL or not SUPABASE_KEY:
        raise RuntimeError("Missing Supabase configuration")
    return create_client(SUPABASE_URL, SUPABASE_KEY)

def log_to_supabase(supabase: Client, action: str, details: Dict = None, success: bool = True):
    """Log activity to Supabase"""
    try:
        log_entry = {
            "script_name": "viral-detector",
            "action": action,
            "success": success,
            "details": details or {},
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        supabase.table("instagram_scraper_logs").insert(log_entry).execute()
    except Exception as e:
        logger.warning(f"Failed to log to Supabase: {e}")

def update_creator_avg_views(supabase: Client) -> int:
    """Update average views cache for all approved creators"""
    logger.info("Updating creator average views cache...")

    try:
        # Get all approved creators
        creators_result = supabase.table("instagram_creators")\
            .select("ig_user_id")\
            .eq("review_status", "ok")\
            .execute()

        creators = creators_result.data if creators_result.data else []
        updated_count = 0

        for creator in creators:
            creator_id = creator['ig_user_id']

            # Calculate average views from reels
            reels_result = supabase.table("instagram_reels")\
                .select("play_count")\
                .eq("creator_id", creator_id)\
                .execute()

            if reels_result.data:
                play_counts = [r['play_count'] for r in reels_result.data if r.get('play_count')]
                if play_counts:
                    avg_views = sum(play_counts) / len(play_counts)

                    # Update creator's cached average
                    supabase.table("instagram_creators")\
                        .update({"avg_views_per_reel_cached": round(avg_views, 2)})\
                        .eq("ig_user_id", creator_id)\
                        .execute()

                    updated_count += 1
                    logger.debug(f"Updated {creator_id} avg views: {avg_views:.2f}")

        logger.info(f"Updated average views for {updated_count} creators")
        return updated_count

    except Exception as e:
        logger.error(f"Error updating creator averages: {e}")
        return 0

def detect_viral_reels(supabase: Client) -> Dict[str, int]:
    """Detect viral reels based on criteria"""
    logger.info("Detecting viral reels...")

    try:
        # Get all reels with creator average views
        query = """
            SELECT
                r.id,
                r.media_pk,
                r.creator_id,
                r.creator_username,
                r.play_count,
                r.is_viral,
                c.avg_views_per_reel_cached
            FROM instagram_reels r
            JOIN instagram_creators c ON r.creator_id = c.ig_user_id
            WHERE c.avg_views_per_reel_cached IS NOT NULL
            AND c.avg_views_per_reel_cached > 0
        """

        # Since we can't run raw SQL, let's fetch the data differently
        # First get creators with avg views
        creators_result = supabase.table("instagram_creators")\
            .select("ig_user_id, avg_views_per_reel_cached")\
            .not_.is_("avg_views_per_reel_cached", None)\
            .gt("avg_views_per_reel_cached", 0)\
            .execute()

        creator_avgs = {c['ig_user_id']: c['avg_views_per_reel_cached']
                        for c in (creators_result.data or [])}

        if not creator_avgs:
            logger.info("No creators with average views found")
            return {"newly_viral": 0, "total_viral": 0}

        # Get reels for these creators
        reels_result = supabase.table("instagram_reels")\
            .select("*")\
            .in_("creator_id", list(creator_avgs.keys()))\
            .execute()

        reels = reels_result.data if reels_result.data else []

        newly_viral = 0
        total_viral = 0
        updates = []

        for reel in reels:
            creator_id = reel['creator_id']
            play_count = reel.get('play_count', 0)
            creator_avg = creator_avgs.get(creator_id, 0)

            if creator_avg > 0:
                multiplier = play_count / creator_avg

                # Check if meets viral criteria
                is_viral_now = (
                    play_count >= MIN_VIEWS_FOR_VIRAL and
                    multiplier >= MULTIPLIER_THRESHOLD
                )

                # Check if status changed
                was_viral = reel.get('is_viral', False)

                if is_viral_now:
                    total_viral += 1

                    if not was_viral:
                        newly_viral += 1
                        logger.info(f"New viral reel: {reel['creator_username']} - "
                                  f"{play_count:,} views ({multiplier:.1f}x average)")

                    # Prepare update
                    updates.append({
                        "id": reel['id'],
                        "is_viral": True,
                        "viral_multiplier": round(multiplier, 2),
                        "viral_detected_at": datetime.now(timezone.utc).isoformat() if not was_viral else reel.get('viral_detected_at')
                    })
                elif was_viral:
                    # No longer viral
                    updates.append({
                        "id": reel['id'],
                        "is_viral": False,
                        "viral_multiplier": round(multiplier, 2)
                    })

        # Batch update viral status
        if updates:
            for update in updates:
                reel_id = update.pop('id')
                supabase.table("instagram_reels")\
                    .update(update)\
                    .eq("id", reel_id)\
                    .execute()

        logger.info(f"Found {newly_viral} newly viral reels, {total_viral} total viral")
        return {"newly_viral": newly_viral, "total_viral": total_viral}

    except Exception as e:
        logger.error(f"Error detecting viral reels: {e}")
        return {"newly_viral": 0, "total_viral": 0}

def detect_viral_posts(supabase: Client) -> Dict[str, int]:
    """Detect viral posts based on engagement metrics"""
    logger.info("Detecting viral posts...")

    try:
        # Get creators with avg views
        creators_result = supabase.table("instagram_creators")\
            .select("ig_user_id, avg_views_per_reel_cached")\
            .not_.is_("avg_views_per_reel_cached", None)\
            .gt("avg_views_per_reel_cached", 0)\
            .execute()

        creator_avgs = {c['ig_user_id']: c['avg_views_per_reel_cached']
                        for c in (creators_result.data or [])}

        if not creator_avgs:
            logger.info("No creators with average views found")
            return {"newly_viral": 0, "total_viral": 0}

        # Get posts for these creators
        posts_result = supabase.table("instagram_posts")\
            .select("*")\
            .in_("creator_id", list(creator_avgs.keys()))\
            .execute()

        posts = posts_result.data if posts_result.data else []

        newly_viral = 0
        total_viral = 0
        updates = []

        for post in posts:
            creator_id = post['creator_id']
            # For posts, use engagement as proxy for views
            engagement = (post.get('like_count', 0) +
                         post.get('comment_count', 0) +
                         post.get('save_count', 0))
            creator_avg = creator_avgs.get(creator_id, 0)

            if creator_avg > 0:
                multiplier = engagement / creator_avg

                # Check if meets viral criteria
                is_viral_now = (
                    engagement >= MIN_VIEWS_FOR_VIRAL and
                    multiplier >= MULTIPLIER_THRESHOLD
                )

                # Check if status changed
                was_viral = post.get('is_viral', False)

                if is_viral_now:
                    total_viral += 1

                    if not was_viral:
                        newly_viral += 1
                        logger.info(f"New viral post: {post['creator_username']} - "
                                  f"{engagement:,} engagement ({multiplier:.1f}x average)")

                    # Prepare update
                    updates.append({
                        "id": post['id'],
                        "is_viral": True,
                        "viral_multiplier": round(multiplier, 2),
                        "viral_detected_at": datetime.now(timezone.utc).isoformat() if not was_viral else post.get('viral_detected_at')
                    })
                elif was_viral:
                    # No longer viral
                    updates.append({
                        "id": post['id'],
                        "is_viral": False,
                        "viral_multiplier": round(multiplier, 2)
                    })

        # Batch update viral status
        if updates:
            for update in updates:
                post_id = update.pop('id')
                supabase.table("instagram_posts")\
                    .update(update)\
                    .eq("id", post_id)\
                    .execute()

        logger.info(f"Found {newly_viral} newly viral posts, {total_viral} total viral")
        return {"newly_viral": newly_viral, "total_viral": total_viral}

    except Exception as e:
        logger.error(f"Error detecting viral posts: {e}")
        return {"newly_viral": 0, "total_viral": 0}

def main():
    """Main execution"""
    supabase = get_supabase()
    logger.info("Starting viral content detection...")

    # Update creator average views first
    updated_creators = update_creator_avg_views(supabase)

    # Detect viral reels
    reels_stats = detect_viral_reels(supabase)

    # Detect viral posts
    posts_stats = detect_viral_posts(supabase)

    # Summary
    total_newly_viral = reels_stats['newly_viral'] + posts_stats['newly_viral']
    total_viral = reels_stats['total_viral'] + posts_stats['total_viral']

    logger.info(f"Viral detection complete: {total_newly_viral} new, {total_viral} total viral content")

    # Log to database
    log_to_supabase(
        supabase,
        "viral_detection_complete",
        details={
            "creators_updated": updated_creators,
            "reels_newly_viral": reels_stats['newly_viral'],
            "reels_total_viral": reels_stats['total_viral'],
            "posts_newly_viral": posts_stats['newly_viral'],
            "posts_total_viral": posts_stats['total_viral'],
            "total_newly_viral": total_newly_viral,
            "total_viral": total_viral
        },
        success=True
    )

    print(f"\n✅ Viral Detection Summary:")
    print(f"   - Updated {updated_creators} creator averages")
    print(f"   - Found {reels_stats['newly_viral']} new viral reels ({reels_stats['total_viral']} total)")
    print(f"   - Found {posts_stats['newly_viral']} new viral posts ({posts_stats['total_viral']} total)")
    print(f"   - Criteria: {MIN_VIEWS_FOR_VIRAL:,}+ views AND {MULTIPLIER_THRESHOLD}x creator average")

if __name__ == "__main__":
    main()