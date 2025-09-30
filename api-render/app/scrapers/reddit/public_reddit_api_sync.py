#!/usr/bin/env python3
"""
Public Reddit JSON API Client (Synchronous)
Handles all Reddit API requests with retry logic, proxy support, and error handling
Uses synchronous requests library for natural throttling via Python GIL
"""
import logging
import time
import requests
from typing import Dict, List, Optional

logger = logging.getLogger(__name__)


class PublicRedditAPISync:
    """Public Reddit JSON API client with retry logic and proxy support (SYNCHRONOUS)"""

    def __init__(self, proxy_manager, max_retries: int = 3, base_delay: float = 0.1):
        """Initialize API client

        Args:
            proxy_manager: ProxyManager instance for proxy rotation and UA generation
            max_retries: Maximum number of retry attempts (default 3)
            base_delay: Immediate retry delay (default 0.1s)
        """
        self.proxy_manager = proxy_manager
        self.max_retries = max_retries
        self.base_delay = base_delay

    def _request_with_retry(self, url: str, proxy_config: Dict) -> Optional[Dict]:
        """Make HTTP request with retry logic and error handling (SYNCHRONOUS)

        Args:
            url: Reddit API URL to fetch
            proxy_config: Proxy configuration dict from proxy_manager

        Returns:
            JSON response dict or error dict {'error': 'type', 'status': code}
        """
        # Configure proxy (auth embedded in proxy string)
        proxy_str = proxy_config['proxy']
        proxies = {"http": f"http://{proxy_str}", "https": f"http://{proxy_str}"}

        retries = 0
        while retries < self.max_retries:
            try:
                start_time = time.time()

                # Generate random user agent for each request
                user_agent = self.proxy_manager.generate_user_agent()

                response = requests.get(
                    url,
                    headers={'User-Agent': user_agent},
                    proxies=proxies,
                    timeout=15
                )

                response_time_ms = int((time.time() - start_time) * 1000)

                # Log every Reddit API request at INFO level for visibility
                endpoint = url.split('reddit.com')[1] if 'reddit.com' in url else url
                logger.info(f"🌐 REDDIT API: {endpoint} [{response.status_code}] {response_time_ms}ms")

                # Handle specific status codes

                # 404 - Not Found (deleted or banned)
                if response.status_code == 404:
                    try:
                        json_response = response.json()
                        if json_response.get('reason') == 'banned':
                            logger.warning(f"🚫 Banned: {url.split('/')[-2]}")
                            return {'error': 'banned', 'status': 404, 'reason': 'banned'}
                    except Exception:
                        pass  # JSON parsing failed, treat as generic 404

                    logger.warning(f"❓ Not found: {url.split('/')[-2]}")
                    return {'error': 'not_found', 'status': 404}

                # 403 - Forbidden (suspended)
                if response.status_code == 403:
                    logger.warning(f"🚫 Forbidden: {url.split('/')[-2]}")
                    return {'error': 'forbidden', 'status': 403}

                # 429 - Rate Limited
                if response.status_code == 429:
                    rate_limit_delay = min(5 + (retries * 2), 30)
                    logger.warning(f"⏳ Rate limited - waiting {rate_limit_delay}s")

                    if retries >= 5:
                        logger.error(f"🚫 Rate limit exceeded after {retries + 1} attempts")
                        return {'error': 'rate_limited', 'status': 429}

                    time.sleep(rate_limit_delay)
                    retries += 1
                    continue

                # Raise for other HTTP errors
                response.raise_for_status()

                # Success
                logger.debug(f"✅ {response.status_code} in {response_time_ms}ms")

                # Update proxy stats (success)
                self.proxy_manager.update_proxy_stats(proxy_config, True)

                return response.json()

            except requests.RequestException as e:
                retries += 1

                # Update proxy stats (failure)
                self.proxy_manager.update_proxy_stats(proxy_config, False)

                if retries < self.max_retries:
                    # Immediate retry (user agent regenerates each attempt)
                    delay = self.base_delay
                    logger.warning(f"⚠️ Request failed (attempt {retries}/{self.max_retries}) - retrying in {delay:.1f}s")
                    time.sleep(delay)
                else:
                    logger.error(f"❌ Request failed after {self.max_retries} retries: {str(e)[:100]}")
                    break

        return None

    def get_user_info(self, username: str, proxy_config: Dict) -> Optional[Dict]:
        """Get user profile information

        Args:
            username: Reddit username (without u/ prefix)
            proxy_config: Proxy configuration dict

        Returns:
            User data dict or None/error dict
        """
        url = f"https://www.reddit.com/user/{username}/about.json"
        response = self._request_with_retry(url, proxy_config)

        if response and 'data' in response:
            return response['data']
        elif response and 'error' in response:
            return response  # Return error info for suspended users
        return None

    def get_user_posts(
        self,
        username: str,
        limit: int = 30,
        proxy_config: Dict = None
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
        response = self._request_with_retry(url, proxy_config)

        if response and 'data' in response and 'children' in response['data']:
            return [child['data'] for child in response['data']['children']]
        return []
