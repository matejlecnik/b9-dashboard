#!/usr/bin/env python3
"""
B9 Dashboard API - Cache Manager (No-op version)
Redis caching has been disabled. This is a no-op implementation.
"""

import logging

logger = logging.getLogger(__name__)

class CacheManager:
    """
    No-op cache manager - caching disabled
    All methods return immediately without doing anything.
    """

    def __init__(self):
        self.is_connected = False

    async def initialize(self) -> bool:
        """Initialization always succeeds"""
        logger.info("Cache manager initialized (no-op mode - caching disabled)")
        return True

    async def get(self, key: str):
        """Always returns None (cache miss)"""
        return None

    async def set(self, key: str, value, ttl=None) -> bool:
        """Always returns success without storing anything"""
        return True

    async def delete(self, key: str) -> bool:
        """Always returns success without deleting anything"""
        return True

    async def exists(self, key: str) -> bool:
        """Always returns False (key doesn't exist)"""
        return False

    async def clear_pattern(self, pattern: str) -> int:
        """Always returns 0 (no keys cleared)"""
        return 0

    async def get_ttl(self, key: str) -> int:
        """Always returns -2 (key doesn't exist)"""
        return -2

    async def close(self):
        """Cleanup - nothing to do"""
        pass

# Global cache manager instance
cache_manager = CacheManager()