"""
Base Scraper Abstract Class for Reddit Scraper
Provides common functionality for all scraper types
"""
import logging
import asyncio
from abc import ABC, abstractmethod
from datetime import datetime, timezone
from typing import Dict, Any, Optional, List, Callable
# Flexible imports for both local development and production
try:
    # Local development (with api. prefix)
    from api.core.clients.api_pool import ThreadSafeAPIPool
    from api.core.config.proxy_manager import ProxyManager
    from api.core.cache.cache_manager import AsyncCacheManager
    from api.core.database.batch_writer import BatchWriter
except ImportError:
    # Production (without api. prefix)
    from core.clients.api_pool import ThreadSafeAPIPool
    from core.config.proxy_manager import ProxyManager
    from core.cache.cache_manager import AsyncCacheManager
    from core.database.batch_writer import BatchWriter

logger = logging.getLogger(__name__)


class BaseScraper(ABC):
    """
    Abstract base class for all Reddit scrapers.
    Provides common functionality like API management, caching, and batch writing.
    """

    def __init__(self, supabase_client, thread_id: int = 0):
        """
        Initialize base scraper.

        Args:
            supabase_client: Initialized Supabase client
            thread_id: Thread identifier for this scraper instance
        """
        self.supabase = supabase_client
        self.thread_id = thread_id

        # Core components (will be initialized in setup)
        self.api_pool: Optional[ThreadSafeAPIPool] = None
        self.proxy_manager: Optional[ProxyManager] = None
        self.cache_manager: Optional[AsyncCacheManager] = None
        self.batch_writer: Optional[BatchWriter] = None

        # Statistics
        self.stats = {
            'requests_made': 0,
            'requests_successful': 0,
            'requests_failed': 0,
            'items_processed': 0,
            'items_cached': 0,
            'errors': []
        }

        # Control flag
        self._running = True

    async def initialize(self, api_pool: ThreadSafeAPIPool,
                        proxy_manager: ProxyManager,
                        cache_manager: AsyncCacheManager,
                        batch_writer: BatchWriter):
        """
        Initialize scraper with shared components.

        Args:
            api_pool: Thread-safe API pool
            proxy_manager: Proxy manager instance
            cache_manager: Cache manager instance
            batch_writer: Batch writer instance
        """
        self.api_pool = api_pool
        self.proxy_manager = proxy_manager
        self.cache_manager = cache_manager
        self.batch_writer = batch_writer

        logger.info(f"{self.__class__.__name__} initialized for thread {self.thread_id}")

    @abstractmethod
    async def scrape(self, **kwargs) -> Dict[str, Any]:
        """
        Main scraping method to be implemented by subclasses.

        Returns:
            Dictionary containing scraping results
        """
        pass

    async def make_api_request(self, func_name: str, *args, **kwargs) -> Optional[Any]:
        """
        Make an API request using the thread's assigned API and proxy.

        Args:
            func_name: Name of the API function to call
            *args: Positional arguments for the function
            **kwargs: Keyword arguments for the function

        Returns:
            API response or None if failed
        """
        if not self.api_pool:
            logger.error("API pool not initialized")
            return None

        proxy_config = None  # Ensure defined for exception scope
        try:
            # Get API and proxy for this thread
            api, proxy_config = self.api_pool.get_api_with_proxy(self.thread_id)

            if not api:
                logger.error(f"No API instance for thread {self.thread_id}")
                return None

            # Add proxy config if not already in kwargs
            if proxy_config and 'proxy_config' not in kwargs:
                kwargs['proxy_config'] = proxy_config

            # Get the function from API
            func = getattr(api, func_name, None)
            if not func:
                logger.error(f"API function '{func_name}' not found")
                return None

            # Make the request
            start_time = datetime.now(timezone.utc)
            result = func(*args, **kwargs)
            end_time = datetime.now(timezone.utc)

            # Update statistics
            self.stats['requests_made'] += 1

            if result:
                self.stats['requests_successful'] += 1

                # Update proxy stats if we have proxy manager
                if self.proxy_manager and proxy_config:
                    response_time_ms = int((end_time - start_time).total_seconds() * 1000)
                    await self.proxy_manager.update_proxy_stats(
                        proxy_config['id'],
                        success=True,
                        response_time_ms=response_time_ms
                    )

                # Check for rate limiting
                if isinstance(result, dict) and result.get('error') == 'rate_limited':
                    self.stats['requests_failed'] += 1
                    logger.warning(f"Rate limited on {func_name}")
            else:
                self.stats['requests_failed'] += 1

                # Update proxy stats for failure
                if self.proxy_manager and proxy_config:
                    await self.proxy_manager.update_proxy_stats(
                        proxy_config['id'],
                        success=False,
                        error_message="Request returned None"
                    )

            return result

        except Exception as e:
            logger.error(f"Error in API request {func_name}: {e}")
            self.stats['requests_failed'] += 1
            self.stats['errors'].append({
                'timestamp': datetime.now(timezone.utc).isoformat(),
                'function': func_name,
                'error': str(e)
            })

            # Update proxy stats for error
            if self.proxy_manager and proxy_config:
                await self.proxy_manager.update_proxy_stats(
                    proxy_config['id'],
                    success=False,
                    error_message=str(e)[:500]
                )

            return None

    async def check_rate_limit(self) -> bool:
        """
        Check if current proxy is rate limited.

        Returns:
            True if rate limited, False otherwise
        """
        if not self.cache_manager or not self.proxy_manager:
            return False

        # Get proxy for this thread
        proxy_config = self.proxy_manager.get_proxy_for_thread(self.thread_id)
        if not proxy_config:
            return False

        return self.cache_manager.is_rate_limited(proxy_config['id'])

    async def handle_rate_limit(self, wait_time: float = 60.0):
        """
        Handle rate limit by waiting and updating cache.

        Args:
            wait_time: Time to wait in seconds
        """
        if self.cache_manager and self.proxy_manager:
            proxy_config = self.proxy_manager.get_proxy_for_thread(self.thread_id)
            if proxy_config:
                # Cache rate limit info
                reset_time = datetime.now(timezone.utc).timestamp() + wait_time
                self.cache_manager.cache_rate_limit(proxy_config['id'], reset_time)

        logger.warning(f"Thread {self.thread_id} rate limited, waiting {wait_time}s")
        await asyncio.sleep(wait_time)

    async def process_batch(self, items: List[Any],
                           process_func: Callable,
                           batch_size: int = 10) -> List[Any]:
        """
        Process items in batches with proper error handling.

        Args:
            items: List of items to process
            process_func: Async function to process each item
            batch_size: Number of items to process concurrently

        Returns:
            List of processed results
        """
        results = []

        for i in range(0, len(items), batch_size):
            if not self._running:
                logger.info(f"Thread {self.thread_id} stopping batch processing")
                break

            batch = items[i:i + batch_size]

            # Process batch concurrently
            tasks = [process_func(item) for item in batch]
            batch_results = await asyncio.gather(*tasks, return_exceptions=True)

            # Filter out exceptions
            for result in batch_results:
                if isinstance(result, Exception):
                    logger.error(f"Error processing item: {result}")
                    self.stats['errors'].append({
                        'timestamp': datetime.now(timezone.utc).isoformat(),
                        'error': str(result)
                    })
                else:
                    results.append(result)
                    self.stats['items_processed'] += 1

            # Small delay between batches to avoid overwhelming
            await asyncio.sleep(0.5)

        return results

    async def save_to_database(self, data_type: str, data: Any):
        """
        Save data to database using batch writer.

        Args:
            data_type: Type of data ('subreddit', 'user', 'posts', etc.)
            data: Data to save
        """
        if not self.batch_writer:
            logger.error("❌ Batch writer not initialized - cannot save to database")
            return

        try:
            # Log what we're saving
            if data_type == 'subreddit':
                name = data.get('name', 'unknown')
                logger.info(f"💾 [Thread {self.thread_id}] Saving subreddit r/{name} to buffer")
                logger.debug(f"  Subreddit data keys: {list(data.keys())}")
                await self.batch_writer.add_subreddit(data)
            elif data_type == 'user':
                username = data.get('username', 'unknown')
                logger.info(f"💾 [Thread {self.thread_id}] Saving user u/{username} to buffer")
                await self.batch_writer.add_user(data)
            elif data_type == 'posts':
                count = len(data) if isinstance(data, list) else 1
                logger.info(f"💾 [Thread {self.thread_id}] Saving {count} posts to buffer")
                await self.batch_writer.add_posts(data)
            elif data_type == 'discovery':
                # Convert discovery data to subreddit format
                # The add_discovered_subreddit method was removed - use add_subreddit instead
                subreddit_name = data.get('discovered_subreddit', 'unknown')
                logger.info(f"💾 [Thread {self.thread_id}] Saving discovery of r/{subreddit_name}")

                # Create subreddit data with empty review field for manual review
                subreddit_data = {
                    'name': subreddit_name.lower(),
                    'display_name': subreddit_name,
                    'display_name_prefixed': f'r/{subreddit_name}',
                    'title': '',  # Will be populated when fully scraped
                    'description': '',  # Will be populated when fully scraped
                    'subscribers': 0,  # Will be updated when fully scraped
                    'created_utc': datetime.now(timezone.utc).isoformat(),  # Placeholder until scraped
                    'source_subreddit': data.get('source_subreddit', ''),
                    'discovered_from_user': data.get('discovered_from_user', ''),
                    'discovered_at': data.get('discovered_at', ''),
                    'review': None,  # Empty review field for manual review
                    'updated_at': datetime.now(timezone.utc).isoformat()
                }

                await self.batch_writer.add_subreddit(subreddit_data)
                logger.debug(f"✅ Discovery data for r/{subreddit_name} added to buffer")
            else:
                logger.warning(f"⚠️ Unknown data type: {data_type}")

        except Exception as e:
            logger.error(f"❌ Error saving {data_type} to database: {e}")
            self.stats['errors'].append({
                'timestamp': datetime.now(timezone.utc).isoformat(),
                'operation': f'save_{data_type}',
                'error': str(e)
            })

    def should_continue(self, control_checker: Optional[Callable] = None) -> bool:
        """
        Check if scraper should continue running.
        
        Note: Only supports synchronous control checkers to avoid async/sync mixing.
        For async control checking, check the flag directly in your async context.

        Args:
            control_checker: Optional synchronous control check function

        Returns:
            True if should continue, False otherwise
        """
        # Check internal flag
        if not self._running:
            return False

        # Check external control if provided (only sync functions supported)
        if control_checker:
            try:
                # Only support synchronous control checkers to avoid deadlocks
                if asyncio.iscoroutinefunction(control_checker):
                    logger.warning("Async control checker not supported in should_continue(). Use sync function or check flag directly in async context.")
                    return True  # Continue by default if unsupported
                else:
                    return control_checker()
            except Exception as e:
                logger.error(f"Error checking control: {e}")
                return True  # Continue on error

        return True

    def stop(self):
        """Signal scraper to stop"""
        self._running = False
        logger.info(f"{self.__class__.__name__} thread {self.thread_id} stopping")

    def get_stats(self) -> Dict[str, Any]:
        """Get scraper statistics"""
        return {
            'scraper_class': self.__class__.__name__,
            'thread_id': self.thread_id,
            'stats': self.stats.copy(),
            'cache_stats': self.cache_manager.get_stats() if self.cache_manager else None,
            'is_running': self._running
        }

    async def log_progress(self, message: str, level: str = 'info'):
        """
        Log progress to both logger and Supabase.

        Args:
            message: Log message
            level: Log level
        """
        # Local logging
        log_func = getattr(logger, level, logger.info)
        log_func(f"[Thread {self.thread_id}] {message}")

        # Database logging
        try:
            # Create a JSON-serializable copy of stats
            serializable_stats = {}
            for key, value in self.stats.items():
                if isinstance(value, datetime):
                    serializable_stats[key] = value.isoformat()
                elif isinstance(value, list):
                    # Don't include error lists in logs as they might contain datetime objects
                    if key != 'errors':
                        serializable_stats[key] = value
                else:
                    serializable_stats[key] = value

            self.supabase.table('system_logs').insert({
                'timestamp': datetime.now(timezone.utc).isoformat(),
                'level': level,
                'source': self.__class__.__name__,
                'message': message,
                'context': {
                    'thread_id': self.thread_id,
                    'stats': serializable_stats
                }
            }).execute()
        except Exception as e:
            logger.error(f"Failed to log to database: {e}")

    async def __aenter__(self):
        """Async context manager entry"""
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit"""
        self.stop()
        if self.batch_writer:
            await self.batch_writer.flush_all()