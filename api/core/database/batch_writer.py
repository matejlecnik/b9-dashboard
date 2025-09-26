"""
Batch Writer for Reddit Scraper
Optimizes database operations by batching writes to reduce network overhead
"""
import logging
import asyncio
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from collections import defaultdict
import json

logger = logging.getLogger(__name__)


class BatchWriter:
    """
    Handles batch writing to Supabase with optimized performance.
    Accumulates records and writes them in efficient batches.
    """

    def __init__(self, supabase_client, batch_size: int = 500, flush_interval: float = 30.0):
        """
        Initialize batch writer.

        Args:
            supabase_client: Initialized Supabase client
            batch_size: Maximum records per batch (Supabase supports up to 1000)
            flush_interval: Time in seconds between automatic flushes
        """
        self.supabase = supabase_client
        self.batch_size = min(batch_size, 1000)  # Supabase max is 1000
        self.flush_interval = flush_interval

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

        # Lock for thread safety
        self._lock = asyncio.Lock()
        self._flush_task = None
        self._running = False

    async def start(self):
        """Start the automatic flush task"""
        self._running = True
        self._flush_task = asyncio.create_task(self._auto_flush_loop())
        logger.info(f"Batch writer started with batch_size={self.batch_size}, "
                   f"flush_interval={self.flush_interval}s")

    async def stop(self):
        """Stop the batch writer and flush remaining data"""
        self._running = False

        if self._flush_task:
            self._flush_task.cancel()
            try:
                await self._flush_task
            except asyncio.CancelledError:
                pass

        # Final flush of all buffers
        await self.flush_all()
        logger.info("Batch writer stopped and flushed all buffers")

    async def _auto_flush_loop(self):
        """Periodically flush buffers"""
        logger.info(f"🔄 Auto-flush loop started (interval: {self.flush_interval}s)")
        while self._running:
            try:
                await asyncio.sleep(self.flush_interval)
                logger.info(f"⏰ Auto-flush timer triggered (every {self.flush_interval}s)")
                # Log current buffer sizes before flush
                buffer_sizes = {table: len(self.buffers[table]) for table in self.buffers}
                logger.info(f"  Current buffer sizes: {buffer_sizes}")
                await self.flush_all()
            except asyncio.CancelledError:
                logger.info("Auto-flush loop cancelled")
                break
            except Exception as e:
                logger.error(f"❌ Error in auto flush loop: {e}")
                import traceback
                logger.error(traceback.format_exc())

    async def add_subreddit(self, subreddit_data: Dict[str, Any]):
        """
        Add a subreddit record to the buffer.

        Args:
            subreddit_data: Subreddit data dictionary
        """
        try:
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
                    logger.info(f"🚀 Buffer full for reddit_subreddits, triggering flush")
                    await self._flush_table('reddit_subreddits')
        except Exception as e:
            logger.error(f"❌ Error in add_subreddit: {e}")
            import traceback
            logger.error(traceback.format_exc())

    async def add_user(self, user_data: Dict[str, Any]):
        """
        Add a user record to the buffer.

        Args:
            user_data: User data dictionary
        """
        async with self._lock:
            # Clean data before adding to buffer
            cleaned_data = self._clean_user_data(user_data)
            self.buffers['reddit_users'].append(cleaned_data)

            # Check if we should flush this buffer
            if len(self.buffers['reddit_users']) >= self.batch_size:
                await self._flush_table('reddit_users')

    async def add_posts(self, posts_data: List[Dict[str, Any]]):
        """
        Add multiple post records to the buffer.

        Args:
            posts_data: List of post data dictionaries
        """
        async with self._lock:
            for post in posts_data:
                cleaned_data = self._clean_post_data(post)
                self.buffers['reddit_posts'].append(cleaned_data)

            # Check if we should flush this buffer
            if len(self.buffers['reddit_posts']) >= self.batch_size:
                await self._flush_table('reddit_posts')

    async def add_discovered_subreddit(self, discovery_data: Dict[str, Any]):
        """
        Add a discovered subreddit to the buffer.

        Args:
            discovery_data: Discovery data including source user and subreddit
        """
        async with self._lock:
            cleaned_data = {
                'source_user': discovery_data.get('source_user'),
                'discovered_subreddit': discovery_data.get('discovered_subreddit'),
                'discovery_method': discovery_data.get('discovery_method', 'user_activity'),
                'post_count': discovery_data.get('post_count', 1),
                'karma_in_subreddit': discovery_data.get('karma_in_subreddit', 0),
                'discovered_at': discovery_data.get('discovered_at',
                                                  datetime.now(timezone.utc).isoformat())
            }
            self.buffers['subreddit_discoveries'].append(cleaned_data)

            # Check if we should flush this buffer
            if len(self.buffers['subreddit_discoveries']) >= self.batch_size:
                await self._flush_table('subreddit_discoveries')

    async def flush_all(self):
        """Flush all buffers to database"""
        async with self._lock:
            tables_to_flush = list(self.buffers.keys())
            buffer_counts = {table: len(self.buffers[table]) for table in tables_to_flush}

        # Log what we're about to flush
        total_records = sum(buffer_counts.values())
        if total_records > 0:
            logger.info(f"🔄 Starting flush_all for {total_records} total records:")
            for table, count in buffer_counts.items():
                if count > 0:
                    logger.info(f"  - {table}: {count} records")
        else:
            logger.debug("flush_all called but no records to flush")

        for table in tables_to_flush:
            await self._flush_table(table)

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
                        'display_name': username,
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
                        'display_name': display_name,
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
        try:
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
            logger.debug(f"📤 Executing upsert for {len(records)} records to {table_name} "
                        f"(on_conflict: {on_conflict_col})")

            response = self.supabase.table(table_name).upsert(
                records,
                on_conflict=on_conflict_col
            ).execute()

            if hasattr(response, 'error') and response.error:
                logger.error(f"❌ Batch write error for {table_name}: {response.error}")
                return 0, len(records)

            logger.debug(f"✅ Upsert successful for {len(records)} records to {table_name}")
            return len(records), 0

        except Exception as e:
            logger.error(f"Exception writing batch to {table_name}: {e}")

            # Try to write records individually as fallback
            successful = 0
            for record in records:
                try:
                    on_conflict_col = self._get_conflict_column(table_name)
                    self.supabase.table(table_name).upsert(
                        record,
                        on_conflict=on_conflict_col
                    ).execute()
                    successful += 1
                except Exception as record_error:
                    logger.debug(f"Failed to write individual record: {record_error}")

            return successful, len(records) - successful

    def _get_conflict_column(self, table_name: str) -> str:
        """Get the conflict resolution column for a table"""
        conflict_columns = {
            'reddit_subreddits': 'name',
            'reddit_users': 'username',
            'reddit_posts': 'reddit_id',
            'subreddit_discoveries': 'source_user,discovered_subreddit'
        }
        return conflict_columns.get(table_name, 'id')

    def _clean_subreddit_data(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Clean and validate subreddit data before writing"""
        # Ensure required fields
        cleaned = {
            'name': data.get('name', '').lower(),
            'display_name': data.get('display_name', ''),
            'title': self._truncate_string(data.get('title'), 500),
            'description': self._truncate_string(data.get('description'), 5000),
            'subscribers': self._ensure_int(data.get('subscribers')),
            'created_utc': self._ensure_timestamp(data.get('created_utc')),
            'updated_at': datetime.now(timezone.utc).isoformat()
        }

        # Add optional fields if present
        optional_fields = [
            'avg_upvotes_per_post', 'engagement', 'subreddit_score',
            'post_frequency', 'comment_frequency', 'active_users_count',
            'growth_rate_percent', 'nsfw_percentage', 'total_posts_last_30',
            'image_post_avg_score', 'video_post_avg_score', 'text_post_avg_score',
            'link_post_avg_score', 'poll_post_avg_score', 'over_18', 'category',
            'best_posting_hour', 'best_posting_day', 'requires_verification', 'auto_review',
            'review'  # CRITICAL: Preserve existing review field during updates
        ]

        for field in optional_fields:
            if field in data and data[field] is not None:
                cleaned[field] = data[field]

        return cleaned

    def _clean_user_data(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Clean and validate user data before writing"""
        cleaned = {
            'username': data.get('username', '').lower(),
            'display_name': data.get('display_name', ''),
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
        if 'subreddit' in data:
            cleaned['subreddit'] = data['subreddit']
        if 'subreddit_type' in data:
            cleaned['subreddit_type'] = data['subreddit_type']

        # Add quality score fields if present
        quality_fields = ['username_score', 'age_score', 'karma_score', 'overall_quality_score']
        for field in quality_fields:
            if field in data:
                cleaned[field] = float(data[field])

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

        # Add JSON fields
        if 'sub_tags' in data:
            cleaned['sub_tags'] = data['sub_tags'] if isinstance(data['sub_tags'], list) else []
        if 'sub_primary_category' in data:
            cleaned['sub_primary_category'] = data['sub_primary_category']

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
            except:
                return None

        return None

    def get_stats(self) -> Dict[str, Any]:
        """Get current batch writer statistics"""
        return {
            'batch_size': self.batch_size,
            'flush_interval': self.flush_interval,
            'buffers': {
                table: len(records)
                for table, records in self.buffers.items()
            },
            'statistics': dict(self.stats)
        }

    async def __aenter__(self):
        """Async context manager entry"""
        await self.start()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit"""
        await self.stop()

    # Synchronous versions for threading compatibility
    def ensure_users_exist_sync(self, usernames: set):
        """Synchronous version of ensure_users_exist for threading"""
        try:
            placeholder_users = []
            for username in usernames:
                if username and username not in ['[deleted]', '[removed]', None]:
                    placeholder_users.append({
                        'username': username.lower(),
                        'display_name': username,
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
                        logger.debug(f"Ensured {len(chunk)} users exist (sync)")

        except Exception as e:
            logger.error(f"Exception creating placeholder users (sync): {e}")

    def ensure_subreddits_exist_sync(self, subreddit_names: set):
        """Synchronous version of ensure_subreddits_exist for threading"""
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
                        'display_name': display_name,
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
                        logger.debug(f"Ensured {len(chunk)} subreddits exist (sync)")

        except Exception as e:
            logger.error(f"Exception creating placeholder subreddits (sync): {e}")

    def add_subreddit_sync(self, subreddit_data: Dict[str, Any]):
        """Synchronous version of add_subreddit for threading"""
        # Clean data before adding to buffer
        cleaned_data = self._clean_subreddit_data(subreddit_data)
        self.buffers['reddit_subreddits'].append(cleaned_data)

        # Check if we should flush this buffer
        if len(self.buffers['reddit_subreddits']) >= self.batch_size:
            self._flush_table_sync('reddit_subreddits')

    def add_user_sync(self, user_data: Dict[str, Any]):
        """Synchronous version of add_user for threading"""
        # Clean data before adding to buffer
        cleaned_data = self._clean_user_data(user_data)
        self.buffers['reddit_users'].append(cleaned_data)

        # Check if we should flush this buffer
        if len(self.buffers['reddit_users']) >= self.batch_size:
            self._flush_table_sync('reddit_users')

    def add_posts_sync(self, posts_data: List[Dict[str, Any]]):
        """Synchronous version of add_posts for threading"""
        for post in posts_data:
            cleaned_data = self._clean_post_data(post)
            self.buffers['reddit_posts'].append(cleaned_data)

        # Check if we should flush this buffer
        if len(self.buffers['reddit_posts']) >= self.batch_size:
            self._flush_table_sync('reddit_posts')

    def flush_all_sync(self):
        """Synchronous version of flush_all for threading"""
        tables_to_flush = list(self.buffers.keys())
        for table in tables_to_flush:
            self._flush_table_sync(table)

    def _flush_table_sync(self, table_name: str):
        """Synchronous version of _flush_table for threading"""
        if not self.buffers[table_name]:
            return

        # Get all records to write
        records = self.buffers[table_name][:]
        self.buffers[table_name].clear()

        if not records:
            return

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
                                logger.debug(f"[Sync] Preserving review '{existing_review}' for r/{record['name']}")

        # For posts, ensure users and subreddits exist first
        elif table_name == 'reddit_posts':
            unique_authors = {post.get('author_username') or post.get('author')
                             for post in records
                             if post.get('author_username') or post.get('author')}
            if unique_authors:
                self.ensure_users_exist_sync(unique_authors)

            unique_subreddits = {post.get('subreddit_name') or post.get('subreddit')
                               for post in records
                               if post.get('subreddit_name') or post.get('subreddit')}
            if unique_subreddits:
                self.ensure_subreddits_exist_sync(unique_subreddits)

        # Split into chunks if necessary
        chunks = [records[i:i + self.batch_size]
                 for i in range(0, len(records), self.batch_size)]

        total_success = 0
        total_failed = 0

        for chunk in chunks:
            try:
                on_conflict_col = self._get_conflict_column(table_name)
                response = self.supabase.table(table_name).upsert(
                    chunk,
                    on_conflict=on_conflict_col
                ).execute()

                if hasattr(response, 'error') and response.error:
                    logger.error(f"Batch write error for {table_name}: {response.error}")
                    total_failed += len(chunk)
                else:
                    total_success += len(chunk)
            except Exception as e:
                logger.error(f"Exception writing batch to {table_name}: {e}")
                total_failed += len(chunk)

        # Update statistics
        self.stats[table_name]['total_records'] += len(records)
        self.stats[table_name]['total_batches'] += len(chunks)
        self.stats[table_name]['successful_writes'] += total_success
        self.stats[table_name]['failed_writes'] += total_failed
        self.stats[table_name]['last_flush'] = datetime.now(timezone.utc).isoformat()

        if total_success > 0:
            logger.info(f"[Sync] Flushed {total_success} records to {table_name}")
        if total_failed > 0:
            logger.error(f"[Sync] Failed to write {total_failed} records to {table_name}")