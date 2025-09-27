"""
Cache Manager for Reddit Scraper
Implements TTL caching to prevent memory leaks and improve performance
"""
import logging
import time
import threading

from typing import Dict, Any, Optional, Tuple
from collections import OrderedDict
import asyncio

logger = logging.getLogger(__name__)


class TTLCache:
    """
    Time-to-live cache implementation with automatic expiration.
    Thread-safe and memory efficient.
    """

    def __init__(self, ttl_seconds: int = 3600, max_size: int = 10000,
                 cleanup_interval: int = 300):
        """
        Initialize TTL cache.

        Args:
            ttl_seconds: Time-to-live for cache entries in seconds
            max_size: Maximum number of entries in cache
            cleanup_interval: Interval between cleanup runs in seconds
        """
        self.ttl_seconds = ttl_seconds
        self.max_size = max_size
        self.cleanup_interval = cleanup_interval

        # Use OrderedDict for LRU behavior
        self._cache: OrderedDict[str, Tuple[Any, float]] = OrderedDict()
        self._lock = threading.RLock()

        # Statistics
        self.hits = 0
        self.misses = 0
        self.evictions = 0
        self.expirations = 0
        self.total_memory_bytes = 0  # Track approximate memory usage

        # Start cleanup thread
        self._running = True
        self._cleanup_thread = threading.Thread(target=self._cleanup_loop, daemon=True)
        self._cleanup_thread.start()

    def get(self, key: str) -> Optional[Any]:
        """
        Get value from cache if not expired.

        Args:
            key: Cache key

        Returns:
            Cached value or None if expired/not found
        """
        with self._lock:
            if key not in self._cache:
                self.misses += 1
                return None

            value, expiry_time = self._cache[key]

            if time.time() > expiry_time:
                # Entry expired
                del self._cache[key]
                self.expirations += 1
                self.misses += 1
                return None

            # Move to end (most recently used)
            self._cache.move_to_end(key)
            self.hits += 1
            return value

    def set(self, key: str, value: Any, ttl: Optional[int] = None):
        """
        Set value in cache with TTL.

        Args:
            key: Cache key
            value: Value to cache
            ttl: Custom TTL in seconds (uses default if None)
        """
        ttl = ttl or self.ttl_seconds
        expiry_time = time.time() + ttl

        with self._lock:
            # Check if we need to evict
            if key not in self._cache and len(self._cache) >= self.max_size:
                # Evict least recently used
                self._cache.popitem(last=False)
                self.evictions += 1

            self._cache[key] = (value, expiry_time)
            self._cache.move_to_end(key)

    def delete(self, key: str) -> bool:
        """
        Delete entry from cache.

        Args:
            key: Cache key

        Returns:
            True if deleted, False if not found
        """
        with self._lock:
            if key in self._cache:
                del self._cache[key]
                return True
            return False

    def clear(self):
        """Clear all cache entries"""
        with self._lock:
            self._cache.clear()

    def stop(self):
        """Stop the cleanup thread"""
        self._running = False
        if hasattr(self, '_cleanup_thread'):
            self._cleanup_thread.join(timeout=1)

    def _cleanup_loop(self):
        """Background thread to clean up expired entries"""
        import time  # Import locally since this runs in a separate thread
        while self._running:
            try:
                time.sleep(self.cleanup_interval)
                if self._running:  # Check again after sleep
                    self._cleanup_expired()
            except Exception as e:
                logger.error(f"Error in cache cleanup: {e}")

    def _cleanup_expired(self):
        """Remove expired entries from cache"""
        current_time = time.time()
        keys_to_delete = []

        with self._lock:
            for key, (value, expiry_time) in self._cache.items():
                if current_time > expiry_time:
                    keys_to_delete.append(key)

            for key in keys_to_delete:
                del self._cache[key]
                self.expirations += 1

        if keys_to_delete:
            logger.debug(f"Cleaned up {len(keys_to_delete)} expired cache entries")

    def get_stats(self) -> Dict[str, Any]:
        """Get cache statistics"""
        with self._lock:
            total_requests = self.hits + self.misses
            hit_rate = (self.hits / total_requests * 100) if total_requests > 0 else 0

            return {
                'size': len(self._cache),
                'max_size': self.max_size,
                'ttl_seconds': self.ttl_seconds,
                'hits': self.hits,
                'misses': self.misses,
                'hit_rate': f"{hit_rate:.1f}%",
                'evictions': self.evictions,
                'expirations': self.expirations,
                'memory_mb': self.get_memory_usage_mb()
            }

    def get_memory_usage_mb(self) -> float:
        """Get approximate memory usage in megabytes"""
        import sys
        total_size = 0

        with self._lock:
            for key, (value, _) in self._cache.items():
                # Approximate size calculation
                total_size += sys.getsizeof(key)
                total_size += sys.getsizeof(value)
                if isinstance(value, dict):
                    total_size += sum(sys.getsizeof(k) + sys.getsizeof(v)
                                    for k, v in value.items())
                elif isinstance(value, (list, tuple)):
                    total_size += sum(sys.getsizeof(item) for item in value)

        return round(total_size / (1024 * 1024), 2)

    def force_cleanup(self, target_percentage: float = 0.5):
        """Force cleanup to reduce cache to target percentage of max size"""
        with self._lock:
            target_size = int(self.max_size * target_percentage)
            current_size = len(self._cache)

            if current_size > target_size:
                to_remove = current_size - target_size
                logger.info(f"🧹 Force cleanup: removing {to_remove} oldest cache entries")

                for _ in range(to_remove):
                    if self._cache:
                        self._cache.popitem(last=False)  # Remove oldest
                        self.evictions += 1


class CacheManager:
    """
    Manages multiple caches for different data types in the Reddit scraper.
    Prevents memory leaks and improves performance through intelligent caching.
    """

    def __init__(self):
        """Initialize cache manager with different caches for different data types"""
        # User cache - 1 hour TTL, max 50k users
        self.user_cache = TTLCache(ttl_seconds=3600, max_size=50000)

        # Subreddit cache - 2 hours TTL, max 10k subreddits
        self.subreddit_cache = TTLCache(ttl_seconds=7200, max_size=10000)

        # Post cache - 30 minutes TTL, max 100k posts
        self.post_cache = TTLCache(ttl_seconds=1800, max_size=100000)

        # Rate limit cache - 5 minutes TTL, max 1k entries
        self.rate_limit_cache = TTLCache(ttl_seconds=300, max_size=1000)

        # Processed sets with TTL
        self.processed_users = TTLSet(ttl_seconds=3600)
        self.processed_subreddits = TTLSet(ttl_seconds=7200)
        self.discovered_subreddits = TTLSet(ttl_seconds=86400)  # 24 hours

        logger.info("Cache manager initialized with TTL caching")

    def cache_user(self, username: str, user_data: Dict[str, Any]):
        """Cache user data"""
        self.user_cache.set(username.lower(), user_data)

    def get_cached_user(self, username: str) -> Optional[Dict[str, Any]]:
        """Get cached user data"""
        return self.user_cache.get(username.lower())

    def is_user_processed(self, username: str) -> bool:
        """Check if user was already processed"""
        return username.lower() in self.processed_users

    def mark_user_processed(self, username: str):
        """Mark user as processed"""
        self.processed_users.add(username.lower())

    def cache_subreddit(self, subreddit_name: str, subreddit_data: Dict[str, Any]):
        """Cache subreddit data"""
        self.subreddit_cache.set(subreddit_name.lower(), subreddit_data)

    def get_cached_subreddit(self, subreddit_name: str) -> Optional[Dict[str, Any]]:
        """Get cached subreddit data"""
        return self.subreddit_cache.get(subreddit_name.lower())

    def is_subreddit_processed(self, subreddit_name: str) -> bool:
        """Check if subreddit was already processed"""
        return subreddit_name.lower() in self.processed_subreddits

    def mark_subreddit_processed(self, subreddit_name: str):
        """Mark subreddit as processed"""
        self.processed_subreddits.add(subreddit_name.lower())

    def is_subreddit_discovered(self, subreddit_name: str) -> bool:
        """Check if subreddit was already discovered"""
        return subreddit_name.lower() in self.discovered_subreddits

    def mark_subreddit_discovered(self, subreddit_name: str):
        """Mark subreddit as discovered"""
        self.discovered_subreddits.add(subreddit_name.lower())

    def cache_post(self, post_id: str, post_data: Dict[str, Any]):
        """Cache post data"""
        self.post_cache.set(post_id, post_data)

    def get_cached_post(self, post_id: str) -> Optional[Dict[str, Any]]:
        """Get cached post data"""
        return self.post_cache.get(post_id)

    def cache_rate_limit(self, proxy_id: str, reset_time: float):
        """Cache rate limit information for a proxy"""
        self.rate_limit_cache.set(proxy_id, reset_time)

    def is_rate_limited(self, proxy_id: str) -> bool:
        """Check if proxy is currently rate limited"""
        reset_time = self.rate_limit_cache.get(proxy_id)
        if reset_time and time.time() < reset_time:
            return True
        return False

    def get_rate_limit_reset(self, proxy_id: str) -> Optional[float]:
        """Get rate limit reset time for proxy"""
        return self.rate_limit_cache.get(proxy_id)

    def clear_all_caches(self):
        """Clear all caches"""
        self.user_cache.clear()
        self.subreddit_cache.clear()
        self.post_cache.clear()
        self.rate_limit_cache.clear()
        self.processed_users.clear()
        self.processed_subreddits.clear()
        self.discovered_subreddits.clear()
        logger.info("All caches cleared")

    def get_stats(self) -> Dict[str, Any]:
        """Get statistics for all caches"""
        return {
            'user_cache': self.user_cache.get_stats(),
            'subreddit_cache': self.subreddit_cache.get_stats(),
            'post_cache': self.post_cache.get_stats(),
            'rate_limit_cache': self.rate_limit_cache.get_stats(),
            'processed_users': len(self.processed_users),
            'processed_subreddits': len(self.processed_subreddits),
            'discovered_subreddits': len(self.discovered_subreddits)
        }


class TTLSet:
    """
    Set with time-to-live for entries.
    Automatically removes expired entries.
    """

    def __init__(self, ttl_seconds: int = 3600):
        """
        Initialize TTL set.

        Args:
            ttl_seconds: Time-to-live for entries in seconds
        """
        self.ttl_seconds = ttl_seconds
        self._data: Dict[str, float] = {}
        self._lock = threading.RLock()
        self._running = True

        # Start cleanup thread
        self._cleanup_thread = threading.Thread(
            target=self._cleanup_loop,
            daemon=True
        )
        self._cleanup_thread.start()

    def add(self, item: str):
        """Add item to set with TTL"""
        expiry_time = time.time() + self.ttl_seconds
        with self._lock:
            self._data[item] = expiry_time

    def __contains__(self, item: str) -> bool:
        """Check if item is in set and not expired"""
        with self._lock:
            if item not in self._data:
                return False

            if time.time() > self._data[item]:
                # Expired
                del self._data[item]
                return False

            return True

    def __len__(self) -> int:
        """Get number of non-expired items"""
        self._cleanup_expired()
        with self._lock:
            return len(self._data)

    def clear(self):
        """Clear all items"""
        with self._lock:
            self._data.clear()

    def stop(self):
        """Stop the cleanup thread"""
        self._running = False
        if hasattr(self, '_cleanup_thread'):
            self._cleanup_thread.join(timeout=1)

    def _cleanup_loop(self):
        """Background thread to clean up expired entries"""
        import time  # Import locally since this runs in a separate thread
        while self._running:
            try:
                time.sleep(300)  # Clean up every 5 minutes
                if self._running:  # Check again after sleep
                    self._cleanup_expired()
            except Exception as e:
                logger.error(f"Error in TTL set cleanup: {e}")

    def _cleanup_expired(self):
        """Remove expired entries"""
        current_time = time.time()
        with self._lock:
            expired = [k for k, v in self._data.items() if current_time > v]
            for key in expired:
                del self._data[key]


class AsyncCacheManager(CacheManager):
    """
    Async version of CacheManager for use with asyncio.
    Provides the same functionality with async/await support.
    """

    def __init__(self):
        super().__init__()
        self._lock = asyncio.Lock()

    async def cache_user_async(self, username: str, user_data: Dict[str, Any]):
        """Async cache user data"""
        async with self._lock:
            self.cache_user(username, user_data)

    async def get_cached_user_async(self, username: str) -> Optional[Dict[str, Any]]:
        """Async get cached user data"""
        async with self._lock:
            return self.get_cached_user(username)

    async def cache_subreddit_async(self, subreddit_name: str,
                                   subreddit_data: Dict[str, Any]):
        """Async cache subreddit data"""
        async with self._lock:
            self.cache_subreddit(subreddit_name, subreddit_data)

    async def get_cached_subreddit_async(self, subreddit_name: str) -> Optional[Dict[str, Any]]:
        """Async get cached subreddit data"""
        async with self._lock:
            return self.get_cached_subreddit(subreddit_name)

    async def get_stats_async(self) -> Dict[str, Any]:
        """Async get statistics for all caches"""
        async with self._lock:
            return self.get_stats()