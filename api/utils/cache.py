#!/usr/bin/env python3
"""
B9 Dashboard API - Redis Caching Utilities
Optimized caching for Render deployment with Redis
"""

import os
import json
import hashlib
from typing import Any, Optional, Dict
import redis.asyncio as redis
from redis.exceptions import RedisError
import logging

logger = logging.getLogger(__name__)

class CacheManager:
    """
    Async Redis cache manager for B9 Dashboard API
    Provides intelligent caching with automatic serialization and TTL management
    """
    
    def __init__(self):
        self.redis_client = None
        self.default_ttl = int(os.getenv('CACHE_TTL', 300))  # 5 minutes default
        self.cache_prefix = "b9_api:"
        self.is_connected = False
        
    async def initialize(self) -> bool:
        """Initialize Redis connection"""
        try:
            redis_url = os.getenv('REDIS_URL', 'redis://localhost:6379')
            
            self.redis_client = redis.from_url(
                redis_url,
                encoding="utf-8",
                decode_responses=True,
                socket_connect_timeout=5,
                socket_timeout=5,
                retry_on_timeout=True,
                health_check_interval=30
            )
            
            # Test connection
            await self.redis_client.ping()
            self.is_connected = True
            logger.info("✅ Redis cache initialized successfully")
            return True
            
        except (RedisError, ConnectionError) as e:
            logger.warning(f"⚠️  Redis cache unavailable: {e}")
            self.is_connected = False
            return False
        except Exception as e:
            logger.error(f"❌ Failed to initialize cache: {e}")
            self.is_connected = False
            return False
    
    def _generate_key(self, key: str, namespace: str = "default") -> str:
        """Generate a standardized cache key"""
        return f"{self.cache_prefix}{namespace}:{key}"
    
    def _serialize_value(self, value: Any) -> str:
        """Serialize value for Redis storage"""
        try:
            if isinstance(value, (dict, list, tuple)):
                return json.dumps(value, ensure_ascii=False, separators=(',', ':'))
            elif isinstance(value, (int, float, bool)):
                return str(value)
            elif isinstance(value, str):
                return value
            else:
                # For complex objects, try JSON serialization
                return json.dumps(value, default=str, ensure_ascii=False)
        except Exception as e:
            logger.warning(f"Failed to serialize value: {e}")
            return str(value)
    
    def _deserialize_value(self, value: str) -> Any:
        """Deserialize value from Redis"""
        try:
            # Try JSON first (most common case)
            return json.loads(value)
        except json.JSONDecodeError:
            # Return as string if not JSON
            return value
        except Exception as e:
            logger.warning(f"Failed to deserialize value: {e}")
            return value
    
    async def get(self, key: str, namespace: str = "default") -> Optional[Any]:
        """Get value from cache"""
        if not self.is_connected or not self.redis_client:
            return None
            
        try:
            cache_key = self._generate_key(key, namespace)
            value = await self.redis_client.get(cache_key)
            
            if value is not None:
                logger.debug(f"Cache HIT: {cache_key}")
                return self._deserialize_value(value)
            
            logger.debug(f"Cache MISS: {cache_key}")
            return None
            
        except RedisError as e:
            logger.warning(f"Redis get error: {e}")
            return None
    
    async def set(self, key: str, value: Any, ttl: Optional[int] = None, namespace: str = "default") -> bool:
        """Set value in cache with TTL"""
        if not self.is_connected or not self.redis_client:
            return False
            
        try:
            cache_key = self._generate_key(key, namespace)
            serialized_value = self._serialize_value(value)
            ttl = ttl or self.default_ttl
            
            success = await self.redis_client.setex(cache_key, ttl, serialized_value)
            
            if success:
                logger.debug(f"Cache SET: {cache_key} (TTL: {ttl}s)")
            
            return bool(success)
            
        except RedisError as e:
            logger.warning(f"Redis set error: {e}")
            return False
    
    async def delete(self, key: str, namespace: str = "default") -> bool:
        """Delete key from cache"""
        if not self.is_connected or not self.redis_client:
            return False
            
        try:
            cache_key = self._generate_key(key, namespace)
            deleted = await self.redis_client.delete(cache_key)
            
            if deleted:
                logger.debug(f"Cache DELETE: {cache_key}")
            
            return bool(deleted)
            
        except RedisError as e:
            logger.warning(f"Redis delete error: {e}")
            return False
    
    async def exists(self, key: str, namespace: str = "default") -> bool:
        """Check if key exists in cache"""
        if not self.is_connected or not self.redis_client:
            return False
            
        try:
            cache_key = self._generate_key(key, namespace)
            exists = await self.redis_client.exists(cache_key)
            return bool(exists)
            
        except RedisError as e:
            logger.warning(f"Redis exists error: {e}")
            return False
    
    async def increment(self, key: str, amount: int = 1, namespace: str = "counters") -> Optional[int]:
        """Increment counter in cache"""
        if not self.is_connected or not self.redis_client:
            return None
            
        try:
            cache_key = self._generate_key(key, namespace)
            new_value = await self.redis_client.incrby(cache_key, amount)
            
            # Set expiry if it's a new key
            if new_value == amount:
                await self.redis_client.expire(cache_key, self.default_ttl)
            
            return new_value
            
        except RedisError as e:
            logger.warning(f"Redis increment error: {e}")
            return None
    
    async def get_stats(self) -> Dict[str, Any]:
        """Get cache statistics"""
        stats = {
            "connected": self.is_connected,
            "default_ttl": self.default_ttl,
            "prefix": self.cache_prefix
        }
        
        if self.is_connected and self.redis_client:
            try:
                info = await self.redis_client.info()
                stats.update({
                    "memory_used": info.get("used_memory_human", "unknown"),
                    "connected_clients": info.get("connected_clients", 0),
                    "total_commands_processed": info.get("total_commands_processed", 0),
                    "keyspace_hits": info.get("keyspace_hits", 0),
                    "keyspace_misses": info.get("keyspace_misses", 0),
                })
                
                # Calculate hit rate
                hits = stats.get("keyspace_hits", 0)
                misses = stats.get("keyspace_misses", 0)
                total = hits + misses
                stats["hit_rate"] = round((hits / total) * 100, 2) if total > 0 else 0
                
            except RedisError as e:
                logger.warning(f"Failed to get cache stats: {e}")
        
        return stats
    
    async def clear_namespace(self, namespace: str) -> int:
        """Clear all keys in a namespace"""
        if not self.is_connected or not self.redis_client:
            return 0
            
        try:
            pattern = f"{self.cache_prefix}{namespace}:*"
            keys = await self.redis_client.keys(pattern)
            
            if keys:
                deleted = await self.redis_client.delete(*keys)
                logger.info(f"Cleared {deleted} keys from namespace '{namespace}'")
                return deleted
            
            return 0
            
        except RedisError as e:
            logger.warning(f"Redis clear namespace error: {e}")
            return 0
    
    async def close(self):
        """Close Redis connection"""
        if self.redis_client:
            try:
                await self.redis_client.close()
                logger.info("Redis connection closed")
            except Exception as e:
                logger.warning(f"Error closing Redis connection: {e}")
            finally:
                self.is_connected = False

def cache_key_from_request(request, additional_keys: list = None) -> str:
    """Generate cache key from request parameters"""
    key_parts = [
        request.url.path,
        str(sorted(request.query_params.items())) if request.query_params else ""
    ]
    
    if additional_keys:
        key_parts.extend(additional_keys)
    
    key_string = "|".join(key_parts)
    
    # Hash long keys to avoid Redis key length issues
    if len(key_string) > 200:
        return hashlib.md5(key_string.encode()).hexdigest()
    
    return key_string.replace(" ", "_").replace(":", "_")

# Global cache manager instance
cache_manager = CacheManager()

async def get_cache() -> CacheManager:
    """Dependency injection for cache manager"""
    return cache_manager

# Cache decorator for functions
def cached(ttl: int = 300, namespace: str = "default", key_func=None):
    """
    Cache decorator for async functions
    
    Args:
        ttl: Time to live in seconds
        namespace: Cache namespace
        key_func: Function to generate cache key from args
    """
    def decorator(func):
        async def wrapper(*args, **kwargs):
            if not cache_manager.is_connected:
                return await func(*args, **kwargs)
            
            # Generate cache key
            if key_func:
                cache_key = key_func(*args, **kwargs)
            else:
                # Default key generation from function name and args
                key_parts = [func.__name__]
                key_parts.extend(str(arg) for arg in args)
                key_parts.extend(f"{k}={v}" for k, v in kwargs.items())
                cache_key = "_".join(key_parts)
            
            # Try to get from cache
            cached_result = await cache_manager.get(cache_key, namespace)
            if cached_result is not None:
                return cached_result
            
            # Execute function and cache result
            result = await func(*args, **kwargs)
            await cache_manager.set(cache_key, result, ttl, namespace)
            
            return result
        
        return wrapper
    return decorator