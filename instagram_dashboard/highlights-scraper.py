#!/usr/bin/env python3
"""
Instagram Highlights Scraper for Supabase
Fetches and stores Instagram highlights (permanent story collections) using RapidAPI
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
def fetch_highlights(user_id: str) -> List[Dict[str, Any]]:
    """Fetch all highlights for a user"""
    url = f"https://{RAPIDAPI_HOST}/highlights"
    headers = {
        "x-rapidapi-key": RAPIDAPI_KEY or "",
        "x-rapidapi-host": RAPIDAPI_HOST,
        "accept": "application/json",
    }
    params = {"id": user_id}

    resp = requests.get(url, headers=headers, params=params, timeout=30)
    if resp.status_code == 429 or 500 <= resp.status_code < 600:
        logger.warning("HTTP %s for user_id=%s", resp.status_code, user_id)
        raise RetryableHttpError(f"Retryable status: {resp.status_code}")
    resp.raise_for_status()

    data = resp.json()
    if not isinstance(data, dict):
        raise RetryableHttpError("Unexpected response shape")

    # The API returns highlights in the data field
    highlights = data.get('data', {}).get('tray', [])
    return highlights


def map_highlight(highlight: Dict[str, Any], creator_id: str, creator_username: str,
                  niche_group_id: Optional[str] = None) -> Dict[str, Any]:
    """Map highlight data to our database schema"""

    # Extract basic info
    highlight_id = str(highlight.get('id', ''))
    title = highlight.get('title', '')
    media_count = highlight.get('media_count', 0)
    is_pinned = highlight.get('is_pinned_highlight', False)

    # Extract cover media
    cover_media = highlight.get('cover_media', {})
    cover_media_url = None
    if cover_media:
        cropped_thumb = cover_media.get('cropped_image_version', {})
        if cropped_thumb and isinstance(cropped_thumb, dict):
            cover_media_url = cropped_thumb.get('url')

    # Extract timestamp
    created_timestamp = highlight.get('created_at')

    # Get latest reel media if available
    latest_reel_media = highlight.get('latest_reel_media')

    # Get items (individual stories in the highlight)
    items = highlight.get('items', [])

    return {
        "highlight_id": highlight_id,
        "highlight_title": title,
        "creator_id": creator_id,
        "creator_username": creator_username,
        "creator_niche_id": niche_group_id,
        "cover_media_url": cover_media_url,
        "media_count": media_count,
        "is_pinned_highlight": is_pinned,
        "created_at_timestamp": created_timestamp,
        "latest_reel_media": latest_reel_media,
        "items": items,  # Store full items as JSONB
        "raw_highlight_json": highlight,
    }


def upsert_highlights(supabase: Client, highlights: List[Dict[str, Any]]) -> int:
    """Upsert highlights to database"""
    if not highlights:
        return 0

    try:
        result = supabase.table("instagram_highlights").upsert(
            highlights,
            on_conflict="highlight_id"
        ).execute()
        return len(result.data) if result.data else len(highlights)
    except Exception as e:
        logger.error(f"Failed to upsert highlights: {e}")
        return 0


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


def process_creator(supabase: Client, creator: Dict[str, Any]) -> Tuple[int, int]:
    """Process a creator and return (saved_count, api_calls)"""
    user_id = str(creator['ig_user_id'])
    username = creator.get('username', 'unknown')
    niche_group_id = creator.get('niche_group_id')
    start_time = time.time()
    saved_count = 0
    api_calls = 0

    try:
        # Fetch highlights
        highlights_data = fetch_highlights(user_id)
        api_calls += 1

        if not highlights_data:
            logger.info(f"No highlights found for {username}")
            log_to_supabase(
                supabase, "highlights-scraper", "fetch_highlights",
                username=username, creator_id=user_id,
                success=True, items_fetched=0, items_saved=0,
                api_calls=api_calls, duration=time.time() - start_time,
                details={"message": "No highlights found"}
            )
            return 0, api_calls

        # Map and save highlights
        mapped_highlights = []
        for highlight in highlights_data:
            try:
                mapped = map_highlight(highlight, user_id, username, niche_group_id)
                if mapped and mapped.get('highlight_id'):
                    mapped_highlights.append(mapped)
            except Exception as e:
                logger.debug(f"Failed to map highlight: {e}")

        if mapped_highlights:
            saved_count = upsert_highlights(supabase, mapped_highlights)
            logger.info(f"Saved {saved_count} highlights for {username}")

        # Log success
        duration = time.time() - start_time
        log_to_supabase(
            supabase, "highlights-scraper", "fetch_highlights",
            username=username, creator_id=user_id,
            success=True, items_fetched=len(highlights_data), items_saved=saved_count,
            api_calls=api_calls, duration=duration,
            details={"total_highlights": len(highlights_data)}
        )

    except Exception as e:
        # Log failure
        duration = time.time() - start_time
        log_to_supabase(
            supabase, "highlights-scraper", "fetch_highlights",
            username=username, creator_id=user_id,
            success=False, items_fetched=0, items_saved=saved_count,
            api_calls=api_calls, error=str(e), duration=duration
        )
        logger.error(f"Failed to process {username}: {e}")

    return saved_count, api_calls


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
    successful = 0
    total_highlights = 0
    total_api_calls = 0

    logger.info(f"Processing highlights for {total} creators")

    for i, creator in enumerate(creators, 1):
        username = creator.get('username', 'unknown')
        logger.info(f"[{i}/{total}] Processing {username}")

        saved, api_calls = process_creator(supabase, creator)
        if saved > 0:
            successful += 1
            total_highlights += saved
        total_api_calls += api_calls

        # Rate limiting
        time.sleep(0.5 + random.random() * 0.5)

    # Log overall summary
    logger.info(f"Done. Processed {successful}/{total} creators, saved {total_highlights} highlights, used {total_api_calls} API calls")

    log_to_supabase(
        supabase, "highlights-scraper", "run_complete",
        success=True,
        details={
            "total_creators": total,
            "successful": successful,
            "total_highlights": total_highlights,
            "total_api_calls": total_api_calls
        }
    )


if __name__ == "__main__":
    main()