"""
Batch Writer for Reddit Scraper
Optimizes database operations by batching writes to reduce network overhead
"""
import logging
import asyncio
import traceback
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from collections import defaultdict
from ..config.scraper_config import get_scraper_config
from ..utils.supabase_logger import SupabaseLogHandler
from .supabase_client import get_supabase_client

# DEBUG: Add module-level logging to see what's happening
print(f"[BATCH_WRITER MODULE] Loading batch_writer.py module", flush=True)

logger = logging.getLogger(__name__)


class BatchWriter:
    """
    Handles batch writing to Supabase with optimized performance.
    Accumulates records and writes them in efficient batches.
    """

    def __init__(self, supabase_client, batch_size: Optional[int] = None, flush_interval: Optional[float] = None):
        """
        Initialize batch writer.

        Args:
            supabase_client: Initialized Supabase client
            batch_size: Maximum records per batch (uses config if not specified)
            flush_interval: Time in seconds between automatic flushes (uses config if not specified)
        """
        # Get configuration
        config = get_scraper_config()

        self.supabase = supabase_client
        self.batch_size = batch_size or config.batch_writer_size
        self.flush_interval = flush_interval or config.batch_writer_flush_interval

        # Setup Supabase logging if not already configured
        self.log_handler = None  # Initialize as None
        if not any(isinstance(handler, SupabaseLogHandler) for handler in logger.handlers):
            try:
                self.log_handler = SupabaseLogHandler(
                    supabase_client=supabase_client,  # Use the passed client, not a new one
                    source='batch_writer',
                    script_name='batch_writer'
                )
                self.log_handler.setLevel(logging.INFO)
                logger.addHandler(self.log_handler)
                logger.info("✅ SupabaseLogHandler attached to BatchWriter")
            except Exception as e:
                logger.warning(f"Could not attach SupabaseLogHandler: {e}")

        logger.info(f"🔧 BatchWriter initialized with batch_size={self.batch_size}, flush_interval={self.flush_interval}s")

        # Buffers for different tables
        self.buffers = defaultdict(list)

        # Statistics
        self.stats = defaultdict(lambda: {
            'total_records': 0,
            'total_batches': 0,
            'successful_writes': 0,
            'failed_writes': 0,
            'last_flush': None
        })

        # Lock for thread safety (only need async lock since all methods are async)
        self._lock = asyncio.Lock()  # For async methods
        self._flush_task = None
        self._running = False
        self._flush_in_progress = False  # Prevent duplicate concurrent flushes
        self._failed_records = defaultdict(list)  # Store failed records for retry
        self._max_errors_in_stats = 100  # Limit error history to prevent memory leak
        self._retry_attempts = defaultdict(int)  # Track retry attempts per table
        self._max_retry_attempts = config.max_retry_attempts  # Use config value
        self._retry_task = None  # Background task for retrying failed records
        self._retry_check_interval = 30  # Check for failed records every 30 seconds

    async def start(self):
        """Start the automatic flush task"""
        try:
            self._running = True
            logger.info(f"📝 Starting batch writer with batch_size={self.batch_size}, "
                       f"flush_interval={self.flush_interval}s")

            # Log startup with Supabase logging status
            has_supabase_handler = any(isinstance(handler, SupabaseLogHandler) for handler in logger.handlers)
            logger.info(f"🚀 BatchWriter initialized - Supabase logging: {'✅ Enabled' if has_supabase_handler else '❌ Disabled'}")

            # Create and start the auto-flush task
            self._flush_task = asyncio.create_task(self._auto_flush_loop())

            # Create and start the retry task for failed records
            self._retry_task = asyncio.create_task(self._retry_failed_records_loop())

            # Verify tasks were created
            if self._flush_task and self._retry_task:
                logger.info("✅ Auto-flush and retry tasks created successfully")
            else:
                logger.error("❌ Failed to create background tasks!")

        except Exception as e:
            logger.error(f"❌ Error starting batch writer: {e}")
            logger.error(traceback.format_exc())

    async def stop(self):
        """Stop the batch writer and flush remaining data"""
        logger.info("🛑 Stopping batch writer...")

        try:
            # CRITICAL: Flush BEFORE stopping the task
            logger.info("💾 Performing final flush before stopping...")
            await self.flush_all()

            # Log buffer status after flush
            buffer_sizes = {table: len(self.buffers[table]) for table in self.buffers}
            if any(buffer_sizes.values()):
                logger.warning(f"⚠️ Buffers still contain data after flush: {buffer_sizes}")
            else:
                logger.info("✅ All buffers successfully emptied")

            # Now stop the background tasks
            self._running = False

            # Cancel auto-flush task
            if self._flush_task:
                logger.info("🚫 Cancelling auto-flush task...")
                self._flush_task.cancel()
                try:
                    await self._flush_task
                except asyncio.CancelledError:
                    logger.debug("Auto-flush task cancelled successfully")
                    pass

            # Cancel retry task
            if self._retry_task:
                logger.info("🚫 Cancelling retry task...")
                self._retry_task.cancel()
                try:
                    await self._retry_task
                except asyncio.CancelledError:
                    logger.debug("Retry task cancelled successfully")
                    pass

            # One more flush to catch any last-second additions
            logger.info("💾 Performing second flush to catch any remaining data...")
            await self.flush_all()

            # Final buffer check
            final_buffer_sizes = {table: len(self.buffers[table]) for table in self.buffers}
            total_remaining = sum(final_buffer_sizes.values())
            if total_remaining > 0:
                logger.error(f"❌ {total_remaining} records still in buffers after stop: {final_buffer_sizes}")
            else:
                logger.info("✅ Batch writer stopped cleanly - all data flushed")

        except Exception as e:
            logger.error(f"❌ Error during batch writer stop: {e}")
            logger.error(traceback.format_exc())
            # Still try to flush even if there was an error
            try:
                await self.flush_all()
            except Exception as flush_error:
                logger.error(f"❌ Failed to flush during error recovery: {flush_error}")

    async def _auto_flush_loop(self):
        """Periodically flush buffers"""
        logger.info(f"🔄 Auto-flush loop STARTING (interval: {self.flush_interval}s)")
        flush_count = 0

        while self._running:
            try:
                await asyncio.sleep(self.flush_interval)
                flush_count += 1

                # Log current buffer status BEFORE checking locks
                buffer_sizes = {table: len(self.buffers[table]) for table in self.buffers}
                total_buffered = sum(buffer_sizes.values())

                logger.info(f"⏰ Auto-flush #{flush_count} triggered (every {self.flush_interval}s)")
                logger.info(f"  📊 Buffer status BEFORE flush: {buffer_sizes} (total: {total_buffered} records)")

                if total_buffered > 0:
                    # Log detailed buffer contents
                    for table, size in buffer_sizes.items():
                        if size > 0:
                            logger.info(f"    - {table}: {size} records pending")

                    await self.flush_all()

                    # Check buffers AFTER flush
                    buffer_sizes_after = {table: len(self.buffers[table]) for table in self.buffers}
                    total_after = sum(buffer_sizes_after.values())
                    logger.info(f"  📊 Buffer status AFTER flush: {buffer_sizes_after} (total: {total_after} records)")

                    if total_after > 0:
                        logger.warning(f"  ⚠️ {total_after} records remain in buffers after flush!")
                    else:
                        logger.info(f"  ✅ Auto-flush #{flush_count} completed - all buffers empty")
                else:
                    logger.debug(f"  ⏭️ Auto-flush #{flush_count} skipped (no data)")

            except asyncio.CancelledError:
                logger.info("🚫 Auto-flush loop cancelled - performing final flush")
                await self.flush_all()
                break
            except Exception as e:
                logger.error(f"❌ Error in auto flush loop: {e}")
                logger.error(traceback.format_exc())

        logger.info("🔄 Auto-flush loop STOPPED")

    async def _retry_failed_records_loop(self):
        """Periodically retry failed record writes with exponential backoff"""
        logger.info("🔁 Retry loop STARTING (checking every 30s for failed records)")
        retry_check_count = 0

        while self._running:
            try:
                await asyncio.sleep(self._retry_check_interval)  # Check for failed records periodically
                retry_check_count += 1

                # Check if we have any failed records
                total_failed = sum(len(records) for records in self._failed_records.values())

                if total_failed > 0:
                    logger.info(f"🔁 Retry check #{retry_check_count}: Found {total_failed} failed records to retry")
                    await self.retry_failed_records()
                else:
                    logger.debug(f"🔁 Retry check #{retry_check_count}: No failed records to retry")

            except asyncio.CancelledError:
                logger.info("🚫 Retry loop cancelled")
                break
            except Exception as e:
                logger.error(f"❌ Error in retry loop: {e}")
                logger.error(traceback.format_exc())

        logger.info("🔁 Retry loop STOPPED")

    async def retry_failed_records(self):
        """Attempt to retry writing failed records with exponential backoff"""
        retry_results = {}

        for table_name, records in list(self._failed_records.items()):
            if not records:
                continue

            # Get retry attempt count for this table
            attempt = self._retry_attempts[table_name]

            if attempt >= self._max_retry_attempts:
                logger.warning(f"⚠️ Table {table_name} has reached max retry attempts ({self._max_retry_attempts}). "
                             f"Clearing {len(records)} failed records.")
                self._failed_records[table_name].clear()
                self._retry_attempts[table_name] = 0
                continue

            # Calculate backoff delay (10s, 30s, 60s)
            backoff_delay = 10 * (2 ** attempt)

            logger.info(f"🔁 Retrying {len(records)} failed records for {table_name} "
                       f"(attempt {attempt + 1}/{self._max_retry_attempts}, backoff: {backoff_delay}s)")

            # Wait with exponential backoff
            await asyncio.sleep(min(backoff_delay, 60))  # Cap at 60 seconds

            # Attempt to write the failed records
            success_count, fail_count = await self._write_batch(table_name, records)

            if success_count > 0:
                logger.info(f"✅ Retry successful: {success_count}/{len(records)} records written to {table_name}")

            if fail_count == 0:
                # All records succeeded, clear the failed records
                self._failed_records[table_name].clear()
                self._retry_attempts[table_name] = 0
                retry_results[table_name] = f"✅ All {success_count} records recovered"
            else:
                # Some records still failed, increment retry counter
                self._retry_attempts[table_name] += 1
                retry_results[table_name] = f"⚠️ {success_count} recovered, {fail_count} still failing"
                logger.warning(f"⚠️ {fail_count} records still failing for {table_name} after retry")

        # Log retry summary if any retries were attempted
        if retry_results:
            logger.info("📊 Retry Summary:")
            for table, result in retry_results.items():
                logger.info(f"  {table}: {result}")

    async def add_subreddit(self, subreddit_data: Dict[str, Any]):
        """
        Add a subreddit record to the buffer.

        Args:
            subreddit_data: Subreddit data dictionary
        """
        try:
            should_flush = False
            async with self._lock:
                # Clean data before adding to buffer
                cleaned_data = self._clean_subreddit_data(subreddit_data)
                self.buffers['reddit_subreddits'].append(cleaned_data)

                # Log the addition
                logger.info(f"📝 Added r/{cleaned_data.get('name', 'unknown')} to buffer "
                           f"(buffer size: {len(self.buffers['reddit_subreddits'])} / {self.batch_size})")

                # Log some key metrics
                if 'subreddit_score' in cleaned_data:
                    logger.debug(f"  Score: {cleaned_data['subreddit_score']:.1f}, "
                               f"Subscribers: {cleaned_data.get('subscribers', 0):,}, "
                               f"Review: {cleaned_data.get('review', 'None')}")

                # Check if we should flush this buffer
                if len(self.buffers['reddit_subreddits']) >= self.batch_size:
                    should_flush = True

            # Flush OUTSIDE the lock to prevent deadlock
            if should_flush:
                logger.info("🚀 Buffer full for reddit_subreddits, triggering flush")
                await self._flush_table('reddit_subreddits')
        except Exception as e:
            logger.error(f"❌ Error in add_subreddit: {e}")
            logger.error(traceback.format_exc())

    async def add_user(self, user_data: Dict[str, Any]):
        """
        Add a user record to the buffer.

        Args:
            user_data: User data dictionary
        """
        try:
            should_flush = False
            async with self._lock:
                # Clean data before adding to buffer
                cleaned_data = self._clean_user_data(user_data)
                self.buffers['reddit_users'].append(cleaned_data)

                # Check if we should flush this buffer
                if len(self.buffers['reddit_users']) >= self.batch_size:
                    should_flush = True

            # Flush OUTSIDE the lock to prevent deadlock
            if should_flush:
                await self._flush_table('reddit_users')
        except Exception as e:
            logger.error(f"❌ Error in add_user: {e}")
            logger.error(traceback.format_exc())

    async def add_posts(self, posts_data: List[Dict[str, Any]]):
        """Direct implementation to bypass the mysterious bug"""
        print(f"[ADD_POSTS] Method called! posts_data type: {type(posts_data)}, length: {len(posts_data) if posts_data else 0}", flush=True)

        if not posts_data:
            print(f"[ADD_POSTS] Empty data, returning False", flush=True)
            logger.warning("add_posts called with empty data")
            return False

        print(f"[ADD_POSTS] Starting try block...", flush=True)
        # Direct write to database, bypassing all the complex logic for now
        try:
            print(f"[ADD_POSTS] Inside try block", flush=True)
            logger.info(f"📝 add_posts: Processing {len(posts_data)} posts")

            # Clean the data
            cleaned_posts = []
            for i, post in enumerate(posts_data):
                try:
                    cleaned = self._clean_post_data(post)
                    cleaned_posts.append(cleaned)
                except Exception as clean_error:
                    logger.error(f"❌ Error cleaning post {i}: {clean_error}")
                    logger.error(f"Post data: {post}")

            logger.info(f"📝 Cleaned {len(cleaned_posts)} posts, attempting database write...")

            # Write directly to database
            if cleaned_posts:
                response = self.supabase.table('reddit_posts').upsert(
                    cleaned_posts,
                    on_conflict='reddit_id'
                ).execute()
                logger.info(f"✅ Directly wrote {len(cleaned_posts)} posts to database")
                return True
            else:
                logger.warning("No posts to write after cleaning")
                return False
        except Exception as e:
            print(f"[ADD_POSTS ERROR] Exception caught: {e}", flush=True)
            print(f"[ADD_POSTS ERROR] Exception type: {type(e).__name__}", flush=True)
            logger.error(f"❌ Error in add_posts direct write: {e}")
            logger.error(f"Exception type: {type(e).__name__}")
            logger.error(f"Exception details: {str(e)}")
            import traceback
            print(f"[ADD_POSTS ERROR] Traceback: {traceback.format_exc()}", flush=True)
            logger.error(traceback.format_exc())
            return False

    async def save_posts(self, posts_data: List[Dict[str, Any]]):
        """
        Add multiple post records to the buffer.
        Inherits primary_category, tags, and over18 from the subreddit.

        Args:
            posts_data: List of post data dictionaries
        """
        try:

            if not posts_data:
                logger.info("save_posts called with empty data, returning")
                return

            logger.info(f"📥 BatchWriter.save_posts called with {len(posts_data)} posts")

            # Get unique subreddit names from posts
            subreddit_names = list(set(
                (post.get('subreddit_name') or post.get('subreddit', '')).lower()
                for post in posts_data if post.get('subreddit') or post.get('subreddit_name')
            ))

            # Fetch subreddit data for inheritance
            subreddit_data = {}
            if subreddit_names:
                try:
                    response = self.supabase.table('reddit_subreddits').select(
                        'name, primary_category, tags, over18'
                    ).in_('name', subreddit_names).execute()

                    if response.data:
                        for sub in response.data:
                            subreddit_data[sub['name'].lower()] = {
                                'primary_category': sub.get('primary_category'),
                                'tags': sub.get('tags', []),
                                'over18': sub.get('over18', False)
                            }
                        logger.debug(f"Fetched categorization data for {len(subreddit_data)} subreddits")
                except Exception as e:
                    logger.warning(f"Could not fetch subreddit data for post inheritance: {e}")

            should_flush = False
            async with self._lock:
                for post in posts_data:
                    cleaned_data = self._clean_post_data(post)

                    # Inherit fields from subreddit
                    sub_name = cleaned_data.get('subreddit_name', '').lower()
                    if sub_name in subreddit_data:
                        sub_info = subreddit_data[sub_name]
                        cleaned_data['sub_primary_category'] = sub_info['primary_category']
                        cleaned_data['sub_tags'] = sub_info['tags']
                        cleaned_data['sub_over18'] = sub_info['over18']
                        logger.debug(f"Post {cleaned_data.get('reddit_id')} inherited category: {sub_info['primary_category']}")

                    self.buffers['reddit_posts'].append(cleaned_data)

                # Log the addition
                buffer_size = len(self.buffers['reddit_posts'])
                logger.info(f"📝 Added {len(posts_data)} posts to buffer "
                           f"(buffer size: {buffer_size} / {self.batch_size})")

                # Check if we should flush this buffer
                if buffer_size >= self.batch_size:
                    should_flush = True

            # Flush OUTSIDE the lock to prevent deadlock
            if should_flush:
                logger.info("🚀 Buffer full for reddit_posts, triggering flush")
                await self._flush_table('reddit_posts')
        except Exception as e:
            logger.error(f"❌ Error in save_posts: {e}")
            logger.error(f"Exception type: {type(e).__name__}")
            logger.error(traceback.format_exc())
            # Re-raise to see in main.py logs
            raise

    # Note: Removed add_discovered_subreddit method
    # Discovered subreddits should be added directly to reddit_subreddits table with empty review field

    async def flush_all(self):
        """Flush all buffers to database"""
        flush_errors = []

        # Check and set flush flag in a single lock acquisition
        async with self._lock:
            if self._flush_in_progress:
                logger.debug("Flush already in progress, skipping concurrent flush")
                return
            self._flush_in_progress = True

            # Get buffer information while we have the lock
            tables_to_flush = list(self.buffers.keys())
            buffer_counts = {table: len(self.buffers[table]) for table in tables_to_flush}

        # Log what we're about to flush
        total_records = sum(buffer_counts.values())
        if total_records == 0:
            # Reset flag and return early if nothing to flush
            async with self._lock:
                self._flush_in_progress = False
            logger.debug("flush_all called but no records to flush")
            return

        logger.info(f"🔄 Starting flush_all for {total_records} total records:")
        for table, count in buffer_counts.items():
            if count > 0:
                logger.info(f"  - {table}: {count} records")

        # Log detailed flush operation to Supabase
        flush_start_time = datetime.now(timezone.utc)

        try:
            # CRITICAL: Flush in correct order to avoid foreign key violations
            # Must be: Subreddits → Users → Posts
            flush_order = [
                'reddit_subreddits',  # First: parent table for posts
                'reddit_users',       # Second: referenced by posts
                'reddit_posts'        # Last: has foreign keys to subreddits
            ]

            # Flush each table in order, catching individual errors
            for table in flush_order:
                if table in tables_to_flush:
                    try:
                        await self._flush_table(table)
                    except Exception as e:
                        error_msg = f"Failed to flush {table}: {e}"
                    logger.error(f"❌ {error_msg}")
                    flush_errors.append(error_msg)

            if flush_errors:
                logger.error(f"⚠️ flush_all completed with {len(flush_errors)} errors: {flush_errors}")
            else:
                # Calculate flush duration
                flush_end_time = datetime.now(timezone.utc)
                flush_duration = (flush_end_time - flush_start_time).total_seconds()

                # Log successful flush with performance metrics
                logger.info(f"✅ flush_all completed successfully for {total_records} records in {flush_duration:.2f}s")

                # Log performance metrics to help monitor batch writer efficiency
                if total_records > 0:
                    records_per_second = total_records / flush_duration if flush_duration > 0 else 0
                    logger.info(f"📊 Batch Writer Performance: {records_per_second:.1f} records/second, "
                              f"Duration: {flush_duration:.2f}s, Total: {total_records} records")

            # Limit error history to prevent memory leak
            self._limit_error_history()

        except Exception as e:
            logger.error(f"❌ Critical error in flush_all: {e}")
            logger.error(traceback.format_exc())
        finally:
            # Always reset flush flag
            async with self._lock:
                self._flush_in_progress = False

    async def _flush_table(self, table_name: str):
        """
        Flush a specific table's buffer to database.

        Args:
            table_name: Name of the table to flush
        """
        async with self._lock:
            if not self.buffers[table_name]:
                logger.debug(f"_flush_table called for {table_name} but buffer is empty")
                return

            # Get all records to write
            records = self.buffers[table_name][:]
            self.buffers[table_name].clear()
            logger.info(f"💾 Flushing {len(records)} records from {table_name} buffer")

        if not records:
            return

        # Split into chunks if necessary
        chunks = [records[i:i + self.batch_size]
                 for i in range(0, len(records), self.batch_size)]

        total_success = 0
        total_failed = 0

        for chunk in chunks:
            success, failed = await self._write_batch(table_name, chunk)
            total_success += success
            total_failed += failed

        # Update statistics
        self.stats[table_name]['total_records'] += len(records)
        self.stats[table_name]['total_batches'] += len(chunks)
        self.stats[table_name]['successful_writes'] += total_success
        self.stats[table_name]['failed_writes'] += total_failed
        self.stats[table_name]['last_flush'] = datetime.now(timezone.utc).isoformat()

        if total_success > 0:
            logger.info(f"✅ Successfully flushed {total_success} records to {table_name} "
                       f"({len(chunks)} batches)")

            # Log detailed stats for monitoring
            total_stats = self.stats[table_name]
            success_rate = (total_stats['successful_writes'] / total_stats['total_records'] * 100) if total_stats['total_records'] > 0 else 0
            logger.info(f"📈 {table_name} Stats - Total: {total_stats['total_records']:,} records, "
                      f"Success Rate: {success_rate:.1f}%, Batches: {total_stats['total_batches']}")

            # Log sample of what was written (first few records)
            if records and table_name == 'reddit_subreddits':
                sample_names = [r.get('name', 'unknown') for r in records[:3]]
                logger.debug(f"  Sample subreddits written: {', '.join(sample_names)}...")
        if total_failed > 0:
            logger.error(f"❌ Failed to write {total_failed} records to {table_name}")

    async def ensure_users_exist(self, usernames: set):
        """Create placeholder users if they don't exist"""
        try:
            placeholder_users = []
            for username in usernames:
                if username and username not in ['[deleted]', '[removed]', None]:
                    placeholder_users.append({
                        'username': username.lower(),
                        'created_at': datetime.now(timezone.utc).isoformat(),
                        'updated_at': datetime.now(timezone.utc).isoformat(),
                    })

            if placeholder_users:
                # Split into chunks if necessary
                chunks = [placeholder_users[i:i + self.batch_size]
                         for i in range(0, len(placeholder_users), self.batch_size)]

                for chunk in chunks:
                    resp = self.supabase.table('reddit_users').upsert(
                        chunk,
                        on_conflict='username'
                    ).execute()
                    if hasattr(resp, 'error') and resp.error:
                        logger.error(f"Error creating placeholder users: {resp.error}")
                    else:
                        logger.debug(f"Ensured {len(chunk)} users exist")

        except Exception as e:
            logger.error(f"Exception creating placeholder users: {e}")

    async def ensure_subreddits_exist(self, subreddit_names: set):
        """Create placeholder subreddits if they don't exist"""
        try:
            placeholder_subs = []
            for name in subreddit_names:
                if name:
                    # Check if this is a user subreddit
                    if name.startswith('u_'):
                        review = "User Feed"
                        display_name = f'u/{name[2:]}'
                    else:
                        review = None
                        display_name = name

                    record = {
                        'name': name.lower(),
                        'display_name_prefixed': display_name,
                        'created_at': datetime.now(timezone.utc).isoformat(),
                        'updated_at': datetime.now(timezone.utc).isoformat(),
                    }

                    # Add review field if it's a User Feed
                    if review:
                        record['review'] = review

                    placeholder_subs.append(record)

            if placeholder_subs:
                # Split into chunks if necessary
                chunks = [placeholder_subs[i:i + self.batch_size]
                         for i in range(0, len(placeholder_subs), self.batch_size)]

                for chunk in chunks:
                    resp = self.supabase.table('reddit_subreddits').upsert(
                        chunk,
                        on_conflict='name'
                    ).execute()
                    if hasattr(resp, 'error') and resp.error:
                        logger.error(f"Error creating placeholder subreddits: {resp.error}")
                    else:
                        logger.debug(f"Ensured {len(chunk)} subreddits exist")

        except Exception as e:
            logger.error(f"Exception creating placeholder subreddits: {e}")

    async def _write_batch(self, table_name: str, records: List[Dict]) -> tuple[int, int]:
        """
        Write a batch of records to Supabase.

        Args:
            table_name: Target table name
            records: List of records to write

        Returns:
            Tuple of (successful_count, failed_count)
        """
        if not records:
            logger.debug(f"_write_batch called with empty records for {table_name}")
            return 0, 0

        try:
            logger.info(f"📤 Writing batch of {len(records)} records to {table_name}")
            # For subreddits, preserve existing review field
            if table_name == 'reddit_subreddits':
                # Fetch existing reviews for these subreddits
                subreddit_names = [r['name'] for r in records if 'name' in r]
                if subreddit_names:
                    existing_response = self.supabase.table('reddit_subreddits').select(
                        'name, review'
                    ).in_('name', subreddit_names).execute()

                    if existing_response.data:
                        existing_reviews = {item['name']: item.get('review')
                                          for item in existing_response.data}

                        # Add existing review to records that don't have one
                        for record in records:
                            if 'review' not in record and record['name'] in existing_reviews:
                                existing_review = existing_reviews[record['name']]
                                if existing_review:
                                    record['review'] = existing_review
                                    logger.debug(f"Preserving review '{existing_review}' for r/{record['name']}")

            # For posts, ensure users and subreddits exist first
            elif table_name == 'reddit_posts':
                unique_authors = {post.get('author_username') or post.get('author')
                                 for post in records
                                 if post.get('author_username') or post.get('author')}
                if unique_authors:
                    await self.ensure_users_exist(unique_authors)

                unique_subreddits = {post.get('subreddit_name') or post.get('subreddit')
                                   for post in records
                                   if post.get('subreddit_name') or post.get('subreddit')}
                if unique_subreddits:
                    await self.ensure_subreddits_exist(unique_subreddits)

            # Determine the conflict resolution column based on table
            on_conflict_col = self._get_conflict_column(table_name)

            # Perform upsert operation
            logger.info(f"📤 Executing upsert for {len(records)} records to {table_name} "
                       f"(on_conflict: {on_conflict_col})")

            # Log sample of first record for debugging
            if records:
                sample = records[0]
                if table_name == 'reddit_subreddits':
                    logger.debug(f"  Sample: r/{sample.get('name', 'unknown')}, score: {sample.get('subreddit_score', 0)}")
                elif table_name == 'reddit_users':
                    logger.debug(f"  Sample: u/{sample.get('username', 'unknown')}, karma: {sample.get('total_karma', 0)}")
                elif table_name == 'reddit_posts':
                    logger.debug(f"  Sample: {sample.get('title', 'unknown')[:50]}... by {sample.get('author_username', 'unknown')}")

            response = self.supabase.table(table_name).upsert(
                records,
                on_conflict=on_conflict_col
            ).execute()

            # Check for errors in response
            if hasattr(response, 'error') and response.error:
                logger.error(f"❌ Batch write error for {table_name}: {response.error}")
                return 0, len(records)

            # Also check if data is None which can indicate an error
            if response.data is None and not hasattr(response, 'count'):
                logger.warning(f"⚠️ Upsert returned no data for {table_name}, but no error reported")
                # This is often normal for upserts, so we'll assume success
                logger.info(f"✅ Upsert completed for {len(records)} records to {table_name} (no data returned)")
            else:
                logger.info(f"✅ Successfully wrote {len(records)} records to {table_name}")

            return len(records), 0

        except Exception as e:
            logger.error(f"❌ Exception writing batch to {table_name}: {e}")
            logger.error(f"Traceback: {traceback.format_exc()}")

            # Try to write records individually as fallback
            logger.info(f"🔁 Attempting to write {len(records)} records individually to {table_name}...")
            successful = 0
            failed_records = []

            for i, record in enumerate(records):
                try:
                    on_conflict_col = self._get_conflict_column(table_name)
                    response = self.supabase.table(table_name).upsert(
                        record,
                        on_conflict=on_conflict_col
                    ).execute()

                    if hasattr(response, 'error') and response.error:
                        logger.debug(f"Failed record {i+1}/{len(records)}: {response.error}")
                        failed_records.append(record.get('name') or record.get('username') or record.get('reddit_id') or f"record_{i}")
                    else:
                        successful += 1

                except Exception as record_error:
                    logger.debug(f"Failed to write record {i+1}/{len(records)}: {record_error}")
                    failed_records.append(record.get('name') or record.get('username') or record.get('reddit_id') or f"record_{i}")

            if successful > 0:
                logger.info(f"✅ Individual writes: {successful}/{len(records)} successful for {table_name}")
            if failed_records:
                logger.error(f"❌ Failed to write {len(failed_records)} records: {failed_records[:5]}{'...' if len(failed_records) > 5 else ''}")

            # Store failed records for potential retry
            if failed_records:
                self._failed_records[table_name].extend(
                    [r for r in records if (r.get('name') or r.get('username') or r.get('reddit_id')) in failed_records]
                )
                # Limit failed records to prevent memory leak (keep only last 500 records)
                max_failed_records = 500
                if len(self._failed_records[table_name]) > max_failed_records:
                    self._failed_records[table_name] = self._failed_records[table_name][-max_failed_records:]

            return successful, len(records) - successful

    def _get_conflict_column(self, table_name: str) -> str:
        """Get the conflict resolution column for a table"""
        conflict_columns = {
            'reddit_subreddits': 'name',
            'reddit_users': 'username',
            'reddit_posts': 'reddit_id'
            # Removed 'subreddit_discoveries' as table doesn't exist
        }
        return conflict_columns.get(table_name, 'id')

    def _clean_subreddit_data(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Clean and validate subreddit data before writing"""
        # Ensure required fields with correct DB field names
        cleaned = {
            'name': data.get('name', '').lower(),
            'display_name_prefixed': data.get('display_name_prefixed') or data.get('display_name', ''),
            'title': self._truncate_string(data.get('title'), 500),
            'description': self._truncate_string(data.get('description'), 5000),
            'subscribers': self._ensure_int(data.get('subscribers')),
            'created_utc': self._ensure_timestamp(data.get('created_utc')),
            'updated_at': datetime.now(timezone.utc).isoformat()
        }

        # Add optional fields if present (only fields that exist in DB)
        optional_fields = [
            # Core metrics
            'avg_upvotes_per_post', 'engagement', 'subreddit_score',
            'image_post_avg_score', 'video_post_avg_score', 'text_post_avg_score',
            'link_post_avg_score', 'best_posting_hour', 'best_posting_day',
            # Activity metrics
            'avg_comments_per_post', 'total_upvotes_hot_30', 'total_posts_hot_30',
            'comment_to_upvote_ratio', 'top_content_type', 'nsfw_percentage',
            # Subreddit metadata
            'public_description', 'accounts_active', 'subreddit_type',
            'allow_images', 'allow_videos', 'allow_polls',
            'lang', 'whitelist_status', 'wiki_enabled',
            # Additional scraper fields
            'active_user_count', 'is_gold_only', 'is_quarantined',
            'spoilers_enabled', 'submission_type', 'url',
            # Images and styling
            'icon_img', 'banner_img', 'header_img', 'community_icon', 'mobile_banner_image',
            'primary_color', 'key_color', 'banner_background_color',
            # Text fields
            'submit_text', 'submit_text_html',
            # Flair settings
            'user_flair_enabled_in_sr', 'user_flair_position',
            'link_flair_enabled', 'link_flair_position',
            # JSON fields
            'rules_data',
            # CRITICAL: Preserve manual categorization fields during updates
            'review',           # Manual review status (Ok, No Seller, etc.)
            'primary_category', # Manual primary category
            'tags'             # Manual tags
        ]

        for field in optional_fields:
            if field in data and data[field] is not None:
                cleaned[field] = data[field]

        # Handle fields with different names in DB
        if 'over_18' in data and data['over_18'] is not None:
            cleaned['over18'] = bool(data['over_18'])  # DB field is 'over18' not 'over_18'
        elif 'over18' in data and data['over18'] is not None:
            cleaned['over18'] = bool(data['over18'])

        if 'requires_verification' in data and data['requires_verification'] is not None:
            cleaned['verification_required'] = bool(data['requires_verification'])  # DB field is 'verification_required'
        elif 'verification_required' in data and data['verification_required'] is not None:
            cleaned['verification_required'] = bool(data['verification_required'])

        return cleaned

    def _clean_user_data(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Clean and validate user data before writing"""
        cleaned = {
            'username': data.get('username', '').lower(),
            'created_utc': self._ensure_timestamp(data.get('created_utc')),
            'total_karma': self._ensure_int(data.get('total_karma')),
            'link_karma': self._ensure_int(data.get('link_karma')),
            'comment_karma': self._ensure_int(data.get('comment_karma')),
            'is_gold': bool(data.get('is_gold', False)),
            'is_mod': bool(data.get('is_mod', False)),
            'is_employee': bool(data.get('is_employee', False)),
            'verified': bool(data.get('verified', False)),
            'has_verified_email': bool(data.get('has_verified_email', False)),
            'updated_at': datetime.now(timezone.utc).isoformat()
        }

        # Add optional fields
        if 'icon_img' in data:
            cleaned['icon_img'] = self._truncate_string(data['icon_img'], 500)
        if 'reddit_id' in data:
            cleaned['reddit_id'] = data['reddit_id']
        # Map subreddit field to correct DB field name
        if 'subreddit' in data:
            cleaned['subreddit_display_name'] = data['subreddit']
        elif 'subreddit_display_name' in data:
            cleaned['subreddit_display_name'] = data['subreddit_display_name']
        # Note: 'subreddit_type' doesn't exist in reddit_users table

        # Add quality score fields with correct DB field names
        score_mappings = {
            'username_score': 'username_quality_score',
            'age_score': 'age_quality_score',
            'karma_score': 'karma_quality_score',
            'overall_quality_score': 'overall_user_score'
        }

        for old_field, db_field in score_mappings.items():
            if old_field in data:
                cleaned[db_field] = float(data[old_field])
            elif db_field in data:
                cleaned[db_field] = float(data[db_field])

        return cleaned

    def _clean_post_data(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Clean and validate post data before writing"""
        # Handle reddit_id - sometimes it's 'id', sometimes 'reddit_id'
        reddit_id = data.get('reddit_id') or data.get('id', '')

        cleaned = {
            'reddit_id': reddit_id,
            'title': self._truncate_string(data.get('title'), 500),
            'author': data.get('author', ''),
            'author_username': data.get('author_username') or data.get('author', ''),
            'subreddit': data.get('subreddit', ''),
            'subreddit_name': (data.get('subreddit_name') or data.get('subreddit', '')).lower(),
            'created_utc': self._ensure_timestamp(data.get('created_utc')),
            'score': self._ensure_int(data.get('score')),
            'num_comments': self._ensure_int(data.get('num_comments')),
            'upvote_ratio': float(data.get('upvote_ratio', 0)),
            'over_18': bool(data.get('over_18', False)),
            'spoiler': bool(data.get('spoiler', False)),
            'stickied': bool(data.get('stickied', False)),
            'locked': bool(data.get('locked', False)),
            'is_self': bool(data.get('is_self', False)),
            'is_video': bool(data.get('is_video', False)),
            'is_gallery': bool(data.get('is_gallery', False)),
            'post_type': data.get('post_type') or self._determine_post_type(data),
            'content_type': data.get('content_type') or data.get('post_type') or self._determine_post_type(data),
            'updated_at': datetime.now(timezone.utc).isoformat()
        }

        # Add optional fields
        if 'selftext' in data:
            cleaned['selftext'] = self._truncate_string(data['selftext'], 10000)
        if 'url' in data:
            cleaned['url'] = self._truncate_string(data['url'], 1000)
        if 'permalink' in data:
            cleaned['permalink'] = self._truncate_string(data['permalink'], 500)
        if 'domain' in data:
            cleaned['domain'] = self._truncate_string(data['domain'], 200)
        if 'link_flair_text' in data:
            cleaned['link_flair_text'] = self._truncate_string(data['link_flair_text'], 200)
        if 'author_flair_text' in data:
            cleaned['author_flair_text'] = self._truncate_string(data['author_flair_text'], 200)

        # Add new numeric fields
        numeric_fields = [
            'comment_to_upvote_ratio', 'gilded', 'total_awards_received',
            'post_length', 'posting_hour', 'posting_day_of_week'
        ]
        for field in numeric_fields:
            if field in data:
                if field == 'comment_to_upvote_ratio':
                    cleaned[field] = float(data[field]) if data[field] is not None else 0
                else:
                    cleaned[field] = self._ensure_int(data[field])

        # Add boolean fields
        if 'has_thumbnail' in data:
            cleaned['has_thumbnail'] = bool(data['has_thumbnail'])
        if 'has_media' in data:
            cleaned['has_media'] = bool(data['has_media'])

        # Add string fields
        if 'thumbnail' in data:
            cleaned['thumbnail'] = self._truncate_string(data['thumbnail'], 500)
        if 'distinguished' in data:
            cleaned['distinguished'] = data['distinguished']

        # REMOVED: sub_tags and sub_primary_category handling
        # These fields should NEVER be set by the scraper for subreddits
        # They are manual categorizations that must be preserved
        # Only posts will have these fields set (inherited from their subreddit)

        # Add timestamp field
        if 'scraped_at' in data:
            cleaned['scraped_at'] = self._ensure_timestamp(data['scraped_at'])
        else:
            cleaned['scraped_at'] = datetime.now(timezone.utc).isoformat()

        return cleaned

    def _determine_post_type(self, post_data: Dict) -> str:
        """Determine the type of post based on its attributes"""
        if post_data.get('is_video'):
            return 'video'
        elif post_data.get('is_gallery'):
            return 'gallery'
        elif 'poll_data' in post_data:
            return 'poll'
        elif post_data.get('selftext'):
            return 'text'
        elif any(domain in post_data.get('domain', '')
                for domain in ['i.redd.it', 'imgur.com', 'i.imgur.com']):
            return 'image'
        else:
            return 'link'

    def _truncate_string(self, value: Any, max_length: int) -> Optional[str]:
        """Truncate string to maximum length"""
        if value is None:
            return None
        str_value = str(value)
        if len(str_value) > max_length:
            return str_value[:max_length-3] + '...'
        return str_value

    def _ensure_int(self, value: Any) -> int:
        """Ensure value is an integer"""
        if value is None:
            return 0
        try:
            return int(value)
        except (ValueError, TypeError):
            return 0

    def _ensure_timestamp(self, value: Any) -> Optional[str]:
        """Ensure value is a valid timestamp"""
        if value is None:
            return None

        # If it's already a timestamp integer
        if isinstance(value, (int, float)):
            return datetime.fromtimestamp(value, timezone.utc).isoformat()

        # If it's already an ISO string
        if isinstance(value, str):
            try:
                # Try to parse it to validate
                datetime.fromisoformat(value.replace('Z', '+00:00'))
                return value
            except Exception:
                return None

        return None

    def _limit_error_history(self):
        """Limit error history in stats to prevent memory leak"""
        for stat in self.stats.values():
            if isinstance(stat, dict):
                # Limit any error lists in stats
                for key in list(stat.keys()):
                    if 'error' in key.lower() and isinstance(stat[key], list):
                        if len(stat[key]) > self._max_errors_in_stats:
                            # Keep only the last N errors
                            stat[key] = stat[key][-self._max_errors_in_stats:]

    def get_stats(self) -> Dict[str, Any]:
        """Get current batch writer statistics"""
        return {
            'batch_size': self.batch_size,
            'flush_interval': self.flush_interval,
            'buffers': {
                table: len(records)
                for table, records in self.buffers.items()
            },
            'statistics': dict(self.stats),
            'failed_records_count': {table: len(records) for table, records in self._failed_records.items()}
        }

    async def __aenter__(self):
        """Async context manager entry"""
        await self.start()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit - ensure data is always flushed"""
        try:
            # Always flush, even if there was an exception
            if exc_type:
                logger.warning(f"⚠️ Exiting batch writer context with exception: {exc_type.__name__}: {exc_val}")
                logger.info("💾 Attempting to flush data before exit...")

            await self.stop()

        except Exception as e:
            logger.error(f"❌ Error in batch writer context exit: {e}")
            # Last-ditch effort to save data
            try:
                await self.flush_all()
            except Exception as flush_error:
                logger.error(f"❌ Final flush attempt failed: {flush_error}")

    # All sync methods have been removed to prevent deadlocks and async/sync mixing issues
    # Use only async versions: add_subreddit(), add_user(), add_posts(), flush_all()
    # ensure_users_exist(), ensure_subreddits_exist()

# DEBUG: Log when class is fully loaded
print(f"[BATCH_WRITER MODULE] BatchWriter class defined successfully", flush=True)