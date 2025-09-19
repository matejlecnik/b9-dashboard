#!/usr/bin/env python3
"""
Single Subreddit Fetcher - Standalone script for fetching individual subreddit data
Extracted from reddit_scraper.py with same proxy/user-agent rotation
Limited to 3 retries per subreddit as requested
"""

import json
import random
import time
import logging
import requests
from datetime import datetime, timezone
from typing import Dict, Optional, List
from fake_useragent import UserAgent

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class PublicRedditAPI:
    """Public Reddit JSON API client with retry logic and proxy support"""

    def __init__(self, max_retries: int = 3):  # Limited to 3 retries as requested
        self.max_retries = max_retries
        self.base_delay = 1.0

        # Initialize fake-useragent with better error handling
        try:
            self.ua_generator = UserAgent()
            logger.info("✅ fake-useragent initialized successfully")
        except Exception as e:
            logger.warning(f"⚠️ fake-useragent initialization failed: {e}. Will use fallback user agents.")
            self.ua_generator = None

    def generate_user_agent(self) -> str:
        """Generate a unique realistic user agent"""
        # Extended fallback pool of realistic user agents
        user_agents = [
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0",
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:121.0) Gecko/20100101 Firefox/121.0",
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36 Edg/121.0.0.0",
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15",
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
            "Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:121.0) Gecko/20100101 Firefox/121.0",
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36",
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0",
            "Mozilla/5.0 (X11; Linux x86_64; rv:121.0) Gecko/20100101 Firefox/121.0",
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Safari/605.1.15"
        ]

        # Prefer fake-useragent (80% chance) using correct API
        use_fake_useragent = self.ua_generator and random.random() < 0.80

        if use_fake_useragent:
            try:
                # Use correct fake-useragent API (properties, not methods)
                rand = random.random()
                if rand < 0.30:
                    ua = self.ua_generator.random
                    logger.debug(f"Generated RANDOM user agent: {ua[:60]}...")
                elif rand < 0.50:
                    ua = self.ua_generator.chrome
                    logger.debug(f"Generated CHROME user agent: {ua[:60]}...")
                elif rand < 0.70:
                    ua = self.ua_generator.firefox
                    logger.debug(f"Generated FIREFOX user agent: {ua[:60]}...")
                elif rand < 0.85:
                    ua = self.ua_generator.safari
                    logger.debug(f"Generated SAFARI user agent: {ua[:60]}...")
                elif rand < 0.95:
                    ua = self.ua_generator.edge
                    logger.debug(f"Generated EDGE user agent: {ua[:60]}...")
                else:
                    ua = self.ua_generator.opera
                    logger.debug(f"Generated OPERA user agent: {ua[:60]}...")

                return ua
            except Exception as e:
                logger.debug(f"fake-useragent failed ({e}), using fallback pool")

        # Use static pool fallback
        ua = random.choice(user_agents)
        return ua

    def request_with_retry(self, url: str, proxy_config: Optional[Dict] = None) -> Optional[Dict]:
        """Make HTTP request with retry logic (max 3 retries)"""

        # Configure proxy
        proxies = None
        if proxy_config:
            proxy_str = proxy_config['proxy']
            proxies = {"http": f"http://{proxy_str}", "https": f"http://{proxy_str}"}

        # Debug logging
        logger.info(f"🔍 Request to: {url}")
        logger.debug(f"📋 Headers: User-Agent: {self.generate_user_agent()[:60]}...")
        logger.debug(f"🌐 Proxy: {'Yes' if proxies else 'Direct'}")

        retries = 0
        while retries < self.max_retries:
            try:
                start_time = time.time()
                response = requests.get(
                    url,
                    headers={'User-agent': self.generate_user_agent()},
                    proxies=proxies,
                    timeout=30
                )
                response_time_ms = int((time.time() - start_time) * 1000)

                # Handle different status codes
                if response.status_code == 403:
                    logger.warning(f"🚫 Forbidden access: {url} (may be suspended)")
                    return {'error': 'forbidden', 'status': 403}

                if response.status_code == 404:
                    logger.warning(f"❓ Not found: {url} (may be deleted)")
                    return {'error': 'not_found', 'status': 404}

                if response.status_code == 429:
                    rate_limit_delay = min(2 ** retries, 4)  # Exponential backoff: 1s, 2s, 4s
                    logger.warning(f"⏳ Rate limited: attempt {retries + 1}/{self.max_retries}, waiting {rate_limit_delay}s")

                    if retries >= self.max_retries - 1:
                        logger.error(f"🚫 Rate limit exceeded - giving up after {retries + 1} attempts")
                        return {'error': 'rate_limited', 'status': 429}

                    time.sleep(rate_limit_delay)
                    retries += 1
                    continue

                response.raise_for_status()

                # Success
                logger.info(f"✅ Success: {url.split('/')[-2]} - {response.status_code} in {response_time_ms}ms")
                return response.json()

            except requests.RequestException as e:
                retries += 1
                if retries < self.max_retries:
                    delay = self.base_delay * (2 ** (retries - 1))  # Exponential backoff
                    logger.warning(f"⚠️ Request failed (attempt {retries}/{self.max_retries}): {str(e)[:100]}")
                    time.sleep(delay)
                else:
                    logger.error(f"❌ Request failed after {self.max_retries} retries: {str(e)[:100]}")
                    break

        # If all retries exhausted
        logger.error(f"❌ All {self.max_retries} attempts failed for {url}")
        return None

    def get_subreddit_info(self, subreddit_name: str, proxy_config: Optional[Dict] = None) -> Optional[Dict]:
        """Get subreddit metadata from about.json"""
        url = f"https://www.reddit.com/r/{subreddit_name}/about.json"
        response = self.request_with_retry(url, proxy_config)

        if response and 'data' in response:
            return response['data']
        elif response and 'error' in response:
            return response
        return None

    def get_subreddit_hot_posts(self, subreddit_name: str, limit: int = 30, proxy_config: Optional[Dict] = None) -> List[Dict]:
        """Get hot posts from subreddit"""
        url = f"https://www.reddit.com/r/{subreddit_name}/hot.json?limit={limit}"
        response = self.request_with_retry(url, proxy_config)

        if response and 'data' in response and 'children' in response['data']:
            return [child['data'] for child in response['data']['children']]
        return []

    def get_subreddit_rules(self, subreddit_name: str, proxy_config: Optional[Dict] = None) -> List[Dict]:
        """Get subreddit rules"""
        url = f"https://www.reddit.com/r/{subreddit_name}/about/rules.json"
        response = self.request_with_retry(url, proxy_config)

        if response and 'rules' in response:
            return response['rules']
        return []


class ProxyRotator:
    """Handles proxy rotation between 3 services"""

    def __init__(self):
        self._proxy_index = 0

    def get_next_proxy(self) -> Dict:
        """Get next proxy configuration with 3-proxy rotation"""

        # 3-proxy configurations with unified format (auth embedded in proxy string)
        proxy_configs = [
            {
                'service': 'beyondproxy',
                'proxy': '9b1a4c15700a:654fa0b97850@proxy.beyondproxy.io:12321',
                'display_name': 'BeyondProxy'
            },
            {
                'service': 'nyronproxy',
                'proxy': 'uxJNWsLXw3XnJE-zone-resi:cjB3tG2ij@residential-ww.nyronproxies.com:16666',
                'display_name': 'NyronProxy'
            },
            {
                'service': 'rapidproxy',
                'proxy': 'admin123-residential-GLOBAL:admin123@us.rapidproxy.io:5001',
                'display_name': 'RapidProxy'
            }
        ]

        # Round-robin rotation
        config = proxy_configs[self._proxy_index]
        self._proxy_index = (self._proxy_index + 1) % len(proxy_configs)

        logger.info(f"🌐 Using proxy: {config['display_name']}")
        return config


class SubredditFetcher:
    """Main class for fetching single subreddit data"""

    def __init__(self):
        self.api = PublicRedditAPI(max_retries=3)
        self.proxy_rotator = ProxyRotator()

    def calculate_metrics(self, posts: List[Dict]) -> Dict:
        """Calculate engagement metrics from posts"""
        if not posts:
            return {
                'avg_upvotes_per_post': 0,
                'comment_to_upvote_ratio': 0,
                'total_upvotes_hot_30': 0,
                'total_posts_hot_30': 0
            }

        total_upvotes = sum(post.get('score', 0) for post in posts)
        total_comments = sum(post.get('num_comments', 0) for post in posts)
        avg_upvotes = total_upvotes / len(posts) if posts else 0
        comment_ratio = total_comments / total_upvotes if total_upvotes > 0 else 0

        return {
            'avg_upvotes_per_post': round(avg_upvotes, 2),
            'comment_to_upvote_ratio': round(comment_ratio, 4),
            'total_upvotes_hot_30': total_upvotes,
            'total_posts_hot_30': len(posts)
        }

    def fetch_single_subreddit(self, subreddit_name: str) -> Dict:
        """Fetch all data for a single subreddit"""

        logger.info(f"📊 Fetching data for r/{subreddit_name}")

        # Get proxy configuration
        proxy_config = self.proxy_rotator.get_next_proxy()

        # Fetch subreddit info
        subreddit_info = self.api.get_subreddit_info(subreddit_name, proxy_config)

        if not subreddit_info:
            return {
                'success': False,
                'error': 'Failed to fetch subreddit info',
                'data': None
            }

        # Handle errors
        if isinstance(subreddit_info, dict) and 'error' in subreddit_info:
            return {
                'success': False,
                'error': subreddit_info.get('error'),
                'status': subreddit_info.get('status'),
                'data': None
            }

        # Fetch hot posts for metrics
        hot_posts = self.api.get_subreddit_hot_posts(subreddit_name, 30, proxy_config)

        # Fetch rules
        rules = self.api.get_subreddit_rules(subreddit_name, proxy_config)

        # Calculate metrics
        metrics = self.calculate_metrics(hot_posts)

        # Format rules data
        rules_data = None
        if rules:
            rules_data = []
            for rule in rules:
                rules_data.append({
                    'short_name': rule.get('short_name', ''),
                    'title': rule.get('kind', ''),
                    'description': rule.get('description', ''),
                    'violation_reason': rule.get('violation_reason', '')
                })

        # Prepare response data
        data = {
            'name': subreddit_info.get('display_name', subreddit_name),
            'display_name_prefixed': subreddit_info.get('display_name_prefixed', f'r/{subreddit_name}'),
            'title': subreddit_info.get('title'),
            'public_description': subreddit_info.get('public_description'),
            'description': subreddit_info.get('description'),
            'subscribers': subreddit_info.get('subscribers', 0),
            'accounts_active': subreddit_info.get('accounts_active'),
            'over18': subreddit_info.get('over18', False),
            'icon_img': subreddit_info.get('icon_img'),
            'community_icon': subreddit_info.get('community_icon'),
            'created_utc': datetime.fromtimestamp(
                subreddit_info.get('created_utc', 0),
                tz=timezone.utc
            ).isoformat() if subreddit_info.get('created_utc') else None,
            'rules_data': rules_data,
            'avg_upvotes_per_post': metrics['avg_upvotes_per_post'],
            'comment_to_upvote_ratio': metrics['comment_to_upvote_ratio'],
            'total_upvotes_hot_30': metrics['total_upvotes_hot_30'],
            'total_posts_hot_30': metrics['total_posts_hot_30'],
            'last_scraped_at': datetime.now(timezone.utc).isoformat()
        }

        logger.info(f"✅ Successfully fetched data for r/{subreddit_name}")

        return {
            'success': True,
            'data': data
        }


def fetch_subreddit(subreddit_name: str) -> Dict:
    """Main function to fetch a single subreddit"""
    fetcher = SubredditFetcher()
    return fetcher.fetch_single_subreddit(subreddit_name)


if __name__ == "__main__":
    # Test the fetcher
    import sys

    if len(sys.argv) > 1:
        subreddit_name = sys.argv[1]
        result = fetch_subreddit(subreddit_name)
        print(json.dumps(result, indent=2))
    else:
        print("Usage: python single_subreddit_fetcher.py <subreddit_name>")
        print("Example: python single_subreddit_fetcher.py technology")