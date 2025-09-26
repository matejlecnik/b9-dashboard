#!/usr/bin/env python3
"""Test script to verify imports work correctly"""
import sys
import os

# Add current directory to path first
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

print("Testing imports...")

try:
    from clients.api_pool import ThreadSafeAPIPool
    print("✓ Imported ThreadSafeAPIPool")
except ImportError as e:
    print(f"✗ Failed to import ThreadSafeAPIPool: {e}")

try:
    from config.proxy_manager import ProxyManager
    print("✓ Imported ProxyManager")
except ImportError as e:
    print(f"✗ Failed to import ProxyManager: {e}")

try:
    from utils.supabase_logger import SupabaseLogHandler
    print("✓ Imported SupabaseLogHandler")
except ImportError as e:
    print(f"✗ Failed to import SupabaseLogHandler: {e}")

try:
    from reddit_scraper_v2 import RedditScraperV2
    print("✓ Imported RedditScraperV2")
except ImportError as e:
    print(f"✗ Failed to import RedditScraperV2: {e}")

print("\nAll imports successful!" if all else "Some imports failed.")