#!/usr/bin/env python3
"""
B9 Dashboard API - Rate Limiter (No-op version)
Redis rate limiting has been disabled. This is a no-op implementation.
"""

import logging
from functools import wraps
from typing import Optional

logger = logging.getLogger(__name__)

class RateLimiter:
    """
    No-op rate limiter - rate limiting disabled
    All methods return immediately without enforcing any limits.
    """

    def __init__(self):
        self.is_connected = False

    async def initialize(self) -> bool:
        """Initialization always succeeds"""
        logger.info("Rate limiter initialized (no-op mode - rate limiting disabled)")
        return True

    async def check_rate_limit(self, key: str, max_requests: int, time_window: int) -> tuple[bool, Optional[int]]:
        """Always allows the request"""
        return True, None

    async def close(self):
        """Cleanup - nothing to do"""
        pass


def rate_limit(max_requests: int = 100, time_window: int = 60):
    """
    No-op rate limit decorator - does not enforce any limits

    Args:
        max_requests: Ignored
        time_window: Ignored
    """
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Just call the function without any rate limiting
            return await func(*args, **kwargs)
        return wrapper
    return decorator


# Global rate limiter instance
rate_limiter = RateLimiter()