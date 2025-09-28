#!/usr/bin/env python3
"""
Reddit Scraper v2.0 - Modular Architecture
Main orchestrator for the restructured Reddit scraper
"""
# CRITICAL DEBUG: Print before ANY imports to see if script starts
print("[REDDIT_SCRAPER] Script started - before imports", flush=True)
import sys
import os
print(f"[REDDIT_SCRAPER] Python version: {sys.version}", flush=True)
print(f"[REDDIT_SCRAPER] Python executable: {sys.executable}", flush=True)
print(f"[REDDIT_SCRAPER] Current working directory: {os.getcwd()}", flush=True)

import asyncio
import logging
# os and sys already imported above for debug
import random
import time
from datetime import datetime, timezone
from typing import Dict, Any, Optional, List, Callable
from collections import defaultdict
from pathlib import Path

# External libraries
from supabase import create_client
from dotenv import load_dotenv

# Setup path for Docker environment - script runs from /app/api/scrapers/reddit/
# Need to add /app/api to Python path so it can find core, scrapers, etc.
current_dir = os.path.dirname(os.path.abspath(__file__))
api_root = os.path.join(current_dir, '..', '..')  # Go up to /app/api (where core/ and scrapers/ are)
if api_root not in sys.path:
    sys.path.insert(0, api_root)
# Now import with the correct structure for Docker environment
from core.clients.api_pool import ThreadSafeAPIPool
from core.config.proxy_manager import ProxyManager
from core.config.scraper_config import get_scraper_config
from core.cache.cache_manager import AsyncCacheManager
print("[REDDIT_SCRAPER] About to import BatchWriter...", flush=True)
from core.database.batch_writer import BatchWriter
print(f"[REDDIT_SCRAPER] Successfully imported BatchWriter: {BatchWriter}", flush=True)

# DirectPostsWriter removed - using direct database writes instead
from core.database.supabase_client import get_supabase_client, refresh_supabase_client
from core.exceptions import (
    SubredditBannedException, SubredditPrivateException, 
    ValidationException, handle_api_error, validate_subreddit_name
)
from scrapers.reddit.processors.calculator import MetricsCalculator, RequirementsCalculator
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
SCRAPER_VERSION = "2.1.0"


class RedditScraperV2:
    """
    Main orchestrator for the modular Reddit scraper.
    Coordinates all components and manages the scraping workflow.
    """

    # Thread labels for better debugging (removed ANSI colors for cleaner logs)
    # Colors were causing log pollution in database and files

    def __init__(self):
        """Initialize the Reddit scraper orchestrator"""
        # Load configuration first
        self.config = get_scraper_config()
        
        # Core components
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

        # Stealth configuration - now using centralized config
        self.stealth_config = {
            'min_delay': self.config.min_delay,
            'max_delay': self.config.max_delay,
            'burst_delay': (self.config.burst_delay_min, self.config.burst_delay_max),
            'burst_frequency': random.randint(self.config.burst_frequency_min, self.config.burst_frequency_max),
            'request_count': 0,
            'last_request_time': 0
        }

    async def initialize(self):
        """Initialize all components"""
        logger.info(f"🚀 Initializing Reddit Scraper v{SCRAPER_VERSION} - LATEST FIXED VERSION")

        # Log startup immediately to track which version is running
        try:
            # Try to log to database early if possible
            temp_supabase = get_supabase_client()
            temp_supabase.table('system_logs').insert({
                'timestamp': datetime.now(timezone.utc).isoformat(),
                'source': 'reddit_scraper',
                'script_name': 'reddit_scraper_startup',
                'level': 'info',
                'message': f'Starting Reddit Scraper v{SCRAPER_VERSION} - LATEST VERSION (Fixed category column issue)',
                'context': {
                    'version': SCRAPER_VERSION,
                    'startup_type': 'main_scraper',
                    'fix_applied': 'category_column_to_review',
                    'file_path': 'scrapers/reddit/main.py'
                }
            }).execute()
            logger.info(f"✅ Logged startup to database - v{SCRAPER_VERSION}")
        except Exception as e:
            logger.warning(f"Could not log early startup to database: {e}")

        # Force refresh Supabase client to clear any schema cache
        refresh_supabase_client()
        logger.info("🔄 Cleared Supabase schema cache")

        # Initialize Supabase using centralized client manager
        self.supabase = get_supabase_client()
        logger.info("✅ Supabase client initialized with fresh schema")

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

        # Initialize batch writer with configurable settings
        logger.info(f"🔧 Initializing BatchWriter with batch_size={self.config.batch_writer_size}, flush_interval={self.config.batch_writer_flush_interval}")
        self.batch_writer = BatchWriter(
            self.supabase,
            batch_size=self.config.batch_writer_size,
            flush_interval=self.config.batch_writer_flush_interval
        )
        logger.info(f"🔧 BatchWriter instance created: {self.batch_writer}, Type: {type(self.batch_writer)}")
        await self.batch_writer.start()
        logger.info(f"✅ Batch writer initialized and started, instance: {self.batch_writer}")

        # Direct database writes are now used instead of DirectPostsWriter

        # Initialize metrics calculator
        self.metrics_calculator = MetricsCalculator()
        logger.info("✅ Metrics calculator initialized")

        # Initialize memory monitor with configurable thresholds
        self.memory_monitor = MemoryMonitor(
            warning_threshold=self.config.memory_warning_threshold,
            error_threshold=self.config.memory_error_threshold,
            critical_threshold=self.config.memory_critical_threshold,
            check_interval=self.config.memory_check_interval
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

            # ALSO load ALL existing subreddit names to avoid re-discovery
            all_subreddits_response = self.supabase.table('reddit_subreddits').select('name').execute()

            if all_subreddits_response.data:
                all_existing_count = len(all_subreddits_response.data)

                # Pre-populate the cache with all existing subreddits
                for sub in all_subreddits_response.data:
                    name = sub['name'].lower()
                    # Mark as already discovered in cache to avoid re-discovery attempts
                    if self.cache_manager:
                        self.cache_manager.mark_subreddit_discovered(name)

                logger.info(f"📚 Loaded {all_existing_count} total existing subreddits into discovery cache")
                logger.info(f"🚫 These subreddits will be skipped during discovery to avoid duplicates")

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

            # Step 4: Process subreddits in parallel batches
            # NEW APPROACH: Process 10 subreddits at a time across all 9 threads
            await self.process_subreddits_parallel_batches(all_subreddits, thread_count, control_checker)

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
            batch_size = 500  # Use smaller batch for reliable pagination (Supabase has 1000 row limit)
            max_subreddits = self.config.max_subreddits  # Configurable limit for subreddits

            logger.info(f"Loading OK subreddits from database (batch_size={batch_size})...")
            while len(all_ok_subreddits) < max_subreddits:
                # Use limit/offset instead of range for more reliable pagination
                ok_response = self.supabase.table('reddit_subreddits').select('*').eq(
                    'review', 'Ok'
                ).limit(batch_size).offset(offset).execute()

                if ok_response.data:
                    all_ok_subreddits.extend(ok_response.data)
                    logger.info(f"Loaded batch: {len(ok_response.data)} subreddits (total: {len(all_ok_subreddits)})")
                    if len(ok_response.data) < batch_size:
                        logger.info(f"Last batch had {len(ok_response.data)} records, stopping pagination")
                        break  # No more results
                    offset += batch_size
                else:
                    logger.info("No more data returned, stopping pagination")
                    break

            if len(all_ok_subreddits) >= max_subreddits:
                logger.warning(f"⚠️ Reached maximum limit of {max_subreddits} OK subreddits. "
                             f"Consider processing in smaller batches or increasing limit.")

            # Get No Seller subreddits (using same limit/offset pattern for consistency)
            no_seller_response = self.supabase.table('reddit_subreddits').select('*').eq(
                'review', 'No Seller'
            ).limit(self.config.no_seller_limit).offset(0).execute()  # Use configurable limit for No Seller

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

    async def process_subreddits_parallel_batches(self, all_subreddits: List[Dict],
                                                 thread_count: int,
                                                 control_checker: Optional[Callable]):
        """Process subreddits in parallel batches of 10 across all threads"""
        BATCH_SIZE = 10  # Process 10 subreddits at a time
        total_subreddits = len(all_subreddits)
        total_batches = (total_subreddits + BATCH_SIZE - 1) // BATCH_SIZE

        logger.info(f"📦 Processing {total_subreddits} subreddits in {total_batches} parallel batches")
        logger.info(f"⚡ Using {thread_count} threads for parallel processing")

        for batch_num in range(total_batches):
            if control_checker and not control_checker():
                logger.info("⏹️ Stopping due to control signal")
                break

            # Get the next batch of 10 subreddits
            start_idx = batch_num * BATCH_SIZE
            end_idx = min(start_idx + BATCH_SIZE, total_subreddits)
            batch_subreddits = all_subreddits[start_idx:end_idx]

            batch_start_time = time.time()
            logger.info(f"\n🚀 Starting parallel batch {batch_num + 1}/{total_batches} "
                       f"({len(batch_subreddits)} subreddits)")

            # Distribute this batch across all threads
            tasks = []
            for i, subreddit in enumerate(batch_subreddits):
                thread_id = i % thread_count  # Distribute across threads
                scraper = self.scrapers[thread_id]

                # Process single subreddit per thread
                task = asyncio.create_task(
                    self.process_single_subreddit(scraper, subreddit, control_checker)
                )
                tasks.append((thread_id, subreddit['name'], task))

            # Wait for all threads to complete this batch
            results = await asyncio.gather(*[t[2] for t in tasks], return_exceptions=True)

            # Log results and collect data for batch write
            batch_subreddits_data = []
            batch_users = {}
            batch_posts = []

            for (thread_id, sub_name, _), result in zip(tasks, results):
                if isinstance(result, Exception):
                    logger.error(f"❌ Thread {thread_id} failed on r/{sub_name}: {result}")
                    self.stats['errors'].append({
                        'thread': thread_id,
                        'subreddit': sub_name,
                        'error': str(result)
                    })
                elif result:
                    # Successful result - collect data
                    if result.get('subreddit_data'):
                        batch_subreddits_data.append(result['subreddit_data'])
                    if result.get('users'):
                        batch_users.update(result['users'])
                    if result.get('posts'):
                        batch_posts.extend(result['posts'])

            # Batch write all data from this parallel batch
            if batch_subreddits_data or batch_posts:
                await self.batch_write_parallel_data(
                    batch_subreddits_data, batch_users, batch_posts, batch_num
                )

            batch_duration = time.time() - batch_start_time
            logger.info(f"✅ Parallel batch {batch_num + 1} completed in {batch_duration:.1f} seconds")
            logger.info(f"📊 Collected: {len(batch_subreddits_data)} subreddits, "
                       f"{len(batch_users)} users, {len(batch_posts)} posts")

    async def process_subreddit_batch(self, scraper: SubredditScraper,
                                     subreddits: List[Dict],
                                     control_checker: Optional[Callable]):
        """Process a batch of subreddits with sub-batch processing and user enrichment"""
        processed_count = 0

        # Constants for batch processing
        FULL_BATCH_SIZE = 50  # Total subreddits per full batch
        SUB_BATCH_SIZE = 10   # Subreddits per sub-batch (5 sub-batches total)

        # Full batch accumulator for HOT users (for enrichment after all 50)
        full_batch_hot_users = {}  # HOT post users accumulated across all sub-batches

        # Process in sub-batches of 10 subreddits
        num_sub_batches = (len(subreddits) + SUB_BATCH_SIZE - 1) // SUB_BATCH_SIZE

        for sub_batch_num in range(num_sub_batches):
            # Get the slice for this sub-batch
            start_idx = sub_batch_num * SUB_BATCH_SIZE
            end_idx = min(start_idx + SUB_BATCH_SIZE, len(subreddits))
            sub_batch = subreddits[start_idx:end_idx]

            logger.info(f"📦 Thread {scraper.thread_id}: Starting sub-batch {sub_batch_num + 1}/{num_sub_batches} "
                       f"({len(sub_batch)} subreddits)")

            # Sub-batch collection buffers (written after each sub-batch)
            sub_batch_subreddits = []  # Subreddit data for this sub-batch
            sub_batch_all_users = {}   # ALL users for foreign keys (this sub-batch)
            sub_batch_posts = []       # All posts from this sub-batch

            for i, subreddit in enumerate(sub_batch):
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
                        processed_count += 1

                        # Calculate metrics
                        calculated_data = self.metrics_calculator.calculate_all_metrics(
                            result.get('hot_posts', []),
                            result.get('top_posts', []),  # Weekly posts for metrics
                            result.get('yearly_posts', [])  # Yearly posts for timing analysis
                        )

                        # Merge calculated data
                        final_data = {**result.get('subreddit_data', {}), **calculated_data}

                        # CRITICAL: Fetch and preserve existing review, primary_category, and tags
                        try:
                            existing_sub = self.supabase.table('reddit_subreddits').select(
                                'review, primary_category, tags'
                            ).eq('name', subreddit_name).execute()

                            if existing_sub.data and len(existing_sub.data) > 0:
                                existing_fields = existing_sub.data[0]
                                # Only add if not already in final_data (don't override new values)
                                if 'review' not in final_data and existing_fields.get('review'):
                                    final_data['review'] = existing_fields['review']
                                    logger.debug(f"Preserving review: {existing_fields['review']} for r/{subreddit_name}")
                                if 'primary_category' not in final_data and existing_fields.get('primary_category'):
                                    final_data['primary_category'] = existing_fields['primary_category']
                                    logger.debug(f"Preserving primary_category: {existing_fields['primary_category']}")
                                if 'tags' not in final_data and existing_fields.get('tags'):
                                    final_data['tags'] = existing_fields['tags']
                                    logger.debug(f"Preserving tags: {existing_fields['tags']}")
                        except Exception as e:
                            logger.warning(f"Could not fetch existing fields for r/{subreddit_name}: {e}")

                        # Apply 20% boost for SFW subreddits
                        nsfw_percentage = final_data.get('nsfw_percentage', 0)
                        if nsfw_percentage < 10 and 'subreddit_score' in final_data:
                            original_score = final_data['subreddit_score']
                            final_data['subreddit_score'] = original_score * 1.2
                            logger.debug(f"Applied SFW boost: {original_score:.1f} -> {final_data['subreddit_score']:.1f}")

                        # Collect subreddit data for sub-batch writing
                        logger.info(f"📊 Collecting data for r/{subreddit_name} for sub-batch processing")
                        logger.debug(f"  Final data keys: {list(final_data.keys())}")
                        if 'subreddit_score' in final_data:
                            logger.debug(f"  Score: {final_data.get('subreddit_score', 0):.1f}, "
                                       f"Engagement: {final_data.get('engagement', 0):.4f}")
                        sub_batch_subreddits.append(final_data)

                        # Mark as processed in cache
                        self.cache_manager.mark_subreddit_processed(subreddit_name)

                        # Collect posts and extract users for batch processing
                        try:
                            if result.get('hot_posts'):
                                logger.info(f"📮 Thread {scraper.thread_id}: Collecting {len(result['hot_posts'])} hot posts")

                                for post in result['hot_posts']:
                                    # Extract user info
                                    author = post.get('author', '')
                                    if author and author not in ['[deleted]', 'AutoModerator', None]:
                                        # Track HOT user for enrichment (full batch accumulator)
                                        if author not in full_batch_hot_users:
                                            full_batch_hot_users[author] = {
                                                'username': author,
                                                'post_count': 0,
                                                'created_at': datetime.now(timezone.utc).isoformat()
                                            }
                                        full_batch_hot_users[author]['post_count'] += 1

                                        # Also add to sub-batch users for foreign keys
                                        if author not in sub_batch_all_users:
                                            sub_batch_all_users[author] = {
                                                'username': author,
                                                'created_at': datetime.now(timezone.utc).isoformat()
                                            }

                                    # Clean and collect post
                                cleaned_post = {
                                    'reddit_id': post.get('reddit_id'),
                                    'title': post.get('title'),
                                    'author_username': post.get('author'),  # Column is author_username
                                    'subreddit_name': post.get('subreddit'),  # Column is subreddit_name
                                    'score': post.get('score', 0),
                                    'upvote_ratio': post.get('upvote_ratio', 0),
                                    'num_comments': post.get('num_comments', 0),
                                    'created_utc': post.get('created_utc'),
                                    'url': post.get('url'),
                                    'selftext': post.get('selftext'),
                                    'is_video': post.get('is_video', False),
                                    'link_flair_text': post.get('link_flair_text'),
                                    'over_18': post.get('over_18', False),
                                    'created_at': datetime.now(timezone.utc).isoformat()
                                }
                                # Remove None values
                                cleaned_post = {k: v for k, v in cleaned_post.items() if v is not None}
                                sub_batch_posts.append(cleaned_post)

                            self.stats['posts_processed'] += len(result['hot_posts'])
                            logger.info(f"✅ Thread {scraper.thread_id}: Hot posts collected successfully")

                            if result.get('top_posts'):  # Weekly posts
                                logger.info(f"📮 Thread {scraper.thread_id}: Collecting {len(result['top_posts'])} weekly posts")

                                for post in result['top_posts']:
                                    # Extract user info - NO ENRICHMENT FOR WEEKLY POSTS
                                    author = post.get('author', '')
                                    if author and author not in ['[deleted]', 'AutoModerator', None]:
                                        # Only add to sub-batch users for foreign keys (not to HOT users)
                                        if author not in sub_batch_all_users:
                                            sub_batch_all_users[author] = {
                                                'username': author,
                                                'created_at': datetime.now(timezone.utc).isoformat()
                                            }

                                    # Clean and collect post
                                    cleaned_post = {
                                        'reddit_id': post.get('reddit_id'),
                                        'title': post.get('title'),
                                        'author_username': post.get('author'),
                                        'subreddit_name': post.get('subreddit'),
                                        'score': post.get('score', 0),
                                        'upvote_ratio': post.get('upvote_ratio', 0),
                                        'num_comments': post.get('num_comments', 0),
                                        'created_utc': post.get('created_utc'),
                                        'url': post.get('url'),
                                        'selftext': post.get('selftext'),
                                        'is_video': post.get('is_video', False),
                                        'link_flair_text': post.get('link_flair_text'),
                                        'over_18': post.get('over_18', False),
                                        'created_at': datetime.now(timezone.utc).isoformat()
                                    }
                                    cleaned_post = {k: v for k, v in cleaned_post.items() if v is not None}
                                    sub_batch_posts.append(cleaned_post)

                                self.stats['posts_processed'] += len(result['top_posts'])
                                logger.info(f"✅ Thread {scraper.thread_id}: Weekly posts collected successfully")

                            if result.get('yearly_posts'):  # Yearly posts
                                logger.info(f"📮 Thread {scraper.thread_id}: Collecting {len(result['yearly_posts'])} yearly posts")

                                for post in result['yearly_posts']:
                                    # Extract user info - NO ENRICHMENT FOR YEARLY POSTS
                                    author = post.get('author', '')
                                    if author and author not in ['[deleted]', 'AutoModerator', None]:
                                        # Only add to sub-batch users for foreign keys (not to HOT users)
                                        if author not in sub_batch_all_users:
                                            sub_batch_all_users[author] = {
                                                'username': author,
                                                'created_at': datetime.now(timezone.utc).isoformat()
                                            }

                                    # Clean and collect post
                                    cleaned_post = {
                                        'reddit_id': post.get('reddit_id'),
                                        'title': post.get('title'),
                                        'author_username': post.get('author'),
                                        'subreddit_name': post.get('subreddit'),
                                        'score': post.get('score', 0),
                                        'upvote_ratio': post.get('upvote_ratio', 0),
                                        'num_comments': post.get('num_comments', 0),
                                        'created_utc': post.get('created_utc'),
                                        'url': post.get('url'),
                                        'selftext': post.get('selftext'),
                                        'is_video': post.get('is_video', False),
                                        'link_flair_text': post.get('link_flair_text'),
                                        'over_18': post.get('over_18', False),
                                        'created_at': datetime.now(timezone.utc).isoformat()
                                    }
                                    cleaned_post = {k: v for k, v in cleaned_post.items() if v is not None}
                                    sub_batch_posts.append(cleaned_post)

                                self.stats['posts_processed'] += len(result['yearly_posts'])
                                logger.info(f"✅ Thread {scraper.thread_id}: Yearly posts collected successfully")
                        except Exception as e:
                            logger.error(f"❌ Thread {scraper.thread_id}: Failed to add posts to batch writer: {e}")
                            logger.error(f"Exception type: {type(e).__name__}, Details: {str(e)}")

                        # For OK subreddits, track users for later analysis
                        if subreddit_type == 'ok' and result.get('hot_posts'):
                            await self.track_users_from_posts(result['hot_posts'], subreddit_name)

                    # Apply stealth delay between subreddits
                    await self.stealth_delay("subreddit_analysis")
                    await self.randomize_request_pattern()

                except Exception as e:
                    logger.error(f"Error processing subreddit {subreddit.get('name')}: {e}")

            # After processing this sub-batch of 10 subreddits, write the data
            if sub_batch_subreddits or sub_batch_posts:
                logger.info(f"💾 Thread {scraper.thread_id}: Writing sub-batch {sub_batch_num + 1}/{num_sub_batches}")
                await self.batch_write_data(sub_batch_subreddits, sub_batch_all_users, sub_batch_posts, scraper.thread_id)
                processed_count += len(sub_batch_subreddits)

        # After all sub-batches are processed, enrich HOT users and process discoveries
        if full_batch_hot_users and processed_count > 0:
            logger.info(f"🔬 Thread {scraper.thread_id}: Starting user enrichment phase for {len(full_batch_hot_users)} HOT users")
            await self.enrich_hot_users_and_discover(full_batch_hot_users, scraper.thread_id)

    async def batch_write_data(self, batch_subreddits: List[Dict], batch_users: Dict,
                              sub_batch_posts: List[Dict], thread_id: int):
        """Write collected data to database in the correct order: subreddits → users → posts"""
        try:
            logger.info(f"📝 Thread {thread_id}: Starting batch write - {len(batch_subreddits)} subreddits, "
                       f"{len(batch_users)} users, {len(sub_batch_posts)} posts")

            # 1. Write subreddits first
            if batch_subreddits:
                logger.info(f"📊 Writing {len(batch_subreddits)} subreddits...")
                for i in range(0, len(batch_subreddits), 50):
                    chunk = batch_subreddits[i:i+50]
                    try:
                        # Normalize subreddit names to lowercase before saving
                        for sub in chunk:
                            if 'name' in sub:
                                # Keep original case in display_name if not already set
                                if 'display_name' not in sub or not sub['display_name']:
                                    sub['display_name'] = sub['name']
                                # Normalize name to lowercase for database key
                                sub['name'] = sub['name'].lower()

                        # Batch upsert with normalized names
                        response = self.supabase.table('reddit_subreddits').upsert(
                            chunk,
                            on_conflict='name'
                        ).execute()
                        logger.info(f"✅ Wrote {len(chunk)} subreddits to database")
                    except Exception as e:
                        logger.error(f"❌ Failed to write subreddits: {e}")

            # 2. Write users second (so they exist for foreign key constraints)
            if batch_users:
                logger.info(f"👥 Writing {len(batch_users)} users...")
                users_list = list(batch_users.values())
                for i in range(0, len(users_list), 100):
                    chunk = users_list[i:i+100]
                    try:
                        response = self.supabase.table('reddit_users').upsert(
                            chunk,
                            on_conflict='username'
                        ).execute()
                        logger.info(f"✅ Wrote {len(chunk)} users to database")
                    except Exception as e:
                        logger.error(f"❌ Failed to write users: {e}")

            # 3. Write posts last (now that users exist)
            if sub_batch_posts:
                logger.info(f"📮 Writing {len(sub_batch_posts)} posts...")
                for i in range(0, len(sub_batch_posts), 100):
                    chunk = sub_batch_posts[i:i+100]
                    try:
                        response = self.supabase.table('reddit_posts').upsert(
                            chunk,
                            on_conflict='reddit_id'
                        ).execute()
                        logger.info(f"✅ Wrote {len(chunk)} posts to database")
                    except Exception as e:
                        logger.error(f"❌ Failed to write posts: {e}")

            logger.info(f"✅ Thread {thread_id}: Batch write completed successfully")

        except Exception as e:
            logger.error(f"❌ Thread {thread_id}: Batch write failed: {e}")
            import traceback
            logger.error(f"Traceback: {traceback.format_exc()}")

    async def enrich_hot_users_and_discover(self, full_batch_hot_users: Dict[str, Dict], thread_id: int):
        """Enrich HOT users with full profiles and discover new subreddits"""
        try:
            # Sort users by post count in this batch
            sorted_users = sorted(
                full_batch_hot_users.items(),
                key=lambda x: x[1].get('post_count', 0),
                reverse=True
            )[:500]  # Take top 500 most active users

            logger.info(f"👥 Thread {thread_id}: Enriching top {len(sorted_users)} users from HOT posts")

            enriched_users = []
            discovered_subreddits = set()

            # Import UserScraper
            from scrapers.reddit.scrapers.user import UserScraper

            # Create user scraper
            user_scraper = UserScraper(self.supabase, thread_id)
            await user_scraper.initialize(
                self.api_pool,
                self.proxy_manager,
                self.cache_manager,
                self.batch_writer
            )

            # Process each user
            for username, user_info in sorted_users:
                try:
                    # Skip if already processed
                    if self.cache_manager.is_user_processed(username):
                        continue

                    # Scrape full user profile
                    result = await user_scraper.scrape(username=username)

                    if result and result.get('success'):
                        user_data = result.get('user_data', {})
                        if user_data:
                            # Add full profile data
                            enriched_user = {
                                'username': username,
                                'link_karma': user_data.get('link_karma', 0),
                                'comment_karma': user_data.get('comment_karma', 0),
                                'total_karma': user_data.get('total_karma', 0),
                                'created_utc': user_data.get('created_utc'),
                                'verified': user_data.get('verified', False),
                                'is_gold': user_data.get('is_gold', False),
                                'is_mod': user_data.get('is_mod', False),
                                'has_verified_email': user_data.get('has_verified_email', False),
                                'updated_at': datetime.now(timezone.utc).isoformat()
                            }
                            enriched_users.append(enriched_user)

                            # Track discovered subreddits
                            for sub in result.get('discovered_subreddits', []):
                                discovered_subreddits.add(sub.get('name', ''))

                    # Apply rate limiting
                    await self.stealth_delay("user_enrichment")

                except Exception as e:
                    logger.warning(f"Failed to enrich user {username}: {e}")

            # Write enriched users to database
            if enriched_users:
                logger.info(f"✍️ Thread {thread_id}: Updating {len(enriched_users)} users with full profiles")
                for i in range(0, len(enriched_users), 100):
                    chunk = enriched_users[i:i+100]
                    try:
                        self.supabase.table('reddit_users').upsert(
                            chunk,
                            on_conflict='username'
                        ).execute()
                        logger.info(f"✅ Updated {len(chunk)} user profiles")
                    except Exception as e:
                        logger.error(f"❌ Failed to update user profiles: {e}")

            # Process discovered subreddits
            if discovered_subreddits:
                logger.info(f"🔍 Thread {thread_id}: Processing {len(discovered_subreddits)} discovered subreddits")
                await self.process_discovered_subreddits(list(discovered_subreddits)[:20], thread_id)

            # Enhanced success logging
            logger.info(f"[UserEnrichment] Successfully enriched {len(enriched_users)} users - "
                       f"{len(discovered_subreddits)} new subreddits discovered")
            logger.info(f"✅ Thread {thread_id}: User enrichment phase completed")

        except Exception as e:
            logger.error(f"❌ Thread {thread_id}: User enrichment failed: {e}")
            import traceback
            logger.error(f"Traceback: {traceback.format_exc()}")

    async def process_discovered_subreddits(self, discovered_subreddits: List[str], thread_id: int):
        """Fully scrape and process discovered subreddits with all data"""
        try:
            from scrapers.reddit.scrapers.subreddit import SubredditScraper

            processed_discoveries = []
            discovered_users = {}
            discovered_posts = []

            for subreddit_name in discovered_subreddits[:20]:  # Limit to top 20
                try:
                    # Skip if already processed or categorized
                    if self.cache_manager.is_subreddit_processed(subreddit_name):
                        continue

                    # Skip if already categorized - NEVER process these again
                    if subreddit_name.lower() in self.non_related_subreddits:
                        logger.info(f"⏭️ Skipping Non Related subreddit: r/{subreddit_name}")
                        continue
                    if subreddit_name.lower() in self.user_feed_subreddits:
                        logger.info(f"⏭️ Skipping User Feed: r/{subreddit_name}")
                        continue
                    if subreddit_name.lower() in self.banned_subreddits:
                        logger.info(f"⏭️ Skipping Banned subreddit: r/{subreddit_name}")
                        continue

                    # Create scraper instance
                    scraper = SubredditScraper(self.supabase, thread_id)
                    await scraper.initialize(
                        self.api_pool,
                        self.proxy_manager,
                        self.cache_manager,
                        self.batch_writer
                    )

                    # FULL SCRAPE - get all data including posts
                    logger.info(f"🔍 Full scraping discovered subreddit r/{subreddit_name}")
                    result = await scraper.scrape(subreddit_name=subreddit_name)

                    if result and result.get('success'):
                        # Process subreddit metadata
                        subreddit_metadata = result.get('subreddit_data', {})
                        if subreddit_metadata and subreddit_metadata.get('subscribers', 0) > 1000:
                            # Prepare subreddit data for saving
                            discovery_data = {
                                'name': subreddit_name.lower(),
                                'display_name_prefixed': f"r/{subreddit_metadata.get('display_name', subreddit_name)}",  # Fixed field name
                                'subscribers': subreddit_metadata.get('subscribers', 0),
                                'active_user_count': subreddit_metadata.get('active_user_count', 0),  # Fixed: was 'active_users'
                                'created_utc': subreddit_metadata.get('created_utc'),
                                'over18': subreddit_metadata.get('over18', False),
                                'public_description': subreddit_metadata.get('public_description', ''),
                                'description': subreddit_metadata.get('description', ''),
                                'discovered_from_batch': True,
                                'created_at': datetime.now(timezone.utc).isoformat(),
                                'updated_at': datetime.now(timezone.utc).isoformat()
                            }
                            processed_discoveries.append(discovery_data)

                            # Collect posts and users from the discovered subreddit
                            all_posts = []
                            all_posts.extend(result.get('hot_posts', []))
                            all_posts.extend(result.get('top_posts', []))  # weekly posts
                            all_posts.extend(result.get('yearly_posts', []))

                            for post in all_posts:
                                # Extract users
                                author = post.get('author', '')
                                if author and author not in ['[deleted]', 'AutoModerator']:
                                    discovered_users[author] = {
                                        'username': author,
                                        'created_at': datetime.now(timezone.utc).isoformat()
                                    }

                                # Prepare post data
                                cleaned_post = {
                                    'reddit_id': post.get('reddit_id'),
                                    'title': post.get('title'),
                                    'author_username': post.get('author'),
                                    'subreddit_name': subreddit_name.lower(),
                                    'score': post.get('score', 0),
                                    'upvote_ratio': post.get('upvote_ratio', 0),
                                    'num_comments': post.get('num_comments', 0),
                                    'created_utc': post.get('created_utc'),
                                    'url': post.get('url'),
                                    'selftext': post.get('selftext'),
                                    'is_video': post.get('is_video', False),
                                    'link_flair_text': post.get('link_flair_text'),
                                    'over_18': post.get('over_18', False),
                                    'created_at': datetime.now(timezone.utc).isoformat()
                                }
                                discovered_posts.append(cleaned_post)

                            logger.info(f"✅ Fully scraped r/{subreddit_name}: "
                                      f"{len(all_posts)} posts, {len(discovered_users)} users")

                except Exception as e:
                    logger.error(f"❌ Failed to fully scrape r/{subreddit_name}: {e}")

            # CRITICAL: Write in correct order - Subreddits → Users → Posts

            # Step 1: Write discovered subreddits FIRST
            if processed_discoveries:
                logger.info(f"📝 Writing {len(processed_discoveries)} discovered subreddits")
                try:
                    # Normalize names before saving
                    for discovery in processed_discoveries:
                        if 'name' in discovery:
                            # Ensure display_name_prefixed is set if missing
                            if 'display_name_prefixed' not in discovery or not discovery['display_name_prefixed']:
                                discovery['display_name_prefixed'] = f"r/{discovery['name']}"
                            # Normalize name to lowercase
                            discovery['name'] = discovery['name'].lower()

                    # Batch upsert with normalized names
                    self.supabase.table('reddit_subreddits').upsert(
                        processed_discoveries,
                        on_conflict='name'
                    ).execute()
                    logger.info(f"✅ Wrote {len(processed_discoveries)} discovered subreddits")

                    # CRITICAL: Update cache to prevent re-processing in same run
                    if self.cache_manager:
                        for discovery in processed_discoveries:
                            subreddit_name = discovery['name'].lower()
                            self.cache_manager.mark_subreddit_discovered(subreddit_name)
                            logger.debug(f"📌 Added r/{subreddit_name} to discovery cache")
                except Exception as e:
                    logger.error(f"❌ Failed to write discovered subreddits: {e}")
                    # Don't continue if subreddits failed - posts will have FK violations
                    return

            # Step 2: Write users SECOND (needed for post foreign keys)
            if discovered_users:
                logger.info(f"📝 Writing {len(discovered_users)} users from discovered subreddits")
                users_list = list(discovered_users.values())
                for i in range(0, len(users_list), 100):
                    chunk = users_list[i:i+100]
                    try:
                        self.supabase.table('reddit_users').upsert(
                            chunk,
                            on_conflict='username'
                        ).execute()
                    except Exception as e:
                        logger.error(f"❌ Failed to write user chunk: {e}")

            # Step 3: Write posts LAST (needs both subreddits and users to exist)
            if discovered_posts:
                logger.info(f"📝 Writing {len(discovered_posts)} posts from discovered subreddits")

                # Deduplicate posts by reddit_id
                seen_ids = set()
                unique_posts = []
                for post in discovered_posts:
                    if post['reddit_id'] not in seen_ids:
                        seen_ids.add(post['reddit_id'])
                        unique_posts.append(post)

                logger.info(f"Deduplicated: {len(discovered_posts)} → {len(unique_posts)} posts")

                for i in range(0, len(unique_posts), 100):
                    chunk = unique_posts[i:i+100]
                    try:
                        self.supabase.table('reddit_posts').upsert(
                            chunk,
                            on_conflict='reddit_id'
                        ).execute()
                    except Exception as e:
                        logger.error(f"❌ Failed to write post chunk: {e}")

            # Log final summary
            logger.info(f"✅ Discovery processing complete: "
                      f"{len(processed_discoveries)} subreddits, "
                      f"{len(discovered_users)} users, "
                      f"{len(discovered_posts)} posts")

        except Exception as e:
            logger.error(f"❌ Thread {thread_id}: Discovery processing failed: {e}")

    async def process_single_subreddit(self, scraper: SubredditScraper,
                                      subreddit: Dict,
                                      control_checker: Optional[Callable]) -> Dict:
        """Process a single subreddit and return collected data"""
        try:
            subreddit_name = subreddit['name']
            subreddit_type = self.subreddit_types.get(subreddit_name, 'ok')

            logger.info(f"Thread {scraper.thread_id}: Processing r/{subreddit_name} ({subreddit_type.upper()})")

            # Scrape the subreddit
            result = await scraper.scrape(subreddit_name=subreddit_name)

            if not result or not result.get('success'):
                logger.warning(f"Thread {scraper.thread_id}: Failed to scrape r/{subreddit_name}")
                return {}

            # Prepare response data
            response_data = {
                'subreddit_data': None,
                'users': {},
                'posts': []
            }

            # Collect subreddit metadata from the correct key
            subreddit_metadata = result.get('subreddit_data', {})  # Fixed: was looking for 'about' instead of 'subreddit_data'

            if subreddit_metadata:
                # Use the real data from Reddit API
                response_data['subreddit_data'] = {
                    'name': subreddit_name.lower(),  # Normalize to lowercase
                    'display_name_prefixed': f"r/{subreddit_metadata.get('display_name', subreddit_name)}",
                    'subscribers': subreddit_metadata.get('subscribers', 0),
                    'active_user_count': subreddit_metadata.get('active_user_count', 0),  # Fixed: was 'active_users'
                    'created_utc': subreddit_metadata.get('created_utc'),
                    'over18': subreddit_metadata.get('over18', False),
                    'public_description': subreddit_metadata.get('public_description', ''),
                    'description': subreddit_metadata.get('description', ''),
                    'updated_at': datetime.now(timezone.utc).isoformat()
                }
                logger.info(f"Thread {scraper.thread_id}: Collected metadata for r/{subreddit_name} - {subreddit_metadata.get('subscribers', 0)} subscribers")
            else:
                logger.warning(f"Thread {scraper.thread_id}: No subreddit metadata returned for r/{subreddit_name}")

            # Process posts and extract users
            all_posts = []
            all_posts.extend(result.get('hot_posts', []))
            all_posts.extend(result.get('weekly_posts', []))
            all_posts.extend(result.get('yearly_posts', []))

            # Extract users and prepare posts
            for post in all_posts:
                author = post.get('author', '')
                if author and author not in ['[deleted]', 'AutoModerator']:
                    # Add user for foreign key
                    response_data['users'][author] = {
                        'username': author,
                        'created_at': datetime.now(timezone.utc).isoformat()
                    }

                # Prepare post data
                cleaned_post = {
                    'reddit_id': post.get('reddit_id'),
                    'title': post.get('title'),
                    'author_username': post.get('author'),
                    'subreddit_name': post.get('subreddit_name', '').lower(),  # CRITICAL: Normalize to lowercase to match DB
                    'score': post.get('score', 0),
                    'upvote_ratio': post.get('upvote_ratio', 0),
                    'num_comments': post.get('num_comments', 0),
                    'created_utc': post.get('created_utc'),
                    'url': post.get('url'),
                    'selftext': post.get('selftext'),
                    'is_video': post.get('is_video', False),
                    'link_flair_text': post.get('link_flair_text'),
                    'over_18': post.get('over_18', False),
                    'created_at': datetime.now(timezone.utc).isoformat()
                }
                # Keep all fields for consistent schema - don't remove None values
                response_data['posts'].append(cleaned_post)

            # Log success with detailed metrics
            hot_count = len(result.get('hot_posts', []))
            weekly_count = len(result.get('weekly_posts', []))
            yearly_count = len(result.get('yearly_posts', []))
            unique_users = len(response_data['users'])
            total_posts = len(response_data['posts'])

            logger.info(f"[SubredditScraper] Successfully scraped r/{subreddit_name} - "
                       f"{hot_count} hot, {weekly_count} weekly, {yearly_count} yearly posts")
            logger.info(f"Thread {scraper.thread_id}: Collected {unique_users} unique users and {total_posts} total posts from r/{subreddit_name}")

            # Track stats
            self.stats['subreddits_processed'] += 1
            self.stats['posts_processed'] += total_posts
            self.stats['users_processed'] += unique_users

            # For OK subreddits, track hot post users for enrichment
            if subreddit_type == 'ok' and result.get('hot_posts'):
                await self.track_users_from_posts(result['hot_posts'], subreddit_name)

            return response_data

        except Exception as e:
            logger.error(f"❌ Thread {scraper.thread_id}: Error processing r/{subreddit.get('name')}: {e}")
            return {}

    async def batch_write_parallel_data(self, batch_subreddits: List[Dict],
                                       batch_users: Dict,
                                       batch_posts: List[Dict],
                                       batch_num: int):
        """Write data from a parallel batch to the database"""
        try:
            logger.info(f"📝 Writing parallel batch {batch_num + 1} data: "
                       f"{len(batch_subreddits)} subreddits, {len(batch_users)} users, {len(batch_posts)} posts")

            # Write subreddits first
            if batch_subreddits:
                for i in range(0, len(batch_subreddits), 100):
                    chunk = batch_subreddits[i:i+100]
                    try:
                        # Normalize subreddit names before saving
                        for sub in chunk:
                            if 'name' in sub:
                                # Keep original case in display_name
                                if 'display_name' not in sub or not sub['display_name']:
                                    sub['display_name'] = sub['name']
                                # Normalize name to lowercase
                                sub['name'] = sub['name'].lower()

                        # Batch upsert with normalized names
                        self.supabase.table('reddit_subreddits').upsert(
                            chunk,
                            on_conflict='name'
                        ).execute()
                    except Exception as e:
                        logger.error(f"❌ Failed to write subreddit chunk: {e}")

            # Write users second (for foreign keys)
            if batch_users:
                users_list = list(batch_users.values())
                for i in range(0, len(users_list), 100):
                    chunk = users_list[i:i+100]
                    try:
                        self.supabase.table('reddit_users').upsert(
                            chunk,
                            on_conflict='username'
                        ).execute()
                    except Exception as e:
                        logger.error(f"❌ Failed to write user chunk: {e}")

            # Write posts last (needs users to exist)
            if batch_posts:
                # Deduplicate posts by reddit_id before writing
                seen_ids = set()
                unique_posts = []
                for post in batch_posts:
                    if post.get('reddit_id') and post['reddit_id'] not in seen_ids:
                        seen_ids.add(post['reddit_id'])
                        unique_posts.append(post)

                if len(unique_posts) < len(batch_posts):
                    logger.info(f"Deduplicated posts: {len(batch_posts)} -> {len(unique_posts)}")
                batch_posts = unique_posts

                for i in range(0, len(batch_posts), 100):
                    chunk = batch_posts[i:i+100]
                    try:
                        self.supabase.table('reddit_posts').upsert(
                            chunk,
                            on_conflict='reddit_id'
                        ).execute()
                    except Exception as e:
                        logger.error(f"❌ Failed to write posts chunk: {e}")

            logger.info(f"✅ Batch write completed for parallel batch {batch_num + 1}")

        except Exception as e:
            logger.error(f"❌ Failed to write parallel batch data: {e}")
            import traceback
            logger.error(f"Traceback: {traceback.format_exc()}")

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

            # Process users in batches with configurable limit
            users_list = list(self.discovered_users)[:self.config.max_users_per_cycle]
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
        calculator = RequirementsCalculator()

        for subreddit_name, req_data in self.subreddit_requirements.items():
            if not req_data['users']:
                continue

            try:
                # Convert data format for RequirementsCalculator
                # The calculator expects user_data with 'link_karma', 'comment_karma', 'account_age_days'
                user_data = []
                for i, user in enumerate(req_data['users']):
                    user_data.append({
                        'link_karma': req_data['post_karmas'][i] if i < len(req_data['post_karmas']) else 0,
                        'comment_karma': req_data['comment_karmas'][i] if i < len(req_data['comment_karmas']) else 0,
                        'account_age_days': req_data['ages'][i] if i < len(req_data['ages']) else 0
                    })

                # Calculate requirements using 25th percentile (to match previous behavior)
                requirements = calculator.calculate_percentile_requirements(user_data, percentile=25)

                # Update subreddit with requirements
                update_data = {
                    'min_post_karma': requirements['min_post_karma'],
                    'min_comment_karma': requirements['min_comment_karma'],
                    'min_account_age_days': requirements['min_account_age_days'],
                    'requirements_sample_size': requirements['requirement_sample_size'],
                    'requirements_updated_at': datetime.now(timezone.utc).isoformat()
                }

                self.supabase.table('reddit_subreddits').update(update_data).eq(
                    'name', subreddit_name.lower()
                ).execute()

                logger.info(f"📊 Updated requirements for r/{subreddit_name}: "
                           f"post_karma≥{requirements['min_post_karma']}, "
                           f"comment_karma≥{requirements['min_comment_karma']}, "
                           f"age≥{requirements['min_account_age_days']}d "
                           f"(n={requirements['requirement_sample_size']})")

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
                'subscribers.desc'
            ).limit(self.config.discovery_limit).execute()  # Use configurable discovery limit

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

                # Validate and check if it's a User Feed
                try:
                    validated_name = validate_subreddit_name(name)
                    if validated_name.startswith('u_'):
                        await self._mark_as_user_feed(validated_name)
                        continue
                except ValidationException as e:
                    logger.warning(f"Invalid subreddit name '{name}': {e}")
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

                            # Apply 20% boost for SFW subreddits in discovery too
                            nsfw_percentage = final_data.get('nsfw_percentage', 0)
                            if nsfw_percentage < 10 and 'subreddit_score' in final_data:
                                original_score = final_data['subreddit_score']
                                final_data['subreddit_score'] = original_score * 1.2
                                logger.debug(f"Applied SFW boost to discovered r/{name}: {original_score:.1f} -> {final_data['subreddit_score']:.1f}")

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
            # Use direct SQL update to avoid schema cache issues
            result = self.supabase.rpc('update_subreddit_review', {
                'subreddit_name': name.lower(),
                'review_status': 'User Feed'
            }).execute()
            self.user_feed_subreddits.add(name.lower())
            logger.info(f"Marked r/{name} as User Feed")
        except Exception as e:
            # Fallback to direct update if RPC doesn't exist
            try:
                self.supabase.table('reddit_subreddits').update({
                    'review': 'User Feed',
                    'updated_at': datetime.now(timezone.utc).isoformat()
                }).eq('name', name.lower()).execute()
                self.user_feed_subreddits.add(name.lower())
                logger.info(f"Marked r/{name} as User Feed (fallback)")
            except Exception as e2:
                # Just log the error and continue - don't let this stop the scraper
                logger.warning(f"Could not mark r/{name} as User Feed (will skip): {e2}")
                self.user_feed_subreddits.add(name.lower())  # Still add to memory cache

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
            # Just log the error and continue - don't let this stop the scraper
            logger.warning(f"Could not mark r/{name} as Banned (will skip): {e}")
            self.banned_subreddits.add(name.lower())  # Still add to memory cache

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
            # Just log the error and continue - don't let this stop the scraper
            logger.warning(f"Could not mark r/{name} as Non Related (will skip): {e}")
            self.non_related_subreddits.add(name.lower())  # Still add to memory cache

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

    def log_proxy_stats(self):
        """Log detailed proxy usage statistics using proper logger"""
        if not self.stats['start_time']:
            logger.info("No statistics available - scraper hasn't run yet")
            return

        start_time = datetime.fromisoformat(self.stats['start_time'])
        runtime = datetime.now(timezone.utc) - start_time

        # Log core statistics
        logger.info("📊 PROXY-ENABLED SCRAPER STATS:")
        logger.info(f"⏱️  Runtime: {runtime}")
        logger.info(f"🔍 Subreddits processed: {self.stats['subreddits_processed']}")
        logger.info(f"👤 Users processed: {self.stats['users_processed']}")
        logger.info(f"📝 Posts processed: {self.stats['posts_processed']}")
        logger.info(f"🌟 Discoveries made: {self.stats['discoveries_made']}")
        logger.info(f"🌐 Total requests: {self.stats['total_requests']}")
        logger.info(f"🔒 Proxy requests: {self.stats['proxy_requests']}")
        logger.info(f"🔓 Direct requests: {self.stats['direct_requests']}")
        logger.info(f"💾 Cache hits: {self.stats['cache_hits']}")
        logger.info(f"⚠️  Rate limits hit: {self.stats['rate_limits']}")

        # Log proxy-specific stats if available
        if self.proxy_manager:
            proxy_stats = self.proxy_manager.get_proxy_stats()
            if proxy_stats and isinstance(proxy_stats, dict) and 'proxies' in proxy_stats:
                logger.info("📊 Proxy Performance:")
                for proxy_info in proxy_stats['proxies']:
                    name = proxy_info.get('name') or proxy_info.get('service')
                    db = proxy_info.get('db_stats', {})
                    total_requests = db.get('total_requests', 0)
                    success_count = db.get('success_count', 0)
                    success_rate = (success_count / max(1, total_requests)) * 100
                    avg_response_time = db.get('avg_response_time_ms', 0)
                    logger.info(f"   {name}: {success_rate:.1f}% success, {avg_response_time:.0f}ms avg response")

        # Thread statistics
        if self.scrapers:
            logger.info("🧵 Thread Activity:")
            for scraper in self.scrapers:
                scraper_stats = scraper.get_stats()
                thread_id = scraper_stats.get('thread_id', '?')
                thread_stats = scraper_stats.get('stats', {})
                logger.info(f"   Thread {thread_id}: {thread_stats.get('items_processed', 0)} items, "
                          f"{thread_stats.get('requests_successful', 0)} successful requests")

    async def log_to_database(self, level: str, message: str):
        """Log to Supabase system_logs table"""
        try:
            self.supabase.table('system_logs').insert({
                'timestamp': datetime.now(timezone.utc).isoformat(),
                'source': 'reddit_scraper',
                'script_name': 'reddit_scraper',
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