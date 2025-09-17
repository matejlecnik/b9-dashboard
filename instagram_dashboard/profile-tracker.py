#!/usr/bin/env python3
"""
Instagram Profile Tracker for Supabase
Tracks and updates Instagram creator profiles with latest stats
Now using Supabase instead of Airtable
"""
import os
import sys
import time
import logging
from datetime import datetime
from typing import Dict, List, Optional, Any
from dotenv import load_dotenv

import requests
from supabase import create_client, Client

# Load environment variables
load_dotenv()

# Configuration from environment
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
ENSEMBLE_TOKEN = os.getenv("ENSEMBLE_TOKEN")
RAPIDAPI_KEY = os.getenv("RAPIDAPI_KEY")
RAPIDAPI_HOST = os.getenv("RAPIDAPI_HOST", "instagram-looter2.p.rapidapi.com")

# Time configuration (in seconds)
UPDATE_INTERVAL = int(os.getenv("UPDATE_INTERVAL_SECONDS", str(10 * 3600)))  # 10 hours default

# Validate configuration
if not all([SUPABASE_URL, SUPABASE_KEY]):
    raise RuntimeError("Missing required Supabase credentials. Please check .env file.")

# Logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s %(levelname)s %(message)s',
    handlers=[logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger(__name__)

# Initialize Supabase
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# API endpoints
INSTAGRAM_INFO_URL = 'https://ensembledata.com/apis/instagram/user/info'
INSTAGRAM_FOLLOWERS_URL = 'https://ensembledata.com/apis/instagram/user/followers'


def fetch_instagram_info_rapidapi(username: str) -> Optional[Dict]:
    """Fetch Instagram user info using RapidAPI."""
    if not RAPIDAPI_KEY:
        logger.warning("RapidAPI key not configured")
        return None

    try:
        url = f"https://{RAPIDAPI_HOST}/profile"
        headers = {
            "x-rapidapi-key": RAPIDAPI_KEY,
            "x-rapidapi-host": RAPIDAPI_HOST,
            "accept": "application/json",
        }
        response = requests.get(url, headers=headers, params={"username": username}, timeout=30)
        response.raise_for_status()
        return response.json()
    except Exception as e:
        logger.error(f"Error fetching Instagram info via RapidAPI for {username}: {str(e)}")
        return None


def fetch_instagram_info_ensemble(username: str) -> Optional[Dict]:
    """Fetch Instagram user info using Ensemble Data API."""
    if not ENSEMBLE_TOKEN:
        logger.warning("Ensemble token not configured")
        return None

    try:
        response = requests.get(
            INSTAGRAM_INFO_URL,
            params={
                'username': username,
                'token': ENSEMBLE_TOKEN
            },
            timeout=30
        )
        response.raise_for_status()
        data = response.json()

        if data and 'data' in data:
            return data['data']
        return None
    except Exception as e:
        logger.error(f"Error fetching Instagram info via Ensemble for {username}: {str(e)}")
        return None


def fetch_instagram_followers(user_id: str) -> Optional[Dict]:
    """Fetch Instagram follower count using Ensemble Data API."""
    if not ENSEMBLE_TOKEN:
        return None

    try:
        response = requests.get(
            INSTAGRAM_FOLLOWERS_URL,
            params={
                'user_id': user_id,
                'token': ENSEMBLE_TOKEN
            },
            timeout=30
        )
        response.raise_for_status()
        data = response.json()

        if data and 'data' in data:
            return data['data']
        return None
    except Exception as e:
        logger.error(f"Error fetching Instagram followers for ID {user_id}: {str(e)}")
        return None


def get_creators_to_update() -> List[Dict[str, Any]]:
    """Get list of Instagram creators from Supabase."""
    try:
        # Get all creators, ordered by last_scraped_at to update oldest first
        response = supabase.table("instagram_creators").select(
            "id, ig_user_id, username, last_scraped_at"
        ).order("last_scraped_at", desc=False).execute()

        return response.data or []
    except Exception as e:
        logger.error(f"Error fetching creators from Supabase: {str(e)}")
        return []


def update_creator_profile(creator: Dict[str, Any]) -> bool:
    """Update a single creator's profile data."""
    username = creator.get('username')
    if not username:
        logger.warning(f"Creator {creator.get('id')} has no username")
        return False

    logger.info(f"Updating profile for @{username}")

    # Try RapidAPI first (if configured), then fall back to Ensemble
    instagram_info = None

    if RAPIDAPI_KEY:
        instagram_info = fetch_instagram_info_rapidapi(username)
        if instagram_info:
            # RapidAPI format to our format
            update_data = {
                'ig_user_id': str(instagram_info.get('id', '')),
                'full_name': instagram_info.get('full_name'),
                'biography': instagram_info.get('biography'),
                'external_url': instagram_info.get('external_url'),
                'profile_pic_url': instagram_info.get('profile_pic_url'),
                'profile_pic_url_hd': instagram_info.get('profile_pic_url_hd'),
                'category_name': instagram_info.get('category_name'),
                'is_business_account': instagram_info.get('is_business_account', False),
                'is_professional_account': instagram_info.get('is_professional_account', False),
                'is_private': instagram_info.get('is_private', False),
                'is_verified': instagram_info.get('is_verified', False),
                'followers': (instagram_info.get('edge_followed_by') or {}).get('count', 0),
                'following': (instagram_info.get('edge_follow') or {}).get('count', 0),
                'posts_count': (instagram_info.get('edge_owner_to_timeline_media') or {}).get('count', 0),
                'highlight_reel_count': instagram_info.get('highlight_reel_count', 0),
                'has_clips': instagram_info.get('has_clips', False),
                'has_guides': instagram_info.get('has_guides', False),
                'has_channel': instagram_info.get('has_channel', False),
                'bio_links': instagram_info.get('bio_links') or [],
                'raw_profile_json': instagram_info,
                'last_scraped_at': datetime.utcnow().isoformat()
            }

    elif ENSEMBLE_TOKEN:
        instagram_info = fetch_instagram_info_ensemble(username)
        if instagram_info:
            # Ensemble format to our format
            update_data = {
                'ig_user_id': str(instagram_info.get('pk', '')),
                'full_name': instagram_info.get('full_name'),
                'biography': instagram_info.get('biography'),
                'external_url': instagram_info.get('external_url'),
                'profile_pic_url': instagram_info.get('profile_pic_url'),
                'is_private': instagram_info.get('is_private', False),
                'is_verified': instagram_info.get('is_verified', False),
                'followers': instagram_info.get('follower_count', 0),
                'following': instagram_info.get('following_count', 0),
                'posts_count': instagram_info.get('media_count', 0),
                'raw_profile_json': instagram_info,
                'last_scraped_at': datetime.utcnow().isoformat()
            }

            # Try to get follower count update
            if instagram_info.get('pk'):
                followers_data = fetch_instagram_followers(str(instagram_info['pk']))
                if followers_data:
                    update_data['followers'] = followers_data.get('count', update_data['followers'])
    else:
        logger.warning("No API keys configured for Instagram data fetching")
        return False

    if instagram_info and update_data:
        try:
            # Update the creator in Supabase
            supabase.table("instagram_creators").update(
                update_data
            ).eq('id', creator['id']).execute()

            logger.info(f"Updated @{username} - Followers: {update_data.get('followers', 'N/A'):,}")
            return True
        except Exception as e:
            logger.error(f"Error updating creator {username} in Supabase: {str(e)}")
            return False
    else:
        logger.warning(f"No Instagram data found for username: {username}")
        return False


def update_all_creators():
    """Update all Instagram creator profiles."""
    try:
        start_time = datetime.utcnow()
        logger.info(f"Starting update at {start_time.strftime('%Y-%m-%d %H:%M:%S')} UTC")

        creators = get_creators_to_update()

        if not creators:
            logger.info("No creators found to update")
            return

        logger.info(f"Found {len(creators)} creators to update")

        success_count = 0
        error_count = 0

        for creator in creators:
            if update_creator_profile(creator):
                success_count += 1
            else:
                error_count += 1

            # Add delay to respect rate limits
            time.sleep(1)

        end_time = datetime.utcnow()
        duration = (end_time - start_time).total_seconds()

        logger.info(f"Finished update at {end_time.strftime('%Y-%m-%d %H:%M:%S')} UTC")
        logger.info(f"Duration: {duration:.1f} seconds")
        logger.info(f"Results: {success_count} successful, {error_count} errors")

    except Exception as e:
        logger.error(f"Error in update_all_creators: {str(e)}")


def main():
    logger.info("Starting Instagram Profile Tracker")
    logger.info(f"Connected to Supabase: {SUPABASE_URL}")
    logger.info(f"Update interval: {UPDATE_INTERVAL/3600:.1f} hours")

    # Check which APIs are configured
    if RAPIDAPI_KEY:
        logger.info("Using RapidAPI for Instagram data")
    elif ENSEMBLE_TOKEN:
        logger.info("Using Ensemble Data API for Instagram data")
    else:
        logger.error("No Instagram API configured! Please set RAPIDAPI_KEY or ENSEMBLE_TOKEN")
        sys.exit(1)

    while True:
        try:
            update_all_creators()
            logger.info(f"Waiting {UPDATE_INTERVAL/3600:.1f} hours until next update...")
            time.sleep(UPDATE_INTERVAL)
        except KeyboardInterrupt:
            logger.info("Script stopped by user")
            break
        except Exception as e:
            logger.error(f"An error occurred in the main loop: {str(e)}")
            logger.info("Retrying in 5 minutes...")
            time.sleep(300)  # Wait 5 minutes before retrying


if __name__ == "__main__":
    main()