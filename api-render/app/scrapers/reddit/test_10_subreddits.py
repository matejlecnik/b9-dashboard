#!/usr/bin/env python3
"""Test v3.4.4 with 10 subreddits - Enhanced with insert/update tracking"""
import asyncio
import sys
import os
import time
from datetime import datetime, timezone
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Setup path
current_dir = os.path.dirname(os.path.abspath(__file__))
api_root = os.path.join(current_dir, "..", "..")
sys.path.insert(0, api_root)

from core.database.supabase_client import get_supabase_client

async def test_10_subreddits():
    """Test v3.4.4 with 1 subreddit - Fast discovery test"""
    print("=" * 60)
    print("Test - Reddit Scraper v3.4.4 - Single Subreddit Discovery")
    print("=" * 60)

    # Initialize
    supabase = get_supabase_client()

    # Get 1 biggest 'Ok' subreddit for testing
    response = supabase.table('reddit_subreddits').select('name, subscribers').eq('review', 'Ok').order('subscribers', desc=True).limit(1).execute()

    test_subreddits = [row['name'] for row in response.data]

    print(f"\n📋 Test Targets: {len(test_subreddits)} subreddits")
    for i, name in enumerate(test_subreddits, 1):
        print(f"   {i}. r/{name}")
    print("-" * 60)

    # Import scraper
    from reddit_scraper import RedditScraper
    from public_reddit_api import PublicRedditAPI

    scraper = RedditScraper(supabase)

    # Initialize proxy manager
    proxy_count = scraper.proxy_manager.load_proxies()
    if proxy_count == 0:
        print("❌ No proxies found")
        return

    working = scraper.proxy_manager.test_all_proxies()
    if working == 0:
        print("❌ No working proxies")
        return

    print(f"✅ {working}/{proxy_count} proxies ready\n")

    # Get baseline counts before processing
    print("📊 Baseline Counts:")
    posts_before = supabase.table('reddit_posts').select('reddit_id', count='exact').execute().count
    users_before = supabase.table('reddit_users').select('username', count='exact').execute().count
    subs_before = supabase.table('reddit_subreddits').select('name', count='exact').execute().count
    print(f"   Posts: {posts_before:,}")
    print(f"   Users: {users_before:,}")
    print(f"   Subreddits: {subs_before:,}")
    print("-" * 60)

    # Time the operation
    start_time = time.time()

    # Track overall activity
    overall_stats = {
        'posts_new': 0,
        'posts_processed': 0,
        'users_new': 0,
        'users_seen': set(),  # Track unique usernames across all subreddits
        'subreddits_processed': 0
    }

    async with PublicRedditAPI(scraper.proxy_manager) as api_client:
        scraper.api = api_client

        # Load skip caches for proper discovery filtering
        print("📦 Loading skip caches (Ok, No Seller, Banned, etc.)...")
        await scraper.load_skip_caches()

        # Track discovered subreddits
        all_discoveries = set()

        # Process each subreddit sequentially
        for i, subreddit in enumerate(test_subreddits, 1):
            sub_start = time.time()
            print(f"\n[{i}/{len(test_subreddits)}] Processing r/{subreddit}...")

            try:
                # Capture timestamp before processing
                scrape_start_time = datetime.now(timezone.utc)

                # BEFORE: Get existing posts for this subreddit
                existing_posts_resp = supabase.table('reddit_posts').select('reddit_id').eq('subreddit_name', subreddit).execute()
                existing_post_ids = set(row['reddit_id'] for row in existing_posts_resp.data)

                # Process subreddit
                discoveries = await scraper.process_subreddit(subreddit, process_users=True, allow_discovery=True)
                all_discoveries.update(discoveries)

                # AFTER: Get posts scraped in THIS run (scraped_at >= scrape_start_time)
                scraped_posts_resp = supabase.table('reddit_posts').select('reddit_id, author_username').eq('subreddit_name', subreddit).gte('scraped_at', scrape_start_time.isoformat()).execute()
                scraped_post_ids = set(row['reddit_id'] for row in scraped_posts_resp.data)

                # Get users updated in THIS run (last_scraped_at >= scrape_start_time)
                scraped_users_resp = supabase.table('reddit_users').select('username').gte('last_scraped_at', scrape_start_time.isoformat()).execute()
                scraped_usernames = set(row['username'] for row in scraped_users_resp.data)

                # Calculate metrics
                posts_scraped_this_run = len(scraped_post_ids)
                posts_new = len(scraped_post_ids - existing_post_ids)
                posts_updated = posts_scraped_this_run - posts_new

                # Aggregate
                overall_stats['posts_new'] += posts_new
                overall_stats['posts_processed'] += posts_scraped_this_run
                overall_stats['users_seen'].update(scraped_usernames)
                overall_stats['subreddits_processed'] += 1

                sub_elapsed = time.time() - sub_start
                print(f"    ✅ r/{subreddit} complete in {sub_elapsed:.2f}s")
                print(f"       Posts: {posts_scraped_this_run} scraped ({posts_new} new, {posts_updated} updated) | Users: {len(scraped_usernames)} | Discoveries: {len(discoveries)}")

            except Exception as e:
                print(f"    ❌ r/{subreddit} failed: {e}")
                import traceback
                traceback.print_exc()

    elapsed = time.time() - start_time

    # Get final counts after processing
    posts_after = supabase.table('reddit_posts').select('reddit_id', count='exact').execute().count
    users_after = supabase.table('reddit_users').select('username', count='exact').execute().count
    subs_after = supabase.table('reddit_subreddits').select('name', count='exact').execute().count

    # Calculate changes
    posts_new_in_db = posts_after - posts_before
    users_new_in_db = users_after - users_before
    subs_new_in_db = subs_after - subs_before

    # Calculate totals
    users_total_processed = len(overall_stats['users_seen'])

    # Results
    print("\n" + "=" * 60)
    print(f"✅ Test Complete")
    print(f"⏱️  Total Time: {elapsed:.2f}s ({elapsed/60:.1f} min)")
    print(f"📊 Avg per subreddit: {elapsed/len(test_subreddits):.2f}s")
    print(f"🎯 Expected: ~85s (8.5s × 10 subreddits = 1.4 min)")

    # Calculate totals from accumulated stats
    posts_updated = overall_stats['posts_processed'] - overall_stats['posts_new']

    print("\n📈 Scraper Activity:")
    print(f"   Posts:      {overall_stats['posts_processed']:,} scraped → {overall_stats['posts_new']:,} new, {posts_updated:,} updated")
    print(f"   Users:      {users_total_processed:,} processed")
    print(f"   Subreddits: {overall_stats['subreddits_processed']:,} processed")
    print(f"   Discoveries: {len(all_discoveries):,} new subreddits discovered")

    print("\n📊 Database Impact:")
    print(f"   Posts in DB:      {posts_before:,} → {posts_after:,} (+{posts_new_in_db:,})")
    print(f"   Users in DB:      {users_before:,} → {users_after:,} (+{users_new_in_db:,})")
    print(f"   Subreddits in DB: {subs_before:,} → {subs_after:,} (+{subs_new_in_db:,})")

    if elapsed < 100:
        print("\n✅ PASS - Good performance!")
    elif elapsed < 150:
        print("\n⚠️  PARTIAL - Slower than expected")
    else:
        print("\n❌ FAIL - Too slow")

    return elapsed

if __name__ == "__main__":
    try:
        result = asyncio.run(test_10_subreddits())
    except KeyboardInterrupt:
        print("\n🛑 Test interrupted")
    except Exception as e:
        print(f"\n❌ Test failed: {e}")
        import traceback
        traceback.print_exc()
