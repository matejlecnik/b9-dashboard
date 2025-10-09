"""
Core Database Components
Centralized database connection management

IMPORTANT: This module now uses a SINGLE singleton pattern via @lru_cache in client.py
All functions point to the same Supabase client instance for optimal connection pooling.
"""

# Primary singleton implementation (uses @lru_cache)
from .client import get_supabase_client as get_db
from .client import get_supabase_client_optional


# Legacy compatibility - all functions now point to the same singleton
get_supabase_client = get_db  # Alias for backward compatibility

# Legacy imports from supabase_client.py (kept for compatibility, but use singleton internally)
from .supabase_client import (  # noqa: E402
    ConnectionHealthMonitor,
    SupabaseClientManager,
    close_supabase_client,
    get_circuit_breaker,
    get_supabase_connection_info,
    refresh_supabase_client,
)


__all__ = [
    "ConnectionHealthMonitor",
    "SupabaseClientManager",
    "close_supabase_client",
    "get_circuit_breaker",
    "get_db",  # Primary - use this for new code
    "get_supabase_client",  # Alias to get_db for backward compatibility
    "get_supabase_client_optional",
    "get_supabase_connection_info",
    "refresh_supabase_client",
]
