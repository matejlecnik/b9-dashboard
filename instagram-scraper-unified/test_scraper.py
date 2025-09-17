#!/usr/bin/env python3
"""
Test script for Instagram Unified Scraper
Tests the complete workflow with a single creator
"""
import os
import sys
import json
import logging
from dotenv import load_dotenv

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger(__name__)

def test_scraper():
    """Test the scraper with a single creator"""
    try:
        # Load environment
        load_dotenv()

        # Import after env is loaded
        from unified_scraper import InstagramScraperUnified
        from config import Config

        # Validate config
        Config.validate()
        logger.info("✅ Configuration validated successfully")

        # Initialize scraper
        scraper = InstagramScraperUnified()
        logger.info("✅ Scraper initialized")

        # Test with a single creator
        test_creator = {
            "ig_user_id": "72741069431",  # Example from API samples
            "username": "miaadesiign",
            "status": "ok"
        }

        logger.info(f"\n📋 Testing with creator: {test_creator['username']}")
        logger.info("=" * 50)

        # Process the creator
        success = scraper.process_creator(test_creator)

        if success:
            logger.info("\n✅ Test completed successfully!")

            # Display summary statistics
            logger.info("\n📊 Test Summary:")
            logger.info(f"  • API Calls Made: {scraper.api_calls_made}")
            logger.info(f"  • Estimated Cost: ${scraper.api_calls_made * Config.get_cost_per_request():.4f}")
            logger.info(f"  • Daily Budget Used: {((scraper.daily_calls + scraper.api_calls_made) / Config.MAX_DAILY_API_CALLS) * 100:.2f}%")
            logger.info(f"  • Monthly Budget Used: {((scraper.monthly_calls + scraper.api_calls_made) / Config.MAX_MONTHLY_API_CALLS) * 100:.2f}%")
        else:
            logger.error("❌ Test failed!")
            if scraper.errors:
                logger.error(f"Errors: {json.dumps(scraper.errors, indent=2)}")

    except Exception as e:
        logger.error(f"❌ Test failed with error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

def test_api_endpoints():
    """Test API endpoint connectivity"""
    import requests
    from config import Config

    logger.info("\n🔍 Testing API Endpoints...")
    logger.info("=" * 50)

    headers = Config.get_headers()

    # Test profile endpoint
    try:
        response = requests.get(
            Config.PROFILE_ENDPOINT,
            headers=headers,
            params={"username": "instagram"},
            timeout=10
        )
        if response.status_code == 200:
            logger.info(f"✅ Profile endpoint: OK ({response.status_code})")
        else:
            logger.warning(f"⚠️  Profile endpoint: {response.status_code}")
    except Exception as e:
        logger.error(f"❌ Profile endpoint: {e}")

    # Test user-feeds endpoint
    try:
        response = requests.get(
            Config.POSTS_ENDPOINT,
            headers=headers,
            params={"id": "25025320", "count": "1"},
            timeout=10
        )
        if response.status_code == 200:
            logger.info(f"✅ Posts endpoint: OK ({response.status_code})")
        else:
            logger.warning(f"⚠️  Posts endpoint: {response.status_code}")
    except Exception as e:
        logger.error(f"❌ Posts endpoint: {e}")

    # Test reels endpoint
    try:
        response = requests.get(
            Config.REELS_ENDPOINT,
            headers=headers,
            params={"id": "25025320", "count": "1"},
            timeout=10
        )
        if response.status_code == 200:
            logger.info(f"✅ Reels endpoint: OK ({response.status_code})")
        else:
            logger.warning(f"⚠️  Reels endpoint: {response.status_code}")
    except Exception as e:
        logger.error(f"❌ Reels endpoint: {e}")

def test_database_connection():
    """Test Supabase connection"""
    from supabase import create_client
    from config import Config

    logger.info("\n🗄️  Testing Database Connection...")
    logger.info("=" * 50)

    try:
        supabase = create_client(Config.SUPABASE_URL, Config.SUPABASE_KEY)

        # Test query
        result = supabase.table("instagram_creators").select("count", count='exact').limit(1).execute()
        logger.info(f"✅ Database connection: OK")
        logger.info(f"  • Total creators in database: {getattr(result, 'count', 'Unknown')}")
    except Exception as e:
        logger.error(f"❌ Database connection failed: {e}")
        return False

    return True

def main():
    """Run all tests"""
    logger.info("🚀 Instagram Scraper Test Suite")
    logger.info("================================\n")

    # Test 1: Configuration
    logger.info("Test 1: Configuration Check")
    try:
        from config import Config
        Config.validate()
        logger.info("✅ Configuration is valid")
        logger.info(f"  • API Host: {Config.RAPIDAPI_HOST}")
        logger.info(f"  • Daily limit: {Config.MAX_DAILY_API_CALLS:,} calls")
        logger.info(f"  • Monthly limit: {Config.MAX_MONTHLY_API_CALLS:,} calls")
        logger.info(f"  • Cost per request: ${Config.get_cost_per_request():.6f}")
    except Exception as e:
        logger.error(f"❌ Configuration invalid: {e}")
        sys.exit(1)

    # Test 2: Database Connection
    if not test_database_connection():
        logger.error("Cannot proceed without database connection")
        sys.exit(1)

    # Test 3: API Endpoints
    test_api_endpoints()

    # Test 4: Full Scraper Test
    logger.info("\n📦 Running Full Scraper Test...")
    logger.info("=" * 50)
    test_scraper()

    logger.info("\n✅ All tests completed!")

if __name__ == "__main__":
    main()