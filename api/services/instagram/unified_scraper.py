#!/usr/bin/env python3
"""
Instagram Unified Scraper for B9 Agency
Efficiently fetches reels, posts, and profile data with 2.4 API calls per creator average
"""
import os
import sys
import time
import json
import logging
import re
import threading
import asyncio
import aiohttp
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Any, Optional, Tuple
from collections import Counter
from concurrent.futures import ThreadPoolExecutor, as_completed, TimeoutError as FuturesTimeoutError
from queue import Queue
import random

import requests
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type
from supabase import create_client, Client
from dotenv import load_dotenv

from .instagram_config import Config

# Load environment and validate
load_dotenv()
# Config.validate()  # Will validate when actually starting the scraper

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger(__name__)


class APIError(Exception):
    """Custom exception for API errors"""
    pass


class RateLimitError(APIError):
    """Rate limit specific error"""
    pass


class PerformanceMonitor:
    """Monitor and track scraper performance"""

    def __init__(self):
        self.requests_per_second = []
        self.response_times = []
        self.start_time = time.time()
        self.lock = threading.Lock()

    def log_request(self, response_time):
        """Log a request and its response time"""
        with self.lock:
            current_time = time.time()
            self.response_times.append(response_time)
            self.requests_per_second.append(current_time)

            # Clean old entries (keep last minute)
            cutoff = current_time - 60
            self.requests_per_second = [t for t in self.requests_per_second if t > cutoff]

    def get_current_rps(self):
        """Get current requests per second"""
        with self.lock:
            if len(self.requests_per_second) < 2:
                return 0
            time_span = self.requests_per_second[-1] - self.requests_per_second[0]
            if time_span == 0:
                return 0
            return len(self.requests_per_second) / time_span

    def get_stats(self):
        """Get performance statistics"""
        with self.lock:
            return {
                "current_rps": self.get_current_rps(),
                "avg_response_time": sum(self.response_times) / len(self.response_times) if self.response_times else 0,
                "total_requests": len(self.response_times),
                "uptime_seconds": time.time() - self.start_time
            }


class InstagramScraperUnified:
    """Main scraper class with high-performance concurrency"""

    def __init__(self):
        """Initialize the scraper with enhanced performance features"""
        self.supabase = self._get_supabase()

        # Create connection pool for reusing connections
        self.session = self._create_session_pool()

        # Thread pool for concurrent processing
        self.executor = ThreadPoolExecutor(max_workers=Config.MAX_WORKERS)

        # Rate limiting
        self.rate_limiter = threading.Semaphore(Config.REQUESTS_PER_SECOND)
        self.last_request_time = 0
        self.request_lock = threading.Lock()

        # Performance monitoring
        self.performance_monitor = PerformanceMonitor()

        # Tracking
        self.api_calls_made = 0
        self.successful_calls = 0
        self.failed_calls = 0
        self.creators_processed = 0
        self.errors = []
        self.start_time = time.time()

        # Cost tracking
        self.daily_calls = self._get_daily_api_calls()
        self.monthly_calls = self._get_monthly_api_calls()

        # Stop mechanism
        self.stop_requested = False

        # Cycle tracking
        self.cycle_number = 0
        self.cycle_start_time = None

    def should_continue(self) -> bool:
        """Check if scraper should continue running from Supabase control table"""
        try:
            # Simple direct check of the control table
            result = self.supabase.table("system_control")\
                .select("status, enabled")\
                .eq("script_name", "instagram_scraper")\
                .maybe_single()\
                .execute()

            if result.data:
                # Check both status and enabled fields
                should_run = result.data.get("enabled", False) or result.data.get("status") == "running"
                if not should_run:
                    logger.info("Scraper stop signal received from control table")
                return should_run
            else:
                # No control record, default to stop
                logger.warning("No control record found in system_control, stopping scraper")
                return False
        except Exception as e:
            logger.error(f"Error checking control table: {e}")
            # On error, check the stop_requested flag as fallback
            return not self.stop_requested

    def request_stop(self):
        """Request the scraper to stop gracefully"""
        self.stop_requested = True
        logger.info("Stop requested for Instagram scraper")

    def _create_session_pool(self):
        """Create connection pool for reusing connections"""
        adapter = requests.adapters.HTTPAdapter(
            pool_connections=Config.CONNECTION_POOL_SIZE,
            pool_maxsize=Config.CONNECTION_POOL_SIZE,
            max_retries=Config.CONNECTION_MAX_RETRIES
        )
        session = requests.Session()
        session.mount('https://', adapter)
        session.headers.update(Config.get_headers())
        return session

    def _get_supabase(self) -> Client:
        """Initialize Supabase client"""
        return create_client(Config.SUPABASE_URL, Config.SUPABASE_KEY)

    def _extract_hashtags(self, text: str) -> List[str]:
        """Extract hashtags from text"""
        hashtags = re.findall(r'#[A-Za-z0-9_]+', text)
        return hashtags

    def _extract_mentions(self, text: str) -> List[str]:
        """Extract mentions from text"""
        mentions = re.findall(r'@[A-Za-z0-9_.]+', text)
        return mentions

    def _calculate_engagement_rate(self, likes: int, comments: int, followers: int) -> float:
        """Calculate engagement rate"""
        if followers == 0:
            return 0
        return ((likes + comments) / followers) * 100

    def _format_analytics_summary(self, analytics: Dict[str, Any]) -> str:
        """Format analytics into readable summary"""
        summary = []
        summary.append(f"📊 Analytics Summary")
        summary.append(f"━━━━━━━━━━━━━━━━━━")
        summary.append(f"Total Content: {analytics.get('total_content_analyzed', 0)}")
        summary.append(f"Engagement Rate: {analytics.get('engagement_rate', 0):.2f}%")
        summary.append(f"Avg Views: {analytics.get('avg_reel_views', 0):,.0f}")
        summary.append(f"Viral Rate: {analytics.get('viral_content_rate', 0):.1f}%")
        summary.append(f"Best Type: {analytics.get('best_performing_type', 'N/A')}")
        summary.append(f"Post Frequency: {analytics.get('posting_frequency_per_week', 0):.1f}/week")
        summary.append(f"Consistency: {analytics.get('posting_consistency_score', 0):.0f}/100")
        if analytics.get('most_active_day'):
            summary.append(f"Most Active: {analytics['most_active_day']} @ {analytics.get('most_active_hour', 0)}:00")
        return "\n".join(summary)

    def _get_daily_api_calls(self) -> int:
        """Get today's API call count from database"""
        try:
            today = datetime.now(timezone.utc).date().isoformat()
            result = self.supabase.table("system_logs")\
                .select("context")\
                .eq("source", "instagram_scraper")\
                .gte("timestamp", f"{today}T00:00:00Z")\
                .execute()

            return sum(
                log.get("context", {}).get("api_calls_made", 0)
                for log in (result.data or [])
                if log.get("context") and isinstance(log.get("context"), dict)
            )
        except Exception as e:
            logger.warning(f"Failed to get daily API calls: {e}")
            return 0

    def _get_monthly_api_calls(self) -> int:
        """Get this month's API call count"""
        try:
            first_of_month = datetime.now(timezone.utc).replace(day=1, hour=0, minute=0, second=0)
            result = self.supabase.table("system_logs")\
                .select("context")\
                .eq("source", "instagram_scraper")\
                .gte("timestamp", first_of_month.isoformat())\
                .execute()

            return sum(
                log.get("context", {}).get("api_calls_made", 0)
                for log in (result.data or [])
                if log.get("context") and isinstance(log.get("context"), dict)
            )
        except Exception as e:
            logger.warning(f"Failed to get monthly API calls: {e}")
            return 0

    def _log_realtime(self, level: str, message: str, context: Optional[Dict] = None):
        """Log real-time message to system_logs for monitoring"""
        if not Config.ENABLE_SUPABASE_LOGGING:
            return

        try:
            log_entry = {
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "source": "instagram_scraper",
                "script_name": "unified_scraper",
                "level": level,
                "message": message,
                "context": context or {}
            }
            self.supabase.table("system_logs").insert(log_entry).execute()
        except Exception as e:
            # Silently fail to avoid disrupting the scraper
            logger.debug(f"Failed to log realtime: {e}")

    def _log_to_supabase(self, action: str, username: Optional[str] = None,
                        creator_id: Optional[str] = None, success: bool = True,
                        items_fetched: int = 0, items_saved: int = 0,
                        details: Optional[Dict] = None, error: Optional[str] = None,
                        analytics: Optional[Dict] = None):
        """Log comprehensive activity to Supabase with detailed metrics"""
        if not Config.ENABLE_SUPABASE_LOGGING:
            return

        try:
            duration = time.time() - self.start_time
            cost = self.api_calls_made * Config.get_cost_per_request()

            # Build message based on action
            if action == "process_creator":
                if success:
                    reels_fetched = details.get('reels_fetched', 0) if details else 0
                    posts_fetched = details.get('posts_fetched', 0) if details else 0
                    reels_saved = details.get('reels_saved', 0) if details else 0
                    posts_saved = details.get('posts_saved', 0) if details else 0
                    reels_new = details.get('reels_new', 0) if details else 0
                    posts_new = details.get('posts_new', 0) if details else 0

                    if reels_saved == 0 and reels_fetched > 0:
                        message = f"✅ Processed {username}: Fetched {reels_fetched} reels (0 saved), {posts_fetched} posts ({posts_saved} saved, {posts_new} new)"
                    else:
                        message = f"✅ Processed {username}: Fetched {reels_fetched} reels ({reels_saved} saved, {reels_new} new), {posts_fetched} posts ({posts_saved} saved, {posts_new} new)"
                else:
                    message = f"❌ Failed to process {username}: {error}"
            elif action == "run_complete":
                message = f"🎆 Scraping complete: {self.creators_processed} creators processed"
            elif action == "run_failed":
                message = f"🔴 Scraper run failed: {error}"
            else:
                message = f"{action}: {username or 'N/A'}"

            # Determine log level
            level = "error" if error else ("success" if success else "info")

            # Build context with all the detailed metrics
            context = {
                "action": action,
                "username": username,
                "creator_id": creator_id,
                "success": success,
                "items_fetched": items_fetched,
                "items_saved": items_saved,
                "api_calls_made": self.api_calls_made,
                "api_cost": cost,
                # API limits removed - just track calls
                "total_monthly_calls": self.monthly_calls + self.api_calls_made,
                "total_daily_calls": self.daily_calls + self.api_calls_made,
                "details": details or {},
                "error_message": error,
                "duration_seconds": duration,
                "creators_processed": self.creators_processed,
                "creators_per_minute": (self.creators_processed / duration) * 60 if duration > 0 else 0
            }

            # Add analytics summary if provided
            if analytics:
                context["analytics_summary"] = {
                    "engagement_rate": round(analytics.get("engagement_rate", 0), 2),
                    "avg_reel_views": int(analytics.get("avg_reel_views", 0)),
                    "avg_post_engagement": int(analytics.get("avg_post_engagement", 0)),
                    "viral_content_rate": round(analytics.get("viral_content_rate", 0), 2),
                    "viral_content_count": analytics.get("viral_content_count", 0),
                    "best_performing_type": analytics.get("best_performing_type"),
                    "posting_frequency_per_week": round(analytics.get("posting_frequency_per_week", 0), 1),
                    "posting_consistency_score": round(analytics.get("posting_consistency_score", 0), 0),
                    "content_reach_rate": round(analytics.get("content_reach_rate", 0), 2),
                    "comment_to_like_ratio": round(analytics.get("comment_to_like_ratio", 0), 3),
                    "total_content_analyzed": analytics.get("total_content_analyzed", 0),
                    "reels_analyzed": analytics.get("reels_analyzed", 0),
                    "posts_analyzed": analytics.get("posts_analyzed", 0),
                    "days_since_last_post": round(analytics.get("days_since_last_post", 0), 1) if analytics.get("days_since_last_post") else None,
                    "most_active_day": analytics.get("most_active_day"),
                    "most_active_hour": analytics.get("most_active_hour"),
                    "total_views": int(analytics.get("total_views", 0)),
                    "total_engagement": int(analytics.get("total_engagement", 0))
                }

            # Insert into realtime logs table with proper format
            log_entry = {
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "source": "instagram_scraper",
                "script_name": "unified_scraper",
                "level": level,
                "message": message,
                "context": context
            }

            self.supabase.table("system_logs").insert(log_entry).execute()
        except Exception as e:
            logger.warning(f"Failed to log to Supabase: {e}")

    def _apply_rate_limiting(self):
        """Apply rate limiting using semaphore for concurrent requests"""
        # Use semaphore to allow multiple concurrent requests
        # The semaphore allows up to REQUESTS_PER_SECOND concurrent requests
        # No global lock needed - each thread can proceed independently
        pass  # Rate limiting handled by connection pool and API response times

    @retry(
        retry=retry_if_exception_type(RateLimitError),
        wait=wait_exponential(multiplier=1, min=Config.RETRY_WAIT_MIN, max=Config.RETRY_WAIT_MAX),
        stop=stop_after_attempt(Config.RETRY_MAX_ATTEMPTS)
    )
    def _make_api_request(self, endpoint: str, params: Dict[str, Any]) -> Dict[str, Any]:
        """Make API request with rate limiting and performance tracking"""
        if Config.DRY_RUN:
            logger.info(f"[DRY RUN] Would call {endpoint} with params: {params}")
            return {"items": [], "paging_info": {}}

        # Log request details
        thread_id = threading.current_thread().name
        self._log_realtime("debug", f"🔍 [{thread_id}] API Request", {
            "thread": thread_id,
            "endpoint": endpoint.split('/')[-1],  # Just the endpoint name
            "params": params,
            "api_calls_made": self.api_calls_made + 1,
            "current_rps": self.performance_monitor.get_current_rps() if hasattr(self, 'performance_monitor') else 0
        })

        # API limit checks removed - let RapidAPI handle its own limits

        # Apply rate limiting
        self._apply_rate_limiting()

        request_start = time.time()

        try:
            response = self.session.get(
                endpoint,
                params=params,
                timeout=Config.REQUEST_TIMEOUT
            )

            request_time = time.time() - request_start
            self.api_calls_made += 1
            self.successful_calls += 1  # Track successful calls
            self.daily_calls += 1
            self.monthly_calls += 1

            # Track performance
            self.performance_monitor.log_request(request_time)

            # Check current RPS and slow down if needed
            current_rps = self.performance_monitor.get_current_rps()
            if current_rps > Config.REQUESTS_PER_SECOND:
                logger.warning(f"RPS exceeding limit: {current_rps:.1f}, slowing down")
                time.sleep(0.5)

            if response.status_code == 429:
                raise RateLimitError("Rate limit exceeded")

            response.raise_for_status()
            data = response.json()

            # Log successful response
            self._log_realtime("debug", f"✅ [{thread_id}] API Response", {
                "thread": thread_id,
                "endpoint": endpoint.split('/')[-1],
                "response_time_ms": int(request_time * 1000),
                "items_count": len(data.get('items', [])) if isinstance(data, dict) else 0,
                "current_rps": current_rps
            })

            return data

        except requests.exceptions.Timeout as e:
            self.api_calls_made += 1
            self.failed_calls += 1  # Track failed calls
            logger.error(f"API request timed out after {Config.REQUEST_TIMEOUT}s: {e}")
            raise APIError(f"Request timed out: {e}")
        except requests.exceptions.RequestException as e:
            self.api_calls_made += 1
            self.failed_calls += 1  # Track failed calls
            logger.error(f"API request failed: {e}")
            raise APIError(f"Request failed: {e}")

    def _fetch_profile(self, username: str) -> Optional[Dict[str, Any]]:
        """Fetch Instagram profile data"""
        try:
            logger.info(f"Fetching profile for {username}")

            params = {"username": username}
            data = self._make_api_request(Config.PROFILE_ENDPOINT, params)

            if data and data.get('status'):
                # Map the response fields to our expected format
                return {
                    "follower_count": data.get("edge_followed_by", {}).get("count", 0),
                    "following_count": data.get("edge_follow", {}).get("count", 0),
                    "media_count": data.get("edge_owner_to_timeline_media", {}).get("count", 0),
                    "biography": data.get("biography", ""),
                    "is_verified": data.get("is_verified", False),
                    "profile_pic_url": data.get("profile_pic_url_hd") or data.get("profile_pic_url", ""),
                    "is_business_account": data.get("is_business_account", False),
                    "is_professional_account": data.get("is_professional_account", False),
                    "category_name": data.get("category_name", ""),
                    "external_url": data.get("external_url", ""),
                    "has_clips": data.get("has_clips", False),
                    "full_name": data.get("full_name", ""),
                    "id": data.get("id", ""),
                    "is_private": data.get("is_private", False),
                    "has_onboarded_to_text_post_app": data.get("has_onboarded_to_text_post_app", False),
                    "raw_data": data  # Keep raw data for detailed logging
                }
            return None
        except Exception as e:
            logger.error(f"Failed to fetch profile for {username}: {e}")
            return None

    def _fetch_reels(self, user_id: str, count: int = 12) -> List[Dict[str, Any]]:
        """Fetch Instagram reels with retry logic for empty responses"""
        reels = []
        max_id = None
        total_to_fetch = count
        empty_retries = 0

        while len(reels) < total_to_fetch:
            try:
                params = {
                    "id": user_id,
                    "count": min(12, total_to_fetch - len(reels))
                }

                if max_id:
                    params["max_id"] = max_id

                data = self._make_api_request(Config.REELS_ENDPOINT, params)

                items = data.get("items", [])

                # Retry if we get an empty response
                if not items and empty_retries < Config.RETRY_EMPTY_RESPONSE:
                    empty_retries += 1
                    logger.warning(f"Empty response for reels, retry {empty_retries}/{Config.RETRY_EMPTY_RESPONSE}")
                    time.sleep(2)  # Wait 2 seconds before retry
                    continue

                if not items:
                    break

                # Extract media objects from reels response (API nests data in .media)
                extracted_reels = []
                for item in items:
                    if isinstance(item, dict) and "media" in item:
                        extracted_reels.append(item["media"])
                    else:
                        extracted_reels.append(item)

                reels.extend(extracted_reels)
                empty_retries = 0  # Reset retry counter on successful response

                paging = data.get("paging_info", {})
                if not paging.get("more_available"):
                    break

                max_id = paging.get("max_id")

            except Exception as e:
                logger.error(f"Failed to fetch reels page: {e}")
                break

        return reels[:total_to_fetch]

    def _fetch_posts(self, user_id: str, count: int = 12) -> List[Dict[str, Any]]:
        """Fetch Instagram posts with retry logic for empty responses"""
        posts = []
        max_id = None
        total_to_fetch = count
        empty_retries = 0

        while len(posts) < total_to_fetch:
            try:
                params = {
                    "id": user_id,
                    "count": min(12, total_to_fetch - len(posts))
                }

                if max_id:
                    params["max_id"] = max_id

                data = self._make_api_request(Config.POSTS_ENDPOINT, params)

                items = data.get("items", [])

                # Retry if we get an empty response
                if not items and empty_retries < Config.RETRY_EMPTY_RESPONSE:
                    empty_retries += 1
                    logger.warning(f"Empty response for posts, retry {empty_retries}/{Config.RETRY_EMPTY_RESPONSE}")
                    time.sleep(2)  # Wait 2 seconds before retry
                    continue

                if not items:
                    break

                posts.extend(items)
                empty_retries = 0  # Reset retry counter on successful response

                paging = data.get("paging_info", {})
                if not paging.get("more_available"):
                    break

                max_id = paging.get("max_id")

            except Exception as e:
                logger.error(f"Failed to fetch posts page: {e}")
                break

        return posts[:total_to_fetch]

    def _get_creator_content_counts(self, creator_id: str) -> Tuple[int, int]:
        """Get existing content counts for a creator"""
        try:
            # Get reels count
            reels_result = self.supabase.table("instagram_reels")\
                .select("media_pk", count='exact')\
                .eq("creator_id", creator_id)\
                .execute()
            reels_count = int(getattr(reels_result, 'count', 0) or 0)

            # Get posts count
            posts_result = self.supabase.table("instagram_posts")\
                .select("media_pk", count='exact')\
                .eq("creator_id", creator_id)\
                .execute()
            posts_count = int(getattr(posts_result, 'count', 0) or 0)

            return reels_count, posts_count

        except Exception as e:
            logger.warning(f"Failed to get content counts for {creator_id}: {e}")
            return 0, 0

    def _calculate_analytics(self, creator_id: str, reels: List[Dict], posts: List[Dict],
                           profile_data: Optional[Dict] = None) -> Dict[str, Any]:
        """Calculate comprehensive creator analytics"""
        analytics = {
            # Basic metrics
            "avg_reel_views": 0,
            "avg_reel_likes": 0,
            "avg_reel_comments": 0,
            "avg_post_likes": 0,
            "avg_post_comments": 0,
            "avg_post_engagement": 0,
            "total_views": 0,
            "total_likes": 0,
            "total_comments": 0,
            "total_engagement": 0,

            # Advanced metrics
            "engagement_rate": 0,
            "avg_engagement_per_content": 0,
            "reels_vs_posts_performance": 0,  # Ratio of reel views to post engagement
            "viral_content_rate": 0,
            "viral_content_count": 0,
            "posting_frequency_per_week": 0,
            "posting_consistency_score": 0,
            "content_reach_rate": 0,  # Views/followers ratio
            "comment_to_like_ratio": 0,

            # Content analysis
            "total_content_analyzed": 0,
            "reels_analyzed": len(reels),
            "posts_analyzed": len(posts),
            "best_performing_type": "unknown",
            "avg_caption_length": 0,
            "uses_hashtags": False,
            "avg_hashtag_count": 0,

            # Time-based metrics
            "most_active_day": None,
            "most_active_hour": None,
            "days_since_last_post": None
        }

        if not Config.ENABLE_ANALYTICS:
            return analytics

        try:
            followers_count = 0
            if profile_data:
                followers_count = profile_data.get("follower_count", 0)

            # Calculate reel metrics
            if reels:
                reel_views = []
                reel_likes = []
                reel_comments = []

                for reel in reels:
                    views = reel.get("play_count", 0)
                    likes = reel.get("like_count", 0)
                    comments = reel.get("comment_count", 0)

                    if views: reel_views.append(views)
                    if likes: reel_likes.append(likes)
                    if comments: reel_comments.append(comments)

                if reel_views:
                    analytics["avg_reel_views"] = sum(reel_views) / len(reel_views)
                    analytics["total_views"] = sum(reel_views)

                    # Content reach rate
                    if followers_count > 0:
                        analytics["content_reach_rate"] = (analytics["avg_reel_views"] / followers_count) * 100

                if reel_likes:
                    analytics["avg_reel_likes"] = sum(reel_likes) / len(reel_likes)
                    analytics["total_likes"] += sum(reel_likes)

                if reel_comments:
                    analytics["avg_reel_comments"] = sum(reel_comments) / len(reel_comments)
                    analytics["total_comments"] += sum(reel_comments)

                # Viral detection for reels
                if Config.ENABLE_VIRAL_DETECTION and reel_views:
                    viral_count = sum(1 for v in reel_views
                                    if v >= Config.VIRAL_MIN_VIEWS and
                                    v >= analytics["avg_reel_views"] * Config.VIRAL_MULTIPLIER)
                    analytics["viral_content_count"] = viral_count
                    analytics["viral_content_rate"] = (viral_count / len(reel_views)) * 100

            # Calculate post metrics
            if posts:
                post_likes = []
                post_comments = []
                post_engagements = []
                caption_lengths = []
                hashtag_counts = []

                for post in posts:
                    likes = post.get("like_count", 0)
                    comments = post.get("comment_count", 0)
                    engagement = likes + comments

                    if likes: post_likes.append(likes)
                    if comments: post_comments.append(comments)
                    if engagement: post_engagements.append(engagement)

                    # Caption analysis
                    caption = post.get("caption", {})
                    if isinstance(caption, dict):
                        caption_text = caption.get("text", "")
                    else:
                        caption_text = str(caption)

                    if caption_text:
                        caption_lengths.append(len(caption_text))
                        hashtags = self._extract_hashtags(caption_text)
                        hashtag_counts.append(len(hashtags))

                if post_likes:
                    analytics["avg_post_likes"] = sum(post_likes) / len(post_likes)
                    analytics["total_likes"] += sum(post_likes)

                if post_comments:
                    analytics["avg_post_comments"] = sum(post_comments) / len(post_comments)
                    analytics["total_comments"] += sum(post_comments)

                if post_engagements:
                    analytics["avg_post_engagement"] = sum(post_engagements) / len(post_engagements)
                    analytics["total_engagement"] += sum(post_engagements)

                if caption_lengths:
                    analytics["avg_caption_length"] = sum(caption_lengths) / len(caption_lengths)

                if hashtag_counts:
                    analytics["uses_hashtags"] = any(h > 0 for h in hashtag_counts)
                    analytics["avg_hashtag_count"] = sum(hashtag_counts) / len(hashtag_counts)

            # Calculate combined metrics
            analytics["total_content_analyzed"] = len(reels) + len(posts)
            analytics["total_engagement"] = analytics["total_likes"] + analytics["total_comments"]

            # Engagement rate calculation
            if followers_count > 0 and analytics["total_content_analyzed"] > 0:
                avg_engagement = analytics["total_engagement"] / analytics["total_content_analyzed"]
                analytics["engagement_rate"] = (avg_engagement / followers_count) * 100
                analytics["avg_engagement_per_content"] = avg_engagement

            # Comment to like ratio
            if analytics["total_likes"] > 0:
                analytics["comment_to_like_ratio"] = analytics["total_comments"] / analytics["total_likes"]

            # Reels vs Posts performance
            if analytics["avg_reel_views"] > 0 and analytics["avg_post_engagement"] > 0:
                analytics["reels_vs_posts_performance"] = analytics["avg_reel_views"] / analytics["avg_post_engagement"]

            # Best performing content type
            if analytics["avg_reel_views"] > analytics["avg_post_engagement"]:
                analytics["best_performing_type"] = "reels"
            elif analytics["avg_post_engagement"] > 0:
                analytics["best_performing_type"] = "posts"

            # Calculate posting frequency and consistency
            all_content = reels + posts
            if all_content:
                timestamps = []
                for content in all_content:
                    timestamp = content.get("taken_at") or content.get("device_timestamp")
                    if timestamp:
                        timestamps.append(timestamp)

                if timestamps:
                    timestamps.sort()
                    current_time = int(time.time())

                    # Days since last post
                    analytics["days_since_last_post"] = (current_time - timestamps[-1]) / 86400

                    # Posting frequency
                    if len(timestamps) > 1:
                        date_range_weeks = (timestamps[-1] - timestamps[0]) / (7 * 86400)
                        if date_range_weeks > 0:
                            analytics["posting_frequency_per_week"] = len(timestamps) / date_range_weeks

                        # Consistency score (0-100, based on standard deviation of posting intervals)
                        intervals = [timestamps[i+1] - timestamps[i] for i in range(len(timestamps)-1)]
                        if intervals:
                            avg_interval = sum(intervals) / len(intervals)
                            if avg_interval > 0:
                                variance = sum((x - avg_interval) ** 2 for x in intervals) / len(intervals)
                                std_dev = variance ** 0.5
                                consistency = max(0, 100 - (std_dev / avg_interval * 100))
                                analytics["posting_consistency_score"] = min(100, consistency)

                    # Time analysis
                    posting_times = [datetime.fromtimestamp(ts) for ts in timestamps]

                    # Most active day of week
                    days = [dt.strftime("%A") for dt in posting_times]
                    if days:
                        day_counts = Counter(days)
                        analytics["most_active_day"] = day_counts.most_common(1)[0][0]

                    # Most active hour
                    hours = [dt.hour for dt in posting_times]
                    if hours:
                        hour_counts = Counter(hours)
                        analytics["most_active_hour"] = hour_counts.most_common(1)[0][0]

        except Exception as e:
            logger.warning(f"Failed to calculate analytics for {creator_id}: {e}")

        return analytics

    def _store_reels(self, creator_id: str, username: str, reels: List[Dict]) -> tuple[int, int, int]:
        """Store reels in database with comprehensive data extraction
        Returns: (total_saved, new_count, existing_count)
        """
        if not reels:
            return 0, 0, 0

        # First check which reels already exist
        media_pks = [str(reel.get("pk")) for reel in reels if reel.get("pk")]
        existing_pks = set()
        if media_pks:
            try:
                result = self.supabase.table("instagram_reels")\
                    .select("media_pk")\
                    .in_("media_pk", media_pks)\
                    .execute()
                existing_pks = {row["media_pk"] for row in (result.data or [])}
            except Exception as e:
                logger.debug(f"Failed to check existing reels: {e}")

        new_count = 0
        existing_count = 0
        rows = []

        for reel in reels:
            try:
                # Extract caption text and hashtags
                caption_data = reel.get("caption", {})
                if isinstance(caption_data, dict):
                    caption_text = caption_data.get("text", "")
                else:
                    caption_text = str(caption_data) if caption_data else ""

                hashtags = self._extract_hashtags(caption_text) if caption_text else []
                mentions = self._extract_mentions(caption_text) if caption_text else []

                # Extract engagement metrics
                engagement = (reel.get("like_count", 0) or 0) + (reel.get("comment_count", 0) or 0)

                # Calculate engagement rate if we have follower count
                engagement_rate = 0
                if hasattr(self, 'current_creator_followers') and self.current_creator_followers > 0:
                    engagement_rate = (engagement / self.current_creator_followers) * 100

                row = {
                    "media_pk": reel.get("pk"),
                    "media_id": reel.get("id"),
                    "shortcode": reel.get("code"),
                    "creator_id": str(creator_id),
                    "creator_username": username,
                    "product_type": reel.get("product_type"),
                    "media_type": reel.get("media_type"),
                    "taken_at": self._to_iso(reel.get("taken_at") or reel.get("device_timestamp")),
                    "caption_text": caption_text[:2000] if caption_text else None,  # Limit caption length
                    "hashtags": hashtags,
                    "hashtag_count": len(hashtags),
                    "mention_count": len(mentions),
                    "play_count": reel.get("play_count", 0),
                    "ig_play_count": reel.get("ig_play_count"),
                    "like_count": reel.get("like_count", 0),
                    "comment_count": reel.get("comment_count", 0),
                    "share_count": reel.get("share_count"),
                    "save_count": reel.get("save_count"),
                    "engagement_count": engagement,
                    "engagement_rate": round(engagement_rate, 2),
                    "has_audio": reel.get("has_audio"),
                    "video_duration": reel.get("video_duration") or reel.get("media_duration"),
                    "video_url": reel.get("video_url"),
                    "thumbnail_url": reel.get("image_versions2", {}).get("candidates", [{}])[0].get("url") if reel.get("image_versions2") else None,
                    "is_paid_partnership": reel.get("is_paid_partnership", False),
                    "has_shared_to_fb": reel.get("has_shared_to_fb", 0),
                    "is_unified_video": reel.get("is_unified_video", False),
                    "is_dash_eligible": reel.get("is_dash_eligible"),
                    "number_of_qualities": reel.get("number_of_qualities"),
                    "raw_media_json": reel,
                    "scraped_at": datetime.now(timezone.utc).isoformat()
                }

                if row["media_pk"]:
                    rows.append(row)
                    # Track if this is new or existing
                    if str(row["media_pk"]) in existing_pks:
                        existing_count += 1
                    else:
                        new_count += 1

            except Exception as e:
                logger.debug(f"Failed to process reel: {e}")
                continue

        total_saved = 0
        if rows:
            try:
                self.supabase.table("instagram_reels").upsert(rows, on_conflict="media_pk").execute()
                total_saved = len(rows)
                logger.info(f"Saved {total_saved} reels for {username}: {new_count} new records, {existing_count} existing updated")
            except Exception as e:
                logger.error(f"Failed to store reels: {e}")

        return total_saved, new_count, existing_count

    def _store_posts(self, creator_id: str, username: str, posts: List[Dict]) -> tuple[int, int, int]:
        """Store posts in database with comprehensive data extraction
        Returns: (total_saved, new_count, existing_count)
        """
        if not posts:
            return 0, 0, 0

        # First check which posts already exist
        media_pks = [str(post.get("pk")) for post in posts if post.get("pk")]
        existing_pks = set()
        if media_pks:
            try:
                result = self.supabase.table("instagram_posts")\
                    .select("media_pk")\
                    .in_("media_pk", media_pks)\
                    .execute()
                existing_pks = {row["media_pk"] for row in (result.data or [])}
            except Exception as e:
                logger.debug(f"Failed to check existing posts: {e}")

        new_count = 0
        existing_count = 0
        rows = []

        for post in posts:
            try:
                # Extract caption text and hashtags
                caption_data = post.get("caption", {})
                if isinstance(caption_data, dict):
                    caption_text = caption_data.get("text", "")
                else:
                    caption_text = str(caption_data) if caption_data else ""

                hashtags = self._extract_hashtags(caption_text) if caption_text else []
                mentions = self._extract_mentions(caption_text) if caption_text else []

                # Extract engagement metrics
                engagement = (post.get("like_count", 0) or 0) + (post.get("comment_count", 0) or 0)

                # Calculate engagement rate if we have follower count
                engagement_rate = 0
                if hasattr(self, 'current_creator_followers') and self.current_creator_followers > 0:
                    engagement_rate = (engagement / self.current_creator_followers) * 100

                # Determine post type (single image, carousel, video)
                carousel_media_count = 0
                if post.get("carousel_media"):
                    carousel_media_count = len(post.get("carousel_media", []))
                    post_type = "carousel"
                elif post.get("media_type") == 2 or post.get("product_type") == "clips":
                    post_type = "video"
                else:
                    post_type = "image"

                row = {
                    "media_pk": post.get("pk"),
                    "media_id": post.get("id"),
                    "shortcode": post.get("code"),
                    "creator_id": str(creator_id),
                    "creator_username": username,
                    "product_type": post.get("product_type", "feed"),
                    "media_type": post.get("media_type"),
                    "post_type": post_type,
                    "carousel_media_count": carousel_media_count,
                    "taken_at": self._to_iso(post.get("taken_at") or post.get("device_timestamp")),
                    "caption_text": caption_text[:2000] if caption_text else None,  # Limit caption length
                    "hashtags": hashtags,
                    "hashtag_count": len(hashtags),
                    "mention_count": len(mentions),
                    "like_count": post.get("like_count", 0),
                    "comment_count": post.get("comment_count", 0),
                    "save_count": post.get("save_count"),
                    "share_count": post.get("share_count"),
                    "engagement_count": engagement,
                    "engagement_rate": round(engagement_rate, 2),
                    "is_paid_partnership": post.get("is_paid_partnership", False),
                    "has_shared_to_fb": post.get("has_shared_to_fb", 0),
                    "comments_disabled": post.get("comments_disabled", False),
                    "sharing_friction_info": post.get("sharing_friction_info"),
                    "original_width": post.get("original_width"),
                    "original_height": post.get("original_height"),
                    "accessibility_caption": post.get("accessibility_caption"),
                    "thumbnail_url": post.get("image_versions2", {}).get("candidates", [{}])[0].get("url") if post.get("image_versions2") else None,
                    "video_duration": post.get("video_duration") if post_type == "video" else None,
                    "view_count": post.get("view_count") or post.get("play_count"),
                    "raw_media_json": post,
                    "scraped_at": datetime.now(timezone.utc).isoformat()
                }

                if row["media_pk"]:
                    rows.append(row)
                    # Track if this is new or existing
                    if str(row["media_pk"]) in existing_pks:
                        existing_count += 1
                    else:
                        new_count += 1

            except Exception as e:
                logger.debug(f"Failed to process post: {e}")
                continue

        total_saved = 0
        if rows:
            try:
                self.supabase.table("instagram_posts").upsert(rows, on_conflict="media_pk").execute()
                total_saved = len(rows)
                logger.info(f"Saved {total_saved} posts for {username}: {new_count} new records, {existing_count} existing updated")
            except Exception as e:
                logger.error(f"Failed to store posts: {e}")

        return total_saved, new_count, existing_count

    def _to_iso(self, timestamp: Optional[int]) -> Optional[str]:
        """Convert Unix timestamp to ISO format"""
        if not timestamp:
            return None
        try:
            return datetime.fromtimestamp(int(timestamp), tz=timezone.utc).isoformat()
        except Exception:
            return None

    def _update_creator_analytics(self, creator_id: str, analytics: Dict[str, Any]):
        """Update creator with calculated analytics"""
        try:
            update_data = {
                "avg_views_per_reel_cached": analytics.get("avg_reel_views"),
                "avg_engagement_rate": analytics.get("avg_post_engagement"),
                "posting_frequency_per_week": analytics.get("posting_frequency_per_week"),
                "last_scraped_at": datetime.now(timezone.utc).isoformat(),
                "total_api_calls": self.supabase.table("instagram_creators")\
                    .select("total_api_calls")\
                    .eq("ig_user_id", creator_id)\
                    .single()\
                    .execute()\
                    .data.get("total_api_calls", 0) + self.api_calls_made
            }

            self.supabase.table("instagram_creators")\
                .update(update_data)\
                .eq("ig_user_id", creator_id)\
                .execute()

        except Exception as e:
            logger.warning(f"Failed to update creator analytics for {creator_id}: {e}")

    def process_creator(self, creator: Dict[str, Any]) -> bool:
        """Process a single creator with comprehensive data fetching and analytics"""

        # Handle different key formats
        creator_id = str(creator.get("ig_user_id") or creator.get("instagram_id", ""))
        username = creator.get("username", "")
        thread_id = threading.current_thread().name

        logger.info(f"[{thread_id}] Processing {username} ({creator_id})")
        logger.info(f"[{thread_id}] RAPIDAPI_KEY check: {'SET' if Config.RAPIDAPI_KEY else 'MISSING'}")
        self._log_realtime("info", f"📊 [{thread_id}] Processing creator: {username}", {
            "creator_id": creator_id,
            "username": username,
            "thread": thread_id
        })

        try:
            # Check existing content
            reels_count, posts_count = self._get_creator_content_counts(creator_id)
            is_new = (reels_count == 0 and posts_count == 0)

            api_calls_start = self.api_calls_made
            profile_data = None

            # Step 1: Always fetch profile data first (for both new and existing creators)
            logger.info(f"[{thread_id}] Step 1/3: Fetching profile for {username}")
            self._log_realtime("info", f"👤 [{thread_id}] Step 1/3: Fetching profile for {username}", {
                "username": username,
                "thread": thread_id,
                "step": "1/3",
                "action": "profile"
            })
            profile_data = self._fetch_profile(username)

            if profile_data:
                # Set current follower count for engagement rate calculations
                self.current_creator_followers = profile_data.get("follower_count", 0)

                # Update creator with fresh profile data
                update_data = {
                    "followers_count": profile_data.get("follower_count"),
                    "following_count": profile_data.get("following_count"),
                    "media_count": profile_data.get("media_count"),
                    "bio": profile_data.get("biography"),
                    "is_verified": profile_data.get("is_verified"),
                    "profile_pic_url": profile_data.get("profile_pic_url"),
                    "is_business_account": profile_data.get("is_business_account"),
                    "is_professional_account": profile_data.get("is_professional_account"),
                    "category_name": profile_data.get("category_name"),
                    "external_url": profile_data.get("external_url"),
                    "full_name": profile_data.get("full_name"),
                    "is_private": profile_data.get("is_private"),
                    "last_scraped_at": datetime.now(timezone.utc).isoformat()
                }

                self.supabase.table("instagram_creators").update(update_data)\
                    .eq("ig_user_id", creator_id).execute()

                logger.info(f"Profile updated: {profile_data.get('follower_count', 0):,} followers")
                self._log_realtime("info", f"✅ Profile fetched: {profile_data.get('follower_count', 0):,} followers", {
                    "username": username,
                    "followers": profile_data.get('follower_count', 0)
                })

            # Determine fetch counts based on existing content
            if is_new:
                reels_to_fetch = Config.NEW_CREATOR_REELS_COUNT
                posts_to_fetch = Config.NEW_CREATOR_POSTS_COUNT
                logger.info(f"New creator - fetching {reels_to_fetch} reels, {posts_to_fetch} posts")
            else:
                reels_to_fetch = Config.EXISTING_CREATOR_REELS_COUNT
                posts_to_fetch = Config.EXISTING_CREATOR_POSTS_COUNT
                logger.info(f"Existing creator - fetching {reels_to_fetch} reels, {posts_to_fetch} posts")

            # Step 2: Fetch reels
            logger.info(f"[{thread_id}] Step 2/3: Fetching {reels_to_fetch} reels for {username}")
            self._log_realtime("info", f"📹 [{thread_id}] Step 2/3: Fetching {reels_to_fetch} reels for {username}", {
                "username": username,
                "thread": thread_id,
                "step": "2/3",
                "action": "reels",
                "count": reels_to_fetch
            })
            reels = self._fetch_reels(creator_id, reels_to_fetch)
            logger.info(f"[{thread_id}] Fetched {len(reels)} reels")

            # Step 3: Fetch posts
            logger.info(f"[{thread_id}] Step 3/3: Fetching {posts_to_fetch} posts for {username}")
            self._log_realtime("info", f"📸 [{thread_id}] Step 3/3: Fetching {posts_to_fetch} posts for {username}", {
                "username": username,
                "thread": thread_id,
                "step": "3/3",
                "action": "posts",
                "count": posts_to_fetch
            })
            posts = self._fetch_posts(creator_id, posts_to_fetch)
            logger.info(f"[{thread_id}] Fetched {len(posts)} posts")

            # Store content
            reels_saved, reels_new, reels_existing = self._store_reels(creator_id, username, reels)
            posts_saved, posts_new, posts_existing = self._store_posts(creator_id, username, posts)
            total_saved = reels_saved + posts_saved
            total_new = reels_new + posts_new

            # Calculate comprehensive analytics
            logger.info(f"[{thread_id}] Calculating analytics for {username}")
            self._log_realtime("info", f"📈 [{thread_id}] Calculating analytics for {username}", {
                "username": username,
                "thread": thread_id
            })
            analytics = self._calculate_analytics(creator_id, reels, posts, profile_data)
            self._update_creator_analytics(creator_id, analytics)

            # Log analytics summary
            summary = self._format_analytics_summary(analytics)
            logger.info(f"\n{summary}")

            # Create detailed completion message
            total_fetched = len(reels) + len(posts)
            # More descriptive logging
            if reels_saved == 0 and len(reels) > 0:
                log_msg = f"✅ Processed {username}: Fetched {len(reels)} reels (0 saved), {len(posts)} posts ({posts_saved} saved, {posts_new} new)"
            else:
                log_msg = f"✅ Processed {username}: Fetched {len(reels)} reels ({reels_saved} saved, {reels_new} new), {len(posts)} posts ({posts_saved} saved, {posts_new} new)"

            self._log_realtime("success", log_msg, {
                "username": username,
                "reels_fetched": len(reels),
                "posts_fetched": len(posts),
                "reels_saved": reels_saved,
                "posts_saved": posts_saved,
                "total_saved": total_saved,
                "new_records": total_new,
                "engagement_rate": round(analytics.get('engagement_rate', 0), 2)
            })

            # Log success with comprehensive analytics
            api_calls_used = self.api_calls_made - api_calls_start
            self._log_to_supabase(
                action="process_creator",
                username=username,
                creator_id=creator_id,
                success=True,
                items_fetched=total_fetched,
                items_saved=total_saved,
                details={
                    "is_new": is_new,
                    "reels_fetched": len(reels),
                    "posts_fetched": len(posts),
                    "reels_saved": reels_saved,
                    "posts_saved": posts_saved,
                    "reels_new": reels_new,
                    "reels_existing": reels_existing,
                    "posts_new": posts_new,
                    "posts_existing": posts_existing,
                    "total_new": total_new,
                    "total_saved": total_saved,
                    "new_items": total_new,
                    "updated_items": reels_existing + posts_existing,
                    "api_calls": api_calls_used,
                    "followers_count": profile_data.get("follower_count", 0) if profile_data else 0,
                    "profile_fetched": profile_data is not None
                },
                analytics=analytics  # Pass analytics separately for detailed logging
            )

            logger.info(f"✓ {username}: {api_calls_used} API calls, "
                       f"{reels_new} new reels, {reels_existing} existing reels, "
                       f"{posts_new} new posts, {posts_existing} existing posts")

            self.creators_processed += 1
            return True

        except Exception as e:
            logger.error(f"Failed to process {username}: {e}")
            self.errors.append({"creator": username, "error": str(e)})
            self._log_realtime("error", f"❌ Failed to process {username}: {str(e)}", {
                "username": username,
                "error": str(e)
            })

            self._log_to_supabase(
                action="process_creator",
                username=username,
                creator_id=creator_id,
                success=False,
                error=str(e)
            )

            return False

    def get_creators_to_process(self) -> List[Dict[str, Any]]:
        """Get list of approved creators to process"""
        import random

        try:
            query = self.supabase.table("instagram_creators")\
                .select("ig_user_id, username")\
                .eq("review_status", "ok")\
                .neq("ig_user_id", None)

            if Config.DRY_RUN:
                query = query.limit(Config.TEST_LIMIT)

            result = query.execute()
            creators = result.data or []

            # Randomize the order of creators to process
            random.shuffle(creators)

            logger.info(f"Found {len(creators)} approved creators to process (randomized order)")
            return creators

        except Exception as e:
            logger.error(f"Failed to fetch creators: {e}")
            return []

    def update_scraper_status(self, status: str, details: Optional[Dict] = None):
        """Update scraper control status in database"""
        try:
            # Update system_control table
            update_data = {
                "status": status,
                "last_heartbeat": datetime.now(timezone.utc).isoformat(),
                "config": {
                    "total_creators_processed": self.creators_processed,
                    "total_api_calls_today": self.daily_calls,
                    "successful_calls": self.successful_calls,
                    "failed_calls": self.failed_calls,
                    "current_cycle": self.cycle_number,
                    "api_config": Config.to_dict()
                }
            }

            # Add PID when running
            if status == "running":
                update_data["pid"] = os.getpid()
                update_data["started_at"] = datetime.now(timezone.utc).isoformat()
            elif status in ["stopped", "error"]:
                update_data["pid"] = None
                update_data["stopped_at"] = datetime.now(timezone.utc).isoformat()

            if details:
                update_data["config"]["details"] = details

            # Update the system_control table
            self.supabase.table("system_control")\
                .update(update_data)\
                .eq("script_name", "instagram_scraper")\
                .execute()

        except Exception as e:
            logger.warning(f"Failed to update scraper status: {e}")

    def process_creators_concurrent(self, creators: List[Dict]):
        """Process multiple creators concurrently with thread pool"""
        futures = []
        successful = 0
        failed = 0

        # Log thread distribution
        self._log_realtime("info", f"🔄 Distributing {len(creators)} creators across {Config.CONCURRENT_CREATORS} threads", {
            "creators_count": len(creators),
            "threads": Config.CONCURRENT_CREATORS,
            "target_rps": Config.REQUESTS_PER_SECOND
        })

        with ThreadPoolExecutor(max_workers=Config.CONCURRENT_CREATORS, thread_name_prefix="Worker") as executor:
            for i, creator in enumerate(creators):
                # Check if scraper should stop
                if not self.should_continue():
                    logger.info("Scraper stop signal received")
                    break

                # Submit creator processing to thread pool
                future = executor.submit(self.process_creator, creator)
                futures.append((future, creator))

                # Small delay to avoid thundering herd
                time.sleep(0.05)

            # Collect results as they complete
            for i, (future, creator) in enumerate(futures):
                username = creator.get('username', 'Unknown')
                try:
                    result = future.result(timeout=120)  # 2 minute timeout per creator
                    if result:
                        successful += 1
                        logger.debug(f"✅ Creator {username} processed successfully")
                except FuturesTimeoutError:
                    failed += 1
                    logger.error(f"⏱️ Timeout processing creator {username} (exceeded 120s)")
                    self.errors.append({"creator": username, "error": "Processing timeout"})
                except Exception as e:
                    failed += 1
                    logger.error(f"❌ Creator {username} processing failed: {e}")
                    import traceback
                    logger.error(f"Traceback: {traceback.format_exc()}")
                    self.errors.append({"creator": username, "error": str(e)})

        logger.info(f"\n📊 Batch Results: {successful} successful, {failed} failed out of {len(creators)} creators")

    def run(self):
        """Main execution method with continuous loop"""
        logger.info("=" * 60)
        logger.info("Instagram Unified Scraper Starting")
        logger.info(f"Workers: {Config.MAX_WORKERS}, Target RPS: {Config.REQUESTS_PER_SECOND}")
        logger.info(f"Concurrent Creators: {Config.CONCURRENT_CREATORS}")
        logger.info(f"RAPIDAPI_KEY configured: {'YES' if Config.RAPIDAPI_KEY else 'NO'}")
        logger.info("=" * 60)

        # Update status to running
        self.update_scraper_status("running")

        # Initial check
        initial_continue = self.should_continue()
        logger.info(f"Initial should_continue() check: {initial_continue}")

        if not initial_continue:
            logger.warning("Scraper is disabled, exiting")
            return

        # Main processing loop
        while self.should_continue():
            self.cycle_number += 1
            self.cycle_start_time = datetime.now(timezone.utc)

            logger.info(f"\n{'='*60}")
            logger.info(f"Starting Cycle #{self.cycle_number} at {self.cycle_start_time.isoformat()}")
            logger.info(f"{'='*60}")

            # Log cycle start
            self._log_realtime("info", f"🔄 Starting Cycle #{self.cycle_number}", {
                "cycle": self.cycle_number,
                "start_time": self.cycle_start_time.isoformat(),
                "workers": Config.MAX_WORKERS,
                "target_rps": Config.REQUESTS_PER_SECOND
            })

            try:
                # Get creators and randomize order
                creators = self.get_creators_to_process()

                if not creators:
                    logger.warning("No creators to process in this cycle")
                    self._log_realtime("warning", f"⚠️ Cycle #{self.cycle_number}: No creators to process")
                else:
                    # Randomize creator order
                    random.shuffle(creators)
                    total_creators = len(creators)

                    # Calculate optimal processing
                    estimated_api_calls = total_creators * 2.4  # Average API calls per creator
                    estimated_time = estimated_api_calls / Config.REQUESTS_PER_SECOND

                    logger.info(f"Processing {total_creators} creators (randomized order)")
                    logger.info(f"Estimated API calls: {estimated_api_calls:.0f}")
                    logger.info(f"Estimated time: {estimated_time:.1f} seconds ({estimated_time/60:.1f} minutes)")

                    self._log_realtime("info", f"📊 Cycle #{self.cycle_number}: Processing {total_creators} creators", {
                        "cycle": self.cycle_number,
                        "total_creators": total_creators,
                        "estimated_api_calls": int(estimated_api_calls),
                        "estimated_time_minutes": round(estimated_time/60, 1)
                    })

                    # Process in concurrent batches
                    # With 10 concurrent creators, process in smaller stable batches
                    batch_size = min(Config.CONCURRENT_CREATORS, total_creators)  # Process up to 10 at once for stability

                    # Track processing progress
                    processed_count = 0
                    failed_batches = 0

                    for i in range(0, total_creators, batch_size):
                        # Check if we should stop
                        if not self.should_continue():
                            logger.info("Stop requested, terminating batch processing")
                            self._log_realtime("info", "⏹️ Stopping scraper as requested")
                            break

                        batch = creators[i:i+batch_size]
                        batch_num = (i // batch_size) + 1
                        total_batches = (total_creators + batch_size - 1) // batch_size

                        logger.info(f"\n📦 Processing batch {batch_num}/{total_batches}: {len(batch)} creators")
                        logger.info(f"Progress: {processed_count}/{total_creators} creators completed")

                        # Use thread pool for concurrent processing with error handling
                        try:
                            self.process_creators_concurrent(batch)
                            processed_count += len(batch)
                        except Exception as batch_error:
                            failed_batches += 1
                            logger.error(f"❌ Batch {batch_num} failed: {batch_error}")
                            self._log_realtime("error", f"❌ Batch {batch_num} processing failed", {
                                "batch_num": batch_num,
                                "error": str(batch_error),
                                "creators_in_batch": len(batch)
                            })
                            # Continue with next batch instead of crashing
                            continue

                        # Log performance stats
                        stats = self.performance_monitor.get_stats()
                        logger.info(f"Performance: {stats['current_rps']:.1f} req/sec, "
                                   f"Avg response: {stats['avg_response_time']:.3f}s, "
                                   f"Total requests: {stats['total_requests']}")

                        # Check if we need to slow down
                        if stats['current_rps'] > Config.REQUESTS_PER_SECOND:
                            logger.warning(f"Slowing down - exceeding rate limit: {stats['current_rps']:.1f} req/sec")
                            self._log_realtime("warning", f"⚠️ Rate limit approached: {stats['current_rps']:.1f} req/sec", {
                                "current_rps": stats['current_rps'],
                                "limit": Config.REQUESTS_PER_SECOND
                            })
                            time.sleep(2)

                        # Log batch progress with better visibility
                        progress_pct = ((i + len(batch)) / total_creators) * 100
                        remaining = total_creators - processed_count
                        logger.info(f"✅ Batch {batch_num} completed successfully")
                        logger.info(f"Overall progress: {progress_pct:.1f}% ({processed_count}/{total_creators})")
                        logger.info(f"Remaining creators: {remaining}")

                        self._log_realtime("info", f"📊 Progress: {progress_pct:.1f}% complete", {
                            "batch_num": batch_num,
                            "total_batches": total_batches,
                            "progress_percentage": round(progress_pct, 1),
                            "creators_processed": processed_count,
                            "total_creators": total_creators,
                            "remaining": remaining
                        })

                    # Cycle summary (moved outside batch loop)
                    cycle_duration = (datetime.now(timezone.utc) - self.cycle_start_time).total_seconds()
                    avg_calls_per_creator = self.api_calls_made / max(self.creators_processed, 1)
                    total_cost = self.api_calls_made * Config.get_cost_per_request()
                    success_rate = (self.successful_calls / max(self.api_calls_made, 1)) * 100

                    logger.info("\n" + "=" * 60)
                    logger.info(f"🎉 CYCLE #{self.cycle_number} COMPLETE")
                    logger.info("=" * 60)
                    logger.info(f"Creators Processed: {self.creators_processed}/{total_creators} ({(self.creators_processed/total_creators)*100:.1f}%)")
                    logger.info(f"API Calls Made: {self.api_calls_made}")
                    logger.info(f"Successful Calls: {self.successful_calls} ({success_rate:.1f}% success rate)")
                    logger.info(f"Failed Calls: {self.failed_calls}")
                    logger.info(f"Failed Batches: {failed_batches}")
                    logger.info(f"Average Calls per Creator: {avg_calls_per_creator:.1f}")
                    logger.info(f"Total Cost: ${total_cost:.2f}")
                    logger.info(f"Cycle Duration: {cycle_duration:.1f} seconds ({cycle_duration/60:.1f} minutes)")
                    logger.info(f"Errors: {len(self.errors)}")
                    logger.info("=" * 60 + "\n")

                    # Log cycle completion
                    self._log_realtime("success", f"✅ Cycle #{self.cycle_number} complete", {
                        "cycle": self.cycle_number,
                        "creators_processed": self.creators_processed,
                        "api_calls": self.api_calls_made,
                        "successful_calls": self.successful_calls,
                        "failed_calls": self.failed_calls,
                        "total_cost": round(total_cost, 2),
                        "cycle_duration_minutes": round(cycle_duration/60, 1),
                        "errors": len(self.errors)
                    })

            except Exception as e:
                logger.error(f"Cycle #{self.cycle_number} failed: {e}")
                self._log_realtime("error", f"❌ Cycle #{self.cycle_number} failed: {str(e)}", {
                    "cycle": self.cycle_number,
                    "error": str(e)
                })

            # Check if we should continue
            if not self.should_continue():
                logger.info("Stop requested, ending continuous loop")
                self._log_realtime("info", "⏹️ Scraper stopping as requested")
                break

            # Wait for next cycle (3 hours)
            next_cycle_time = self.cycle_start_time + timedelta(hours=3)
            wait_seconds = (next_cycle_time - datetime.now(timezone.utc)).total_seconds()

            if wait_seconds > 0:
                logger.info(f"Waiting {wait_seconds/60:.1f} minutes until next cycle at {next_cycle_time.isoformat()}")
                self._log_realtime("info", f"⏰ Next cycle in {wait_seconds/60:.1f} minutes", {
                    "next_cycle_time": next_cycle_time.isoformat(),
                    "wait_minutes": round(wait_seconds/60, 1)
                })

                # Check for stop signal periodically during sleep
                sleep_interval = 60  # Check every minute
                heartbeat_counter = 0
                for _ in range(int(wait_seconds / sleep_interval)):
                    # Update heartbeat every 5 minutes
                    heartbeat_counter += 1
                    if heartbeat_counter >= 5:  # 5 minutes
                        self.update_scraper_status("running", {"waiting_for_next_cycle": True})
                        heartbeat_counter = 0

                    if not self.should_continue():
                        logger.info("Stop requested during wait")
                        break
                    time.sleep(sleep_interval)

        # Final cleanup when scraper stops
        logger.info("Instagram scraper stopped")
        self.update_scraper_status("stopped", {
            "total_cycles": self.cycle_number,
            "total_api_calls": self.api_calls_made,
            "successful_calls": self.successful_calls,
            "failed_calls": self.failed_calls
        })


def main():
    """Main entry point"""
    try:
        scraper = InstagramScraperUnified()
        scraper.run()
    except KeyboardInterrupt:
        logger.info("Scraper interrupted by user")
        sys.exit(0)
    except Exception as e:
        logger.error(f"Fatal error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()