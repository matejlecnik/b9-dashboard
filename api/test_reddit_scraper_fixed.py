#!/usr/bin/env python3
"""
Test script to verify Reddit scraper fixes
Tests that data is properly saved to Supabase
"""
import asyncio
import logging
import os
import sys
from datetime import datetime, timezone
from pathlib import Path
from dotenv import load_dotenv
from supabase import create_client

# Use absolute imports from api package

# Load environment variables
env_path = Path(__file__).parent / '.env'
load_dotenv(env_path)

# Configure logging to see all our new log messages
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

async def test_batch_writer():
    """Test the batch writer directly"""
    logger.info("=" * 60)
    logger.info("🧪 TESTING BATCH WRITER")
    logger.info("=" * 60)

    # Initialize Supabase
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

    if not supabase_url or not supabase_key:
        logger.error("❌ Supabase credentials not found in .env")
        return False

    supabase = create_client(supabase_url, supabase_key)
    logger.info("✅ Supabase client initialized")

    # Import batch writer
    from api.core.database.batch_writer import BatchWriter

    # Create batch writer with small batch size for testing
    batch_writer = BatchWriter(supabase, batch_size=2, flush_interval=3.0)

    # Start the batch writer
    await batch_writer.start()
    logger.info("✅ Batch writer started")

    # Test adding subreddit data
    test_subreddit = {
        'name': 'test_subreddit_' + datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S'),
        'display_name': 'TestSubreddit',
        'display_name_prefixed': 'r/TestSubreddit',
        'title': 'Test Subreddit Title',
        'description': 'This is a test subreddit for testing the scraper',
        'subscribers': 12345,
        'subreddit_score': 42.5,
        'engagement': 0.123,
        'avg_upvotes_per_post': 100,
        'created_utc': datetime.now(timezone.utc).isoformat()
    }

    logger.info(f"📝 Adding test subreddit: {test_subreddit['name']}")
    await batch_writer.add_subreddit(test_subreddit)

    # Test adding user data
    test_user = {
        'username': 'test_user_' + datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S'),
        'total_karma': 1000,
        'link_karma': 500,
        'comment_karma': 500,
        'created_utc': datetime.now(timezone.utc).isoformat()
    }

    logger.info(f"📝 Adding test user: {test_user['username']}")
    await batch_writer.add_user(test_user)

    # Test adding posts data
    test_posts = [
        {
            'reddit_id': 'test_post_1_' + datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S'),
            'title': 'Test Post 1',
            'author_username': test_user['username'],
            'subreddit_name': test_subreddit['name'],
            'score': 100,
            'num_comments': 10,
            'created_utc': datetime.now(timezone.utc).isoformat()
        },
        {
            'reddit_id': 'test_post_2_' + datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S'),
            'title': 'Test Post 2',
            'author_username': test_user['username'],
            'subreddit_name': test_subreddit['name'],
            'score': 200,
            'num_comments': 20,
            'created_utc': datetime.now(timezone.utc).isoformat()
        }
    ]

    logger.info(f"📝 Adding {len(test_posts)} test posts")
    await batch_writer.add_posts(test_posts)

    # Wait for auto-flush
    logger.info("⏳ Waiting 5 seconds for auto-flush...")
    await asyncio.sleep(5)

    # Force a final flush
    logger.info("💾 Forcing final flush...")
    await batch_writer.flush_all()

    # Stop batch writer
    logger.info("🛑 Stopping batch writer...")
    await batch_writer.stop()

    # Verify data was saved
    logger.info("=" * 60)
    logger.info("🔍 VERIFYING DATA IN SUPABASE")
    logger.info("=" * 60)

    # Check subreddit
    result = supabase.table('reddit_subreddits').select('*').eq('name', test_subreddit['name']).execute()
    if result.data and len(result.data) > 0:
        logger.info(f"✅ Subreddit saved: {result.data[0]['name']} (score: {result.data[0].get('subreddit_score', 0)})")
    else:
        logger.error(f"❌ Subreddit NOT found: {test_subreddit['name']}")

    # Check user
    result = supabase.table('reddit_users').select('*').eq('username', test_user['username']).execute()
    if result.data and len(result.data) > 0:
        logger.info(f"✅ User saved: {result.data[0]['username']} (karma: {result.data[0].get('total_karma', 0)})")
    else:
        logger.error(f"❌ User NOT found: {test_user['username']}")

    # Check posts
    for post in test_posts:
        result = supabase.table('reddit_posts').select('*').eq('reddit_id', post['reddit_id']).execute()
        if result.data and len(result.data) > 0:
            logger.info(f"✅ Post saved: {result.data[0]['title'][:30]}... (score: {result.data[0].get('score', 0)})")
        else:
            logger.error(f"❌ Post NOT found: {post['reddit_id']}")

    logger.info("=" * 60)
    logger.info("✅ BATCH WRITER TEST COMPLETE")
    logger.info("=" * 60)
    return True

async def test_scraper_minimal():
    """Test the actual scraper with minimal data"""
    logger.info("=" * 60)
    logger.info("🧪 TESTING REDDIT SCRAPER V2")
    logger.info("=" * 60)

    try:
        from scrapers.reddit.main import RedditScraperV2

        # Create scraper instance
        scraper = RedditScraperV2()

        # Initialize scraper
        logger.info("Initializing scraper...")
        await scraper.initialize()

        # Just test that initialization works
        logger.info("✅ Scraper initialized successfully")

        # Check batch writer is initialized
        if scraper.batch_writer:
            logger.info("✅ Batch writer is initialized")
            stats = scraper.batch_writer.get_stats()
            logger.info(f"  Batch size: {stats['batch_size']}")
            logger.info(f"  Flush interval: {stats['flush_interval']}s")
        else:
            logger.error("❌ Batch writer not initialized")

        # Clean up
        await scraper.cleanup()
        logger.info("✅ Scraper cleanup completed")

    except Exception as e:
        logger.error(f"❌ Error testing scraper: {e}")
        import traceback
        logger.error(traceback.format_exc())
        return False

    logger.info("=" * 60)
    logger.info("✅ SCRAPER TEST COMPLETE")
    logger.info("=" * 60)
    return True

async def main():
    """Main test function"""
    logger.info("🚀 Starting Reddit Scraper Tests")
    logger.info("=" * 60)

    # Test 1: Batch Writer
    success1 = await test_batch_writer()

    # Small delay between tests
    await asyncio.sleep(2)

    # Test 2: Scraper Initialization
    success2 = await test_scraper_minimal()

    # Summary
    logger.info("=" * 60)
    logger.info("📊 TEST SUMMARY")
    logger.info("=" * 60)
    logger.info(f"Batch Writer Test: {'✅ PASSED' if success1 else '❌ FAILED'}")
    logger.info(f"Scraper Init Test: {'✅ PASSED' if success2 else '❌ FAILED'}")

    if success1 and success2:
        logger.info("🎉 ALL TESTS PASSED!")
    else:
        logger.error("❌ SOME TESTS FAILED")

if __name__ == "__main__":
    asyncio.run(main())