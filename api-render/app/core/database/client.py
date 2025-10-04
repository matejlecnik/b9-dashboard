"""
Supabase Client Singleton
Thread-safe, lazy-initialized Supabase client for the entire application
"""

import os
from functools import lru_cache
from typing import Optional
from supabase import create_client, Client


@lru_cache(maxsize=1)
def get_supabase_client() -> Client:
    """
    Get singleton Supabase client

    This function uses @lru_cache to ensure only ONE Supabase client
    is created for the entire application lifecycle.

    Thread-safe: lru_cache handles thread safety automatically
    Lazy initialization: Client created only on first call

    Returns:
        Client: Supabase client instance

    Raises:
        ValueError: If Supabase credentials not configured

    Usage:
        from app.core.database.client import get_supabase_client

        # In route handlers:
        db = get_supabase_client()
        result = db.table('users').select('*').execute()

        # With FastAPI dependency injection:
        from fastapi import Depends

        @router.get("/endpoint")
        async def endpoint(db: Client = Depends(get_supabase_client)):
            result = db.table('users').select('*').execute()
    """
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

    if not url or not key:
        raise ValueError(
            "Supabase credentials not configured. "
            "Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables."
        )

    return create_client(url, key)


def get_supabase_client_optional() -> Optional[Client]:
    """
    Get Supabase client or None if not configured

    Use this when Supabase is optional (e.g., in logging)

    Returns:
        Optional[Client]: Supabase client or None
    """
    try:
        return get_supabase_client()
    except ValueError:
        return None


# Backward compatibility alias
def get_db() -> Client:
    """Alias for FastAPI dependency injection"""
    return get_supabase_client()
