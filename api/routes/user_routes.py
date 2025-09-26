#!/usr/bin/env python3
"""
User Discovery Routes - Reddit User Fetching and Analysis
Migrated from dashboard API to centralize Reddit access
Uses the same proxy system as the Reddit scraper for reliability
"""

import os
import sys
import logging
import random
import asyncio
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from supabase import create_client

# Add parent directory to path to import from core
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from core.reddit.clients.reddit_public import PublicRedditAPI

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

# Initialize the PublicRedditAPI client (same as scraper uses)
public_api = PublicRedditAPI(max_retries=3, base_delay=1.0)

# Request/Response models
class UserDiscoverRequest(BaseModel):
    username: str

class UserDiscoverResponse(BaseModel):
    success: bool
    user: Optional[Dict[str, Any]] = None
    error: Optional[str] = None

async def get_proxy_configs() -> List[Dict[str, str]]:
    """Load proxy configurations from scraper_accounts table (same as scraper)"""
    try:
        # Get enabled accounts with proxy info, ordered by priority and success rate
        resp = supabase.table('scraper_accounts').select('*').eq(
            'is_enabled', True
        ).neq(
            'status', 'banned'
        ).order('priority').order('success_rate', desc=True).limit(5).execute()

        configs = []
        for account in (resp.data or []):
            if account.get('proxy_host') and account.get('proxy_port'):
                # Format proxy string exactly like the scraper does
                proxy_str = f"{account['proxy_username']}:{account['proxy_password']}@{account['proxy_host']}:{account['proxy_port']}"
                configs.append({
                    'proxy': proxy_str,
                    'display_name': account.get('account_name', 'Unknown'),
                    'account_id': account.get('id')
                })
                logger.info(f"Loaded proxy config for {account.get('account_name')}")

        if not configs:
            logger.warning("No proxy configurations found in scraper_accounts table")
        else:
            logger.info(f"Loaded {len(configs)} proxy configurations from database")

        return configs
    except Exception as e:
        logger.error(f"Failed to load proxy configs from database: {e}")
        return []

async def log_user_discovery(username: str, action: str, success: bool,
                            details: Dict[str, Any] = None, error: str = None):
    """Log user discovery actions to Supabase"""
    try:
        # Prepare context with all relevant details
        context = {
            'username': username,
            'action': action,
            'success': success
        }
        if details:
            context.update(details)
        if error:
            context['error'] = error

        # Log to unified system_logs table
        log_entry = {
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'source': 'user_discovery',
            'script_name': 'user_routes',
            'level': 'info' if success else 'error',
            'message': f"User discovery: {action} for {username}" + (f" - {error}" if error else ""),
            'context': context
        }

        supabase.table('system_logs').insert(log_entry).execute()

        # Also maintain backward compatibility - keep old table for now
        legacy_entry = {
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'username': username,
            'action': action,
            'success': success,
            'details': details or {},
            'error': error,
            'source': 'api_user_discovery'
        }
        try:
            supabase.table('user_discovery_logs').insert(legacy_entry).execute()
        except:
            pass  # Ignore errors on legacy table

        # Also log to Python logger
        if success:
            logger.info(f"User discovery: {action} for {username}")
        else:
            logger.error(f"User discovery failed: {action} for {username} - {error}")
    except Exception as e:
        logger.error(f"Failed to log user discovery: {e}")

async def fetch_reddit_data(url: str) -> Dict[str, Any]:
    """Fetch data from Reddit using the same system as the scraper"""
    # Load proxy configs from database (same as scraper)
    proxy_configs = await get_proxy_configs()

    # Try with each proxy config, then fallback to direct
    last_error = None

    # Shuffle configs for load balancing
    if proxy_configs:
        random.shuffle(proxy_configs)

    # Try each proxy
    for i, proxy_config in enumerate(proxy_configs):
        try:
            logger.info(f"Attempt {i+1}/{len(proxy_configs)} using proxy {proxy_config['display_name']}")

            # Use the same PublicRedditAPI that the scraper uses
            result = public_api.request_with_retry(url, proxy_config)

            if result:
                # Check for error responses
                if isinstance(result, dict) and result.get('error'):
                    if result.get('error') == 'forbidden':
                        raise Exception('User is suspended, private, or doesn\'t exist')
                    elif result.get('error') == 'not_found':
                        raise Exception('User not found')
                    elif result.get('error') == 'rate_limited':
                        logger.warning(f"Rate limited with proxy {proxy_config['display_name']}")
                        continue
                    else:
                        raise Exception(f"Reddit API error: {result.get('error')}")

                # Update proxy success metrics
                if proxy_config.get('account_id'):
                    try:
                        supabase.table('scraper_accounts').update({
                            'last_success_at': datetime.now(timezone.utc).isoformat(),
                            'last_used_at': datetime.now(timezone.utc).isoformat()
                        }).eq('id', proxy_config['account_id']).execute()
                    except Exception as e:
                        logger.error(f"Failed to update account metrics: {e}")

                logger.info(f"Successfully fetched data from {url.split('/')[4] if len(url.split('/')) > 4 else 'Reddit'} with proxy {proxy_config['display_name']}")
                return result

        except Exception as e:
            last_error = str(e)
            logger.error(f"Proxy {proxy_config['display_name']} failed: {last_error}")

            # Update proxy failure metrics
            if proxy_config.get('account_id'):
                try:
                    supabase.table('scraper_accounts').update({
                        'last_failure_at': datetime.now(timezone.utc).isoformat(),
                        'last_error_message': last_error,
                        'last_used_at': datetime.now(timezone.utc).isoformat()
                    }).eq('id', proxy_config['account_id']).execute()
                except Exception as e:
                    logger.error(f"Failed to update account metrics: {e}")

            continue

    # Try direct connection as last resort
    logger.info("All proxies failed or none available, trying direct connection")
    try:
        result = public_api.request_with_retry(url, None)
        if result:
            if isinstance(result, dict) and result.get('error'):
                if result.get('error') == 'forbidden':
                    raise Exception('User is suspended, private, or doesn\'t exist')
                elif result.get('error') == 'not_found':
                    raise Exception('User not found')
                else:
                    raise Exception(f"Reddit API error: {result.get('error')}")

            logger.info(f"Successfully fetched data from {url.split('/')[4] if len(url.split('/')) > 4 else 'Reddit'} with direct connection")
            return result
    except Exception as e:
        last_error = str(e)
        logger.error(f"Direct connection failed: {last_error}")

    # All attempts failed
    error_msg = f"All attempts failed. Last error: {last_error or 'Unknown error'}"
    raise Exception(error_msg)

async def fetch_reddit_user(username: str) -> Dict[str, Any]:
    """Fetch Reddit user data - wrapper for fetch_reddit_data"""
    url = f"https://www.reddit.com/user/{username}/about.json"
    return await fetch_reddit_data(url)

async def fetch_reddit_posts(username: str, limit: int = 30) -> Dict[str, Any]:
    """Fetch Reddit user posts - wrapper for fetch_reddit_data"""
    url = f"https://www.reddit.com/user/{username}/submitted.json?limit={limit}"
    return await fetch_reddit_data(url)

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

        # Fetch user data from Reddit using the same system as the scraper
        user_response = await fetch_reddit_user(username)

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
        user_posts = []

        try:
            posts_response = await fetch_reddit_posts(username, limit=30)
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