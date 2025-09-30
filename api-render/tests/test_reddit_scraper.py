#!/usr/bin/env python3
"""
Test script to verify Reddit scraper posts are saving correctly
Tests with a single small subreddit to confirm the fix
"""
import asyncio
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

# Add the app directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'app'))

from dotenv import load_dotenv
from app.scrapers.reddit.simple_main import SimplifiedRedditScraper
from app.core.database.supabase_client import get_supabase_client

# Load environment variables
load_dotenv()

async def test_single_subreddit():
    """Test scraping a single small subreddit"""
    print("\n" + "="*60)
    print("REDDIT SCRAPER TEST - SINGLE SUBREDDIT")
    print("="*60)

    try:
        # Initialize scraper
        print("\n🔧 Initializing scraper...")
        scraper = SimplifiedRedditScraper()
        await scraper.initialize()
        print("✅ Scraper initialized")

        # Get database client
        print("\n🔧 Connecting to database...")
        supabase = get_supabase_client()
        print("✅ Database connected")

        # Choose a small test subreddit
        test_subreddit = "learnpython"  # Small, active subreddit for testing
        print(f"\n🎯 Testing with r/{test_subreddit}")

        # Count posts before scraping
        print("\n📊 Checking existing posts...")
        before_result = supabase.table('reddit_posts').select(
            'reddit_id', count='exact'
        ).eq('subreddit_name', test_subreddit).execute()

        posts_before = before_result.count if before_result else 0
        print(f"📈 Posts before scraping: {posts_before}")

        # Scrape the subreddit
        print(f"\n🕷️ Starting scrape of r/{test_subreddit}...")
        posts = await scraper.get_subreddit_posts(test_subreddit, limit=10)

        if posts:
            print(f"✅ Scraped {len(posts)} posts from Reddit API")

            # Log first post details for debugging
            if posts:
                first_post = posts[0]
                print(f"\n🔍 Sample post:")
                print(f"  - ID: {first_post.get('id')}")
                print(f"  - Title: {first_post.get('title', '')[:60]}...")
                print(f"  - Author: {first_post.get('author')}")
                print(f"  - Score: {first_post.get('score')}")

            # Save posts to database
            print(f"\n💾 Saving posts to database...")
            await scraper.save_posts_batch(posts, test_subreddit)

            # Wait a moment for database to process
            await asyncio.sleep(2)

            # Count posts after scraping
            print("\n📊 Checking posts after save...")
            after_result = supabase.table('reddit_posts').select(
                'reddit_id', count='exact'
            ).eq('subreddit_name', test_subreddit).execute()

            posts_after = after_result.count if after_result else 0
            print(f"📈 Posts after scraping: {posts_after}")

            # Calculate new posts
            new_posts = posts_after - posts_before
            print(f"\n🆕 New posts saved: {new_posts}")

            # Verify specific posts were saved
            if posts:
                print("\n🔍 Verifying specific posts...")
                sample_ids = [p.get('id') for p in posts[:3]]  # Check first 3

                for post_id in sample_ids:
                    verify_result = supabase.table('reddit_posts').select(
                        'reddit_id', 'title'
                    ).eq('reddit_id', post_id).single().execute()

                    if verify_result and verify_result.data:
                        print(f"✅ Post {post_id} found in database")
                    else:
                        print(f"❌ Post {post_id} NOT found in database")

            # Final verdict
            print("\n" + "="*60)
            if new_posts > 0:
                print("✅ SUCCESS: Posts are being saved to database!")
                print(f"✅ {new_posts} new posts were saved")
            else:
                print("❌ FAILURE: No new posts were saved")
                print("❌ The bug still exists - posts are not persisting")
            print("="*60)

        else:
            print(f"⚠️ No posts returned from r/{test_subreddit}")

    except Exception as e:
        print(f"\n❌ Test failed with error: {e}")
        import traceback
        traceback.print_exc()

    finally:
        # Cleanup
        if scraper:
            await scraper.cleanup()
            print("\n🧹 Cleanup complete")

if __name__ == "__main__":
    print("\n🚀 Starting Reddit Scraper Test")
    print(f"⏰ Time: {datetime.now(timezone.utc).isoformat()}")

    # Run the test
    asyncio.run(test_single_subreddit())

    print("\n✅ Test complete")