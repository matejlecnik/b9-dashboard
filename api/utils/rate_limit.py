#!/usr/bin/env python3
"""
B9 Dashboard API - Rate Limiting Utilities
Intelligent rate limiting with Redis backend for Render deployment
"""

import os
import time
import hashlib
from typing import Dict, Optional, Tuple
from functools import wraps
import redis.asyncio as redis
from redis.exceptions import RedisError
from fastapi import HTTPException, Request
import logging

logger = logging.getLogger(__name__)

class RateLimiter:
    """
    Redis-backed rate limiter with sliding window and burst protection
    """
    
    def __init__(self):
        self.redis_client = None
        self.is_enabled = os.getenv('ENABLE_RATE_LIMITING', 'true').lower() == 'true'
        self.key_prefix = "rate_limit:"
        self.is_connected = False
        
        # Default rate limit configurations
        self.default_limits = {
            'global': {'requests': 1000, 'window': 3600},  # 1000 requests per hour
            'api': {'requests': 100, 'window': 300},        # 100 requests per 5 minutes
            'auth': {'requests': 10, 'window': 300},        # 10 auth attempts per 5 minutes
            'ai': {'requests': 50, 'window': 3600},         # 50 AI requests per hour
            'scraper': {'requests': 200, 'window': 3600},   # 200 scraper requests per hour
        }
    
    async def initialize(self) -> bool:
        """Initialize Redis connection for rate limiting"""
        if not self.is_enabled:
            logger.info("Rate limiting disabled")
            return True
            
        try:
            redis_url = os.getenv('REDIS_URL', 'redis://localhost:6379')
            
            self.redis_client = redis.from_url(
                redis_url,
                encoding="utf-8",
                decode_responses=True,
                socket_connect_timeout=5,
                socket_timeout=5,
                retry_on_timeout=True
            )
            
            await self.redis_client.ping()
            self.is_connected = True
            logger.info("✅ Rate limiter initialized successfully")
            return True
            
        except (RedisError, ConnectionError) as e:
            logger.warning(f"⚠️  Rate limiter Redis unavailable: {e}")
            self.is_connected = False
            return False
        except Exception as e:
            logger.error(f"❌ Failed to initialize rate limiter: {e}")
            self.is_connected = False
            return False
    
    def _generate_key(self, identifier: str, category: str = "default") -> str:
        """Generate rate limit key"""
        return f"{self.key_prefix}{category}:{identifier}"
    
    def _get_client_identifier(self, request: Request) -> str:
        """Get unique client identifier from request"""
        # Try to get real IP from headers (for reverse proxy setups)
        real_ip = (
            request.headers.get('X-Forwarded-For', '').split(',')[0].strip() or
            request.headers.get('X-Real-IP', '').strip() or
            request.client.host if request.client else 'unknown'
        )
        
        # Add user agent hash for additional uniqueness
        user_agent = request.headers.get('User-Agent', '')
        ua_hash = hashlib.md5(user_agent.encode()).hexdigest()[:8]
        
        return f"{real_ip}:{ua_hash}"
    
    async def check_rate_limit(
        self,
        identifier: str,
        category: str = "default",
        custom_limit: Optional[Dict] = None
    ) -> Tuple[bool, Dict]:
        """
        Check if request is within rate limit
        
        Returns:
            Tuple of (is_allowed, info_dict)
        """
        
        if not self.is_enabled or not self.is_connected:
            return True, {"status": "disabled"}
        
        # Get rate limit configuration
        limit_config = custom_limit or self.default_limits.get(category, self.default_limits['global'])
        max_requests = limit_config['requests']
        window_seconds = limit_config['window']
        
        try:
            current_time = int(time.time())
            window_start = current_time - window_seconds
            key = self._generate_key(identifier, category)
            
            # Use Redis pipeline for atomic operations
            pipe = self.redis_client.pipeline()
            
            # Remove expired entries
            pipe.zremrangebyscore(key, 0, window_start)
            
            # Count current requests in window
            pipe.zcard(key)
            
            # Add current request
            pipe.zadd(key, {str(current_time): current_time})
            
            # Set expiry
            pipe.expire(key, window_seconds + 60)  # Add buffer for cleanup
            
            results = await pipe.execute()
            current_count = results[1] + 1  # +1 for the request we just added
            
            # Calculate reset time
            reset_time = current_time + window_seconds
            remaining = max(0, max_requests - current_count)
            
            is_allowed = current_count <= max_requests
            
            rate_limit_info = {
                "allowed": is_allowed,
                "limit": max_requests,
                "remaining": remaining,
                "reset_time": reset_time,
                "window_seconds": window_seconds,
                "current_count": current_count,
                "category": category
            }
            
            if not is_allowed:
                logger.warning(f"Rate limit exceeded for {identifier} in category {category}: {current_count}/{max_requests}")
            
            return is_allowed, rate_limit_info
            
        except RedisError as e:
            logger.warning(f"Rate limit check failed: {e}")
            # Fail open - allow request if Redis is down
            return True, {"status": "redis_error", "error": str(e)}
    
    async def get_rate_limit_status(self, identifier: str, category: str = "default") -> Dict:
        """Get current rate limit status for identifier"""
        if not self.is_connected:
            return {"status": "unavailable"}
        
        try:
            limit_config = self.default_limits.get(category, self.default_limits['global'])
            window_seconds = limit_config['window']
            max_requests = limit_config['requests']
            
            current_time = int(time.time())
            window_start = current_time - window_seconds
            key = self._generate_key(identifier, category)
            
            # Count requests in current window
            count = await self.redis_client.zcount(key, window_start, current_time)
            
            remaining = max(0, max_requests - count)
            reset_time = current_time + window_seconds
            
            return {
                "limit": max_requests,
                "remaining": remaining,
                "reset_time": reset_time,
                "current_count": count,
                "window_seconds": window_seconds,
                "category": category
            }
            
        except RedisError as e:
            logger.warning(f"Failed to get rate limit status: {e}")
            return {"status": "error", "error": str(e)}
    
    async def clear_rate_limit(self, identifier: str, category: str = "default") -> bool:
        """Clear rate limit for specific identifier"""
        if not self.is_connected:
            return False
            
        try:
            key = self._generate_key(identifier, category)
            deleted = await self.redis_client.delete(key)
            
            if deleted:
                logger.info(f"Cleared rate limit for {identifier} in category {category}")
            
            return bool(deleted)
            
        except RedisError as e:
            logger.warning(f"Failed to clear rate limit: {e}")
            return False
    
    async def get_stats(self) -> Dict:
        """Get rate limiter statistics"""
        stats = {
            "enabled": self.is_enabled,
            "connected": self.is_connected,
            "reddit_categories": self.default_limits
        }
        
        if self.is_connected:
            try:
                # Get number of active rate limit keys
                keys_pattern = f"{self.key_prefix}*"
                keys = await self.redis_client.keys(keys_pattern)
                stats["active_rate_limits"] = len(keys)
                
                # Get memory usage for rate limiting
                memory_info = await self.redis_client.info("memory")
                stats["memory_usage"] = memory_info.get("used_memory_human", "unknown")
                
            except RedisError as e:
                logger.warning(f"Failed to get rate limiter stats: {e}")
                stats["error"] = str(e)
        
        return stats
    
    async def close(self):
        """Close Redis connection"""
        if self.redis_client:
            try:
                await self.redis_client.close()
                logger.info("Rate limiter Redis connection closed")
            except Exception as e:
                logger.warning(f"Error closing rate limiter Redis connection: {e}")
            finally:
                self.is_connected = False

# Global rate limiter instance
rate_limiter = RateLimiter()

def rate_limit(category: str = "default", custom_limit: Optional[Dict] = None):
    """
    Rate limiting decorator for FastAPI endpoints
    
    Args:
        category: Rate limit category (e.g., 'api', 'auth', 'ai')
        custom_limit: Custom rate limit configuration
    """
    def decorator(func):
        @wraps(func)
        async def wrapper(request: Request, *args, **kwargs):
            if not rate_limiter.is_enabled:
                return await func(request, *args, **kwargs)
            
            identifier = rate_limiter._get_client_identifier(request)
            
            is_allowed, info = await rate_limiter.check_rate_limit(
                identifier, category, custom_limit
            )
            
            if not is_allowed:
                raise HTTPException(
                    status_code=429,
                    detail={
                        "error": "Rate limit exceeded",
                        "limit": info.get("limit"),
                        "remaining": info.get("remaining"),
                        "reset_time": info.get("reset_time"),
                        "retry_after": info.get("window_seconds")
                    },
                    headers={
                        "X-RateLimit-Limit": str(info.get("limit", "")),
                        "X-RateLimit-Remaining": str(info.get("remaining", "")),
                        "X-RateLimit-Reset": str(info.get("reset_time", "")),
                        "Retry-After": str(info.get("window_seconds", ""))
                    }
                )
            
            # Add rate limit headers to response
            response = await func(request, *args, **kwargs)
            
            if hasattr(response, 'headers') and info.get("allowed"):
                response.headers["X-RateLimit-Limit"] = str(info.get("limit", ""))
                response.headers["X-RateLimit-Remaining"] = str(info.get("remaining", ""))
                response.headers["X-RateLimit-Reset"] = str(info.get("reset_time", ""))
            
            return response
        
        return wrapper
    return decorator

async def check_request_rate_limit(
    request: Request, 
    category: str = "default",
    custom_limit: Optional[Dict] = None
) -> Dict:
    """
    Standalone rate limit check for use in middleware or endpoints
    """
    if not rate_limiter.is_enabled:
        return {"allowed": True, "status": "disabled"}
    
    identifier = rate_limiter._get_client_identifier(request)
    is_allowed, info = await rate_limiter.check_rate_limit(identifier, category, custom_limit)
    
    return {**info, "identifier": identifier}