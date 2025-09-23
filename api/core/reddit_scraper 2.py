#!/usr/bin/env python3
"""
Proxy-Enabled Multi-Account Reddit Scraper
Uses your working Decodo proxy format with custom requestor for AsyncPRAW.
"""
import asyncio
import json
import os
import logging
import requests
import random
import time
import threading
import sys
from datetime import datetime, timezone, timedelta
from collections import defaultdict
from typing import Dict, List, Optional
import asyncpraw
import asyncprawcore
from supabase import create_client
from dotenv import load_dotenv
from fake_useragent import UserAgent

# Add parent directory to path for imports when running as standalone script
if __name__ == "__main__":
    sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    from utils.system_logger import system_logger, log_scraper_activity
else:
    try:
        from ..utils.system_logger import system_logger, log_scraper_activity
    except ImportError:
        # Fallback if imported differently
        system_logger = None
        log_scraper_activity = None

# Version tracking
SCRAPER_VERSION = "2.1.0"


# Load environment variables
load_dotenv()

# Configure logging with robust path
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
LOG_FILE = os.environ.get('LOG_FILE')
if LOG_FILE:
    try:
        os.makedirs(os.path.dirname(LOG_FILE), exist_ok=True)
    except Exception:
        pass
    LOG_PATH = LOG_FILE
else:
    LOG_DIR = os.path.join(BASE_DIR, 'logs')
    try:
        os.makedirs(LOG_DIR, exist_ok=True)
    except Exception:
        LOG_DIR = os.environ.get('TMPDIR', '/tmp')
    LOG_PATH = os.path.join(LOG_DIR, 'proxy_scraper.log')

logging.basicConfig(
    level=logging.DEBUG,  # Enable debug logging to see headers and performance
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(LOG_PATH),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Reduce noise from external libraries but keep important ones
logging.getLogger('fake_useragent').setLevel(logging.ERROR)  # Only show errors
logging.getLogger('httpx').setLevel(logging.INFO)  # Keep HTTP request logs

class SupabaseLogHandler(logging.Handler):
    """Custom logging handler that sends logs to system_logs table"""

    def __init__(self, supabase_client, source='reddit_scraper'):
        super().__init__()
        self.supabase = supabase_client
        self.source = source
        self.log_buffer = []
        self.buffer_size = 5  # Reduced from 10 to flush more frequently
        self.last_flush = time.time()
        self.flush_interval = 30  # Flush every 30 seconds
        
    def emit(self, record):
        """Handle a logging record by adding it to buffer"""
        if not self.supabase:
            return
            
        try:
            # Format the log message
            message = self.format(record)
            
            # Create context with additional info
            context = {
                'module': record.module if hasattr(record, 'module') else record.name,
                'function': record.funcName if hasattr(record, 'funcName') else None,
                'line': record.lineno if hasattr(record, 'lineno') else None,
                'thread': record.thread if hasattr(record, 'thread') else None
            }
            
            # Add any extra fields from the record
            if hasattr(record, 'subreddit'):
                context['subreddit'] = record.subreddit
            if hasattr(record, 'user'):
                context['user'] = record.user
            if hasattr(record, 'account'):
                context['account'] = record.account
            if hasattr(record, 'operation'):
                context['operation'] = record.operation
                
            log_entry = {
                'timestamp': datetime.fromtimestamp(record.created, timezone.utc).isoformat(),
                'source': self.source,
                'script_name': 'reddit_scraper',
                'level': record.levelname.lower(),
                'message': message[:1000],  # Truncate long messages
                'context': context
            }
            
            self.log_buffer.append(log_entry)
            
            # Flush if buffer is full or enough time has passed
            current_time = time.time()
            if (len(self.log_buffer) >= self.buffer_size or 
                current_time - self.last_flush > self.flush_interval):
                self.flush_logs()
                
        except Exception as e:
            # Don't let logging errors crash the scraper
            print(f"Error in Supabase log handler: {e}")
            
    def flush_logs(self):
        """Flush buffered logs to Supabase"""
        if not self.log_buffer or not self.supabase:
            return
            
        try:
            # Send logs to Supabase
            response = self.supabase.table('system_logs').insert(self.log_buffer).execute()
            if hasattr(response, 'error') and response.error:
                print(f"Error sending logs to Supabase: {response.error}")
            else:
                print(f"✅ Sent {len(self.log_buffer)} logs to Supabase")
                
            # Clear buffer
            self.log_buffer.clear()
            self.last_flush = time.time()
            
        except Exception as e:
            print(f"Error flushing logs to Supabase: {e}")
            # Clear buffer anyway to prevent memory issues
            self.log_buffer.clear()
            
    def close(self):
        """Flush any remaining logs when handler is closed"""
        self.flush_logs()
        super().close()

class ProxyRequestor(asyncprawcore.Requestor):
    """Deprecated custom requestor. Not used; proxies handled by AsyncPRAW via requestor_kwargs."""
    pass

class PublicRedditAPI:
    """Public Reddit JSON API client with retry logic and proxy support"""
    
    def __init__(self, max_retries: int = 10, base_delay: float = 1.0):
        self.max_retries = max_retries
        self.base_delay = base_delay
        self.session = None
        
        # Initialize fake-useragent with better error handling
        try:
            self.ua_generator = UserAgent()  # Use default settings
            logger.info("✅ fake-useragent initialized successfully")
        except Exception as e:
            logger.warning(f"⚠️ fake-useragent initialization failed: {e}. Will use fallback user agents.")
            self.ua_generator = None
        
    # No need for async context managers with requests - it handles sessions automatically
    
    def generate_user_agent(self) -> str:
        """Generate a unique realistic user agent using modern fake-useragent API"""
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
        
        # Prefer fake-useragent (80% chance) using correct 2.2.0 API
        use_fake_useragent = self.ua_generator and random.random() < 0.80
        
        if use_fake_useragent:
            try:
                # Use correct fake-useragent 2.2.0 API (properties, not methods)
                rand = random.random()
                if rand < 0.30:
                    # Use completely random user agent (best diversity)
                    ua = self.ua_generator.random
                    logger.info(f"🌐 Generated RANDOM user agent via fake-useragent: {ua[:60]}...")
                elif rand < 0.50:
                    # Chrome user agent
                    ua = self.ua_generator.chrome
                    logger.info(f"🌐 Generated CHROME user agent via fake-useragent: {ua[:60]}...")
                elif rand < 0.70:
                    # Firefox user agent  
                    ua = self.ua_generator.firefox
                    logger.info(f"🌐 Generated FIREFOX user agent via fake-useragent: {ua[:60]}...")
                elif rand < 0.85:
                    # Safari user agent
                    ua = self.ua_generator.safari
                    logger.info(f"🌐 Generated SAFARI user agent via fake-useragent: {ua[:60]}...")
                elif rand < 0.95:
                    # Edge user agent
                    ua = self.ua_generator.edge
                    logger.info(f"🌐 Generated EDGE user agent via fake-useragent: {ua[:60]}...")
                else:
                    # Opera user agent
                    ua = self.ua_generator.opera
                    logger.info(f"🌐 Generated OPERA user agent via fake-useragent: {ua[:60]}...")
                
                return ua
            except Exception as e:
                logger.info(f"🌐 fake-useragent failed ({e}), using fallback pool")
        
        # Use static pool fallback (25% of the time or when fake-useragent fails)
        ua = random.choice(user_agents)
        # logger.info(f"🌐 Using fallback user agent: {ua[:60]}...")  # Reduced verbosity
        pass
        return ua
    
    def request_with_retry(self, url: str, proxy_config: Optional[Dict] = None) -> Optional[Dict]:
        """Make HTTP request with retry logic using requests (exactly like your working script)"""
        
        # Configure proxy with unified format (auth embedded in proxy string)
        proxies = None
        if proxy_config:
            proxy_str = proxy_config['proxy']
            # Use exact same format as your working script
            proxies = {"http": f"http://{proxy_str}", "https": f"http://{proxy_str}"}
        
        # Debug logging
        logger.info(f"🔍 Request to: {url}")
        logger.info(f"📋 Headers: User-Agent: {self.generate_user_agent()}")
        logger.info(f"🌐 Proxy: {'Yes' if proxies else 'Direct'} ({'***masked***' if proxies else 'N/A'})")
        
        retries = 0
        while retries < self.max_retries:
            try:
                start_time = time.time()
                response = requests.get(
                    url,
                    headers={'User-agent': self.generate_user_agent()},
                    proxies=proxies,  # Use the proxy for the request (exactly like your script)
                    timeout=30
                )
                response_time_ms = int((time.time() - start_time) * 1000)
                response.raise_for_status()

                # Log successful request
                logger.info(f"✅ Reddit API request successful: {url.split('/')[-3]}/{url.split('/')[-2]} - {response.status_code} in {response_time_ms}ms")

                # Check if the response status code is 403 (Forbidden)
                if response.status_code == 403:
                    logger.warning(f"🚫 Forbidden access: {url} (user/subreddit may be suspended)")
                    return {'error': 'forbidden', 'status': 403}

                # Check if the response status code is 404 (Not Found)
                if response.status_code == 404:
                    logger.warning(f"❓ Not found: {url} (user/subreddit may be deleted)")
                    return {'error': 'not_found', 'status': 404}

                # Check if the response status code is 429 (Rate Limited)
                if response.status_code == 429:
                    rate_limit_delay = min(5 + (retries * 2), 30)
                    logger.warning(f"⏳ Rate limited: {url} - attempt {retries + 1}/{self.max_retries}, waiting {rate_limit_delay}s")
                    
                    if retries >= 5:  # Stop after 5 rate limit attempts
                        logger.error(f"🚫 Rate limit exceeded for {url} - giving up after {retries + 1} attempts")
                        return {'error': 'rate_limited'}
                    
                    time.sleep(rate_limit_delay)
                    retries += 1
                    continue

                # Success case
                logger.debug(f"✅ Success: {url} ({response.status_code})")
                return response.json()
                
            except requests.RequestException as e:
                retries += 1
                entity = '/'.join(url.split('/')[-3:-1]) if '/' in url else url
                if retries < self.max_retries:
                    logger.warning(f"⚠️ Reddit API request failed (attempt {retries}/{self.max_retries}): {entity} - {str(e)[:100]}")
                    time.sleep(4.0)  # Fixed delay like your working script
                else:
                    logger.error(f"❌ Reddit API request failed after {self.max_retries} retries: {entity} - {str(e)[:100]}")
                    break
        
        # If all retries are exhausted, return None
        logger.error(f"❌ All {self.max_retries} attempts failed for {url}")
        return None
    
    def get_subreddit_info(self, subreddit_name: str, proxy_config: Optional[Dict] = None) -> Optional[Dict]:
        """Get subreddit metadata from about.json"""
        url = f"https://www.reddit.com/r/{subreddit_name}/about.json"
        response = self.request_with_retry(url, proxy_config)
        
        if response and 'data' in response:
            return response['data']
        elif response and 'error' in response:
            return response  # Return error info
        return None
    
    def get_subreddit_hot_posts(self, subreddit_name: str, limit: int = 30, proxy_config: Optional[Dict] = None) -> List[Dict]:
        """Get hot posts from subreddit"""
        url = f"https://www.reddit.com/r/{subreddit_name}/hot.json?limit={limit}"
        response = self.request_with_retry(url, proxy_config)
        
        if response and 'data' in response and 'children' in response['data']:
            return [child['data'] for child in response['data']['children']]
        return []
    
    def get_subreddit_top_posts(self, subreddit_name: str, time_filter: str = 'year', limit: int = 100, proxy_config: Optional[Dict] = None) -> List[Dict]:
        """Get top posts from subreddit"""
        url = f"https://www.reddit.com/r/{subreddit_name}/top.json?t={time_filter}&limit={limit}"
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
    
    def get_user_info(self, username: str, proxy_config: Optional[Dict] = None) -> Optional[Dict]:
        """Get user profile info"""
        url = f"https://www.reddit.com/user/{username}/about.json"
        response = self.request_with_retry(url, proxy_config)
        
        if response and 'data' in response:
            return response['data']
        elif response and 'error' in response:
            return response  # Return error info for suspended users
        return None
    
    def get_user_posts(self, username: str, limit: int = 30, proxy_config: Optional[Dict] = None) -> List[Dict]:
        """Get user submitted posts"""
        url = f"https://www.reddit.com/user/{username}/submitted.json?limit={limit}"
        response = self.request_with_retry(url, proxy_config)
        
        if response and 'data' in response and 'children' in response['data']:
            return [child['data'] for child in response['data']['children']]
        return []

class ProxyEnabledMultiScraper:
    """Multi-account scraper with advanced stealth features"""
    
    def __init__(self):
        self.reddit_clients = []
        self.current_client_index = 0
        self.supabase = None
        self.public_api = None  # Will be initialized with requests-based API

        # Non-Related subreddit caching
        self.non_related_cache = set()
        self.non_related_cache_time = None
        self.cache_ttl = timedelta(hours=6)  # Refresh cache every 6 hours

        # Performance tracking
        self.stats = {
            'accounts_used': {},
            'proxy_requests': 0,
            'direct_requests': 0,
            'total_requests': 0,
            'subreddits_analyzed': 0,
            'posts_analyzed': 0,
            'users_analyzed': 0,
            'users_skipped_rate_limited': 0,
            'start_time': datetime.now()
        }
    
        # Rate limiting tracking
        self.rate_limited_users = set()  # Users that are consistently rate limited
        self.user_retry_counts = {}  # Track retry attempts per user
        
        # Stealth configuration - Increased delays for better rate limiting
        self.stealth_config = {
            'min_delay': 2.5,  # Minimum delay between requests (seconds) - increased
            'max_delay': 6.0,  # Maximum delay between requests (seconds) - increased
            'burst_delay': (12, 20),  # Longer delay every N requests - increased
            'burst_frequency': random.randint(8, 15),  # Every N requests take a longer break
            'request_count': 0,
            'last_request_time': 0
        }
    
    def generate_random_user_agent(self, base_username: str = None) -> str:
        """Generate a realistic, randomized user agent"""
        browsers = [
            # Chrome variants (most common)
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/{chrome_version}.0.0.0 Safari/537.36",
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/{chrome_version}.0.0.0 Safari/537.36",
            "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/{chrome_version}.0.0.0 Safari/537.36",
            
            # Firefox variants
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:{firefox_version}.0) Gecko/20100101 Firefox/{firefox_version}.0",
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:{firefox_version}.0) Gecko/20100101 Firefox/{firefox_version}.0",
            "Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:{firefox_version}.0) Gecko/20100101 Firefox/{firefox_version}.0",
            
            # Safari variants
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.{safari_minor} Safari/605.1.15",
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Version/17.{safari_minor} Safari/537.36",
            
            # Edge variants  
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/{chrome_version}.0.0.0 Safari/537.36 Edg/{chrome_version}.0.0.0"
        ]
        
        # Random version numbers within realistic ranges
        chrome_version = random.randint(119, 122)
        firefox_version = random.randint(119, 122) 
        safari_minor = random.randint(1, 5)
        
        # Pick random browser template
        user_agent = random.choice(browsers).format(
            chrome_version=chrome_version,
            firefox_version=firefox_version, 
            safari_minor=safari_minor
        )
        
        # Add subtle randomization based on username if provided
        if base_username:
            # Create consistent but unique variation for each username
            random.seed(hash(base_username) % 1000000)  # Deterministic but varied
            version_offset = random.randint(-2, 2)
            chrome_version = max(119, chrome_version + version_offset)
            user_agent = user_agent.replace(str(chrome_version - version_offset), str(chrome_version))
            random.seed()  # Reset to truly random
            
        return user_agent
    
    async def stealth_delay(self, operation_type: str = "request"):
        """Apply intelligent delays to avoid detection patterns"""
        current_time = time.time()
        self.stealth_config['request_count'] += 1
        
        # Calculate base delay
        if self.stealth_config['last_request_time'] > 0:
            time_since_last = current_time - self.stealth_config['last_request_time']
            
            # If too fast, add extra delay
            if time_since_last < self.stealth_config['min_delay']:
                extra_delay = self.stealth_config['min_delay'] - time_since_last
                await asyncio.sleep(extra_delay)
        
        # Random delay between min and max
        base_delay = random.uniform(
            self.stealth_config['min_delay'], 
            self.stealth_config['max_delay']
        )
        
        # Longer delay every N requests (burst pattern avoidance)
        if self.stealth_config['request_count'] % self.stealth_config['burst_frequency'] == 0:
            burst_delay = random.uniform(*self.stealth_config['burst_delay'])
            logger.info(f"🛡️ Stealth burst delay: {burst_delay:.1f}s (after {self.stealth_config['request_count']} requests)")
            await asyncio.sleep(burst_delay)
            
            # Reset burst frequency for next cycle (varies pattern)
            self.stealth_config['burst_frequency'] = random.randint(7, 12)
        else:
            await asyncio.sleep(base_delay)
        
        # Longer delays for sensitive operations
        if operation_type == "subreddit_analysis":
            extra_delay = random.uniform(2, 5)
            await asyncio.sleep(extra_delay)
        elif operation_type == "user_analysis":
            extra_delay = random.uniform(1, 3)
            await asyncio.sleep(extra_delay)
        
        self.stealth_config['last_request_time'] = time.time()
        logger.debug(f"🛡️ Stealth delay: {base_delay:.1f}s for {operation_type}")
    
    def randomize_request_pattern(self):
        """Randomize request patterns to avoid detection"""
        # Vary the request timing patterns
        self.stealth_config['min_delay'] = random.uniform(1.0, 2.5)
        self.stealth_config['max_delay'] = random.uniform(3.0, 6.0)
        
        # Ensure min < max
        if self.stealth_config['min_delay'] >= self.stealth_config['max_delay']:
            self.stealth_config['min_delay'] = self.stealth_config['max_delay'] - 1.0
        
        logger.debug(f"🛡️ Randomized delays: {self.stealth_config['min_delay']:.1f}s - {self.stealth_config['max_delay']:.1f}s")
    
    def get_next_proxy(self) -> Dict:
        """Get next proxy configuration with 3-proxy rotation (aiohttp format)"""
        if not hasattr(self, '_proxy_index'):
            self._proxy_index = 0
        
        # 3-proxy configurations with unified format (auth embedded in proxy string)
        proxy_configs = [
            {
                'service': 'beyondproxy',  # lowercase to match request_with_retry
                'proxy': '9b1a4c15700a:654fa0b97850@proxy.beyondproxy.io:12321',
                'auth': None,  # Auth already embedded in proxy string
                'display_name': 'BeyondProxy'
            },
            {
                'service': 'nyronproxy',  # lowercase to match request_with_retry  
                'proxy': 'uxJNWsLXw3XnJE-zone-resi:cjB3tG2ij@residential-ww.nyronproxies.com:16666',
                'auth': None,  # Auth now embedded in proxy string
                'display_name': 'NyronProxy'
            },
            {
                'service': 'rapidproxy',  # lowercase to match request_with_retry
                'proxy': 'admin123-residential-GLOBAL:admin123@us.rapidproxy.io:5001',
                'auth': None,  # Auth now embedded in proxy string
                'display_name': 'RapidProxy'
            }
        ]
        
        # Round-robin rotation
        config = proxy_configs[self._proxy_index]
        self._proxy_index = (self._proxy_index + 1) % len(proxy_configs)
        
        return config
    
    def test_proxies_at_startup(self):
        """Test all 3 proxies at startup to ensure connectivity (synchronous)"""
        logger.info("🔍 Testing proxy connectivity at startup...")
        
        # Reset proxy index for testing
        self._proxy_index = 0
        
        proxy_statuses = []
        for i in range(3):  # Test all 3 proxies
            proxy_config = self.get_next_proxy()
            service_name = proxy_config['display_name']
            
            # Test each proxy 3 times, require at least 1 success
            proxy_attempts = []
            for attempt in range(3):
                try:
                    # Test with Reddit API (since httpbin.org blocks proxies)
                    test_url = "https://www.reddit.com/api/v1/me.json"
                    
                    # Create proxy dict for requests (unified format - auth embedded)
                    proxy_str = proxy_config['proxy']
                    
                    proxies = {"http": f"http://{proxy_str}", "https": f"http://{proxy_str}"}
                    
                    # Use the same user agent generation as the main scraper
                    user_agent = self.public_api.generate_user_agent() if self.public_api else 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                    response = requests.get(
                        test_url,
                        proxies=proxies,
                        timeout=15,
                        headers={'User-Agent': user_agent}
                    )
                    
                    # Reddit API returns various status codes, but any response means proxy works
                    if response.status_code in [200, 401, 403]:  # 401/403 are expected without auth
                        logger.info(f"✅ {service_name} attempt {attempt+1}/3: Success (HTTP {response.status_code})")
                        proxy_attempts.append(True)
                    else:
                        logger.warning(f"⚠️ {service_name} attempt {attempt+1}/3: Failed (HTTP {response.status_code})")
                        proxy_attempts.append(False)
                            
                except Exception as e:
                    logger.warning(f"⚠️ {service_name} attempt {attempt+1}/3: Connection failed - {e}")
                    proxy_attempts.append(False)
                    
                # Small delay between attempts
                if attempt < 2:  # Don't delay after the last attempt
                    time.sleep(2)
            
            # Evaluate proxy: at least 1 success out of 3 attempts
            proxy_success = any(proxy_attempts)
            successful_attempts = sum(proxy_attempts)
            
            if proxy_success:
                logger.info(f"🎉 {service_name}: PASSED ({successful_attempts}/3 attempts successful)")
                proxy_statuses.append(True)
            else:
                logger.error(f"❌ {service_name}: FAILED (0/3 attempts successful)")
                proxy_statuses.append(False)
                
            # Small delay between different proxy services
            if i < 2:  # Don't delay after the last proxy
                time.sleep(3)
        
        # Summary
        working_proxies = sum(proxy_statuses)
        logger.info(f"🌐 Proxy test results: {working_proxies}/3 proxies working")
        
        if working_proxies == 0:
            logger.error("❌ No proxies are working! This will likely cause rate limiting.")
        elif working_proxies < 3:
            logger.warning(f"⚠️ Only {working_proxies}/3 proxies working - redrightuced anti-detection")
        else:
            logger.info("🎉 All proxies working perfectly!")
        
        # Reset proxy index for actual usage
        self._proxy_index = 0
        
        return working_proxies

    async def load_proxy_configs(self):
        """Proxy config is hardcoded in script - no database loading needed"""
        logger.info(f"🌐 Using 3-proxy configuration with auto-rotation")
    
    async def filter_existing_subreddits(self, subreddit_names: set) -> set:
        """Filter out subreddits that already exist in database and were recently scraped"""
        if not subreddit_names:
            return set()

        # Load Non Related cache if needed
        await self.load_non_related_cache()

        # Remove Non Related subreddits immediately
        original_count = len(subreddit_names)
        subreddit_names = subreddit_names - self.non_related_cache
        filtered_count = original_count - len(subreddit_names)

        if filtered_count > 0:
            logger.info(f"🚫 Filtered out {filtered_count} Non Related subreddits from discovery")

        try:
            # Convert set to list for database query
            subreddit_list = list(subreddit_names)
            
            # Check which subreddits exist and when they were last scraped
            resp = self.supabase.table('reddit_subreddits').select('name, last_scraped_at').in_('name', subreddit_list).execute()
            
            existing_subreddits = set()
            stale_subreddits = set()
            
            if resp.data:
                # Define staleness threshold (24 hours)
                staleness_threshold = datetime.now(timezone.utc) - timedelta(hours=24)
                
                for row in resp.data:
                    subreddit_name = row['name']
                    last_scraped = row.get('last_scraped_at')
                    
                    if last_scraped:
                        try:
                            last_scraped_dt = datetime.fromisoformat(last_scraped.replace('Z', '+00:00'))
                            if last_scraped_dt < staleness_threshold:
                                stale_subreddits.add(subreddit_name)
                            else:
                                existing_subreddits.add(subreddit_name)
                        except Exception:
                            # If date parsing fails, consider it stale
                            stale_subreddits.add(subreddit_name)
                    else:
                        # No last_scraped_at means it needs to be scraped
                        stale_subreddits.add(subreddit_name)
            
            # Return subreddits that don't exist or are stale (need scraping)
            new_subreddits = subreddit_names - existing_subreddits
            total_to_scrape = new_subreddits | stale_subreddits
            
            logger.info(f"📊 Subreddit filtering results:")
            logger.info(f"   🆕 New subreddits: {len(new_subreddits - stale_subreddits)}")
            logger.info(f"   🔄 Stale subreddits (>24h): {len(stale_subreddits)}")
            logger.info(f"   ✅ Fresh subreddits (skipped): {len(existing_subreddits)}")
            logger.info(f"   🎯 Total to scrape: {len(total_to_scrape)}")
            
            return total_to_scrape
            
        except Exception as e:
            logger.error(f"❌ Error filtering existing subreddits: {e}")
            # Return all subreddits if filtering fails
            return subreddit_names
    
    async def initialize(self):
        """Initialize with proxy-enabled Reddit clients from Supabase"""
        try:
            # Load account configuration from Supabase
            accounts_data = await self.load_accounts_from_supabase()
            
            # Initialize Reddit clients with proxy support
            for account in accounts_data:
                # Build proxy configuration from Supabase data
                proxy_config = None
                if account.get('proxy_host') and account.get('proxy_port'):
                    proxy_url = f"http://{account['proxy_username']}:{account['proxy_password']}@{account['proxy_host']}:{account['proxy_port']}"
                    proxy_config = {
                        'http': proxy_url,
                        'https': proxy_url
                    }
                    logger.info(f"🌐 {account['username']} using proxy: {account['proxy_username']}:***@{account['proxy_host']}:{account['proxy_port']}")
                    
                # Generate random user agent for stealth
                random_user_agent = self.generate_random_user_agent(account['username'])
                logger.debug(f"🛡️ {account['username']} using randomized user agent: {random_user_agent[:50]}...")
                
                # Create Reddit client with randomized user agent
                reddit_client = asyncpraw.Reddit(
                    client_id=account['client_id'],
                    client_secret=account['client_secret'],
                    username=account['username'],
                    password=account['password'],
                    user_agent=random_user_agent
                )
                
                # Test authentication and update account health
                try:
                    me = await reddit_client.user.me()
                    logger.info(f"✅ {account['username']} authenticated successfully (proxy: {'Yes' if proxy_config else 'No'})")
                    
                    # Update account success in database
                    await self.update_account_health(account['id'], success=True)
                    
                    self.reddit_clients.append({
                        'client': reddit_client,
                        'username': account['username'],
                        'account_id': account['id'],
                        'proxy_config': proxy_config,
                        'proxy_host': account.get('proxy_host', 'Direct'),
                        'requests_made': 0,
                        'is_healthy': True
                    })
                    
                    self.stats['accounts_used'][account['username']] = 0
                    
                except Exception as e:
                    logger.error(f"❌ {account['username']} authentication failed: {e}")
                    # Update account failure in database  
                    await self.update_account_health(account['id'], success=False, error_message=str(e))
                    await reddit_client.close()
            
            # Initialize Supabase
            supabase_url = os.getenv('SUPABASE_URL')
            supabase_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
            self.supabase = create_client(supabase_url, supabase_key)
            
            # Set up Supabase logging handler
            try:
                supabase_handler = SupabaseLogHandler(self.supabase, source='reddit_scraper')
                supabase_handler.setLevel(logging.INFO)  # Only send INFO and above to database
                logger.addHandler(supabase_handler)
                logger.info("🔗 Supabase logging handler initialized")
            except Exception as e:
                logger.error(f"❌ Failed to initialize Supabase logging: {e}")
            
            # Load proxy configurations for public API
            await self.load_proxy_configs()
            
            # Initialize Public JSON API client (requests-based)
            self.public_api = PublicRedditAPI(max_retries=10, base_delay=4.0)
            
            # Test proxy connectivity at startup
            working_proxies = self.test_proxies_at_startup()
            if working_proxies < 3:
                logger.error(f"❌ CRITICAL: Only {working_proxies}/3 proxies working - script requires ALL proxies!")
                logger.error("🛑 Stopping execution - fix proxy issues before running")
                raise Exception(f"Proxy validation failed: only {working_proxies}/3 proxies working")
            
            logger.info(f"🚀 Multi-proxy high-performance scraper initialized:")
            logger.info(f"   📱 {len(self.reddit_clients)} authenticated accounts (fallback only)")
            logger.info(f"   🌐 3 proxy services with load distribution:")
            logger.info(f"      🔵 BeyondProxy (proxy.beyondproxy.io)")  
            logger.info(f"      🟢 NyronProxy (residential-ww.nyronproxies.com)")
            logger.info(f"      🟠 RapidProxy (us.rapidproxy.io)")
            logger.info(f"   🔄 Public JSON API enabled with 10x retry logic")
            logger.info(f"   ⚡ 18-worker concurrent processing (6 per proxy service)")
            logger.info(f"   🎲 Unique user agent per request for maximum stealth")
            
            # Initialize stealth patterns 
            self.randomize_request_pattern()
            logger.info(f"🛡️ Stealth mode activated with randomized request patterns")
            
        except Exception as e:
            logger.error(f"❌ Failed to initialize: {e}")
            raise
    
    async def load_accounts_from_supabase(self) -> List[Dict]:
        """Load active Reddit accounts from Supabase table"""
        try:
            # Initialize Supabase client first if not already done
            if not self.supabase:
                supabase_url = os.getenv('SUPABASE_URL')
                supabase_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
                self.supabase = create_client(supabase_url, supabase_key)
                
                # Set up Supabase logging handler if not already done
                try:
                    # Check if handler already exists
                    handler_exists = any(isinstance(h, SupabaseLogHandler) for h in logger.handlers)
                    if not handler_exists:
                        supabase_handler = SupabaseLogHandler(self.supabase, source='reddit_scraper')
                        supabase_handler.setLevel(logging.INFO)
                        logger.addHandler(supabase_handler)
                        logger.info("🔗 Supabase logging handler initialized")
                except Exception as e:
                    logger.error(f"❌ Failed to initialize Supabase logging: {e}")
            
            # Get enabled accounts ordered by priority and success rate
            resp = self.supabase.table('scraper_accounts').select('*').eq(
                'is_enabled', True
            ).neq(
                'status', 'banned'  # Skip banned accounts
            ).order('priority').order('success_rate', desc=True).limit(5).execute()
            
            if not resp.data:
                logger.warning("⚠️ No enabled accounts found in database")
                return []
                
            logger.info(f"📋 Loaded {len(resp.data)} enabled accounts from Supabase")
            return resp.data
            
        except Exception as e:
            logger.error(f"❌ Failed to load accounts from Supabase: {e}")
            # Fallback to environment variable for backwards compatibility
            accounts_config_json = os.getenv('ACCOUNTS_CONFIG_JSON')
            if accounts_config_json:
                logger.info("📋 Falling back to environment variable")
                config = json.loads(accounts_config_json)
                return [acc for acc in config['reddit_accounts'] if acc.get('enabled', True)][:4]
            return []
    
    async def update_account_health(self, account_id: int, success: bool = True, error_message: str = None):
        """Update account health metrics in Supabase"""
        try:
            if success:
                # Update success metrics
                resp = self.supabase.table('scraper_accounts').update({
                    'total_requests': self.supabase.raw('total_requests + 1'),
                    'successful_requests': self.supabase.raw('successful_requests + 1'),
                    'consecutive_failures': 0,
                    'last_success_at': datetime.now(timezone.utc).isoformat(),
                    'last_used_at': datetime.now(timezone.utc).isoformat(),
                    # Recalculate success rate
                    'success_rate': self.supabase.raw('ROUND((successful_requests + 1.0) / (total_requests + 1.0) * 100, 2)')
                }).eq('id', account_id).execute()
            else:
                # Update failure metrics
                resp = self.supabase.table('scraper_accounts').update({
                    'total_requests': self.supabase.raw('total_requests + 1'),
                    'failed_requests': self.supabase.raw('failed_requests + 1'),
                    'consecutive_failures': self.supabase.raw('consecutive_failures + 1'),
                    'last_failure_at': datetime.now(timezone.utc).isoformat(),
                    'last_error_message': error_message,
                    'last_used_at': datetime.now(timezone.utc).isoformat(),
                    # Recalculate success rate
                    'success_rate': self.supabase.raw('ROUND(successful_requests::decimal / (total_requests + 1.0) * 100, 2)')
                }).eq('id', account_id).execute()
                
                # Auto-disable account after 5 consecutive failures
                if resp.data and resp.data[0].get('consecutive_failures', 0) >= 5:
                    await self.disable_account(account_id, reason="Too many consecutive failures")
                    
        except Exception as e:
            logger.debug(f"❌ Failed to update account health for ID {account_id}: {e}")
    
    async def disable_account(self, account_id: int, reason: str = ""):
        """Disable a problematic account"""
        try:
            self.supabase.table('scraper_accounts').update({
                'is_enabled': False,
                'status': 'disabled',
                'last_error_message': f"Auto-disabled: {reason}",
                'updated_at': datetime.now(timezone.utc).isoformat()
            }).eq('id', account_id).execute()
            
            logger.warning(f"⚠️ Account ID {account_id} auto-disabled: {reason}")
            
        except Exception as e:
            logger.error(f"❌ Failed to disable account ID {account_id}: {e}")
    
    def get_next_client(self):
        """Get next Reddit client with load balancing and health tracking"""
        if not self.reddit_clients:
            raise Exception("No Reddit clients available")
        
        client_info = self.reddit_clients[self.current_client_index]
        client_info['requests_made'] += 1
        self.stats['accounts_used'][client_info['username']] += 1
        self.stats['total_requests'] += 1
        
        # Track proxy vs direct requests
        if client_info['proxy_config']:
            self.stats['proxy_requests'] += 1
        else:
            self.stats['direct_requests'] += 1
        
        # Move to next client
        self.current_client_index = (self.current_client_index + 1) % len(self.reddit_clients)
        
        return client_info['client'], client_info['username'], client_info['account_id']
    
    async def get_target_subreddits(self) -> Dict[str, List[str]]:
        """Get subreddits by review status for different processing types"""
        try:
            # Get OK subreddits for full processing (users + discovery)
            ok_response = self.supabase.table('reddit_subreddits').select(
                'name, review'
            ).eq('review', 'Ok').execute()

            # Get No Seller subreddits for data update only (no users/discovery)
            no_seller_response = self.supabase.table('reddit_subreddits').select(
                'name, review'
            ).eq('review', 'No Seller').execute()

            ok_subreddits = [item['name'] for item in ok_response.data] if ok_response.data else []
            no_seller_subreddits = [item['name'] for item in no_seller_response.data] if no_seller_response.data else []

            # Randomize order to distribute load
            random.shuffle(ok_subreddits)
            random.shuffle(no_seller_subreddits)

            logger.info(f"📋 Found {len(ok_subreddits)} OK subreddits for full processing")
            logger.info(f"📊 Found {len(no_seller_subreddits)} No Seller subreddits for data update only")

            return {
                'ok': ok_subreddits,
                'no_seller': no_seller_subreddits
            }

        except Exception as e:
            logger.error(f"❌ Failed to fetch target subreddits: {e}")
            return {'ok': [], 'no_seller': []}

    async def load_non_related_cache(self):
        """Load Non Related subreddits to skip processing"""
        # Check if cache is still fresh
        if (self.non_related_cache_time and
            datetime.now(timezone.utc) - self.non_related_cache_time < self.cache_ttl):
            return  # Cache still valid

        try:
            response = self.supabase.table('reddit_subreddits').select('name').eq(
                'review', 'Non Related'
            ).execute()

            if response.data:
                self.non_related_cache = {item['name'] for item in response.data}
                self.non_related_cache_time = datetime.now(timezone.utc)

                logger.info(f"🚫 Loaded {len(self.non_related_cache)} Non Related subreddits to skip")
            else:
                self.non_related_cache = set()
                logger.info("ℹ️ No Non Related subreddits found")

        except Exception as e:
            logger.error(f"❌ Failed to load Non Related cache: {e}")
            self.non_related_cache = set()

    async def test_proxy_scraping(self, control_checker=None):
        """3-Thread discovery pipeline with proxy rotation"""
        logger.info("🚀 Starting 3-thread discovery pipeline...")

        # Track if we should stop
        self.should_stop = False
        
        # Initialize local memory for processed users (prevents reprocessing)
        if not hasattr(self, 'processed_users_memory'):
            self.processed_users_memory = set()
            logger.info("💾 Initialized local user memory cache")
        
        # Manage memory size (prevent unlimited growth)
        max_memory_size = 5000  # Keep last 5000 users in memory
        if len(self.processed_users_memory) > max_memory_size:
            # Remove oldest 1000 entries (simple FIFO)
            users_to_remove = list(self.processed_users_memory)[:1000]
            self.processed_users_memory -= set(users_to_remove)
            logger.info(f"🧹 Cleaned local memory: removed {len(users_to_remove)} old entries, {len(self.processed_users_memory)} remaining")
        
        # Initialize cycle-level subreddit memory (prevents reprocessing within cycle)
        cycle_analyzed_subreddits = set()
        logger.info("💾 Initialized cycle subreddit memory cache")
        
        # Initialize minimum requirements tracking for each subreddit
        subreddit_requirements = {}  # {subreddit_name: {'reddit_users': [user_data], 'post_karmas': [], 'comment_karmas': [], 'ages': []}}
        requirements_lock = threading.Lock()
        logger.info("📊 Initialized minimum requirements tracking system")
        
        # STEP 1: Get target subreddits from database by review status
        subreddits_by_status = await self.get_target_subreddits()
        ok_subreddits = subreddits_by_status.get('ok', [])
        no_seller_subreddits = subreddits_by_status.get('no_seller', [])

        total_subreddits = len(ok_subreddits) + len(no_seller_subreddits)
        logger.info(f"📋 Found {total_subreddits} target subreddits: {len(ok_subreddits)} OK, {len(no_seller_subreddits)} No Seller")

        if not ok_subreddits and not no_seller_subreddits:
            logger.warning("⚠️ No target subreddits found")
            return
        
        # Check if we should stop before processing
        if control_checker:
            should_continue = await control_checker()
            if not should_continue:
                logger.info("⏹️ Scraper disabled, stopping before processing")
                return

        # STEP 2: Process subreddits with enhanced threading (9 threads, 3 per proxy)
        all_authors = set()
        processing_lock = threading.Lock()
        logger.info(f"🔍 Processing {total_subreddits} subreddits with 9 concurrent threads (3 per proxy)...")

        # Combine all subreddits but track their type
        all_subreddits = []
        subreddit_types = {}  # Map subreddit name to type ('ok' or 'no_seller')

        for sub in ok_subreddits:
            all_subreddits.append(sub)
            subreddit_types[sub] = 'ok'

        for sub in no_seller_subreddits:
            all_subreddits.append(sub)
            subreddit_types[sub] = 'no_seller'

        # Distribute subreddits across 9 threads (round-robin)
        thread_subreddits = [[] for _ in range(9)]  # 9 empty lists for 9 threads
        for i, subreddit_name in enumerate(all_subreddits):
            thread_subreddits[i % 9].append(subreddit_name)
            
        proxy_services = ["BeyondProxy", "NyronProxy", "RapidProxy"]
        # Each proxy service gets 3 threads
        thread_proxy_mapping = []
        for proxy_idx, proxy_service in enumerate(proxy_services):
            for thread_num in range(3):
                thread_proxy_mapping.append(f"{proxy_service}-T{thread_num+1}")
        
        logger.info(f"📊 Enhanced thread distribution:")
        for i in range(9):
            proxy_group = i // 3  # 0-2 for the 3 proxy groups
            logger.info(f"   Thread {i}: {thread_proxy_mapping[i]} ({len(thread_subreddits[i])} subreddits)")
        logger.info(f"🌐 Proxy groups: BeyondProxy(T0-2), NyronProxy(T3-5), RapidProxy(T6-8)")
        
        # Define worker function for each thread
        def process_subreddits_thread(thread_id: int, subreddits_list: list, proxy_service: str):
            """Process subreddits sequentially within a single thread, each with specific proxy"""
            nonlocal all_authors, cycle_analyzed_subreddits, subreddit_requirements, subreddit_types
            thread_successful = 0
            thread_failed = 0
            # Enhanced color coding for 9 threads (3 per proxy)
            proxy_colors = ["🔵", "🔷", "💙", "🟢", "🟩", "💚", "🟠", "🧡", "🟤"]
            
            # SOLUTION: Create dedicated API instance per thread to eliminate shared resource contention
            thread_api = PublicRedditAPI(max_retries=10, base_delay=4.0)
            logger.debug(f"🔧 Thread {thread_id} created dedicated API instance")
            
            # Get proxy config for this specific thread (thread-safe)
            proxy_configs = [
                {
                    'service': 'beyondproxy',
                    'proxy': '9b1a4c15700a:654fa0b97850@proxy.beyondproxy.io:12321',
                    'auth': None,
                    'display_name': 'BeyondProxy'
                },
                {
                    'service': 'nyronproxy',
                    'proxy': 'uxJNWsLXw3XnJE-zone-resi:cjB3tG2ij@residential-ww.nyronproxies.com:16666',
                    'auth': None,
                    'display_name': 'NyronProxy'
                },
                {
                    'service': 'rapidproxy',
                    'proxy': 'admin123-residential-GLOBAL:admin123@us.rapidproxy.io:5001',
                    'auth': None,
                    'display_name': 'RapidProxy'
                }
            ]
            # Map thread_id to appropriate proxy (3 threads per proxy)
            proxy_group = thread_id // 3  # 0, 1, or 2
            thread_proxy_config = proxy_configs[proxy_group]
            
            logger.info(f"{proxy_colors[thread_id]} Thread {thread_id} ({proxy_service}) starting with {len(subreddits_list)} subreddits")
            
            for sub_idx, subreddit_name in enumerate(subreddits_list):
                try:
                    # Check subreddit type
                    sub_type = subreddit_types.get(subreddit_name, 'ok')
                    type_indicator = "📊 [No Seller]" if sub_type == 'no_seller' else "✅ [OK]"

                    logger.info(f"{proxy_colors[thread_id]} [{sub_idx+1}/{len(subreddits_list)}] {type_indicator} r/{subreddit_name} via {proxy_service}")

                    if sub_type == 'no_seller':
                        # For "No Seller" subreddits: Only update subreddit data and posts
                        # No user extraction or new subreddit discovery
                        logger.info(f"📊 Updating data only for No Seller subreddit r/{subreddit_name}")

                        # Use thread API to update subreddit data and posts only
                        self.update_no_seller_subreddit(subreddit_name, thread_proxy_config, thread_api)

                        # Track as processed but don't collect authors
                        with processing_lock:
                            cycle_analyzed_subreddits.add(subreddit_name)

                        logger.info(f"✅ r/{subreddit_name} data updated (No Seller - no user extraction)")
                        thread_successful += 1
                    else:
                        # For "OK" subreddits: Full processing (users + discovery)
                        authors = self.analyze_subreddit_with_thread_api(subreddit_name, thread_proxy_config, thread_api)

                        # Track minimum requirements for this subreddit (thread-safe)
                        if authors:
                            with requirements_lock:
                                logger.info(f"📊 Tracking requirements for SEED subreddit r/{subreddit_name} with {len(authors)} authors")
                                self.track_subreddit_requirements(subreddit_name, authors, subreddit_requirements)

                        # Thread-safe updates
                        with processing_lock:
                            cycle_analyzed_subreddits.add(subreddit_name)
                            if authors:
                                all_authors.update(authors)

                        if authors:
                            logger.info(f"✅ r/{subreddit_name} completed via {proxy_service}, found {len(authors)} authors")
                            thread_successful += 1
                        else:
                            logger.warning(f"⚠️ r/{subreddit_name} returned no authors")
                            thread_failed += 1
                    
                    # Random delay between subreddits within thread (1-3 seconds)
                    if sub_idx < len(subreddits_list) - 1:
                        delay = random.uniform(1.0, 3.0)
                        time.sleep(delay)
                        
                except Exception as e:
                    logger.error(f"❌ Thread {thread_id} error processing r/{subreddit_name}: {e}")
                    thread_failed += 1
                    with processing_lock:
                        cycle_analyzed_subreddits.add(subreddit_name)
            
            logger.info(f"{proxy_colors[thread_id]} Thread {thread_id} ({proxy_service}) completed: {thread_successful} successful, {thread_failed} failed")
        
        # Create and start 9 threads (3 per proxy)
        threads = []
        for thread_id in range(9):
            if thread_subreddits[thread_id]:  # Only create thread if it has subreddits
                proxy_group = thread_id // 3  # 0, 1, or 2
                proxy_service = proxy_services[proxy_group]
                thread_name = f"{proxy_service}-T{(thread_id % 3) + 1}"
                
                thread = threading.Thread(
                    target=process_subreddits_thread,
                    args=(thread_id, thread_subreddits[thread_id], thread_name),
                    name=f"SubredditThread-{thread_name}"
                )
                threads.append(thread)
                thread.start()
        
        # Wait for all threads to complete
        for thread in threads:
            thread.join()
        
        logger.info(f"🎯 All subreddit processing threads completed")
        
        # STEP 3: Filter and process users
        max_users = int(os.environ.get('MAX_USERS_PER_CYCLE', 100))
        authors_to_process = list(all_authors)[:max_users]
        logger.info(f"👥 Found {len(all_authors)} total authors, processing {len(authors_to_process)} (limit: {max_users})")
        
        # Filter out already processed users
        new_authors = [user for user in authors_to_process if user not in self.processed_users_memory]
        
        if not new_authors:
            logger.info("ℹ️ All users already processed in local memory")
            return
        
        logger.info(f"📊 Processing {len(new_authors)} new users (skipping {len(authors_to_process) - len(new_authors)} cached)")
        
        # STEP 4: Process users with 9 concurrent threads (3 per proxy service)
        logger.info(f"🔄 Processing {len(new_authors)} users with 9 concurrent threads (3 per proxy)...")
        logger.info(f"🌐 Enhanced thread distribution:")
        logger.info(f"   🔵🔷💙 BeyondProxy: Threads 0-2 (proxy.beyondproxy.io:12321)")
        logger.info(f"   🟢🟩💚 NyronProxy: Threads 3-5 (residential-ww.nyronproxies.com:16666)")  
        logger.info(f"   🟠🧡🟤 RapidProxy: Threads 6-8 (us.rapidproxy.io:5001)")
        
        user_start_time = time.time()
        discovered_subreddits = set()
        successful_users = 0
        failed_users = 0
        processing_lock = asyncio.Lock()
        
        # Define worker function for each thread
        async def process_users_thread(thread_id: int, users_list: list, proxy_service: str):
            """Process users sequentially within a single thread, each with different proxy"""
            nonlocal successful_users, failed_users, discovered_subreddits
            thread_successful = 0
            thread_failed = 0
            # Enhanced color coding for 9 threads (3 per proxy)
            proxy_colors = ["🔵", "🔷", "💙", "🟢", "🟩", "💚", "🟠", "🧡", "🟤"]
            
            # Get proxy config for this specific thread (using fixed rotation)
            proxy_group = thread_id // 3  # 0, 1, or 2 (which proxy service)
            temp_index = self._proxy_index  # Save current index
            self._proxy_index = proxy_group    # Set to specific proxy group
            proxy_config = self.get_next_proxy()  # Get the proxy config
            self._proxy_index = temp_index   # Restore original rotation
            
            logger.info(f"{proxy_colors[thread_id]} Thread {thread_id} ({proxy_service}) starting with {len(users_list)} users")
            
            for user_idx, username in enumerate(users_list):
                try:
                    # Check if user was processed in last 24 hours
                    try:
                        user_check = self.supabase.table('reddit_users').select(
                            'username, last_scraped_at'
                        ).eq('username', username).single().execute()

                        if user_check.data and user_check.data.get('last_scraped_at'):
                            last_scraped = user_check.data.get('last_scraped_at')
                            last_scraped_dt = datetime.fromisoformat(last_scraped.replace('Z', '+00:00'))
                            hours_ago = (datetime.now(timezone.utc) - last_scraped_dt).total_seconds() / 3600

                            if hours_ago < 24:
                                logger.info(f"⏭️ {proxy_colors[thread_id]} Skipping u/{username} - processed {hours_ago:.1f}h ago")
                                async with processing_lock:
                                    self.processed_users_memory.add(username)
                                continue
                    except Exception as e:
                        logger.debug(f"User {username} not in database or error checking: {e}")

                    logger.info(f"{proxy_colors[thread_id]} [{user_idx+1}/{len(users_list)}] u/{username} via {proxy_service}")

                    # Process user with timeout protection  
                    try:
                        user_subreddits = await asyncio.wait_for(
                            self.analyze_user_public_api(username, proxy_config),
                            timeout=60  # 60 second timeout per user
                        )
                        
                        if isinstance(user_subreddits, set) and user_subreddits:
                            # Thread-safe updates
                            async with processing_lock:
                                discovered_subreddits.update(user_subreddits)
                                self.processed_users_memory.add(username)
                                
                            logger.info(f"✅ u/{username} completed via {proxy_service}, discovered {len(user_subreddits)} subreddits")
                            thread_successful += 1
                        else:
                            logger.warning(f"⚠️ u/{username} returned no valid subreddits")
                            thread_failed += 1
                            async with processing_lock:
                                self.processed_users_memory.add(username)
                                
                    except asyncio.TimeoutError:
                        logger.error(f"⏰ u/{username} timed out after 60s via {proxy_service}")
                        thread_failed += 1
                        async with processing_lock:
                            self.processed_users_memory.add(username)
                            
                    except Exception as user_error:
                        logger.error(f"❌ u/{username} processing error via {proxy_service}: {user_error}")
                        thread_failed += 1
                        async with processing_lock:
                            self.processed_users_memory.add(username)
                    
                    # Random delay between users within thread (1-3 seconds)
                    if user_idx < len(users_list) - 1:
                        delay = random.uniform(1.0, 3.0)
                        await asyncio.sleep(delay)
                        
                except Exception as e:
                    logger.error(f"❌ Thread {thread_id} outer error processing u/{username}: {e}")
                    thread_failed += 1
                    async with processing_lock:
                        self.processed_users_memory.add(username)
            
            # Update shared counters
            async with processing_lock:
                successful_users += thread_successful
                failed_users += thread_failed
                
            logger.info(f"{proxy_colors[thread_id]} Thread {thread_id} ({proxy_service}) completed: {thread_successful} successful, {thread_failed} failed")
        
        # Distribute users across 9 threads (round-robin)
        thread_users = [[] for _ in range(9)]  # 9 empty lists for 9 threads
        for i, username in enumerate(new_authors):
            thread_users[i % 9].append(username)
            
        proxy_services = ["BeyondProxy", "NyronProxy", "RapidProxy"]
        logger.info(f"📊 Enhanced user distribution:")
        for i in range(9):
            proxy_group = i // 3
            thread_num = (i % 3) + 1
            proxy_name = proxy_services[proxy_group]
            logger.info(f"   Thread {i}: {proxy_name}-T{thread_num} ({len(thread_users[i])} users)")
        
        # Run 9 threads concurrently
        tasks = []
        for thread_id in range(9):
            if thread_users[thread_id]:  # Only create thread if it has users
                proxy_group = thread_id // 3
                thread_num = (thread_id % 3) + 1
                thread_name = f"{proxy_services[proxy_group]}-T{thread_num}"
                task = process_users_thread(thread_id, thread_users[thread_id], thread_name)
                tasks.append(task)
        
        if tasks:
            await asyncio.gather(*tasks, return_exceptions=True)
        
        user_duration = time.time() - user_start_time
        logger.info(f"🎯 User processing completed: {successful_users} successful, {failed_users} failed out of {len(new_authors)} total")
        logger.info(f"⏱️ Total duration: {user_duration:.1f}s ({user_duration/len(new_authors) if len(new_authors) > 0 else 0:.1f}s avg per user)")
        logger.info(f"💾 Local memory now contains {len(self.processed_users_memory)} processed users")
        logger.info(f"📊 Cycle memory contains {len(cycle_analyzed_subreddits)} analyzed subreddits")
        logger.info(f"🔍 Discovered {len(discovered_subreddits)} new subreddits from users")
        
        # STEP 5: Process newly discovered subreddits
        if discovered_subreddits:
            # Filter out subreddits already processed in this cycle
            new_subreddits = discovered_subreddits - cycle_analyzed_subreddits
            if new_subreddits:
                logger.info(f"🆕 Found {len(new_subreddits)} new subreddits to analyze (filtered {len(discovered_subreddits - new_subreddits)} already processed)")
                
                # Process new subreddits with true threading as well
                new_subreddits_list = list(new_subreddits)
                
                # Distribute new subreddits across 9 threads
                new_thread_subreddits = [[] for _ in range(9)]
                for i, subreddit_name in enumerate(new_subreddits_list):
                    new_thread_subreddits[i % 9].append(subreddit_name)
                
                logger.info(f"🌟 Processing {len(new_subreddits_list)} new subreddits with 9 concurrent threads (3 per proxy)...")
                logger.info(f"📊 Enhanced new subreddit distribution:")
                for i in range(9):
                    proxy_group = i // 3
                    thread_num = (i % 3) + 1
                    proxy_name = proxy_services[proxy_group]
                    logger.info(f"   Thread {i}: {proxy_name}-T{thread_num} ({len(new_thread_subreddits[i])} subreddits)")
                
                # Define worker function for new subreddits
                def process_new_subreddits_thread(thread_id: int, subreddits_list: list, proxy_service: str):
                    """Process new subreddits with specific proxy"""
                    # Enhanced color coding for 9 threads (3 per proxy)
                    proxy_colors = ["🔵", "🔷", "💙", "🟢", "🟩", "💚", "🟠", "🧡", "🟤"]
                    
                    # SOLUTION: Create dedicated API instance per thread to eliminate shared resource contention
                    thread_api = PublicRedditAPI(max_retries=10, base_delay=4.0)
                    logger.debug(f"🔧 New Thread {thread_id} created dedicated API instance")
                    
                    # Get proxy config for this thread (thread-safe)
                    proxy_configs = [
                        {
                            'service': 'beyondproxy',
                            'proxy': '9b1a4c15700a:654fa0b97850@proxy.beyondproxy.io:12321',
                            'auth': None,
                            'display_name': 'BeyondProxy'
                        },
                        {
                            'service': 'nyronproxy',
                            'proxy': 'uxJNWsLXw3XnJE-zone-resi:cjB3tG2ij@residential-ww.nyronproxies.com:16666',
                            'auth': None,
                            'display_name': 'NyronProxy'
                        },
                        {
                            'service': 'rapidproxy',
                            'proxy': 'admin123-residential-GLOBAL:admin123@us.rapidproxy.io:5001',
                            'auth': None,
                            'display_name': 'RapidProxy'
                        }
                    ]
                    # Map thread_id to appropriate proxy (3 threads per proxy)
                    proxy_group = thread_id // 3  # 0, 1, or 2
                    thread_proxy_config = proxy_configs[proxy_group]
                    
                    logger.info(f"{proxy_colors[thread_id]} New Thread {thread_id} ({proxy_service}) starting with {len(subreddits_list)} new subreddits")
                    
                    for sub_idx, subreddit_name in enumerate(subreddits_list):
                        try:
                            logger.info(f"🌟 [{sub_idx+1}/{len(subreddits_list)}] New r/{subreddit_name} via {proxy_service}")
                            self.analyze_subreddit_with_thread_api(subreddit_name, thread_proxy_config, thread_api)
                            
                            with processing_lock:
                                cycle_analyzed_subreddits.add(subreddit_name)
                                
                            logger.info(f"✅ New r/{subreddit_name} completed via {proxy_service}")
                            
                            # Small delay between new subreddits
                            if sub_idx < len(subreddits_list) - 1:
                                time.sleep(random.uniform(1, 3))
                                
                        except Exception as e:
                            logger.error(f"❌ Error analyzing new r/{subreddit_name} via {proxy_service}: {e}")
                            continue
                
                # Create and start 9 threads for new subreddits (3 per proxy)
                new_threads = []
                for thread_id in range(9):
                    if new_thread_subreddits[thread_id]:
                        proxy_group = thread_id // 3  # 0, 1, or 2
                        proxy_service = proxy_services[proxy_group]
                        thread_name = f"{proxy_service}-T{(thread_id % 3) + 1}"
                        
                        thread = threading.Thread(
                            target=process_new_subreddits_thread,
                            args=(thread_id, new_thread_subreddits[thread_id], thread_name),
                            name=f"NewSubredditThread-{thread_name}"
                        )
                        new_threads.append(thread)
                        thread.start()
                
                # Wait for all new subreddit threads to complete
                for thread in new_threads:
                    thread.join()
                
                logger.info(f"🎯 All new subreddit processing threads completed")
            else:
                logger.info(f"ℹ️ All {len(discovered_subreddits)} discovered subreddits already processed in this cycle")
        else:
            logger.info("ℹ️ No new subreddits discovered")
        
        # STEP 6: Calculate and save minimum requirements for all processed subreddits
        logger.info("📊 Calculating minimum requirements for processed subreddits...")
        self.calculate_and_save_subreddit_requirements(subreddit_requirements)
        
        # Final cycle statistics
        logger.info(f"📈 Cycle Summary:")
        logger.info(f"   🏷️  Total subreddits analyzed: {len(cycle_analyzed_subreddits)}")
        logger.info(f"   👥 Total users processed: {successful_users + failed_users}")
        logger.info(f"   💾 Persistent user memory: {len(self.processed_users_memory)} users")
        logger.info(f"   📊 Requirements calculated for: {len([k for k, v in subreddit_requirements.items() if v['user_count'] >= 3])} subreddits")
        
        logger.info("🎉 Discovery pipeline completed successfully!")

    async def analyze_and_save_subreddit(self, subreddit_name: str):
        """Analyze subreddit using hot(30) for metrics and top('year', 100) for timing; save posts and return authors."""
        # Get next client (with proxy)
        reddit_client, account_name, account_id = self.get_next_client()
        logger.info(f"🔍 Analyzing r/{subreddit_name} with {account_name}")

        # Fetch subreddit metadata
        subreddit = await reddit_client.subreddit(subreddit_name, fetch=True)

        # Basic fields from API
        name = getattr(subreddit, 'display_name', subreddit_name)
        display_name_prefixed = getattr(subreddit, 'display_name_prefixed', f"r/{name}")
        title = getattr(subreddit, 'title', None)
        public_description = getattr(subreddit, 'public_description', None)
        description = getattr(subreddit, 'description', None)
        subscribers = getattr(subreddit, 'subscribers', 0) or 0
        created_ts = getattr(subreddit, 'created_utc', None)
        created_dt = datetime.fromtimestamp(created_ts, tz=timezone.utc) if created_ts else None
        over18 = getattr(subreddit, 'over18', False)
        allow_images = getattr(subreddit, 'allow_images', True)
        allow_videos = getattr(subreddit, 'allow_videos', True)
        allow_polls = getattr(subreddit, 'allow_polls', True)
        subreddit_type = getattr(subreddit, 'subreddit_type', None)
        icon_img = getattr(subreddit, 'icon_img', None)
        community_icon = getattr(subreddit, 'community_icon', None)
        
        # Fetch subreddit rules for auto-review and storage
        rules_text = await self.get_subreddit_rules(subreddit)
        auto_review = self.analyze_rules_for_review(rules_text)
        
        # Prepare rules data for database storage (JSONB format)
        rules_data = None
        if rules_text and rules_text.strip():
            try:
                # Try to get structured rules from the subreddit object
                rules_list = []
                try:
                    rules = await subreddit.rules()
                    if rules:
                        async for rule in rules:
                            rule_data = {
                                'short_name': getattr(rule, 'short_name', '') or '',
                                'description': getattr(rule, 'description', '') or '',
                                'kind': getattr(rule, 'kind', '') or '',
                                'violation_reason': getattr(rule, 'violation_reason', '') or '',
                                'priority': getattr(rule, 'priority', 0) or 0
                            }
                            rules_list.append(rule_data)
                except Exception:
                    # If structured rules fail, store as text
                    pass
                
                if rules_list:
                    rules_data = {
                        'rules': rules_list,
                        'combined_text': rules_text,
                        'scraped_at': datetime.now(timezone.utc).isoformat()
                    }
                else:
                    # Fallback to text-only storage
                    rules_data = {
                        'combined_text': rules_text,
                        'scraped_at': datetime.now(timezone.utc).isoformat()
                    }
            except Exception as e:
                logger.debug(f"🔍 Could not structure rules data for r/{name}: {e}")
                # Store as simple text if structuring fails
                rules_data = {
                    'combined_text': rules_text,
                    'scraped_at': datetime.now(timezone.utc).isoformat()
                }
        
        # Detect if verification is required
        verification_required = self.detect_verification_required(
            description=description,
            public_description=public_description,
            rules_text=rules_text
        )

        # Hot(30) metrics and post saving
        total_score = 0
        total_comments = 0
        hot_count = 0
        collected_authors = set()
        posts_to_save = []

        # New metrics for improved accuracy
        engagement_velocities = []
        content_type_scores = {'image': [], 'video': [], 'text': [], 'link': []}
        weighted_scores = []
        weights = []

        async for submission in subreddit.hot(limit=30):
            hot_count += 1
            score = getattr(submission, 'score', 0) or 0
            num_comments = getattr(submission, 'num_comments', 0) or 0
            total_score += score
            total_comments += num_comments

            # Calculate engagement velocity (upvotes per hour)
            created_ts = getattr(submission, 'created_utc', None)
            if created_ts:
                created_dt = datetime.fromtimestamp(created_ts, tz=timezone.utc)
                age_hours = (datetime.now(timezone.utc) - created_dt).total_seconds() / 3600
                if age_hours > 0:
                    velocity = score / age_hours
                    engagement_velocities.append(velocity)

                    # Weight recent posts more heavily for accuracy
                    if age_hours <= 6:
                        weight = 1.0
                    elif age_hours <= 12:
                        weight = 0.8
                    elif age_hours <= 24:
                        weight = 0.6
                    else:
                        weight = 0.4
                    weighted_scores.append(score * weight)
                    weights.append(weight)

            # Track content type performance
            is_self = getattr(submission, 'is_self', False)
            is_video = getattr(submission, 'is_video', False)
            domain = getattr(submission, 'domain', None)
            url = getattr(submission, 'url', None)

            # Determine content type
            content_type = 'text'
            if is_video or domain in ['v.redd.it', 'youtube.com', 'youtu.be']:
                content_type = 'video'
            elif domain in ['i.redd.it', 'imgur.com'] or (url and any(url.endswith(ext) for ext in ['.jpg', '.png', '.gif', '.jpeg'])):
                content_type = 'image'
            elif not is_self and url:
                content_type = 'link'

            content_type_scores[content_type].append(score)

            # Collect author for discovery
            author = getattr(submission, 'author', None)
            if author and hasattr(author, 'name') and author.name not in ['[deleted]', '[removed]', None]:
                collected_authors.add(author.name)

            # Prepare post data for saving
            post_data = await self.extract_post_data(submission, name)
            posts_to_save.append(post_data)

        # Save all posts to database
        if posts_to_save:
            await self.save_posts_batch(posts_to_save)
            logger.info(f"💾 Saved {len(posts_to_save)} posts from r/{name}")

        self.stats['posts_analyzed'] += hot_count

        # Calculate standard averages
        avg_upvotes_per_post = round(total_score / max(1, hot_count), 2)
        avg_comments_per_post = round(total_comments / max(1, hot_count), 2)
        subscriber_engagement_ratio = round((total_score / max(1, subscribers)), 6)
        comment_to_upvote_ratio = round((total_comments / max(1, total_score if total_score else 1)), 6)

        # Calculate new metrics
        avg_engagement_velocity = round(sum(engagement_velocities) / len(engagement_velocities), 2) if engagement_velocities else 0

        # Calculate content type averages
        image_post_avg_score = round(sum(content_type_scores['image']) / len(content_type_scores['image']), 2) if content_type_scores['image'] else 0
        video_post_avg_score = round(sum(content_type_scores['video']) / len(content_type_scores['video']), 2) if content_type_scores['video'] else 0
        text_post_avg_score = round(sum(content_type_scores['text']) / len(content_type_scores['text']), 2) if content_type_scores['text'] else 0
        link_post_avg_score = round(sum(content_type_scores['link']) / len(content_type_scores['link']), 2) if content_type_scores['link'] else 0

        # Determine top content type
        top_content_type = None
        if content_type_scores:
            type_averages = {}
            for ctype, scores in content_type_scores.items():
                if scores:
                    type_averages[ctype] = sum(scores) / len(scores)
            if type_averages:
                top_content_type = max(type_averages, key=type_averages.get)

        # Calculate weighted average (more accurate)
        weighted_avg_upvotes = round(sum(weighted_scores) / sum(weights), 2) if weights else avg_upvotes_per_post

        # Top('year', 100) timing analysis and post saving
        hour_performance = defaultdict(list)
        day_performance = defaultdict(list)
        top_posts_to_save = []
        posts_analyzed_for_timing = 0

        async for submission in subreddit.top(time_filter='year', limit=100):
            ts = getattr(submission, 'created_utc', None)
            score = getattr(submission, 'score', 0) or 0
            if ts is None or score <= 0:  # Skip posts with no timestamp or no score
                continue
            dt = datetime.fromtimestamp(ts, tz=timezone.utc)
            hour_performance[dt.hour].append(score)
            day_performance[dt.weekday()].append(score)
            posts_analyzed_for_timing += 1
            
            # Also save top yearly posts to database
            try:
                post_data = await self.extract_post_data(submission, subreddit_name)
                if post_data:
                    top_posts_to_save.append(post_data)
            except Exception as e:
                logger.debug(f"🔍 Error extracting top post data: {e}")
                continue

        def best_key_by_avg(dct):
            best_key = None
            best_avg = -1
            for k, vals in dct.items():
                if not vals:
                    continue
                avg_val = sum(vals) / len(vals)
                if avg_val > best_avg:
                    best_avg = avg_val
                    best_key = k
            return best_key

        best_hour = best_key_by_avg(hour_performance)
        best_day_idx = best_key_by_avg(day_performance)
        day_names = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
        best_day = day_names[best_day_idx] if best_day_idx is not None else None

        # Log if we couldn't determine best posting times
        if best_hour is None or best_day is None:
            logger.debug(f"⚠️ Could not determine best posting times for r/{name}: analyzed {posts_analyzed_for_timing} posts with timing data")

        # Save top yearly posts to database
        if top_posts_to_save:
            await self.save_posts_batch(top_posts_to_save)
            logger.info(f"💾 Saved {len(top_posts_to_save)} top yearly posts from r/{name}")
        
        self.stats['posts_analyzed'] += len(top_posts_to_save)

        # PROPER FIX: Always fetch existing review and include it in upsert to preserve it
        existing_check = self.supabase.table('reddit_subreddits').select('review').eq('name', name).execute()
        existing_review = None
        
        if existing_check.data and len(existing_check.data) > 0:
            existing_review = existing_check.data[0].get('review')
            logger.info(f"🔍 r/{name} exists - fetched review: '{existing_review}' (will preserve in upsert)")
        else:
            logger.info(f"🆕 r/{name} is new - will apply auto-review")
        
        # Prepare database payload with ALL fields including preserved review
        payload = {
                'name': name,
                'display_name_prefixed': display_name_prefixed,
                'title': title,
                'public_description': public_description,
                'description': description,
                'subscribers': subscribers,
                'created_utc': created_dt.isoformat() if created_dt else None,
                'over18': over18,
                'allow_images': allow_images,
                'verification_required': verification_required,
                'allow_videos': allow_videos,
                'allow_polls': allow_polls,
                'subreddit_type': subreddit_type,
                'icon_img': icon_img,
                'community_icon': community_icon,
                'rules_data': rules_data,  # Add rules data to payload
                'total_upvotes_hot_30': total_score,
                'total_posts_hot_30': hot_count,
                'avg_upvotes_per_post': avg_upvotes_per_post,
                'avg_comments_per_post': avg_comments_per_post,
                'subscriber_engagement_ratio': subscriber_engagement_ratio,
                'comment_to_upvote_ratio': comment_to_upvote_ratio,
                'avg_engagement_velocity': avg_engagement_velocity,  # New metric
                'top_content_type': top_content_type,  # New metric
                'image_post_avg_score': image_post_avg_score,  # New metric
                'video_post_avg_score': video_post_avg_score,  # New metric
                'text_post_avg_score': text_post_avg_score,  # New metric
                'link_post_avg_score': link_post_avg_score,  # New metric
                'best_posting_hour': best_hour,
                'best_posting_day': best_day,
                'last_scraped_at': datetime.now(timezone.utc).isoformat(),
            }
            
        # ALWAYS include review in payload - either existing or new
        if existing_review is not None:
            # Preserve existing review exactly as it is
            payload['review'] = existing_review
            logger.info(f"🔒 Preserving existing review '{existing_review}' for r/{name}")
        else:
            # Apply review logic for new subreddits
            if name.startswith('u_'):
                payload['review'] = "User Feed"
                logger.info(f"🆕 New user feed r/{name} - setting review to 'User Feed'")
            elif auto_review:
                payload['review'] = auto_review
                logger.info(f"🤖 New subreddit r/{name} auto-reviewed as '{auto_review}'")
            else:
                payload['review'] = None  # Manual review needed
                logger.info(f"📋 New subreddit r/{name} - leaving review empty for manual review")

        # Upsert into Supabase
        try:
            resp = self.supabase.table('reddit_subreddits').upsert(payload, on_conflict='name').execute()
            if hasattr(resp, 'error') and resp.error:
                logger.error(f"❌ Supabase upsert error for r/{name}: {resp.error}")
            else:
                logger.info(f"💾 Upserted r/{name}: hot30={hot_count}, total_upvotes={total_score}, best_day={best_day}, best_hour={best_hour}")
        except Exception as e:
            logger.error(f"❌ Supabase upsert exception for r/{name}: {e}")
            
        # Return collected authors for discovery pipeline
        return collected_authors
    
    async def extract_post_data(self, submission, subreddit_name: str) -> dict:
        """Extract comprehensive post data from Reddit submission"""
        try:
            # Fetch subreddit tags
            subreddit_tags = []
            subreddit_primary_category = None
            try:
                sub_resp = self.supabase.table('reddit_subreddits').select('tags, primary_category').eq('name', subreddit_name).limit(1).execute()
                if sub_resp.data and len(sub_resp.data) > 0:
                    subreddit_tags = sub_resp.data[0].get('tags', [])
                    subreddit_primary_category = sub_resp.data[0].get('primary_category')
            except Exception as e:
                logger.debug(f"Could not fetch tags for r/{subreddit_name}: {e}")

            # Basic post data
            reddit_id = getattr(submission, 'id', None)
            title = getattr(submission, 'title', None)
            selftext = getattr(submission, 'selftext', None)
            url = getattr(submission, 'url', None)
            author = getattr(submission, 'author', None)
            author_name = author.name if author and hasattr(author, 'name') and author.name not in ['[deleted]', '[removed]'] else None
            
            # Engagement data
            score = getattr(submission, 'score', 0) or 0
            upvote_ratio = getattr(submission, 'upvote_ratio', None)
            num_comments = getattr(submission, 'num_comments', 0) or 0
            comment_to_upvote_ratio = num_comments / max(1, score) if score > 0 else 0
            
            # Timestamps and timing
            created_ts = getattr(submission, 'created_utc', None)
            created_dt = datetime.fromtimestamp(created_ts, tz=timezone.utc) if created_ts else None
            posting_day_of_week = created_dt.strftime('%A') if created_dt else None
            posting_hour = created_dt.hour if created_dt else None
            
            # Content analysis
            is_self = getattr(submission, 'is_self', False)
            is_video = getattr(submission, 'is_video', False)
            domain = getattr(submission, 'domain', None)
            thumbnail = getattr(submission, 'thumbnail', None)
            
            # Determine content type
            content_type = 'text'
            if is_video or domain in ['v.redd.it', 'youtube.com', 'youtu.be']:
                content_type = 'video'
            elif domain in ['i.redd.it', 'imgur.com'] or (url and any(url.endswith(ext) for ext in ['.jpg', '.png', '.gif', '.jpeg'])):
                content_type = 'image'
            elif not is_self and url:
                content_type = 'link'
                
            # Additional metadata
            over_18 = getattr(submission, 'over_18', False)
            spoiler = getattr(submission, 'spoiler', False)
            stickied = getattr(submission, 'stickied', False)
            locked = getattr(submission, 'locked', False)
            gilded = getattr(submission, 'gilded', 0)
            distinguished = getattr(submission, 'distinguished', None)
            
            return {
                'reddit_id': reddit_id,
                'title': title,
                'selftext': selftext,
                'url': url,
                'author_username': author_name,
                'subreddit_name': subreddit_name,
                'score': score,
                'upvote_ratio': upvote_ratio,
                'num_comments': num_comments,
                'comment_to_upvote_ratio': round(comment_to_upvote_ratio, 6),
                'created_utc': created_dt.isoformat() if created_dt else None,
                'is_self': is_self,
                'is_video': is_video,
                'over_18': over_18,
                'spoiler': spoiler,
                'stickied': stickied,
                'locked': locked,
                'gilded': gilded,
                'distinguished': distinguished,
                'content_type': content_type,
                'post_length': len(selftext) if selftext else 0,
                'has_thumbnail': bool(thumbnail and thumbnail not in ['self', 'default', 'nsfw']),
                'posting_day_of_week': posting_day_of_week,
                'posting_hour': posting_hour,
                'domain': domain,
                'thumbnail': thumbnail,
                'scraped_at': datetime.now(timezone.utc).isoformat(),
                'sub_tags': subreddit_tags,
                'sub_primary_category': subreddit_primary_category,
            }
        except Exception as e:
            logger.error(f"❌ Error extracting post data: {e}")
            return {}
    
    async def save_posts_batch(self, posts_data: list):
        """Save posts to database, ensuring users and subreddits exist first"""
        if not posts_data:
            return
            
        try:
            # Create placeholder users for any authors that don't exist
            unique_authors = {post['author_username'] for post in posts_data if post.get('author_username')}
            if unique_authors:
                await self.ensure_users_exist(unique_authors)
            
            # Create placeholder subreddits for any that don't exist
            unique_subreddits = {post['subreddit_name'] for post in posts_data if post.get('subreddit_name')}
            if unique_subreddits:
                await self.ensure_subreddits_exist(unique_subreddits)
            
            # Upsert posts
            resp = self.supabase.table('reddit_posts').upsert(posts_data, on_conflict='reddit_id').execute()
            if hasattr(resp, 'error') and resp.error:
                logger.error(f"❌ Error saving posts batch: {resp.error}")
            else:
                logger.info(f"💾 Successfully saved {len(posts_data)} posts")
                
        except Exception as e:
            logger.error(f"❌ Exception saving posts batch: {e}")
    
    def save_posts_batch_sync(self, posts_data: list):
        """Synchronous version of save_posts_batch for threading"""
        if not posts_data:
            return
            
        try:
            # Create placeholder users for any authors that don't exist
            unique_authors = {post['author_username'] for post in posts_data if post.get('author_username')}
            if unique_authors:
                self.ensure_users_exist_sync(unique_authors)
            
            # Create placeholder subreddits for any that don't exist
            unique_subreddits = {post['subreddit_name'] for post in posts_data if post.get('subreddit_name')}
            if unique_subreddits:
                self.ensure_subreddits_exist_sync(unique_subreddits)
            
            # Upsert posts
            resp = self.supabase.table('reddit_posts').upsert(posts_data, on_conflict='reddit_id').execute()
            if hasattr(resp, 'error') and resp.error:
                logger.error(f"❌ Error saving posts batch: {resp.error}")
            else:
                logger.info(f"💾 Successfully saved {len(posts_data)} posts")
                
        except Exception as e:
            logger.error(f"❌ Exception saving posts batch: {e}")
    
    async def ensure_users_exist(self, usernames: set):
        """Create placeholder users if they don't exist"""
        try:
            placeholder_users = []
            for username in usernames:
                if username:  # Skip None usernames
                    placeholder_users.append({
                        'username': username,
                        'created_at': datetime.now(timezone.utc).isoformat(),
                        'last_scraped_at': datetime.now(timezone.utc).isoformat(),
                    })
            
            if placeholder_users:
                resp = self.supabase.table('reddit_users').upsert(placeholder_users, on_conflict='username').execute()
                if hasattr(resp, 'error') and resp.error:
                    logger.error(f"❌ Error creating placeholder users: {resp.error}")
                    
        except Exception as e:
            logger.error(f"❌ Exception creating placeholder users: {e}")
    
    def ensure_users_exist_sync(self, usernames: set):
        """Synchronous version of ensure_users_exist for threading"""
        try:
            placeholder_users = []
            for username in usernames:
                if username:  # Skip None usernames
                    placeholder_users.append({
                        'username': username,
                        'created_at': datetime.now(timezone.utc).isoformat(),
                        'last_scraped_at': datetime.now(timezone.utc).isoformat(),
                    })
            
            if placeholder_users:
                resp = self.supabase.table('reddit_users').upsert(placeholder_users, on_conflict='username').execute()
                if hasattr(resp, 'error') and resp.error:
                    logger.error(f"❌ Error creating placeholder users: {resp.error}")
                    
        except Exception as e:
            logger.error(f"❌ Exception creating placeholder users: {e}")
    
    def ensure_subreddits_exist_sync(self, subreddit_names: set):
        """Synchronous version of ensure_subreddits_exist for threading - Updates existing but preserves Review field"""
        try:
            # Get existing subreddits with their data
            resp = self.supabase.table('reddit_subreddits').select('name, review').execute()
            existing_data = {item['name']: item for item in resp.data} if resp.data else {}
            existing_subreddits = set(existing_data.keys())
            
            # Separate new vs existing subreddits
            new_subreddits = subreddit_names - existing_subreddits
            existing_to_update = subreddit_names & existing_subreddits
            logger.info(f"🔍 ensure_subreddits_exist_sync: {len(existing_to_update)} existing (will update but preserve review), {len(new_subreddits)} new")
            
            # Create records for new subreddits (with review)
            new_records = []
            for name in new_subreddits:
                if name:  # Skip None names
                    review = "User Feed" if name.startswith('u_') else None
                    display_name = f'u/{name[2:]}' if name.startswith('u_') else f'r/{name}'
                    
                    new_records.append({
                        'name': name,
                        'display_name_prefixed': display_name,
                        'review': review,
                        'created_at': datetime.now(timezone.utc).isoformat(),
                        'last_scraped_at': datetime.now(timezone.utc).isoformat(),
                    })
            
            # Create records for existing subreddits (preserve review)
            update_records = []
            for name in existing_to_update:
                if name:
                    display_name = f'u/{name[2:]}' if name.startswith('u_') else f'r/{name}'
                    existing_review = existing_data[name].get('review')  # Preserve existing review
                    
                    update_records.append({
                        'name': name,
                        'display_name_prefixed': display_name,
                        'review': existing_review,  # Keep existing review
                        'last_scraped_at': datetime.now(timezone.utc).isoformat(),
                    })
            
            # Insert new records (handle race condition)
            if new_records:
                try:
                    resp = self.supabase.table('reddit_subreddits').insert(new_records).execute()
                    if hasattr(resp, 'error') and resp.error:
                        logger.error(f"❌ Error creating new subreddits: {resp.error}")
                    else:
                        logger.info(f"💾 Created {len(new_records)} new subreddits")
                except Exception as insert_error:
                    # Handle race condition: another thread created the subreddit between our check and insert
                    if 'duplicate key value violates unique constraint' in str(insert_error):
                        logger.info(f"🔄 Race condition detected - subreddit created by another thread, converting to update")
                        # Convert new records to update records with preserved categories
                        race_condition_updates = []
                        for record in new_records:
                            # Fetch the existing review to preserve it
                            try:
                                existing_resp = self.supabase.table('reddit_subreddits').select('review').eq('name', record['name']).execute()
                                existing_review = None
                                if existing_resp.data and len(existing_resp.data) > 0:
                                    existing_review = existing_resp.data[0].get('review')
                                
                                race_condition_updates.append({
                                    'name': record['name'],
                                    'display_name_prefixed': record['display_name_prefixed'],
                                    'review': existing_review,  # Preserve existing review
                                    'last_scraped_at': record['last_scraped_at'],
                                })
                            except Exception as fetch_error:
                                logger.error(f"❌ Error fetching review for race condition fix: {fetch_error}")
                        
                        # Update with preserved categories
                        if race_condition_updates:
                            update_resp = self.supabase.table('reddit_subreddits').upsert(race_condition_updates, on_conflict='name').execute()
                            if hasattr(update_resp, 'error') and update_resp.error:
                                logger.error(f"❌ Error updating subreddits after race condition: {update_resp.error}")
                            else:
                                logger.info(f"💾 Updated {len(race_condition_updates)} subreddits after race condition (preserved categories)")
                    else:
                        logger.error(f"❌ Unexpected error creating new subreddits: {insert_error}")
            
            # Update existing records (with preserved categories)
            if update_records:
                resp = self.supabase.table('reddit_subreddits').upsert(update_records, on_conflict='name').execute()
                if hasattr(resp, 'error') and resp.error:
                    logger.error(f"❌ Error updating existing subreddits: {resp.error}")
                else:
                    logger.info(f"💾 Updated {len(update_records)} existing subreddits (preserved categories)")
                    
        except Exception as e:
            logger.error(f"❌ Exception in ensure_subreddits_exist_sync: {e}")
    
    async def ensure_subreddits_exist(self, subreddit_names: set):
        """Create new subreddits and update existing ones while preserving Review field"""
        try:
            # Get existing subreddits with their data
            resp = self.supabase.table('reddit_subreddits').select('name, review').execute()
            existing_data = {item['name']: item for item in resp.data} if resp.data else {}
            existing_subreddits = set(existing_data.keys())
            
            # Separate new vs existing subreddits
            new_subreddits = subreddit_names - existing_subreddits
            existing_to_update = subreddit_names & existing_subreddits
            logger.info(f"🔍 ensure_subreddits_exist: {len(existing_to_update)} existing (will update but preserve review), {len(new_subreddits)} new")
            
            # Create records for new subreddits (with review)
            new_records = []
            for name in new_subreddits:
                if name:  # Skip None names
                    review = "User Feed" if name.startswith('u_') else None
                    display_name = f'u/{name[2:]}' if name.startswith('u_') else f'r/{name}'
                    
                    new_records.append({
                        'name': name,
                        'display_name_prefixed': display_name,
                        'review': review,
                        'created_at': datetime.now(timezone.utc).isoformat(),
                        'last_scraped_at': datetime.now(timezone.utc).isoformat(),
                    })
            
            # Create records for existing subreddits (preserve review)
            update_records = []
            for name in existing_to_update:
                if name:
                    display_name = f'u/{name[2:]}' if name.startswith('u_') else f'r/{name}'
                    existing_review = existing_data[name].get('review')  # Preserve existing review
                    
                    update_records.append({
                        'name': name,
                        'display_name_prefixed': display_name,
                        'review': existing_review,  # Keep existing review
                        'last_scraped_at': datetime.now(timezone.utc).isoformat(),
                    })
            
            # Insert new records (handle race condition)
            if new_records:
                try:
                    resp = self.supabase.table('reddit_subreddits').insert(new_records).execute()
                    if hasattr(resp, 'error') and resp.error:
                        logger.error(f"❌ Error creating new subreddits: {resp.error}")
                    else:
                        logger.info(f"💾 Created {len(new_records)} new subreddits")
                except Exception as insert_error:
                    # Handle race condition: another thread created the subreddit between our check and insert
                    if 'duplicate key value violates unique constraint' in str(insert_error):
                        logger.info(f"🔄 Race condition detected - subreddit created by another thread, converting to update")
                        # Convert new records to update records with preserved categories
                        race_condition_updates = []
                        for record in new_records:
                            # Fetch the existing review to preserve it
                            try:
                                existing_resp = self.supabase.table('reddit_subreddits').select('review').eq('name', record['name']).execute()
                                existing_review = None
                                if existing_resp.data and len(existing_resp.data) > 0:
                                    existing_review = existing_resp.data[0].get('review')
                                
                                race_condition_updates.append({
                                    'name': record['name'],
                                    'display_name_prefixed': record['display_name_prefixed'],
                                    'review': existing_review,  # Preserve existing review
                                    'last_scraped_at': record['last_scraped_at'],
                                })
                            except Exception as fetch_error:
                                logger.error(f"❌ Error fetching review for race condition fix: {fetch_error}")
                        
                        # Update with preserved categories
                        if race_condition_updates:
                            update_resp = self.supabase.table('reddit_subreddits').upsert(race_condition_updates, on_conflict='name').execute()
                            if hasattr(update_resp, 'error') and update_resp.error:
                                logger.error(f"❌ Error updating subreddits after race condition: {update_resp.error}")
                            else:
                                logger.info(f"💾 Updated {len(race_condition_updates)} subreddits after race condition (preserved categories)")
                    else:
                        logger.error(f"❌ Unexpected error creating new subreddits: {insert_error}")
            
            # Update existing records (with preserved categories)
            if update_records:
                resp = self.supabase.table('reddit_subreddits').upsert(update_records, on_conflict='name').execute()
                if hasattr(resp, 'error') and resp.error:
                    logger.error(f"❌ Error updating existing subreddits: {resp.error}")
                else:
                    logger.info(f"💾 Updated {len(update_records)} existing subreddits (preserved categories)")
                    
        except Exception as e:
            logger.error(f"❌ Exception in ensure_subreddits_exist: {e}")
    
    async def analyze_user_and_discover_subreddits(self, username: str, cycle_analyzed_subreddits: set) -> set:
        """Analyze user's last 30 posts, save them, and discover subreddits with immediate analysis"""
        reddit_client, account_name, account_id = self.get_next_client()
        discovered_subreddits = set()
        
        try:
            # Get user profile with retry logic
            try:
                user = await reddit_client.redditor(username, fetch=True)
            except Exception as api_error:
                if "error with request" in str(api_error).lower() or "429" in str(api_error):
                    logger.warning(f"⏸️ Rate limited accessing u/{username}, adding delay...")
                    await asyncio.sleep(5)  # 5 second delay for rate limiting
                    return set()  # Return empty set and skip this user
                else:
                    raise api_error  # Re-raise if it's not a rate limit issue
            
            # Extract user data
            user_data = await self.extract_user_data(user)
            
            # Save user data
            await self.save_user_data(user_data)
            
            # Get user's last 30 posts
            user_posts = []
            post_count = 0
            async for submission in user.submissions.new(limit=30):
                post_count += 1
                subreddit_name = getattr(submission, 'subreddit', None)
                if subreddit_name and hasattr(subreddit_name, 'display_name'):
                    subreddit_display_name = subreddit_name.display_name
                    discovered_subreddits.add(subreddit_display_name)
                    
                    # Immediately analyze new subreddit if not already processed in this cycle
                    if (subreddit_display_name not in cycle_analyzed_subreddits and 
                        not subreddit_display_name.startswith('u_') and  # Skip user feeds
                        await self.should_analyze_subreddit(subreddit_display_name)):
                        
                        try:
                            logger.info(f"⚡ Immediately analyzing discovered r/{subreddit_display_name}")
                            await self.analyze_and_save_subreddit(subreddit_display_name)
                            cycle_analyzed_subreddits.add(subreddit_display_name)
                            self.stats['subreddits_analyzed'] += 1
                            logger.info(f"✨ Completed immediate analysis of r/{subreddit_display_name}")
                        except Exception as e:
                            if "error with request" in str(e).lower() or "429" in str(e):
                                logger.warning(f"⏸️ Rate limited analyzing r/{subreddit_display_name}, will retry later")
                                await asyncio.sleep(3)  # 3 second delay
                            else:
                                logger.error(f"❌ Error in immediate analysis of r/{subreddit_display_name}: {e}")
                    
                # Save user's post
                post_data = await self.extract_post_data(submission, subreddit_display_name if subreddit_name else None)
                if post_data:
                    user_posts.append(post_data)
            
            # Save user posts batch
            if user_posts:
                await self.save_posts_batch(user_posts)
                logger.info(f"💾 Saved {len(user_posts)} posts from u/{username}")
                
            self.stats['posts_analyzed'] += post_count
                
        except Exception as e:
            logger.error(f"❌ Error analyzing user u/{username}: {e}")
            
        return discovered_subreddits
    
    async def should_analyze_subreddit(self, subreddit_name: str) -> bool:
        """Check if subreddit should be analyzed (not already in database with complete data)"""
        try:
            resp = self.supabase.table('reddit_subreddits').select('name, title, subscribers').eq('name', subreddit_name).execute()
            
            if not resp.data:
                # New subreddit - should analyze
                return True
            
            existing = resp.data[0]
            # Should analyze if missing key data
            return (existing.get('title') is None or 
                   existing.get('subscribers') is None or 
                   existing.get('subscribers') == 0)
                   
        except Exception as e:
            logger.error(f"❌ Error checking subreddit r/{subreddit_name}: {e}")
            return False  # Skip on error
    
    async def get_subreddit_rules(self, subreddit) -> str:
        """Fetch subreddit rules text for analysis"""
        try:
            # Try to get rules from the subreddit object
            rules_text = ""
            
            # Get rules from description fields
            description = getattr(subreddit, 'description', '') or ''
            public_description = getattr(subreddit, 'public_description', '') or ''
            
            # Try to get actual rules if available
            try:
                rules = await subreddit.rules()
                if rules:
                    rules_list = []
                    async for rule in rules:
                        rule_text = getattr(rule, 'description', '') or ''
                        rule_short = getattr(rule, 'short_name', '') or ''
                        if rule_text or rule_short:
                            rules_list.append(f"{rule_short}: {rule_text}")
                    rules_text = " ".join(rules_list)
            except Exception:
                # If rules() method fails, fall back to descriptions
                pass
            
            # Combine all text sources
            combined_text = f"{description} {public_description} {rules_text}"
            return combined_text.strip()
            
        except Exception as e:
            logger.debug(f"🔍 Could not fetch rules for r/{getattr(subreddit, 'display_name', 'unknown')}: {e}")
            return ""
    
    def detect_verification_required(self, description: str = None, public_description: str = None, rules_text: str = None) -> bool:
        """Detect if subreddit requires verification based on description, rules, etc."""
        verification_keywords = [
            'verification required', 'verification', 'verify', 'verified',
            'verification process', 'verify account', 'verification needed',
            'must verify', 'need verification', 'require verification',
            'verification mandatory', 'verification before posting',
            'verified only', 'verification check', 'verify yourself',
            'verification submission', 'get verified'
        ]
        
        # Collect all text to search
        text_sources = [description or '', public_description or '', rules_text or '']
        combined_text = ' '.join(text_sources).lower()
        
        # Search for verification keywords (case insensitive)
        for keyword in verification_keywords:
            if keyword.lower() in combined_text:
                logger.info(f"🔒 Verification required detected: '{keyword}'")
                return True
        
        return False
    
    def analyze_rules_for_review(self, rules_text: str) -> str:
        """Analyze rules text for automatic review classification using multi-tier detection"""
        if not rules_text:
            return None
            
        # Convert to lowercase for case-insensitive matching
        rules_lower = rules_text.lower()
        
        # Import re for regex patterns
        import re
        
        # "Non Related" review keywords - EXPANDED to include niche fetishes and hentai
        non_related_keywords = [
            # Hentai/Anime porn
            'hentai', 'anime porn', 'rule34', 'cartoon porn', 'animated porn', 'ecchi', 'doujin',
            'drawn porn', 'manga porn', 'anime girls', 'waifu', '2d girls', 'anime babes',
            
            # Specific/extreme fetishes (not mainstream OnlyFans content)
            'bbw', 'ssbbw', 'feederism', 'weight gain', 'fat fetish', 'feeding',
            'scat', 'watersports', 'golden shower', 'piss', 'toilet',
            'abdl', 'diaper', 'adult baby', 'little space', 'age play', 'ddlg',
            'vore', 'inflation', 'transformation', 'macro', 'giantess',
            'furry', 'yiff', 'anthro', 'fursuit', 'anthropomorphic',
            'guro', 'necro', 'gore', 'death', 'snuff',
            'femdom', 'findom', 'financial domination', 'paypig', 'sissy',
            'pregnant', 'breeding', 'impregnation', 'preggo',
            'incest', 'fauxcest', 'step fantasy', 'family', 'taboo family',
            'cuckold', 'cuck', 'hotwife', 'bull',
            'chastity', 'denial', 'locked', 'keyholder',
            'ballbusting', 'cbt', 'cock torture', 'pain',
            'latex', 'rubber', 'bondage gear', 'bdsm equipment',
            
            # Safe-for-work content
            'nudity is required', 'nudity required', 'must be nude', 'nudity mandatory',
            'nude only', 'nudity is mandatory', 'requires nudity', 'nudity must be shown',
            'no clothes allowed', 'must show nudity', 'nude content only', 'nudity needed',
            'full nudity required', 'complete nudity', 'nudity is a requirement',
            
            # Professional terms
            'career advice', 'job hunting', 'resume help', 'interview tips',
            'academic discussion', 'university students', 'college advice', 'study tips',
            
            # Cooking terms
            'cooking recipes', 'baking recipes', 'meal prep recipes', 'cooking instructions',
            
            # Gaming terms
            'pc master race', 'console gaming discussion', 'indie game development',
            
            # Politics and government
            'government policy', 'election discussion', 'political debate', 'municipal planning',
            'city council', 'local government', 'political news',
            
            # Animal/pet care
            'veterinary advice', 'pet care tips', 'animal rescue', 'wildlife conservation',
            
            # Academic/research
            'scientific research', 'academic papers', 'research methodology', 'peer review'
        ]
        
        for keyword in non_related_keywords:
            if keyword in rules_lower:
                logger.info(f"🚫 Non Related detected: '{keyword}'")
                return "Non Related"
        
        # If no automatic review detected, leave empty for manual review
        logger.debug("📋 No automatic review detected - leaving empty for manual review")
        return None
    
    async def extract_user_data(self, user) -> dict:
        """Extract comprehensive user data"""
        try:
            username = getattr(user, 'name', None)
            reddit_id = getattr(user, 'id', None)
            created_ts = getattr(user, 'created_utc', None)
            created_dt = datetime.fromtimestamp(created_ts, tz=timezone.utc) if created_ts else None
            
            # Calculate account age
            account_age_days = 0
            if created_dt:
                account_age_days = (datetime.now(timezone.utc) - created_dt).days
            
            # Karma data
            comment_karma = getattr(user, 'comment_karma', 0) or 0
            link_karma = getattr(user, 'link_karma', 0) or 0
            total_karma = comment_karma + link_karma
            awardee_karma = getattr(user, 'awardee_karma', 0) or 0
            awarder_karma = getattr(user, 'awarder_karma', 0) or 0
            
            # Account flags
            is_employee = getattr(user, 'is_employee', False)
            is_mod = getattr(user, 'is_mod', False)
            is_gold = getattr(user, 'is_gold', False)
            verified = getattr(user, 'verified', False)
            has_verified_email = getattr(user, 'has_verified_email', False)
            is_suspended = getattr(user, 'is_suspended', False)
            
            # Calculate quality scores using the formula from Plan.md
            quality_scores = self.calculate_user_quality_scores(username, account_age_days, link_karma, comment_karma)
            
            return {
                'username': username,
                'reddit_id': reddit_id,
                'created_utc': created_dt.isoformat() if created_dt else None,
                'account_age_days': account_age_days,
                'comment_karma': comment_karma,
                'link_karma': link_karma,
                'total_karma': total_karma,
                'awardee_karma': awardee_karma,
                'awarder_karma': awarder_karma,
                'is_employee': is_employee,
                'is_mod': is_mod,
                'is_gold': is_gold,
                'verified': verified,
                'has_verified_email': has_verified_email,
                'is_suspended': is_suspended,
                'username_quality_score': quality_scores['username_score'],
                'age_quality_score': quality_scores['age_score'],
                'karma_quality_score': quality_scores['karma_score'],
                'overall_user_score': quality_scores['overall_score'],
                'last_scraped_at': datetime.now(timezone.utc).isoformat(),
            }
            
        except Exception as e:
            logger.error(f"❌ Error extracting user data: {e}")
            return {}
    
    def calculate_user_quality_scores(self, username: str, account_age_days: int, post_karma: int, comment_karma: int) -> dict:
        """Calculate user quality scores using Plan.md formula"""
        # Username quality (0-10): Shorter, natural usernames preferred
        username_score = max(0, 10 - len(username) * 0.3) if not any(char.isdigit() for char in username[-4:]) else 5
        
        # Age quality (0-10): Sweet spot 1-3 years
        if account_age_days < 1095:  # Less than 3 years
            age_score = min(10, account_age_days / 365 * 3)
        else:
            age_score = max(5, 10 - (account_age_days - 1095) / 365 * 0.5)
        
        # Karma quality (0-10): Balanced comment/post ratio preferred
        total_karma = post_karma + comment_karma
        karma_ratio = comment_karma / max(1, total_karma)
        karma_score = min(10, total_karma / 1000) * (1 + karma_ratio * 0.5)
        
        # Final weighted score (0-10)
        overall_score = (username_score * 0.2 + age_score * 0.3 + karma_score * 0.5)
        
        return {
            'username_score': round(username_score, 2),
            'age_score': round(age_score, 2),
            'karma_score': round(karma_score, 2),
            'overall_score': round(overall_score, 2)
        }
    
    async def save_user_data(self, user_data: dict):
        """Save user data to database with last_scraped_at timestamp"""
        if not user_data or not user_data.get('username'):
            return

        # Add last_scraped_at timestamp
        user_data['last_scraped_at'] = datetime.now(timezone.utc).isoformat()

        try:
            resp = self.supabase.table('reddit_users').upsert(user_data, on_conflict='username').execute()
            if hasattr(resp, 'error') and resp.error:
                logger.error(f"❌ Error saving user data: {resp.error}")
            else:
                logger.info(f"💾 Saved user data for u/{user_data['username']} with timestamp")

        except Exception as e:
            logger.error(f"❌ Exception saving user data: {e}")
    
    async def dedupe_discovered_subreddits(self, discovered_subreddits: set, cycle_analyzed_subreddits: set = None) -> list:
        """Find subreddits that need analysis (new or incomplete), filter out user feeds"""
        if not discovered_subreddits:
            return []
            
        try:
            # Get existing subreddits with their analysis status
            resp = self.supabase.table('reddit_subreddits').select('name, title, subscribers, review').execute()
            existing_data = {item['name']: item for item in resp.data} if resp.data else {}
            
            # Separate discovered subreddits into categories
            new_subreddits = []
            incomplete_subreddits = []
            user_feeds = []
            
            for name in discovered_subreddits:
                # Skip if already analyzed in this cycle
                if cycle_analyzed_subreddits and name in cycle_analyzed_subreddits:
                    continue
                    
                if name.startswith('u_'):
                    # Handle user feeds
                    if name not in existing_data:
                        user_feeds.append(name)
                elif name not in existing_data:
                    # Completely new regular subreddit
                    new_subreddits.append(name)
                else:
                    # Existing subreddit - check if it needs full analysis
                    existing = existing_data[name]
                    if (existing.get('title') is None or 
                        existing.get('subscribers') is None or 
                        existing.get('subscribers') == 0):
                        incomplete_subreddits.append(name)
            
            # Add new subreddits to database
            all_new_records = []
            
            for name in new_subreddits:
                all_new_records.append({
                    'name': name,
                    'display_name_prefixed': f'r/{name}',
                    'review': None,  # NULL for manual review
                    'created_at': datetime.now(timezone.utc).isoformat(),
                    'last_scraped_at': datetime.now(timezone.utc).isoformat(),
                })
            
            for name in user_feeds:
                all_new_records.append({
                    'name': name,
                    'display_name_prefixed': f'u/{name[2:]}',
                    'review': 'User Feed',  # Auto-categorize as User Feed
                    'created_at': datetime.now(timezone.utc).isoformat(),
                    'last_scraped_at': datetime.now(timezone.utc).isoformat(),
                })
            
            if all_new_records:
                resp = self.supabase.table('reddit_subreddits').insert(all_new_records).execute()
                if hasattr(resp, 'error') and resp.error:
                    logger.error(f"❌ Error saving new subreddits: {resp.error}")
                else:
                    logger.info(f"🆕 Added {len(new_subreddits)} new subreddits for manual review")
                    if user_feeds:
                        logger.info(f"👤 Auto-categorized {len(user_feeds)} user feeds")
            
            # Return both new AND incomplete subreddits for analysis
            subreddits_to_analyze = new_subreddits + incomplete_subreddits
            logger.info(f"📊 Analysis targets: {len(new_subreddits)} new + {len(incomplete_subreddits)} incomplete = {len(subreddits_to_analyze)} total")
            
            return subreddits_to_analyze
            
        except Exception as e:
            logger.error(f"❌ Error processing discovered subreddits: {e}")
            return []
    
    def print_proxy_stats(self):
        """Print proxy-specific statistics"""
        runtime = datetime.now() - self.stats['start_time']
        
        print(f"\n📊 PROXY-ENABLED SCRAPER STATS:")
        print("="*60)
        print(f"⏱️  Runtime: {runtime}")
        print(f"🔍 Subreddits analyzed: {self.stats['subreddits_analyzed']}")
        print(f"📝 Posts analyzed: {self.stats['posts_analyzed']}")
        print(f"🌐 Total requests: {self.stats['total_requests']}")
        print(f"🔒 Proxy requests: {self.stats['proxy_requests']}")
        print(f"🔓 Direct requests: {self.stats['direct_requests']}")
        
        print(f"\n📊 Account usage (with proxy info):")
        for client_info in self.reddit_clients:
            username = client_info['username']
            proxy_host = client_info['proxy_host']
            count = self.stats['accounts_used'][username]
            proxy_status = "🔒 PROXY" if client_info['proxy_config'] else "🔓 DIRECT"
            print(f"   {username}: {count} requests via {proxy_host} {proxy_status}")
    
    async def analyze_subreddit_public_api(self, subreddit_name: str):
        """Analyze subreddit using Public JSON API with auto proxy rotation"""
        proxy_config = self.get_next_proxy()
        return await self.analyze_subreddit_public_api_with_proxy(subreddit_name, proxy_config)
    
    def analyze_subreddit_public_api_sync(self, subreddit_name: str, proxy_config: dict):
        """Synchronous subreddit analysis for threading"""
        return self.analyze_subreddit_public_api_with_proxy_sync(subreddit_name, proxy_config)
    
    def analyze_subreddit_with_thread_api(self, subreddit_name: str, proxy_config: dict, thread_api):
        """Analyze subreddit using thread-specific API instance (eliminates shared resource contention)"""
        # Temporarily replace the shared API with the thread-specific one
        original_api = self.public_api
        self.public_api = thread_api

        try:
            # Use the existing method with the thread-specific API
            result = self.analyze_subreddit_public_api_with_proxy_sync(subreddit_name, proxy_config)
            return result
        finally:
            # Always restore the original API
            self.public_api = original_api

    def update_no_seller_subreddit(self, subreddit_name: str, proxy_config: dict, thread_api):
        """Update only subreddit data and posts for No Seller subreddits (no user extraction)"""
        # Temporarily replace the shared API with the thread-specific one
        original_api = self.public_api
        self.public_api = thread_api

        try:
            logger.info(f"📊 Updating No Seller subreddit r/{subreddit_name} (data only)")

            # Fetch subreddit info using the public API
            subreddit_data = self.public_api.get_subreddit_info(subreddit_name, proxy_config)

            if not subreddit_data:
                logger.warning(f"⚠️ Failed to fetch about data for r/{subreddit_name}")
                return

            # Update subreddit data directly
            if subreddit_data:
                # Prepare subreddit data for database
                subreddit_update = {
                    'name': subreddit_name,
                    'display_name_prefixed': subreddit_data.get('display_name_prefixed', f'r/{subreddit_name}'),
                    'title': subreddit_data.get('title', ''),
                    'public_description': subreddit_data.get('public_description', ''),
                    'description': subreddit_data.get('description', ''),
                    'subscribers': subreddit_data.get('subscribers', 0),
                    'accounts_active': subreddit_data.get('accounts_active'),
                    'over18': subreddit_data.get('over18', False),
                    'lang': subreddit_data.get('lang', 'en'),
                    'whitelist_status': subreddit_data.get('whitelist_status'),
                    'created_utc': datetime.fromtimestamp(subreddit_data.get('created_utc', 0), tz=timezone.utc).isoformat() if subreddit_data.get('created_utc') else None,
                    'last_scraped_at': datetime.now(timezone.utc).isoformat()
                }

                # Save subreddit data
                resp = self.supabase.table('reddit_subreddits').upsert(subreddit_update, on_conflict='name').execute()
                if hasattr(resp, 'error') and resp.error:
                    logger.error(f"❌ Error saving subreddit data: {resp.error}")
                else:
                    logger.info(f"✅ Updated subreddit data for r/{subreddit_name}")

            # Fetch and save posts (but don't extract users)
            posts_data = self.public_api.get_subreddit_hot_posts(subreddit_name, limit=30, proxy_config=proxy_config)

            if posts_data:
                # Prepare posts for batch save
                posts_to_save = []
                for post in posts_data:
                    if post:
                        post_record = {
                            'reddit_id': post.get('id'),
                            'subreddit_name': subreddit_name,
                            'author_username': post.get('author', '[deleted]'),
                            'title': post.get('title', ''),
                            'selftext': post.get('selftext', ''),
                            'score': post.get('score', 0),
                            'upvote_ratio': post.get('upvote_ratio', 0),
                            'num_comments': post.get('num_comments', 0),
                            'created_utc': datetime.fromtimestamp(post.get('created_utc', 0), tz=timezone.utc).isoformat() if post.get('created_utc') else None,
                            'is_video': post.get('is_video', False),
                            'over_18': post.get('over_18', False),
                            'spoiler': post.get('spoiler', False),
                            'stickied': post.get('stickied', False),
                            'url': post.get('url', ''),
                            'permalink': post.get('permalink', '')
                        }
                        posts_to_save.append(post_record)

                if posts_to_save:
                    # Save posts using the sync method or direct upsert
                    self.save_posts_batch_sync(posts_to_save)
                    logger.info(f"✅ Updated {len(posts_to_save)} posts for No Seller subreddit r/{subreddit_name}")
            else:
                logger.warning(f"⚠️ No posts found for r/{subreddit_name}")

        except Exception as e:
            logger.error(f"❌ Error updating No Seller subreddit r/{subreddit_name}: {e}")
        finally:
            # Always restore the original API
            self.public_api = original_api

    def analyze_subreddit_public_api_with_proxy_sync(self, subreddit_name: str, proxy_config: dict):
        """Analyze subreddit using Public JSON API with specific proxy config (synchronous)"""
        try:
            proxy_service = proxy_config.get('display_name', 'direct') if proxy_config else 'direct'
            logger.info(f"🔍 Analyzing r/{subreddit_name} using public API (proxy: {proxy_service})")
            
            # Get subreddit info, hot posts, top posts, and rules (synchronous calls)
            subreddit_info = self.public_api.get_subreddit_info(subreddit_name, proxy_config)
            hot_posts = self.public_api.get_subreddit_hot_posts(subreddit_name, 30, proxy_config)
            top_posts = self.public_api.get_subreddit_top_posts(subreddit_name, 'year', 100, proxy_config)
            rules = self.public_api.get_subreddit_rules(subreddit_name, proxy_config)
            
            # Handle errors gracefully
            if subreddit_info and 'error' in subreddit_info:
                if subreddit_info['error'] == 'forbidden':
                    logger.warning(f"🚫 r/{subreddit_name} is private/banned - skipping")
                    return set()
                elif subreddit_info['error'] == 'not_found':
                    logger.warning(f"❓ r/{subreddit_name} not found - skipping")
                    return set()
            
            if not subreddit_info or 'error' in subreddit_info:
                logger.error(f"❌ Failed to get info for r/{subreddit_name}")
                return set()
            
            # Extract subreddit metadata
            name = subreddit_info.get('display_name', subreddit_name)
            display_name_prefixed = subreddit_info.get('display_name_prefixed', f"r/{name}")
            title = subreddit_info.get('title')
            public_description = subreddit_info.get('public_description')
            description = subreddit_info.get('description')
            subscribers = subreddit_info.get('subscribers', 0) or 0
            created_ts = subreddit_info.get('created_utc')
            created_dt = datetime.fromtimestamp(created_ts, tz=timezone.utc) if created_ts else None
            over18 = subreddit_info.get('over18', False)
            allow_images = subreddit_info.get('allow_images', True)
            allow_videos = subreddit_info.get('allow_videos', True)
            allow_polls = subreddit_info.get('allow_polls', True)
            subreddit_type = subreddit_info.get('subreddit_type')
            icon_img = subreddit_info.get('icon_img')
            community_icon = subreddit_info.get('community_icon')
            
            # Process rules for auto-review
            rules_text = ""
            if rules:
                rules_list = []
                for rule in rules:
                    rule_text = rule.get('description', '') or ''
                    rule_short = rule.get('short_name', '') or ''
                    if rule_text or rule_short:
                        rules_list.append(f"{rule_short}: {rule_text}")
                rules_text = " ".join(rules_list)
            
            # Combine description and rules for analysis
            combined_rules = f"{description or ''} {public_description or ''} {rules_text}".strip()
            auto_review = self.analyze_rules_for_review(combined_rules)
            
            # Prepare rules data for database storage (JSONB format)
            rules_data = None
            if rules and len(rules) > 0:
                try:
                    # Store structured rules from public API
                    rules_data = {
                        'rules': rules,  # Already in dict format from public API
                        'combined_text': rules_text,
                        'scraped_at': datetime.now(timezone.utc).isoformat()
                    }
                except Exception as e:
                    logger.debug(f"🔍 Could not structure rules data for r/{subreddit_name}: {e}")
            elif rules_text and rules_text.strip():
                # Fallback to text-only storage if no structured rules
                rules_data = {
                    'combined_text': rules_text,
                    'scraped_at': datetime.now(timezone.utc).isoformat()
                }
            
            # Detect if verification is required
            verification_required = self.detect_verification_required(
                description=description,
                public_description=public_description,
                rules_text=rules_text
            )
            
            # Analyze hot posts for engagement metrics
            total_score = 0
            total_comments = 0
            hot_count = 0
            collected_authors = set()
            posts_to_save = []

            # New metrics for improved accuracy
            engagement_velocities = []
            content_type_scores = {'image': [], 'video': [], 'text': [], 'link': []}
            weighted_scores = []
            weights = []

            for post in hot_posts:
                hot_count += 1
                score = post.get('score', 0) or 0
                num_comments = post.get('num_comments', 0) or 0
                total_score += score
                total_comments += num_comments

                # Calculate engagement velocity (upvotes per hour)
                created_ts = post.get('created_utc')
                if created_ts:
                    created_dt = datetime.fromtimestamp(created_ts, tz=timezone.utc)
                    age_hours = (datetime.now(timezone.utc) - created_dt).total_seconds() / 3600
                    if age_hours > 0:
                        velocity = score / age_hours
                        engagement_velocities.append(velocity)

                        # Weight recent posts more heavily for accuracy
                        if age_hours <= 6:
                            weight = 1.0
                        elif age_hours <= 12:
                            weight = 0.8
                        elif age_hours <= 24:
                            weight = 0.6
                        else:
                            weight = 0.4
                        weighted_scores.append(score * weight)
                        weights.append(weight)

                # Track content type performance
                is_self = post.get('is_self', False)
                is_video = post.get('is_video', False)
                domain = post.get('domain')
                url = post.get('url')

                # Determine content type
                content_type = 'text'
                if is_video or domain in ['v.redd.it', 'youtube.com', 'youtu.be']:
                    content_type = 'video'
                elif domain in ['i.redd.it', 'imgur.com'] or (url and any(url.endswith(ext) for ext in ['.jpg', '.png', '.gif', '.jpeg'])):
                    content_type = 'image'
                elif not is_self and url:
                    content_type = 'link'

                content_type_scores[content_type].append(score)

                # Collect author for discovery
                author = post.get('author')
                if author and author not in ['[deleted]', '[removed]', None]:
                    collected_authors.add(author)

                # Convert post data for database
                post_data = self.convert_public_post_data(post, name)
                if post_data:
                    posts_to_save.append(post_data)

            # Save posts to database (synchronous version for threading)
            if posts_to_save:
                self.save_posts_batch_sync(posts_to_save)
                logger.info(f"💾 Saved {len(posts_to_save)} posts from r/{name}")

            self.stats['posts_analyzed'] += hot_count

            # Calculate standard averages
            avg_upvotes_per_post = round(total_score / max(1, hot_count), 2)
            avg_comments_per_post = round(total_comments / max(1, hot_count), 2)
            subscriber_engagement_ratio = round((total_score / max(1, subscribers)), 6)
            comment_to_upvote_ratio = round((total_comments / max(1, total_score if total_score else 1)), 6)

            # Calculate new metrics
            avg_engagement_velocity = round(sum(engagement_velocities) / len(engagement_velocities), 2) if engagement_velocities else 0

            # Calculate content type averages
            image_post_avg_score = round(sum(content_type_scores['image']) / len(content_type_scores['image']), 2) if content_type_scores['image'] else 0
            video_post_avg_score = round(sum(content_type_scores['video']) / len(content_type_scores['video']), 2) if content_type_scores['video'] else 0
            text_post_avg_score = round(sum(content_type_scores['text']) / len(content_type_scores['text']), 2) if content_type_scores['text'] else 0
            link_post_avg_score = round(sum(content_type_scores['link']) / len(content_type_scores['link']), 2) if content_type_scores['link'] else 0

            # Determine top content type
            top_content_type = None
            if content_type_scores:
                type_averages = {}
                for ctype, scores in content_type_scores.items():
                    if scores:
                        type_averages[ctype] = sum(scores) / len(scores)
                if type_averages:
                    top_content_type = max(type_averages, key=type_averages.get)

            # Calculate weighted average (more accurate)
            weighted_avg_upvotes = round(sum(weighted_scores) / sum(weights), 2) if weights else avg_upvotes_per_post
            
            # Analyze top posts for timing and save them
            hour_performance = defaultdict(list)
            day_performance = defaultdict(list)
            top_posts_to_save = []
            
            for post in top_posts:
                ts = post.get('created_utc')
                score = post.get('score', 0) or 0
                if ts is None:
                    continue
                dt = datetime.fromtimestamp(ts, tz=timezone.utc)
                hour_performance[dt.hour].append(score)
                day_performance[dt.weekday()].append(score)
                
                # Also save top posts to database
                try:
                    post_data = self.convert_public_post_data(post, name)
                    if post_data:
                        top_posts_to_save.append(post_data)
                except Exception as e:
                    logger.debug(f"🔍 Error converting top post data: {e}")
                    continue
            
            def best_key_by_avg(dct):
                best_key = None
                best_avg = -1
                for k, vals in dct.items():
                    if not vals:
                        continue
                    avg_val = sum(vals) / len(vals)
                    if avg_val > best_avg:
                        best_avg = avg_val
                        best_key = k
                return best_key
            
            best_hour = best_key_by_avg(hour_performance)
            best_day_idx = best_key_by_avg(day_performance)
            day_names = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
            best_day = day_names[best_day_idx] if best_day_idx is not None else None
            
            # Save top yearly posts to database (synchronous version for threading)
            if top_posts_to_save:
                self.save_posts_batch_sync(top_posts_to_save)
                logger.info(f"💾 Saved {len(top_posts_to_save)} top yearly posts from r/{name}")
            
            self.stats['posts_analyzed'] += len(top_posts_to_save)
            
            # PROPER FIX: Always fetch existing review and include it in upsert to preserve it
            existing_check = self.supabase.table('reddit_subreddits').select('review').eq('name', name).execute()
            existing_review = None
            
            if existing_check.data and len(existing_check.data) > 0:
                existing_review = existing_check.data[0].get('review')
                logger.info(f"🔍 r/{name} exists - fetched review: '{existing_review}' (will preserve in upsert)")
            else:
                logger.info(f"🆕 r/{name} is new - will apply auto-review")
        
            # Prepare database payload with ALL fields including preserved review
            payload = {
                    'name': name,
                    'display_name_prefixed': display_name_prefixed,
                    'title': title,
                    'public_description': public_description,
                    'description': description,
                    'subscribers': subscribers,
                    'created_utc': created_dt.isoformat() if created_dt else None,
                    'over18': over18,
                    'allow_images': allow_images,
                    'verification_required': verification_required,
                    'allow_videos': allow_videos,
                    'allow_polls': allow_polls,
                    'subreddit_type': subreddit_type,
                    'icon_img': icon_img,
                    'community_icon': community_icon,
                    'rules_data': rules_data,  # Add rules data to payload
                    'total_upvotes_hot_30': total_score,
                    'total_posts_hot_30': hot_count,
                    'avg_upvotes_per_post': avg_upvotes_per_post,
                    'avg_comments_per_post': avg_comments_per_post,
                    'subscriber_engagement_ratio': subscriber_engagement_ratio,
                    'comment_to_upvote_ratio': comment_to_upvote_ratio,
                    'avg_engagement_velocity': avg_engagement_velocity,  # New metric
                    'top_content_type': top_content_type,  # New metric
                    'image_post_avg_score': image_post_avg_score,  # New metric
                    'video_post_avg_score': video_post_avg_score,  # New metric
                    'text_post_avg_score': text_post_avg_score,  # New metric
                    'link_post_avg_score': link_post_avg_score,  # New metric
                    'best_posting_hour': best_hour,
                    'best_posting_day': best_day,
                    'last_scraped_at': datetime.now(timezone.utc).isoformat(),
                }
                
            # ALWAYS include review in payload - either existing or new
            if existing_review is not None:
                # Preserve existing review exactly as it is
                payload['review'] = existing_review
                logger.info(f"🔒 Preserving existing review '{existing_review}' for r/{name}")
            else:
                # Apply review logic for new subreddits
                if name.startswith('u_'):
                    payload['review'] = "User Feed"
                    logger.info(f"🆕 New user feed r/{name} - setting review to 'User Feed'")
                elif auto_review:
                    payload['review'] = auto_review
                    logger.info(f"🤖 New subreddit r/{name} auto-reviewed as '{auto_review}'")
                else:
                    payload['review'] = None  # Manual review needed
                    logger.info(f"📋 New subreddit r/{name} - leaving review empty for manual review")
            
            # Save to database
            try:
                resp = self.supabase.table('reddit_subreddits').upsert(payload, on_conflict='name').execute()
                if hasattr(resp, 'error') and resp.error:
                    logger.error(f"❌ Database error for r/{name}: {resp.error}")
                else:
                    logger.info(f"💾 Upserted r/{name}: hot30={hot_count}, total_upvotes={total_score}, best_day={best_day}, best_hour={best_hour}")
            except Exception as e:
                logger.error(f"❌ Database exception for r/{name}: {e}")

            # IMPORTANT: Fetch and save user data for minimum requirements calculation
            if collected_authors:
                logger.info(f"📊 Fetching user data for {len(collected_authors)} authors from r/{name} for requirements calculation")
                for author_username in collected_authors:
                    try:
                        # Use public API to get user data
                        user_info = self.public_api.get_user_info(author_username, proxy_config)
                        if user_info and 'error' not in user_info:
                            # Calculate user quality scores
                            link_karma = user_info.get('link_karma', 0) or 0
                            comment_karma = user_info.get('comment_karma', 0) or 0
                            created_utc = user_info.get('created_utc', 0)

                            if created_utc:
                                account_age_days = (datetime.now(timezone.utc) - datetime.fromtimestamp(created_utc, tz=timezone.utc)).days
                            else:
                                account_age_days = 0

                            # Save user data to database for requirements calculation
                            user_payload = {
                                'username': author_username,
                                'link_karma': link_karma,
                                'comment_karma': comment_karma,
                                'total_karma': link_karma + comment_karma,
                                'account_age_days': account_age_days,
                                'created_utc': datetime.fromtimestamp(created_utc, tz=timezone.utc).isoformat() if created_utc else None,
                                'last_scraped_at': datetime.now(timezone.utc).isoformat()
                            }

                            # Upsert user data
                            user_resp = self.supabase.table('reddit_users').upsert(user_payload, on_conflict='username').execute()
                            if not (hasattr(user_resp, 'error') and user_resp.error):
                                logger.debug(f"✅ Saved user data for u/{author_username} (karma: {link_karma}/{comment_karma}, age: {account_age_days}d)")
                    except Exception as e:
                        logger.debug(f"⚠️ Could not fetch user data for u/{author_username}: {e}")

                logger.info(f"📊 Completed fetching user data for r/{name} - ready for requirements calculation")

            return collected_authors

        except Exception as e:
            logger.error(f"❌ Error analyzing r/{subreddit_name} with public API: {e}")
            return set()
    
    def convert_public_post_data(self, post_data: dict, subreddit_name: str) -> dict:
        """Convert public API post data to database format"""
        try:
            # Fetch subreddit tags
            subreddit_tags = []
            subreddit_primary_category = None
            try:
                sub_resp = self.supabase.table('reddit_subreddits').select('tags, primary_category').eq('name', subreddit_name).limit(1).execute()
                if sub_resp.data and len(sub_resp.data) > 0:
                    subreddit_tags = sub_resp.data[0].get('tags', [])
                    subreddit_primary_category = sub_resp.data[0].get('primary_category')
            except Exception as e:
                logger.debug(f"Could not fetch tags for r/{subreddit_name}: {e}")

            reddit_id = post_data.get('id')
            title = post_data.get('title')
            selftext = post_data.get('selftext')
            url = post_data.get('url')
            author_name = post_data.get('author')
            
            # Skip deleted/removed posts
            if author_name in ['[deleted]', '[removed]', None]:
                author_name = None
            
            # Engagement data
            score = post_data.get('score', 0) or 0
            upvote_ratio = post_data.get('upvote_ratio')
            num_comments = post_data.get('num_comments', 0) or 0
            comment_to_upvote_ratio = num_comments / max(1, score) if score > 0 else 0
            
            # Timestamps
            created_ts = post_data.get('created_utc')
            created_dt = datetime.fromtimestamp(created_ts, tz=timezone.utc) if created_ts else None
            posting_day_of_week = created_dt.strftime('%A') if created_dt else None
            posting_hour = created_dt.hour if created_dt else None
            
            # Content analysis
            is_self = post_data.get('is_self', False)
            is_video = post_data.get('is_video', False)
            domain = post_data.get('domain')
            thumbnail = post_data.get('thumbnail')
            
            # Determine content type
            content_type = 'text'
            if is_video or domain in ['v.redd.it', 'youtube.com', 'youtu.be']:
                content_type = 'video'
            elif domain in ['i.redd.it', 'imgur.com'] or (url and any(url.endswith(ext) for ext in ['.jpg', '.png', '.gif', '.jpeg'])):
                content_type = 'image'
            elif not is_self and url:
                content_type = 'link'
            
            # Additional metadata
            over_18 = post_data.get('over_18', False)
            spoiler = post_data.get('spoiler', False)
            stickied = post_data.get('stickied', False)
            locked = post_data.get('locked', False)
            gilded = post_data.get('gilded', 0)
            distinguished = post_data.get('distinguished')
            
            return {
                'reddit_id': reddit_id,
                'title': title,
                'selftext': selftext,
                'url': url,
                'author_username': author_name,
                'subreddit_name': subreddit_name,
                'score': score,
                'upvote_ratio': upvote_ratio,
                'num_comments': num_comments,
                'comment_to_upvote_ratio': round(comment_to_upvote_ratio, 6),
                'created_utc': created_dt.isoformat() if created_dt else None,
                'is_self': is_self,
                'is_video': is_video,
                'over_18': over_18,
                'spoiler': spoiler,
                'stickied': stickied,
                'locked': locked,
                'gilded': gilded,
                'distinguished': distinguished,
                'content_type': content_type,
                'post_length': len(selftext) if selftext else 0,
                'has_thumbnail': bool(thumbnail and thumbnail not in ['self', 'default', 'nsfw']),
                'posting_day_of_week': posting_day_of_week,
                'posting_hour': posting_hour,
                'domain': domain,
                'thumbnail': thumbnail,
                'scraped_at': datetime.now(timezone.utc).isoformat(),
                'sub_tags': subreddit_tags,
                'sub_primary_category': subreddit_primary_category,
            }
        except Exception as e:
            logger.error(f"❌ Error converting post data: {e}")
            return {}
    
    async def analyze_user_public_api(self, username: str, proxy_config: dict = None) -> set:
        """Analyze user using Public JSON API and discover subreddits"""
        try:
            # Use provided proxy config or fall back to rotation
            if proxy_config is None:
                proxy_config = self.get_next_proxy()
                proxy_name = proxy_config['display_name'] if proxy_config else 'direct'
            else:
                proxy_name = proxy_config.get('display_name', proxy_config.get('service', 'unknown'))
            
            logger.info(f"👤 Analyzing u/{username} using public API (proxy: {proxy_name})")
            
            # Get user info and posts (synchronous calls)
            user_info = self.public_api.get_user_info(username, proxy_config)
            user_posts = self.public_api.get_user_posts(username, 30, proxy_config)
            
            # Handle suspended/banned users gracefully
            if user_info and 'error' in user_info:
                if user_info['error'] == 'forbidden':
                    logger.warning(f"🚫 u/{username} is suspended - saving with suspended flag")
                    # Save suspended user to database
                    await self.save_suspended_user(username)
                    return set()
                elif user_info['error'] == 'not_found':
                    logger.warning(f"❓ u/{username} not found - skipping")
                    return set()
            
            if not user_info or 'error' in user_info:
                logger.error(f"❌ Failed to get info for u/{username}")
                return set()
            
            # Extract user data
            reddit_id = user_info.get('id')
            created_ts = user_info.get('created_utc')
            created_dt = datetime.fromtimestamp(created_ts, tz=timezone.utc) if created_ts else None
            comment_karma = user_info.get('comment_karma', 0) or 0
            link_karma = user_info.get('link_karma', 0) or 0
            total_karma = user_info.get('total_karma', 0) or 0
            awardee_karma = user_info.get('awardee_karma', 0) or 0
            awarder_karma = user_info.get('awarder_karma', 0) or 0
            is_employee = user_info.get('is_employee', False)
            is_mod = user_info.get('is_mod', False)
            is_gold = user_info.get('is_gold', False)
            verified = user_info.get('verified', False)
            has_verified_email = user_info.get('has_verified_email', False)
            icon_img = user_info.get('icon_img')
            
            # Analyze posts for patterns
            discovered_subreddits = set()
            total_score = 0
            total_comments = 0
            post_count = len(user_posts)
            content_types = defaultdict(int)
            posting_hours = defaultdict(int)
            posting_days = defaultdict(int)
            
            for post in user_posts:
                # Discover subreddit
                subreddit = post.get('subreddit')
                if subreddit:
                    discovered_subreddits.add(subreddit)
                
                # Analyze engagement
                score = post.get('score', 0) or 0
                num_comments = post.get('num_comments', 0) or 0
                total_score += score
                total_comments += num_comments
                
                # Analyze content patterns
                is_self = post.get('is_self', False)
                is_video = post.get('is_video', False)
                domain = post.get('domain', '')
                
                if is_video or domain in ['v.redd.it', 'youtube.com', 'youtu.be']:
                    content_types['video'] += 1
                elif domain in ['i.redd.it', 'imgur.com'] or any(post.get('url', '').endswith(ext) for ext in ['.jpg', '.png', '.gif', '.jpeg']):
                    content_types['image'] += 1
                elif is_self:
                    content_types['text'] += 1
                else:
                    content_types['link'] += 1
                
                # Analyze timing patterns
                ts = post.get('created_utc')
                if ts:
                    dt = datetime.fromtimestamp(ts, tz=timezone.utc)
                    posting_hours[dt.hour] += 1
                    posting_days[dt.strftime('%A')] += 1
            
            # Calculate metrics
            avg_score = round(total_score / max(1, post_count), 2)
            avg_comments = round(total_comments / max(1, post_count), 2)
            karma_per_day = round(total_karma / max(1, (datetime.now(timezone.utc) - created_dt).days if created_dt else 1), 2)
            
            # Determine most common content type and timing
            preferred_content_type = max(content_types, key=content_types.get) if content_types else None
            most_active_hour = max(posting_hours, key=posting_hours.get) if posting_hours else None
            most_active_day = max(posting_days, key=posting_days.get) if posting_days else None
            
            # Prepare user data for database
            user_payload = {
                'username': username,
                'reddit_id': reddit_id,
                'created_utc': created_dt.isoformat() if created_dt else None,
                'comment_karma': comment_karma,
                'link_karma': link_karma,
                'total_karma': total_karma,
                'awardee_karma': awardee_karma,
                'awarder_karma': awarder_karma,
                'is_employee': is_employee,
                'is_mod': is_mod,
                'is_gold': is_gold,
                'verified': verified,
                'has_verified_email': has_verified_email,
                'is_suspended': False,  # We know they're not suspended since we got data
                'icon_img': icon_img,
                'avg_post_score': avg_score,
                'avg_post_comments': avg_comments,
                'total_posts_analyzed': post_count,
                'karma_per_day': karma_per_day,
                'preferred_content_type': preferred_content_type,
                'most_active_posting_hour': most_active_hour,
                'most_active_posting_day': most_active_day,
                'num_discovered_subreddits': len(discovered_subreddits),
                'last_scraped_at': datetime.now(timezone.utc).isoformat(),
            }
            
            # Save user to database
            try:
                resp = self.supabase.table('reddit_users').upsert(user_payload, on_conflict='username').execute()
                if hasattr(resp, 'error') and resp.error:
                    logger.error(f"❌ Database error for u/{username}: {resp.error}")
                else:
                    logger.info(f"💾 Upserted u/{username}: karma={total_karma}, posts={post_count}, subreddits={len(discovered_subreddits)}")
            except Exception as e:
                logger.error(f"❌ Database exception for u/{username}: {e}")
            
            self.stats['users_analyzed'] += 1
            return discovered_subreddits
            
        except Exception as e:
            logger.error(f"❌ Error analyzing u/{username} with public API: {e}")
            return set()
    
    async def save_suspended_user(self, username: str):
        """Save a suspended user to database with minimal info"""
        try:
            user_payload = {
                'username': username,
                'is_suspended': True,
                'last_scraped_at': datetime.now(timezone.utc).isoformat(),
            }
            
            resp = self.supabase.table('reddit_users').upsert(user_payload, on_conflict='username').execute()
            if hasattr(resp, 'error') and resp.error:
                logger.error(f"❌ Database error for suspended u/{username}: {resp.error}")
            else:
                logger.info(f"💾 Marked u/{username} as suspended")
                
        except Exception as e:
            logger.error(f"❌ Error saving suspended u/{username}: {e}")
    
    async def close(self):
        """Close all clients and cleanup resources"""
        # Close authenticated Reddit clients (fallback accounts)
        for client_info in self.reddit_clients:
            try:
                await client_info['client'].close()
            except:
                pass
        
        # No cleanup needed for requests-based API
        if self.public_api:
            logger.info("🔄 Requests-based API cleanup - no action needed")

    def track_subreddit_requirements(self, subreddit_name: str, authors: set, subreddit_requirements: dict):
        """Track minimum requirements for a subreddit based on successful posters"""
        if not authors:
            return
            
        # Initialize tracking for this subreddit if not exists
        if subreddit_name not in subreddit_requirements:
            subreddit_requirements[subreddit_name] = {
                'post_karmas': [],
                'comment_karmas': [],
                'account_ages': [],
                'total_karma': [],
                'user_count': 0
            }
        
        # Get user data from database for these authors
        try:
            # Query users table for karma and age data
            authors_list = list(authors)
            response = self.supabase.table('reddit_users').select(
                'username, link_karma, comment_karma, total_karma, account_age_days, created_utc'
            ).in_('username', authors_list).execute()
            
            if response.data:
                for user_data in response.data:
                    username = user_data.get('username')
                    post_karma = user_data.get('link_karma', 0) or 0
                    comment_karma = user_data.get('comment_karma', 0) or 0
                    total_karma = user_data.get('total_karma', 0) or 0
                    account_age_days = user_data.get('account_age_days', 0) or 0
                    
                    # Only track users with valid data (not suspended/deleted accounts)
                    if post_karma >= 0 and comment_karma >= 0 and account_age_days > 0:
                        subreddit_requirements[subreddit_name]['post_karmas'].append(post_karma)
                        subreddit_requirements[subreddit_name]['comment_karmas'].append(comment_karma)
                        subreddit_requirements[subreddit_name]['total_karma'].append(total_karma)
                        subreddit_requirements[subreddit_name]['account_ages'].append(account_age_days)
                        subreddit_requirements[subreddit_name]['user_count'] += 1
                
                logger.debug(f"📊 Tracked requirements for r/{subreddit_name}: {len(response.data)} users analyzed")
                
        except Exception as e:
            logger.error(f"❌ Error tracking requirements for r/{subreddit_name}: {e}")

    def calculate_and_save_subreddit_requirements(self, subreddit_requirements: dict):
        """Calculate minimum requirements and save to database"""
        if not subreddit_requirements:
            return

        logger.info(f"📊 Calculating minimum requirements for {len(subreddit_requirements)} subreddits...")

        # Log which subreddits are getting requirements calculated
        seed_subreddits = []
        discovered_subreddits = []
        for sub_name in subreddit_requirements.keys():
            # Check if it's a seed subreddit (has 'Ok' review status)
            try:
                check_resp = self.supabase.table('reddit_subreddits').select('review').eq('name', sub_name).execute()
                if check_resp.data and check_resp.data[0].get('review') == 'Ok':
                    seed_subreddits.append(sub_name)
                else:
                    discovered_subreddits.append(sub_name)
            except:
                discovered_subreddits.append(sub_name)

        if seed_subreddits:
            logger.info(f"📊 SEED subreddits getting requirements: {', '.join(seed_subreddits[:5])}{'...' if len(seed_subreddits) > 5 else ''} ({len(seed_subreddits)} total)")
        if discovered_subreddits:
            logger.info(f"📊 DISCOVERED subreddits getting requirements: {', '.join(discovered_subreddits[:5])}{'...' if len(discovered_subreddits) > 5 else ''} ({len(discovered_subreddits)} total)")

        for subreddit_name, req_data in subreddit_requirements.items():
            if req_data['user_count'] < 5:  # Increased threshold for better accuracy
                logger.debug(f"⚠️ r/{subreddit_name}: Only {req_data['user_count']} users - need at least 5 for meaningful analysis")
                continue
                
            try:
                # Calculate minimums (10th percentile to avoid outliers)
                post_karmas = sorted(req_data['post_karmas'])
                comment_karmas = sorted(req_data['comment_karmas'])
                account_ages = sorted(req_data['account_ages'])
                
                # Use 10th percentile as "minimum" (more realistic than absolute minimum)
                percentile_index = max(0, int(len(post_karmas) * 0.1))
                
                min_post_karma = post_karmas[percentile_index] if post_karmas else 0
                min_comment_karma = comment_karmas[percentile_index] if comment_karmas else 0
                min_account_age = account_ages[percentile_index] if account_ages else 0
                
                # Update subreddit with minimum requirements
                requirements_payload = {
                    'name': subreddit_name,
                    'min_post_karma': min_post_karma,
                    'min_comment_karma': min_comment_karma,
                    'min_account_age_days': min_account_age,
                    'requirement_sample_size': req_data['user_count'],
                    'requirements_last_updated': datetime.now(timezone.utc).isoformat()
                }
                
                # Save to database
                resp = self.supabase.table('reddit_subreddits').upsert(requirements_payload, on_conflict='name').execute()
                if hasattr(resp, 'error') and resp.error:
                    logger.error(f"❌ Error saving requirements for r/{subreddit_name}: {resp.error}")
                else:
                    # Check if this is a seed subreddit
                    is_seed = False
                    try:
                        check_resp = self.supabase.table('reddit_subreddits').select('review').eq('name', subreddit_name).execute()
                        if check_resp.data and check_resp.data[0].get('review') == 'Ok':
                            is_seed = True
                    except:
                        pass

                    subreddit_type = "SEED" if is_seed else "DISCOVERED"
                    logger.info(f"✅ [{subreddit_type}] r/{subreddit_name} requirements SAVED: post_karma≥{min_post_karma}, comment_karma≥{min_comment_karma}, age≥{min_account_age}d (sample: {req_data['user_count']} users)")
                    
            except Exception as e:
                logger.error(f"❌ Error calculating requirements for r/{subreddit_name}: {e}")

async def main():
    """Main test function"""
    scraper = ProxyEnabledMultiScraper()
    
    try:
        await scraper.initialize()
        await scraper.test_proxy_scraping()
        
    except Exception as e:
        logger.error(f"❌ Error: {e}")
    
    finally:
        await scraper.close()

if __name__ == "__main__":
    asyncio.run(main())
