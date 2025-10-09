#!/usr/bin/env python3
"""
Public Reddit JSON API Client
Handles all Reddit API requests with retry logic, proxy support, and error handling
"""

import asyncio
import logging
import time
from typing import Dict, List, Optional

import aiohttp
from aiohttp import ClientSession


logger = logging.getLogger(__name__)


class PublicRedditAPI:
    """Public Reddit JSON API client with retry logic and proxy support"""

    def __init__(self, proxy_manager, max_retries: int = 3, base_delay: float = 0.1):
        """Initialize API client

        Args:
            proxy_manager: ProxyManager instance for proxy rotation and UA generation
            max_retries: Maximum number of retry attempts (default 3, reduced from 5)
            base_delay: Immediate retry delay (default 0.1s, reduced from 1.0s for faster recovery)
        """
        self.proxy_manager = proxy_manager
        self.max_retries = max_retries
        self.base_delay = base_delay
        self.session: Optional[ClientSession] = None  # Will be created in async context

    async def __aenter__(self):
        """Async context manager entry - creates aiohttp session"""
        connector = aiohttp.TCPConnector(
            limit=20,  # Max 20 concurrent connections total
            limit_per_host=10,  # Max 10 per host
            ttl_dns_cache=300,  # Cache DNS for 5 minutes
        )
        timeout = aiohttp.ClientTimeout(total=30, connect=15)
        self.session = aiohttp.ClientSession(
            connector=connector,
            timeout=timeout,
            trust_env=False,  # Force per-request proxy usage, ignore environment variables
        )
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit - closes session"""
        if self.session:
            await self.session.close()

    async def ensure_session(self):
        """Ensure session exists (for non-context-manager use)"""
        if self.session is None or self.session.closed:
            connector = aiohttp.TCPConnector(limit=20, limit_per_host=10)
            self.session = aiohttp.ClientSession(
                connector=connector,
                trust_env=False,  # Force per-request proxy usage
            )

    async def _request_with_retry(self, url: str, proxy_config: Optional[Dict]) -> Optional[Dict]:
        """Make HTTP request with retry logic and error handling (ASYNC)
        Creates a fresh session for each request to avoid tracking

        Args:
            url: Reddit API URL to fetch
            proxy_config: Proxy configuration dict from proxy_manager

        Returns:
            JSON response dict or error dict {'error': 'type', 'status': code}
        """
        # Validate proxy_config
        if proxy_config is None:
            return {"error": "no_proxy", "status": 500}

        # Configure proxy (auth embedded in proxy string)
        proxy_str = proxy_config["proxy"]
        proxy_url = f"http://{proxy_str}"

        retries = 0
        while retries < self.max_retries:
            # Create fresh session for each request (avoids tracking)
            timeout = aiohttp.ClientTimeout(total=15)
            async with aiohttp.ClientSession(timeout=timeout, trust_env=False) as session:
                try:
                    start_time = time.time()

                    # Generate random user agent for each request
                    user_agent = self.proxy_manager.generate_user_agent()

                    async with session.get(
                        url,
                        headers={"User-Agent": user_agent},
                        proxy=proxy_url,
                        timeout=aiohttp.ClientTimeout(total=15),
                    ) as response:
                        response_time_ms = int((time.time() - start_time) * 1000)

                        # Log every Reddit API request at INFO level for visibility
                        endpoint = url.split("reddit.com")[1] if "reddit.com" in url else url
                        logger.info(
                            f"🌐 REDDIT API: {endpoint} [{response.status}] {response_time_ms}ms"
                        )

                        # Handle specific status codes

                        # 404 - Not Found (deleted or banned)
                        if response.status == 404:
                            try:
                                json_response = await response.json()
                                if json_response.get("reason") == "banned":
                                    logger.warning(f"🚫 Banned: {url.split('/')[-2]}")
                                    return {"error": "banned", "status": 404, "reason": "banned"}
                            except Exception:
                                pass  # JSON parsing failed, treat as generic 404

                            logger.warning(f"❓ Not found: {url.split('/')[-2]}")
                            return {"error": "not_found", "status": 404}

                        # 403 - Forbidden (suspended)
                        if response.status == 403:
                            logger.warning(f"🚫 Forbidden: {url.split('/')[-2]}")
                            return {"error": "forbidden", "status": 403}

                        # 429 - Rate Limited
                        if response.status == 429:
                            rate_limit_delay = min(5 + (retries * 2), 30)
                            logger.warning(f"⏳ Rate limited - waiting {rate_limit_delay}s")

                            if retries >= 5:
                                logger.error(f"🚫 Rate limit exceeded after {retries + 1} attempts")
                                return {"error": "rate_limited", "status": 429}

                            await asyncio.sleep(rate_limit_delay)
                            retries += 1
                            continue

                        # Raise for other HTTP errors
                        response.raise_for_status()

                        # Success
                        logger.debug(f"✅ {response.status} in {response_time_ms}ms")

                        # Update proxy stats (success)
                        self.proxy_manager.update_proxy_stats(proxy_config, True)

                        return await response.json()  # type: ignore[no-any-return]

                except (aiohttp.ClientError, asyncio.TimeoutError) as e:
                    retries += 1

                    # Update proxy stats (failure)
                    self.proxy_manager.update_proxy_stats(proxy_config, False)

                    if retries < self.max_retries:
                        # Immediate retry (user agent regenerates each attempt)
                        delay = self.base_delay
                        logger.warning(
                            f"⚠️ Request failed (attempt {retries}/{self.max_retries}) - retrying in {delay:.1f}s"
                        )
                        await asyncio.sleep(delay)
                    else:
                        logger.error(
                            f"❌ Request failed after {self.max_retries} retries: {str(e)[:100]}"
                        )
                        break

        return None

    async def get_subreddit_info(self, subreddit_name: str, proxy_config: Dict) -> Optional[Dict]:
        """Get subreddit metadata from about.json

        Args:
            subreddit_name: Name of subreddit (without r/ prefix)
            proxy_config: Proxy configuration dict

        Returns:
            Subreddit data dict or None/error dict
        """
        url = f"https://www.reddit.com/r/{subreddit_name}/about.json"
        response = await self._request_with_retry(url, proxy_config)

        if response and "data" in response:
            return response["data"]  # type: ignore[no-any-return]
        elif response and "error" in response:
            return response  # Return error info
        return None

    async def get_subreddit_rules(self, subreddit_name: str, proxy_config: Dict) -> List[Dict]:
        """Get subreddit rules

        Args:
            subreddit_name: Name of subreddit (without r/ prefix)
            proxy_config: Proxy configuration dict

        Returns:
            List of rule dicts or empty list
        """
        url = f"https://www.reddit.com/r/{subreddit_name}/about/rules.json"
        response = await self._request_with_retry(url, proxy_config)

        if response and "rules" in response:
            return response["rules"]  # type: ignore[no-any-return]
        return []

    async def get_subreddit_hot_posts(
        self, subreddit_name: str, limit: int = 30, proxy_config: Optional[Dict] = None
    ) -> List[Dict]:
        """Get hot/trending posts from subreddit

        Args:
            subreddit_name: Name of subreddit (without r/ prefix)
            limit: Number of posts to fetch (default 30)
            proxy_config: Proxy configuration dict

        Returns:
            List of post data dicts
        """
        url = f"https://www.reddit.com/r/{subreddit_name}/hot.json?limit={limit}"
        response = await self._request_with_retry(url, proxy_config)

        if response and "data" in response and "children" in response["data"]:
            return [child["data"] for child in response["data"]["children"]]
        return []

    async def get_subreddit_top_posts(
        self,
        subreddit_name: str,
        time_filter: str = "year",
        limit: int = 100,
        proxy_config: Optional[Dict] = None,
    ) -> List[Dict]:
        """Get top posts from subreddit

        Args:
            subreddit_name: Name of subreddit (without r/ prefix)
            time_filter: Time period (hour, day, week, month, year, all)
            limit: Number of posts to fetch (default 100)
            proxy_config: Proxy configuration dict

        Returns:
            List of post data dicts
        """
        url = f"https://www.reddit.com/r/{subreddit_name}/top.json?t={time_filter}&limit={limit}"
        response = await self._request_with_retry(url, proxy_config)

        if response and "data" in response and "children" in response["data"]:
            return [child["data"] for child in response["data"]["children"]]
        return []

    async def get_user_info(self, username: str, proxy_config: Dict) -> Optional[Dict]:
        """Get user profile information

        Args:
            username: Reddit username (without u/ prefix)
            proxy_config: Proxy configuration dict

        Returns:
            User data dict or None/error dict
        """
        url = f"https://www.reddit.com/user/{username}/about.json"
        response = await self._request_with_retry(url, proxy_config)

        if response and "data" in response:
            return response["data"]  # type: ignore[no-any-return]
        elif response and "error" in response:
            return response  # Return error info for suspended users
        return None

    async def get_user_posts(
        self, username: str, limit: int = 30, proxy_config: Optional[Dict] = None
    ) -> List[Dict]:
        """Get user submitted posts

        Args:
            username: Reddit username (without u/ prefix)
            limit: Number of posts to fetch (default 30)
            proxy_config: Proxy configuration dict

        Returns:
            List of post data dicts
        """
        url = f"https://www.reddit.com/user/{username}/submitted.json?limit={limit}"
        response = await self._request_with_retry(url, proxy_config)

        if response and "data" in response and "children" in response["data"]:
            return [child["data"] for child in response["data"]["children"]]
        return []
