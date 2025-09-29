#!/usr/bin/env python3
"""
Reddit Scraper v3.0 - Simplified Architecture
Removes caching and complex batch writing while preserving core logic and threading
"""
import sys
import os
import asyncio
import logging
import random
import time
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, Optional, List, Set, Tuple
from collections import defaultdict
from pathlib import Path
import json

# External libraries
from supabase import create_client
from dotenv import load_dotenv

# Setup path for imports
current_dir = os.path.dirname(os.path.abspath(__file__))
# In Docker: /app/app/scrapers/reddit -> need to go up 3 levels to /app
# In local: api-render/app/scrapers/reddit -> need to go up 2 levels to api-render/app
if '/app/app/scrapers' in current_dir:
    # Docker environment
    api_root = os.path.join(current_dir, '..', '..', '..')  # Goes to /app
    sys.path.insert(0, api_root)
    # Now we can import from app.*
    from app.core.clients.api_pool import ThreadSafeAPIPool
    from app.core.config.proxy_manager import ProxyManager
    from app.core.database.supabase_client import get_supabase_client, refresh_supabase_client
    from app.core.exceptions import (
        SubredditBannedException, SubredditPrivateException,
        ValidationException, handle_api_error, validate_subreddit_name
    )
    from app.scrapers.reddit.processors.calculator import MetricsCalculator, RequirementsCalculator
else:
    # Local environment
    api_root = os.path.join(current_dir, '..', '..')  # Goes to api-render/app
    sys.path.insert(0, api_root)
    # Local imports
    from core.clients.api_pool import ThreadSafeAPIPool
    from core.config.proxy_manager import ProxyManager
    from core.database.supabase_client import get_supabase_client, refresh_supabase_client
    from core.exceptions import (
        SubredditBannedException, SubredditPrivateException,
        ValidationException, handle_api_error, validate_subreddit_name
    )
    from scrapers.reddit.processors.calculator import MetricsCalculator, RequirementsCalculator
# Direct API calls - no longer using complex scraper classes

# Load environment variables
env_path = Path(__file__).parent.parent.parent / '.env'
load_dotenv(env_path)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Version
SCRAPER_VERSION = "3.0.0 - Simplified Architecture"

# Constants (replacing complex config)
BATCH_SIZE = 50  # Posts per batch insert
USER_BATCH_SIZE = 30  # Users per batch insert
MAX_THREADS = 5  # Parallel subreddit processing
POSTS_PER_SUBREDDIT = 30  # Hot posts to analyze
USER_SUBMISSIONS_LIMIT = 30  # Recent user submissions to check
RATE_LIMIT_DELAY = 1.0  # Seconds between requests
MAX_RETRIES = 3  # Retry attempts for failed requests


class SimplifiedRedditScraper:
    """
    Simplified Reddit scraper with direct database operations and preserved threading.
    Removes caching and complex batch writing while maintaining core functionality.
    """

    def __init__(self):
        """Initialize the simplified Reddit scraper"""
        # Core components
        self.supabase = None
        self.proxy_manager = None
        self.api_pool = None
        self.metrics_calculator = None

        # Skip lists (in-memory, no caching)
        self.non_related_subreddits: Set[str] = set()
        self.user_feed_subreddits: Set[str] = set()
        self.banned_subreddits: Set[str] = set()
        self.processed_subreddits: Set[str] = set()

        # Simple batch storage
        self.posts_batch = []
        self.users_batch = []

        # Error recovery configuration
        self.max_retries = 3
        self.retry_delay = 5  # seconds
        self.consecutive_errors = 0
        self.error_threshold = 10  # Max consecutive errors before stopping

        # Statistics
        self.stats = {
            'start_time': None,
            'subreddits_processed': 0,
            'users_processed': 0,
            'posts_processed': 0,
            'new_subreddits_discovered': 0,
            'errors': []
        }

    async def initialize(self):
        """Initialize core components"""
        init_start = datetime.now(timezone.utc)
        logger.info(f"🚀 Initializing Simplified Reddit Scraper v{SCRAPER_VERSION}")

        # Log initialization start to Supabase
        try:
            self.supabase = get_supabase_client()
            self.supabase.table('system_logs').insert({
                'timestamp': init_start.isoformat(),
                'source': 'reddit_scraper',
                'script_name': 'simple_main',
                'level': 'info',
                'message': f'🚀 Initializing Reddit Scraper v{SCRAPER_VERSION}',
                'context': {'version': SCRAPER_VERSION, 'action': 'initialization_start'}
            }).execute()
            logger.info("✅ Supabase client initialized")

            # Initialize proxy manager and API pool
            self.proxy_manager = ProxyManager(self.supabase)
            await self.proxy_manager.load_proxies()  # Fixed: ProxyManager uses load_proxies() not initialize()

            self.api_pool = ThreadSafeAPIPool(self.proxy_manager)
            self.api_pool.initialize()
            logger.info(f"✅ API pool initialized with {len(self.proxy_manager.proxies)} proxies")

            # Initialize metrics calculator
            self.metrics_calculator = MetricsCalculator()

            # Load skip lists from database
            await self.load_skip_lists()

            # Log successful initialization
            init_duration = (datetime.now(timezone.utc) - init_start).total_seconds()
            self.supabase.table('system_logs').insert({
                'timestamp': datetime.now(timezone.utc).isoformat(),
                'source': 'reddit_scraper',
                'script_name': 'simple_main',
                'level': 'success',
                'message': '✅ Scraper initialization complete',
                'context': {
                    'duration_seconds': init_duration,
                    'proxy_count': len(self.proxy_manager.proxies) if self.proxy_manager else 0
                },
                'duration_ms': int(init_duration * 1000)
            }).execute()
            logger.info("✅ Scraper initialization complete")

        except Exception as e:
            # Log initialization failure
            try:
                if self.supabase:
                    self.supabase.table('system_logs').insert({
                        'timestamp': datetime.now(timezone.utc).isoformat(),
                        'source': 'reddit_scraper',
                        'script_name': 'simple_main',
                        'level': 'error',
                        'message': f'❌ Failed to initialize scraper: {str(e)}',
                        'context': {'error': str(e), 'action': 'initialization_failed'}
                    }).execute()
            except:
                pass
            logger.error(f"❌ Failed to initialize scraper: {e}")
            raise

    async def load_skip_lists(self):
        """Load subreddits to skip from database"""
        load_start = datetime.now(timezone.utc)
        try:
            # Load Non Related subreddits - FIX: Handle None names
            result = self.supabase.table('reddit_subreddits').select('name').eq('review', 'Non Related').execute()
            self.non_related_subreddits = {
                r['name'].lower() for r in result.data
                if r.get('name') is not None
            }

            # Load User Feed subreddits - FIX: Handle None names
            result = self.supabase.table('reddit_subreddits').select('name').eq('review', 'User Feed').execute()
            self.user_feed_subreddits = {
                r['name'].lower() for r in result.data
                if r.get('name') is not None
            }

            # Load Banned subreddits - FIX: Handle None names
            result = self.supabase.table('reddit_subreddits').select('name').eq('review', 'Banned').execute()
            self.banned_subreddits = {
                r['name'].lower() for r in result.data
                if r.get('name') is not None
            }

            # Log skip list loading
            self.supabase.table('system_logs').insert({
                'timestamp': datetime.now(timezone.utc).isoformat(),
                'source': 'reddit_scraper',
                'script_name': 'simple_main',
                'level': 'info',
                'message': f'📋 Loaded skip lists',
                'context': {
                    'non_related_count': len(self.non_related_subreddits),
                    'user_feed_count': len(self.user_feed_subreddits),
                    'banned_count': len(self.banned_subreddits),
                    'total_skip': len(self.non_related_subreddits) + len(self.user_feed_subreddits) + len(self.banned_subreddits)
                },
                'duration_ms': int((datetime.now(timezone.utc) - load_start).total_seconds() * 1000)
            }).execute()

            logger.info(f"📋 Loaded skip lists: {len(self.non_related_subreddits)} non-related, "
                       f"{len(self.user_feed_subreddits)} user feed, {len(self.banned_subreddits)} banned")

        except Exception as e:
            # Log skip list loading error
            try:
                self.supabase.table('system_logs').insert({
                    'timestamp': datetime.now(timezone.utc).isoformat(),
                    'source': 'reddit_scraper',
                    'script_name': 'simple_main',
                    'level': 'error',
                    'message': f'Error loading skip lists: {str(e)}',
                    'context': {'error': str(e)}
                }).execute()
            except:
                pass
            logger.error(f"Error loading skip lists: {e}")

    def reset_stats(self):
        """Reset statistics for new cycle - prevents accumulation bug"""
        self.stats = {
            'start_time': None,
            'subreddits_processed': 0,
            'users_processed': 0,
            'posts_processed': 0,
            'new_subreddits_discovered': 0,
            'errors': []
        }
        logger.info("📊 Stats reset for new cycle")

    def cleanup_memory(self):
        """Clean up memory to prevent leaks in long-running process"""
        # Clear processed sets if they get too large
        if len(self.processed_subreddits) > 10000:
            logger.info(f"🧹 Clearing processed_subreddits set ({len(self.processed_subreddits)} items)")
            self.processed_subreddits.clear()

        # Clear batch lists
        self.subreddit_batch = []
        self.users_batch = []

        # Limit error list size
        if len(self.stats.get('errors', [])) > 100:
            self.stats['errors'] = self.stats['errors'][-50:]  # Keep last 50 errors

        # Force garbage collection for large cleanups
        import gc
        collected = gc.collect()
        if collected > 0:
            logger.debug(f"♻️ Garbage collected {collected} objects")

    async def api_call_with_retry(self, api_func, *args, **kwargs):
        """Execute API call with retry logic and error recovery"""
        for attempt in range(self.max_retries):
            try:
                result = await api_func(*args, **kwargs)
                self.consecutive_errors = 0  # Reset on success
                return result
            except Exception as e:
                self.consecutive_errors += 1
                error_msg = f"API call failed (attempt {attempt + 1}/{self.max_retries}): {e}"
                logger.warning(error_msg)
                self.stats['errors'].append(error_msg)

                # Check if we've hit the error threshold
                if self.consecutive_errors >= self.error_threshold:
                    logger.error(f"❌ Too many consecutive errors ({self.consecutive_errors}), stopping")
                    raise Exception("Error threshold exceeded, stopping scraper")

                if attempt < self.max_retries - 1:
                    await asyncio.sleep(self.retry_delay * (attempt + 1))  # Exponential backoff
                else:
                    logger.error(f"❌ All retries exhausted for API call")
                    raise

    async def run_scraping_cycle(self, control_checker=None):
        """Main scraping cycle with simplified workflow"""
        # Reset stats at the start of each cycle to prevent accumulation
        self.reset_stats()
        self.stats['start_time'] = datetime.now(timezone.utc)
        cycle_id = f"cycle_{int(time.time())}"
        logger.info("🔄 Starting scraping cycle")

        # Log cycle start
        try:
            self.supabase.table('system_logs').insert({
                'timestamp': self.stats['start_time'].isoformat(),
                'source': 'reddit_scraper',
                'script_name': 'simple_main',
                'level': 'info',
                'message': '🔄 Starting scraping cycle',
                'context': {'cycle_id': cycle_id, 'action': 'cycle_start'}
            }).execute()
        except:
            pass

        try:
            # 1. Get all subreddits from database
            subreddits = await self.get_all_subreddits()
            # Log subreddit count
            try:
                self.supabase.table('system_logs').insert({
                    'timestamp': datetime.now(timezone.utc).isoformat(),
                    'source': 'reddit_scraper',
                    'script_name': 'simple_main',
                    'level': 'info',
                    'message': f'📊 Found {len(subreddits)} subreddits to process',
                    'context': {
                        'cycle_id': cycle_id,
                        'total_subreddits': len(subreddits),
                        'action': 'subreddits_loaded'
                    }
                }).execute()
            except:
                pass
            logger.info(f"📊 Found {len(subreddits)} subreddits to process")

            # 2. Categorize subreddits with progress tracking
            ok_subs = []
            no_seller_subs = []

            total_subs = len(subreddits)
            processed = 0
            skipped = 0

            for sub in subreddits:
                sub_name = sub['name'].lower()
                processed += 1

                # Log progress every 10 subreddits
                if processed % 10 == 0:
                    logger.info(f"📊 Progress: {processed}/{total_subs} subreddits (skipped: {skipped})")

                # Skip if already in skip lists
                if sub_name in self.non_related_subreddits:
                    logger.debug(f"⏭️ Skipping {sub_name} (Non Related)")
                    skipped += 1
                    continue
                elif sub_name in self.user_feed_subreddits:
                    logger.debug(f"⏭️ Skipping {sub_name} (User Feed)")
                    skipped += 1
                    continue
                elif sub_name in self.banned_subreddits:
                    logger.debug(f"⏭️ Skipping {sub_name} (Banned)")
                    skipped += 1
                    continue

                # Skip if recently processed (within 24 hours)
                if sub.get('last_scraped_at'):
                    try:
                        # Handle both timezone-aware and naive timestamps safely
                        timestamp_str = sub['last_scraped_at']
                        if isinstance(timestamp_str, str):
                            # Remove any timezone indicators
                            timestamp_str = timestamp_str.replace('Z', '').replace('+00:00', '')
                            if 'T' in timestamp_str:
                                timestamp_str = timestamp_str.split('+')[0]  # Remove any timezone suffix
                            # Parse as naive and make timezone-aware
                            last_scraped = datetime.fromisoformat(timestamp_str)
                            if last_scraped.tzinfo is None:
                                last_scraped = last_scraped.replace(tzinfo=timezone.utc)
                        else:
                            # If it's already a datetime object
                            last_scraped = timestamp_str
                            if last_scraped.tzinfo is None:
                                last_scraped = last_scraped.replace(tzinfo=timezone.utc)

                        # Now safe to compare with timezone-aware datetime
                        if (datetime.now(timezone.utc) - last_scraped) < timedelta(hours=24):
                            logger.debug(f"⏭️ Skipping {sub_name} (recently scraped)")
                            continue
                    except Exception as e:
                        logger.warning(f"Failed to parse last_scraped_at for {sub_name}: {e}, continuing anyway")
                        # Continue processing if we can't parse the timestamp

                # Categorize by review status
                review_status = sub.get('review', '').strip()

                if review_status == 'Ok':
                    ok_subs.append(sub)
                elif review_status == 'No Seller':
                    no_seller_subs.append(sub)
                elif review_status == 'Non Related':
                    self.non_related_subreddits.add(sub_name)
                    await self.save_review_status(sub_name, 'Non Related')
                elif review_status == 'User Feed':
                    self.user_feed_subreddits.add(sub_name)
                    await self.save_review_status(sub_name, 'User Feed')

            # Log categorization results
            try:
                self.supabase.table('system_logs').insert({
                    'timestamp': datetime.now(timezone.utc).isoformat(),
                    'source': 'reddit_scraper',
                    'script_name': 'simple_main',
                    'level': 'info',
                    'message': f'📊 Categorized subreddits',
                    'context': {
                        'cycle_id': cycle_id,
                        'ok_count': len(ok_subs),
                        'no_seller_count': len(no_seller_subs),
                        'skipped_count': len(subreddits) - len(ok_subs) - len(no_seller_subs),
                        'action': 'categorization_complete'
                    }
                }).execute()
            except:
                pass
            logger.info(f"📊 Categorized: {len(ok_subs)} Ok, {len(no_seller_subs)} No Seller")

            # 3. Process subreddits with threading
            # Process No Seller subreddits (limited data)
            if no_seller_subs:
                logger.info(f"🔍 Processing {len(no_seller_subs)} No Seller subreddits")
                await self.process_subreddits_batch(no_seller_subs, full_processing=False)

            # Process Ok subreddits (full data)
            if ok_subs:
                logger.info(f"🔍 Processing {len(ok_subs)} Ok subreddits")
                await self.process_subreddits_batch(ok_subs, full_processing=True)

            # 4. Final batch inserts
            await self.flush_batches()

            # 5. Log statistics
            await self.log_statistics()

            # Log cycle completion
            cycle_duration = (datetime.now(timezone.utc) - self.stats['start_time']).total_seconds()
            try:
                self.supabase.table('system_logs').insert({
                    'timestamp': datetime.now(timezone.utc).isoformat(),
                    'source': 'reddit_scraper',
                    'script_name': 'simple_main',
                    'level': 'success',
                    'message': '✅ Scraping cycle complete',
                    'context': {
                        'cycle_id': cycle_id,
                        'subreddits_processed': self.stats['subreddits_processed'],
                        'users_processed': self.stats['users_processed'],
                        'posts_processed': self.stats['posts_processed'],
                        'new_subreddits_discovered': self.stats['new_subreddits_discovered'],
                        'errors_count': len(self.stats['errors']),
                        'duration_seconds': cycle_duration
                    },
                    'duration_ms': int(cycle_duration * 1000)
                }).execute()
            except:
                pass

        except Exception as e:
            # Log cycle error
            try:
                self.supabase.table('system_logs').insert({
                    'timestamp': datetime.now(timezone.utc).isoformat(),
                    'source': 'reddit_scraper',
                    'script_name': 'simple_main',
                    'level': 'error',
                    'message': f'❌ Error in scraping cycle: {str(e)}',
                    'context': {
                        'cycle_id': cycle_id,
                        'error': str(e),
                        'stats': self.stats
                    }
                }).execute()
            except:
                pass
            logger.error(f"❌ Error in scraping cycle: {e}")
            self.stats['errors'].append(str(e))
            raise

        finally:
            # CRITICAL: Always reset is_scraping and clean up
            self.is_scraping = False  # Ensure this always gets reset

            # Clean up memory at the end of each cycle
            self.cleanup_memory()

            # Log final stats
            cycle_duration = (datetime.now(timezone.utc) - self.stats['start_time']).total_seconds() if self.stats['start_time'] else 0
            logger.info(f"✅ Scraping cycle complete - Stats: {self.stats}, Duration: {cycle_duration:.1f}s")

    async def get_all_subreddits(self, limit: int = 50) -> List[Dict]:
        """Get subreddits from database with limit - REDUCED from 1000 to 50"""
        try:
            # Get subreddits ordered by priority (Ok first, then No Seller)
            query = self.supabase.table('reddit_subreddits').select('*').order('review', desc=False).limit(limit)
            result = query.execute()
            logger.info(f"📋 Fetched {len(result.data)} subreddits (limit: {limit})")
            return result.data
        except Exception as e:
            logger.error(f"Error fetching subreddits: {e}")
            return []

    async def process_subreddits_batch(self, subreddits: List[Dict], full_processing: bool = True):
        """Process a batch of subreddits with threading"""
        # Process in chunks to avoid overwhelming the system
        chunk_size = MAX_THREADS

        for i in range(0, len(subreddits), chunk_size):
            chunk = subreddits[i:i + chunk_size]

            # Create tasks for parallel processing
            tasks = []
            for sub in chunk:
                if full_processing:
                    task = self.process_ok_subreddit(sub)
                else:
                    task = self.process_no_seller_subreddit(sub)
                tasks.append(task)

            # Run tasks in parallel
            results = await asyncio.gather(*tasks, return_exceptions=True)

            # Handle results and errors
            for sub, result in zip(chunk, results):
                if isinstance(result, Exception):
                    logger.error(f"❌ Error processing {sub['name']}: {result}")
                    self.stats['errors'].append(f"{sub['name']}: {str(result)}")
                else:
                    self.stats['subreddits_processed'] += 1

            # Small delay between batches
            await asyncio.sleep(2)

    # Direct API call methods (replacing old scraper classes)
    async def get_subreddit_about(self, sub_name: str) -> Optional[Dict]:
        """Get subreddit about information"""
        try:
            response = await self.api_pool.make_request(f'/r/{sub_name}/about.json')
            if response and 'data' in response:
                # Log successful API call
                try:
                    self.supabase.table('system_logs').insert({
                        'timestamp': datetime.now(timezone.utc).isoformat(),
                        'source': 'reddit_scraper',
                        'script_name': 'simple_main',
                        'level': 'debug',
                        'message': f'Retrieved about data for r/{sub_name}',
                        'context': {
                            'subreddit': sub_name,
                            'action': 'api_about',
                            'subscribers': response['data'].get('subscribers', 0)
                        }
                    }).execute()
                except:
                    pass
                return response['data']
            return None
        except Exception as e:
            # Log API error
            try:
                self.supabase.table('system_logs').insert({
                    'timestamp': datetime.now(timezone.utc).isoformat(),
                    'source': 'reddit_scraper',
                    'script_name': 'simple_main',
                    'level': 'error',
                    'message': f'Error getting about data for r/{sub_name}',
                    'context': {
                        'subreddit': sub_name,
                        'error': str(e),
                        'action': 'api_about_failed'
                    }
                }).execute()
            except:
                pass
            logger.error(f"Error getting about data for r/{sub_name}: {e}")
            return None

    async def get_subreddit_posts(self, sub_name: str, sort: str = 'hot', time_filter: str = None, limit: int = 30) -> List[Dict]:
        """Get posts from a subreddit"""
        try:
            url = f'/r/{sub_name}/{sort}.json?limit={limit}'
            if time_filter:
                url += f'&t={time_filter}'

            response = await self.api_pool.make_request(url)
            if response and 'data' in response and 'children' in response['data']:
                posts = []
                for child in response['data']['children']:
                    if child['kind'] == 't3' and 'data' in child:
                        posts.append(child['data'])
                return posts
            return []
        except Exception as e:
            logger.error(f"Error getting {sort} posts for r/{sub_name}: {e}")
            return []

    async def get_user_info(self, username: str) -> Optional[Dict]:
        """Get user information"""
        try:
            response = await self.api_pool.make_request(f'/user/{username}/about.json')
            if response and 'data' in response:
                return response['data']
            return None
        except Exception as e:
            logger.debug(f"Error getting user info for {username}: {e}")
            return None

    async def get_user_submissions(self, username: str, limit: int = 30) -> List[Dict]:
        """Get user's submitted posts"""
        try:
            response = await self.api_pool.make_request(f'/user/{username}/submitted.json?limit={limit}')
            if response and 'data' in response and 'children' in response['data']:
                posts = []
                for child in response['data']['children']:
                    if child['kind'] == 't3' and 'data' in child:
                        posts.append(child['data'])
                return posts
            return []
        except Exception as e:
            logger.debug(f"Error getting submissions for {username}: {e}")
            return []

    async def get_subreddit_rules(self, sub_name: str) -> List[Dict]:
        """Get subreddit rules"""
        try:
            response = await self.api_pool.make_request(f'/r/{sub_name}/about/rules.json')
            if response and 'rules' in response:
                return response['rules']
            return []
        except Exception as e:
            logger.debug(f"Error getting rules for r/{sub_name}: {e}")
            return []

    def check_verification_required(self, about_data: Dict, rules: List[Dict]) -> bool:
        """Check if subreddit requires verification based on keywords in description and rules"""
        keywords = ['verification', 'verify', 'verified', 'verified only',
                    'verification post', 'verify yourself', 'verification required',
                    'must verify', 'verification process']

        # Check subreddit descriptions
        text_to_check = (
            about_data.get('description', '') + ' ' +
            about_data.get('public_description', '')
        ).lower()

        # Check if any keyword is in descriptions
        for keyword in keywords:
            if keyword in text_to_check:
                return True

        # Check subreddit rules
        for rule in rules:
            rule_name = rule.get('short_name', '').lower()
            rule_desc = rule.get('description', '').lower()
            for keyword in keywords:
                if keyword in rule_name or keyword in rule_desc:
                    return True

        return False

    async def process_no_seller_subreddit(self, subreddit: Dict):
        """Process No Seller subreddit with limited data collection"""
        sub_name = subreddit['name']
        process_start = datetime.now(timezone.utc)
        logger.info(f"📝 Processing No Seller subreddit: r/{sub_name}")

        # Log to Supabase
        try:
            self.supabase.table('system_logs').insert({
                'timestamp': process_start.isoformat(),
                'source': 'reddit_scraper',
                'script_name': 'simple_main',
                'level': 'info',
                'message': f'Processing No Seller subreddit: r/{sub_name}',
                'context': {
                    'subreddit': sub_name,
                    'type': 'No Seller',
                    'action': 'processing_start'
                }
            }).execute()
        except Exception as e:
            logger.debug(f"Error logging to Supabase: {e}")

        try:
            # 1. Get subreddit about info
            about_data = await self.get_subreddit_about(sub_name)
            if not about_data:
                logger.warning(f"⚠️ Could not fetch about data for r/{sub_name}")
                return

            # 2. Get hot posts (for basic metrics)
            hot_posts = await self.get_subreddit_posts(sub_name, sort='hot', limit=POSTS_PER_SUBREDDIT)

            # 3. Get weekly posts (for engagement calculations)
            weekly_posts = await self.get_subreddit_posts(sub_name, sort='top', time_filter='week', limit=100)

            # 4. Get yearly posts (for best posting time)
            yearly_posts = await self.get_subreddit_posts(sub_name, sort='top', time_filter='year', limit=100)

            # 5. Get subreddit rules
            rules = await self.get_subreddit_rules(sub_name)

            # 6. Check for verification requirements
            verification_required = self.check_verification_required(about_data, rules)

            # 7. Calculate metrics
            metrics = self.calculate_subreddit_metrics(hot_posts, weekly_posts, yearly_posts)

            # 8. Update subreddit in database FIRST (posts need this)
            await self.update_subreddit(sub_name, about_data, metrics, rules, verification_required)

            # 9. Extract and ensure users exist BEFORE saving posts
            all_posts = hot_posts + weekly_posts + yearly_posts
            users = set()
            for post in all_posts:
                if post.get('author') and post['author'] not in ['[deleted]', 'AutoModerator', None]:
                    users.add(post['author'])

            # Ensure all users exist in database
            if users:
                await self.ensure_users_exist(list(users))

            # 10. NOW save posts (users and subreddit exist)
            await self.save_posts_batch(all_posts, sub_name)

            # Log successful processing
            process_duration = (datetime.now(timezone.utc) - process_start).total_seconds()
            try:
                self.supabase.table('system_logs').insert({
                    'timestamp': datetime.now(timezone.utc).isoformat(),
                    'source': 'reddit_scraper',
                    'script_name': 'simple_main',
                    'level': 'success',
                    'message': f'✅ Completed No Seller processing for r/{sub_name}',
                    'context': {
                        'subreddit': sub_name,
                        'type': 'No Seller',
                        'action': 'processing_complete',
                        'metrics': metrics,
                        'verification_required': verification_required,
                        'posts_saved': len(all_posts),
                        'users_saved': len(users)
                    },
                    'duration_ms': int(process_duration * 1000)
                }).execute()
            except:
                pass
            logger.info(f"✅ Completed No Seller processing for r/{sub_name}")

        except Exception as e:
            # Log processing error
            try:
                self.supabase.table('system_logs').insert({
                    'timestamp': datetime.now(timezone.utc).isoformat(),
                    'source': 'reddit_scraper',
                    'script_name': 'simple_main',
                    'level': 'error',
                    'message': f'Error processing No Seller subreddit {sub_name}',
                    'context': {
                        'subreddit': sub_name,
                        'type': 'No Seller',
                        'error': str(e),
                        'action': 'processing_failed'
                    }
                }).execute()
            except:
                pass
            logger.error(f"Error processing No Seller subreddit {sub_name}: {e}")
            raise

    async def process_ok_subreddit(self, subreddit: Dict):
        """Process Ok subreddit with full data collection"""
        sub_name = subreddit['name']
        process_start = datetime.now(timezone.utc)
        logger.info(f"🔍 Processing Ok subreddit: r/{sub_name}")

        # Log to Supabase
        try:
            self.supabase.table('system_logs').insert({
                'timestamp': process_start.isoformat(),
                'source': 'reddit_scraper',
                'script_name': 'simple_main',
                'level': 'info',
                'message': f'Processing Ok subreddit: r/{sub_name}',
                'context': {
                    'subreddit': sub_name,
                    'type': 'Ok',
                    'action': 'processing_start'
                }
            }).execute()
        except Exception as e:
            logger.debug(f"Error logging to Supabase: {e}")

        try:
            # 1. Get subreddit about info
            about_data = await self.get_subreddit_about(sub_name)
            if not about_data:
                logger.warning(f"⚠️ Could not fetch about data for r/{sub_name}")
                return

            # 2. Get posts (hot, weekly, yearly)
            hot_posts = await self.get_subreddit_posts(sub_name, sort='hot', limit=POSTS_PER_SUBREDDIT)
            weekly_posts = await self.get_subreddit_posts(sub_name, sort='top', time_filter='week', limit=100)
            yearly_posts = await self.get_subreddit_posts(sub_name, sort='top', time_filter='year', limit=100)

            # 3. Get subreddit rules
            rules = await self.get_subreddit_rules(sub_name)

            # 4. Check for verification requirements
            verification_required = self.check_verification_required(about_data, rules)

            # 5. Calculate metrics
            metrics = self.calculate_subreddit_metrics(hot_posts, weekly_posts, yearly_posts)

            # 6. Update subreddit in database FIRST (posts need this FK)
            await self.update_subreddit(sub_name, about_data, metrics, rules, verification_required)

            # 7. Extract ALL users from ALL posts first
            all_posts = hot_posts + weekly_posts + yearly_posts
            all_users = set()
            for post in all_posts:
                if post.get('author') and post['author'] not in ['[deleted]', 'AutoModerator', None]:
                    all_users.add(post['author'])

            # 8. Process users from hot posts for detailed analysis
            users_to_process = self.extract_users_from_posts(hot_posts[:30])

            # Log user processing start
            try:
                self.supabase.table('system_logs').insert({
                    'timestamp': datetime.now(timezone.utc).isoformat(),
                    'source': 'reddit_scraper',
                    'script_name': 'simple_main',
                    'level': 'info',
                    'message': f'👥 Processing {len(users_to_process)} users from r/{sub_name}',
                    'context': {
                        'subreddit': sub_name,
                        'user_count': len(users_to_process),
                        'action': 'user_processing_start'
                    }
                }).execute()
            except:
                pass
            logger.info(f"👥 Found {len(users_to_process)} users to analyze from r/{sub_name}")

            discovered_subreddits = set()
            user_data_list = []

            for username in users_to_process:
                try:
                    # Get user info
                    user_data = await self.get_user_info(username)
                    if user_data:
                        user_data_list.append(user_data)
                    else:
                        # Add minimal user record if API fails
                        user_data_list.append({
                            'username': username,
                            'last_scraped_at': datetime.now(timezone.utc).isoformat()
                        })

                    # Get user's recent submissions
                    user_posts = await self.get_user_submissions(username, limit=USER_SUBMISSIONS_LIMIT)

                    # Discover new subreddits from user posts
                    for post in user_posts:
                        if post.get('subreddit'):
                            discovered_subreddits.add(post['subreddit'].lower())

                    self.stats['users_processed'] += 1

                except Exception as e:
                    logger.debug(f"Error processing user {username}: {e}")
                    # Still create minimal user record
                    user_data_list.append({
                        'username': username,
                        'last_scraped_at': datetime.now(timezone.utc).isoformat()
                    })
                    continue

            # 9. Save ALL users (detailed + minimal for others)
            if user_data_list:
                await self.save_users_batch(user_data_list)

            # Ensure remaining users from posts exist (minimal records)
            remaining_users = all_users - set(users_to_process)
            if remaining_users:
                await self.ensure_users_exist(list(remaining_users))

            # 10. NOW save posts (all users and subreddit exist)
            await self.save_posts_batch(all_posts, sub_name)

            # 11. Calculate requirements from users
            if user_data_list:
                requirements = RequirementsCalculator.calculate_percentile_requirements(user_data_list)
                await self.update_subreddit_requirements(sub_name, requirements)

            # 12. Process newly discovered subreddits
            new_subreddits = discovered_subreddits - self.processed_subreddits
            if new_subreddits:
                logger.info(f"🆕 Discovered {len(new_subreddits)} new subreddits from r/{sub_name}")
                await self.queue_new_subreddits(new_subreddits)
                self.stats['new_subreddits_discovered'] += len(new_subreddits)

            # Mark as processed
            self.processed_subreddits.add(sub_name.lower())

            # Log successful processing
            process_duration = (datetime.now(timezone.utc) - process_start).total_seconds()
            try:
                self.supabase.table('system_logs').insert({
                    'timestamp': datetime.now(timezone.utc).isoformat(),
                    'source': 'reddit_scraper',
                    'script_name': 'simple_main',
                    'level': 'success',
                    'message': f'✅ Completed Ok processing for r/{sub_name}',
                    'context': {
                        'subreddit': sub_name,
                        'type': 'Ok',
                        'action': 'processing_complete',
                        'metrics': metrics,
                        'verification_required': verification_required,
                        'posts_saved': len(all_posts),
                        'users_analyzed': len(users_to_process),
                        'new_subreddits_discovered': len(discovered_subreddits)
                    },
                    'duration_ms': int(process_duration * 1000)
                }).execute()
            except:
                pass
            logger.info(f"✅ Completed Ok processing for r/{sub_name}")

        except Exception as e:
            # Log processing error
            try:
                self.supabase.table('system_logs').insert({
                    'timestamp': datetime.now(timezone.utc).isoformat(),
                    'source': 'reddit_scraper',
                    'script_name': 'simple_main',
                    'level': 'error',
                    'message': f'Error processing Ok subreddit {sub_name}',
                    'context': {
                        'subreddit': sub_name,
                        'type': 'Ok',
                        'error': str(e),
                        'action': 'processing_failed'
                    }
                }).execute()
            except:
                pass
            logger.error(f"Error processing Ok subreddit {sub_name}: {e}")
            raise

    def extract_users_from_posts(self, posts: List[Dict]) -> List[str]:
        """Extract unique usernames from posts"""
        users = set()
        for post in posts:
            if post.get('author') and post['author'] not in ['[deleted]', 'AutoModerator']:
                users.add(post['author'])
        return list(users)

    def calculate_subreddit_metrics(self, hot_posts: List[Dict], weekly_posts: List[Dict], yearly_posts: List[Dict]) -> Dict:
        """Calculate all subreddit metrics"""
        metrics = {}
        calc_start = datetime.now(timezone.utc)

        # Get top 10 weekly posts by score (or whatever is available)
        top_10_weekly = sorted(weekly_posts, key=lambda x: x.get('score', 0), reverse=True)[:10] if weekly_posts else []

        # Log if we have fewer weekly posts than expected
        if len(weekly_posts) < 10:
            logger.debug(f"📊 Only {len(weekly_posts)} weekly posts available (expected 10+)")

        # Calculate metrics from available weekly posts
        if top_10_weekly:
            # Average upvotes per post (from available posts, max 10)
            total_upvotes_top10 = sum(p.get('score', 0) for p in top_10_weekly)
            num_posts = len(top_10_weekly)
            metrics['avg_upvotes_per_post'] = total_upvotes_top10 / num_posts if num_posts > 0 else 0

            # Average comments per post (from available posts, max 10)
            total_comments_top10 = sum(p.get('num_comments', 0) for p in top_10_weekly)
            metrics['avg_comments_per_post'] = total_comments_top10 / num_posts if num_posts > 0 else 0

            # Engagement: sum of comments / sum of upvotes for available weekly posts
            metrics['engagement'] = total_comments_top10 / total_upvotes_top10 if total_upvotes_top10 > 0 else 0

            # Subreddit score: sqrt(avg_upvotes) * engagement * 1000
            if metrics.get('avg_upvotes_per_post', 0) > 0 and metrics.get('engagement', 0) > 0:
                metrics['subreddit_score'] = (metrics['avg_upvotes_per_post'] ** 0.5) * metrics['engagement'] * 1000
            else:
                metrics['subreddit_score'] = 0
                # Log when engagement is 0 but we have posts
                if total_comments_top10 == 0 and total_upvotes_top10 > 0:
                    logger.debug(f"⚠️ Zero engagement: posts have no comments (upvotes={total_upvotes_top10}, comments=0)")

            logger.debug(f"📊 Metrics calculated: posts={num_posts}, engagement={metrics['engagement']:.4f}, score={metrics['subreddit_score']:.2f}")
        else:
            # No weekly posts available, explicitly set to 0 (not None/NULL)
            metrics['avg_upvotes_per_post'] = 0
            metrics['avg_comments_per_post'] = 0
            metrics['engagement'] = 0
            metrics['subreddit_score'] = 0
            logger.debug("📊 No weekly posts available, all metrics set to 0")

            # Log this important case to Supabase
            try:
                self.supabase.table('system_logs').insert({
                    'timestamp': datetime.now(timezone.utc).isoformat(),
                    'source': 'reddit_scraper',
                    'script_name': 'simple_main',
                    'level': 'warning',
                    'message': f'No weekly posts available for metrics calculation',
                    'context': {
                        'weekly_posts_count': 0,
                        'hot_posts_count': len(hot_posts),
                        'metrics_set_to_zero': True
                    }
                }).execute()
            except:
                pass

        # Best posting time from yearly posts
        if yearly_posts:
            best_hour, best_day = MetricsCalculator.calculate_posting_timing(yearly_posts)
            metrics['best_posting_day'] = best_day
            metrics['best_posting_hour'] = best_hour

        # Content type analysis from hot posts (for informational purposes)
        content_types = defaultdict(list)
        for post in hot_posts:
            content_type = self.determine_content_type(post)
            content_types[content_type].append(post.get('score', 0))

        for content_type, scores in content_types.items():
            avg_score = sum(scores) / len(scores) if scores else 0
            metrics[f'{content_type}_post_avg_score'] = avg_score

        # Find top content type
        if content_types:
            top_type = max(content_types.items(), key=lambda x: sum(x[1]) / len(x[1]) if x[1] else 0)
            metrics['top_content_type'] = top_type[0]

        # Log metrics calculation
        calc_duration = (datetime.now(timezone.utc) - calc_start).total_seconds()
        try:
            self.supabase.table('system_logs').insert({
                'timestamp': datetime.now(timezone.utc).isoformat(),
                'source': 'reddit_scraper',
                'script_name': 'simple_main',
                'level': 'debug',
                'message': 'Calculated subreddit metrics',
                'context': {
                    'engagement': metrics.get('engagement', 0),
                    'subreddit_score': metrics.get('subreddit_score', 0),
                    'avg_upvotes': metrics.get('avg_upvotes_per_post', 0),
                    'avg_comments': metrics.get('avg_comments_per_post', 0),
                    'weekly_posts_used': len(top_10_weekly),
                    'hot_posts_count': len(hot_posts),
                    'action': 'metrics_calculated'
                },
                'duration_ms': int(calc_duration * 1000)
            }).execute()
        except:
            pass

        return metrics

    async def save_posts_batch(self, posts: List[Dict], subreddit_name: str):
        """Save posts directly to database in batches"""
        if not posts:
            logger.info(f"📭 No posts to save for r/{subreddit_name}")
            return

        logger.info(f"🔄 Starting to save {len(posts)} posts for r/{subreddit_name}")
        total_saved = 0
        failed_saves = 0

        # CRITICAL: Ensure subreddit exists in database first (foreign key constraint!)
        logger.info(f"🔍 Checking if r/{subreddit_name} exists in database...")
        try:
            # Check if subreddit exists
            check_result = self.supabase.table('reddit_subreddits').select(
                'name', 'primary_category', 'tags', 'over18'
            ).eq('name', subreddit_name).execute()

            if not check_result.data:
                # Subreddit doesn't exist - create minimal record
                logger.warning(f"⚠️ r/{subreddit_name} not in database - creating minimal record")
                minimal_record = {
                    'name': subreddit_name,
                    'display_name_prefixed': f'r/{subreddit_name}',
                    'url': f'/r/{subreddit_name}/',
                    'review': 'Ok',  # Use valid review status (constraint: Ok, Non Related, User Feed, Banned, No Seller)
                    'primary_category': 'Unknown',
                    'last_scraped_at': datetime.now(timezone.utc).isoformat(),
                    'subscribers': 0,  # Default values for required fields
                    'accounts_active': 0
                }

                try:
                    insert_result = self.supabase.table('reddit_subreddits').insert(minimal_record).execute()
                    logger.info(f"✅ Created minimal subreddit record for r/{subreddit_name}")
                    subreddit_data = {'primary_category': 'Unknown', 'tags': [], 'over18': False}
                except Exception as insert_error:
                    logger.error(f"❌ CRITICAL: Cannot create subreddit record: {insert_error}")
                    logger.error(f"❌ Cannot save posts without subreddit existing (foreign key constraint)")
                    return  # Cannot proceed without subreddit record
            else:
                # Subreddit exists - use its data
                subreddit_data = check_result.data[0]
                logger.debug(f"✅ Subreddit r/{subreddit_name} exists with category={subreddit_data.get('primary_category')}")

        except Exception as e:
            logger.error(f"❌ Error checking/creating subreddit: {e}")
            logger.error(f"❌ Cannot save posts without subreddit record")
            return

        # First, collect all unique authors and ensure they exist
        unique_authors = set()
        for post in posts:
            author = post.get('author')
            if author and author not in ['[deleted]', 'AutoModerator', None]:
                unique_authors.add(author)

        if unique_authors:
            logger.info(f"📝 Ensuring {len(unique_authors)} unique authors exist for r/{subreddit_name}")
            await self.ensure_users_exist(list(unique_authors))

        # Process in batches
        for i in range(0, len(posts), BATCH_SIZE):
            batch = posts[i:i + BATCH_SIZE]
            batch_num = i // BATCH_SIZE + 1
            total_batches = (len(posts) + BATCH_SIZE - 1) // BATCH_SIZE

            logger.info(f"📦 Processing batch {batch_num}/{total_batches} ({len(batch)} posts) for r/{subreddit_name}")

            # Prepare posts for insertion
            post_records = []
            for post_idx, post in enumerate(batch):
                try:
                    # Log first post in detail for debugging
                    if post_idx == 0 and batch_num == 1:
                        logger.debug(f"🔍 Sample post data: id={post.get('id')}, author={post.get('author')}, title={post.get('title', '')[:50]}")

                    record = {
                        'reddit_id': post.get('id'),
                        'title': post.get('title', '')[:500],  # Limit title length
                        'selftext': post.get('selftext', '')[:5000],  # Limit text length
                        'url': post.get('url'),
                        'author_username': post.get('author'),
                        'subreddit_name': subreddit_name,
                        # REMOVED: 'subreddit_id' - this field doesn't exist in the table!
                        'score': post.get('score', 0),
                        'upvote_ratio': post.get('upvote_ratio', 0),
                        'num_comments': post.get('num_comments', 0),
                        'created_utc': datetime.fromtimestamp(post.get('created_utc', 0), tz=timezone.utc).isoformat(),
                        'is_self': post.get('is_self', False),
                        'is_video': post.get('is_video', False),
                        'over_18': post.get('over_18', False),
                        'spoiler': post.get('spoiler', False),
                        'stickied': post.get('stickied', False),
                        'locked': post.get('locked', False),
                        'gilded': post.get('gilded', 0),
                        'distinguished': post.get('distinguished'),
                        'content_type': self.determine_content_type(post),
                        'link_flair_text': post.get('link_flair_text'),
                        'author_flair_text': post.get('author_flair_text'),
                        'scraped_at': datetime.now(timezone.utc).isoformat()
                    }

                    # Add subreddit denormalized fields
                    if subreddit_data:
                        record['sub_primary_category'] = subreddit_data.get('primary_category')
                        record['sub_tags'] = subreddit_data.get('tags', [])
                        record['sub_over18'] = subreddit_data.get('over18', False)

                    post_records.append(record)

                except Exception as e:
                    logger.error(f"⚠️ Error preparing post record: {e}, post_id={post.get('id')}")
                    continue

            # Direct upsert to database
            if post_records:
                try:
                    logger.info(f"💾 Attempting to upsert batch {batch_num}/{total_batches} with {len(post_records)} posts...")

                    # Log the first record structure for debugging
                    if batch_num == 1:
                        sample_keys = list(post_records[0].keys())
                        logger.debug(f"📋 Post record structure: {sample_keys}")

                    result = self.supabase.table('reddit_posts').upsert(
                        post_records,
                        on_conflict='reddit_id'
                    ).execute()

                    # Check if we actually got data back
                    if result and result.data:
                        actual_saved = len(result.data)
                        total_saved += actual_saved
                        logger.info(f"✅ Batch {batch_num} saved: {actual_saved} posts confirmed in database")
                    else:
                        logger.warning(f"⚠️ Batch {batch_num}: Upsert executed but no data returned")

                    self.stats['posts_processed'] += len(post_records)

                except Exception as e:
                    failed_saves += len(post_records)
                    logger.error(f"❌ CRITICAL: Failed to save batch {batch_num} for r/{subreddit_name}")
                    logger.error(f"❌ Error details: {str(e)}")
                    logger.error(f"❌ Error type: {type(e).__name__}")

                    # Log sample record for debugging
                    if post_records:
                        sample = post_records[0].copy()
                        # Truncate long fields for logging
                        if 'selftext' in sample:
                            sample['selftext'] = sample['selftext'][:100] + '...' if len(sample['selftext']) > 100 else sample['selftext']
                        if 'title' in sample:
                            sample['title'] = sample['title'][:100] + '...' if len(sample['title']) > 100 else sample['title']
                        logger.error(f"❌ Failed record sample: {sample}")
            else:
                logger.warning(f"⚠️ No valid records to save in batch {batch_num}")

        # Final summary
        if total_saved > 0:
            logger.info(f"✅ FINAL: Successfully saved {total_saved}/{len(posts)} posts from r/{subreddit_name}")
        else:
            logger.error(f"❌ FINAL: Failed to save any posts from r/{subreddit_name} (attempted {len(posts)} posts)")

        if failed_saves > 0:
            logger.error(f"❌ FINAL: {failed_saves} posts failed to save")

    async def save_users_batch(self, users: List[Dict]):
        """Save users directly to database in batches"""
        if not users:
            logger.debug("No users to save")
            return

        logger.info(f"👥 Saving {len(users)} users to database")
        total_saved = 0
        failed_saves = 0

        # Process in batches
        for i in range(0, len(users), USER_BATCH_SIZE):
            batch = users[i:i + USER_BATCH_SIZE]
            batch_num = i // USER_BATCH_SIZE + 1
            total_batches = (len(users) + USER_BATCH_SIZE - 1) // USER_BATCH_SIZE

            logger.debug(f"Processing user batch {batch_num}/{total_batches} ({len(batch)} users)")

            # Prepare user records
            user_records = []
            for user in batch:
                try:
                    username = user.get('name')
                    if not username or username in ['[deleted]', 'AutoModerator']:
                        logger.debug(f"Skipping invalid username: {username}")
                        continue

                    # Calculate account age in days
                    created_timestamp = user.get('created_utc', 0)
                    account_age_days = None
                    if created_timestamp:
                        created_date = datetime.fromtimestamp(created_timestamp, tz=timezone.utc)
                        account_age_days = (datetime.now(timezone.utc) - created_date).days

                    record = {
                        'username': username,
                        'reddit_id': user.get('id'),
                        'created_utc': datetime.fromtimestamp(user.get('created_utc', 0), tz=timezone.utc).isoformat(),
                        'account_age_days': account_age_days,
                        'comment_karma': user.get('comment_karma', 0),
                        'link_karma': user.get('link_karma', 0),
                        'total_karma': user.get('total_karma', 0),
                        'is_gold': user.get('is_gold', False),
                        'is_mod': user.get('is_mod', False),
                        'is_employee': user.get('is_employee', False),
                        'verified': user.get('verified', False),
                        'has_verified_email': user.get('has_verified_email', False),
                        'icon_img': user.get('icon_img'),
                        'last_scraped_at': datetime.now(timezone.utc).isoformat()
                    }
                    user_records.append(record)

                except Exception as e:
                    logger.error(f"⚠️ Error preparing user record: {e}, username={user.get('name')}")
                    continue

            # Direct upsert to database
            if user_records:
                try:
                    logger.debug(f"💾 Upserting batch {batch_num} with {len(user_records)} users...")

                    result = self.supabase.table('reddit_users').upsert(
                        user_records,
                        on_conflict='username'
                    ).execute()

                    if result and result.data:
                        actual_saved = len(result.data)
                        total_saved += actual_saved
                        logger.info(f"✅ User batch {batch_num}: {actual_saved} users saved")
                    else:
                        logger.warning(f"⚠️ User batch {batch_num}: Upsert executed but no data returned")

                except Exception as e:
                    failed_saves += len(user_records)
                    logger.error(f"❌ Failed to save user batch {batch_num}: {e}")
                    if user_records:
                        logger.error(f"❌ Sample failed user: username={user_records[0].get('username')}, id={user_records[0].get('reddit_id')}")
            else:
                logger.debug(f"No valid users in batch {batch_num}")

        # Final summary
        if total_saved > 0:
            logger.info(f"✅ USERS: Successfully saved {total_saved}/{len(users)} users")
        else:
            logger.warning(f"⚠️ USERS: No users were saved out of {len(users)} attempted")

        if failed_saves > 0:
            logger.error(f"❌ USERS: {failed_saves} users failed to save")

    async def ensure_users_exist(self, usernames: List[str]):
        """Ensure users exist in database with minimal records"""
        if not usernames:
            logger.debug("No usernames to ensure")
            return

        unique_usernames = list(set(usernames))  # Remove duplicates
        logger.info(f"📝 Ensuring {len(unique_usernames)} unique users exist in database")
        total_ensured = 0
        failed_ensures = 0

        # Process in batches
        for i in range(0, len(unique_usernames), USER_BATCH_SIZE):
            batch = unique_usernames[i:i + USER_BATCH_SIZE]
            batch_num = i // USER_BATCH_SIZE + 1
            total_batches = (len(unique_usernames) + USER_BATCH_SIZE - 1) // USER_BATCH_SIZE

            logger.debug(f"Processing ensure batch {batch_num}/{total_batches} ({len(batch)} users)")

            # Create minimal user records
            user_records = []
            for username in batch:
                if username and username not in ['[deleted]', 'AutoModerator', None]:
                    record = {
                        'username': username,
                        'last_scraped_at': datetime.now(timezone.utc).isoformat()
                    }
                    user_records.append(record)
                else:
                    logger.debug(f"Skipping invalid/system username: {username}")

            # Direct upsert to database
            if user_records:
                try:
                    logger.debug(f"💾 Ensuring batch {batch_num} with {len(user_records)} users...")

                    result = self.supabase.table('reddit_users').upsert(
                        user_records,
                        on_conflict='username'
                    ).execute()

                    if result and result.data:
                        actual_ensured = len(result.data)
                        total_ensured += actual_ensured
                        logger.debug(f"✅ Ensure batch {batch_num}: {actual_ensured} users confirmed")
                    else:
                        logger.warning(f"⚠️ Ensure batch {batch_num}: Upsert executed but no confirmation")

                except Exception as e:
                    failed_ensures += len(user_records)
                    logger.error(f"❌ Failed to ensure users in batch {batch_num}: {e}")
                    logger.error(f"❌ Error type: {type(e).__name__}")
                    if user_records:
                        logger.error(f"❌ Sample username that failed: {user_records[0].get('username')}")
            else:
                logger.debug(f"No valid usernames in batch {batch_num}")

        # Final summary
        if total_ensured > 0:
            logger.info(f"✅ ENSURE: Successfully ensured {total_ensured}/{len(unique_usernames)} users exist")

        if failed_ensures > 0:
            logger.error(f"❌ ENSURE: {failed_ensures} users failed to ensure")

    async def update_subreddit(self, name: str, about_data: Dict, metrics: Dict,
                                rules: List[Dict] = None, verification_required: bool = False):
        """Update subreddit with about info and metrics"""
        try:
            update_data = {
                'name': name,
                'display_name_prefixed': about_data.get('display_name_prefixed'),
                'title': about_data.get('title'),
                'public_description': about_data.get('public_description'),
                'description': about_data.get('description'),
                'subscribers': about_data.get('subscribers', 0),
                'accounts_active': about_data.get('accounts_active', 0),
                'over18': about_data.get('over18', False),
                'allow_images': about_data.get('allow_images', True),
                'allow_videos': about_data.get('allow_videos', True),
                'allow_polls': about_data.get('allow_polls', False),  # NEW field
                'spoilers_enabled': about_data.get('spoilers_enabled', False),  # NEW field
                'subreddit_type': about_data.get('subreddit_type'),
                'icon_img': about_data.get('icon_img'),
                'banner_img': about_data.get('banner_img'),
                'header_img': about_data.get('header_img'),
                'community_icon': about_data.get('community_icon'),
                'primary_color': about_data.get('primary_color'),
                'key_color': about_data.get('key_color'),
                'wiki_enabled': about_data.get('wiki_enabled', False),
                'is_quarantined': about_data.get('quarantine', False),
                'submission_type': about_data.get('submission_type'),
                'url': about_data.get('url'),
                'last_scraped_at': datetime.now(timezone.utc).isoformat(),
                **metrics  # Add all calculated metrics (including engagement and subreddit_score)
            }

            # Add rules if available
            if rules:
                update_data['rules_data'] = rules

            # Only set verification_required to True, never overwrite existing True with False
            if verification_required:
                update_data['verification_required'] = True

            # Handle created_utc separately
            if about_data.get('created_utc'):
                update_data['created_utc'] = datetime.fromtimestamp(
                    about_data['created_utc'],
                    tz=timezone.utc
                ).isoformat()

            # Upsert to database
            self.supabase.table('reddit_subreddits').upsert(
                update_data,
                on_conflict='name'
            ).execute()

            logger.debug(f"📊 Updated r/{name} with metrics")

        except Exception as e:
            logger.error(f"Error updating subreddit {name}: {e}")

    async def update_subreddit_requirements(self, name: str, requirements: Dict):
        """Update subreddit minimum requirements"""
        try:
            update_data = {
                'name': name,
                'min_post_karma': requirements.get('min_post_karma'),
                'min_comment_karma': requirements.get('min_comment_karma'),
                'min_account_age_days': requirements.get('min_account_age_days'),
                'requirement_sample_size': requirements.get('sample_size', 0),
                'requirements_last_updated': datetime.now(timezone.utc).isoformat()
            }

            self.supabase.table('reddit_subreddits').upsert(
                update_data,
                on_conflict='name'
            ).execute()

            logger.debug(f"📊 Updated requirements for r/{name}")

        except Exception as e:
            logger.error(f"Error updating requirements for {name}: {e}")

    async def save_review_status(self, name: str, status: str):
        """Save subreddit review status"""
        try:
            self.supabase.table('reddit_subreddits').upsert({
                'name': name,
                'review': status,
                'updated_at': datetime.now(timezone.utc).isoformat()
            }, on_conflict='name').execute()

            logger.debug(f"💾 Saved review status for r/{name}: {status}")

        except Exception as e:
            logger.error(f"Error saving review status for {name}: {e}")

    async def queue_new_subreddits(self, subreddit_names: Set[str]):
        """Queue newly discovered subreddits for processing"""
        for name in subreddit_names:
            # Skip if already known
            if (name in self.non_related_subreddits or
                name in self.user_feed_subreddits or
                name in self.banned_subreddits or
                name in self.processed_subreddits):
                continue

            try:
                # Insert as new subreddit (will be processed in next cycle)
                self.supabase.table('reddit_subreddits').upsert({
                    'name': name,
                    'created_at': datetime.now(timezone.utc).isoformat()
                }, on_conflict='name').execute()

                logger.debug(f"🆕 Queued new subreddit: r/{name}")

            except Exception as e:
                logger.debug(f"Error queueing subreddit {name}: {e}")

    def determine_content_type(self, post: Dict) -> str:
        """Determine the content type of a post"""
        if post.get('is_video'):
            return 'video'
        elif post.get('is_gallery'):
            return 'gallery'
        elif post.get('url', '').endswith(('.jpg', '.png', '.gif', '.jpeg')):
            return 'image'
        elif post.get('is_self'):
            return 'text'
        else:
            return 'link'

    async def flush_batches(self):
        """Flush any remaining batches"""
        # This is now handled directly in save methods
        # Keeping method for compatibility
        pass

    async def log_statistics(self):
        """Log final statistics"""
        duration = (datetime.now(timezone.utc) - self.stats['start_time']).total_seconds()

        # Log to system_logs
        try:
            self.supabase.table('system_logs').insert({
                'timestamp': datetime.now(timezone.utc).isoformat(),
                'source': 'reddit_scraper',
                'script_name': 'simple_main',
                'level': 'success',
                'message': f'Scraping cycle completed',
                'context': {
                    'version': SCRAPER_VERSION,
                    'duration_seconds': duration,
                    'subreddits_processed': self.stats['subreddits_processed'],
                    'users_processed': self.stats['users_processed'],
                    'posts_processed': self.stats['posts_processed'],
                    'new_subreddits_discovered': self.stats['new_subreddits_discovered'],
                    'errors': len(self.stats['errors'])
                },
                'duration_ms': int(duration * 1000)
            }).execute()
        except Exception as e:
            logger.error(f"Error logging statistics: {e}")

        logger.info(f"""
        📊 Scraping Statistics:
        ├─ Duration: {duration:.1f}s
        ├─ Subreddits: {self.stats['subreddits_processed']}
        ├─ Users: {self.stats['users_processed']}
        ├─ Posts: {self.stats['posts_processed']}
        ├─ New Subreddits: {self.stats['new_subreddits_discovered']}
        └─ Errors: {len(self.stats['errors'])}
        """)

    async def cleanup(self):
        """Clean up resources"""
        logger.info("🧹 Cleaning up resources")

        # Clean up API pool
        if self.api_pool:
            self.api_pool.cleanup()

        # Clear memory
        self.non_related_subreddits.clear()
        self.user_feed_subreddits.clear()
        self.banned_subreddits.clear()
        self.processed_subreddits.clear()

        logger.info("✅ Cleanup completed")


async def main():
    """Main entry point"""
    scraper = SimplifiedRedditScraper()

    try:
        # Initialize
        await scraper.initialize()

        # Run one cycle
        await scraper.run_scraping_cycle()

    except Exception as e:
        logger.error(f"Fatal error: {e}")
    finally:
        await scraper.cleanup()


if __name__ == "__main__":
    asyncio.run(main())