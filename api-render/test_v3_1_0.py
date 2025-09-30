#!/usr/bin/env python3
"""
Test Reddit Scraper v3.1.0 with 1 Ok subreddit
Direct test without controller
"""
import sys
import os
import asyncio
import logging

# Add paths
current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, current_dir)
sys.path.insert(0, os.path.join(current_dir, 'app'))

from dotenv import load_dotenv
load_dotenv()

from app.core.database.supabase_client import get_supabase_client
from app.scrapers.reddit.reddit_scraper import RedditScraper

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

async def test_single_ok_subreddit():
    """Test with 1 Ok subreddit - modified to limit query"""
    print("=" * 60)
    print("🧪 TESTING REDDIT SCRAPER v3.1.0")
    print("=" * 60)
    print("Configuration: 1 'Ok' subreddit")
    print("Expected: Full processing (users + posts + discovery)")
    print("=" * 60)
    print()

    supabase = get_supabase_client()

    # Create scraper instance
    scraper = RedditScraper(supabase)

    # Monkey-patch get_target_subreddits to return only 1 Ok subreddit
    original_get_target = scraper.get_target_subreddits

    async def limited_get_target():
        result = await original_get_target()
        # Limit to just 1 Ok subreddit
        if result.get('ok'):
            result['ok'] = result['ok'][:1]
        result['no_seller'] = []  # Skip No Seller for this test
        return result

    scraper.get_target_subreddits = limited_get_target

    try:
        # Run the scraper
        await scraper.run()
    except KeyboardInterrupt:
        logger.info("🛑 Test interrupted by user")
    except Exception as e:
        logger.error(f"❌ Test failed: {e}", exc_info=True)
    finally:
        if hasattr(scraper, 'stop'):
            await scraper.stop()

if __name__ == "__main__":
    asyncio.run(test_single_ok_subreddit())