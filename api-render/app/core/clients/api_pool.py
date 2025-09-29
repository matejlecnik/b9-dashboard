"""
Thread-Safe API Pool for Reddit Scraper
Creates and manages dedicated API instances for each thread to prevent contention
"""
import threading
import logging
import time
import requests
from typing import Dict, Optional, Any, Tuple
from fake_useragent import UserAgent
import random
from datetime import datetime, timezone

# Import Supabase for logging
try:
    from app.core.database.supabase_client import get_supabase_client
    supabase_client = get_supabase_client()
except:
    supabase_client = None

logger = logging.getLogger(__name__)


class PublicRedditAPI:
    """
    Thread-safe Reddit JSON API client with retry logic and proxy support.
    Each thread gets its own instance to prevent race conditions.
    """

    def __init__(self, max_retries: int = 5, base_delay: float = 1.0, thread_id: Optional[int] = None):
        """
        Initialize Reddit API client.

        Args:
            max_retries: Maximum number of retry attempts
            base_delay: Base delay between retries in seconds
            thread_id: Thread identifier for session management
        """
        self.max_retries = max_retries
        self.base_delay = base_delay
        self.thread_id = thread_id
        self.session = None  # Store session directly instead of thread-local
        self._request_count = 0  # Track requests for connection recycling

        # Initialize user agent generator
        try:
            self.ua_generator = UserAgent()
            logger.debug("UserAgent generator initialized")
        except Exception as e:
            logger.warning(f"Failed to initialize UserAgent: {e}. Using fallbacks.")
            self.ua_generator = None

        # Fallback user agents
        self.fallback_agents = [
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0",
            "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:121.0) Gecko/20100101 Firefox/121.0",
        ]

    def generate_user_agent(self) -> str:
        """
        Generate a random user agent string.

        Returns:
            str: User agent string
        """
        # Check if ua_generator exists and is not None
        if self.ua_generator is not None and random.random() < 0.8:
            try:
                # Use fake-useragent 80% of the time
                agent_type = random.choice(['chrome', 'firefox', 'safari', 'edge'])
                if agent_type == 'chrome':
                    return self.ua_generator.chrome
                elif agent_type == 'firefox':
                    return self.ua_generator.firefox
                elif agent_type == 'safari':
                    return self.ua_generator.safari
                else:
                    return self.ua_generator.edge
            except Exception:
                pass

        # Use fallback agents
        return random.choice(self.fallback_agents)

    def request_with_retry(self, url: str, proxy_config: Optional[Dict] = None) -> Optional[Dict]:
        """
        Make HTTP request with retry logic.

        Args:
            url: URL to request
            proxy_config: Proxy configuration dict

        Returns:
            JSON response or None if failed
        """

        # CRITICAL: Always require proxy - never allow direct API access
        if not proxy_config:
            logger.error("❌ PROXY REQUIRED: No proxy configuration provided - direct API access is FORBIDDEN")
            return None

        # Configure proxy
        proxies = None
        if proxy_config:
            # Handle both 'proxy' and direct http/https keys
            if 'http' in proxy_config or 'https' in proxy_config:
                proxies = {
                    "http": proxy_config.get('http'),
                    "https": proxy_config.get('https', proxy_config.get('http'))
                }
            elif 'proxy' in proxy_config:
                proxy_str = proxy_config['proxy']
                proxies = {
                    "http": f"http://{proxy_str}",
                    "https": f"http://{proxy_str}"
                }

        # Double-check we have proxies configured
        if not proxies:
            logger.error("❌ PROXY REQUIRED: Failed to configure proxy - direct API access is FORBIDDEN")
            return None

        retries = 0
        while retries < self.max_retries:
            try:
                start_time = time.time()

                # Use instance session for connection pooling
                # Recreate session periodically to prevent connection leaks
                if self.session is None or self._request_count >= 100:
                    if self.session:
                        self.session.close()
                    self.session = requests.Session()
                    # Limit connection pool size to prevent memory issues
                    self.session.mount('http://', requests.adapters.HTTPAdapter(pool_connections=5, pool_maxsize=10))
                    self.session.mount('https://', requests.adapters.HTTPAdapter(pool_connections=5, pool_maxsize=10))
                    self._request_count = 0

                self._request_count += 1
                response = self.session.get(
                    url,
                    headers={'User-agent': self.generate_user_agent()},
                    proxies=proxies,
                    timeout=30
                )

                response_time_ms = int((time.time() - start_time) * 1000)

                # Handle specific status codes
                if response.status_code == 404:
                    # Check if banned
                    try:
                        json_response = response.json()
                        if json_response.get('reason') == 'banned':
                            logger.warning(f"Banned subreddit: {url}")
                            return {'error': 'banned', 'status': 404, 'reason': 'banned'}
                    except Exception:
                        pass
                    logger.warning(f"Not found: {url}")
                    return {'error': 'not_found', 'status': 404}

                if response.status_code == 403:
                    logger.warning(f"Forbidden: {url}")
                    # Log 403 error
                    if supabase_client:
                        try:
                            supabase_client.table('system_logs').insert({
                                'timestamp': datetime.now(timezone.utc).isoformat(),
                                'source': 'reddit_scraper',
                                'script_name': 'api_pool',
                                'level': 'warning',
                                'message': 'Forbidden - possible ban or private subreddit',
                                'context': {
                                    'url': url,
                                    'status_code': 403,
                                    'thread_id': self.thread_id,
                                    'action': 'forbidden'
                                }
                            }).execute()
                        except:
                            pass
                    return {'error': 'forbidden', 'status': 403}

                if response.status_code == 429:
                    # Rate limited
                    delay = min(5 + (retries * 2), 30)
                    logger.warning(f"Rate limited: {url} - retry {retries + 1}/{self.max_retries}, waiting {delay}s")

                    # Log rate limit
                    if supabase_client:
                        try:
                            supabase_client.table('system_logs').insert({
                                'timestamp': datetime.now(timezone.utc).isoformat(),
                                'source': 'reddit_scraper',
                                'script_name': 'api_pool',
                                'level': 'warning',
                                'message': 'Rate limited by Reddit',
                                'context': {
                                    'url': url,
                                    'status_code': 429,
                                    'retry': retries + 1,
                                    'delay': delay,
                                    'thread_id': self.thread_id,
                                    'action': 'rate_limit'
                                }
                            }).execute()
                        except:
                            pass

                    if retries >= 5:
                        return {'error': 'rate_limited'}

                    time.sleep(delay)  # Sync sleep in retry loop is acceptable
                    retries += 1
                    continue

                response.raise_for_status()

                # Success
                logger.debug(f"Request successful: {url} - {response.status_code} in {response_time_ms}ms")

                # Log slow requests
                if response_time_ms > 5000 and supabase_client:
                    try:
                        supabase_client.table('system_logs').insert({
                            'timestamp': datetime.now(timezone.utc).isoformat(),
                            'source': 'reddit_scraper',
                            'script_name': 'api_pool',
                            'level': 'warning',
                            'message': f'Slow API request: {response_time_ms}ms',
                            'context': {
                                'url': url,
                                'thread_id': self.thread_id,
                                'response_time_ms': response_time_ms,
                                'action': 'slow_request'
                            },
                            'duration_ms': response_time_ms
                        }).execute()
                    except:
                        pass

                return response.json()

            except requests.RequestException as e:
                retries += 1
                if retries < self.max_retries:
                    logger.warning(f"Request failed (attempt {retries}/{self.max_retries}): {url} - {str(e)[:100]}")
                    time.sleep(self.base_delay * retries)  # Sync sleep in retry loop is acceptable
                else:
                    logger.error(f"Request failed after {self.max_retries} retries: {url}")
                    # Log complete failure
                    if supabase_client:
                        try:
                            supabase_client.table('system_logs').insert({
                                'timestamp': datetime.now(timezone.utc).isoformat(),
                                'source': 'reddit_scraper',
                                'script_name': 'api_pool',
                                'level': 'error',
                                'message': f'Request failed after {self.max_retries} retries',
                                'context': {
                                    'url': url,
                                    'max_retries': self.max_retries,
                                    'thread_id': self.thread_id,
                                    'error': str(e)[:200],
                                    'action': 'api_failed'
                                }
                            }).execute()
                        except:
                            pass
                    break

        return None

    def get_subreddit_info(self, subreddit_name: str, proxy_config: Optional[Dict] = None) -> Optional[Dict]:
        """Get subreddit metadata from about.json"""
        url = f"https://www.reddit.com/r/{subreddit_name}/about.json"
        response = self.request_with_retry(url, proxy_config)
        # Check for error responses before accessing 'data'
        if response and isinstance(response, dict):
            if 'error' in response:
                return response  # Return error response as-is
            return response.get('data') if 'data' in response else response
        return response

    def get_subreddit_hot_posts(self, subreddit_name: str, limit: int = 30,
                               proxy_config: Optional[Dict] = None) -> list:
        """Get hot posts from subreddit"""
        url = f"https://www.reddit.com/r/{subreddit_name}/hot.json?limit={limit}"
        response = self.request_with_retry(url, proxy_config)

        if response and 'data' in response and 'children' in response['data']:
            return [child['data'] for child in response['data']['children']]
        return []

    def get_subreddit_top_posts(self, subreddit_name: str, time_filter: str = 'year',
                                limit: int = 100, proxy_config: Optional[Dict] = None) -> list:
        """Get top posts from subreddit"""
        url = f"https://www.reddit.com/r/{subreddit_name}/top.json?t={time_filter}&limit={limit}"
        response = self.request_with_retry(url, proxy_config)

        if response and 'data' in response and 'children' in response['data']:
            return [child['data'] for child in response['data']['children']]
        return []

    def get_subreddit_rules(self, subreddit_name: str, proxy_config: Optional[Dict] = None) -> list:
        """Get subreddit rules"""
        url = f"https://www.reddit.com/r/{subreddit_name}/about/rules.json"
        response = self.request_with_retry(url, proxy_config)
        return response.get('rules', []) if response else []

    def get_user_info(self, username: str, proxy_config: Optional[Dict] = None) -> Optional[Dict]:
        """Get user profile info"""
        url = f"https://www.reddit.com/user/{username}/about.json"
        response = self.request_with_retry(url, proxy_config)
        return response['data'] if response and 'data' in response else response

    def get_user_posts(self, username: str, limit: int = 30,
                      proxy_config: Optional[Dict] = None) -> list:
        """Get user submitted posts"""
        url = f"https://www.reddit.com/user/{username}/submitted.json?limit={limit}"
        response = self.request_with_retry(url, proxy_config)

        if response and 'data' in response and 'children' in response['data']:
            return [child['data'] for child in response['data']['children']]
        return []

    def close(self):
        """Close the session if it exists"""
        if self.session:
            try:
                self.session.close()
            except Exception as e:
                logger.debug(f"Error closing session: {e}")
            finally:
                self.session = None
                self._request_count = 0

    def __del__(self):
        """Destructor to ensure session cleanup"""
        self.close()


class ThreadSafeAPIPool:
    """
    Manages a pool of thread-safe Reddit API instances.
    Each thread gets its own dedicated API instance to prevent race conditions.
    """

    def __init__(self, proxy_manager=None):
        """
        Initialize the API pool.

        Args:
            proxy_manager: ProxyManager instance for proxy configurations
        """
        self.proxy_manager = proxy_manager
        self.apis = {}
        self.locks = {}
        self.thread_to_api = {}
        self._lock = threading.Lock()
        self._initialized = False  # Track initialization status

    def initialize(self, thread_count: Optional[int] = None):
        """
        Initialize API instances for each thread.

        Args:
            thread_count: Number of threads (uses proxy manager if not specified)
        """
        # Check if already initialized
        if self._initialized:
            logger.warning("API pool already initialized. Cleaning up before re-initialization.")
            self.cleanup()

        if thread_count is None and self.proxy_manager:
            thread_count = self.proxy_manager.get_total_threads()
        elif thread_count is None:
            # Get from environment or use default
            import os
            thread_count = int(os.getenv('MAX_CONCURRENT_THREADS', 9))

        logger.info(f"Initializing API pool with {thread_count} thread-safe instances")

        for thread_id in range(thread_count):
            # Create dedicated API instance for this thread with thread_id
            self.apis[thread_id] = PublicRedditAPI(max_retries=5, base_delay=1.0, thread_id=thread_id)
            self.locks[thread_id] = threading.Lock()

        self._initialized = True
        logger.info(f"Created {len(self.apis)} thread-safe API instances")

    def get_api(self, thread_id: int) -> Optional[PublicRedditAPI]:
        """
        Get the API instance for a specific thread.

        Args:
            thread_id: Thread identifier

        Returns:
            PublicRedditAPI instance or None
        """
        # Validate thread_id
        if not isinstance(thread_id, int) or thread_id < 0:
            logger.error(f"Invalid thread_id: {thread_id}. Must be a non-negative integer.")
            return None

        if thread_id not in self.apis:
            logger.warning(f"No API instance for thread {thread_id}. Available threads: {list(self.apis.keys())}")
            return None

        return self.apis[thread_id]

    def get_api_with_proxy(self, thread_id: int) -> Tuple[Optional[PublicRedditAPI], Optional[Dict]]:
        """
        Get API instance and proxy configuration for a thread.

        Args:
            thread_id: Thread identifier

        Returns:
            Tuple of (API instance, proxy config)
        """
        api = self.get_api(thread_id)
        proxy_config = None

        if self.proxy_manager:
            proxy_config = self.proxy_manager.get_proxy_for_thread(thread_id)

        return api, proxy_config

    def execute_with_thread_api(self, thread_id: int, func_name: str, *args, **kwargs) -> Any:
        """
        Execute an API function using the thread's dedicated instance.

        Args:
            thread_id: Thread identifier
            func_name: Name of the API function to call
            *args: Positional arguments for the function
            **kwargs: Keyword arguments for the function

        Returns:
            Result from the API function
        """
        # Validate thread_id first
        if not isinstance(thread_id, int) or thread_id < 0:
            raise ValueError(f"Invalid thread_id: {thread_id}. Must be a non-negative integer.")

        api = self.get_api(thread_id)
        if not api:
            available = list(self.apis.keys())
            raise ValueError(f"No API instance for thread {thread_id}. Available: {available}")

        # Get proxy config if available
        proxy_config = None
        if self.proxy_manager:
            proxy_config = self.proxy_manager.get_proxy_for_thread(thread_id)

        # Add proxy config to kwargs if not already present
        if proxy_config and 'proxy_config' not in kwargs:
            kwargs['proxy_config'] = proxy_config

        # Get the function from the API instance
        func = getattr(api, func_name, None)
        if not func:
            raise AttributeError(f"API instance has no function '{func_name}'")

        # Execute with thread lock
        with self.locks[thread_id]:
            return func(*args, **kwargs)

    def get_stats(self) -> Dict[str, Any]:
        """
        Get statistics about the API pool.

        Returns:
            Dictionary of statistics
        """
        stats = {
            'total_instances': len(self.apis),
            'thread_assignments': len(self.thread_to_api),
            'active_threads': threading.active_count(),
            'instances': []
        }

        for thread_id, api in self.apis.items():
            instance_info = {
                'thread_id': thread_id,
                'has_session': hasattr(api._local, 'session') and api._local.session is not None,
                'max_retries': api.max_retries,
                'base_delay': api.base_delay
            }
            stats['instances'].append(instance_info)

        return stats

    def cleanup(self):
        """
        Clean up all API instances and close sessions.
        """
        logger.info("Cleaning up API pool")

        for thread_id, api in self.apis.items():
            try:
                api.close()
            except Exception as e:
                logger.error(f"Error closing API for thread {thread_id}: {e}")

        self.apis.clear()
        self.locks.clear()
        self.thread_to_api.clear()
        self._initialized = False

        logger.info("API pool cleaned up")

    def __enter__(self):
        """Context manager entry"""
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit - cleanup resources"""
        self.cleanup()