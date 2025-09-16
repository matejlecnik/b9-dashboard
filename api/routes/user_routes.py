#!/usr/bin/env python3
"""
User Discovery Routes - Reddit User Fetching and Analysis
Migrated from dashboard API to centralize Reddit access
"""

import os
import logging
import random
import asyncio
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from supabase import create_client
import httpx

# Initialize router
router = APIRouter(prefix="/api/users", tags=["users"])

# Configure logging
logger = logging.getLogger(__name__)

# Initialize Supabase client
SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_SERVICE_ROLE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
    raise Exception("Supabase credentials not configured")

supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

# Proxy configurations loaded from environment variables
PROXY_CONFIGS = [
    {
        'service': 'beyondproxy',
        'proxy': os.getenv('BEYONDPROXY_CREDENTIALS', ''),
        'display_name': 'BeyondProxy'
    },
    {
        'service': 'nyronproxy',
        'proxy': os.getenv('NYRONPROXY_CREDENTIALS', ''),
        'display_name': 'NyronProxy'
    },
    {
        'service': 'rapidproxy',
        'proxy': os.getenv('RAPIDPROXY_CREDENTIALS', ''),
        'display_name': 'RapidProxy'
    }
]
# Filter out configs without credentials
PROXY_CONFIGS = [config for config in PROXY_CONFIGS if config['proxy']]

# Request/Response models
class UserDiscoverRequest(BaseModel):
    username: str

class UserDiscoverResponse(BaseModel):
    success: bool
    user: Optional[Dict[str, Any]] = None
    error: Optional[str] = None

def generate_user_agent() -> str:
    """Generate a random user agent"""
    user_agents = [
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:121.0) Gecko/20100101 Firefox/121.0",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15"
    ]
    return random.choice(user_agents)

async def log_user_discovery(username: str, action: str, success: bool,
                            details: Dict[str, Any] = None, error: str = None):
    """Log user discovery actions to Supabase"""
    try:
        log_entry = {
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'username': username,
            'action': action,
            'success': success,
            'details': details or {},
            'error': error,
            'source': 'api_user_discovery'
        }

        supabase.table('user_discovery_logs').insert(log_entry).execute()

        # Also log to Python logger
        if success:
            logger.info(f"User discovery: {action} for {username}")
        else:
            logger.error(f"User discovery failed: {action} for {username} - {error}")
    except Exception as e:
        logger.error(f"Failed to log user discovery: {e}")

async def fetch_with_proxy(url: str, max_retries: int = 3) -> Dict[str, Any]:
    """Fetch data from Reddit with proxy support"""
    user_agent = generate_user_agent()
    headers = {
        'User-Agent': user_agent,
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'Connection': 'keep-alive',
        'Referer': 'https://www.reddit.com/',
    }

    last_error = None

    # Try with proxies first if available
    if PROXY_CONFIGS:
        proxy_pool = PROXY_CONFIGS.copy()

        for attempt in range(1, max_retries + 1):
            proxy_config = proxy_pool[(attempt - 1) % len(proxy_pool)]

            try:
                logger.info(f"Attempt {attempt}/{max_retries} using proxy {proxy_config['display_name']}")

                async with httpx.AsyncClient(timeout=10.0) as client:
                    response = await client.get(url, headers=headers)

                    if response.status_code == 404:
                        raise Exception('User not found on Reddit')
                    elif response.status_code == 403:
                        raise Exception('Access forbidden - user may be suspended or private')
                    elif response.status_code == 429:
                        logger.info(f"Rate limited by Reddit, waiting {2000 * attempt}ms")
                        await asyncio.sleep(2 * attempt)
                        continue
                    elif response.status_code in [500, 502, 503, 504]:
                        logger.info(f"Server error {response.status_code}, retrying")
                        await asyncio.sleep(attempt)
                        continue
                    elif response.status_code != 200:
                        raise Exception(f"Reddit API error {response.status_code}")

                    data = response.json()
                    logger.info("Successfully fetched Reddit user data")
                    return data

            except Exception as e:
                last_error = str(e)
                logger.error(f"Reddit API failed on attempt {attempt}: {last_error}")

                if attempt < max_retries:
                    wait_time = attempt  # 1s, 2s, 3s
                    logger.info(f"Waiting {wait_time}s before retry...")
                    await asyncio.sleep(wait_time)

    # No proxies available or all attempts failed
    if not PROXY_CONFIGS:
        logger.info('No proxy configurations available, attempting direct connection')

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(url, headers=headers)

            if response.status_code != 200:
                raise Exception(f"Reddit API error {response.status_code}")

            return response.json()
    except Exception as e:
        error_msg = f"All attempts failed. Last error: {last_error or str(e)}"
        raise Exception(error_msg)

def calculate_user_quality_scores(username: str, account_age_days: int,
                                 post_karma: int, comment_karma: int) -> Dict[str, float]:
    """Calculate user quality scores - exact copy from dashboard"""

    # Username quality (0-10): Natural, shorter usernames preferred
    has_numbers = any(c.isdigit() for c in username)
    has_special_chars = any(c not in 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_' for c in username)
    length_penalty = max(0, (len(username) - 6) * 0.2)  # Start penalizing after 6 chars

    username_score = 10 - length_penalty
    if has_numbers:
        username_score *= 0.8  # 20% penalty for numbers
    if has_special_chars:
        username_score *= 0.7  # 30% penalty for special chars
    username_score = max(2, min(10, username_score))  # Keep between 2-10

    # Age quality (0-10): Accounts 30 days to 5 years are ideal
    if account_age_days < 30:
        # Very new accounts are suspicious
        age_score = account_age_days / 30 * 3
    elif account_age_days <= 1825:  # 30 days to 5 years
        # Peak scoring period - established but not ancient
        age_score = 8 + (account_age_days - 30) / 1795 * 2  # 8-10 range
    else:
        # Very old accounts gradually decrease but stay decent
        age_score = max(6, 10 - (account_age_days - 1825) / 1825)  # 6-10 range

    # Karma quality (0-10): More realistic karma thresholds
    total_karma = post_karma + comment_karma
    karma_ratio = comment_karma / total_karma if total_karma > 0 else 0

    # Base karma score - more achievable thresholds
    if total_karma <= 0:
        karma_score = 1  # Very low for no karma
    elif total_karma < 100:
        karma_score = 2 + (total_karma / 100) * 3  # 2-5 for under 100 karma
    elif total_karma < 1000:
        karma_score = 5 + ((total_karma - 100) / 900) * 3  # 5-8 for 100-1000 karma
    else:
        karma_score = 8 + min(2, (total_karma - 1000) / 10000 * 2)  # 8-10 for 1000+ karma

    # Bonus/penalty for karma distribution
    if total_karma > 50:
        if karma_ratio > 0.8:
            # Too comment-heavy
            karma_score *= 0.95
        elif karma_ratio < 0.2:
            # Too post-heavy
            karma_score *= 0.95
        else:
            # Good balance - small bonus
            karma_score *= 1.05

    karma_score = max(1, min(10, karma_score))

    # Final weighted score (0-10) - adjusted weights for better distribution
    overall_score = (username_score * 0.15 + age_score * 0.35 + karma_score * 0.5)

    return {
        'username_score': round(username_score, 2),
        'age_score': round(age_score, 2),
        'karma_score': round(karma_score, 2),
        'overall_score': round(overall_score, 2)
    }

@router.post("/discover", response_model=UserDiscoverResponse)
async def discover_reddit_user(request: UserDiscoverRequest, background_tasks: BackgroundTasks):
    """
    Fetch and analyze a Reddit user, mark as our_creator
    Exact migration from dashboard/src/app/api/reddit/user/route.ts
    """
    username = request.username.strip().replace('u/', '').replace('/u/', '')

    if not username:
        await log_user_discovery(username, 'validation_failed', False,
                                error="Username is required")
        return UserDiscoverResponse(success=False, error="Username is required")

    try:
        # Log start of discovery
        await log_user_discovery(username, 'fetch_started', True,
                               {'source': 'manual_add'})

        # Fetch user data from Reddit
        user_url = f"https://www.reddit.com/user/{username}/about.json"
        user_response = await fetch_with_proxy(user_url)

        if not user_response.get('data'):
            await log_user_discovery(username, 'reddit_api_failed', False,
                                   error="Failed to fetch user data from Reddit")
            return UserDiscoverResponse(
                success=False,
                error="Failed to fetch user data from Reddit"
            )

        user_data = user_response['data']

        # Log successful Reddit fetch
        await log_user_discovery(username, 'reddit_api_success', True,
                               {'reddit_id': user_data.get('id')})

        # Calculate account age
        created_date = datetime.fromtimestamp(user_data['created_utc'], tz=timezone.utc)
        account_age_days = (datetime.now(timezone.utc) - created_date).days

        # Calculate quality scores
        quality_scores = calculate_user_quality_scores(
            user_data['name'],
            account_age_days,
            user_data.get('link_karma', 0),
            user_data.get('comment_karma', 0)
        )

        # Log quality calculation
        await log_user_discovery(username, 'quality_calculated', True,
                               {'scores': quality_scores})

        # Fetch user posts for analysis
        posts_url = f"https://www.reddit.com/user/{username}/submitted.json?limit=30"
        user_posts = []

        try:
            posts_response = await fetch_with_proxy(posts_url)
            if posts_response.get('data', {}).get('children'):
                user_posts = [child['data'] for child in posts_response['data']['children']]

                await log_user_discovery(username, 'posts_fetched', True,
                                      {'post_count': len(user_posts)})
        except Exception as e:
            logger.warning(f"Failed to fetch user posts: {e}")
            await log_user_discovery(username, 'posts_fetch_failed', False,
                                   error=str(e))

        # Analyze posts for patterns
        content_types = {'image': 0, 'video': 0, 'text': 0, 'link': 0}
        posting_hours = {}
        posting_days = {}
        total_score = 0
        total_comments = 0

        for post in user_posts:
            # Content type analysis
            domain = post.get('domain', '')
            url = post.get('url', '')

            if post.get('is_video') or domain in ['v.redd.it', 'youtube.com', 'youtu.be']:
                content_types['video'] += 1
            elif domain in ['i.redd.it', 'imgur.com'] or any(url.endswith(ext) for ext in ['.jpg', '.png', '.gif', '.jpeg']):
                content_types['image'] += 1
            elif post.get('is_self'):
                content_types['text'] += 1
            else:
                content_types['link'] += 1

            # Timing analysis
            post_date = datetime.fromtimestamp(post['created_utc'], tz=timezone.utc)
            hour = post_date.hour
            day = post_date.strftime('%A')

            posting_hours[hour] = posting_hours.get(hour, 0) + 1
            posting_days[day] = posting_days.get(day, 0) + 1

            # Engagement totals
            total_score += post.get('score', 0)
            total_comments += post.get('num_comments', 0)

        # Determine most common patterns
        preferred_content_type = max(content_types.items(), key=lambda x: x[1])[0] if any(content_types.values()) else None
        most_active_hour = max(posting_hours.items(), key=lambda x: x[1])[0] if posting_hours else None
        most_active_day = max(posting_days.items(), key=lambda x: x[1])[0] if posting_days else None

        # Extract bio and URLs from user subreddit
        bio = user_data.get('subreddit', {}).get('public_description')
        bio_url = None
        if bio:
            import re
            url_match = re.search(r'https?://\S+', bio)
            if url_match:
                bio_url = url_match.group(0)

        banner_img = user_data.get('subreddit', {}).get('banner_img')

        # Prepare user payload (exact same structure as dashboard)
        user_payload = {
            'username': user_data['name'],
            'reddit_id': user_data['id'],
            'created_utc': created_date.isoformat(),
            'account_age_days': account_age_days,
            'comment_karma': user_data.get('comment_karma', 0),
            'link_karma': user_data.get('link_karma', 0),
            'total_karma': user_data.get('link_karma', 0) + user_data.get('comment_karma', 0),
            'awardee_karma': user_data.get('awardee_karma', 0),
            'awarder_karma': user_data.get('awarder_karma', 0),
            'is_employee': user_data.get('is_employee', False),
            'is_mod': user_data.get('is_mod', False),
            'is_gold': user_data.get('is_gold', False),
            'verified': user_data.get('verified', False),
            'has_verified_email': user_data.get('has_verified_email', False),
            'is_suspended': False,
            'icon_img': user_data.get('icon_img'),
            'subreddit_display_name': user_data.get('subreddit', {}).get('display_name'),
            'subreddit_title': user_data.get('subreddit', {}).get('title'),
            'subreddit_subscribers': user_data.get('subreddit', {}).get('subscribers', 0),
            'subreddit_over_18': user_data.get('subreddit', {}).get('over_18', False),
            'subreddit_banner_img': banner_img,
            'bio': bio,
            'bio_url': bio_url,
            'username_quality_score': quality_scores['username_score'],
            'age_quality_score': quality_scores['age_score'],
            'karma_quality_score': quality_scores['karma_score'],
            'overall_user_score': quality_scores['overall_score'],
            'avg_post_score': round(total_score / len(user_posts), 2) if user_posts else 0,
            'avg_post_comments': round(total_comments / len(user_posts), 2) if user_posts else 0,
            'total_posts_analyzed': len(user_posts),
            'karma_per_day': round((user_data.get('link_karma', 0) + user_data.get('comment_karma', 0)) / max(account_age_days, 1), 2),
            'preferred_content_type': preferred_content_type,
            'most_active_posting_hour': most_active_hour,
            'most_active_posting_day': most_active_day,
            'our_creator': True,  # Mark as our creator when fetched through this API
            'last_scraped_at': datetime.now(timezone.utc).isoformat(),
        }

        # Save to database
        result = supabase.table('reddit_users').upsert(user_payload, on_conflict='username').execute()

        if result.data:
            # Log successful save
            await log_user_discovery(username, 'saved_to_database', True,
                                   {'user_id': user_payload['reddit_id'],
                                    'overall_score': user_payload['overall_user_score']})

            logger.info(f"Successfully discovered and saved Reddit user: {username}")

            return UserDiscoverResponse(success=True, user=user_payload)
        else:
            await log_user_discovery(username, 'database_save_failed', False,
                                   error="Failed to save user to database")
            return UserDiscoverResponse(
                success=False,
                error="Failed to save user to database"
            )

    except Exception as e:
        error_msg = str(e)
        logger.error(f"Error fetching Reddit user {username}: {error_msg}")

        # Log error
        await log_user_discovery(username, 'discovery_error', False,
                               error=error_msg,
                               details={'error_type': type(e).__name__})

        return UserDiscoverResponse(
            success=False,
            error=error_msg
        )

@router.get("/health")
async def health_check():
    """Health check endpoint for user routes"""
    return {"status": "healthy", "service": "user_discovery"}