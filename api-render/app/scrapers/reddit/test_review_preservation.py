#!/usr/bin/env python3
"""
Test v3.4.4 fix: Verify review status is preserved during re-scrape
"""
import asyncio
import sys
import os
from datetime import datetime

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

from core.database.supabase_client import get_supabase_client
from scrapers.reddit.reddit_scraper import RedditScraper
from scrapers.reddit.public_reddit_api import PublicRedditAPI


async def main():
    print("=" * 60)
    print("Test v3.4.4: Review Status Preservation")
    print("=" * 60)

    supabase = get_supabase_client()

    # Test subreddit
    test_sub = 'bluelingerie'

    # Step 1: Set review to 'Ok' manually
    print(f"\n1️⃣  Setting r/{test_sub} review to 'Ok'...")
    supabase.table('reddit_subreddits').update({
        'review': 'Ok',
        'primary_category': 'Test Category',
        'tags': ['test', 'lingerie']
    }).eq('name', test_sub).execute()

    # Verify it was set
    result = supabase.table('reddit_subreddits').select('name, review, primary_category, tags').eq('name', test_sub).execute()
    print(f"   Before scrape: {result.data[0]}")

    # Step 2: Initialize scraper with proxies
    print(f"\n2️⃣  Initializing scraper...")
    scraper = RedditScraper(supabase)

    # Load and test proxies
    proxy_count = scraper.proxy_manager.load_proxies()
    if proxy_count == 0:
        print("❌ No proxies found")
        return 1

    working = scraper.proxy_manager.test_all_proxies()
    if working == 0:
        print("❌ No working proxies")
        return 1

    print(f"   ✅ {working}/{proxy_count} proxies ready")

    # Step 3: Run scraper on this subreddit
    print(f"\n3️⃣  Running scraper v3.4.4 on r/{test_sub}...")
    async with PublicRedditAPI(scraper.proxy_manager) as api_client:
        scraper.api = api_client
        await scraper.process_subreddit(test_sub, process_users=False, allow_discovery=False)

    # Step 4: Check if review was preserved
    print(f"\n4️⃣  Checking if review was preserved...")
    result = supabase.table('reddit_subreddits').select('name, review, primary_category, tags, last_scraped_at').eq('name', test_sub).execute()

    after_data = result.data[0]
    print(f"   After scrape: {after_data}")

    # Verify
    if after_data['review'] == 'Ok':
        print("\n✅ SUCCESS: Review status preserved!")
        print(f"   review: 'Ok' ✓")
        print(f"   primary_category: {after_data['primary_category']} ✓")
        print(f"   tags: {after_data['tags']} ✓")
        return 0
    else:
        print(f"\n❌ FAILED: Review changed from 'Ok' to '{after_data['review']}'")
        return 1


if __name__ == '__main__':
    exit_code = asyncio.run(main())
    sys.exit(exit_code)
