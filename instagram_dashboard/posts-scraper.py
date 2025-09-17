#!/usr/bin/env python3
"""
Instagram Posts Scraper for Supabase
Fetches and stores Instagram posts (photos, videos, carousels) using RapidAPI
"""
import os
import sys
import time
import logging
import random
from typing import Any, Dict, List, Optional, Tuple
from datetime import datetime, timezone
from dotenv import load_dotenv

import requests
from tenacity import retry, stop_after_attempt, retry_if_exception, wait_random_exponential
from supabase import create_client, Client

# Load environment variables
load_dotenv()

# Configuration from environment
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
RAPIDAPI_KEY = os.getenv("RAPIDAPI_KEY")
RAPIDAPI_HOST = os.getenv("RAPIDAPI_HOST", "instagram-looter2.p.rapidapi.com")

# Behavior configuration
DEFAULT_PAGE_COUNT = 12
INITIAL_TARGET = 90  # Fetch 90 posts for new creators
UPDATE_COUNT = 30  # Fetch 30 most recent posts for updates (4x daily)
RETRY_MAX_ATTEMPTS = int(os.getenv("RETRY_MAX_ATTEMPTS", "5"))

# Validate configuration
if not all([SUPABASE_URL, SUPABASE_KEY, RAPIDAPI_KEY]):
    raise RuntimeError("Missing required environment variables. Please check .env file.")

# Logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s %(levelname)s %(message)s',
    handlers=[logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger(__name__)


class RetryableHttpError(Exception):
    pass


def get_supabase() -> Client:
    if not SUPABASE_URL or not SUPABASE_KEY:
        raise RuntimeError("Missing Supabase config")
    return create_client(SUPABASE_URL, SUPABASE_KEY)


def log_to_supabase(supabase: Client, script_name: str, action: str,
                    username: Optional[str] = None, creator_id: Optional[str] = None,
                    success: bool = True, items_fetched: int = 0, items_saved: int = 0,
                    api_calls: int = 0, details: Optional[Dict] = None,
                    error: Optional[str] = None, duration: Optional[float] = None):
    """Log scraping activity to Supabase"""
    try:
        log_entry = {
            "script_name": script_name,
            "action": action,
            "username": username,
            "creator_id": creator_id,
            "success": success,
            "items_fetched": items_fetched,
            "items_saved": items_saved,
            "api_calls_made": api_calls,
            "details": details or {},
            "error_message": error,
            "duration_seconds": duration
        }
        supabase.table("instagram_scraper_logs").insert(log_entry).execute()
    except Exception as e:
        logger.warning(f"Failed to log to Supabase: {e}")


@retry(
    retry=retry_if_exception(lambda e: isinstance(e, RetryableHttpError)),
    wait=wait_random_exponential(multiplier=0.5, max=10.0),
    stop=stop_after_attempt(RETRY_MAX_ATTEMPTS),
    reraise=True,
)
def fetch_posts_page(user_id: str, count: int, max_id: Optional[str] = None) -> Tuple[List[Dict[str, Any]], Optional[str], bool]:
    """Fetch a page of posts for a user"""
    url = f"https://{RAPIDAPI_HOST}/posts"
    headers = {
        "x-rapidapi-key": RAPIDAPI_KEY or "",
        "x-rapidapi-host": RAPIDAPI_HOST,
        "accept": "application/json",
    }
    params: Dict[str, Any] = {"id": user_id, "count": str(count)}
    if max_id:
        params["max_id"] = max_id

    resp = requests.get(url, headers=headers, params=params, timeout=30)
    if resp.status_code == 429 or 500 <= resp.status_code < 600:
        logger.warning("HTTP %s for user_id=%s", resp.status_code, user_id)
        raise RetryableHttpError(f"Retryable status: {resp.status_code}")
    resp.raise_for_status()

    data = resp.json()
    if not isinstance(data, dict) or 'items' not in data:
        raise RetryableHttpError("Unexpected response shape")

    items = data.get('items', [])
    paging = data.get('paging_info', {}) or {}
    next_max_id = paging.get('max_id')
    more_available = bool(paging.get('more_available'))

    return items, next_max_id, more_available


def to_iso(ts: Optional[int]) -> Optional[str]:
    """Convert timestamp to ISO format"""
    if not ts:
        return None
    try:
        return datetime.fromtimestamp(int(ts), tz=timezone.utc).isoformat()
    except Exception:
        return None


def extract_hashtags(caption: str) -> List[str]:
    """Extract hashtags from caption"""
    if not caption:
        return []
    import re
    hashtags = re.findall(r'#\w+', caption)
    return hashtags


def extract_mentions(caption: str) -> List[str]:
    """Extract mentions from caption"""
    if not caption:
        return []
    import re
    mentions = re.findall(r'@\w+', caption)
    return mentions


def map_post(media: Dict[str, Any], creator_id: str, creator_username: str,
             niche_group_id: Optional[str] = None) -> Dict[str, Any]:
    """Map post data to our database schema"""

    # Helper function to safely get nested values
    def g(obj: Dict[str, Any], path: List[str], default=None):
        cur: Any = obj
        for p in path:
            if isinstance(cur, dict) and p in cur:
                cur = cur[p]
            else:
                return default
        return cur

    # Extract basic info
    media_pk = str(media.get('pk', ''))
    media_id = media.get('id')
    code = media.get('code')
    media_type = media.get('media_type')  # 1=photo, 2=video, 8=carousel
    product_type = media.get('product_type')

    # Extract caption and hashtags/mentions
    caption_text = g(media, ["caption", "text"])
    hashtags = extract_hashtags(caption_text) if caption_text else []
    mentions = extract_mentions(caption_text) if caption_text else []

    # Extract location
    location = media.get('location', {})
    location_name = location.get('name') if location else None
    location_id = str(location.get('pk')) if location else None

    # Extract engagement metrics
    like_count = media.get('like_count', 0)
    comment_count = media.get('comment_count', 0)
    save_count = media.get('save_count', 0)
    share_count = media.get('share_count', 0)

    # Calculate engagement rate (simplified)
    total_engagement = like_count + comment_count + save_count + share_count
    engagement_rate = None  # Will be calculated based on follower count later

    # Extract media URLs
    image_urls = []
    video_url = None
    thumbnail_url = None

    # For carousel posts
    if media_type == 8:
        carousel_media = media.get('carousel_media', [])
        for item in carousel_media:
            if item.get('media_type') == 1:  # Photo
                img_versions = item.get('image_versions2', {})
                candidates = img_versions.get('candidates', [])
                if candidates:
                    image_urls.append(candidates[0].get('url'))
            elif item.get('media_type') == 2:  # Video
                video_versions = item.get('video_versions', [])
                if video_versions:
                    video_url = video_versions[0].get('url')
    else:
        # For single photo/video posts
        image_versions2 = media.get('image_versions2', {})
        candidates = image_versions2.get('candidates', [])
        if candidates:
            if media_type == 1:  # Photo
                image_urls = [candidates[0].get('url')]
            thumbnail_url = candidates[0].get('url')

        if media_type == 2:  # Video
            video_versions = media.get('video_versions', [])
            if video_versions:
                video_url = video_versions[0].get('url')

    # Extract sponsor tags (for paid partnerships)
    sponsor_tags = []
    sponsor_users = media.get('sponsor_tags', [])
    if sponsor_users:
        sponsor_tags = [s.get('sponsor', {}).get('username') for s in sponsor_users if s.get('sponsor')]

    # Build permalink
    permalink = f"https://www.instagram.com/p/{code}/" if code else None

    # Extract preview comments
    preview_comments = media.get('preview_comments', [])

    return {
        "media_pk": media_pk,
        "media_id": media_id,
        "shortcode": code,
        "creator_id": creator_id,
        "creator_username": creator_username,
        "creator_niche_id": niche_group_id,
        "product_type": product_type,
        "media_type": media_type,
        "taken_at": to_iso(media.get('taken_at')),
        "caption_text": caption_text,
        "location_name": location_name,
        "location_id": location_id,
        "original_width": media.get('original_width'),
        "original_height": media.get('original_height'),
        "like_count": like_count,
        "comment_count": comment_count,
        "save_count": save_count,
        "share_count": share_count,
        "engagement_rate": engagement_rate,
        "is_paid_partnership": bool(sponsor_tags),
        "sponsor_tags": sponsor_tags or None,
        "image_urls": image_urls or None,
        "video_url": video_url,
        "thumbnail_url": thumbnail_url,
        "permalink": permalink,
        "hashtags": hashtags or None,
        "mentioned_users": mentions or None,
        "is_comments_disabled": media.get('comments_disabled', False),
        "has_liked": media.get('has_liked', False),
        "has_more_comments": media.get('has_more_comments', False),
        "max_num_visible_preview_comments": media.get('max_num_visible_preview_comments'),
        "preview_comments": preview_comments or None,
        "raw_media_json": media,
    }


def upsert_posts(supabase: Client, posts: List[Dict[str, Any]]) -> int:
    """Upsert posts to database"""
    if not posts:
        return 0

    try:
        result = supabase.table("instagram_posts").upsert(
            posts,
            on_conflict="media_pk"
        ).execute()
        return len(result.data) if result.data else len(posts)
    except Exception as e:
        logger.error(f"Failed to upsert posts: {e}")
        return 0


def get_creator_post_count(supabase: Client, creator_id: str) -> int:
    """Get existing post count for a creator"""
    res = supabase.table("instagram_posts").select("media_pk", count='exact').eq("creator_id", creator_id).execute()
    return int(getattr(res, 'count', None) or 0)


def get_creators(supabase: Client, usernames: Optional[List[str]] = None) -> List[Dict[str, Any]]:
    """Get approved creators from database"""
    if usernames:
        creators: List[Dict[str, Any]] = []
        for u in usernames:
            r = supabase.table("instagram_creators").select("username, ig_user_id, niche_group_id").eq("username", u).eq("review_status", "ok").limit(1).execute()
            rows = r.data or []
            if rows and rows[0].get('ig_user_id'):
                creators.append(rows[0])
        return creators
    # Only fetch creators marked as "ok" in review process
    res = supabase.table("instagram_creators").select("username, ig_user_id, niche_group_id").eq("review_status", "ok").not_.is_("ig_user_id", None).execute()
    return list(res.data or [])


def process_creator(supabase: Client, creator: Dict[str, Any]) -> Tuple[int, int, int]:
    """Process a creator and return (upserted_count, pages_fetched, api_calls)"""
    user_id = str(creator['ig_user_id'])
    username = creator.get('username', 'unknown')
    niche_group_id = creator.get('niche_group_id')
    existing = get_creator_post_count(supabase, user_id)
    total_upserted = 0
    pages_fetched = 0
    api_calls = 0
    start_time = time.time()

    try:
        # Determine if this is initial fetch (90 posts) or update (30 most recent)
        if existing == 0:
            target_count = INITIAL_TARGET
            action = "initial_fetch"
        else:
            target_count = UPDATE_COUNT
            action = "update_fetch"

        remaining = target_count
        max_id: Optional[str] = None

        while remaining > 0:
            page_size = min(DEFAULT_PAGE_COUNT, remaining)
            items, next_max_id, more_available = fetch_posts_page(user_id, page_size, max_id)
            api_calls += 1

            posts = []
            for item in items:
                media = item.get('media') or item  # Some endpoints nest, some don't
                try:
                    mapped = map_post(media, user_id, username, niche_group_id)
                    if mapped and mapped.get('media_pk'):
                        posts.append(mapped)
                except Exception as e:
                    logger.debug(f"Skip post due to mapping error: {e}")

            if posts:
                saved = upsert_posts(supabase, posts)
                total_upserted += saved

            pages_fetched += 1
            remaining -= len(items)

            if not more_available or not next_max_id or action == "update_fetch":
                # For updates, we only want the most recent page
                break

            max_id = next_max_id
            time.sleep(0.1 + random.random() * 0.2)

        # Log success
        duration = time.time() - start_time
        log_to_supabase(
            supabase, "posts-scraper", action,
            username=username, creator_id=user_id,
            success=True, items_fetched=total_upserted, items_saved=total_upserted,
            api_calls=api_calls, duration=duration,
            details={"existing_count": existing, "target_count": target_count}
        )

    except Exception as e:
        # Log failure
        duration = time.time() - start_time
        log_to_supabase(
            supabase, "posts-scraper", action or "fetch",
            username=username, creator_id=user_id,
            success=False, items_fetched=total_upserted, items_saved=total_upserted,
            api_calls=api_calls, error=str(e), duration=duration
        )
        logger.error(f"Failed to process {username}: {e}")

    return total_upserted, pages_fetched, api_calls


def main():
    if not RAPIDAPI_KEY:
        logger.error("Missing RAPIDAPI_KEY")
        sys.exit(1)

    supabase = get_supabase()
    logger.info(f"Connected to Supabase: {SUPABASE_URL}")

    # Get specific usernames from command line or fetch all approved creators
    arg_usernames = [a.strip() for a in sys.argv[1:] if a.strip()]
    creators = get_creators(supabase, arg_usernames if arg_usernames else None)

    if not creators:
        logger.info("No approved creators found. Please review and approve creators first (set review_status to 'ok').")
        return

    total = len(creators)
    ok = 0
    skipped = 0
    total_api_calls = 0

    logger.info(f"Processing posts for {total} creators")

    for i, c in enumerate(creators, start=1):
        username = c.get('username', 'unknown')
        user_id = c.get('ig_user_id')

        try:
            upserted, pages, api_calls = process_creator(supabase, c)
            ok += 1
            total_api_calls += api_calls
            logger.info(f"[{i}/{total}] {username} ({user_id}): upserted={upserted} pages={pages} api_calls={api_calls}")
        except Exception as e:
            skipped += 1
            logger.warning(f"[{i}/{total}] Failed {username} ({user_id}): {e}")

        time.sleep(0.5 + random.random() * 0.5)

    logger.info(f"Done. creators={total} ok={ok} skipped={skipped} total_api_calls={total_api_calls}")

    # Log overall run summary
    log_to_supabase(
        supabase, "posts-scraper", "run_complete",
        success=True,
        details={
            "total_creators": total,
            "successful": ok,
            "skipped": skipped,
            "total_api_calls": total_api_calls
        }
    )


if __name__ == "__main__":
    main()