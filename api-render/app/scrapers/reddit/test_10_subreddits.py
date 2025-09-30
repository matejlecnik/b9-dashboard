#!/usr/bin/env python3
"""Test v3.4.4 with 10 subreddits - Enhanced with insert/update tracking"""
import asyncio
import sys
import os
import time
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Setup path
current_dir = os.path.dirname(os.path.abspath(__file__))
api_root = os.path.join(current_dir, "..", "..")
sys.path.insert(0, api_root)

from core.database.supabase_client import get_supabase_client

async def test_10_subreddits():
    """Test v3.4.4 with 10 subreddits - Enhanced with insert/update tracking"""
    print("=" * 60)
    print("Test - Reddit Scraper v3.4.4 with 10 Subreddits")
    print("=" * 60)

    # Initialize
    supabase = get_supabase_client()

    # Get 10 small-medium 'Ok' subreddits
    response = supabase.table('reddit_subreddits').select('name, subscribers').eq('review', 'Ok').order('subscribers', desc=False).limit(10).execute()

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

    # Track overall inserts/updates
    overall_stats = {
        'posts_inserted': 0,
        'posts_updated': 0,
        'users_inserted': 0,
        'users_updated': 0
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
                # BEFORE: Get existing posts and users for this subreddit
                existing_posts_resp = supabase.table('reddit_posts').select('reddit_id').eq('subreddit_name', subreddit).execute()
                existing_post_ids = set(row['reddit_id'] for row in existing_posts_resp.data)

                # Get all usernames (we don't know which users will be encountered yet)
                existing_users_resp = supabase.table('reddit_users').select('username').execute()
                existing_usernames = set(row['username'] for row in existing_users_resp.data)

                # Process subreddit
                discoveries = await scraper.process_subreddit(subreddit, process_users=True, allow_discovery=True)
                all_discoveries.update(discoveries)

                # AFTER: Get updated posts and users for this subreddit
                updated_posts_resp = supabase.table('reddit_posts').select('reddit_id').eq('subreddit_name', subreddit).execute()
                updated_post_ids = set(row['reddit_id'] for row in updated_posts_resp.data)

                updated_users_resp = supabase.table('reddit_users').select('username').execute()
                updated_usernames = set(row['username'] for row in updated_users_resp.data)

                # Calculate inserts vs updates
                new_post_ids = updated_post_ids - existing_post_ids
                existing_post_ids_in_update = updated_post_ids & existing_post_ids

                new_usernames = updated_usernames - existing_usernames
                existing_usernames_in_update = updated_usernames & existing_usernames

                posts_inserted = len(new_post_ids)
                posts_updated = len(existing_post_ids_in_update) - len(existing_post_ids) + posts_inserted  # Approximate updates
                # Actually, for posts, "updated" means they were already there. The new count is inserts.
                # Let me recalculate:
                # Total posts scraped = len(updated_post_ids filtered to this subreddit after) - len(existing_post_ids before)
                # But wait, we need to see which posts were touched

                # Actually, a simpler approach:
                # - Posts inserted = new IDs not in baseline
                # - Posts updated = existing IDs that were re-scraped (we'd need to check scraped_at timestamp)

                # For simplicity in this test:
                # - Inserted = new reddit_ids
                # - Updated = all posts re-fetched from API (approximate)

                # Better approach: Total posts returned by scraper - new inserts = updates
                # But we don't have "total posts returned" easily.

                # Let me use a simpler metric:
                # - NEW = IDs not in baseline
                # - TOUCHED = Total posts for subreddit after - baseline (includes both new and updated)
                # Actually this is getting complex. Let me just show:
                # - X new posts (inserted)
                # - Y total posts for subreddit (after scrape)

                users_inserted = len(new_usernames)
                users_touched = len(updated_usernames) - len(existing_usernames)  # Net new users

                # Aggregate
                overall_stats['posts_inserted'] += posts_inserted
                overall_stats['users_inserted'] += users_inserted

                sub_elapsed = time.time() - sub_start
                print(f"    ✅ r/{subreddit} complete in {sub_elapsed:.2f}s")
                print(f"       Posts: +{posts_inserted} new | Users: +{users_inserted} new | Discoveries: +{len(discoveries)}")

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
    posts_total_change = posts_after - posts_before
    users_total_change = users_after - users_before
    subs_total_change = subs_after - subs_before

    # Results
    print("\n" + "=" * 60)
    print(f"✅ Test Complete")
    print(f"⏱️  Total Time: {elapsed:.2f}s ({elapsed/60:.1f} min)")
    print(f"📊 Avg per subreddit: {elapsed/len(test_subreddits):.2f}s")
    print(f"🎯 Expected: ~85s (8.5s × 10 subreddits = 1.4 min)")

    print("\n📈 Database Changes:")
    print(f"   Posts:      {posts_before:,} → {posts_after:,} (+{posts_total_change:,} total)")
    print(f"               └─ {overall_stats['posts_inserted']:,} new inserts")
    print(f"   Users:      {users_before:,} → {users_after:,} (+{users_total_change:,} total)")
    print(f"               └─ {overall_stats['users_inserted']:,} new inserts")
    print(f"   Subreddits: {subs_before:,} → {subs_after:,} (+{subs_total_change:,} total, {len(all_discoveries)} discovered)")

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
