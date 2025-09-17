#!/usr/bin/env python3
"""
Instagram Following Discovery Scraper
Discovers new creators by fetching the following list of a given account
Filters by follower count and saves to discovery queue for review
"""
import os
import sys
import time
import logging
import json
from typing import Dict, List, Optional, Any
from datetime import datetime, timezone
from dotenv import load_dotenv

import requests
from supabase import create_client, Client

# Load environment variables
load_dotenv()

# Configuration
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
RAPIDAPI_KEY = os.getenv("RAPIDAPI_KEY")

# API Configuration - Using instagram-scraper-api2 which has following endpoint
# Alternative: You may need to switch to HikerAPI or another provider
RAPIDAPI_HOST = "instagram-scraper-api2.p.rapidapi.com"

# Discovery Configuration
MIN_FOLLOWERS = 10000  # Only save accounts with 10k+ followers
BATCH_SIZE = 50  # Number of following to fetch per request
MAX_FOLLOWING_TO_FETCH = 1000  # Limit to prevent excessive API usage

# Logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s %(levelname)s %(message)s',
    handlers=[logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger(__name__)

# Validate configuration
if not all([SUPABASE_URL, SUPABASE_KEY, RAPIDAPI_KEY]):
    raise RuntimeError("Missing required environment variables. Please check .env file.")


def get_supabase() -> Client:
    """Get Supabase client instance"""
    return create_client(SUPABASE_URL, SUPABASE_KEY)


def log_to_supabase(supabase: Client, action: str, username: Optional[str] = None,
                    success: bool = True, items_fetched: int = 0, items_saved: int = 0,
                    details: Optional[Dict] = None, error: Optional[str] = None):
    """Log scraping activity to Supabase"""
    try:
        log_entry = {
            "script_name": "following-discovery",
            "action": action,
            "username": username,
            "success": success,
            "items_fetched": items_fetched,
            "items_saved": items_saved,
            "details": details or {},
            "error_message": error
        }
        supabase.table("instagram_scraper_logs").insert(log_entry).execute()
    except Exception as e:
        logger.warning(f"Failed to log to Supabase: {e}")


def get_user_info(username: str) -> Optional[Dict[str, Any]]:
    """
    Get basic user info for a username
    This uses the profile endpoint to get the user ID needed for following list
    """
    url = f"https://{RAPIDAPI_HOST}/api/v1/info"
    headers = {
        "x-rapidapi-key": RAPIDAPI_KEY,
        "x-rapidapi-host": RAPIDAPI_HOST,
    }
    params = {"username_or_id_or_url": username}

    try:
        response = requests.get(url, headers=headers, params=params, timeout=30)
        if response.status_code == 200:
            data = response.json()
            if data.get("data"):
                return data["data"]
        else:
            logger.error(f"Failed to get user info for {username}: {response.status_code}")
    except Exception as e:
        logger.error(f"Error fetching user info for {username}: {e}")

    return None


def fetch_following_page(user_id: str, max_id: Optional[str] = None) -> tuple[List[Dict], Optional[str]]:
    """
    Fetch a page of accounts that the user is following
    Returns (list of users, next_max_id for pagination)
    """
    url = f"https://{RAPIDAPI_HOST}/api/v1/following"
    headers = {
        "x-rapidapi-key": RAPIDAPI_KEY,
        "x-rapidapi-host": RAPIDAPI_HOST,
    }
    params = {
        "userid": user_id,
        "count": str(BATCH_SIZE),
    }
    if max_id:
        params["max_id"] = max_id

    try:
        response = requests.get(url, headers=headers, params=params, timeout=30)
        if response.status_code == 200:
            data = response.json()
            users = data.get("data", {}).get("users", [])
            next_max_id = data.get("data", {}).get("next_max_id")
            return users, next_max_id
        else:
            logger.error(f"Failed to fetch following for {user_id}: {response.status_code}")
    except Exception as e:
        logger.error(f"Error fetching following for {user_id}: {e}")

    return [], None


def process_discovered_user(user_data: Dict[str, Any], discovery_source: str) -> Optional[Dict[str, Any]]:
    """
    Process a discovered user and prepare data for database insertion
    Returns None if user doesn't meet criteria
    """
    # Extract user info
    user_id = str(user_data.get("pk") or user_data.get("id"))
    username = user_data.get("username")
    full_name = user_data.get("full_name", "")

    # Get follower count
    follower_count = user_data.get("follower_count", 0)
    if isinstance(follower_count, str):
        try:
            follower_count = int(follower_count)
        except:
            follower_count = 0

    # Skip if below minimum followers
    if follower_count < MIN_FOLLOWERS:
        return None

    # Skip if private (optional - you may want to keep private accounts)
    is_private = user_data.get("is_private", False)

    return {
        "ig_user_id": user_id,
        "username": username,
        "full_name": full_name,
        "profile_pic_url": user_data.get("profile_pic_url"),
        "followers": follower_count,
        "following": user_data.get("following_count", 0),
        "posts_count": user_data.get("media_count", 0),
        "is_private": is_private,
        "is_verified": user_data.get("is_verified", False),
        "biography": user_data.get("biography", ""),
        "external_url": user_data.get("external_url"),
        "discovery_source": discovery_source,
        "discovery_method": "following",
        "discovery_date": datetime.now(timezone.utc).isoformat(),
        "review_status": "pending",
        "skip_reason": "private_account" if is_private else None,
    }


def save_to_discovery_queue(supabase: Client, users: List[Dict[str, Any]]) -> int:
    """
    Save discovered users to the discovery queue
    Returns number of users successfully saved
    """
    if not users:
        return 0

    try:
        # Upsert to handle duplicates gracefully
        result = supabase.table("instagram_discovery_queue").upsert(
            users,
            on_conflict="username"  # Don't create duplicates
        ).execute()
        return len(result.data) if result.data else 0
    except Exception as e:
        logger.error(f"Error saving to discovery queue: {e}")
        return 0


def discover_from_following(username: str, limit: Optional[int] = None) -> Dict[str, Any]:
    """
    Main discovery function - discovers new creators from a user's following list

    Args:
        username: Instagram username to discover from
        limit: Maximum number of following to fetch (default: MAX_FOLLOWING_TO_FETCH)

    Returns:
        Dictionary with discovery statistics
    """
    supabase = get_supabase()
    max_to_fetch = limit or MAX_FOLLOWING_TO_FETCH

    logger.info(f"Starting discovery from @{username}")

    # Get user info first
    user_info = get_user_info(username)
    if not user_info:
        logger.error(f"Could not find user @{username}")
        log_to_supabase(supabase, "discovery_failed", username=username,
                       success=False, error="User not found")
        return {"error": "User not found"}

    user_id = str(user_info.get("id"))
    following_count = user_info.get("following_count", 0)

    logger.info(f"User @{username} (ID: {user_id}) follows {following_count} accounts")

    # Fetch following list
    total_fetched = 0
    total_qualified = 0
    total_saved = 0
    max_id = None

    while total_fetched < max_to_fetch:
        # Fetch a page of following
        users, next_max_id = fetch_following_page(user_id, max_id)

        if not users:
            logger.info("No more users to fetch")
            break

        # Process each user
        qualified_users = []
        for user_data in users:
            processed = process_discovered_user(user_data, username)
            if processed:
                qualified_users.append(processed)
                total_qualified += 1

        # Save qualified users to discovery queue
        if qualified_users:
            saved = save_to_discovery_queue(supabase, qualified_users)
            total_saved += saved
            logger.info(f"Saved {saved} new users to discovery queue")

        total_fetched += len(users)
        logger.info(f"Progress: {total_fetched} fetched, {total_qualified} qualified, {total_saved} saved")

        # Check if there are more pages
        if not next_max_id:
            break

        max_id = next_max_id

        # Rate limiting
        time.sleep(1)  # Be respectful to the API

    # Also save the source account to creators table if it meets criteria
    if user_info.get("follower_count", 0) >= MIN_FOLLOWERS:
        source_creator = {
            "ig_user_id": user_id,
            "username": username,
            "full_name": user_info.get("full_name", ""),
            "biography": user_info.get("biography", ""),
            "external_url": user_info.get("external_url"),
            "profile_pic_url": user_info.get("profile_pic_url"),
            "profile_pic_url_hd": user_info.get("profile_pic_url_hd"),
            "is_private": user_info.get("is_private", False),
            "is_verified": user_info.get("is_verified", False),
            "followers": user_info.get("follower_count", 0),
            "following": user_info.get("following_count", 0),
            "posts_count": user_info.get("media_count", 0),
            "review_status": "pending",
            "discovery_source": "manual_input",
        }

        try:
            supabase.table("instagram_creators").upsert(
                source_creator,
                on_conflict="ig_user_id"
            ).execute()
            logger.info(f"Also added source account @{username} to creators table")
        except Exception as e:
            logger.warning(f"Could not add source account to creators: {e}")

    # Log successful discovery
    log_to_supabase(
        supabase, "discovery_complete", username=username,
        success=True, items_fetched=total_fetched, items_saved=total_saved,
        details={
            "source_following_count": following_count,
            "total_qualified": total_qualified,
            "completion_percentage": round((total_fetched / following_count * 100), 2) if following_count > 0 else 100
        }
    )

    return {
        "source_username": username,
        "source_following_count": following_count,
        "total_fetched": total_fetched,
        "total_qualified": total_qualified,
        "total_saved": total_saved,
        "completion_percentage": round((total_fetched / following_count * 100), 2) if following_count > 0 else 100
    }


def main():
    """Main entry point"""
    if len(sys.argv) < 2:
        print("Usage: python following-discovery.py <username> [limit]")
        print("Example: python following-discovery.py cristiano 500")
        sys.exit(1)

    username = sys.argv[1].strip().replace("@", "")
    limit = None

    if len(sys.argv) > 2:
        try:
            limit = int(sys.argv[2])
        except ValueError:
            logger.warning(f"Invalid limit '{sys.argv[2]}', using default")

    # Run discovery
    stats = discover_from_following(username, limit)

    # Print results
    if "error" in stats:
        logger.error(f"Discovery failed: {stats['error']}")
        sys.exit(1)
    else:
        logger.info("Discovery completed successfully!")
        logger.info(f"Statistics: {json.dumps(stats, indent=2)}")


if __name__ == "__main__":
    main()