#!/usr/bin/env python3
"""
Reddit Scraper v2.0 - Modular Architecture
Main orchestrator for the restructured Reddit scraper
"""
import asyncio
import logging
import os
import sys
import random
import time
from datetime import datetime, timezone
from typing import Dict, Any, Optional, List, Callable
from collections import defaultdict
from supabase import create_client
from dotenv import load_dotenv
from pathlib import Path

# Add API directory to path for consistent imports
import sys
import os
api_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if api_dir not in sys.path:
    sys.path.insert(0, api_dir)

# Use consistent absolute imports from api directory
from core.clients.api_pool import ThreadSafeAPIPool
from core.config.proxy_manager import ProxyManager
from core.cache.cache_manager import AsyncCacheManager
from core.database.batch_writer import BatchWriter
from scrapers.reddit.processors.calculator import MetricsCalculator
from scrapers.reddit.scrapers.subreddit import SubredditScraper
from scrapers.reddit.scrapers.user import UserScraper
from core.utils.supabase_logger import SupabaseLogHandler
from core.utils.memory_monitor import MemoryMonitor, set_memory_monitor

# Load environment variables from parent directory
env_path = Path(__file__).parent.parent.parent / '.env'
load_dotenv(env_path)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Version
SCRAPER_VERSION = "2.0.0"


class RedditScraperV2:
    """
    Main orchestrator for the modular Reddit scraper.
    Coordinates all components and manages the scraping workflow.
    """

    # Thread labels for better debugging (removed ANSI colors for cleaner logs)
    # Colors were causing log pollution in database and files

    def __init__(self):
        """Initialize the Reddit scraper orchestrator"""
        self.supabase = None
        self.proxy_manager = None
        self.api_pool = None
        self.cache_manager = None
        self.batch_writer = None
        self.metrics_calculator = None

        # Scrapers
        self.scrapers = []

        # Statistics
        self.stats = {
            'start_time': None,
            'end_time': None,
            'subreddits_processed': 0,
            'users_processed': 0,
            'posts_processed': 0,
            'discoveries_made': 0,
            'errors': [],
            # Performance tracking (matches old scraper)
            'proxy_requests': 0,
            'direct_requests': 0,
            'total_requests': 0,
            'cache_hits': 0,
            'rate_limits': 0,
            'users_skipped_rate_limited': 0
        }

        # User tracking for OK subreddits
        self.discovered_users = set()

        # Requirements tracking
        self.subreddit_requirements = {}  # {subreddit_name: {'users': [], 'post_karmas': [], 'comment_karmas': [], 'ages': []}}

        # Stealth configuration - matches old scraper for anti-detection
        self.stealth_config = {
            'min_delay': 2.5,  # Minimum delay between requests (seconds)
            'max_delay': 6.0,  # Maximum delay between requests (seconds)
            'burst_delay': (12, 20),  # Longer delay every N requests
            'burst_frequency': random.randint(8, 15),  # Every N requests take a longer break
            'request_count': 0,
            'last_request_time': 0
        }

    async def initialize(self):
        """Initialize all components"""
        logger.info(f"🚀 Initializing Reddit Scraper v{SCRAPER_VERSION}")

        # Initialize Supabase
        supabase_url = os.getenv("SUPABASE_URL")
        supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

        if not supabase_url or not supabase_key:
            raise Exception("Supabase credentials not configured")

        self.supabase = create_client(supabase_url, supabase_key)
        logger.info("✅ Supabase client initialized")

        # Initialize Supabase logging handler
        try:
            # Check if Supabase handler already exists
            handler_exists = any(isinstance(h, SupabaseLogHandler) for h in logger.handlers)
            if not handler_exists:
                supabase_handler = SupabaseLogHandler(self.supabase, source='reddit_scraper')
                supabase_handler.setLevel(logging.INFO)  # Only send INFO and above to database
                logger.addHandler(supabase_handler)
                logger.info("🔗 Supabase logging handler initialized")
        except Exception as e:
            logger.error(f"❌ Failed to initialize Supabase logging: {e}")

        # Load categorized subreddit lists
        self.reviewed_subreddits = set()  # 'Ok' and 'No Seller' subreddits
        self.ok_subreddits = set()        # Just 'Ok' subreddits for requirements
        self.non_related_subreddits = set()  # 'Non Related' subreddits to skip
        self.user_feed_subreddits = set()    # 'User Feed' subreddits (like u_username)
        self.banned_subreddits = set()       # 'Banned' subreddits
        await self._load_reviewed_subreddits()

        # Initialize proxy manager and load proxies - ALL proxies must be working
        self.proxy_manager = ProxyManager(self.supabase)
        if not await self.proxy_manager.load_proxies():
            logger.error("❌ FATAL: Proxy validation failed - one or more proxies are not working!")
            logger.error("❌ All proxies must pass validation for the scraper to run.")
            raise Exception("Proxy validation failed - ALL proxies must be working to run the scraper")

        # Initialize API pool with thread count from proxy manager
        self.api_pool = ThreadSafeAPIPool(self.proxy_manager)
        self.api_pool.initialize()

        # Initialize cache manager
        self.cache_manager = AsyncCacheManager()
        logger.info("✅ Cache manager initialized")

        # Initialize batch writer
        self.batch_writer = BatchWriter(self.supabase)
        await self.batch_writer.start()
        logger.info("✅ Batch writer initialized")

        # Initialize metrics calculator
        self.metrics_calculator = MetricsCalculator()
        logger.info("✅ Metrics calculator initialized")

        # Initialize memory monitor
        self.memory_monitor = MemoryMonitor(
            warning_threshold=0.70,   # 70% memory usage
            error_threshold=0.85,     # 85% memory usage
            critical_threshold=0.90,   # 90% memory usage
            check_interval=60         # Check every 60 seconds
        )

        # Register cleanup callbacks
        self.memory_monitor.register_cleanup_callback(self._memory_cleanup_callback)
        await self.memory_monitor.start()
        set_memory_monitor(self.memory_monitor)  # Set global instance
        logger.info("✅ Memory monitor initialized")

        logger.info("✅ All components initialized successfully")
        await self.log_to_database("info", f"Reddit Scraper v{SCRAPER_VERSION} initialized")

    async def _load_reviewed_subreddits(self):
        """Load already reviewed/categorized subreddits from database"""
        try:
            # Load all categorized subreddits
            response = self.supabase.table('reddit_subreddits').select(
                'name, review'
            ).in_('review', ['Ok', 'No Seller', 'Non Related', 'User Feed', 'Banned']).execute()

            if response.data:
                for sub in response.data:
                    name = sub['name'].lower()
                    review = sub.get('review', '')

                    if review in ['Ok', 'No Seller']:
                        self.reviewed_subreddits.add(name)
                        if review == 'Ok':
                            self.ok_subreddits.add(name)
                    elif review == 'Non Related':
                        self.non_related_subreddits.add(name)
                    elif review == 'User Feed':
                        self.user_feed_subreddits.add(name)
                    elif review == 'Banned':
                        self.banned_subreddits.add(name)

                logger.info(f"Loaded categorized subreddits: "
                          f"{len(self.ok_subreddits)} Ok, "
                          f"{len(self.reviewed_subreddits) - len(self.ok_subreddits)} No Seller, "
                          f"{len(self.non_related_subreddits)} Non Related, "
                          f"{len(self.user_feed_subreddits)} User Feed, "
                          f"{len(self.banned_subreddits)} Banned")

        except Exception as e:
            logger.error(f"Error loading reviewed subreddits: {e}")

    async def run_scraping_cycle(self, control_checker: Optional[Callable] = None):
        """
        Run a complete scraping cycle.

        Args:
            control_checker: Optional function to check if scraping should continue
        """
        self.stats['start_time'] = datetime.now(timezone.utc).isoformat()
        logger.info("🔄 Starting scraping cycle")

        try:
            # Step 1: Load target subreddits from database by category
            subreddits_by_category = await self.load_target_subreddits()
            ok_subreddits = subreddits_by_category['ok']
            no_seller_subreddits = subreddits_by_category['no_seller']

            total_count = len(ok_subreddits) + len(no_seller_subreddits)
            logger.info(f"📋 Loaded {total_count} target subreddits: "
                       f"{len(ok_subreddits)} OK, {len(no_seller_subreddits)} No Seller")

            if total_count == 0:
                logger.warning("No target subreddits to process")
                return

            # Step 2: Create scraper instances for each thread
            thread_count = self.proxy_manager.get_total_threads()
            await self.create_scrapers(thread_count)

            # Step 3: Combine and track subreddit types
            all_subreddits = []
            self.subreddit_types = {}  # Track type for each subreddit

            for sub in ok_subreddits:
                all_subreddits.append(sub)
                self.subreddit_types[sub['name']] = 'ok'

            for sub in no_seller_subreddits:
                all_subreddits.append(sub)
                self.subreddit_types[sub['name']] = 'no_seller'

            # Step 4: Distribute work across threads
            subreddit_batches = self.distribute_work(all_subreddits, thread_count)

            # Step 5: Process subreddits in parallel
            await self.process_subreddits_parallel(subreddit_batches, control_checker)

            # Step 6: Process discovered users (only from OK subreddits)
            await self.process_discovered_users(control_checker)

            # Step 7: Discovery mode - find new subreddits
            await self.run_discovery_mode(control_checker)

            # Step 8: Final batch write flush
            logger.info("📊 Pre-flush stats: posts_processed={}, users_processed={}".format(
                self.stats['posts_processed'], self.stats['users_processed']))
            await self.batch_writer.flush_all()
            logger.info("✅ Completed final flush")

            # Step 9: Update statistics
            self.stats['end_time'] = datetime.now(timezone.utc).isoformat()
            await self.log_statistics()

        except Exception as e:
            logger.error(f"❌ Error in scraping cycle: {e}")
            self.stats['errors'].append({
                'timestamp': datetime.now(timezone.utc).isoformat(),
                'error': str(e)
            })
            await self.log_to_database("error", f"Scraping cycle failed: {e}")

        finally:
            # Clean up
            await self.cleanup()

    async def load_target_subreddits(self) -> Dict[str, List[Dict[str, Any]]]:
        """Load target subreddits from database by category"""
        try:
            # Get OK subreddits with a reasonable limit to prevent memory overflow
            all_ok_subreddits = []
            offset = 0
            batch_size = 1000
            max_subreddits = 2000  # Limit total subreddits to prevent memory issues

            while len(all_ok_subreddits) < max_subreddits:
                ok_response = self.supabase.table('reddit_subreddits').select('*').eq(
                    'review', 'Ok'
                ).range(offset, offset + batch_size - 1).execute()

                if ok_response.data:
                    all_ok_subreddits.extend(ok_response.data)
                    if len(ok_response.data) < batch_size:
                        break  # No more results
                    offset += batch_size
                else:
                    break

            if len(all_ok_subreddits) >= max_subreddits:
                logger.warning(f"⚠️ Reached maximum limit of {max_subreddits} OK subreddits. "
                             f"Consider processing in smaller batches or increasing limit.")

            # Get No Seller subreddits
            no_seller_response = self.supabase.table('reddit_subreddits').select('*').eq(
                'review', 'No Seller'
            ).limit(500).execute()  # Should be enough for No Seller

            ok_subreddits = all_ok_subreddits  # Use the accumulated list from pagination
            no_seller_subreddits = no_seller_response.data if no_seller_response.data else []

            # Filter for subreddits that need updating
            current_time = datetime.now(timezone.utc)

            def needs_update(subreddit):
                last_updated = subreddit.get('updated_at')
                if last_updated:
                    try:
                        last_updated_dt = datetime.fromisoformat(
                            last_updated.replace('Z', '+00:00')
                        )
                        hours_since_update = (current_time - last_updated_dt).total_seconds() / 3600
                        return hours_since_update >= 24
                    except Exception:
                        return True
                return True

            # Filter and sort OK subreddits
            ok_filtered = [sub for sub in ok_subreddits if needs_update(sub)]
            ok_filtered.sort(key=lambda x: x.get('subreddit_score', 0), reverse=True)

            # Filter and sort No Seller subreddits
            no_seller_filtered = [sub for sub in no_seller_subreddits if needs_update(sub)]
            no_seller_filtered.sort(key=lambda x: x.get('subreddit_score', 0), reverse=True)

            return {
                'ok': ok_filtered,  # Process ALL OK subreddits
                'no_seller': no_seller_filtered  # Process ALL No Seller subreddits
            }

        except Exception as e:
            logger.error(f"Error loading target subreddits: {e}")
            return {'ok': [], 'no_seller': []}

    async def create_scrapers(self, thread_count: int):
        """Create scraper instances for each thread"""
        self.scrapers = []

        for thread_id in range(thread_count):
            # Create subreddit scraper
            subreddit_scraper = SubredditScraper(self.supabase, thread_id)
            await subreddit_scraper.initialize(
                self.api_pool,
                self.proxy_manager,
                self.cache_manager,
                self.batch_writer
            )
            self.scrapers.append(subreddit_scraper)

        logger.info(f"✅ Created {len(self.scrapers)} scraper instances")

    def distribute_work(self, items: List[Any], thread_count: int) -> List[List[Any]]:
        """Distribute work evenly across threads"""
        batches = [[] for _ in range(thread_count)]

        for i, item in enumerate(items):
            batch_index = i % thread_count
            batches[batch_index].append(item)

        return batches

    async def process_subreddits_parallel(self, subreddit_batches: List[List[Dict]],
                                         control_checker: Optional[Callable]):
        """Process subreddit batches in parallel across threads"""
        logger.info(f"🔧 Processing subreddits across {len(subreddit_batches)} threads")

        tasks = []
        for thread_id, batch in enumerate(subreddit_batches):
            if batch:  # Only create task if batch has items
                scraper = self.scrapers[thread_id]
                task = asyncio.create_task(
                    self.process_subreddit_batch(scraper, batch, control_checker)
                )
                tasks.append(task)

        # Wait for all tasks to complete
        results = await asyncio.gather(*tasks, return_exceptions=True)

        # Log any exceptions
        for i, result in enumerate(results):
            if isinstance(result, Exception):
                logger.error(f"Thread {i} failed: {result}")
                self.stats['errors'].append({
                    'thread': i,
                    'error': str(result)
                })

    async def process_subreddit_batch(self, scraper: SubredditScraper,
                                     subreddits: List[Dict],
                                     control_checker: Optional[Callable]):
        """Process a batch of subreddits with a single scraper instance"""
        for i, subreddit in enumerate(subreddits):
            if not scraper.should_continue(control_checker):
                logger.info(f"Thread {scraper.thread_id} stopping due to control check")
                break

            try:
                # Check cache first
                subreddit_name = subreddit['name']
                subreddit_type = self.subreddit_types.get(subreddit_name, 'ok')

                if self.cache_manager.is_subreddit_processed(subreddit_name):
                    logger.debug(f"Skipping cached subreddit: r/{subreddit_name}")
                    continue

                # Log subreddit type
                type_indicator = "📊 [No Seller]" if subreddit_type == 'no_seller' else "✅ [OK]"
                logger.info(f"Thread {scraper.thread_id}: {type_indicator} Processing r/{subreddit_name}")

                # Scrape subreddit
                result = await scraper.scrape(subreddit_name=subreddit_name)

                if result and result.get('success'):
                    self.stats['subreddits_processed'] += 1

                    # Calculate metrics
                    calculated_data = self.metrics_calculator.calculate_all_metrics(
                        result.get('hot_posts', []),
                        result.get('top_posts', []),  # Weekly posts for metrics
                        result.get('yearly_posts', [])  # Yearly posts for timing analysis
                    )

                    # Merge calculated data
                    final_data = {**result.get('subreddit_data', {}), **calculated_data}

                    # Apply 20% penalty for No Seller subreddits
                    if subreddit_type == 'no_seller' and 'subreddit_score' in final_data:
                        original_score = final_data['subreddit_score']
                        final_data['subreddit_score'] = original_score * 0.8
                        logger.debug(f"Applied No Seller penalty: {original_score:.1f} -> {final_data['subreddit_score']:.1f}")

                    # Save to database via batch writer
                    logger.info(f"📊 Saving processed data for r/{subreddit_name} to batch writer")
                    logger.debug(f"  Final data keys: {list(final_data.keys())}")
                    if 'subreddit_score' in final_data:
                        logger.debug(f"  Score: {final_data.get('subreddit_score', 0):.1f}, "
                                   f"Engagement: {final_data.get('engagement', 0):.4f}")
                    await self.batch_writer.add_subreddit(final_data)

                    # Mark as processed in cache
                    self.cache_manager.mark_subreddit_processed(subreddit_name)

                    # Process posts if available (save ALL types)
                    if result.get('hot_posts'):
                        await self.batch_writer.add_posts(result['hot_posts'])
                        self.stats['posts_processed'] += len(result['hot_posts'])

                    if result.get('top_posts'):  # Weekly posts
                        await self.batch_writer.add_posts(result['top_posts'])
                        self.stats['posts_processed'] += len(result['top_posts'])
                        logger.debug(f"💾 Saved {len(result['top_posts'])} weekly posts from r/{subreddit_name}")

                    if result.get('yearly_posts'):  # Yearly posts
                        await self.batch_writer.add_posts(result['yearly_posts'])
                        self.stats['posts_processed'] += len(result['yearly_posts'])
                        logger.debug(f"💾 Saved {len(result['yearly_posts'])} yearly posts from r/{subreddit_name}")

                    # For OK subreddits, track users for later analysis
                    if subreddit_type == 'ok' and result.get('hot_posts'):
                        await self.track_users_from_posts(result['hot_posts'], subreddit_name)

                # Apply stealth delay between subreddits
                await self.stealth_delay("subreddit_analysis")
                await self.randomize_request_pattern()

                # Periodic flush every 10 subreddits to ensure data is saved
                if (i + 1) % 10 == 0:
                    logger.info(f"📤 Periodic flush after processing {i + 1} subreddits")
                    await self.batch_writer.flush_all()

            except Exception as e:
                logger.error(f"Error processing subreddit {subreddit.get('name')}: {e}")

    async def track_users_from_posts(self, posts: List[Dict], subreddit_name: str):
        """Track users from OK subreddit posts for later analysis"""
        for post in posts:
            author = post.get('author', '')
            if author and author not in ['[deleted]', 'AutoModerator']:
                self.discovered_users.add(author)

                # Initialize requirements tracking for this subreddit if not exists
                if subreddit_name not in self.subreddit_requirements:
                    self.subreddit_requirements[subreddit_name] = {
                        'users': [],
                        'post_karmas': [],
                        'comment_karmas': [],
                        'ages': []
                    }

    async def process_discovered_users(self, control_checker: Optional[Callable]):
        """Process users discovered from subreddit analysis"""

        # Use discovered users from OK subreddits instead of database query
        if not self.discovered_users:
            logger.info("No users discovered from OK subreddits")
            return

        logger.info(f"👥 Processing {len(self.discovered_users)} discovered users")

        try:

            # Create user scraper for analysis
            user_scraper = UserScraper(self.supabase, 0)
            await user_scraper.initialize(
                self.api_pool,
                self.proxy_manager,
                self.cache_manager,
                self.batch_writer
            )

            # Process users in batches
            users_list = list(self.discovered_users)[:50]  # Limit to 50 users per cycle
            for username in users_list:
                if not user_scraper.should_continue(control_checker):
                    break

                if self.cache_manager.is_user_processed(username):
                    continue

                try:
                    result = await user_scraper.scrape(username=username)
                    if result and result.get('success'):
                        self.stats['users_processed'] += 1

                        # Track user for requirements calculation
                        user_data = result.get('user_data', {})
                        if user_data:
                            await self.update_requirements_tracking(user_data, username)

                        # Track discoveries
                        if result.get('discovered_subreddits'):
                            self.stats['discoveries_made'] += len(
                                result['discovered_subreddits']
                            )

                except Exception as e:
                    logger.error(f"Error processing user {username}: {e}")

                # Apply stealth delay for user analysis
                await self.stealth_delay("user_analysis")
                await self.randomize_request_pattern()

            # Calculate and save minimum requirements
            await self.calculate_and_save_requirements()

        except Exception as e:
            logger.error(f"Error in user processing: {e}")

    async def update_requirements_tracking(self, user_data: Dict, username: str):
        """Track user requirements for subreddit minimum requirements calculation"""
        try:
            # Get user's activity in each subreddit
            user_posts = await self.get_user_subreddit_activity(username)

            for subreddit, activity in user_posts.items():
                if subreddit in self.subreddit_requirements:
                    req = self.subreddit_requirements[subreddit]
                    req['users'].append(username)
                    req['post_karmas'].append(user_data.get('link_karma', 0))
                    req['comment_karmas'].append(user_data.get('comment_karma', 0))

                    # Calculate account age in days
                    created_utc = user_data.get('created_utc')
                    if created_utc:
                        try:
                            created_dt = datetime.fromisoformat(created_utc.replace('Z', '+00:00'))
                            age_days = (datetime.now(timezone.utc) - created_dt).days
                            req['ages'].append(age_days)
                        except Exception:
                            pass

        except Exception as e:
            logger.debug(f"Error tracking requirements for {username}: {e}")

    async def get_user_subreddit_activity(self, username: str) -> Dict[str, int]:
        """Get user's activity count per subreddit"""
        try:
            # Query user's posts from database
            response = self.supabase.table('reddit_posts').select(
                'subreddit_name'
            ).eq('author', username).execute()

            if not response.data:
                return {}

            # Count posts per subreddit
            activity = defaultdict(int)
            for post in response.data:
                subreddit = post.get('subreddit_name', '').lower()
                if subreddit:
                    activity[subreddit] += 1

            return dict(activity)

        except Exception as e:
            logger.debug(f"Error getting user activity: {e}")
            return {}

    async def calculate_and_save_requirements(self):
        """Calculate and save minimum requirements for each subreddit"""
        for subreddit_name, req_data in self.subreddit_requirements.items():
            if not req_data['users']:
                continue

            try:
                # Calculate percentiles (25th percentile for minimum requirements)
                import numpy as np

                post_karmas = sorted(req_data['post_karmas'])
                comment_karmas = sorted(req_data['comment_karmas'])
                ages = sorted(req_data['ages'])

                min_post_karma = int(np.percentile(post_karmas, 25)) if post_karmas else 0
                min_comment_karma = int(np.percentile(comment_karmas, 25)) if comment_karmas else 0
                min_account_age_days = int(np.percentile(ages, 25)) if ages else 0

                # Update subreddit with requirements
                update_data = {
                    'min_post_karma': min_post_karma,
                    'min_comment_karma': min_comment_karma,
                    'min_account_age_days': min_account_age_days,
                    'requirements_sample_size': len(req_data['users']),
                    'requirements_updated_at': datetime.now(timezone.utc).isoformat()
                }

                self.supabase.table('reddit_subreddits').update(update_data).eq(
                    'name', subreddit_name.lower()
                ).execute()

                logger.info(f"📊 Updated requirements for r/{subreddit_name}: "
                           f"post_karma≥{min_post_karma}, comment_karma≥{min_comment_karma}, "
                           f"age≥{min_account_age_days}d (n={len(req_data['users'])})")

            except Exception as e:
                logger.error(f"Error calculating requirements for r/{subreddit_name}: {e}")

    async def run_discovery_mode(self, control_checker: Optional[Callable] = None):
        """Discovery mode - find and process newly discovered subreddits"""
        logger.info("🔍 Starting discovery mode for new subreddits")

        try:
            # Get pending subreddits (not reviewed) OR incomplete subreddits
            # Incomplete = missing title or has 0/NULL subscribers
            response = self.supabase.table('reddit_subreddits').select(
                'name, title, subscribers, review'
            ).or_(
                'review.is.null,'
                'title.is.null,'
                'subscribers.is.null,'
                'subscribers.eq.0'
            ).order(
                'subscribers', desc=True
            ).limit(500).execute()  # Increase limit to process more subreddits in discovery

            if not response.data:
                logger.info("No pending or incomplete subreddits to process in discovery mode")
                return

            pending_subreddits = response.data

            # Count new vs incomplete
            new_count = sum(1 for s in pending_subreddits if s.get('review') is None and s.get('title') is not None)
            incomplete_count = sum(1 for s in pending_subreddits if s.get('title') is None or s.get('subscribers') in (None, 0))

            logger.info(f"📋 Found {len(pending_subreddits)} subreddits for discovery: "
                       f"{new_count} new, {incomplete_count} incomplete")

            for subreddit_data in pending_subreddits:
                if control_checker and not control_checker():
                    logger.info("Discovery mode stopped by control checker")
                    break

                name = subreddit_data['name'].lower()

                # Skip if already categorized (unless it's incomplete)
                is_incomplete = (subreddit_data.get('title') is None or
                               subreddit_data.get('subscribers') in (None, 0))

                if not is_incomplete:
                    # Skip if already has a review
                    if subreddit_data.get('review'):
                        continue

                    # Skip if already categorized in memory
                    if self._should_skip_subreddit(name):
                        continue

                # Check if it's a User Feed
                if name.startswith('u_'):
                    await self._mark_as_user_feed(name)
                    continue

                status = "incomplete" if is_incomplete else "pending"
                logger.info(f"🔍 Processing {status} subreddit: r/{name}")

                # Use first available scraper for discovery
                if self.scrapers:
                    scraper = self.scrapers[0]
                    result = await scraper.scrape(subreddit_name=name)

                    if result:
                        if result.get('error') == 'banned':
                            await self._mark_as_banned(name)
                        elif result.get('error') == 'private':
                            await self._mark_as_non_related(name, "Private subreddit")
                        elif result.get('success'):
                            # Calculate metrics for discovery
                            calculated_data = self.metrics_calculator.calculate_all_metrics(
                                result.get('hot_posts', []),
                                result.get('top_posts', []),  # Weekly posts for metrics
                                result.get('yearly_posts', [])  # Yearly posts for timing analysis
                            )

                            # Save discovery data
                            final_data = {**result.get('subreddit_data', {}), **calculated_data}
                            await self.batch_writer.add_subreddit(final_data)
                            self.stats['discoveries_made'] += 1

                            # Save all post types from discovered subreddit
                            if result.get('hot_posts'):
                                await self.batch_writer.add_posts(result['hot_posts'])
                                self.stats['posts_processed'] += len(result['hot_posts'])
                            if result.get('top_posts'):
                                await self.batch_writer.add_posts(result['top_posts'])
                                self.stats['posts_processed'] += len(result['top_posts'])
                            if result.get('yearly_posts'):
                                await self.batch_writer.add_posts(result['yearly_posts'])
                                self.stats['posts_processed'] += len(result['yearly_posts'])

                # Apply stealth delay for discovery mode
                await self.stealth_delay("request")
                await self.randomize_request_pattern()

        except Exception as e:
            logger.error(f"Error in discovery mode: {e}")

    def _should_skip_subreddit(self, name: str) -> bool:
        """Check if subreddit should be skipped"""
        name_lower = name.lower()

        # Skip if already reviewed
        if name_lower in self.reviewed_subreddits:
            return True

        # Skip if marked as Non Related
        if name_lower in self.non_related_subreddits:
            return True

        # Skip if User Feed
        if name_lower.startswith('u_') or name_lower in self.user_feed_subreddits:
            return True

        # Skip if Banned
        if name_lower in self.banned_subreddits:
            return True

        # Skip if recently processed (still in cache)
        if self.cache_manager and self.cache_manager.is_subreddit_processed(name):
            return True

        return False

    async def _mark_as_user_feed(self, name: str):
        """Mark subreddit as User Feed"""
        try:
            self.supabase.table('reddit_subreddits').update({
                'review': 'User Feed',
                'updated_at': datetime.now(timezone.utc).isoformat()
            }).eq('name', name.lower()).execute()
            self.user_feed_subreddits.add(name.lower())
            logger.info(f"Marked r/{name} as User Feed")
        except Exception as e:
            logger.error(f"Error marking r/{name} as User Feed: {e}")

    async def _mark_as_banned(self, name: str):
        """Mark subreddit as Banned"""
        try:
            self.supabase.table('reddit_subreddits').update({
                'review': 'Banned',
                'updated_at': datetime.now(timezone.utc).isoformat()
            }).eq('name', name.lower()).execute()
            self.banned_subreddits.add(name.lower())
            logger.info(f"Marked r/{name} as Banned")
        except Exception as e:
            logger.error(f"Error marking r/{name} as Banned: {e}")

    async def _mark_as_non_related(self, name: str, reason: str = ""):
        """Mark subreddit as Non Related"""
        try:
            self.supabase.table('reddit_subreddits').update({
                'review': 'Non Related',
                'description': reason,
                'updated_at': datetime.now(timezone.utc).isoformat()
            }).eq('name', name.lower()).execute()
            self.non_related_subreddits.add(name.lower())
            logger.info(f"Marked r/{name} as Non Related: {reason}")
        except Exception as e:
            logger.error(f"Error marking r/{name} as Non Related: {e}")

    async def stealth_delay(self, operation_type: str = "request"):
        """Apply intelligent delays to avoid detection patterns (matches old scraper)"""
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

    async def randomize_request_pattern(self):
        """Occasionally vary request patterns to avoid detection (from old scraper)"""
        if random.random() < 0.1:  # 10% chance
            # Longer pause to simulate human behavior
            pause = random.uniform(5, 15)
            logger.info(f"🎲 Pattern variation: {pause:.1f}s pause")
            await asyncio.sleep(pause)

            # Reset some tracking to vary pattern
            self.stealth_config['request_count'] = 0
            self.stealth_config['burst_frequency'] = random.randint(7, 12)

    def print_proxy_stats(self):
        """Print detailed proxy usage statistics"""
        if not self.stats['start_time']:
            print("No statistics available - scraper hasn't run yet")
            return

        start_time = datetime.fromisoformat(self.stats['start_time'])
        runtime = datetime.now(timezone.utc) - start_time

        print("\n📊 PROXY-ENABLED SCRAPER STATS:")
        print("=" * 60)
        print(f"⏱️  Runtime: {runtime}")
        print(f"🔍 Subreddits processed: {self.stats['subreddits_processed']}")
        print(f"👤 Users processed: {self.stats['users_processed']}")
        print(f"📝 Posts processed: {self.stats['posts_processed']}")
        print(f"🌟 Discoveries made: {self.stats['discoveries_made']}")
        print(f"🌐 Total requests: {self.stats['total_requests']}")
        print(f"🔒 Proxy requests: {self.stats['proxy_requests']}")
        print(f"🔓 Direct requests: {self.stats['direct_requests']}")
        print(f"💾 Cache hits: {self.stats['cache_hits']}")
        print(f"⚠️  Rate limits hit: {self.stats['rate_limits']}")

        # Get proxy-specific stats if available
        if self.proxy_manager:
            proxy_stats = self.proxy_manager.get_proxy_stats()
            if proxy_stats and isinstance(proxy_stats, dict) and 'proxies' in proxy_stats:
                print("\n📊 Proxy Performance:")
                for proxy_info in proxy_stats['proxies']:
                    name = proxy_info.get('name') or proxy_info.get('service')
                    db = proxy_info.get('db_stats', {})
                    total_requests = db.get('total_requests', 0)
                    success_count = db.get('success_count', 0)
                    success_rate = (success_count / max(1, total_requests)) * 100
                    avg_response_time = db.get('avg_response_time_ms', 0)
                    print(f"   {name}: {success_rate:.1f}% success, {avg_response_time:.0f}ms avg response")

        # Thread statistics
        if self.scrapers:
            print("\n🧵 Thread Activity:")
            for scraper in self.scrapers:
                scraper_stats = scraper.get_stats()
                thread_id = scraper_stats.get('thread_id', '?')
                thread_stats = scraper_stats.get('stats', {})
                print(f"   Thread {thread_id}: {thread_stats.get('items_processed', 0)} items, "
                      f"{thread_stats.get('requests_successful', 0)} successful requests")

        print("=" * 60)

    async def log_to_database(self, level: str, message: str):
        """Log to Supabase system_logs table"""
        try:
            self.supabase.table('system_logs').insert({
                'timestamp': datetime.now(timezone.utc).isoformat(),
                'source': 'reddit_scraper_v2',
                'script_name': 'reddit_scraper_v2',
                'level': level,
                'message': message,
                'context': {
                    'version': SCRAPER_VERSION,
                    'stats': self.stats
                }
            }).execute()
        except Exception as e:
            logger.error(f"Failed to log to database: {e}")

    async def log_statistics(self):
        """Log final statistics"""
        if not self.stats['start_time'] or not self.stats['end_time']:
            return

        # Parse ISO timestamps and compute duration safely
        try:
            start_dt = self.stats['start_time']
            end_dt = self.stats['end_time']

            if isinstance(start_dt, str):
                start_dt = datetime.fromisoformat(start_dt.replace('Z', '+00:00'))
            if isinstance(end_dt, str):
                end_dt = datetime.fromisoformat(end_dt.replace('Z', '+00:00'))

            duration_seconds = int((end_dt - start_dt).total_seconds())
        except Exception:
            duration_seconds = 0

        duration_str = f"{duration_seconds // 60}m {duration_seconds % 60}s"

        # Aggregate request metrics from scrapers for accurate totals
        try:
            total_requests = 0
            total_success = 0
            total_failed = 0
            total_cached = 0

            if self.scrapers:
                for scraper in self.scrapers:
                    s = scraper.get_stats().get('stats', {})
                    total_requests += int(s.get('requests_made', 0))
                    total_success += int(s.get('requests_successful', 0))
                    total_failed += int(s.get('requests_failed', 0))
                    total_cached += int(s.get('items_cached', 0))

            # Update orchestrator stats
            self.stats['total_requests'] = total_requests
            self.stats['proxy_requests'] = total_requests  # direct requests are forbidden
            self.stats['direct_requests'] = 0
            self.stats['cache_hits'] = total_cached
        except Exception:
            pass

        summary = (
            f"📊 Scraping cycle completed in {duration_str}\n"
            f"  - Subreddits: {self.stats['subreddits_processed']}\n"
            f"  - Users: {self.stats['users_processed']}\n"
            f"  - Posts: {self.stats['posts_processed']}\n"
            f"  - Discoveries: {self.stats['discoveries_made']}\n"
            f"  - Errors: {len(self.stats['errors'])}\n"
            f"  - Total Requests: {self.stats['total_requests']}\n"
            f"  - Proxy Requests: {self.stats['proxy_requests']}\n"
            f"  - Cache Hits: {self.stats['cache_hits']}\n"
            f"  - Rate Limits: {self.stats['rate_limits']}"
        )

        logger.info(summary)
        await self.log_to_database("success", summary)

        # Log cache statistics
        cache_stats = self.cache_manager.get_stats()
        logger.info(f"Cache stats: {cache_stats}")

        # Log proxy statistics
        proxy_stats = self.proxy_manager.get_proxy_stats()
        logger.info(f"Proxy stats: {proxy_stats}")

    async def _memory_cleanup_callback(self, memory_status: Dict[str, Any]):
        """Callback for memory cleanup when thresholds are exceeded"""
        logger.info("🧹 Starting memory cleanup due to high memory usage...")

        cleanup_actions = []

        try:
            # 1. Force cache cleanup
            if self.cache_manager and hasattr(self.cache_manager, 'cache'):
                self.cache_manager.cache.force_cleanup(target_percentage=0.3)  # Keep only 30%
                cleanup_actions.append("Cleared cache to 30%")

            # 2. Flush batch writer buffers
            if self.batch_writer:
                await self.batch_writer.flush_all()
                cleanup_actions.append("Flushed batch writer buffers")

            # 3. Clear failed records if too many
            if self.batch_writer and hasattr(self.batch_writer, '_failed_records'):
                failed_count = sum(len(records) for records in self.batch_writer._failed_records.values())
                if failed_count > 500:
                    self.batch_writer._failed_records.clear()
                    self.batch_writer._retry_attempts.clear()
                    cleanup_actions.append(f"Cleared {failed_count} failed records")

            # 4. Force garbage collection
            import gc
            gc.collect()
            cleanup_actions.append("Ran garbage collection")

            logger.info(f"🧹 Memory cleanup completed: {', '.join(cleanup_actions)}")
            return cleanup_actions

        except Exception as e:
            logger.error(f"Error during memory cleanup: {e}")
            return [f"Error: {e}"]

    async def cleanup(self):
        """Clean up resources"""
        logger.info("🧹 Cleaning up resources")

        # Stop memory monitor first
        if hasattr(self, 'memory_monitor') and self.memory_monitor:
            await self.memory_monitor.stop()
            logger.info("Memory monitor stopped")

        # Stop batch writer
        if self.batch_writer:
            await self.batch_writer.stop()

        # Clean up API pool
        if self.api_pool:
            self.api_pool.cleanup()

        # Log final memory stats
        if hasattr(self, 'memory_monitor') and self.memory_monitor:
            final_stats = self.memory_monitor.get_stats()
            logger.info(f"📊 Final memory stats: {final_stats}")

        logger.info("✅ Cleanup completed")


async def main():
    """Main entry point"""
    scraper = RedditScraperV2()

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