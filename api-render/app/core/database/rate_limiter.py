"""
Database Rate Limiter
Implements request throttling to prevent database connection overload
"""
import asyncio
import time
import logging
import inspect
from typing import Dict, Optional, Any, Callable
from collections import defaultdict, deque
from core.config.scraper_config import get_scraper_config

logger = logging.getLogger(__name__)


class DatabaseRateLimiter:
    """
    Rate limiter for database operations to prevent connection overload.
    Implements sliding window rate limiting with per-operation type limits.
    """
    
    def __init__(self,
                 default_requests_per_second: Optional[float] = None,
                 burst_limit: Optional[int] = None,
                 window_size: Optional[int] = None):
        """
        Initialize rate limiter.

        Args:
            default_requests_per_second: Default requests per second limit (uses config if not specified)
            burst_limit: Maximum burst requests allowed (uses config if not specified)
            window_size: Time window in seconds for rate limiting (uses config if not specified)
        """
        # Get configuration
        config = get_scraper_config()

        # Use provided values or fall back to config
        self.default_rps = default_requests_per_second or config.db_rate_limit_default_rps
        self.burst_limit = burst_limit or config.db_rate_limit_burst
        self.window_size = window_size or config.db_rate_limit_window

        # Per-operation tracking with configurable limits from config
        self.operation_limits = {
            'select': config.db_rate_limit_select_rps,      # Read operations - higher limit
            'insert': config.db_rate_limit_insert_rps,      # Write operations - lower limit
            'update': config.db_rate_limit_update_rps,      # Update operations - lower limit
            'upsert': config.db_rate_limit_upsert_rps,      # Upsert operations - lowest limit (most expensive)
            'delete': config.db_rate_limit_delete_rps       # Delete operations - very low limit
        }
        
        # Request tracking per operation type
        self.request_times: Dict[str, deque] = defaultdict(lambda: deque())
        self.request_counts: Dict[str, int] = defaultdict(int)
        
        # Global rate limiting
        self.global_semaphore = asyncio.Semaphore(self.burst_limit)
        
        # Statistics
        self.stats = {
            'total_requests': 0,
            'throttled_requests': 0,
            'by_operation': defaultdict(lambda: {'requests': 0, 'throttled': 0})
        }
        
    async def acquire(self, operation_type: str = 'default') -> bool:
        """
        Acquire permission to make a database request.
        
        Args:
            operation_type: Type of operation ('select', 'insert', 'update', 'upsert', 'delete')
            
        Returns:
            True when permission granted (always returns True after waiting)
        """
        operation_type = operation_type.lower()
        limit = self.operation_limits.get(operation_type, self.default_rps)
        
        # Update statistics
        self.stats['total_requests'] += 1
        self.stats['by_operation'][operation_type]['requests'] += 1
        
        # Clean old entries from sliding window
        current_time = time.time()
        self._cleanup_old_requests(operation_type, current_time)
        
        # Check if we're within rate limit
        recent_requests = len(self.request_times[operation_type])
        time_window = min(self.window_size, current_time - self.request_times[operation_type][0] if self.request_times[operation_type] else 0)
        
        if time_window > 0:
            current_rate = recent_requests / time_window
        else:
            current_rate = 0
            
        # If we're over the rate limit, wait
        if current_rate >= limit:
            # Calculate wait time
            wait_time = (recent_requests / limit) - time_window
            wait_time = max(0.1, min(wait_time, 5.0))  # Wait between 0.1 and 5 seconds
            
            logger.debug(f"🐌 Rate limiting {operation_type}: {current_rate:.1f}/{limit} rps, waiting {wait_time:.2f}s")
            
            # Update throttle statistics
            self.stats['throttled_requests'] += 1
            self.stats['by_operation'][operation_type]['throttled'] += 1
            
            await asyncio.sleep(wait_time)
        
        # Use global semaphore to prevent burst overloads
        await self.global_semaphore.acquire()
        
        # Record this request
        self.request_times[operation_type].append(current_time)
        self.request_counts[operation_type] += 1
        
        return True
    
    def release(self):
        """Release the global semaphore"""
        try:
            self.global_semaphore.release()
        except ValueError:
            # Already released, ignore
            pass
    
    def _cleanup_old_requests(self, operation_type: str, current_time: float):
        """Remove requests older than the window size"""
        cutoff_time = current_time - self.window_size
        
        while (self.request_times[operation_type] and 
               self.request_times[operation_type][0] < cutoff_time):
            self.request_times[operation_type].popleft()
    
    async def execute_with_rate_limit(self, operation_type: str, operation_func: Callable, *args, **kwargs) -> Any:
        """
        Execute a database operation with rate limiting.

        Args:
            operation_type: Type of operation for rate limiting
            operation_func: Function to execute (can be sync or async)
            *args, **kwargs: Arguments for the function

        Returns:
            Result of the operation function
        """
        await self.acquire(operation_type)
        try:
            start_time = time.time()

            # Check if the function is async and await it if necessary
            if inspect.iscoroutinefunction(operation_func):
                result = await operation_func(*args, **kwargs)
            else:
                result = operation_func(*args, **kwargs)

            # Record success metrics
            execution_time = time.time() - start_time
            logger.debug(f"✅ {operation_type} completed in {execution_time:.3f}s")

            return result
        finally:
            self.release()
    
    def get_stats(self) -> Dict[str, Any]:
        """Get rate limiting statistics"""
        total_reqs = self.stats['total_requests']
        throttled_reqs = self.stats['throttled_requests']
        throttle_rate = (throttled_reqs / total_reqs * 100) if total_reqs > 0 else 0
        
        stats = {
            'total_requests': total_reqs,
            'throttled_requests': throttled_reqs,
            'throttle_rate_percent': round(throttle_rate, 2),
            'current_rates': {},
            'operation_stats': dict(self.stats['by_operation'])
        }
        
        # Calculate current rates
        current_time = time.time()
        for op_type, times in self.request_times.items():
            if times:
                # Clean up old entries using existing method
                self._cleanup_old_requests(op_type, current_time)
                # Now calculate rate from cleaned deque
                if self.request_times[op_type]:
                    recent_count = len(self.request_times[op_type])
                    time_span = min(self.window_size, current_time - self.request_times[op_type][0])
                    if time_span > 0:
                        rate = recent_count / time_span
                        stats['current_rates'][op_type] = round(rate, 2)
        
        return stats
    
    def reset_stats(self):
        """Reset rate limiting statistics"""
        self.stats = {
            'total_requests': 0,
            'throttled_requests': 0,
            'by_operation': defaultdict(lambda: {'requests': 0, 'throttled': 0})
        }


# Global rate limiter instance
_rate_limiter = DatabaseRateLimiter()

def get_rate_limiter() -> DatabaseRateLimiter:
    """Get the global database rate limiter instance"""
    return _rate_limiter

async def rate_limited_db_operation(operation_type: str, operation_func, *args, **kwargs):
    """
    Execute a database operation with rate limiting.
    Convenience function for easy use throughout the application.
    """
    return await _rate_limiter.execute_with_rate_limit(operation_type, operation_func, *args, **kwargs)
