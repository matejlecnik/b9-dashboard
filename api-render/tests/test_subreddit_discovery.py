#!/usr/bin/env python3
"""
Test script to verify subreddit discovery from user submissions
"""
import asyncio
import os
import sys
from datetime import datetime, timezone

# Add the app directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'app'))

from dotenv import load_dotenv
from app.scrapers.reddit.simple_main import SimplifiedRedditScraper
from app.core.database.supabase_client import get_supabase_client

# Load environment variables
load_dotenv()

async def test_subreddit_discovery():
    """Test that new subreddits are discovered from user submissions"""
    print("\n" + "="*60)
    print("SUBREDDIT DISCOVERY TEST")
    print("="*60)

    try:
        # Initialize
        print("\n🔧 Initializing scraper...")
        scraper = SimplifiedRedditScraper()
        await scraper.initialize()
        print("✅ Scraper initialized")

        print("\n🔧 Connecting to database...")
        supabase = get_supabase_client()
        print("✅ Database connected")

        # Get initial subreddit count
        print("\n📊 Checking current subreddit count...")
        before_result = supabase.table('reddit_subreddits').select(
            'name', count='exact'
        ).execute()
        subreddits_before = before_result.count if before_result else 0
        print(f"📈 Subreddits before: {subreddits_before}")

        # Test user with known submissions to different subreddits
        test_username = "spez"  # Reddit CEO, posts to many subreddits
        print(f"\n🎯 Testing with user: u/{test_username}")

        # Get user submissions
        print(f"🕷️ Fetching submissions for u/{test_username}...")
        submissions = await scraper.get_user_submissions(test_username, limit=30)

        if submissions:
            print(f"✅ Found {len(submissions)} submissions")

            # Extract unique subreddits
            discovered = set()
            for post in submissions:
                if post.get('subreddit'):
                    discovered.add(post['subreddit'].lower())

            print(f"📍 User posts to {len(discovered)} unique subreddits:")
            for sub in list(discovered)[:5]:  # Show first 5
                print(f"  - r/{sub}")

            # Queue new subreddits
            print(f"\n💾 Queueing new subreddits...")
            await scraper.queue_new_subreddits(discovered)

            # Wait for database to process
            await asyncio.sleep(2)

            # Check subreddit count after
            print("\n📊 Checking subreddit count after discovery...")
            after_result = supabase.table('reddit_subreddits').select(
                'name', count='exact'
            ).execute()
            subreddits_after = after_result.count if after_result else 0
            print(f"📈 Subreddits after: {subreddits_after}")

            # Check new subreddits
            new_subreddits = subreddits_after - subreddits_before
            print(f"\n🆕 New subreddits discovered: {new_subreddits}")

            # Verify specific subreddits
            if new_subreddits > 0:
                print("\n🔍 Checking newly added subreddits...")
                recent = supabase.table('reddit_subreddits').select(
                    'name', 'review', 'primary_category'
                ).order('created_at', desc=True).limit(5).execute()

                if recent.data:
                    print("Recently added subreddits:")
                    for sub in recent.data:
                        print(f"  - r/{sub['name']} | Review: {sub['review']} | Category: {sub['primary_category']}")

            # Final verdict
            print("\n" + "="*60)
            if new_subreddits > 0:
                print("✅ SUCCESS: Subreddit discovery is working!")
                print(f"✅ {new_subreddits} new subreddits were discovered")
            else:
                print("⚠️ No new subreddits discovered")
                print("This might mean all subreddits were already in database")
            print("="*60)

        else:
            print(f"⚠️ No submissions found for u/{test_username}")

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
    print("\n🚀 Starting Subreddit Discovery Test")
    print(f"⏰ Time: {datetime.now(timezone.utc).isoformat()}")

    # Run the test
    asyncio.run(test_subreddit_discovery())

    print("\n✅ Test complete")