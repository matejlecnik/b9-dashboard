#!/usr/bin/env python3
"""
Reddit Scraper

Main scraper implementation - handles all data collection, logging, and metrics
"""

import asyncio
import logging
import os
import queue
import random
import sys
import threading

# ThreadPoolExecutor no longer needed - v3.3.0 uses simple loop for username-only saving
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional, Set


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
    assert spec is not None
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)  # type: ignore[union-attr]
    ProxyManager = module.ProxyManager  # type: ignore[misc]

    api_path = os.path.join(current_dir, "public_reddit_api.py")
    spec = importlib.util.spec_from_file_location("public_reddit_api", api_path)
    assert spec is not None
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)  # type: ignore[union-attr]
    PublicRedditAPI = module.PublicRedditAPI  # type: ignore[misc]

# Note: Supabase logging now handled by unified logging system (app/logging/)

# Import version from central location
try:
    from app.version import REDDIT_SCRAPER_VERSION as SCRAPER_VERSION
except ImportError:
    SCRAPER_VERSION = "3.6.3"  # Fallback for standalone execution

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")

# Use unified logger with Supabase support
from typing import cast  # noqa: E402

from app.logging import UnifiedLogger, get_logger  # noqa: E402


# Note: logger will be initialized in __init__ with Supabase client
logger: UnifiedLogger = cast(UnifiedLogger, None)  # Initialized in __init__ before use

# Reduce noise from external libraries
logging.getLogger("httpx").setLevel(logging.WARNING)
logging.getLogger("httpcore").setLevel(logging.WARNING)


class RedditScraper:
    """Main Reddit scraper - self-contained with logging and metrics"""

    def __init__(self, supabase):
        self.supabase = supabase
        self.running = False

        # Initialize logger with Supabase client for database logging
        global logger
        logger = get_logger(__name__, supabase_client=supabase, source="reddit_scraper")
        self.logger = logger

        self.proxy_manager = ProxyManager(supabase)
        self.api: PublicRedditAPI = cast(PublicRedditAPI, None)  # Initialized in run()

        # Threading structures
        self.subreddit_queue: queue.Queue[str] = queue.Queue()
        self.cache_lock = threading.Lock()  # Protects all caches

        # Cache for Non Related subreddits (refreshed periodically)
        self.non_related_cache: Set[str] = set()
        self.user_feed_cache: Set[str] = set()
        self.banned_cache: Set[str] = set()
        self.ok_cache: Set[str] = set()  # Ok subreddits (Loop 1 targets)
        self.no_seller_cache: Set[str] = set()  # No Seller subreddits (Loop 2 targets)
        self.null_review_cache: Set[str] = set()  # NULL review subreddits (awaiting manual review)
        self.session_processed: Set[
            str
        ] = set()  # Subreddits processed in this session (prevents re-discovery)
        self.session_fetched_users: Set[
            str
        ] = set()  # Users whose posts we've already fetched (prevents duplicate fetches)
        self.skip_cache_time = None
        self.cache_ttl = timedelta(hours=1)  # Refresh cache every hour

        # Cache subreddit metadata (review, primary_category, tags, over18)
        # Key: subreddit_name, Value: dict with metadata
        self.subreddit_metadata_cache: Dict[str, dict] = {}

        # v3.10.0: Cache all subreddit names for instant filtering (zero DB queries during processing)
        self.all_subreddits_cache: Set[str] = set()

    async def run(self):
        """Main scraper loop with auto-cycling (v3.11.0)"""
        logger.info(f"🚀 Starting Reddit Scraper v{SCRAPER_VERSION}")
        logger.info(
            f"📝 Version: {SCRAPER_VERSION} | Dual logging: console + Supabase system_logs\n"
        )

        # Phase 1: Load and test proxies (one-time setup)
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
            raise RuntimeError("Cannot start scraper: All proxies failed connectivity test")

        logger.info(
            f"   ✅ {working_proxies}/{proxy_count} proxies working | {working_proxies} threads ready\n"
        )

        # Mark as running
        self.running = True

        # Auto-cycling loop (v3.11.0 - automatic restart after completion)
        cycle_number = 1
        while self.running:
            if cycle_number > 1:
                logger.info(f"\n{'='*60}")
                logger.info(f"🔄 CYCLE #{cycle_number}")
                logger.info(f"{'='*60}\n")

            # Phase 2: Load target subreddits (refreshed each cycle)
            logger.info("📋 Phase 2: Target Subreddits")

            # Load skip caches first (Non Related, User Feed, Banned)
            await self.load_skip_caches()

            # v3.10.0: Load ALL subreddit names for instant filtering (zero DB queries during processing)
            await self.load_all_subreddits_cache()

            # Get target subreddits by review status
            subreddits_by_status = await self.get_target_subreddits()
            ok_subreddits = subreddits_by_status.get("ok", [])
            no_seller_subreddits = subreddits_by_status.get("no_seller", [])

            if not ok_subreddits and not no_seller_subreddits:
                logger.warning("⚠️ No target subreddits found - nothing to scrape")
                # Sleep and retry instead of raising exception
                logger.info("⏳ Waiting 300s before retrying...")
                await asyncio.sleep(300)
                continue

            # Phase 3: Process subreddits
            logger.info("📋 Phase 3: Processing Subreddits")

            # Initialize API clients:
            # - Async API for subreddit processing (not rate-limited, works fine)
            # - Sync API for user processing (natural throttling from Python GIL)
            async with PublicRedditAPI(self.proxy_manager) as api_client:
                self.api = api_client

                # Process OK subreddits concurrently in batches (v3.9.0 optimization)
                # Process 5 subreddits at a time with 0.5s stagger between starts
                BATCH_SIZE = 5
                logger.info(
                    f"\n🎯 Processing {len(ok_subreddits)} OK subreddits (batches of {BATCH_SIZE})..."
                )

                for batch_start in range(0, len(ok_subreddits), BATCH_SIZE):
                    if not self.running:
                        break

                    batch = ok_subreddits[batch_start : batch_start + BATCH_SIZE]
                    batch_end = min(batch_start + BATCH_SIZE, len(ok_subreddits))

                    logger.info(f"\n📦 Batch [{batch_start + 1}-{batch_end}/{len(ok_subreddits)}]")

                    # Helper function to process one OK subreddit with staggered start
                    async def process_ok_subreddit_staggered(
                        subreddit_name: str, idx: int, start_delay: float
                    ):
                        """Process OK subreddit with staggered start and discovery handling"""
                        # Add random jitter to start delay (±100-200ms)
                        jitter = random.uniform(-0.1, 0.2)
                        await asyncio.sleep(start_delay + jitter)

                        try:
                            if not self.running:
                                return None

                            logger.info(
                                f"🔄 [{batch_start + idx + 1}/{len(ok_subreddits)}] r/{subreddit_name}"
                            )

                            # Process subreddit and get discovered subreddits
                            discovered = await self.process_subreddit(
                                subreddit_name, process_users=True, allow_discovery=True
                            )

                            return discovered

                        except Exception as e:
                            logger.error(f"❌ Error processing Ok subreddit {subreddit_name}: {e}")
                            return None

                    # Create tasks with staggered start delays (500ms between starts)
                    tasks = []
                    for idx, subreddit_name in enumerate(batch):
                        start_delay = idx * 0.5  # 500ms stagger
                        task = process_ok_subreddit_staggered(subreddit_name, idx, start_delay)
                        tasks.append(task)

                    # Execute batch concurrently
                    batch_results = await asyncio.gather(*tasks, return_exceptions=True)

                    # v3.10.0: BATCHED DISCOVERY PROCESSING (Optimization #2 - saves 50-100s)
                    # Collect ALL discoveries from entire batch, filter once, process in parallel
                    all_discoveries = set()

                    for subreddit_name, discovered in zip(batch, batch_results):
                        if isinstance(discovered, set) and len(discovered) > 0:
                            all_discoveries.update(discovered)

                    # Add ALL discoveries to session cache (prevents duplicate "NEW" logging)
                    self.session_processed.update(all_discoveries)

                    if all_discoveries:
                        logger.info(
                            f"\n   🔍 Processing {len(all_discoveries)} total discoveries from batch..."
                        )

                        # Filter once using cache (zero DB queries!)
                        filtered = self.filter_using_cache_only(all_discoveries)

                        if filtered:
                            logger.info(f"      ✅ {len(filtered)} NEW subreddits after filtering")

                            # Separate u_ subreddits (user feeds) from regular subreddits
                            # User feeds should be immediately marked as "User Feed" without any processing
                            filtered_list = list(filtered)
                            user_feed_subs = [sub for sub in filtered_list if sub.startswith("u_")]
                            regular_subs = [
                                sub for sub in filtered_list if not sub.startswith("u_")
                            ]

                            # Process user feed subreddits immediately (no delays, no API calls, no processing)
                            if user_feed_subs:
                                logger.info(
                                    f"      👥 Saving {len(user_feed_subs)} user feed subreddits immediately..."
                                )
                                user_feed_payloads = [
                                    {"name": sub, "review": "User Feed"} for sub in user_feed_subs
                                ]
                                try:
                                    self.supabase.table("reddit_subreddits").upsert(
                                        user_feed_payloads, on_conflict="name"
                                    ).execute()

                                    # Add to cache
                                    for sub in user_feed_subs:
                                        self.subreddit_metadata_cache[sub] = {
                                            "review": "User Feed",
                                            "primary_category": None,
                                            "tags": [],
                                        }
                                        self.user_feed_cache.add(
                                            sub
                                        )  # Add to cache to skip future processing
                                        self.all_subreddits_cache.add(sub)  # Update global cache

                                    logger.info(
                                        f"      ✅ Saved {len(user_feed_subs)} user feed subreddits (no processing required)"
                                    )
                                except Exception as e:
                                    # Handle duplicate key errors gracefully (PK constraint violation)
                                    error_str = str(e)
                                    if "23505" in error_str or "duplicate key" in error_str.lower():
                                        logger.info(
                                            "      ✅ User feed subreddits already exist (added to cache)"
                                        )
                                        # Still add to cache even if DB insert failed
                                        for sub in user_feed_subs:
                                            self.subreddit_metadata_cache[sub] = {
                                                "review": "User Feed",
                                                "primary_category": None,
                                                "tags": [],
                                            }
                                            self.user_feed_cache.add(sub)
                                            self.all_subreddits_cache.add(
                                                sub
                                            )  # Update global cache
                                    else:
                                        logger.error(f"❌ Failed to save user feed subreddits: {e}")

                            # Staggered parallel discovery processing (v3.10.0 batched optimization) - ONLY for regular subreddits
                            # Discoveries start 100-200ms apart to avoid simultaneous requests while enabling concurrency
                            if regular_subs:
                                random.shuffle(
                                    regular_subs
                                )  # Randomize order for additional safety

                                logger.info(
                                    f"      📥 Processing {len(regular_subs)} regular subreddits (staggered parallel)..."
                                )

                                # Helper function to process one discovery with stagger delay
                                async def process_discovery_staggered(
                                    subreddit_name: str, discovery_idx: int, start_delay: float
                                ):
                                    """Process discovered subreddit with staggered start"""
                                    # Add random jitter to start delay (±50-100ms)
                                    jitter = random.uniform(-0.05, 0.1)
                                    await asyncio.sleep(start_delay + jitter)

                                    try:
                                        if not self.running:
                                            return False

                                        # Mark as NULL for full analysis (cache entry)
                                        if subreddit_name not in self.subreddit_metadata_cache:
                                            self.subreddit_metadata_cache[subreddit_name] = {
                                                "review": None,  # NULL = new discovery, needs full analysis
                                                "primary_category": None,
                                                "tags": [],
                                            }

                                        logger.info(
                                            f"         [{discovery_idx + 1}/{len(regular_subs)}] 🆕 r/{subreddit_name}"
                                        )
                                        await self.process_discovered_subreddit(subreddit_name)

                                        # Update all_subreddits_cache after successful processing
                                        self.all_subreddits_cache.add(subreddit_name)

                                        return True

                                    except Exception as e:
                                        logger.error(
                                            f"❌ Error processing discovery r/{subreddit_name}: {e}"
                                        )
                                        return False

                                # Create tasks with staggered start delays (100-200ms between starts for heavier requests)
                                discovery_tasks = []
                                for discovery_idx, new_sub in enumerate(regular_subs):
                                    base_stagger = discovery_idx * random.uniform(
                                        0.1, 0.2
                                    )  # 100-200ms stagger
                                    discovery_task = process_discovery_staggered(
                                        new_sub, discovery_idx, base_stagger
                                    )
                                    discovery_tasks.append(discovery_task)

                                # Execute all discovery tasks concurrently (each starts with its own delay)
                                discovery_results = await asyncio.gather(
                                    *discovery_tasks, return_exceptions=True
                                )

                                # Count successes
                                successful = sum(1 for r in discovery_results if r is True)
                                logger.info(
                                    f"      ✅ Processed {successful}/{len(regular_subs)} discovered subreddits\n"
                                )
                        else:
                            logger.info("      ✅ All discoveries already known (0 new)")

                    # Log batch completion
                    logger.info(f"✅ Batch [{batch_start + 1}-{batch_end}] complete\n")

                # Process No Seller subreddits sequentially (data update only)
                if no_seller_subreddits:
                    logger.info(
                        f"\n📊 Processing {len(no_seller_subreddits)} No Seller subreddits sequentially..."
                    )

                    for idx, subreddit_name in enumerate(no_seller_subreddits):
                        if not self.running:
                            break

                        logger.info(f"\n[{idx + 1}/{len(no_seller_subreddits)}]")

                        try:
                            await self.process_subreddit(
                                subreddit_name, process_users=False, allow_discovery=False
                            )
                        except Exception as e:
                            logger.error(
                                f"❌ Error processing No Seller subreddit {subreddit_name}: {e}"
                            )

                        # Delay between subreddits - v3.8.0: reduced from 1-2s to 0.3-0.9s
                        if idx < len(no_seller_subreddits) - 1:
                            delay = random.uniform(0.3, 0.9)
                            await asyncio.sleep(delay)

                logger.info("\n✅ All subreddits processed")

                # Auto-cycling: Get cooldown from system_control.config (default 5 minutes)
                cooldown_seconds = 300
                try:
                    control = (
                        self.supabase.table("system_control")
                        .select("config")
                        .eq("script_name", "reddit_scraper")
                        .single()
                        .execute()
                    )
                    if control.data and control.data.get("config"):
                        cooldown_seconds = control.data["config"].get("cycle_cooldown_seconds", 300)
                except Exception:
                    pass  # Use default on error

                next_start = datetime.now(timezone.utc) + timedelta(seconds=cooldown_seconds)
                logger.info(
                    f"🔄 Cycle #{cycle_number} complete. Next cycle starts at {next_start.strftime('%H:%M:%S UTC')} ({cooldown_seconds}s cooldown)"
                )

                await asyncio.sleep(cooldown_seconds)

                # Increment cycle counter for next iteration
                cycle_number += 1

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
        all_data: list[dict[str, Any]] = []
        offset = 0
        max_page_size = None  # Will be detected from first response
        iteration = 0

        # Log start
        logger.info(f"   📄 Loading {review_status} subreddits...")

        while True:
            iteration += 1

            # No .limit() - let Supabase use its default max (range is large to not restrict)
            response = (
                self.supabase.table("reddit_subreddits")
                .select(fields)
                .eq("review", review_status)
                .range(offset, offset + 9999)
                .execute()
            )

            rows_returned = len(response.data) if response.data else 0

            if not response.data:
                break

            # First page: detect Supabase's actual max page size
            if max_page_size is None:
                max_page_size = len(response.data)

            all_data.extend(response.data)

            # If we got less than first page size, we've reached the end
            if len(response.data) < max_page_size:
                break

            offset += len(response.data)  # Use actual rows returned

        # Log completion with total
        logger.info(f"      ✅ Loaded {len(all_data):,} {review_status} ({iteration} iterations)")
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
            non_related_data = await self._fetch_subreddits_paginated("Non Related", "name")
            self.non_related_cache = (
                {item["name"] for item in non_related_data} if non_related_data else set()
            )

            # Load User Feed subreddits with pagination
            user_feed_data = await self._fetch_subreddits_paginated("User Feed", "name")
            self.user_feed_cache = (
                {item["name"] for item in user_feed_data} if user_feed_data else set()
            )

            # Load Banned subreddits with pagination
            banned_data = await self._fetch_subreddits_paginated("Banned", "name")
            self.banned_cache = {item["name"] for item in banned_data} if banned_data else set()

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
            null_review_data: list[dict[str, Any]] = []
            offset = 0
            max_page_size = None
            iteration = 0

            # Log start
            logger.info("   📄 Loading NULL review subreddits...")

            while True:
                iteration += 1

                response = (
                    self.supabase.table("reddit_subreddits")
                    .select("name")
                    .is_("review", "null")
                    .range(offset, offset + 9999)
                    .execute()
                )

                if not response.data:
                    break

                # First page: detect Supabase's actual max page size
                if max_page_size is None:
                    max_page_size = len(response.data)

                null_review_data.extend(response.data)

                # If we got less than first page size, we've reached the end
                if len(response.data) < max_page_size:
                    break

                offset += len(response.data)

            # Log completion with total
            logger.info(
                f"      ✅ Loaded {len(null_review_data):,} NULL review ({iteration} iterations)"
            )
            self.null_review_cache = (
                {item["name"] for item in null_review_data} if null_review_data else set()
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

    async def load_all_subreddits_cache(self):
        """Load ALL subreddit names into memory for instant filtering (v3.10.0 optimization)

        This eliminates database queries during processing by caching all subreddit names at startup.
        Trade-off: +2-5s startup time, saves 40-100s during processing (zero DB queries).
        Memory: ~1-2 MB for 11,463 subreddit names.
        """
        try:
            logger.info("   📚 Loading all subreddits into cache...")

            # Fetch all subreddit names regardless of review status
            all_data: list[dict[str, Any]] = []
            offset = 0
            max_page_size = None
            iteration = 0

            while True:
                iteration += 1

                # Fetch all subreddits (no review filter)
                response = (
                    self.supabase.table("reddit_subreddits")
                    .select("name")
                    .range(offset, offset + 9999)
                    .execute()
                )

                if not response.data:
                    break

                # First page: detect Supabase's actual max page size
                if max_page_size is None:
                    max_page_size = len(response.data)

                all_data.extend(response.data)

                # If we got less than first page size, we've reached the end
                if len(response.data) < max_page_size:
                    break

                offset += len(response.data)

            # Convert to set of names
            self.all_subreddits_cache = {item["name"] for item in all_data}

            logger.info(
                f"      ✅ Cached {len(self.all_subreddits_cache):,} subreddit names ({iteration} iterations)"
            )

        except Exception as e:
            logger.error(f"❌ Failed to load all subreddits cache: {e}")
            self.all_subreddits_cache = set()

    def filter_using_cache_only(self, discovered: Set[str]) -> Set[str]:
        """Filter discoveries using in-memory cache only (v3.10.0 - ZERO database queries)

        This replaces filter_existing_subreddits() with pure in-memory filtering.
        Eliminates 40-100 seconds of database query overhead during processing.

        Args:
            discovered: Set of discovered subreddit names

        Returns:
            Set of truly new subreddit names (not in DB, not in session, not in skip categories)
        """
        if not discovered:
            return set()

        original_count = len(discovered)

        # Remove already-known subreddits (in database)
        discovered = discovered - self.all_subreddits_cache

        # Remove subreddits processed this session
        discovered = discovered - self.session_processed

        # Remove skip categories (Non Related, User Feed, Banned)
        discovered = discovered - (
            self.non_related_cache | self.user_feed_cache | self.banned_cache
        )

        filtered_count = original_count - len(discovered)

        if filtered_count > 0:
            logger.info(
                f"      🚫 Filtered {filtered_count}/{original_count} using cache (0 DB queries)"
            )

        return discovered

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
            logger.info(f"   🆕 New subreddits: {len(new_subreddits - stale_subreddits)}")
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
            logger.warning(f"⚠️  Failed to load metadata cache for r/{subreddit_name}: {e}")

        # ========== PASS 1: Fetch & Save Subreddit + Posts ==========

        # 1. Parallelize all API calls (3-4x speedup: 2.5-5s → 0.8-1.2s)
        # Add 60s timeout to prevent infinite hangs (v3.6.3 bugfix)
        try:
            subreddit_info, rules, top_10_weekly = await asyncio.wait_for(
                asyncio.gather(
                    self.api.get_subreddit_info(subreddit_name, proxy),
                    self.api.get_subreddit_rules(subreddit_name, proxy),
                    self.api.get_subreddit_top_posts(subreddit_name, "week", 10, proxy),
                ),
                timeout=60.0,
            )
        except asyncio.TimeoutError:
            logger.error(f"❌ API timeout (60s) for r/{subreddit_name} - skipping")
            return set()

        # 2. Check for banned/forbidden/not_found subreddits
        if isinstance(subreddit_info, dict) and "error" in subreddit_info:
            error_type = subreddit_info.get("error")
            if error_type in ["banned", "forbidden", "not_found"]:
                logger.warning(f"🚫 r/{subreddit_name} is {error_type} - marking as Banned")

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
                    logger.error(f"❌ Failed to save banned subreddit r/{subreddit_name}: {e}")

                return set()  # Return early
            else:
                logger.error(f"❌ Failed to fetch r/{subreddit_name}: {error_type}")
                return set()

        # 3. Validate and retry individual API responses
        max_retries = 3

        # Validate subreddit_info (critical - retry if None)
        if not self.validate_api_data(subreddit_info, "subreddit_info"):
            for attempt in range(max_retries):
                logger.info(
                    f"   🔄 Retrying subreddit_info (attempt {attempt + 1}/{max_retries})..."
                )
                subreddit_info = await self.api.get_subreddit_info(
                    subreddit_name, self.proxy_manager.get_next_proxy()
                )
                if self.validate_api_data(subreddit_info, "subreddit_info"):
                    break
            else:
                # subreddit_info is CRITICAL - cannot continue without it
                logger.error(
                    f"❌ Invalid subreddit_info for r/{subreddit_name} after {max_retries} retries"
                )
                return set()

        # Validate rules (retry if None)
        if not self.validate_api_data(rules, "rules"):
            for attempt in range(max_retries):
                logger.info(f"   🔄 Retrying rules (attempt {attempt + 1}/{max_retries})...")
                rules = await self.api.get_subreddit_rules(
                    subreddit_name, self.proxy_manager.get_next_proxy()
                )
                if self.validate_api_data(rules, "rules"):
                    break
            else:
                logger.warning(f"⚠️  Using empty rules list after {max_retries} retries")
                rules = []

        # Validate top_10_weekly (retry if None)
        if not self.validate_api_data(top_10_weekly, "top_10_weekly"):
            for attempt in range(max_retries):
                logger.info(f"   🔄 Retrying top_10_weekly (attempt {attempt + 1}/{max_retries})...")
                top_10_weekly = await self.api.get_subreddit_top_posts(
                    subreddit_name, "week", 10, self.proxy_manager.get_next_proxy()
                )
                if self.validate_api_data(top_10_weekly, "top_10_weekly"):
                    break
            else:
                logger.warning(f"⚠️  Using empty top_10_weekly list after {max_retries} retries")
                top_10_weekly = []

        # 4. Analyze rules for auto-categorization
        description = subreddit_info.get("description", "")
        rules_combined = " ".join([r.get("description") or "" for r in rules]) if rules else ""
        auto_review = self.analyze_rules_for_review(rules_combined, description)

        # 5. Save subreddit (with auto_review if detected)
        await self.save_subreddit(subreddit_name, subreddit_info, rules, top_10_weekly, auto_review)

        # Add to session cache to prevent re-discovery
        self.session_processed.add(subreddit_name)

        # 4. Collect posts but DON'T save yet (authors must be saved first)
        all_posts = list(top_10_weekly)
        unique_posts = {post.get("id"): post for post in all_posts if post.get("id")}

        logger.info(f"   ✅ Saved r/{subreddit_name} (posts will be saved after users)")

        # ========== PASS 2: Process Users (if applicable) ==========

        if not process_users:
            logger.info(f"   📊 r/{subreddit_name} complete (No Seller - skipped users)")
            return set()  # No discoveries for No Seller subreddits

        # Extract authors from top weekly posts for discovery and username saving
        authors = self.extract_authors(top_10_weekly)
        logger.info(f"   👥 Found {len(authors)} unique authors from top weekly posts")

        # 6. Discover subreddits from top weekly post authors (if enabled)
        discovered_subreddits = set()
        if allow_discovery and authors:
            logger.info(
                f"   🔍 Discovering subreddits from {len(authors)} top weekly post authors..."
            )

            # Filter out already-fetched users (optimization - prevents duplicate API calls)
            new_users = authors - self.session_fetched_users
            cached_count = len(authors) - len(new_users)
            if cached_count > 0:
                logger.info(f"      🔄 Skipping {cached_count} already-fetched users (cache hit)")

            # Fetch posts with staggered parallel execution (v3.8.0 optimization)
            # Users start 50-150ms apart to avoid simultaneous requests while enabling concurrency
            authors_list = list(new_users)
            random.shuffle(authors_list)  # Randomize order for additional safety

            logger.info(
                f"      📥 Fetching last 10 posts from {len(authors_list)} users (staggered parallel)..."
            )

            # Helper function to fetch posts for one user with stagger delay and retry
            async def fetch_user_posts_staggered(username: str, user_idx: int, start_delay: float):
                """Fetch user posts with staggered start and retry logic"""
                # Add random jitter to start delay (±20-50ms)
                jitter = random.uniform(-0.02, 0.05)
                await asyncio.sleep(start_delay + jitter)

                posts = None
                max_retries = 2  # Retry up to 2 more times if 0 posts

                # Attempt to fetch posts with retry logic
                for attempt in range(max_retries + 1):  # 0, 1, 2 = 3 total attempts
                    try:
                        posts = await self.api.get_user_posts(
                            username,
                            limit=10,
                            proxy_config=self.proxy_manager.get_next_proxy(),
                        )

                        # If we got posts, break out of retry loop
                        if isinstance(posts, list) and len(posts) > 0:
                            self.session_fetched_users.add(username)  # Cache successful fetch
                            logger.info(
                                f"         [{user_idx + 1}/{len(authors_list)}] {username}: ✅ {len(posts)} posts"
                            )
                            return posts

                        # If 0 posts and not last attempt, retry with exponential backoff
                        if attempt < max_retries:
                            backoff = random.uniform(0.1, 0.3) * (1.5**attempt)
                            logger.info(
                                f"         [{user_idx + 1}/{len(authors_list)}] {username}: ⚠️  0 posts, retrying (attempt {attempt + 2}/{max_retries + 1})..."
                            )
                            await asyncio.sleep(backoff)

                    except Exception as e:
                        # Only log error on final attempt
                        if attempt == max_retries:
                            logger.info(
                                f"         [{user_idx + 1}/{len(authors_list)}] {username}: ❌ error: {str(e)[:50]}"
                            )
                        else:
                            # Retry after brief delay
                            await asyncio.sleep(random.uniform(0.1, 0.3))

                # All attempts failed or returned 0 posts
                if isinstance(posts, list):
                    logger.info(
                        f"         [{user_idx + 1}/{len(authors_list)}] {username}: ⚠️  no posts after {max_retries + 1} attempts"
                    )
                else:
                    logger.info(
                        f"         [{user_idx + 1}/{len(authors_list)}] {username}: ❌ failed"
                    )

                return []

            # Create tasks with staggered start delays (50-150ms between starts)
            tasks = []
            for idx, username in enumerate(authors_list):
                base_stagger = idx * random.uniform(0.05, 0.15)  # 50-150ms stagger
                task = fetch_user_posts_staggered(username, idx, base_stagger)
                tasks.append(task)

            # Execute all tasks concurrently (each starts with its own delay)
            user_posts_results = await asyncio.gather(*tasks, return_exceptions=True)

            # Filter out exceptions (already logged in helper function)
            user_posts_results = [
                posts if isinstance(posts, list) else [] for posts in user_posts_results
            ]

            # Extract subreddits from posts
            for posts in user_posts_results:
                if isinstance(posts, list):
                    discovered_subreddits.update(self.extract_subreddits_from_posts(posts))

            # Remove current subreddit
            discovered_subreddits.discard(subreddit_name)

            # Log raw extraction results
            logger.info(
                f"      🔍 Extracted {len(discovered_subreddits)} subreddits from user posts (before filtering)"
            )
            if len(discovered_subreddits) > 0 and len(discovered_subreddits) <= 10:
                logger.info(f"         Raw subreddits: {', '.join(sorted(discovered_subreddits))}")
            elif len(discovered_subreddits) > 10:
                logger.info(
                    f"         First 10: {', '.join(sorted(discovered_subreddits)[:10])}..."
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

                logger.info("      🚫 Filtering breakdown:")
                if filtered_non_related:
                    logger.info(f"         - {len(filtered_non_related)} Non Related")
                if filtered_user_feed:
                    logger.info(f"         - {len(filtered_user_feed)} User Feed")
                if filtered_banned:
                    logger.info(f"         - {len(filtered_banned)} Banned")
                if filtered_ok:
                    logger.info(f"         - {len(filtered_ok)} Ok (already tracked)")
                if filtered_no_seller:
                    logger.info(f"         - {len(filtered_no_seller)} No Seller (already tracked)")
                if filtered_null_review:
                    logger.info(f"         - {len(filtered_null_review)} NULL (already processed)")
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
                logger.info("   ✅ Discovered 0 new subreddits (all filtered)")

        # 7. Save usernames in batch (authors from top weekly posts)
        self.save_users_batch(authors)

        # 8. Save posts and return discoveries
        await self.save_posts(list(unique_posts.values()), subreddit_name)
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

    async def save_subreddit(
        self,
        name: str,
        info: dict,
        rules: list,
        top_weekly: list,
        auto_review: Optional[str] = None,
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
            import json
            import math

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
            weekly_total_comments = sum(post.get("num_comments", 0) or 0 for post in top_weekly)
            weekly_count = len(top_weekly)  # Actual count (could be less than 10)

            # avg_upvotes = total upvotes / actual count (NOT divided by 10)
            avg_upvotes = (
                round(weekly_total_score / max(1, weekly_count), 2) if weekly_count > 0 else 0
            )

            # engagement = total comments / total upvotes
            engagement = (
                round(weekly_total_comments / max(1, weekly_total_score), 6)
                if weekly_total_score > 0
                else 0
            )

            # subreddit_score = sqrt(engagement * avg_upvotes * 1000)
            subreddit_score = 0.0
            if engagement > 0 and avg_upvotes > 0:
                subreddit_score = round(math.sqrt(engagement * avg_upvotes * 1000), 2)

            # Detect verification requirement
            verification_required = self.detect_verification(rules, description or "")

            # Get cached metadata (preserved fields)
            cached = self.subreddit_metadata_cache.get(name, {})
            # Only use auto_review for NEW subreddits (NULL review)
            # ALWAYS preserve existing manual classifications
            cached_review = cached.get("review")
            if cached_review is None:  # noqa: SIM108
                # New discovery - apply auto-categorization
                review = auto_review
            else:
                # Existing subreddit - PRESERVE manual classification
                review = cached_review
            primary_category = cached.get("primary_category")
            tags = cached.get("tags", [])
            over18 = cached.get("over18", over18_from_api)  # Use cached if exists, else API

            # Build payload
            payload = {
                "name": name,
                "title": title,
                "description": description,
                "public_description": public_description,
                "subscribers": subscribers,
                "over18": over18,  # Preserved from cache
                "created_utc": datetime.fromtimestamp(created_utc, tz=timezone.utc).isoformat()
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
                            f"⚠️  DB save failed (attempt {attempt + 1}/{max_retries}) - retrying in {retry_delay}s: {db_error}"
                        )
                        await asyncio.sleep(retry_delay)
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
        search_text = " ".join([r.get("description") or "" for r in rules]) + " " + description
        verification_keywords = ["verification", "verified", "verify"]
        return any(keyword in search_text.lower() for keyword in verification_keywords)

    def analyze_rules_for_review(
        self, rules_text: str, description: Optional[str] = None
    ) -> Optional[str]:
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
                logger.info(f"🚫 Auto-categorized as 'Non Related': detected '{keyword}'")
                return "Non Related"

        # No match - leave for manual review
        return None

    async def save_posts(self, posts: list, subreddit_name: Optional[str] = None):
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
                post_subreddit = subreddit_name if subreddit_name else post.get("subreddit")
                if not post_subreddit:
                    continue

                # Get cached metadata for this post's subreddit
                # If not in cache and this is a user post, create stub subreddit
                if post_subreddit not in self.subreddit_metadata_cache and not subreddit_name:
                    # Determine review status: 'User Feed' for u_* subreddits, NULL for others
                    review_status = "User Feed" if post_subreddit.startswith("u_") else None

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
                                f"   i Subreddit r/{post_subreddit} already exists (added to cache)"
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
                    and thumbnail not in ["self", "default", "nsfw", "spoiler", "image", ""]
                )

                is_crosspost = "crosspost_parent_list" in post or "crosspost_parent" in post

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
                            unique_subs = {p["subreddit_name"] for p in post_payloads}
                            logger.info(
                                f"   💾 SUPABASE SAVE [reddit_posts]: {len(post_payloads)} user posts across {len(unique_subs)} subreddits"
                            )
                        break  # Success - exit retry loop
                    except Exception as db_error:
                        context = f"r/{subreddit_name}" if subreddit_name else "user posts"
                        if attempt < max_retries - 1:
                            logger.warning(
                                f"⚠️  DB save failed for {context} (attempt {attempt + 1}/{max_retries}) - retrying in {retry_delay}s: {db_error}"
                            )
                            await asyncio.sleep(retry_delay)
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
            if any(url.endswith(ext) for ext in [".jpg", ".jpeg", ".png", ".gif", ".webp"]):
                return "image"
            return "link"
        else:
            return "text"

    async def save_user(self, user_info: dict):
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
            subreddit_banner_img = user_subreddit.get("banner_img") if user_subreddit else None
            subreddit_display_name = user_subreddit.get("display_name") if user_subreddit else None
            subreddit_over_18 = user_subreddit.get("over_18", False) if user_subreddit else False
            subreddit_subscribers = user_subreddit.get("subscribers", 0) if user_subreddit else 0
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
                            f"⚠️  DB save failed for u/{username} (attempt {attempt + 1}/{max_retries}) - retrying in {retry_delay}s: {db_error}"
                        )
                        await asyncio.sleep(retry_delay)
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
                    {"username": username, "last_scraped_at": timestamp} for username in chunk
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
