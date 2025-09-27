#!/usr/bin/env python3
"""Test script to verify imports work correctly"""
import sys
import os

print("Testing imports...")

try:
    from api.core.clients.api_pool import ThreadSafeAPIPool
    print("✓ Imported ThreadSafeAPIPool")
except ImportError as e:
    print(f"✗ Failed to import ThreadSafeAPIPool: {e}")

try:
    from api.core.config.proxy_manager import ProxyManager
    print("✓ Imported ProxyManager")
except ImportError as e:
    print(f"✗ Failed to import ProxyManager: {e}")

try:
    from api.core.utils.supabase_logger import SupabaseLogHandler
    print("✓ Imported SupabaseLogHandler")
except ImportError as e:
    print(f"✗ Failed to import SupabaseLogHandler: {e}")

try:
    from api.scrapers.reddit.main import RedditScraperV2
    print("✓ Imported RedditScraperV2")
except ImportError as e:
    print(f"✗ Failed to import RedditScraperV2: {e}")

print("\nAll imports successful!" if all else "Some imports failed.")