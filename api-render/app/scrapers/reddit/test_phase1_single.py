#!/usr/bin/env python3
"""Phase 1 Test - Single subreddit processing with timing metrics"""
import asyncio
import sys
import os
import time
from datetime import datetime
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Setup path
current_dir = os.path.dirname(os.path.abspath(__file__))
api_root = os.path.join(current_dir, "..", "..")
sys.path.insert(0, api_root)

from core.database.supabase_client import get_supabase_client

async def test_single_subreddit():
    """Test v3.3.0 with 1 subreddit"""
    print("=" * 60)
    print("Phase 1 Test - Reddit Scraper v3.3.0 (Username-Only)")
    print("=" * 60)

    # Target subreddit (small, low traffic)
    TEST_SUBREDDIT = "nikeproporn"

    # Initialize
    supabase = get_supabase_client()

    # Import scraper
    from reddit_scraper import RedditScraper

    scraper = RedditScraper(supabase)

    # Override to test only 1 subreddit
    print(f"\n📋 Test Target: r/{TEST_SUBREDDIT}")
    print("-" * 60)

    # Initialize proxy manager
    proxy_count = scraper.proxy_manager.load_proxies()
    if proxy_count == 0:
        print("❌ No proxies found")
        return

    working = scraper.proxy_manager.test_all_proxies()
    if working == 0:
        print("❌ No working proxies")
        return

    print(f"✅ {working}/{proxy_count} proxies ready")

    # Initialize API with async context
    from public_reddit_api import PublicRedditAPI

    # Time the operation
    start_time = time.time()

    async with PublicRedditAPI(scraper.proxy_manager) as api_client:
        scraper.api = api_client

        # Get proxy
        proxy = scraper.proxy_manager.get_next_proxy()

        # Process subreddit
        await scraper.process_subreddit(TEST_SUBREDDIT, process_users=True, allow_discovery=False)

    elapsed = time.time() - start_time

    # Results
    print("-" * 60)
    print(f"✅ Test Complete")
    print(f"⏱️  Total Time: {elapsed:.2f}s")
    print(f"🎯 Expected: <30s (v3.3.0 username-only), was 8-15s (v3.2.0)")

    if elapsed < 30:
        print("✅ PASS - Fast username-only processing!")
    elif elapsed < 60:
        print("⚠️  PARTIAL - Slower than expected but functional")
    else:
        print("❌ FAIL - Too slow, investigate")

    return elapsed

if __name__ == "__main__":
    try:
        result = asyncio.run(test_single_subreddit())
    except KeyboardInterrupt:
        print("\n🛑 Test interrupted")
    except Exception as e:
        print(f"\n❌ Test failed: {e}")
        import traceback
        traceback.print_exc()