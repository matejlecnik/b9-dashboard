"""
Instagram API Module
Handles all Instagram API interactions, rate limiting, and retries
"""

import asyncio
import time
from typing import Any, Dict, List, Optional

import requests
from tenacity import retry, retry_if_exception_type, stop_after_attempt, wait_exponential


class APIError(Exception):
    """Custom exception for API errors"""

    pass


class RateLimitError(APIError):
    """Rate limit specific error"""

    pass


class InstagramAPI:
    """
    Instagram API client with rate limiting and retry logic

    Handles:
    - Profile fetching
    - Reels pagination
    - Posts pagination
    - Rate limiting
    - Request retries
    """

    def __init__(self, config, logger):
        """
        Initialize Instagram API client

        Args:
            config: Instagram scraper configuration (config.instagram)
            logger: Logger instance
        """
        self.config = config
        self.logger = logger

        # Rate limiting state
        self.last_request_time = 0.0

        # Tracking
        self.api_calls_made = 0
        self.successful_calls = 0
        self.failed_calls = 0

    async def _apply_rate_limiting(self):
        """Simple rate limiting with sleep delay"""
        current_time = time.time()
        time_since_last = current_time - self.last_request_time
        if time_since_last < self.config.rate_limit_delay:
            await asyncio.sleep(self.config.rate_limit_delay - time_since_last)
        self.last_request_time = time.time()

    @retry(
        retry=retry_if_exception_type(RateLimitError),
        wait=wait_exponential(
            multiplier=1,
            min=2.0,  # Will be replaced with config values when integrated
            max=10.0,
        ),
        stop=stop_after_attempt(3),
    )
    async def _make_api_request(self, endpoint: str, params: Dict[str, Any]) -> Dict[str, Any]:
        """
        Make API request with rate limiting and performance tracking

        Args:
            endpoint: API endpoint URL
            params: Query parameters

        Returns:
            JSON response data

        Raises:
            APIError: If request fails
            RateLimitError: If rate limited
        """
        if self.config.dry_run:
            self.logger.info(f"[DRY RUN] Would call {endpoint} with params: {params}")
            return {"items": [], "paging_info": {}}

        # Apply rate limiting
        await self._apply_rate_limiting()

        try:
            response = requests.get(
                endpoint,
                params=params,
                headers=self.config.get_headers(),
                timeout=self.config.request_timeout,
            )

            self.api_calls_made += 1
            self.successful_calls += 1

            if response.status_code == 429:
                raise RateLimitError("Rate limit exceeded")

            response.raise_for_status()
            data = response.json()

            return data  # type: ignore[no-any-return]

        except requests.exceptions.Timeout as e:
            self.api_calls_made += 1
            self.failed_calls += 1
            self.logger.error(f"API request timed out after {self.config.request_timeout}s: {e}")
            raise APIError(f"Request timed out: {e}") from e
        except requests.exceptions.RequestException as e:
            self.api_calls_made += 1
            self.failed_calls += 1
            self.logger.error(f"API request failed: {e}")
            raise APIError(f"Request failed: {e}") from e

    async def fetch_profile(self, username: str) -> Optional[Dict[str, Any]]:
        """
        Fetch Instagram profile data

        Args:
            username: Instagram username

        Returns:
            Profile data dict or None if not found
        """
        try:
            self.logger.info(f"Fetching profile for {username}")

            params = {"username": username}
            data = await self._make_api_request(self.config.profile_endpoint, params)

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
            self.logger.error(f"Failed to fetch profile for {username}: {e}")
            return None

    async def fetch_reels(self, user_id: str, count: int = 12) -> List[Dict[str, Any]]:
        """
        Fetch Instagram reels with retry logic for empty responses

        Args:
            user_id: Instagram user ID
            count: Number of reels to fetch

        Returns:
            List of reel data dicts
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

                data = await self._make_api_request(self.config.reels_endpoint, params)

                items = data.get("items", [])

                # Retry if we get an empty response (but only once)
                if not items and empty_retries < self.config.retry_empty_response:
                    empty_retries += 1
                    self.logger.warning(
                        f"Empty response for reels, retry {empty_retries}/{self.config.retry_empty_response}"
                    )
                    await asyncio.sleep(2)
                    continue

                if not items:
                    self.logger.info(f"Creator {user_id} has no reels available")
                    break

                # Extract media objects from reels response
                extracted_reels = []
                for item in items:
                    if isinstance(item, dict) and "media" in item:
                        extracted_reels.append(item["media"])
                    else:
                        extracted_reels.append(item)

                reels.extend(extracted_reels)
                empty_retries = 0

                paging = data.get("paging_info", {})
                if not paging.get("more_available"):
                    break

                max_id = paging.get("max_id")

            except APIError as e:
                if "timeout" in str(e).lower():
                    self.logger.warning(f"Request timeout for reels: {e}")
                else:
                    self.logger.error(f"API error fetching reels: {e}")
                return reels[:total_to_fetch]
            except Exception as e:
                self.logger.error(f"Failed to fetch reels: {e}")
                return reels[:total_to_fetch]

        return reels[:total_to_fetch]

    async def fetch_posts(self, user_id: str, count: int = 12) -> List[Dict[str, Any]]:
        """
        Fetch Instagram posts with retry logic for empty responses

        Args:
            user_id: Instagram user ID
            count: Number of posts to fetch

        Returns:
            List of post data dicts
        """
        posts: list[dict[str, Any]] = []
        max_id = None
        total_to_fetch = count
        empty_retries = 0

        while len(posts) < total_to_fetch:
            try:
                params = {"id": user_id, "count": min(12, total_to_fetch - len(posts))}

                if max_id:
                    params["max_id"] = max_id

                data = await self._make_api_request(self.config.posts_endpoint, params)

                items = data.get("items", [])

                # Retry if we get an empty response
                if not items and empty_retries < self.config.retry_empty_response:
                    empty_retries += 1
                    self.logger.warning(
                        f"Empty response for posts, retry {empty_retries}/{self.config.retry_empty_response}"
                    )
                    await asyncio.sleep(2)
                    continue

                if not items:
                    break

                posts.extend(items)
                empty_retries = 0

                paging = data.get("paging_info", {})
                if not paging.get("more_available"):
                    break

                max_id = paging.get("max_id")

            except APIError as e:
                if "timeout" in str(e).lower():
                    self.logger.warning(f"Request timeout for posts: {e}")
                else:
                    self.logger.error(f"API error fetching posts: {e}")
                return posts[:total_to_fetch]
            except Exception as e:
                self.logger.error(f"Failed to fetch posts: {e}")
                return posts[:total_to_fetch]

        return posts[:total_to_fetch]
