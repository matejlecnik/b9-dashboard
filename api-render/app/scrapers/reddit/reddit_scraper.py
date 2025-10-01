#!/usr/bin/env python3
"""
Reddit Scraper

Main scraper implementation - handles all data collection, logging, and metrics
"""
import asyncio
import logging
import os
import random
import queue
import sys
import threading
import time

# ThreadPoolExecutor no longer needed - v3.3.0 uses simple loop for username-only saving
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Set

# Handle imports for both standalone and module execution
current_dir = os.path.dirname(os.path.abspath(__file__))

# Add parent directories to path for imports
api_root = os.path.join(current_dir, "..", "..", "..")
if api_root not in sys.path:
    sys.path.insert(0, api_root)
try:
    from .proxy_manager import ProxyManager
    from .public_reddit_api import PublicRedditAPI
except ImportError:
    # Fallback for standalone execution
    import importlib.util

    proxy_path = os.path.join(current_dir, "proxy_manager.py")
    spec = importlib.util.spec_from_file_location("proxy_manager", proxy_path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    ProxyManager = module.ProxyManager

    api_path = os.path.join(current_dir, "public_reddit_api.py")
    spec = importlib.util.spec_from_file_location("public_reddit_api", api_path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    PublicRedditAPI = module.PublicRedditAPI

# Import Supabase logging handler
try:
    from app.core.utils.supabase_logger import SupabaseLogHandler
except ImportError:
    # Fallback for standalone execution
    supabase_logger_path = os.path.join(
        api_root, "app", "core", "utils", "supabase_logger.py"
    )
    if os.path.exists(supabase_logger_path):
        spec = importlib.util.spec_from_file_location(
            "supabase_logger", supabase_logger_path
        )
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        SupabaseLogHandler = module.SupabaseLogHandler
    else:
        SupabaseLogHandler = None  # Graceful degradation if not available

SCRAPER_VERSION = "3.6.1"

logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Reduce noise from external libraries
logging.getLogger("httpx").setLevel(logging.WARNING)
logging.getLogger("httpcore").setLevel(logging.WARNING)


class RedditScraper:
    """Main Reddit scraper - self-contained with logging and metrics"""

    def __init__(self, supabase):
        self.supabase = supabase
        self.running = False

        # Set up dual logging (console + Supabase)
        self._setup_supabase_logging()

        self.proxy_manager = ProxyManager(supabase)
        self.api = (
            None  # Async API for subreddit processing (will be initialized in run())
        )

        # Threading structures
        self.subreddit_queue = queue.Queue()
        self.cache_lock = threading.Lock()  # Protects all caches

        # Cache for Non Related subreddits (refreshed periodically)
        self.non_related_cache: Set[str] = set()
        self.user_feed_cache: Set[str] = set()
        self.banned_cache: Set[str] = set()
        self.ok_cache: Set[str] = set()  # Ok subreddits (Loop 1 targets)
        self.no_seller_cache: Set[str] = set()  # No Seller subreddits (Loop 2 targets)
        self.null_review_cache: Set[
            str
        ] = set()  # NULL review subreddits (awaiting manual review)
        self.session_processed: Set[
            str
        ] = set()  # Subreddits processed in this session (prevents re-discovery)
        self.session_fetched_users: Set[
            str
        ] = (
            set()
        )  # Users whose posts we've already fetched (prevents duplicate fetches)
        self.skip_cache_time = None
        self.cache_ttl = timedelta(hours=1)  # Refresh cache every hour

        # Cache subreddit metadata (review, primary_category, tags, over18)
        # Key: subreddit_name, Value: dict with metadata
        self.subreddit_metadata_cache: Dict[str, dict] = {}

    def _setup_supabase_logging(self):
        """Configure dual logging: console (existing) + Supabase system_logs"""
        if not SupabaseLogHandler or not self.supabase:
            logger.warning("⚠️  Supabase logging not available - console only")
            return

        # Get the scraper's logger
        scraper_logger = logging.getLogger(__name__)

        # Check if Supabase handler already exists
        has_supabase_handler = any(
            isinstance(handler, SupabaseLogHandler)
            for handler in scraper_logger.handlers
        )

        if not has_supabase_handler:
            # Create Supabase log handler
            supabase_handler = SupabaseLogHandler(
                supabase_client=self.supabase,
                source="reddit_scraper",
                buffer_size=10,  # Flush every 10 logs
                flush_interval=30,  # Or every 30 seconds
            )
            supabase_handler.setLevel(logging.INFO)

            # Use same formatter as console
            formatter = logging.Formatter("%(asctime)s - %(levelname)s - %(message)s")
            supabase_handler.setFormatter(formatter)

            # Add to logger (keeps existing console handler)
            scraper_logger.addHandler(supabase_handler)

            # Also add to PublicRedditAPI logger for API request logging
            api_logger = logging.getLogger("public_reddit_api")
            api_logger.addHandler(supabase_handler)
            api_logger.setLevel(logging.INFO)

            logger.info(f"✅ Supabase logging enabled (source: reddit_scraper)")

    async def run(self):
        """Main scraper loop"""
        logger.info(f"🚀 Starting Reddit Scraper v{SCRAPER_VERSION}")
        logger.info(
            f"📝 Version: {SCRAPER_VERSION} | Dual logging: console + Supabase system_logs\n"
        )

        # Phase 1: Load and test proxies
        logger.info("📡 Phase 1: Proxy Setup")

        # Load proxies from database
        proxy_count = self.proxy_manager.load_proxies()
        if proxy_count == 0:
            logger.error("❌ No active proxies found in database")
            raise RuntimeError("Cannot start scraper: No active proxies configured")

        # Test all proxies
        working_proxies = self.proxy_manager.test_all_proxies()
        if working_proxies == 0:
            logger.error("❌ No working proxies - scraper cannot start")
            raise RuntimeError(
                "Cannot start scraper: All proxies failed connectivity test"
            )

        logger.info(
            f"   ✅ {working_proxies}/{proxy_count} proxies working | {working_proxies} threads ready\n"
        )

        # Phase 2: Load target subreddits
        logger.info("📋 Phase 2: Target Subreddits")

        # Load skip caches first (Non Related, User Feed, Banned)
        await self.load_skip_caches()

        # Get target subreddits by review status
        subreddits_by_status = await self.get_target_subreddits()
        ok_subreddits = subreddits_by_status.get("ok", [])
        no_seller_subreddits = subreddits_by_status.get("no_seller", [])

        if not ok_subreddits and not no_seller_subreddits:
            logger.warning("⚠️ No target subreddits found - nothing to scrape")
            raise RuntimeError("Cannot start scraper: No target subreddits configured")

        # Mark as running
        self.running = True

        # Phase 3: Process subreddits
        logger.info("📋 Phase 3: Processing Subreddits")

        # Initialize API clients:
        # - Async API for subreddit processing (not rate-limited, works fine)
        # - Sync API for user processing (natural throttling from Python GIL)
        async with PublicRedditAPI(self.proxy_manager) as api_client:
            self.api = api_client

            # Process OK subreddits sequentially (1 at a time with 5 threaded users)
            logger.info(
                f"\n🎯 Processing {len(ok_subreddits)} OK subreddits sequentially..."
            )

            for idx, subreddit_name in enumerate(ok_subreddits):
                if not self.running:
                    break

                logger.info(f"\n[{idx+1}/{len(ok_subreddits)}]")

                try:
                    discovered = await self.process_subreddit(
                        subreddit_name, process_users=True, allow_discovery=True
                    )

                    # Process discovered subreddits IMMEDIATELY
                    if isinstance(discovered, set) and len(discovered) > 0:
                        # Filter to get only new subreddits
                        filtered = await self.filter_existing_subreddits(discovered)

                        # Add ALL discoveries to session cache (prevents duplicate "NEW" logging)
                        self.session_processed.update(discovered)

                        if filtered:
                            logger.info(
                                f"\n   🔍 Processing {len(filtered)} discovered subreddits immediately..."
                            )

                            for discovery_idx, new_sub in enumerate(filtered, 1):
                                try:
                                    if not self.running:
                                        break

                                    # Mark u_ subreddits as User Feed (skip processing), others as NULL (full analysis)
                                    if new_sub not in self.subreddit_metadata_cache:
                                        # u_ = user profile feeds (skip full processing, just save to DB)
                                        if new_sub.startswith("u_"):
                                            self.subreddit_metadata_cache[new_sub] = {
                                                "review": "User Feed",
                                                "primary_category": None,
                                                "tags": [],
                                            }
                                            # Save u_ subreddit directly to DB (skip process_discovered_subreddit to avoid duplicates)
                                            try:
                                                self.supabase.table(
                                                    "reddit_subreddits"
                                                ).upsert(
                                                    {
                                                        "name": new_sub,
                                                        "review": "User Feed",
                                                    },
                                                    on_conflict="name",
                                                ).execute()
                                                logger.info(
                                                    f"      [{discovery_idx}/{len(filtered)}] 💾 r/{new_sub} (User Feed)"
                                                )
                                            except Exception as e:
                                                logger.debug(
                                                    f"      ⚠️  Failed to save u_ subreddit r/{new_sub}: {e}"
                                                )
                                            continue  # Skip full processing for u_ subreddits
                                        else:
                                            # Regular subreddit = NULL for full analysis
                                            self.subreddit_metadata_cache[new_sub] = {
                                                "review": None,  # NULL = new discovery, needs full analysis
                                                "primary_category": None,
                                                "tags": [],
                                            }

                                    # Skip processing if already in cache (already processed or is u_ subreddit)
                                    if (
                                        new_sub in self.subreddit_metadata_cache
                                        and new_sub.startswith("u_")
                                    ):
                                        continue

                                    logger.info(
                                        f"      [{discovery_idx}/{len(filtered)}] 🆕 r/{new_sub}"
                                    )
                                    await self.process_discovered_subreddit(new_sub)
                                    await asyncio.sleep(random.uniform(0.15, 0.45))

                                except Exception as e:
                                    logger.error(
                                        f"❌ Error processing discovery r/{new_sub}: {e}"
                                    )
                                    continue  # Continue to next discovery instead of breaking entire loop

                            logger.info(
                                f"   ✅ Completed processing {len(filtered)} discoveries from r/{subreddit_name}\n"
                            )

                except Exception as e:
                    logger.error(
                        f"❌ Error processing Ok subreddit {subreddit_name}: {e}"
                    )

                # Delay between subreddits (avoid rate limit pattern)
                if idx < len(ok_subreddits) - 1:
                    delay = random.uniform(1.0, 2.0)
                    await asyncio.sleep(delay)

            # Process No Seller subreddits sequentially (data update only)
            if no_seller_subreddits:
                logger.info(
                    f"\n📊 Processing {len(no_seller_subreddits)} No Seller subreddits sequentially..."
                )

                for idx, subreddit_name in enumerate(no_seller_subreddits):
                    if not self.running:
                        break

                    logger.info(f"\n[{idx+1}/{len(no_seller_subreddits)}]")

                    try:
                        await self.process_subreddit(
                            subreddit_name, process_users=False, allow_discovery=False
                        )
                    except Exception as e:
                        logger.error(
                            f"❌ Error processing No Seller subreddit {subreddit_name}: {e}"
                        )

                    # Delay between subreddits
                    if idx < len(no_seller_subreddits) - 1:
                        delay = random.uniform(1.0, 2.0)
                        await asyncio.sleep(delay)

            logger.info("\n✅ All subreddits processed")

            # Keep running (will be stopped by controller)
            while self.running:
                await asyncio.sleep(60)

    async def _fetch_subreddits_paginated(
        self, review_status: str, fields: str = "name"
    ) -> List[dict]:
        """Fetch all subreddits with pagination - uses Supabase's default max per page

        Args:
            review_status: Review status to filter by
            fields: Comma-separated fields to select

        Returns:
            List of subreddit dictionaries
        """
        all_data = []
        offset = 0
        max_page_size = None  # Will be detected from first response
        iteration = 0

        while True:
            iteration += 1
            logger.info(
                f"📄 Pagination [{review_status}] iteration {iteration}: offset={offset}"
            )

            # No .limit() - let Supabase use its default max (range is large to not restrict)
            response = (
                self.supabase.table("reddit_subreddits")
                .select(fields)
                .eq("review", review_status)
                .range(offset, offset + 9999)
                .execute()
            )

            rows_returned = len(response.data) if response.data else 0
            logger.info(
                f"📄 [{review_status}] Got {rows_returned} rows, total so far: {len(all_data) + rows_returned}"
            )

            if not response.data:
                logger.info(f"📄 [{review_status}] BREAK: No data (empty response)")
                break

            # First page: detect Supabase's actual max page size
            if max_page_size is None:
                max_page_size = len(response.data)
                logger.info(
                    f"📄 [{review_status}] Detected Supabase max page size: {max_page_size}"
                )

            all_data.extend(response.data)

            # If we got less than first page size, we've reached the end
            if len(response.data) < max_page_size:
                logger.info(
                    f"📄 [{review_status}] BREAK: Got {len(response.data)} < {max_page_size} (last page)"
                )
                break

            offset += len(response.data)  # Use actual rows returned

        logger.info(
            f"📄 Pagination complete for review={review_status}: {len(all_data)} total rows in {iteration} iterations"
        )
        return all_data

    async def get_target_subreddits(self) -> Dict[str, List[str]]:
        """Get subreddits by review status for different processing types
        Also caches metadata (review, primary_category, tags, over18) for each subreddit

        Returns:
            dict: {'ok': [...], 'no_seller': [...]}
        """
        try:
            # Get OK subreddits for full processing (users + discovery) with pagination
            ok_data = await self._fetch_subreddits_paginated(
                "Ok", "name, review, primary_category, tags, over18"
            )

            # Get No Seller subreddits for data update only with pagination
            no_seller_data = await self._fetch_subreddits_paginated(
                "No Seller", "name, review, primary_category, tags, over18"
            )

            ok_subreddits = []
            no_seller_subreddits = []

            # Process OK subreddits and cache metadata
            for item in ok_data:
                name = item["name"]
                ok_subreddits.append(name)
                # Cache metadata for updates
                self.subreddit_metadata_cache[name] = {
                    "review": item.get("review"),
                    "primary_category": item.get("primary_category"),
                    "tags": item.get("tags"),
                    "over18": item.get("over18"),
                }

            # Process No Seller subreddits and cache metadata
            for item in no_seller_data:
                name = item["name"]
                no_seller_subreddits.append(name)
                # Cache metadata for updates
                self.subreddit_metadata_cache[name] = {
                    "review": item.get("review"),
                    "primary_category": item.get("primary_category"),
                    "tags": item.get("tags"),
                    "over18": item.get("over18"),
                }

            # Randomize order to distribute load
            random.shuffle(ok_subreddits)
            random.shuffle(no_seller_subreddits)

            total = len(ok_subreddits) + len(no_seller_subreddits)
            logger.info(
                f"   ✅ Targets: {len(ok_subreddits)} Ok + {len(no_seller_subreddits)} No Seller = {total} total"
            )

            return {"ok": ok_subreddits, "no_seller": no_seller_subreddits}

        except Exception as e:
            logger.error(f"❌ Failed to fetch target subreddits: {e}")
            return {"ok": [], "no_seller": []}

    async def load_skip_caches(self):
        """Load Non Related, User Feed, and Banned subreddits to skip processing"""
        # Check if cache is still fresh
        if (
            self.skip_cache_time
            and datetime.now(timezone.utc) - self.skip_cache_time < self.cache_ttl
        ):
            return  # Cache still valid

        try:
            # Load Non Related subreddits with pagination
            non_related_data = await self._fetch_subreddits_paginated(
                "Non Related", "name"
            )
            self.non_related_cache = (
                {item["name"] for item in non_related_data}
                if non_related_data
                else set()
            )

            # Load User Feed subreddits with pagination
            user_feed_data = await self._fetch_subreddits_paginated("User Feed", "name")
            self.user_feed_cache = (
                {item["name"] for item in user_feed_data} if user_feed_data else set()
            )

            # Load Banned subreddits with pagination
            banned_data = await self._fetch_subreddits_paginated("Banned", "name")
            self.banned_cache = (
                {item["name"] for item in banned_data} if banned_data else set()
            )

            # Load Ok subreddits (will be processed in Loop 1 - skip during discovery)
            ok_data = await self._fetch_subreddits_paginated("Ok", "name")
            self.ok_cache = {item["name"] for item in ok_data} if ok_data else set()

            # Load No Seller subreddits (will be processed in Loop 2 - skip during discovery)
            no_seller_data = await self._fetch_subreddits_paginated("No Seller", "name")
            self.no_seller_cache = (
                {item["name"] for item in no_seller_data} if no_seller_data else set()
            )

            # Load NULL review subreddits (already discovered, awaiting manual review - skip during discovery)
            # Note: Cannot use _fetch_subreddits_paginated() as it uses .eq() which doesn't work for NULL
            # Must use .is_('review', 'null') for NULL filtering
            null_review_data = []
            offset = 0
            max_page_size = None
            iteration = 0

            while True:
                iteration += 1
                logger.info(
                    f"📄 Pagination [NULL] iteration {iteration}: offset={offset}"
                )

                response = (
                    self.supabase.table("reddit_subreddits")
                    .select("name")
                    .is_("review", "null")
                    .range(offset, offset + 9999)
                    .execute()
                )

                rows_returned = len(response.data) if response.data else 0
                logger.info(
                    f"📄 [NULL] Got {rows_returned} rows, total so far: {len(null_review_data) + rows_returned}"
                )

                if not response.data:
                    logger.info(f"📄 [NULL] BREAK: No data (empty response)")
                    break

                # First page: detect Supabase's actual max page size
                if max_page_size is None:
                    max_page_size = len(response.data)
                    logger.info(
                        f"📄 [NULL] Detected Supabase max page size: {max_page_size}"
                    )

                null_review_data.extend(response.data)

                # If we got less than first page size, we've reached the end
                if len(response.data) < max_page_size:
                    logger.info(
                        f"📄 [NULL] BREAK: Got {len(response.data)} < {max_page_size} (last page)"
                    )
                    break

                offset += len(response.data)

            logger.info(
                f"📄 Pagination complete for review=NULL: {len(null_review_data)} total rows in {iteration} iterations"
            )
            self.null_review_cache = (
                {item["name"] for item in null_review_data}
                if null_review_data
                else set()
            )

            # Update cache timestamp
            self.skip_cache_time = datetime.now(timezone.utc)

            total_skip = (
                len(self.non_related_cache)
                + len(self.user_feed_cache)
                + len(self.banned_cache)
                + len(self.ok_cache)
                + len(self.no_seller_cache)
                + len(self.null_review_cache)
            )
            logger.info(
                f"   🚫 Skip: {len(self.non_related_cache)} Non Related + {len(self.user_feed_cache)} User Feed + {len(self.banned_cache)} Banned + {len(self.ok_cache)} Ok + {len(self.no_seller_cache)} No Seller + {len(self.null_review_cache)} NULL = {total_skip} total"
            )

        except Exception as e:
            logger.error(f"❌ Failed to load skip caches: {e}")
            self.non_related_cache = set()
            self.user_feed_cache = set()
            self.banned_cache = set()
            self.ok_cache = set()
            self.no_seller_cache = set()
            self.null_review_cache = set()

    def validate_api_data(self, data, data_name: str) -> bool:
        """Check if API response data is valid

        Args:
            data: API response data to validate
            data_name: Name of data for logging (e.g., 'rules', 'subreddit_info')

        Returns:
            True if data is valid, False if None/empty/error
        """
        if data is None:
            logger.warning(f"⚠️  {data_name} is None")
            return False
        if isinstance(data, dict) and "error" in data:
            logger.warning(f"⚠️  {data_name} has error: {data.get('error')}")
            return False
        return True

    async def filter_existing_subreddits(self, subreddit_names: Set[str]) -> Set[str]:
        """Filter out subreddits that already exist in database and were recently scraped

        Args:
            subreddit_names: Set of subreddit names to check

        Returns:
            Set of subreddit names that need scraping (new or stale)
        """
        if not subreddit_names:
            return set()

        # Load skip caches if needed
        await self.load_skip_caches()

        # Remove Non Related, User Feed, Banned, Ok, No Seller, and NULL review subreddits immediately
        original_count = len(subreddit_names)
        all_skip_subreddits = (
            self.non_related_cache
            | self.user_feed_cache
            | self.banned_cache
            | self.ok_cache
            | self.no_seller_cache
            | self.null_review_cache
        )
        subreddit_names = subreddit_names - all_skip_subreddits
        filtered_count = original_count - len(subreddit_names)

        if filtered_count > 0:
            logger.info(
                f"🚫 Filtered out {filtered_count} subreddits (Non Related/User Feed/Banned/Ok/No Seller/NULL) from discovery"
            )

        try:
            # Convert set to list for database query
            subreddit_list = list(subreddit_names)

            # Check which subreddits exist and when they were last scraped
            resp = (
                self.supabase.table("reddit_subreddits")
                .select("name, last_scraped_at")
                .in_("name", subreddit_list)
                .execute()
            )

            existing_subreddits = set()
            stale_subreddits = set()

            if resp.data:
                # Define staleness threshold (24 hours)
                staleness_threshold = datetime.now(timezone.utc) - timedelta(hours=24)

                for row in resp.data:
                    subreddit_name = row["name"]
                    last_scraped = row.get("last_scraped_at")

                    if last_scraped:
                        try:
                            last_scraped_dt = datetime.fromisoformat(
                                last_scraped.replace("Z", "+00:00")
                            )
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

            logger.info("📊 Subreddit filtering results:")
            logger.info(
                f"   🆕 New subreddits: {len(new_subreddits - stale_subreddits)}"
            )
            logger.info(f"   🔄 Stale subreddits (>24h): {len(stale_subreddits)}")
            logger.info(f"   ✅ Fresh subreddits (skipped): {len(existing_subreddits)}")
            logger.info(f"   🎯 Total to scrape: {len(total_to_scrape)}")

            return total_to_scrape

        except Exception as e:
            logger.error(f"❌ Error filtering existing subreddits: {e}")
            # Return all subreddits if filtering fails
            return subreddit_names

    async def process_subreddit(
        self,
        subreddit_name: str,
        process_users: bool = True,
        allow_discovery: bool = True,
    ) -> set:
        """Two-pass processing for a single subreddit

        Args:
            subreddit_name: Name of subreddit to process
            process_users: False for 'No Seller' subreddits (skip user processing)
            allow_discovery: False to prevent discovering more subreddits (for Loop 3)

        Returns:
            Set of discovered subreddit names (empty if not allow_discovery or not process_users)
        """
        # Get proxy for this subreddit
        proxy = self.proxy_manager.get_next_proxy()

        logger.info(f"🔄 Processing r/{subreddit_name} via {proxy['display_name']}")

        # Populate cache from database to preserve review/category/tags/over18 during UPSERT
        try:
            result = (
                self.supabase.table("reddit_subreddits")
                .select("review, primary_category, tags, over18")
                .eq("name", subreddit_name)
                .execute()
            )

            if result.data:
                self.subreddit_metadata_cache[subreddit_name] = {
                    "review": result.data[0].get("review"),
                    "primary_category": result.data[0].get("primary_category"),
                    "tags": result.data[0].get("tags", []),
                    "over18": result.data[0].get("over18", False),
                }
        except Exception as e:
            logger.warning(
                f"⚠️  Failed to load metadata cache for r/{subreddit_name}: {e}"
            )

        # ========== PASS 1: Fetch & Save Subreddit + Posts ==========

        # 1. Parallelize all API calls (3-5x speedup: 2.5-5s → 0.8-1.2s)
        subreddit_info, rules, hot_10, top_10_weekly = await asyncio.gather(
            self.api.get_subreddit_info(subreddit_name, proxy),
            self.api.get_subreddit_rules(subreddit_name, proxy),
            self.api.get_subreddit_hot_posts(subreddit_name, 10, proxy),
            self.api.get_subreddit_top_posts(subreddit_name, "week", 10, proxy),
        )

        # 2. Check for banned/forbidden/not_found subreddits
        if isinstance(subreddit_info, dict) and "error" in subreddit_info:
            error_type = subreddit_info.get("error")
            if error_type in ["banned", "forbidden", "not_found"]:
                logger.warning(
                    f"🚫 r/{subreddit_name} is {error_type} - marking as Banned"
                )

                # Save minimal record with review='Banned'
                try:
                    payload = {
                        "name": subreddit_name,
                        "review": "Banned",
                        "last_scraped_at": datetime.now(timezone.utc).isoformat(),
                    }
                    self.supabase.table("reddit_subreddits").upsert(
                        payload, on_conflict="name"
                    ).execute()
                    logger.info(f"   💾 Saved r/{subreddit_name} as Banned")

                    # Add to banned cache
                    self.banned_cache.add(subreddit_name)
                except Exception as e:
                    logger.error(
                        f"❌ Failed to save banned subreddit r/{subreddit_name}: {e}"
                    )

                return set()  # Return early
            else:
                logger.error(f"❌ Failed to fetch r/{subreddit_name}: {error_type}")
                return set()

        # 3. Validate and retry individual API responses
        max_retries = 3

        # Validate subreddit_info (critical)
        if not self.validate_api_data(subreddit_info, "subreddit_info"):
            logger.error(
                f"❌ Invalid subreddit_info for r/{subreddit_name} after retries"
            )
            return set()

        # Validate rules (retry if None)
        if not self.validate_api_data(rules, "rules"):
            for attempt in range(max_retries):
                logger.info(
                    f"   🔄 Retrying rules (attempt {attempt + 1}/{max_retries})..."
                )
                rules = await self.api.get_subreddit_rules(
                    subreddit_name, self.proxy_manager.get_next_proxy()
                )
                if self.validate_api_data(rules, "rules"):
                    break
            else:
                logger.warning(
                    f"⚠️  Using empty rules list after {max_retries} retries"
                )
                rules = []

        # Validate hot_10 (retry if None)
        if not self.validate_api_data(hot_10, "hot_10"):
            for attempt in range(max_retries):
                logger.info(
                    f"   🔄 Retrying hot_10 (attempt {attempt + 1}/{max_retries})..."
                )
                hot_10 = await self.api.get_subreddit_hot_posts(
                    subreddit_name, 10, self.proxy_manager.get_next_proxy()
                )
                if self.validate_api_data(hot_10, "hot_10"):
                    break
            else:
                logger.warning(
                    f"⚠️  Using empty hot_10 list after {max_retries} retries"
                )
                hot_10 = []

        # Validate top_10_weekly (retry if None)
        if not self.validate_api_data(top_10_weekly, "top_10_weekly"):
            for attempt in range(max_retries):
                logger.info(
                    f"   🔄 Retrying top_10_weekly (attempt {attempt + 1}/{max_retries})..."
                )
                top_10_weekly = await self.api.get_subreddit_top_posts(
                    subreddit_name, "week", 10, self.proxy_manager.get_next_proxy()
                )
                if self.validate_api_data(top_10_weekly, "top_10_weekly"):
                    break
            else:
                logger.warning(
                    f"⚠️  Using empty top_10_weekly list after {max_retries} retries"
                )
                top_10_weekly = []

        # 4. Analyze rules for auto-categorization
        description = subreddit_info.get("description", "")
        rules_combined = (
            " ".join([r.get("description") or "" for r in rules]) if rules else ""
        )
        auto_review = self.analyze_rules_for_review(rules_combined, description)

        # 5. Save subreddit (with auto_review if detected)
        self.save_subreddit(
            subreddit_name, subreddit_info, rules, top_10_weekly, auto_review
        )

        # Add to session cache to prevent re-discovery
        self.session_processed.add(subreddit_name)

        # 4. Collect posts but DON'T save yet (authors must be saved first)
        all_posts = hot_10 + top_10_weekly
        unique_posts = {post.get("id"): post for post in all_posts if post.get("id")}

        logger.info(f"   ✅ Saved r/{subreddit_name} (posts will be saved after users)")

        # ========== PASS 2: Process Users (if applicable) ==========

        if not process_users:
            logger.info(f"   📊 r/{subreddit_name} complete (No Seller - skipped users)")
            return set()  # No discoveries for No Seller subreddits

        # 5a. Extract authors from hot posts for discovery
        hot_authors = self.extract_authors(hot_10)

        # 5b. Extract authors from all posts for username saving
        all_authors = self.extract_authors(all_posts)
        logger.info(
            f"   👥 Found {len(all_authors)} unique authors ({len(hot_authors)} from hot posts)"
        )

        # 6. Discover subreddits from hot post authors (if enabled)
        discovered_subreddits = set()
        if allow_discovery and hot_authors:
            logger.info(
                f"   🔍 Discovering subreddits from {len(hot_authors)} hot post authors..."
            )

            # Filter out already-fetched users (optimization - prevents duplicate API calls)
            new_users = hot_authors - self.session_fetched_users
            cached_count = len(hot_authors) - len(new_users)
            if cached_count > 0:
                logger.info(
                    f"      🔄 Skipping {cached_count} already-fetched users (cache hit)"
                )

            # Fetch posts sequentially (one user at a time) - Reddit requires sequential requests
            user_posts_results = []
            hot_authors_list = list(new_users)

            logger.info(
                f"      📥 Fetching posts from {len(hot_authors_list)} users sequentially..."
            )

            for idx, username in enumerate(hot_authors_list, 1):
                try:
                    posts = await self.api.get_user_posts(
                        username,
                        limit=30,
                        proxy_config=self.proxy_manager.get_next_proxy(),
                    )
                    user_posts_results.append(posts)

                    if isinstance(posts, list) and len(posts) > 0:
                        # Cache user to prevent duplicate fetches in this session
                        self.session_fetched_users.add(username)
                        logger.info(
                            f"         [{idx}/{len(hot_authors_list)}] {username}: ✅ {len(posts)} posts"
                        )
                    elif isinstance(posts, list):
                        logger.info(
                            f"         [{idx}/{len(hot_authors_list)}] {username}: ⚠️  no posts"
                        )
                    else:
                        logger.info(
                            f"         [{idx}/{len(hot_authors_list)}] {username}: ❌ failed"
                        )
                except Exception as e:
                    logger.info(
                        f"         [{idx}/{len(hot_authors_list)}] {username}: ❌ error: {str(e)[:50]}"
                    )
                    user_posts_results.append(None)

                # Minimal delay between each user (10-50ms)
                if idx < len(hot_authors_list):
                    delay = random.uniform(0.01, 0.05)
                    await asyncio.sleep(delay)

            # Extract subreddits from posts
            for posts in user_posts_results:
                if isinstance(posts, list):
                    discovered_subreddits.update(
                        self.extract_subreddits_from_posts(posts)
                    )

            # Remove current subreddit
            discovered_subreddits.discard(subreddit_name)

            # Log raw extraction results
            logger.info(
                f"      🔍 Extracted {len(discovered_subreddits)} subreddits from user posts (before filtering)"
            )
            if len(discovered_subreddits) > 0 and len(discovered_subreddits) <= 10:
                logger.info(
                    f"         Raw subreddits: {', '.join(sorted(discovered_subreddits))}"
                )
            elif len(discovered_subreddits) > 10:
                logger.info(
                    f"         First 10: {', '.join(sorted(list(discovered_subreddits))[:10])}..."
                )

            # Filter using cache only (no database query)
            # Calculate what would be filtered by each cache
            if len(discovered_subreddits) > 0:
                filtered_non_related = discovered_subreddits & self.non_related_cache
                filtered_user_feed = discovered_subreddits & self.user_feed_cache
                filtered_banned = discovered_subreddits & self.banned_cache
                filtered_ok = discovered_subreddits & self.ok_cache
                filtered_no_seller = discovered_subreddits & self.no_seller_cache
                filtered_null_review = discovered_subreddits & self.null_review_cache
                filtered_session = discovered_subreddits & self.session_processed

                logger.info(f"      🚫 Filtering breakdown:")
                if filtered_non_related:
                    logger.info(f"         - {len(filtered_non_related)} Non Related")
                if filtered_user_feed:
                    logger.info(f"         - {len(filtered_user_feed)} User Feed")
                if filtered_banned:
                    logger.info(f"         - {len(filtered_banned)} Banned")
                if filtered_ok:
                    logger.info(f"         - {len(filtered_ok)} Ok (already tracked)")
                if filtered_no_seller:
                    logger.info(
                        f"         - {len(filtered_no_seller)} No Seller (already tracked)"
                    )
                if filtered_null_review:
                    logger.info(
                        f"         - {len(filtered_null_review)} NULL (already processed)"
                    )
                if filtered_session:
                    logger.info(
                        f"         - {len(filtered_session)} Already processed this session"
                    )

            all_known_subreddits = (
                self.non_related_cache
                | self.user_feed_cache
                | self.banned_cache
                | self.ok_cache
                | self.no_seller_cache
                | self.null_review_cache
                | self.session_processed
            )
            discovered_subreddits = discovered_subreddits - all_known_subreddits

            if len(discovered_subreddits) > 0:
                logger.info(
                    f"   ✅ Discovered {len(discovered_subreddits)} NEW subreddits: {', '.join(sorted(discovered_subreddits))}"
                )
            else:
                logger.info(f"   ✅ Discovered 0 new subreddits (all filtered)")

        # 7. Save usernames in batch (all authors)
        self.save_users_batch(all_authors)

        # 8. Save posts and return discoveries
        self.save_posts(list(unique_posts.values()), subreddit_name)
        logger.info(f"   💾 Saved {len(unique_posts)} subreddit posts")
        logger.info(f"   ✅ r/{subreddit_name} complete")

        return discovered_subreddits

    async def process_discovered_subreddit(self, subreddit_name: str):
        """Process discovered subreddit - metadata only, no user processing

        Args:
            subreddit_name: Name of discovered subreddit
        """
        # OPTIMIZATION: Skip user processing for all discoveries
        # We already collected user data from the main subreddit
        # Discoveries just need subreddit metadata saved
        await self.process_subreddit(
            subreddit_name,
            process_users=False,  # Skip user processing (optimization)
            allow_discovery=False,  # Don't discover more subreddits
        )

    def save_subreddit(
        self,
        name: str,
        info: dict,
        rules: list,
        top_weekly: list,
        auto_review: str = None,
    ):
        """Save/update subreddit in database with calculated metrics

        Args:
            name: Subreddit name
            info: Subreddit info dict from Reddit API
            rules: List of rule dicts from Reddit API
            top_weekly: List of top 10 weekly posts for calculations
            auto_review: Optional auto-categorized review status ('Non Related', etc.)
        """
        try:
            import math
            import json

            # Extract Reddit API fields
            subscribers = info.get("subscribers", 0) or 0
            title = info.get("title")
            description = info.get("description")
            public_description = info.get("public_description")
            over18_from_api = info.get("over18", False)
            created_utc = info.get("created_utc")
            allow_images = info.get("allow_images", False)
            allow_videos = info.get("allow_videos", False)
            allow_polls = info.get("allow_polls", False)
            spoilers_enabled = info.get("spoilers_enabled", False)

            # Extract visual/branding fields
            icon_img = info.get("icon_img")
            banner_img = info.get("banner_img")
            community_icon = info.get("community_icon")
            header_img = info.get("header_img")
            banner_background_color = info.get("banner_background_color")
            primary_color = info.get("primary_color")
            key_color = info.get("key_color")

            # Extract additional subreddit metadata
            display_name_prefixed = info.get("display_name_prefixed")
            is_quarantined = info.get("quarantine", False)
            lang = info.get("lang")
            link_flair_enabled = info.get("link_flair_enabled", False)
            link_flair_position = info.get("link_flair_position")
            mobile_banner_image = info.get("mobile_banner_image")
            submission_type = info.get("submission_type")
            submit_text = info.get("submit_text")
            submit_text_html = info.get("submit_text_html")
            subreddit_type = info.get("subreddit_type")
            url = info.get("url")
            user_flair_enabled_in_sr = info.get("user_flair_enabled_in_sr", False)
            user_flair_position = info.get("user_flair_position")
            wiki_enabled = info.get("wiki_enabled", False)

            # Calculate metrics from top_10_weekly
            weekly_total_score = sum(post.get("score", 0) or 0 for post in top_weekly)
            weekly_total_comments = sum(
                post.get("num_comments", 0) or 0 for post in top_weekly
            )
            weekly_count = len(top_weekly)  # Actual count (could be less than 10)

            # avg_upvotes = total upvotes / actual count (NOT divided by 10)
            avg_upvotes = (
                round(weekly_total_score / max(1, weekly_count), 2)
                if weekly_count > 0
                else 0
            )

            # engagement = total comments / total upvotes
            engagement = (
                round(weekly_total_comments / max(1, weekly_total_score), 6)
                if weekly_total_score > 0
                else 0
            )

            # subreddit_score = sqrt(engagement * avg_upvotes * 1000)
            subreddit_score = 0
            if engagement > 0 and avg_upvotes > 0:
                subreddit_score = round(math.sqrt(engagement * avg_upvotes * 1000), 2)

            # Detect verification requirement
            verification_required = self.detect_verification(rules, description)

            # Get cached metadata (preserved fields)
            cached = self.subreddit_metadata_cache.get(name, {})
            # Use auto_review if provided, otherwise use cached review
            review = auto_review if auto_review else cached.get("review")
            primary_category = cached.get("primary_category")
            tags = cached.get("tags", [])
            over18 = cached.get(
                "over18", over18_from_api
            )  # Use cached if exists, else API

            # Build payload
            payload = {
                "name": name,
                "title": title,
                "description": description,
                "public_description": public_description,
                "subscribers": subscribers,
                "over18": over18,  # Preserved from cache
                "created_utc": datetime.fromtimestamp(
                    created_utc, tz=timezone.utc
                ).isoformat()
                if created_utc
                else None,
                "allow_images": allow_images,
                "allow_videos": allow_videos,
                "allow_polls": allow_polls,
                "spoilers_enabled": spoilers_enabled,
                "verification_required": verification_required,
                "rules_data": json.dumps(rules) if rules else None,
                "engagement": engagement,
                "subreddit_score": subreddit_score,
                "avg_upvotes_per_post": avg_upvotes,  # Calculated metric
                "icon_img": icon_img,
                "banner_img": banner_img,
                "community_icon": community_icon,
                "header_img": header_img,
                "banner_background_color": banner_background_color,
                "primary_color": primary_color,
                "key_color": key_color,
                "display_name_prefixed": display_name_prefixed,
                "is_quarantined": is_quarantined,
                "lang": lang,
                "link_flair_enabled": link_flair_enabled,
                "link_flair_position": link_flair_position,
                "mobile_banner_image": mobile_banner_image,
                "submission_type": submission_type,
                "submit_text": submit_text,
                "submit_text_html": submit_text_html,
                "subreddit_type": subreddit_type,
                "url": url,
                "user_flair_enabled_in_sr": user_flair_enabled_in_sr,
                "user_flair_position": user_flair_position,
                "wiki_enabled": wiki_enabled,
                "review": review,  # Preserved from cache
                "primary_category": primary_category,  # Preserved from cache
                "tags": tags,  # Preserved from cache
                "last_scraped_at": datetime.now(timezone.utc).isoformat(),
            }

            # UPSERT to database with retry logic for connection pool errors
            max_retries = 3
            retry_delay = 0.5

            for attempt in range(max_retries):
                try:
                    _ = (
                        self.supabase.table("reddit_subreddits")
                        .upsert(payload, on_conflict="name")
                        .execute()
                    )
                    logger.info(
                        f"   💾 SUPABASE SAVE [reddit_subreddits]: r/{name} | subs={subscribers:,} | avg_upvotes={avg_upvotes} | score={subreddit_score} | engagement={engagement}"
                    )
                    break  # Success - exit retry loop
                except Exception as db_error:
                    if attempt < max_retries - 1:
                        logger.warning(
                            f"⚠️  DB save failed (attempt {attempt+1}/{max_retries}) - retrying in {retry_delay}s: {db_error}"
                        )
                        time.sleep(retry_delay)
                    else:
                        logger.error(
                            f"❌ Failed to save subreddit r/{name} after {max_retries} attempts: {db_error}"
                        )
                        raise  # Re-raise on final attempt

        except Exception as e:
            logger.error(f"❌ Failed to save subreddit r/{name}: {e}")

    def detect_verification(self, rules: list, description: str) -> bool:
        """Detect if subreddit requires verification from rules/description

        Args:
            rules: List of rule dicts (can be None)
            description: Subreddit description text (can be None)

        Returns:
            True if verification keywords found
        """
        # Handle None inputs
        rules = rules or []
        description = description or ""

        # Combine all text from rules and description
        # Use 'or ""' to handle None values in rule descriptions
        search_text = (
            " ".join([r.get("description") or "" for r in rules]) + " " + description
        )
        verification_keywords = ["verification", "verified", "verify"]
        return any(keyword in search_text.lower() for keyword in verification_keywords)

    def analyze_rules_for_review(self, rules_text: str, description: str = None) -> str:
        """Analyze rules/description for automatic 'Non Related' classification

        Uses comprehensive keyword detection across multiple categories to identify
        subreddits that are not relevant for OnlyFans creator promotion.

        Args:
            rules_text: Combined rules text from subreddit
            description: Subreddit description (optional)

        Returns:
            'Non Related' if detected, None otherwise (for manual review)
        """
        if not rules_text and not description:
            return None

        # Combine all text for searching
        combined = f"{rules_text or ''} {description or ''}".lower()

        # Comprehensive "Non Related" keywords across 10 categories
        non_related_keywords = [
            # Hentai/anime porn (14 keywords)
            "hentai",
            "anime porn",
            "rule34",
            "cartoon porn",
            "animated porn",
            "ecchi",
            "doujin",
            "drawn porn",
            "manga porn",
            "anime girls",
            "waifu",
            "2d girls",
            "anime babes",
            # Extreme fetishes (30+ keywords - not mainstream OnlyFans)
            "bbw",
            "ssbbw",
            "feederism",
            "weight gain",
            "fat fetish",
            "scat",
            "watersports",
            "golden shower",
            "piss",
            "abdl",
            "diaper",
            "adult baby",
            "little space",
            "age play",
            "ddlg",
            "vore",
            "inflation",
            "transformation",
            "macro",
            "giantess",
            "furry",
            "yiff",
            "anthro",
            "fursuit",
            "anthropomorphic",
            "guro",
            "necro",
            "gore",
            "death",
            "snuff",
            "femdom",
            "findom",
            "financial domination",
            "paypig",
            "sissy",
            "pregnant",
            "breeding",
            "impregnation",
            "preggo",
            "cuckold",
            "cuck",
            "hotwife",
            "bull",
            "chastity",
            "denial",
            "locked",
            "keyholder",
            "ballbusting",
            "cbt",
            "cock torture",
            "latex",
            "rubber",
            "bondage gear",
            "bdsm equipment",
            # SFW content requiring nudity (12 keywords)
            "nudity is required",
            "nudity required",
            "must be nude",
            "nudity mandatory",
            "nude only",
            "nudity is mandatory",
            "requires nudity",
            "no clothes allowed",
            "must show nudity",
            "nude content only",
            "full nudity required",
            "complete nudity",
            # Professional/career content (5 keywords)
            "career advice",
            "job hunting",
            "resume help",
            "interview tips",
            "academic discussion",
            # Cooking/recipe content
            "cooking recipes",
            "baking recipes",
            "meal prep recipes",
            # Gaming communities
            "pc master race",
            "console gaming discussion",
            "indie game development",
            # Politics/government
            "government policy",
            "election discussion",
            "political debate",
            "city council",
            "local government",
            # Animal/pet care
            "veterinary advice",
            "pet care tips",
            "animal rescue",
            # Academic/research
            "scientific research",
            "academic papers",
            "peer review",
        ]

        # Check for keyword matches
        for keyword in non_related_keywords:
            if keyword in combined:
                logger.info(
                    f"🚫 Auto-categorized as 'Non Related': detected '{keyword}'"
                )
                return "Non Related"

        # No match - leave for manual review
        return None

    def save_posts(self, posts: list, subreddit_name: str = None):
        """Save posts to database with denormalized subreddit fields

        Args:
            posts: List of post dicts from Reddit API
            subreddit_name: Optional - subreddit these posts belong to.
                           If None, extracts from each post (for user posts from multiple subs)
        """
        if not posts:
            return

        try:
            # Build post payloads
            post_payloads = []
            for post in posts:
                # Extract Reddit API fields
                reddit_id = post.get("id")
                if not reddit_id:
                    continue

                # Extract subreddit name from post (for user posts) or use parameter
                post_subreddit = (
                    subreddit_name if subreddit_name else post.get("subreddit")
                )
                if not post_subreddit:
                    continue

                # Get cached metadata for this post's subreddit
                # If not in cache and this is a user post, create stub subreddit
                if (
                    post_subreddit not in self.subreddit_metadata_cache
                    and not subreddit_name
                ):
                    # Determine review status: 'User Feed' for u_* subreddits, NULL for others
                    review_status = (
                        "User Feed" if post_subreddit.startswith("u_") else None
                    )

                    # Create minimal subreddit record (stub)
                    # Note: DO NOT set last_scraped_at here! This allows filter_existing_subreddits()
                    # to identify these stubs as needing full processing (line 354: "No last_scraped_at means it needs to be scraped")
                    try:
                        payload = {
                            "name": post_subreddit
                            # Intentionally omitted: 'last_scraped_at' (let it be NULL so stub gets processed)
                        }
                        if review_status:
                            payload["review"] = review_status

                        self.supabase.table("reddit_subreddits").upsert(
                            payload, on_conflict="name"
                        ).execute()

                        # Add to cache
                        self.subreddit_metadata_cache[post_subreddit] = {
                            "review": review_status,
                            "primary_category": None,
                            "tags": [],
                        }
                    except Exception as e:
                        # If duplicate key error, still add to cache (subreddit exists in DB)
                        error_str = str(e)
                        if "23505" in error_str or "duplicate key" in error_str.lower():
                            self.subreddit_metadata_cache[post_subreddit] = {
                                "review": review_status,
                                "primary_category": None,
                                "tags": [],
                            }
                            logger.debug(
                                f"   ℹ️  Subreddit r/{post_subreddit} already exists (added to cache)"
                            )
                        else:
                            logger.debug(
                                f"   ⚠️  Failed to create stub for r/{post_subreddit}: {e}"
                            )
                        continue

                cached = self.subreddit_metadata_cache.get(post_subreddit, {})
                sub_primary_category = cached.get("primary_category")
                sub_tags = cached.get("tags", [])
                sub_over18 = cached.get("over18", False)

                # Convert created_utc to ISO format
                created_utc = post.get("created_utc")
                created_dt = None
                if created_utc:
                    created_dt = datetime.fromtimestamp(created_utc, tz=timezone.utc)

                # Determine post type
                post_type = self._determine_post_type(post)

                # Extract API fields
                archived = post.get("archived", False)
                # Convert edited to boolean (Reddit returns timestamp if edited, False if not)
                edited = bool(post.get("edited", False))

                # Calculate derived fields
                selftext = post.get("selftext", "")
                post_length = len(selftext) if selftext else 0

                posting_day_of_week = created_dt.weekday() if created_dt else None
                posting_hour = created_dt.hour if created_dt else None

                thumbnail = post.get("thumbnail", "")
                has_thumbnail = bool(
                    thumbnail
                    and thumbnail
                    not in ["self", "default", "nsfw", "spoiler", "image", ""]
                )

                is_crosspost = (
                    "crosspost_parent_list" in post or "crosspost_parent" in post
                )

                score = post.get("score", 0) or 0
                num_comments = post.get("num_comments", 0) or 0
                comment_to_upvote_ratio = (
                    round(num_comments / max(1, score), 4) if score > 0 else 0.0
                )

                payload = {
                    "reddit_id": reddit_id,
                    "title": post.get("title"),
                    "author_username": post.get("author"),
                    "subreddit_name": post_subreddit,  # Keep original case for FK
                    "created_utc": created_dt.isoformat() if created_dt else None,
                    "score": score,
                    "num_comments": num_comments,
                    "upvote_ratio": post.get("upvote_ratio", 0.0) or 0.0,
                    "over_18": post.get("over_18", False),
                    "spoiler": post.get("spoiler", False),
                    "stickied": post.get("stickied", False),
                    "locked": post.get("locked", False),
                    "is_self": post.get("is_self", False),
                    "is_video": post.get("is_video", False),
                    "content_type": post_type,
                    "archived": archived,
                    "edited": edited,
                    # Optional fields
                    "selftext": selftext,
                    "url": post.get("url"),
                    "domain": post.get("domain"),
                    "link_flair_text": post.get("link_flair_text"),
                    "author_flair_text": post.get("author_flair_text"),
                    "thumbnail": thumbnail,
                    "distinguished": post.get("distinguished"),
                    "gilded": post.get("gilded", 0) or 0,
                    "total_awards_received": post.get("total_awards_received", 0) or 0,
                    # Calculated fields
                    "post_length": post_length,
                    "posting_day_of_week": posting_day_of_week,
                    "posting_hour": posting_hour,
                    "has_thumbnail": has_thumbnail,
                    "is_crosspost": is_crosspost,
                    "comment_to_upvote_ratio": comment_to_upvote_ratio,
                    # Denormalized subreddit fields (CRITICAL REQUIREMENT)
                    "sub_primary_category": sub_primary_category,
                    "sub_tags": sub_tags,
                    "sub_over18": sub_over18,
                    # Timestamps
                    "scraped_at": datetime.now(timezone.utc).isoformat(),
                }

                post_payloads.append(payload)

            # Batch upsert to database with retry logic for connection pool errors
            if post_payloads:
                max_retries = 3
                retry_delay = 0.5

                for attempt in range(max_retries):
                    try:
                        _ = (
                            self.supabase.table("reddit_posts")
                            .upsert(post_payloads, on_conflict="reddit_id")
                            .execute()
                        )

                        if subreddit_name:
                            logger.info(
                                f"   💾 SUPABASE SAVE [reddit_posts]: {len(post_payloads)} posts for r/{subreddit_name}"
                            )
                        else:
                            # Extract unique subreddits from user posts
                            unique_subs = set(
                                p["subreddit_name"] for p in post_payloads
                            )
                            logger.info(
                                f"   💾 SUPABASE SAVE [reddit_posts]: {len(post_payloads)} user posts across {len(unique_subs)} subreddits"
                            )
                        break  # Success - exit retry loop
                    except Exception as db_error:
                        context = (
                            f"r/{subreddit_name}" if subreddit_name else "user posts"
                        )
                        if attempt < max_retries - 1:
                            logger.warning(
                                f"⚠️  DB save failed for {context} (attempt {attempt+1}/{max_retries}) - retrying in {retry_delay}s: {db_error}"
                            )
                            time.sleep(retry_delay)
                        else:
                            logger.error(
                                f"❌ Failed to save posts for {context} after {max_retries} attempts: {db_error}"
                            )
                            raise  # Re-raise on final attempt

        except Exception as e:
            context = f"r/{subreddit_name}" if subreddit_name else "user posts"
            logger.error(f"❌ Failed to save posts for {context}: {e}")

    def _determine_post_type(self, post: dict) -> str:
        """Determine post type based on Reddit API fields

        Returns:
            'text', 'image', 'video', 'link', or 'gallery'
        """
        if post.get("is_gallery"):
            return "gallery"
        elif post.get("is_video"):
            return "video"
        elif post.get("is_self"):
            return "text"
        elif post.get("url"):
            # Check if URL is an image
            url = post.get("url", "").lower()
            if any(
                url.endswith(ext) for ext in [".jpg", ".jpeg", ".png", ".gif", ".webp"]
            ):
                return "image"
            return "link"
        else:
            return "text"

    def save_user(self, user_info: dict):
        """Save/update user in database

        Args:
            user_info: User data dict from Reddit API
        """
        if not user_info or not user_info.get("name"):
            return

        try:
            # Extract fields from Reddit API response
            username = user_info.get("name")
            reddit_id = user_info.get("id")
            created_utc = user_info.get("created_utc")

            # Calculate account age in days
            account_age_days = None
            if created_utc:
                account_age_days = int(
                    (datetime.now(timezone.utc).timestamp() - created_utc) / 86400
                )
                created_dt = datetime.fromtimestamp(created_utc, tz=timezone.utc)
            else:
                created_dt = None

            # Extract direct API fields
            accept_followers = user_info.get("accept_followers", True)
            hide_from_robots = user_info.get("hide_from_robots", False)
            pref_show_snoovatar = user_info.get("pref_show_snoovatar", False)

            # Extract user's profile subreddit metadata
            user_subreddit = user_info.get("subreddit", {})
            subreddit_banner_img = (
                user_subreddit.get("banner_img") if user_subreddit else None
            )
            subreddit_display_name = (
                user_subreddit.get("display_name") if user_subreddit else None
            )
            subreddit_over_18 = (
                user_subreddit.get("over_18", False) if user_subreddit else False
            )
            subreddit_subscribers = (
                user_subreddit.get("subscribers", 0) if user_subreddit else 0
            )
            subreddit_title = user_subreddit.get("title") if user_subreddit else None

            # Prepare user payload
            user_payload = {
                "username": username,
                "reddit_id": reddit_id,
                "created_utc": created_dt.isoformat() if created_dt else None,
                "account_age_days": account_age_days,
                "comment_karma": user_info.get("comment_karma", 0) or 0,
                "link_karma": user_info.get("link_karma", 0) or 0,
                "total_karma": user_info.get("total_karma", 0) or 0,
                "awardee_karma": user_info.get("awardee_karma", 0) or 0,
                "awarder_karma": user_info.get("awarder_karma", 0) or 0,
                "is_employee": user_info.get("is_employee", False),
                "is_mod": user_info.get("is_mod", False),
                "is_gold": user_info.get("is_gold", False),
                "verified": user_info.get("verified", False),
                "has_verified_email": user_info.get("has_verified_email", False),
                "is_suspended": user_info.get(
                    "is_suspended", False
                ),  # Use passed value or default to False
                "icon_img": user_info.get("icon_img"),
                "accept_followers": accept_followers,
                "hide_from_robots": hide_from_robots,
                "pref_show_snoovatar": pref_show_snoovatar,
                "subreddit_banner_img": subreddit_banner_img,
                "subreddit_display_name": subreddit_display_name,
                "subreddit_over_18": subreddit_over_18,
                "subreddit_subscribers": subreddit_subscribers,
                "subreddit_title": subreddit_title,
                "last_scraped_at": datetime.now(timezone.utc).isoformat(),
            }

            # UPSERT to database with retry logic for connection pool errors
            max_retries = 3
            retry_delay = 0.5

            for attempt in range(max_retries):
                try:
                    _ = (
                        self.supabase.table("reddit_users")
                        .upsert(user_payload, on_conflict="username")
                        .execute()
                    )
                    total_karma = user_payload.get("total_karma", 0)
                    age_days = user_payload.get("account_age_days", 0) or 0
                    logger.info(
                        f"      💾 SUPABASE SAVE [reddit_users]: u/{username} | karma={total_karma:,} | age={age_days}d"
                    )
                    break  # Success - exit retry loop
                except Exception as db_error:
                    if attempt < max_retries - 1:
                        logger.warning(
                            f"⚠️  DB save failed for u/{username} (attempt {attempt+1}/{max_retries}) - retrying in {retry_delay}s: {db_error}"
                        )
                        time.sleep(retry_delay)
                    else:
                        logger.error(
                            f"❌ Failed to save user u/{username} after {max_retries} attempts: {db_error}"
                        )
                        raise  # Re-raise on final attempt

        except Exception as e:
            logger.error(f"❌ Failed to save user: {e}")

    def extract_authors(self, posts: list) -> set:
        """Extract unique usernames from posts

        Args:
            posts: List of post dicts from Reddit API

        Returns:
            Set of unique author usernames (excludes [deleted])
        """
        authors = set()
        for post in posts:
            author = post.get("author")
            if author and author != "[deleted]" and author != "AutoModerator":
                authors.add(author)
        return authors

    def extract_subreddits_from_posts(self, posts: list) -> set:
        """Extract subreddit names mentioned in posts

        Args:
            posts: List of post dicts from Reddit API

        Returns:
            Set of unique subreddit names
        """
        subreddits = set()
        for post in posts:
            # Get subreddit from post
            sub = post.get("subreddit")
            if sub:
                subreddits.add(sub)
        return subreddits

    def save_user_minimal(self, username: str):
        """Save username only (minimal user tracking for FK constraint)

        Args:
            username: Reddit username to save
        """
        if not username:
            return

        try:
            # Minimal insert - just username and last_scraped_at
            user_payload = {
                "username": username,
                "last_scraped_at": datetime.now(timezone.utc).isoformat(),
            }

            # UPSERT (insert or update last_scraped_at)
            self.supabase.table("reddit_users").upsert(
                user_payload, on_conflict="username"
            ).execute()

        except Exception as e:
            logger.debug(f"❌ Failed to save username {username}: {e}")
            raise

    def save_users_batch(self, usernames: set, batch_size: int = 100):
        """Save users in chunks to avoid payload limits

        Args:
            usernames: Set of usernames to save
            batch_size: Users per batch (default 100)

        Returns:
            Number of users saved
        """
        if not usernames:
            return 0

        try:
            timestamp = datetime.now(timezone.utc).isoformat()
            usernames_list = list(usernames)
            total_saved = 0
            num_batches = (len(usernames_list) + batch_size - 1) // batch_size

            # Process in chunks
            for i in range(0, len(usernames_list), batch_size):
                chunk = usernames_list[i : i + batch_size]

                # Build batch payload
                user_payloads = [
                    {"username": username, "last_scraped_at": timestamp}
                    for username in chunk
                ]

                # Batch UPSERT
                self.supabase.table("reddit_users").upsert(
                    user_payloads, on_conflict="username"
                ).execute()

                total_saved += len(chunk)

            logger.info(
                f"   ✅ Saved {total_saved} usernames ({num_batches} batches of {batch_size})"
            )
            return total_saved

        except Exception as e:
            logger.error(f"❌ Failed to batch save users: {e}")
            raise

    async def stop(self):
        """Stop the scraper gracefully"""
        logger.info("🛑 Stopping scraper...")
        self.running = False
        logger.info("✅ Scraper stopped")
