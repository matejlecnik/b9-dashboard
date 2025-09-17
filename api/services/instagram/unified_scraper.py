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
from concurrent.futures import ThreadPoolExecutor, as_completed
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
    level=getattr(logging, Config.LOG_LEVEL),
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
        self.creators_processed = 0
        self.errors = []
        self.start_time = time.time()

        # Cost tracking
        self.daily_calls = self._get_daily_api_calls()
        self.monthly_calls = self._get_monthly_api_calls()

        # Stop mechanism
        self.stop_requested = False

    def should_continue(self) -> bool:
        """Check if scraper should continue running"""
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
            result = self.supabase.table("instagram_scraper_realtime_logs")\
                .select("context")\
                .gte("timestamp", f"{today}T00:00:00Z")\
                .eq("source", "instagram_scraper")\
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
            result = self.supabase.table("instagram_scraper_realtime_logs")\
                .select("context")\
                .gte("timestamp", first_of_month.isoformat())\
                .eq("source", "instagram_scraper")\
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
        """Log real-time message to instagram_scraper_realtime_logs for monitoring"""
        if not Config.ENABLE_SUPABASE_LOGGING:
            return

        try:
            log_entry = {
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "level": level,
                "message": message,
                "source": "instagram_scraper",
                "context": context or {}
            }
            self.supabase.table("instagram_scraper_realtime_logs").insert(log_entry).execute()
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
                    new_count = details.get('new_items', 0) if details else 0
                    updated_count = details.get('updated_items', 0) if details else 0
                    message = f"✅ Processed {username}: {items_fetched} items ({new_count} new, {updated_count} updated)"
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
                "monthly_budget_used": ((self.monthly_calls + self.api_calls_made) / Config.MAX_MONTHLY_API_CALLS) * 100,
                "daily_budget_used": ((self.daily_calls + self.api_calls_made) / Config.MAX_DAILY_API_CALLS) * 100,
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
                "level": level,
                "message": message,
                "source": "instagram_scraper",
                "context": context
            }

            self.supabase.table("instagram_scraper_realtime_logs").insert(log_entry).execute()
        except Exception as e:
            logger.warning(f"Failed to log to Supabase: {e}")

    def _apply_rate_limiting(self):
        """Apply rate limiting to ensure we don't exceed API limits"""
        with self.request_lock:
            current_time = time.time()
            time_since_last = current_time - self.last_request_time

            if time_since_last < Config.RATE_LIMIT_DELAY:
                sleep_time = Config.RATE_LIMIT_DELAY - time_since_last
                time.sleep(sleep_time)

            self.last_request_time = time.time()

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

        # Check rate limits
        if self.daily_calls >= Config.MAX_DAILY_API_CALLS:
            raise APIError(f"Daily API limit reached: {self.daily_calls}/{Config.MAX_DAILY_API_CALLS}")

        if self.monthly_calls >= Config.MAX_MONTHLY_API_CALLS:
            raise APIError(f"Monthly API limit reached: {self.monthly_calls}/{Config.MAX_MONTHLY_API_CALLS}")

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
            return response.json()

        except requests.exceptions.RequestException as e:
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
        """Fetch Instagram reels"""
        reels = []
        max_id = None
        total_to_fetch = count

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
                if not items:
                    break

                reels.extend(items)

                paging = data.get("paging_info", {})
                if not paging.get("more_available"):
                    break

                max_id = paging.get("max_id")

            except Exception as e:
                logger.error(f"Failed to fetch reels page: {e}")
                break

        return reels[:total_to_fetch]

    def _fetch_posts(self, user_id: str, count: int = 12) -> List[Dict[str, Any]]:
        """Fetch Instagram posts"""
        posts = []
        max_id = None
        total_to_fetch = count

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
                if not items:
                    break

                posts.extend(items)

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

    def _store_reels(self, creator_id: str, username: str, reels: List[Dict]) -> tuple[int, int]:
        """Store reels in database with comprehensive data extraction
        Returns: (new_count, updated_count)
        """
        if not reels:
            return 0, 0

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
        updated_count = 0
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
                    # Track if this is new or update
                    if str(row["media_pk"]) in existing_pks:
                        updated_count += 1
                    else:
                        new_count += 1

            except Exception as e:
                logger.debug(f"Failed to process reel: {e}")
                continue

        if rows:
            try:
                self.supabase.table("instagram_reels").upsert(rows, on_conflict="media_pk").execute()
                logger.info(f"Processed {len(rows)} reels for {username}: {new_count} new, {updated_count} updated")
            except Exception as e:
                logger.error(f"Failed to store reels: {e}")

        return new_count, updated_count

    def _store_posts(self, creator_id: str, username: str, posts: List[Dict]) -> tuple[int, int]:
        """Store posts in database with comprehensive data extraction
        Returns: (new_count, updated_count)
        """
        if not posts:
            return 0, 0

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
        updated_count = 0
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
                # Track if this is new or update
                if str(row["media_pk"]) in existing_pks:
                    updated_count += 1
                else:
                    new_count += 1

            except Exception as e:
                logger.debug(f"Failed to process post: {e}")
                continue

        if rows:
            try:
                self.supabase.table("instagram_posts").upsert(rows, on_conflict="media_pk").execute()
                logger.info(f"Processed {len(rows)} posts for {username}: {new_count} new, {updated_count} updated")
            except Exception as e:
                logger.error(f"Failed to store posts: {e}")

        return new_count, updated_count

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
        creator_id = str(creator["ig_user_id"])
        username = creator["username"]

        logger.info(f"Processing {username} ({creator_id})")
        self._log_realtime("info", f"📊 Processing creator: {username}", {
            "creator_id": creator_id,
            "username": username
        })

        try:
            # Check existing content
            reels_count, posts_count = self._get_creator_content_counts(creator_id)
            is_new = (reels_count == 0 and posts_count == 0)

            api_calls_start = self.api_calls_made
            profile_data = None

            # Step 1: Always fetch profile data first (for both new and existing creators)
            logger.info(f"Step 1/4: Fetching profile for {username}")
            self._log_realtime("info", f"🔍 Fetching profile for {username}")
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
            logger.info(f"Step 2/4: Fetching {reels_to_fetch} reels for {username}")
            self._log_realtime("info", f"📹 Fetching {reels_to_fetch} reels for {username}")
            reels = self._fetch_reels(creator_id, reels_to_fetch)
            logger.info(f"Fetched {len(reels)} reels")

            # Step 3: Fetch posts
            logger.info(f"Step 3/4: Fetching {posts_to_fetch} posts for {username}")
            self._log_realtime("info", f"📸 Fetching {posts_to_fetch} posts for {username}")
            posts = self._fetch_posts(creator_id, posts_to_fetch)
            logger.info(f"Fetched {len(posts)} posts")

            # Store content
            reels_new, reels_updated = self._store_reels(creator_id, username, reels)
            posts_new, posts_updated = self._store_posts(creator_id, username, posts)
            reels_stored = reels_new + reels_updated
            posts_stored = posts_new + posts_updated

            # Step 4: Calculate comprehensive analytics
            logger.info(f"Step 4/4: Calculating analytics for {username}")
            self._log_realtime("info", f"📈 Calculating analytics for {username}")
            analytics = self._calculate_analytics(creator_id, reels, posts, profile_data)
            self._update_creator_analytics(creator_id, analytics)

            # Log analytics summary
            summary = self._format_analytics_summary(analytics)
            logger.info(f"\n{summary}")

            # Create detailed completion message
            total_new = reels_new + posts_new
            total_updated = reels_updated + posts_updated
            self._log_realtime("success", f"✅ Processed {username}: {len(reels) + len(posts)} items ({total_new} new, {total_updated} updated)", {
                "username": username,
                "reels_fetched": len(reels),
                "posts_fetched": len(posts),
                "reels_new": reels_new,
                "reels_updated": reels_updated,
                "posts_new": posts_new,
                "posts_updated": posts_updated,
                "engagement_rate": round(analytics.get('engagement_rate', 0), 2)
            })

            # Log success with comprehensive analytics
            api_calls_used = self.api_calls_made - api_calls_start
            self._log_to_supabase(
                action="process_creator",
                username=username,
                creator_id=creator_id,
                success=True,
                items_fetched=len(reels) + len(posts),
                items_saved=reels_stored + posts_stored,
                details={
                    "is_new": is_new,
                    "reels_fetched": len(reels),
                    "posts_fetched": len(posts),
                    "reels_new": reels_new,
                    "reels_updated": reels_updated,
                    "posts_new": posts_new,
                    "posts_updated": posts_updated,
                    "new_items": reels_new + posts_new,
                    "updated_items": reels_updated + posts_updated,
                    "api_calls": api_calls_used,
                    "followers_count": profile_data.get("follower_count", 0) if profile_data else 0,
                    "profile_fetched": profile_data is not None
                },
                analytics=analytics  # Pass analytics separately for detailed logging
            )

            logger.info(f"✓ {username}: {api_calls_used} API calls, "
                       f"{reels_new} new reels, {reels_updated} updated reels, "
                       f"{posts_new} new posts, {posts_updated} updated posts")

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
            # Check if control record exists
            result = self.supabase.table("instagram_scraper_control")\
                .select("id")\
                .limit(1)\
                .execute()

            update_data = {
                "status": status,
                "last_run_at": datetime.now(timezone.utc).isoformat() if status == "running" else None,
                "metadata": {
                    "total_creators_processed": self.creators_processed,
                    "total_api_calls_today": self.daily_calls,
                    "config": Config.to_dict()
                }
            }

            if details:
                update_data["metadata"]["details"] = details

            if result.data:
                # Update existing
                self.supabase.table("instagram_scraper_control")\
                    .update(update_data)\
                    .eq("id", result.data[0]["id"])\
                    .execute()
            else:
                # Insert new
                self.supabase.table("instagram_scraper_control")\
                    .insert(update_data)\
                    .execute()

        except Exception as e:
            logger.warning(f"Failed to update scraper status: {e}")

    def process_creators_concurrent(self, creators: List[Dict]):
        """Process multiple creators concurrently with thread pool"""
        futures = []

        with ThreadPoolExecutor(max_workers=Config.CONCURRENT_CREATORS) as executor:
            for creator in creators:
                # Check if scraper should stop
                if not self.should_continue():
                    logger.info("Scraper stop signal received")
                    break

                # Check API limits
                if self.daily_calls >= Config.MAX_DAILY_API_CALLS:
                    logger.warning("Daily API limit reached")
                    break

                if self.monthly_calls >= Config.MAX_MONTHLY_API_CALLS:
                    logger.warning("Monthly API limit reached")
                    break

                # Submit creator processing to thread pool
                future = executor.submit(self.process_creator, creator)
                futures.append((future, creator))

                # Small delay to avoid thundering herd
                time.sleep(0.05)

            # Collect results as they complete
            for future, creator in futures:
                try:
                    future.result(timeout=120)  # 2 minute timeout per creator
                except Exception as e:
                    logger.error(f"Creator {creator.get('username')} processing failed: {e}")
                    self.errors.append({"creator": creator.get('username'), "error": str(e)})

    def run(self):
        """High-performance main execution method"""
        logger.info("=" * 60)
        logger.info("Instagram Unified Scraper Starting - High Performance Mode")
        logger.info(f"Workers: {Config.MAX_WORKERS}, Target RPS: {Config.REQUESTS_PER_SECOND}")
        logger.info(f"Concurrent Creators: {Config.CONCURRENT_CREATORS}, Batch Size: {Config.BATCH_SIZE}")
        logger.info(f"API Limits: Daily={Config.MAX_DAILY_API_CALLS}, Monthly={Config.MAX_MONTHLY_API_CALLS}")
        logger.info(f"Current Usage: Daily={self.daily_calls}, Monthly={self.monthly_calls}")
        logger.info("=" * 60)

        # Log to real-time monitor
        self._log_realtime("info", "🚀 Instagram scraper started", {
            "workers": Config.MAX_WORKERS,
            "target_rps": Config.REQUESTS_PER_SECOND,
            "concurrent_creators": Config.CONCURRENT_CREATORS,
            "batch_size": Config.BATCH_SIZE
        })

        # Update status to running
        self.update_scraper_status("running")

        try:
            # Get creators
            creators = self.get_creators_to_process()

            if not creators:
                logger.warning("No creators to process")
                self._log_realtime("warning", "⚠️ No creators to process")
                return

            total_creators = len(creators)

            # Calculate optimal processing
            estimated_api_calls = total_creators * 2.4  # Average API calls per creator
            estimated_time = estimated_api_calls / Config.REQUESTS_PER_SECOND

            logger.info(f"Processing {total_creators} creators")
            logger.info(f"Estimated API calls: {estimated_api_calls:.0f}")
            logger.info(f"Estimated time: {estimated_time:.1f} seconds ({estimated_time/60:.1f} minutes)")

            # Process in concurrent batches
            batch_size = Config.CONCURRENT_CREATORS * 5  # Process 50 at a time with 10 concurrent

            for i in range(0, total_creators, batch_size):
                batch = creators[i:i+batch_size]
                batch_num = (i // batch_size) + 1
                total_batches = (total_creators + batch_size - 1) // batch_size

                logger.info(f"Processing batch {batch_num}/{total_batches}: {len(batch)} creators")

                # Use thread pool for concurrent processing
                self.process_creators_concurrent(batch)

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

                # Log batch progress
                progress_pct = ((i + len(batch)) / total_creators) * 100
                logger.info(f"Overall progress: {progress_pct:.1f}% ({self.creators_processed}/{total_creators})")
                self._log_realtime("info", f"📦 Batch completed: {progress_pct:.1f}% total progress", {
                    "progress_percentage": round(progress_pct, 1),
                    "creators_processed": self.creators_processed,
                    "total_creators": total_creators
                })

            # Final summary
            duration = time.time() - self.start_time
            avg_calls_per_creator = self.api_calls_made / max(self.creators_processed, 1)
            total_cost = self.api_calls_made * Config.get_cost_per_request()

            logger.info("=" * 60)
            logger.info("Scraping Complete")
            logger.info(f"Creators Processed: {self.creators_processed}/{len(creators)}")
            logger.info(f"API Calls Made: {self.api_calls_made}")
            logger.info(f"Average Calls per Creator: {avg_calls_per_creator:.1f}")
            logger.info(f"Total Cost: ${total_cost:.2f}")
            logger.info(f"Duration: {duration:.1f} seconds")
            logger.info(f"Errors: {len(self.errors)}")
            logger.info("=" * 60)

            # Log completion to real-time monitor
            self._log_realtime("success", f"🎆 Scraping complete: {self.creators_processed} creators processed", {
                "total_creators": self.creators_processed,
                "api_calls": self.api_calls_made,
                "total_cost": round(total_cost, 2),
                "duration_seconds": round(duration, 1),
                "errors": len(self.errors)
            })

            # Log final summary
            self._log_to_supabase(
                action="run_complete",
                success=True,
                details={
                    "total_creators": len(creators),
                    "creators_processed": self.creators_processed,
                    "api_calls": self.api_calls_made,
                    "avg_calls_per_creator": avg_calls_per_creator,
                    "total_cost": total_cost,
                    "errors": len(self.errors),
                    "error_details": self.errors[:10]  # First 10 errors
                }
            )

            # Update status to stopped
            self.update_scraper_status("stopped", {
                "last_run_summary": {
                    "creators_processed": self.creators_processed,
                    "api_calls": self.api_calls_made,
                    "cost": total_cost,
                    "duration": duration
                }
            })

        except Exception as e:
            logger.error(f"Scraper failed: {e}")
            self._log_realtime("error", f"🔴 Scraper failed: {str(e)}", {
                "error": str(e),
                "creators_processed": self.creators_processed
            })

            self._log_to_supabase(
                action="run_failed",
                success=False,
                error=str(e)
            )

            self.update_scraper_status("error", {"error": str(e)})
            raise


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