#!/usr/bin/env python3
"""
Instagram Reels Scraper for Supabase
Fetches and stores Instagram reels data using RapidAPI
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
DEFAULT_PAGE_COUNT = int(os.getenv("DEFAULT_PAGE_COUNT", "12"))
INITIAL_TARGET = 90  # Fetch 90 reels for new creators
UPDATE_COUNT = 30  # Fetch 30 most recent reels for updates (4x daily)
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
def fetch_reels_page(user_id: str, count: int, max_id: Optional[str]) -> Tuple[List[Dict[str, Any]], Optional[str], bool]:
    url = f"https://{RAPIDAPI_HOST}/reels"
    headers = {
        "x-rapidapi-key": RAPIDAPI_KEY or "",
        "x-rapidapi-host": RAPIDAPI_HOST,
        "accept": "application/json",
        "user-agent": "IGReelsScraper/1.0 (+https://rapidapi.com)",
    }
    params: Dict[str, Any] = {"id": user_id, "count": str(count)}
    if max_id:
        params["max_id"] = max_id

    resp = requests.get(url, headers=headers, params=params, timeout=30)
    if resp.status_code == 429 or 500 <= resp.status_code < 600:
        logger.warning("HTTP %s for user_id=%s; body=%s", resp.status_code, user_id, resp.text[:200])
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
    if not ts:
        return None
    try:
        return datetime.fromtimestamp(int(ts), tz=timezone.utc).isoformat()
    except Exception:
        return None


def map_media(media: Dict[str, Any], user_id: str, niche_group_id: Optional[str] = None) -> Dict[str, Any]:
    def g(obj: Dict[str, Any], path: List[str], default=None):
        cur: Any = obj
        for p in path:
            if isinstance(cur, dict) and p in cur:
                cur = cur[p]
            else:
                return default
        return cur

    video_versions = media.get('video_versions') or []
    video_urls = [v.get('url') for v in video_versions if isinstance(v, dict) and v.get('url')]

    cover_url = None
    image_versions2 = media.get('image_versions2') or {}
    cands = image_versions2.get('candidates') or []
    if cands:
        cover_url = cands[0].get('url')

    clips_metadata = media.get('clips_metadata') or {}
    original_sound_info = clips_metadata.get('original_sound_info') or {}
    audio_ranking_info = clips_metadata.get('audio_ranking_info') or {}
    ig_artist = original_sound_info.get('ig_artist') or {}

    pinned_ids = set(media.get('clips_tab_pinned_user_ids') or [])
    try:
        pinned_in_reels_tab = int(user_id) in pinned_ids
    except Exception:
        pinned_in_reels_tab = False

    code = media.get('code')
    permalink = f"https://www.instagram.com/reel/{code}/" if code else None

    # Map to new table structure (instagram_reels)
    row: Dict[str, Any] = {
        "media_pk": media.get('pk'),
        "media_id": media.get('id'),
        "shortcode": code,
        "creator_id": str(user_id),
        "creator_username": g(media, ["user", "username"]),
        "product_type": media.get('product_type'),
        "taken_at": to_iso(media.get('taken_at')),
        "caption_text": g(media, ["caption", "text"]),
        "original_width": media.get('original_width'),
        "original_height": media.get('original_height'),
        "has_audio": media.get('has_audio'),
        "video_duration": media.get('video_duration'),
        "play_count": media.get('play_count'),
        "ig_play_count": media.get('ig_play_count'),
        "like_count": media.get('like_count'),
        "comment_count": media.get('comment_count'),
        "pinned_in_reels_tab": pinned_in_reels_tab,
        "video_urls": video_urls or None,
        "cover_url": cover_url,
        "audio_type": clips_metadata.get('audio_type'),
        "music_canonical_id": clips_metadata.get('music_canonical_id'),
        "original_audio_title": original_sound_info.get('original_audio_title'),
        "audio_asset_id": original_sound_info.get('audio_asset_id'),
        "audio_best_cluster_id": audio_ranking_info.get('best_audio_cluster_id'),
        "ig_artist_id": ig_artist.get('id'),
        "ig_artist_username": ig_artist.get('username'),
        "permalink": permalink,
        "raw_media_json": media,
    }

    if not row["media_pk"]:
        raise ValueError("Missing media_pk")
    return row


def upsert_reels(supabase: Client, rows: List[Dict[str, Any]]) -> None:
    if not rows:
        return
    # Updated table name: reels -> instagram_reels
    supabase.table("instagram_reels").upsert(rows, on_conflict="media_pk").execute()


def get_creator_reel_count(supabase: Client, creator_id: str) -> int:
    # Updated table name: reels -> instagram_reels
    res = supabase.table("instagram_reels").select("media_pk", count='exact').eq("creator_id", creator_id).execute()
    return int(getattr(res, 'count', None) or 0)


def fetch_creator_rollups(supabase: Client, user_id: str) -> Optional[Dict[str, Any]]:
    # Updated view name: creator_reel_stats -> instagram_creator_reel_stats
    res = (
        supabase.table("instagram_creator_reel_stats")
        .select("*")
        .eq("ig_user_id", user_id)
        .maybe_single()
        .execute()
    )
    return res.data or None


def persist_creator_rollups(supabase: Client, user_id: str) -> None:
    stats = fetch_creator_rollups(supabase, user_id)
    if not stats:
        return
    # Updated table name: creators -> instagram_creators
    supabase.table("instagram_creators").update({
        "reels_count": stats.get("total_reels"),
        "total_views": stats.get("total_views"),
        "avg_views_per_reel": stats.get("avg_views_per_reel"),
        "avg_reel_length_sec": stats.get("avg_reel_length_sec"),
        "avg_engagement": stats.get("avg_engagement"),
        "last_reels_rollup_at": datetime.now(timezone.utc).isoformat(),
    }).eq("ig_user_id", user_id).execute()


def get_creators(supabase: Client, usernames: Optional[List[str]] = None) -> List[Dict[str, Any]]:
    # Updated table name: creators -> instagram_creators
    # Now filtering by review_status = 'ok' to only process approved creators
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
    """Process a creator and return (upserted_count, pages_fetched, api_calls_made)"""
    user_id = str(creator['ig_user_id'])
    username = creator.get('username', 'unknown')
    niche_group_id = creator.get('niche_group_id')  # Get niche from creator data
    existing = get_creator_reel_count(supabase, user_id)
    total_upserted = 0
    pages_fetched = 0
    api_calls = 0
    start_time = time.time()

    try:
        # Determine if this is initial fetch (90 reels) or update (30 most recent)
        if existing == 0:
            # New creator: fetch 90 reels
            target_count = INITIAL_TARGET
            action = "initial_fetch"
        else:
            # Existing creator: fetch 30 most recent
            target_count = UPDATE_COUNT
            action = "update_fetch"

        remaining = target_count
        max_id: Optional[str] = None

        while remaining > 0:
            page_size = min(DEFAULT_PAGE_COUNT, remaining)
            items, next_max_id, more_available = fetch_reels_page(user_id, page_size, max_id)
            api_calls += 1

            rows = []
            for item in items:
                media = item.get('media') or {}
                try:
                    rows.append(map_media(media, user_id, niche_group_id))
                except Exception as e:
                    logger.debug("Skip media due to mapping error: %s", e)

            if rows:
                upsert_reels(supabase, rows)
                total_upserted += len(rows)

            pages_fetched += 1
            remaining -= len(items)

            if not more_available or not next_max_id or action == "update_fetch":
                # For updates, we only want the most recent page
                break

            max_id = next_max_id
            time.sleep(0.1 + random.random() * 0.2)

        # Update creator's average views cache for viral detection
        update_creator_avg_views(supabase, user_id)

        # Log success
        duration = time.time() - start_time
        log_to_supabase(
            supabase, "reels-scraper", action,
            username=username, creator_id=user_id,
            success=True, items_fetched=total_upserted, items_saved=total_upserted,
            api_calls=api_calls, duration=duration,
            details={"existing_count": existing, "target_count": target_count}
        )

    except Exception as e:
        # Log failure
        duration = time.time() - start_time
        log_to_supabase(
            supabase, "reels-scraper", action or "fetch",
            username=username, creator_id=user_id,
            success=False, items_fetched=total_upserted, items_saved=total_upserted,
            api_calls=api_calls, error=str(e), duration=duration
        )
        raise

    return total_upserted, pages_fetched, api_calls

def update_creator_avg_views(supabase: Client, creator_id: str):
    """Update the creator's average views cache for viral detection"""
    try:
        # Calculate average views from reels
        result = supabase.table("instagram_reels")\
            .select("play_count")\
            .eq("creator_id", creator_id)\
            .execute()

        if result.data:
            play_counts = [r['play_count'] for r in result.data if r.get('play_count')]
            if play_counts:
                avg_views = sum(play_counts) / len(play_counts)
                supabase.table("instagram_creators")\
                    .update({"avg_views_per_reel_cached": avg_views})\
                    .eq("ig_user_id", creator_id)\
                    .execute()
    except Exception as e:
        logger.warning(f"Failed to update avg views for {creator_id}: {e}")


def main():
    if not RAPIDAPI_KEY:
        logger.error("Missing RAPIDAPI_KEY")
        sys.exit(1)

    supabase = get_supabase()
    logger.info(f"Connected to Supabase: {SUPABASE_URL}")

    arg_usernames = [a.strip() for a in sys.argv[1:] if a.strip()]
    creators = get_creators(supabase, arg_usernames if arg_usernames else None)
    if not creators:
        logger.info("No approved creators found. Please review and approve creators first (set review_status to 'ok').")
        return

    total = len(creators)
    ok = 0
    skipped = 0

    total_api_calls = 0
    for i, c in enumerate(creators, start=1):
        try:
            upserted, pages, api_calls = process_creator(supabase, c)
            persist_creator_rollups(supabase, str(c["ig_user_id"]))
            ok += 1
            total_api_calls += api_calls
            logger.info("[%d/%d] %s (%s): upserted=%d pages=%d api_calls=%d",
                       i, total, c['username'], c['ig_user_id'], upserted, pages, api_calls)
        except Exception as e:
            skipped += 1
            logger.warning("[%d/%d] Failed %s (%s): %s", i, total, c.get('username'), c.get('ig_user_id'), e)
        time.sleep(0.05 + random.random() * 0.1)

    logger.info("Done. creators=%d ok=%d skipped=%d total_api_calls=%d", total, ok, skipped, total_api_calls)

    # Log overall run summary
    log_to_supabase(
        supabase, "reels-scraper", "run_complete",
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