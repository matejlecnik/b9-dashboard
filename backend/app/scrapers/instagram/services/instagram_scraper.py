#!/usr/bin/env python3
"""
Instagram Unified Scraper for B9 Agency
Efficiently fetches reels, posts, and profile data with 2.4 API calls per creator average
"""

# VERSION TRACKING - UPDATE THIS WHEN MAKING CHANGES
SCRAPER_VERSION = "4.0.0-NO-BATCH"  # Removed batch processing - process all creators at once
DEPLOYMENT_DATE = "2025-09-18"

# Early logging before any imports that might fail
import logging  # noqa: E402
import sys  # noqa: E402


# Configure basic console logging FIRST before any imports
# This will be replaced with Supabase logging once imports are complete
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
    force=True,
)
_temp_logger = logging.getLogger(__name__)
_temp_logger.info("=" * 60)
_temp_logger.info(f"Instagram Unified Scraper v{SCRAPER_VERSION} - Module Loading")
_temp_logger.info(f"Deployment Date: {DEPLOYMENT_DATE}")
_temp_logger.info("=" * 60)

import asyncio  # noqa: E402

# Removed concurrent.futures - using raw threading.Thread like Reddit scraper
import random  # noqa: E402
import re  # noqa: E402
import threading  # noqa: E402
import time  # noqa: E402
from collections import Counter  # noqa: E402
from datetime import datetime, timedelta, timezone  # noqa: E402
from typing import Any, Dict, List, Optional, Tuple  # noqa: E402


try:
    import requests
    from dotenv import load_dotenv
    from supabase import Client
    from tenacity import retry, retry_if_exception_type, stop_after_attempt, wait_exponential

    _temp_logger.info("✅ All external dependencies loaded successfully")
except ImportError as e:
    _temp_logger.error(f"❌ Failed to import dependency: {e}")
    raise

try:
    from app.config import config

    _temp_logger.info("✅ Centralized config loaded successfully")
except ImportError as e:
    _temp_logger.error(f"❌ Failed to import config: {e}")
    raise

try:
    from app.core.config.r2_config import r2_config
    from app.core.database.supabase_client import get_supabase_client
    from app.logging import get_logger
    from app.utils.media_storage import (
        MediaStorageError,
        process_and_upload_image,
        process_and_upload_profile_picture,
        process_and_upload_video,
    )

    _temp_logger.info("✅ R2 media storage loaded successfully")
except ImportError as e:
    _temp_logger.error(f"❌ Failed to import dependencies: {e}")
    raise

# Import modular architecture components
try:
    from app.scrapers.instagram.services.modules import (
        InstagramAnalytics,
        InstagramAPI,
        InstagramStorage,
    )

    _temp_logger.info("✅ Modular architecture components loaded successfully")
except ImportError as e:
    _temp_logger.warning(f"⚠️ Modular components not available (falling back to monolithic): {e}")
    InstagramAPI = None  # type: ignore
    InstagramAnalytics = None  # type: ignore
    InstagramStorage = None  # type: ignore

# Load environment
load_dotenv()

# Initialize Supabase logger (replaces temp logger)
try:
    supabase_client = get_supabase_client()
    logger = get_logger(__name__, supabase_client=supabase_client, source="instagram_scraper")
    logger.info(
        "🚀 Instagram Scraper Starting",
        action="scraper_init",
        context={"version": SCRAPER_VERSION, "deployment_date": DEPLOYMENT_DATE},
    )
except Exception as e:
    # Fall back to temp logger if Supabase logging fails
    _temp_logger.warning(f"⚠️ Supabase logging unavailable, using console only: {e}")
    logger = _temp_logger

logger.info("✅ Environment variables loaded")


class APIError(Exception):
    """Custom exception for API errors"""

    pass


class RateLimitError(APIError):
    """Rate limit specific error"""

    pass


class InstagramScraperUnified:
    """Main scraper class with high-performance concurrency"""

    def _log_to_system(self, level: str, message: str, context: Optional[Dict] = None):
        """Log to both console and Supabase system_logs"""
        # Console log
        if level == "error":
            logger.error(message)
        elif level == "warning":
            logger.warning(message)
        elif level == "success":
            logger.info(f"✅ {message}")
        else:
            logger.info(message)

        # Supabase log
        try:
            if hasattr(self, "supabase") and self.supabase:
                self.supabase.table("system_logs").insert(
                    {
                        "timestamp": datetime.now(timezone.utc).isoformat(),
                        "source": "instagram_scraper",  # Always instagram_scraper
                        "script_name": "instagram_scraper",
                        "level": level,
                        "message": message,
                        "context": context or {},
                    }
                ).execute()
        except Exception as e:
            logger.debug(f"Could not log to system_logs: {e}")

    def __init__(self):
        """Initialize the scraper with enhanced performance features"""
        self.supabase = self._get_supabase()

        # No session pooling - like Reddit scraper
        self.session = None

        # Note: Using raw threading.Thread like Reddit scraper, not ThreadPoolExecutor

        # Simple rate limiting with time.sleep()
        self.last_request_time = 0.0

        # Tracking
        self.api_calls_made = 0
        self.successful_calls = 0
        self.failed_calls = 0
        self.creators_processed = 0
        self.errors = []
        self.start_time = time.time()

        # No daily/monthly tracking - simplified

        # Stop mechanism
        self.stop_requested = False

        # Cycle tracking
        self.cycle_number = 0
        self.cycle_start_time = None

        # Initialize modular architecture (if available)
        self.use_modules = False
        if InstagramAPI and InstagramAnalytics and InstagramStorage:
            try:
                self.api_module = InstagramAPI(config.instagram, logger)
                self.analytics_module = InstagramAnalytics(config.instagram, logger)
                self.storage_module = InstagramStorage(
                    self.supabase,
                    logger,
                    r2_config=r2_config,
                    media_utils={
                        "process_and_upload_video": process_and_upload_video,
                        "process_and_upload_image": process_and_upload_image,
                    },
                )
                self.use_modules = True
                logger.info("✅ Modular architecture initialized successfully")
            except Exception as e:
                logger.warning(f"⚠️ Failed to initialize modules, using monolithic methods: {e}")
                self.use_modules = False
        else:
            logger.info("Modular components not available, using monolithic methods")

    def should_continue(self) -> bool:
        """Check if scraper should continue running from Supabase control table"""
        try:
            # Simple direct check of the control table
            result = (
                self.supabase.table("system_control")
                .select("status, enabled")
                .eq("script_name", "instagram_scraper")
                .maybe_single()
                .execute()
            )

            if result.data:
                # Check both status and enabled fields
                should_run = (
                    result.data.get("enabled", False) or result.data.get("status") == "running"
                )
                if not should_run:
                    logger.info("Scraper stop signal received from control table")
                return should_run  # type: ignore[no-any-return]
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

    def _get_supabase(self) -> Client:
        """Get Supabase client from singleton"""
        from app.core.database import get_db

        return get_db()

    def _identify_external_url_type(self, url: str) -> Optional[str]:
        """Identify the type of external URL (OnlyFans, Linktree, etc.)"""
        if not url:
            return None

        url_lower = url.lower()

        # Common link types for OnlyFans creators
        if "onlyfans.com" in url_lower:
            return "onlyfans"
        elif "linktr.ee" in url_lower or "linktree" in url_lower:
            return "linktree"
        elif "allmylinks" in url_lower or "all.my" in url_lower:
            return "allmylinks"
        elif "beacons.ai" in url_lower:
            return "beacons"
        elif "bio.link" in url_lower:
            return "biolink"
        elif "fans.ly" in url_lower or "fansly" in url_lower:
            return "fansly"
        elif "mym.fans" in url_lower:
            return "mym"
        elif "patreon.com" in url_lower:
            return "patreon"
        elif "cashapp" in url_lower or "cash.app" in url_lower:
            return "cashapp"
        elif "paypal" in url_lower:
            return "paypal"
        elif "twitter.com" in url_lower or "x.com" in url_lower:
            return "twitter"
        elif "youtube.com" in url_lower or "youtu.be" in url_lower:
            return "youtube"
        elif "tiktok.com" in url_lower:
            return "tiktok"
        elif "snapchat.com" in url_lower:
            return "snapchat"
        elif "telegram" in url_lower or "t.me" in url_lower:
            return "telegram"
        elif "discord" in url_lower:
            return "discord"
        else:
            # Check for personal website patterns
            if any(ext in url_lower for ext in [".com", ".net", ".org", ".io", ".co"]):
                return "personal_site"
            return "other"

    def _extract_bio_links(self, bio_data: Dict) -> List[Dict]:
        """Extract and parse bio links from Instagram bio data"""
        bio_links = []

        try:
            # Check for bio_links array in profile data
            if bio_data and isinstance(bio_data.get("bio_links"), list):
                for link in bio_data["bio_links"]:
                    if isinstance(link, dict):
                        url = link.get("url", "")
                        title = link.get("title", "")
                        link_type = self._identify_external_url_type(url)
                        bio_links.append({"url": url, "title": title, "type": link_type})
        except Exception as e:
            logger.debug(f"Error parsing bio links: {e}")

        return bio_links

    def _extract_hashtags(self, text: str) -> List[str]:
        """Extract hashtags from text"""
        hashtags = re.findall(r"#[A-Za-z0-9_]+", text)
        return hashtags

    def _extract_mentions(self, text: str) -> List[str]:
        """Extract mentions from text"""
        mentions = re.findall(r"@[A-Za-z0-9_.]+", text)
        return mentions

    def _calculate_engagement_rate(self, likes: int, comments: int, followers: int) -> float:
        """Calculate engagement rate"""
        if followers == 0:
            return 0
        return ((likes + comments) / followers) * 100

    def _format_analytics_summary(self, analytics: Dict[str, Any]) -> str:
        """Format analytics into readable summary"""
        summary = []
        summary.append("📊 Analytics Summary")
        summary.append("━━━━━━━━━━━━━━━━━━")
        summary.append(f"Total Content: {analytics.get('total_content_analyzed', 0)}")
        summary.append(f"Engagement Rate: {analytics.get('engagement_rate', 0):.2f}%")
        summary.append(f"Avg Views: {analytics.get('avg_reel_views', 0):,.0f}")
        summary.append(f"Viral Rate: {analytics.get('viral_content_rate', 0):.1f}%")
        summary.append(f"Best Type: {analytics.get('best_performing_type', 'N/A')}")
        summary.append(f"Post Frequency: {analytics.get('posting_frequency_per_week', 0):.1f}/week")
        summary.append(f"Consistency: {analytics.get('posting_consistency_score', 0):.0f}/100")
        if analytics.get("most_active_day"):
            summary.append(
                f"Most Active: {analytics['most_active_day']} @ {analytics.get('most_active_hour', 0)}:00"
            )
        return "\n".join(summary)

    async def _apply_rate_limiting(self):
        """Simple rate limiting with sleep delay"""
        current_time = time.time()
        time_since_last = current_time - self.last_request_time
        if time_since_last < config.instagram.rate_limit_delay:
            await asyncio.sleep(config.instagram.rate_limit_delay - time_since_last)
        self.last_request_time = time.time()

    @retry(
        retry=retry_if_exception_type(RateLimitError),
        wait=wait_exponential(
            multiplier=1, min=config.instagram.retry_wait_min, max=config.instagram.retry_wait_max
        ),
        stop=stop_after_attempt(config.instagram.retry_max_attempts),
    )
    async def _make_api_request(self, endpoint: str, params: Dict[str, Any]) -> Dict[str, Any]:
        """Make API request with rate limiting and performance tracking"""
        if config.instagram.dry_run:
            logger.info(f"[DRY RUN] Would call {endpoint} with params: {params}")
            return {"items": [], "paging_info": {}}

        # Log request details
        thread_id = threading.current_thread().name
        self._log_to_system(
            "debug",
            f"🔍 [{thread_id}] API Request",
            {
                "thread": thread_id,
                "endpoint": endpoint.split("/")[-1],  # Just the endpoint name
                "params": params,
                "api_calls_made": self.api_calls_made + 1,
            },
        )

        # API limit checks removed - let RapidAPI handle its own limits

        # Apply rate limiting
        await self._apply_rate_limiting()

        request_start = time.time()

        try:
            response = requests.get(
                endpoint,
                params=params,
                headers=config.instagram.get_headers(),
                timeout=config.instagram.request_timeout,
            )

            request_time = time.time() - request_start
            self.api_calls_made += 1
            self.successful_calls += 1  # Track successful calls

            if response.status_code == 429:
                raise RateLimitError("Rate limit exceeded")

            response.raise_for_status()
            data = response.json()

            # Log successful response
            self._log_to_system(
                "debug",
                f"✅ [{thread_id}] API Response",
                {
                    "thread": thread_id,
                    "endpoint": endpoint.split("/")[-1],
                    "response_time_ms": int(request_time * 1000),
                    "items_count": len(data.get("items", [])) if isinstance(data, dict) else 0,
                },
            )

            return data  # type: ignore[no-any-return]

        except requests.exceptions.Timeout as e:
            self.api_calls_made += 1
            self.failed_calls += 1  # Track failed calls
            logger.error(f"API request timed out after {config.instagram.request_timeout}s: {e}")
            raise APIError(f"Request timed out: {e}") from e
        except requests.exceptions.RequestException as e:
            self.api_calls_made += 1
            self.failed_calls += 1  # Track failed calls
            logger.error(f"API request failed: {e}")
            raise APIError(f"Request failed: {e}") from e

    async def _fetch_profile(self, username: str) -> Optional[Dict[str, Any]]:
        """Fetch Instagram profile data"""
        try:
            logger.info(f"Fetching profile for {username}")

            params = {"username": username}
            data = await self._make_api_request(config.instagram.profile_endpoint, params)

            if data and data.get("status"):
                # Map the response fields to our expected format
                return {
                    "follower_count": data.get("edge_followed_by", {}).get("count", 0),
                    "following_count": data.get("edge_follow", {}).get("count", 0),
                    "media_count": data.get("edge_owner_to_timeline_media", {}).get("count", 0),
                    "biography": data.get("biography", ""),
                    "is_verified": data.get("is_verified", False),
                    "profile_pic_url": data.get("profile_pic_url_hd")
                    or data.get("profile_pic_url", ""),
                    "is_business_account": data.get("is_business_account", False),
                    "is_professional_account": data.get("is_professional_account", False),
                    "external_url": data.get("external_url", ""),
                    "has_clips": data.get("has_clips", False),
                    "full_name": data.get("full_name", ""),
                    "id": data.get("id", ""),
                    "is_private": data.get("is_private", False),
                    "has_onboarded_to_text_post_app": data.get(
                        "has_onboarded_to_text_post_app", False
                    ),
                    "raw_data": data,  # Keep raw data for detailed logging
                }
            return None
        except Exception as e:
            logger.error(f"Failed to fetch profile for {username}: {e}")
            return None

    async def _fetch_reels(self, user_id: str, count: int = 12) -> List[Dict[str, Any]]:
        """Fetch Instagram reels with retry logic for empty responses

        Note: Some creators legitimately have 0 reels (only post photos/carousels).
        Instagram API also randomly rate-limits certain creators, causing slow responses (15-30s).
        """
        reels: list[dict[str, Any]] = []
        max_id = None
        total_to_fetch = count
        empty_retries = 0

        while len(reels) < total_to_fetch:
            try:
                params = {"id": user_id, "count": min(12, total_to_fetch - len(reels))}

                if max_id:
                    params["max_id"] = max_id

                data = await self._make_api_request(config.instagram.reels_endpoint, params)

                items = data.get("items", [])

                # Retry if we get an empty response (with exponential backoff)
                if not items and empty_retries < config.instagram.retry_empty_response:
                    empty_retries += 1
                    # Exponential backoff: 2s → 5s → 12.5s
                    backoff_delay = config.instagram.retry_wait_min * (
                        config.instagram.retry_backoff_multiplier ** (empty_retries - 1)
                    )
                    logger.warning(
                        f"Empty response for reels, retry {empty_retries}/{config.instagram.retry_empty_response} "
                        f"(waiting {backoff_delay:.1f}s before retry - creator may have no reels)"
                    )
                    await asyncio.sleep(backoff_delay)
                    continue

                if not items:
                    # This is likely a legitimate empty response (creator has no reels)
                    logger.info(
                        f"Creator {user_id} has no reels available (empty response after {empty_retries} retries)"
                    )
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

            except APIError as e:
                # Handle timeout specifically - return partial results instead of breaking
                if "timeout" in str(e).lower():
                    logger.warning(
                        f"Request timeout for reels (creator {user_id} - Instagram may be rate-limiting): {e}. "
                        f"Returning {len(reels)} reels collected so far."
                    )
                else:
                    logger.error(
                        f"API error fetching reels page: {e}. Returning {len(reels)} reels collected so far."
                    )
                # Return what we have instead of breaking completely
                return reels[:total_to_fetch]
            except Exception as e:
                logger.error(
                    f"Failed to fetch reels page: {e}. Returning {len(reels)} reels collected so far."
                )
                # Return what we have instead of breaking completely
                return reels[:total_to_fetch]

        return reels[:total_to_fetch]

    async def _fetch_posts(self, user_id: str, count: int = 12) -> List[Dict[str, Any]]:
        """Fetch Instagram posts with retry logic for empty responses"""
        posts: list[dict[str, Any]] = []
        max_id = None
        total_to_fetch = count
        empty_retries = 0

        while len(posts) < total_to_fetch:
            try:
                params = {"id": user_id, "count": min(12, total_to_fetch - len(posts))}

                if max_id:
                    params["max_id"] = max_id

                data = await self._make_api_request(config.instagram.posts_endpoint, params)

                items = data.get("items", [])

                # Retry if we get an empty response (with exponential backoff)
                if not items and empty_retries < config.instagram.retry_empty_response:
                    empty_retries += 1
                    # Exponential backoff: 2s → 5s → 12.5s
                    backoff_delay = config.instagram.retry_wait_min * (
                        config.instagram.retry_backoff_multiplier ** (empty_retries - 1)
                    )
                    logger.warning(
                        f"Empty response for posts, retry {empty_retries}/{config.instagram.retry_empty_response} "
                        f"(waiting {backoff_delay:.1f}s before retry)"
                    )
                    await asyncio.sleep(backoff_delay)
                    continue

                if not items:
                    break

                posts.extend(items)
                empty_retries = 0  # Reset retry counter on successful response

                paging = data.get("paging_info", {})
                if not paging.get("more_available"):
                    break

                max_id = paging.get("max_id")

            except APIError as e:
                # Handle timeout specifically - return partial results instead of breaking
                if "timeout" in str(e).lower():
                    logger.warning(
                        f"Request timeout for posts (creator {user_id} - Instagram may be rate-limiting): {e}. "
                        f"Returning {len(posts)} posts collected so far."
                    )
                else:
                    logger.error(
                        f"API error fetching posts page: {e}. Returning {len(posts)} posts collected so far."
                    )
                # Return what we have instead of breaking completely
                return posts[:total_to_fetch]
            except Exception as e:
                logger.error(
                    f"Failed to fetch posts page: {e}. Returning {len(posts)} posts collected so far."
                )
                # Return what we have instead of breaking completely
                return posts[:total_to_fetch]

        return posts[:total_to_fetch]

    def _get_creator_content_counts(self, creator_id: str) -> Tuple[int, int]:
        """Get existing content counts for a creator"""
        try:
            # Get reels count
            reels_result = (
                self.supabase.table("instagram_reels")
                .select("media_pk", count="exact")  # type: ignore[arg-type]
                .eq("creator_id", creator_id)
                .execute()
            )
            reels_count = int(getattr(reels_result, "count", 0) or 0)

            # Get posts count
            posts_result = (
                self.supabase.table("instagram_posts")
                .select("media_pk", count="exact")  # type: ignore[arg-type]
                .eq("creator_id", creator_id)
                .execute()
            )
            posts_count = int(getattr(posts_result, "count", 0) or 0)

            return reels_count, posts_count

        except Exception as e:
            logger.warning(f"Failed to get content counts for {creator_id}: {e}")
            return 0, 0

    def _calculate_analytics(
        self,
        creator_id: str,
        reels: List[Dict],
        posts: List[Dict],
        profile_data: Optional[Dict] = None,
    ) -> Dict[str, Any]:
        """Calculate comprehensive creator analytics with enhanced post and reel metrics"""
        analytics = {
            # Basic reel metrics
            "avg_reel_views": 0,
            "avg_reel_likes": 0,
            "avg_reel_comments": 0,
            "avg_reel_saves": 0,
            "avg_reel_shares": 0,
            "avg_likes_per_reel_cached": 0,  # New cached field
            "avg_comments_per_reel_cached": 0,  # New cached field
            "avg_saves_per_reel_cached": 0,  # New save metric
            "avg_shares_per_reel_cached": 0,  # New share metric
            # Basic post metrics
            "avg_post_likes": 0,
            "avg_post_comments": 0,
            "avg_post_saves": 0,
            "avg_post_shares": 0,
            "avg_post_engagement": 0,
            "avg_likes_per_post_cached": 0,  # New cached field
            "avg_comments_per_post_cached": 0,  # New cached field
            "avg_saves_per_post_cached": 0,  # New save metric
            "avg_shares_per_post_cached": 0,  # New share metric
            # Aggregate metrics
            "total_views": 0,
            "total_likes": 0,
            "total_comments": 0,
            "total_saves": 0,
            "total_shares": 0,
            "total_engagement": 0,
            "save_to_like_ratio": 0,  # New ratio metric
            # Advanced metrics
            "engagement_rate": 0,
            "avg_engagement_rate": 0,  # New overall engagement rate
            "post_engagement_rate": 0,  # New post-specific engagement rate
            "reel_engagement_rate": 0,  # New reel-specific engagement rate
            "avg_engagement_per_content": 0,
            "reels_vs_posts_performance": 0,  # Ratio of reel views to post engagement
            "viral_content_rate": 0,
            "viral_content_count": 0,
            "viral_threshold_multiplier": config.instagram.viral_multiplier,  # Track the threshold used
            "posting_frequency_per_week": 0,
            "posting_consistency_score": 0,
            "content_reach_rate": 0,  # Views/followers ratio
            "comment_to_like_ratio": 0,
            "last_post_days_ago": None,  # New field for tracking recency
            # Content analysis
            "total_content_analyzed": 0,
            "reels_analyzed": len(reels),
            "posts_analyzed": len(posts),
            "best_performing_type": "unknown",
            "best_content_type": None,  # New field matching DB column
            "avg_caption_length": 0,
            "uses_hashtags": False,
            "avg_hashtag_count": 0,
            # Time-based metrics
            "most_active_day": None,
            "most_active_hour": None,
            "days_since_last_post": None,
        }

        if not config.instagram.enable_analytics:
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
                reel_saves = []
                reel_shares = []

                for reel in reels:
                    views = reel.get("play_count", 0)
                    likes = reel.get("like_count", 0)
                    comments = reel.get("comment_count", 0)
                    saves = reel.get("save_count", 0) or 0
                    shares = reel.get("share_count", 0) or 0

                    if views:
                        reel_views.append(views)
                    if likes:
                        reel_likes.append(likes)
                    if comments:
                        reel_comments.append(comments)
                    if saves:
                        reel_saves.append(saves)
                    if shares:
                        reel_shares.append(shares)

                if reel_views:
                    analytics["avg_reel_views"] = sum(reel_views) / len(reel_views)
                    analytics["total_views"] = sum(reel_views)

                    # Content reach rate
                    if followers_count > 0:
                        analytics["content_reach_rate"] = (
                            analytics["avg_reel_views"] / followers_count
                        ) * 100  # type: ignore[operator]

                if reel_likes:
                    analytics["avg_reel_likes"] = sum(reel_likes) / len(reel_likes)
                    analytics["avg_likes_per_reel_cached"] = analytics[
                        "avg_reel_likes"
                    ]  # Cache the value
                    analytics["total_likes"] += sum(reel_likes)

                if reel_comments:
                    analytics["avg_reel_comments"] = sum(reel_comments) / len(reel_comments)
                    analytics["avg_comments_per_reel_cached"] = analytics[
                        "avg_reel_comments"
                    ]  # Cache the value
                    analytics["total_comments"] += sum(reel_comments)

                if reel_saves:
                    analytics["avg_reel_saves"] = sum(reel_saves) / len(reel_saves)
                    analytics["avg_saves_per_reel_cached"] = analytics[
                        "avg_reel_saves"
                    ]  # Cache the value
                    analytics["total_saves"] += sum(reel_saves)  # type: ignore[operator]

                if reel_shares:
                    analytics["avg_reel_shares"] = sum(reel_shares) / len(reel_shares)
                    analytics["avg_shares_per_reel_cached"] = analytics[
                        "avg_reel_shares"
                    ]  # Cache the value
                    analytics["total_shares"] += sum(reel_shares)  # type: ignore[operator]

                # Calculate reel engagement rate
                if followers_count > 0 and reel_likes:
                    reel_engagement = (
                        sum(reel_likes) + sum(reel_comments) if reel_comments else sum(reel_likes)
                    )
                    analytics["reel_engagement_rate"] = (
                        reel_engagement / len(reels) / followers_count
                    ) * 100

                # Viral detection for reels
                if config.instagram.enable_viral_detection and reel_views:
                    viral_count = sum(
                        1
                        for v in reel_views  # type: ignore[misc]
                        if v >= config.instagram.viral_min_views
                        and v >= analytics["avg_reel_views"] * config.instagram.viral_multiplier
                    )  # type: ignore[operator]
                    analytics["viral_content_count"] = viral_count
                    analytics["viral_content_rate"] = (viral_count / len(reel_views)) * 100

            # Calculate post metrics
            if posts:
                post_likes = []
                post_comments = []
                post_saves = []
                post_shares = []
                post_engagements = []
                caption_lengths = []
                hashtag_counts = []

                for post in posts:
                    likes = post.get("like_count", 0)
                    comments = post.get("comment_count", 0)
                    saves = post.get("save_count", 0) or 0
                    shares = post.get("share_count", 0) or 0
                    engagement = likes + comments

                    if likes:
                        post_likes.append(likes)
                    if comments:
                        post_comments.append(comments)
                    if saves:
                        post_saves.append(saves)
                    if shares:
                        post_shares.append(shares)
                    if engagement:
                        post_engagements.append(engagement)

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
                    analytics["avg_likes_per_post_cached"] = analytics[
                        "avg_post_likes"
                    ]  # Cache the value
                    analytics["total_likes"] += sum(post_likes)

                if post_comments:
                    analytics["avg_post_comments"] = sum(post_comments) / len(post_comments)
                    analytics["avg_comments_per_post_cached"] = analytics[
                        "avg_post_comments"
                    ]  # Cache the value
                    analytics["total_comments"] += sum(post_comments)

                if post_saves:
                    analytics["avg_post_saves"] = sum(post_saves) / len(post_saves)
                    analytics["avg_saves_per_post_cached"] = analytics[
                        "avg_post_saves"
                    ]  # Cache the value
                    analytics["total_saves"] += sum(post_saves)  # type: ignore[operator]

                if post_shares:
                    analytics["avg_post_shares"] = sum(post_shares) / len(post_shares)
                    analytics["avg_shares_per_post_cached"] = analytics[
                        "avg_post_shares"
                    ]  # Cache the value
                    analytics["total_shares"] += sum(post_shares)  # type: ignore[operator]

                if post_engagements:
                    analytics["avg_post_engagement"] = sum(post_engagements) / len(post_engagements)
                    analytics["total_engagement"] += sum(post_engagements)

                # Calculate post engagement rate
                if followers_count > 0 and post_engagements:
                    analytics["post_engagement_rate"] = (
                        sum(post_engagements) / len(posts) / followers_count
                    ) * 100

                # Check for viral posts (2x average engagement)
                if (
                    config.instagram.enable_viral_detection
                    and post_engagements
                    and analytics["avg_post_engagement"] > 0
                ):  # type: ignore[operator]
                    viral_posts = sum(
                        1
                        for e in post_engagements  # type: ignore[misc]
                        if e >= analytics["avg_post_engagement"] * config.instagram.viral_multiplier
                    )  # type: ignore[operator]
                    analytics["viral_content_count"] += viral_posts  # type: ignore[operator]

                if caption_lengths:
                    analytics["avg_caption_length"] = sum(caption_lengths) / len(caption_lengths)

                if hashtag_counts:
                    analytics["uses_hashtags"] = any(h > 0 for h in hashtag_counts)
                    analytics["avg_hashtag_count"] = sum(hashtag_counts) / len(hashtag_counts)

            # Calculate combined metrics
            analytics["total_content_analyzed"] = len(reels) + len(posts)
            analytics["total_engagement"] = analytics["total_likes"] + analytics["total_comments"]  # type: ignore[operator]

            # Engagement rate calculation (overall)
            if followers_count > 0 and analytics["total_content_analyzed"] > 0:  # type: ignore[operator]
                avg_engagement = analytics["total_engagement"] / analytics["total_content_analyzed"]  # type: ignore[operator]
                analytics["engagement_rate"] = (avg_engagement / followers_count) * 100
                analytics["avg_engagement_rate"] = analytics[
                    "engagement_rate"
                ]  # Store in new field
                analytics["avg_engagement_per_content"] = avg_engagement

            # Comment to like ratio
            if analytics["total_likes"] > 0:  # type: ignore[operator]
                analytics["comment_to_like_ratio"] = (
                    analytics["total_comments"] / analytics["total_likes"]
                )  # type: ignore[operator]

            # Save to like ratio (important viral indicator)
            if analytics["total_likes"] > 0 and analytics["total_saves"] > 0:  # type: ignore[operator]
                analytics["save_to_like_ratio"] = (
                    analytics["total_saves"] / analytics["total_likes"]
                )  # type: ignore[operator]

            # Reels vs Posts performance
            if analytics["avg_reel_views"] > 0 and analytics["avg_post_engagement"] > 0:  # type: ignore[operator]
                analytics["reels_vs_posts_performance"] = (
                    analytics["avg_reel_views"] / analytics["avg_post_engagement"]
                )  # type: ignore[operator]

            # Determine best performing content type with enhanced logic
            reel_score = (
                analytics["reel_engagement_rate"] if analytics["reel_engagement_rate"] > 0 else 0
            )  # type: ignore[operator]
            post_score = (
                analytics["post_engagement_rate"] if analytics["post_engagement_rate"] > 0 else 0
            )  # type: ignore[operator]

            if reel_score > post_score * 1.5:  # type: ignore[operator]  # Reels significantly better
                analytics["best_performing_type"] = "reels"
                analytics["best_content_type"] = "reels"
            elif post_score > reel_score * 1.5:  # type: ignore[operator]  # Posts significantly better
                analytics["best_performing_type"] = "posts"
                analytics["best_content_type"] = "posts"
            elif reel_score > 0 and post_score > 0:  # type: ignore[operator]  # Both perform similarly
                analytics["best_performing_type"] = "mixed"
                analytics["best_content_type"] = "mixed"
            elif analytics["avg_reel_views"] > analytics["avg_post_engagement"]:  # type: ignore[operator]
                # Fallback to view/engagement comparison
                analytics["best_performing_type"] = "reels"
                analytics["best_content_type"] = "reels"
            elif analytics["avg_post_engagement"] > 0:  # type: ignore[operator]
                analytics["best_performing_type"] = "posts"
                analytics["best_content_type"] = "posts"

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
                    days_ago = (current_time - timestamps[-1]) / 86400
                    analytics["days_since_last_post"] = days_ago
                    analytics["last_post_days_ago"] = days_ago  # Store in new field too

                    # Posting frequency
                    if len(timestamps) > 1:
                        date_range_weeks = (timestamps[-1] - timestamps[0]) / (7 * 86400)
                        if date_range_weeks > 0:
                            analytics["posting_frequency_per_week"] = (
                                len(timestamps) / date_range_weeks
                            )

                        # Consistency score (0-100, based on standard deviation of posting intervals)
                        intervals = [
                            timestamps[i + 1] - timestamps[i] for i in range(len(timestamps) - 1)
                        ]
                        if intervals:
                            avg_interval = sum(intervals) / len(intervals)
                            if avg_interval > 0:
                                variance = sum((x - avg_interval) ** 2 for x in intervals) / len(
                                    intervals
                                )
                                std_dev = variance**0.5
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

    def _store_reels(
        self, creator_id: str, username: str, reels: List[Dict], creator_niche: Optional[str] = None
    ) -> tuple[int, int, int]:
        """Store reels in database with comprehensive data extraction and niche information
        Returns: (total_saved, new_count, existing_count)
        """
        if not reels:
            return 0, 0, 0

        # First check which reels already exist and if they have R2 URLs
        media_pks = [str(reel.get("pk")) for reel in reels if reel.get("pk")]
        existing_pks = set()
        existing_r2_urls = {}  # media_pk -> video_url mapping for R2 URLs
        if media_pks:
            try:
                result = (
                    self.supabase.table("instagram_reels")
                    .select("media_pk, video_url")
                    .in_("media_pk", media_pks)
                    .execute()
                )
                for row in result.data or []:
                    existing_pks.add(row["media_pk"])
                    # Check if video already has R2 URL (supports both old and new R2 domains)
                    if row.get("video_url") and "b9-instagram-media" in row["video_url"]:
                        existing_r2_urls[row["media_pk"]] = row["video_url"]
                        logger.info(
                            f"🔄 Skipping R2 upload for reel {row['media_pk']} (already in R2)"
                        )
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
                if (
                    hasattr(self, "current_creator_followers")
                    and self.current_creator_followers > 0
                ):
                    engagement_rate = (engagement / self.current_creator_followers) * 100

                # Check if this reel already has R2 URL (deduplication)
                reel_pk = str(reel.get("pk"))
                if reel_pk in existing_r2_urls:
                    # Already in R2, use existing URL
                    video_url = existing_r2_urls[reel_pk]
                    logger.info(f"✅ Using existing R2 URL for reel {reel_pk}")
                else:
                    # Extract video URL from API response (video_versions array)
                    video_url = None
                    video_versions = reel.get("video_versions", [])
                    if video_versions and len(video_versions) > 0:
                        video_url = video_versions[0].get("url")  # Highest quality video

                    if r2_config and r2_config.ENABLED and process_and_upload_video and video_url:
                        try:
                            logger.info(
                                f"📤 Starting R2 upload for reel {reel.get('pk')} (creator: {creator_id})",
                                action="r2_upload_start",
                            )
                            r2_video_url = process_and_upload_video(
                                cdn_url=video_url,
                                creator_id=str(creator_id),
                                media_pk=str(reel.get("pk")),
                            )
                            if r2_video_url:
                                video_url = r2_video_url  # Use R2 URL instead of CDN
                                logger.info(
                                    "✅ Uploaded reel video to R2",
                                    action="r2_video_uploaded",
                                    context={
                                        "media_pk": str(reel.get("pk")),
                                        "creator_id": str(creator_id),
                                        "r2_url": r2_video_url[:80] + "...",
                                    },
                                )
                            else:
                                logger.warning(
                                    f"⚠️ R2 upload returned None for reel {reel.get('pk')}",
                                    action="r2_upload_failed",
                                    context={
                                        "media_pk": str(reel.get("pk")),
                                        "creator_id": str(creator_id),
                                    },
                                )
                        except MediaStorageError as e:
                            logger.error(
                                "❌ R2 upload failed (MediaStorageError), using CDN URL - continuing with CDN",
                                action="r2_upload_error",
                                context={
                                    "media_pk": str(reel.get("pk")),
                                    "creator_id": str(creator_id),
                                    "error": str(e),
                                },
                                exc_info=True,
                            )
                        except Exception as e:
                            logger.error(
                                "❌ R2 upload failed (unexpected error), using CDN URL - continuing with CDN",
                                action="r2_upload_exception",
                                context={
                                    "media_pk": str(reel.get("pk")),
                                    "creator_id": str(creator_id),
                                    "error": str(e),
                                },
                                exc_info=True,
                            )
                            # Continue with CDN URL on error

                row = {
                    "media_pk": reel.get("pk"),
                    "media_id": reel.get("id"),
                    "shortcode": reel.get("code"),
                    "creator_id": str(creator_id),
                    "creator_username": username,
                    "creator_niche": creator_niche,  # Add creator's niche
                    "product_type": reel.get("product_type"),
                    "media_type": reel.get("media_type"),
                    "taken_at": self._to_iso(reel.get("taken_at") or reel.get("device_timestamp")),
                    "caption_text": caption_text[:2000]
                    if caption_text
                    else None,  # Limit caption length
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
                    "video_url": video_url,  # Use R2 URL if uploaded, otherwise CDN URL
                    "thumbnail_url": reel.get("image_versions2", {})
                    .get("candidates", [{}])[0]
                    .get("url")
                    if reel.get("image_versions2")
                    else None,
                    "is_paid_partnership": reel.get("is_paid_partnership", False),
                    "has_shared_to_fb": reel.get("has_shared_to_fb", 0),
                    "is_unified_video": reel.get("is_unified_video", False),
                    "is_dash_eligible": reel.get("is_dash_eligible"),
                    "number_of_qualities": reel.get("number_of_qualities"),
                    "raw_media_json": reel,
                    "scraped_at": datetime.now(timezone.utc).isoformat(),
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
                self.supabase.table("instagram_reels").upsert(
                    rows, on_conflict="media_pk"
                ).execute()
                total_saved = len(rows)
                logger.info(
                    f"Saved {total_saved} reels for {username}: {new_count} new records, {existing_count} existing updated"
                )
            except Exception as e:
                logger.error(f"Failed to store reels: {e}")

        return total_saved, new_count, existing_count

    def _store_posts(
        self, creator_id: str, username: str, posts: List[Dict], creator_niche: Optional[str] = None
    ) -> tuple[int, int, int]:
        """Store posts in database with comprehensive data extraction and niche information
        Returns: (total_saved, new_count, existing_count)
        """
        if not posts:
            return 0, 0, 0

        # First check which posts already exist and if they have R2 URLs
        media_pks = [str(post.get("pk")) for post in posts if post.get("pk")]
        existing_pks = set()
        existing_r2_images = {}  # media_pk -> image_urls mapping for R2 URLs
        if media_pks:
            try:
                result = (
                    self.supabase.table("instagram_posts")
                    .select("media_pk, image_urls")
                    .in_("media_pk", media_pks)
                    .execute()
                )
                for row in result.data or []:
                    existing_pks.add(row["media_pk"])
                    # Check if post already has R2 URLs
                    if (
                        row.get("image_urls")
                        and len(row["image_urls"]) > 0
                        and "r2.cloudflarestorage.com" in row["image_urls"][0]
                    ):
                        existing_r2_images[row["media_pk"]] = row["image_urls"]
                        logger.info(
                            f"🔄 Skipping R2 upload for post {row['media_pk']} (already in R2)"
                        )
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
                if (
                    hasattr(self, "current_creator_followers")
                    and self.current_creator_followers > 0
                ):
                    engagement_rate = (engagement / self.current_creator_followers) * 100

                # Determine post type (single image, carousel, video)
                carousel_media_count = 0
                image_urls = None

                if post.get("carousel_media"):
                    carousel_media_count = len(post.get("carousel_media", []))
                    post_type = "carousel"

                    # Extract ALL media URLs from carousel (photos and videos)
                    image_urls = []
                    for item in post.get("carousel_media", []):
                        # Check if this carousel item is a photo or video
                        item_media_type = item.get("media_type", 1)

                        if item_media_type == 1:  # Photo
                            # Get highest quality image URL (first candidate)
                            candidates = item.get("image_versions2", {}).get("candidates", [])
                            if candidates and candidates[0].get("url"):
                                image_urls.append(candidates[0].get("url"))
                        elif item_media_type == 2:  # Video in carousel
                            # Get video thumbnail as fallback
                            candidates = item.get("image_versions2", {}).get("candidates", [])
                            if candidates and candidates[0].get("url"):
                                image_urls.append(candidates[0].get("url"))

                    # Check if this post already has R2 URLs (deduplication)
                    post_pk = str(post.get("pk"))
                    if post_pk in existing_r2_images:
                        # Already in R2, use existing URLs
                        image_urls = existing_r2_images[post_pk]
                        logger.info(
                            f"✅ Using existing R2 URLs for post {post_pk} ({len(image_urls)} photos)"
                        )
                    else:
                        # Only set image_urls if we extracted any
                        if not image_urls:
                            image_urls = None

                        # Upload photos to R2 (if enabled) - separate check!
                        if (
                            image_urls
                            and r2_config
                            and r2_config.ENABLED
                            and process_and_upload_image
                        ):
                            r2_image_urls = []
                            for index, cdn_url in enumerate(image_urls):
                                try:
                                    r2_url = process_and_upload_image(
                                        cdn_url=cdn_url,
                                        creator_id=str(creator_id),
                                        media_pk=str(post.get("pk")),
                                        index=index,
                                    )
                                    if r2_url:
                                        r2_image_urls.append(r2_url)
                                    else:
                                        r2_image_urls.append(cdn_url)  # Fallback to CDN
                                except Exception as e:
                                    logger.warning(
                                        f"Failed to upload photo {index} to R2, using CDN URL: {e}"
                                    )
                                    r2_image_urls.append(cdn_url)  # Fallback to CDN

                            if r2_image_urls:
                                image_urls = r2_image_urls
                                logger.info(
                                    f"✅ Uploaded {len(r2_image_urls)} carousel photos to R2: {post.get('pk')}"
                                )

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
                    "creator_niche": creator_niche,  # Add creator's niche
                    "product_type": post.get("product_type", "feed"),
                    "media_type": post.get("media_type"),
                    "post_type": post_type,
                    "carousel_media_count": carousel_media_count,
                    "taken_at": self._to_iso(post.get("taken_at") or post.get("device_timestamp")),
                    "caption_text": caption_text[:2000]
                    if caption_text
                    else None,  # Limit caption length
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
                    "thumbnail_url": post.get("image_versions2", {})
                    .get("candidates", [{}])[0]
                    .get("url")
                    if post.get("image_versions2")
                    else None,
                    "image_urls": image_urls,
                    "video_duration": post.get("video_duration") if post_type == "video" else None,
                    "view_count": post.get("view_count") or post.get("play_count"),
                    "raw_media_json": post,
                    "scraped_at": datetime.now(timezone.utc).isoformat(),
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
                self.supabase.table("instagram_posts").upsert(
                    rows, on_conflict="media_pk"
                ).execute()
                total_saved = len(rows)
                logger.info(
                    f"Saved {total_saved} posts for {username}: {new_count} new records, {existing_count} existing updated"
                )
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

    def _track_follower_growth(
        self,
        creator_id: str,
        username: str,
        current_followers: int,
        current_following: Optional[int] = None,
        media_count: Optional[int] = None,
    ):
        """Track follower history and calculate growth rates"""
        try:
            # Record current follower count in history table
            history_entry = {
                "creator_id": creator_id,
                "username": username,
                "followers_count": current_followers,
                "following_count": current_following,
                "media_count": media_count,
                "recorded_at": datetime.now(timezone.utc).isoformat(),
            }

            self.supabase.table("instagram_follower_history").insert(history_entry).execute()

            # Get previous follower counts for growth calculation
            # Daily growth: compare with 24 hours ago
            day_ago = datetime.now(timezone.utc) - timedelta(days=1)
            daily_result = (
                self.supabase.table("instagram_follower_history")
                .select("followers_count")
                .eq("creator_id", creator_id)
                .lte("recorded_at", day_ago.isoformat())
                .order("recorded_at", desc=True)
                .limit(1)
                .execute()
            )

            daily_growth_rate = None
            if daily_result.data and daily_result.data[0]["followers_count"] > 0:
                prev_daily = daily_result.data[0]["followers_count"]
                daily_growth_rate = ((current_followers - prev_daily) / prev_daily) * 100

            # Weekly growth: compare with 7 days ago
            week_ago = datetime.now(timezone.utc) - timedelta(days=7)
            weekly_result = (
                self.supabase.table("instagram_follower_history")
                .select("followers_count")
                .eq("creator_id", creator_id)
                .lte("recorded_at", week_ago.isoformat())
                .order("recorded_at", desc=True)
                .limit(1)
                .execute()
            )

            weekly_growth_rate = None
            if weekly_result.data and weekly_result.data[0]["followers_count"] > 0:
                prev_weekly = weekly_result.data[0]["followers_count"]
                weekly_growth_rate = ((current_followers - prev_weekly) / prev_weekly) * 100

            # Get most recent previous count for general tracking
            prev_result = (
                self.supabase.table("instagram_follower_history")
                .select("followers_count")
                .eq("creator_id", creator_id)
                .neq("followers_count", current_followers)
                .order("recorded_at", desc=True)
                .limit(1)
                .execute()
            )

            previous_followers = (
                prev_result.data[0]["followers_count"] if prev_result.data else None
            )

            return {
                "daily_growth_rate": round(daily_growth_rate, 2) if daily_growth_rate else None,
                "weekly_growth_rate": round(weekly_growth_rate, 2) if weekly_growth_rate else None,
                "previous_followers_count": previous_followers,
            }

        except Exception as e:
            logger.warning(f"Failed to track follower growth for {creator_id}: {e}")
            return {
                "daily_growth_rate": None,
                "weekly_growth_rate": None,
                "previous_followers_count": None,
            }

    def _update_creator_analytics(self, creator_id: str, analytics: Dict[str, Any]):
        """Update creator with calculated analytics including enhanced post and reel metrics"""
        try:
            # Get current total API calls first
            current_calls_result = (
                self.supabase.table("instagram_creators")
                .select("total_api_calls")
                .eq("ig_user_id", creator_id)
                .single()
                .execute()
            )
            current_calls = (
                current_calls_result.data.get("total_api_calls", 0)
                if current_calls_result.data
                else 0
            )

            update_data = {
                # Reel metrics
                "avg_views_per_reel_cached": analytics.get("avg_reel_views"),
                "avg_likes_per_reel_cached": analytics.get("avg_likes_per_reel_cached"),
                "avg_comments_per_reel_cached": analytics.get("avg_comments_per_reel_cached"),
                "avg_saves_per_reel_cached": analytics.get("avg_saves_per_reel_cached"),
                "avg_shares_per_reel_cached": analytics.get("avg_shares_per_reel_cached"),
                # Post metrics
                "avg_likes_per_post_cached": analytics.get("avg_likes_per_post_cached"),
                "avg_comments_per_post_cached": analytics.get("avg_comments_per_post_cached"),
                "avg_saves_per_post_cached": analytics.get("avg_saves_per_post_cached"),
                "avg_shares_per_post_cached": analytics.get("avg_shares_per_post_cached"),
                # Engagement metrics
                "avg_engagement_rate": analytics.get("avg_engagement_rate"),
                "engagement_rate_cached": analytics.get("engagement_rate"),
                "save_to_like_ratio": analytics.get("save_to_like_ratio"),
                # Content analysis
                "best_content_type": analytics.get("best_content_type"),
                "viral_content_count_cached": analytics.get("viral_content_count"),
                "viral_threshold_multiplier": analytics.get("viral_threshold_multiplier"),
                # Posting metrics
                "posting_frequency_per_week": analytics.get("posting_frequency_per_week"),
                "posting_consistency_score": analytics.get("posting_consistency_score"),
                "last_post_days_ago": analytics.get("last_post_days_ago"),
                # Metadata
                "last_scraped_at": datetime.now(timezone.utc).isoformat(),
                "total_api_calls": current_calls + self.api_calls_made,
            }

            # Remove None values to avoid overwriting with nulls
            update_data = {k: v for k, v in update_data.items() if v is not None}

            self.supabase.table("instagram_creators").update(update_data).eq(
                "ig_user_id", creator_id
            ).execute()

            logger.debug(f"Updated analytics for {creator_id}: {len(update_data)} fields")

        except Exception as e:
            logger.warning(f"Failed to update creator analytics for {creator_id}: {e}")

    async def process_creator(self, creator: Dict[str, Any]) -> bool:
        """Process a single creator with comprehensive data fetching and analytics"""

        # Handle different key formats
        creator_id = str(creator.get("ig_user_id") or creator.get("instagram_id", ""))
        username = creator.get("username", "")
        creator_niche = creator.get("niche")  # Get the creator's niche
        thread_id = threading.current_thread().name

        logger.info(
            f"[{thread_id}] RAPIDAPI_KEY check: {'SET' if config.instagram.rapidapi_key else 'MISSING'}"
        )
        self._log_to_system(
            "info",
            f"📊 [{thread_id}] Processing creator: {username} ({creator_id})",
            {"creator_id": creator_id, "username": username, "thread": thread_id},
        )

        try:
            # Check existing content
            reels_count, posts_count = self._get_creator_content_counts(creator_id)
            is_new = reels_count == 0 and posts_count == 0

            api_calls_start = self.api_calls_made
            profile_data = None

            # Check if we should stop before starting
            if not self.should_continue():
                logger.info(f"[{thread_id}] Stop requested, skipping {username}")
                return False

            # Step 1: Always fetch profile data first (for both new and existing creators)
            self._log_to_system(
                "info",
                f"👤 [{thread_id}] Step 1/3: Fetching profile for {username}",
                {"username": username, "thread": thread_id, "step": "1/3", "action": "profile"},
            )
            profile_data = await self._fetch_profile(username)

            if profile_data:
                # Set current follower count for engagement rate calculations
                self.current_creator_followers = profile_data.get("follower_count", 0)

                # Track follower growth before updating profile
                growth_data = self._track_follower_growth(
                    creator_id,
                    username,
                    profile_data.get("follower_count", 0),
                    profile_data.get("following_count"),
                    profile_data.get("media_count"),
                )

                # Extract and identify external URL type
                external_url = profile_data.get("external_url")
                external_url_type = (
                    self._identify_external_url_type(external_url) if external_url else None
                )

                # Extract bio links
                bio_links = self._extract_bio_links(profile_data)

                # Upload profile picture to R2 (if enabled)
                profile_pic_url = profile_data.get("profile_pic_url")
                if (
                    profile_pic_url
                    and r2_config
                    and r2_config.ENABLED
                    and process_and_upload_profile_picture
                ):
                    try:
                        r2_profile_url = process_and_upload_profile_picture(
                            cdn_url=profile_pic_url, creator_id=str(creator_id)
                        )
                        if r2_profile_url:
                            profile_pic_url = r2_profile_url
                            logger.info(f"✅ Profile picture uploaded to R2 for {username}")
                    except MediaStorageError as e:
                        logger.warning(
                            f"⚠️ Failed to upload profile picture to R2, using CDN URL: {e}"
                        )
                        # Keep original CDN URL if R2 upload fails

                # Update creator with fresh profile data and growth metrics
                update_data = {
                    "followers_count": profile_data.get("follower_count"),
                    "following_count": profile_data.get("following_count"),
                    "media_count": profile_data.get("media_count"),
                    "biography": profile_data.get("biography"),
                    "is_verified": profile_data.get("is_verified"),
                    "profile_pic_url": profile_pic_url,
                    "is_business_account": profile_data.get("is_business_account"),
                    "is_professional_account": profile_data.get("is_professional_account"),
                    "external_url": external_url,
                    "external_url_type": external_url_type,
                    "bio_links": bio_links if bio_links else None,
                    "full_name": profile_data.get("full_name"),
                    "is_private": profile_data.get("is_private"),
                    "follower_growth_rate_daily": growth_data.get("daily_growth_rate"),
                    "follower_growth_rate_weekly": growth_data.get("weekly_growth_rate"),
                    "previous_followers_count": growth_data.get("previous_followers_count"),
                    "followers_last_updated": datetime.now(timezone.utc).isoformat(),
                    "last_scraped_at": datetime.now(timezone.utc).isoformat(),
                }

                # Remove None values
                update_data = {k: v for k, v in update_data.items() if v is not None}

                self.supabase.table("instagram_creators").update(update_data).eq(
                    "ig_user_id", creator_id
                ).execute()

                logger.info(f"Profile updated: {profile_data.get('follower_count', 0):,} followers")
                self._log_to_system(
                    "info",
                    f"✅ Profile fetched: {profile_data.get('follower_count', 0):,} followers",
                    {"username": username, "followers": profile_data.get("follower_count", 0)},
                )

            # Determine fetch counts based on existing content
            if is_new:
                reels_to_fetch = config.instagram.new_creator_reels_count
                posts_to_fetch = config.instagram.new_creator_posts_count
                logger.info(
                    f"New creator - fetching {reels_to_fetch} reels, {posts_to_fetch} posts"
                )
            else:
                reels_to_fetch = config.instagram.existing_creator_reels_count
                posts_to_fetch = config.instagram.existing_creator_posts_count
                logger.info(
                    f"Existing creator - fetching {reels_to_fetch} reels, {posts_to_fetch} posts"
                )

            # Check if we should stop before fetching reels
            if not self.should_continue():
                logger.info(f"[{thread_id}] Stop requested, stopping at reels for {username}")
                return False

            # Step 2: Fetch reels
            self._log_to_system(
                "info",
                f"📹 [{thread_id}] Step 2/3: Fetching {reels_to_fetch} reels for {username}",
                {
                    "username": username,
                    "thread": thread_id,
                    "step": "2/3",
                    "action": "reels",
                    "count": reels_to_fetch,
                },
            )
            reels = await self._fetch_reels(creator_id, reels_to_fetch)

            # Check if we should stop before fetching posts
            if not self.should_continue():
                logger.info(f"[{thread_id}] Stop requested, stopping at posts for {username}")
                return False

            # Step 3: Fetch posts
            self._log_to_system(
                "info",
                f"📸 [{thread_id}] Step 3/3: Fetching {posts_to_fetch} posts for {username}",
                {
                    "username": username,
                    "thread": thread_id,
                    "step": "3/3",
                    "action": "posts",
                    "count": posts_to_fetch,
                },
            )
            posts = await self._fetch_posts(creator_id, posts_to_fetch)

            # Store content with niche information (guaranteed with error handling)
            reels_saved, reels_new, reels_existing = 0, 0, 0
            posts_saved, posts_new, posts_existing = 0, 0, 0

            try:
                logger.info(f"💾 [{thread_id}] Saving {len(reels)} reels to database for {username}")
                # Use modular storage if available, otherwise fallback to monolithic
                if self.use_modules:
                    reels_saved, reels_new, reels_existing = self.storage_module.store_reels(
                        creator_id, username, reels, creator_niche, self.current_creator_followers
                    )
                else:
                    reels_saved, reels_new, reels_existing = self._store_reels(
                        creator_id, username, reels, creator_niche
                    )
                logger.info(
                    f"✅ [{thread_id}] Saved {reels_saved} reels ({reels_new} new, {reels_existing} existing)"
                )
            except Exception as e:
                logger.error(
                    f"❌ [{thread_id}] Failed to save reels for {username}: {e}", exc_info=True
                )

            try:
                logger.info(f"💾 [{thread_id}] Saving {len(posts)} posts to database for {username}")
                # Use modular storage if available, otherwise fallback to monolithic
                if self.use_modules:
                    posts_saved, posts_new, posts_existing = self.storage_module.store_posts(
                        creator_id, username, posts, creator_niche, self.current_creator_followers
                    )
                else:
                    posts_saved, posts_new, posts_existing = self._store_posts(
                        creator_id, username, posts, creator_niche
                    )
                logger.info(
                    f"✅ [{thread_id}] Saved {posts_saved} posts ({posts_new} new, {posts_existing} existing)"
                )
            except Exception as e:
                logger.error(
                    f"❌ [{thread_id}] Failed to save posts for {username}: {e}", exc_info=True
                )

            total_saved = reels_saved + posts_saved
            total_new = reels_new + posts_new

            # Calculate comprehensive analytics
            logger.info(f"[{thread_id}] Calculating analytics for {username}")
            self._log_to_system(
                "info",
                f"📈 [{thread_id}] Calculating analytics for {username}",
                {"username": username, "thread": thread_id},
            )
            # Use modular analytics if available, otherwise fallback to monolithic
            if self.use_modules:
                analytics = self.analytics_module.calculate_analytics(
                    creator_id, reels, posts, profile_data
                )
                # Count API calls used for this creator
                api_calls_used = self.api_calls_made - api_calls_start
                self.storage_module.update_creator_analytics(creator_id, analytics, api_calls_used)
            else:
                analytics = self._calculate_analytics(creator_id, reels, posts, profile_data)
                self._update_creator_analytics(creator_id, analytics)

            # Log analytics summary
            summary = self._format_analytics_summary(analytics)
            logger.info(f"\n{summary}")

            # Create detailed completion message with descriptive logging
            if reels_saved == 0 and len(reels) > 0:
                log_msg = f"✅ Processed {username}: Fetched {len(reels)} reels (0 saved), {len(posts)} posts ({posts_saved} saved, {posts_new} new)"
            else:
                log_msg = f"✅ Processed {username}: Fetched {len(reels)} reels ({reels_saved} saved, {reels_new} new), {len(posts)} posts ({posts_saved} saved, {posts_new} new)"

            self._log_to_system(
                "success",
                log_msg,
                {
                    "username": username,
                    "reels_fetched": len(reels),
                    "posts_fetched": len(posts),
                    "reels_saved": reels_saved,
                    "posts_saved": posts_saved,
                    "total_saved": total_saved,
                    "new_records": total_new,
                    "engagement_rate": round(analytics.get("engagement_rate", 0), 2),
                },
            )

            # Log success
            api_calls_used = self.api_calls_made - api_calls_start
            logger.info(
                f"✓ {username}: {api_calls_used} API calls, "
                f"{reels_new} new reels, {reels_existing} existing reels, "
                f"{posts_new} new posts, {posts_existing} existing posts"
            )

            self.creators_processed += 1
            return True

        except Exception as e:
            logger.error(f"Failed to process {username}: {e}")
            self.errors.append({"creator": username, "error": str(e)})
            self._log_to_system(
                "error",
                f"❌ Failed to process {username}: {e!s}",
                {"username": username, "error": str(e)},
            )

            return False

    def get_creators_to_process(self) -> List[Dict[str, Any]]:
        """Get list of approved creators to process"""
        import random

        try:
            query = (
                self.supabase.table("instagram_creators")
                .select("ig_user_id, username, niche")
                .eq("review_status", "ok")
                .neq("ig_user_id", None)
            )

            if config.instagram.dry_run:
                query = query.limit(config.instagram.test_limit)

            result = query.execute()
            creators = result.data or []

            # Randomize the order of creators to process
            random.shuffle(creators)

            logger.info(f"Found {len(creators)} approved creators to process (randomized order)")
            return creators

        except Exception as e:
            logger.error(f"Failed to fetch creators: {e}")
            return []

    async def process_creators_concurrent(self, creators: List[Dict]):
        """Process multiple creators concurrently using asyncio tasks (async/await)"""
        tasks: list[asyncio.Task] = []
        successful_count = 0
        failed_count = 0

        # Log start
        self._log_to_system(
            "info",
            f"🔄 Processing {len(creators)} creators with {config.instagram.concurrent_creators} concurrent tasks",
            {"creators_count": len(creators), "max_tasks": config.instagram.concurrent_creators},
        )

        async def process_creator_task(creator_data, task_id):
            """Async task to process a single creator"""
            username = creator_data.get("username", "Unknown")
            task_name = f"Creator-{task_id}"
            try:
                logger.info(f"🏁 [{task_name}] Task started for creator {username}")
                # Process the creator
                await self.process_creator(creator_data)
                logger.info(f"✅ [{task_name}] Creator {username} processed successfully")
            except Exception as e:
                logger.error(f"❌ [{task_name}] Creator {username} failed: {e}", exc_info=True)
                self.errors.append({"creator": username, "error": str(e)})
            finally:
                logger.info(f"🏁 [{task_name}] Task completed for creator {username}")

        # Create and start tasks with concurrency limit
        for i, creator in enumerate(creators):
            # Check if we should stop
            if not self.should_continue():
                logger.info("⛔ Stop requested, breaking out of creator processing")
                break

            # Wait if we've reached the concurrent limit
            while len([t for t in tasks if not t.done()]) >= config.instagram.concurrent_creators:
                # Also check for stop during wait
                if not self.should_continue():
                    logger.info("⛔ Stop requested while waiting for task slot")
                    break
                await asyncio.sleep(0.1)  # Wait for a task to finish

            # Double-check stop before starting new task
            if not self.should_continue():
                break

            task = asyncio.create_task(
                process_creator_task(creator, i + 1),
                name=f"Creator-{i + 1}",  # Properly name tasks for clear identification
            )
            tasks.append(task)

            # Small delay to avoid thundering herd
            await asyncio.sleep(0.05)

        # Wait for all tasks to complete (with stop check and timeout)
        task_timeout = 300  # 5 minutes max per task
        if tasks:
            try:
                # Wait with timeout
                timeout = 5.0 if not self.should_continue() else task_timeout
                await asyncio.wait_for(
                    asyncio.gather(*tasks, return_exceptions=True), timeout=timeout
                )
            except asyncio.TimeoutError:
                logger.warning(
                    f"⚠️ Some tasks timed out after {timeout}s - may be stuck in R2 upload or API call"
                )
                # Cancel remaining tasks
                for task in tasks:
                    if not task.done():
                        task.cancel()

        # Log completion
        successful_count = self.creators_processed
        failed_count = len(self.errors)

        self._log_to_system(
            "success",
            f"Completed processing {len(creators)} creators",
            {"total": len(creators), "successful": successful_count, "failed": failed_count},
        )

    async def run(self, control_checker=None):
        """Main execution method - runs a single cycle (async version matching Reddit scraper)"""
        import threading

        thread_id = threading.current_thread().name
        logger.info(f"🧵 [{thread_id}] Entering Instagram scraper async run() method")

        # Wrap ENTIRE method in try-finally for thread safety
        try:
            logger.info("=" * 60)
            logger.info("🚀 Instagram Unified Scraper - Startup Checks")
            logger.info("=" * 60)

            # Comprehensive startup checks
            logger.info("🔍 CONFIGURATION CHECKS:")
            logger.info(f"  ✓ Version: {SCRAPER_VERSION}")
            logger.info(f"  ✓ Thread: [{thread_id}]")
            logger.info(f"  ✓ Workers: {config.instagram.max_workers}")
            logger.info(f"  ✓ Target RPS: {config.instagram.requests_per_second}")
            logger.info(f"  ✓ Concurrent Creators: {config.instagram.concurrent_creators}")
            logger.info(f"  ✓ Batch Size: {config.instagram.batch_size}")

            logger.info("\n🔑 API CREDENTIALS:")
            logger.info(
                f"  {'✅' if config.instagram.rapidapi_key else '❌'} RAPIDAPI_KEY: {'SET' if config.instagram.rapidapi_key else 'MISSING'}"
            )
            if config.instagram.rapidapi_key:
                logger.info(f"    - Key starts with: {config.instagram.rapidapi_key[:8]}...")
                logger.info(f"    - Host: {config.instagram.rapidapi_host}")

            logger.info("\n🗄️ DATABASE:")
            logger.info(
                f"  {'✅' if config.services.supabase_url else '❌'} SUPABASE_URL: {'SET' if config.services.supabase_url else 'MISSING'}"
            )
            logger.info(
                f"  {'✅' if config.services.supabase_service_key else '❌'} SUPABASE_KEY: {'SET' if config.services.supabase_service_key else 'MISSING'}"
            )
            if config.services.supabase_url:
                logger.info(f"    - URL: {config.services.supabase_url[:30]}...")

            logger.info("\n📊 CONTENT FETCHING STRATEGY:")
            logger.info(
                f"  New creators: {config.instagram.new_creator_reels_count} reels, {config.instagram.new_creator_posts_count} posts"
            )
            logger.info(
                f"  Existing creators: {config.instagram.existing_creator_reels_count} reels, {config.instagram.existing_creator_posts_count} posts"
            )

            logger.info("\n⚙️ FEATURES:")
            logger.info(
                f"  {'✅' if config.instagram.enable_viral_detection else '❌'} Viral Detection: {'ENABLED' if config.instagram.enable_viral_detection else 'DISABLED'}"
            )
            logger.info(
                f"  {'✅' if config.instagram.enable_analytics else '❌'} Analytics: {'ENABLED' if config.instagram.enable_analytics else 'DISABLED'}"
            )
            logger.info(
                f"  {'✅' if config.instagram.enable_cost_tracking else '❌'} Cost Tracking: {'ENABLED' if config.instagram.enable_cost_tracking else 'DISABLED'}"
            )
            logger.info(
                f"  {'✅' if config.instagram.dry_run else '❌'} Dry Run Mode: {'ENABLED' if config.instagram.dry_run else 'DISABLED'}"
            )

            logger.info("=" * 60)

            # Validate configuration
            try:
                is_valid, errors = config.validate()
                if not is_valid:
                    logger.error(f"❌ Configuration validation FAILED: {errors}")
                    raise ValueError(f"Configuration validation failed: {errors}")
                logger.info("✅ All configuration checks PASSED")
            except Exception as e:
                logger.error(f"❌ Configuration validation FAILED: {e}")
                raise

            # Initial check using control_checker if provided, otherwise use internal method
            if control_checker:
                initial_continue = await control_checker()
            else:
                initial_continue = self.should_continue()
            logger.info(f"Initial control check: {initial_continue}")

            if not initial_continue:
                logger.warning("Scraper is disabled, exiting")
                return

            # Process a single cycle (continuous_instagram_scraper.py will handle the loop)
            should_continue = await control_checker() if control_checker else self.should_continue()
            if should_continue:
                self.cycle_number += 1
                self.cycle_start_time = datetime.now(timezone.utc)

            logger.info(f"\n{'=' * 60}")
            logger.info(
                f"Starting Cycle #{self.cycle_number} at {self.cycle_start_time.isoformat()}"
            )  # type: ignore[union-attr]
            logger.info(f"{'=' * 60}")

            # Log cycle start
            self._log_to_system(
                "info",
                f"🔄 Starting Cycle #{self.cycle_number}",
                {
                    "cycle": self.cycle_number,
                    "start_time": self.cycle_start_time.isoformat(),  # type: ignore[union-attr]
                    "workers": config.instagram.max_workers,
                    "target_rps": config.instagram.requests_per_second,
                },
            )

            try:
                # Get creators and randomize order
                creators = self.get_creators_to_process()

                if not creators:
                    logger.warning("No creators to process in this cycle")
                    self._log_to_system(
                        "warning", f"⚠️ Cycle #{self.cycle_number}: No creators to process"
                    )
                else:
                    # Randomize creator order
                    random.shuffle(creators)
                    total_creators = len(creators)

                    # Calculate optimal processing
                    estimated_api_calls = total_creators * 2.4  # Average API calls per creator
                    estimated_time = estimated_api_calls / config.instagram.requests_per_second

                    logger.info(f"Estimated API calls: {estimated_api_calls:.0f}")
                    logger.info(
                        f"Estimated time: {estimated_time:.1f} seconds ({estimated_time / 60:.1f} minutes)"
                    )

                    self._log_to_system(
                        "info",
                        f"📊 Cycle #{self.cycle_number}: Processing {total_creators} creators (randomized)",
                        {
                            "cycle": self.cycle_number,
                            "total_creators": total_creators,
                            "estimated_api_calls": int(estimated_api_calls),
                            "estimated_time_minutes": round(estimated_time / 60, 1),
                        },
                    )

                    # Process all creators at once
                    self._log_to_system(
                        "info",
                        f"🚀 Starting to process {total_creators} creators with {config.instagram.concurrent_creators} concurrent threads",
                        {
                            "total_creators": total_creators,
                            "concurrent_limit": config.instagram.concurrent_creators,
                        },
                    )

                    # Process all creators
                    try:
                        await self.process_creators_concurrent(creators)

                        # Single completion message
                        logger.info(
                            f"✅ Cycle completed: {self.creators_processed} creators processed"
                        )
                        self._log_to_system(
                            "success",
                            "Cycle completed successfully",
                            {
                                "creators_processed": self.creators_processed,
                                "api_calls": self.api_calls_made,
                                "successful_calls": self.successful_calls,
                                "failed_calls": self.failed_calls,
                            },
                        )

                    except Exception as e:
                        logger.error(f"❌ Processing failed: {e}")
                        self._log_to_system(
                            "error",
                            f"Processing failed: {e!s}",
                            {"error": str(e), "creators_attempted": total_creators},
                        )
                        raise

                    # Log final stats
                    try:
                        cycle_duration = (
                            datetime.now(timezone.utc) - self.cycle_start_time
                        ).total_seconds()  # type: ignore[operator]
                        logger.info(
                            f"📊 Final stats: {self.creators_processed} creators, {self.api_calls_made} API calls, {cycle_duration:.0f}s duration"
                        )
                    except Exception:
                        pass

            except Exception as e:
                logger.error(f"Cycle #{self.cycle_number} failed: {e}")
                self._log_to_system(
                    "error",
                    f"❌ Cycle #{self.cycle_number} failed: {e!s}",
                    {"cycle": self.cycle_number, "error": str(e)},
                )

            # Log completion for wrapper
            try:
                logger.info(
                    "🏁 SCRAPER RUN() METHOD COMPLETE - Returning to wrapper for 4-hour wait"
                )
                self._log_to_system(
                    "success",
                    "🏁 Scraper run() complete - wrapper should log 4-hour wait",
                    {"method_complete": True, "returning_to_wrapper": True},
                )
            except Exception:
                pass  # Even if logging fails, we must return

        except Exception as e:
            # Catch any exception in the main try block
            logger.error(f"🧵 THREAD {thread_id}: Exception in run() method: {e}")
            import traceback

            logger.error(f"Traceback: {traceback.format_exc()}")
            # Don't re-raise - let the method complete
        finally:
            # CRITICAL: Always execute this block, no matter what
            logger.info(f"🧵 THREAD {thread_id}: Exiting run() method - ensuring return to wrapper")
            # Explicit return to ensure method completes
            logger.info(">>> RETURNING FROM RUN() METHOD <<<")
            return  # noqa: B012


async def main():
    """Main entry point"""
    try:
        scraper = InstagramScraperUnified()
        await scraper.run()
    except KeyboardInterrupt:
        logger.info("Scraper interrupted by user")
        sys.exit(0)
    except Exception as e:
        logger.error(f"Fatal error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
