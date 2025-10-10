#!/usr/bin/env python3
"""
Modular Instagram Scraper - Integration Test
Demonstrates the new modular architecture
"""

import asyncio
import sys
from pathlib import Path


# Add backend directory to path
backend_dir = Path(__file__).parent.parent.parent.parent
sys.path.insert(0, str(backend_dir))

from app.config import config  # noqa: E402
from app.core.database.supabase_client import get_supabase_client  # noqa: E402
from app.logging import get_logger  # noqa: E402

# Import new modules
from app.scrapers.instagram.services.modules import (  # noqa: E402
    InstagramAnalytics,
    InstagramAPI,
    InstagramStorage,
)


async def test_modular_architecture():
    """
    Test the modular architecture with a real creator
    This demonstrates how the refactored scraper should work
    """
    # Initialize components
    supabase = get_supabase_client()
    logger = get_logger(__name__, supabase_client=supabase)

    logger.info("=" * 80)
    logger.info("MODULAR INSTAGRAM SCRAPER - INTEGRATION TEST")
    logger.info("=" * 80)

    # Initialize modules using composition
    api = InstagramAPI(config.instagram, logger)
    analytics = InstagramAnalytics(config.instagram, logger)
    storage = InstagramStorage(supabase, logger)

    # Test creator
    test_creator = {
        "username": "vismaramartina",
        "ig_user_id": "2017771114",
    }

    username = test_creator["username"]
    creator_id = test_creator["ig_user_id"]

    logger.info(f"\n🎯 Testing with creator: {username} (ID: {creator_id})")

    # Step 1: Fetch profile using API module
    logger.info("\n📱 Step 1: Fetching profile data...")
    profile = await api.fetch_profile(username)

    if not profile:
        logger.error("❌ Failed to fetch profile")
        return

    logger.info(f"✅ Profile fetched: {profile.get('follower_count', 0):,} followers")

    # Step 2: Fetch content using API module
    logger.info("\n🎬 Step 2: Fetching reels...")
    reels = await api.fetch_reels(creator_id, count=12)
    logger.info(f"✅ Fetched {len(reels)} reels")

    logger.info("\n📸 Step 3: Fetching posts...")
    posts = await api.fetch_posts(creator_id, count=10)
    logger.info(f"✅ Fetched {len(posts)} posts")

    # Step 3: Calculate analytics using Analytics module
    logger.info("\n📊 Step 4: Calculating analytics...")
    analytics_data = analytics.calculate_analytics(
        creator_id=creator_id, reels=reels, posts=posts, profile_data=profile
    )

    logger.info("✅ Analytics calculated")
    logger.info(f"\n{analytics.format_analytics_summary(analytics_data)}")

    # Step 4: Track follower growth using Storage module
    logger.info("\n📈 Step 5: Tracking follower growth...")
    growth_data = storage.track_follower_growth(
        creator_id=creator_id,
        username=username,
        current_followers=profile.get("follower_count", 0),
        current_following=profile.get("following_count", 0),
        media_count=profile.get("media_count", 0),
    )

    logger.info("✅ Growth tracked:")
    if growth_data["daily_growth_rate"] is not None:
        logger.info(f"   Daily: {growth_data['daily_growth_rate']:.2f}%")
    if growth_data["weekly_growth_rate"] is not None:
        logger.info(f"   Weekly: {growth_data['weekly_growth_rate']:.2f}%")

    # Step 5: Update creator analytics using Storage module
    logger.info("\n💾 Step 6: Updating creator analytics...")
    storage.update_creator_analytics(
        creator_id=creator_id,
        analytics=analytics_data,
        api_calls_made=3,  # profile + reels + posts
    )
    logger.info("✅ Analytics updated in database")

    # Step 6: Test store_reels() method (NEW)
    logger.info("\n🎬 Step 7: Testing store_reels() method...")
    if reels:
        total_saved, new_count, existing_count = storage.store_reels(
            creator_id=creator_id,
            username=username,
            reels=reels,
            creator_niche="fitness",  # Example niche
            current_creator_followers=profile.get("follower_count", 0),
        )
        logger.info(
            f"✅ store_reels() executed: {total_saved} saved ({new_count} new, {existing_count} existing)"
        )
    else:
        logger.info("⚠️ No reels to store")

    # Step 7: Test store_posts() method (NEW)
    logger.info("\n📸 Step 8: Testing store_posts() method...")
    if posts:
        total_saved, new_count, existing_count = storage.store_posts(
            creator_id=creator_id,
            username=username,
            posts=posts,
            creator_niche="fitness",  # Example niche
            current_creator_followers=profile.get("follower_count", 0),
        )
        logger.info(
            f"✅ store_posts() executed: {total_saved} saved ({new_count} new, {existing_count} existing)"
        )
    else:
        logger.info("⚠️ No posts to store")

    # Summary
    logger.info("\n" + "=" * 80)
    logger.info("✅ MODULAR INTEGRATION TEST COMPLETE")
    logger.info("=" * 80)
    logger.info("\n📊 Results:")
    logger.info(f"   Profile: ✅ {profile.get('follower_count', 0):,} followers")
    logger.info(f"   Reels: ✅ {len(reels)} fetched")
    logger.info(f"   Posts: ✅ {len(posts)} fetched")
    logger.info(
        f"   Analytics: ✅ {analytics_data.get('total_content_analyzed', 0)} pieces analyzed"
    )
    logger.info(f"   Engagement Rate: ✅ {analytics_data.get('engagement_rate', 0):.2f}%")
    logger.info(
        f"   API Calls: {api.api_calls_made} (Success: {api.successful_calls}, Failed: {api.failed_calls})"
    )

    logger.info("\n💡 Key Benefits Demonstrated:")
    logger.info("   ✅ Separation of concerns (API, Analytics, Storage)")
    logger.info("   ✅ Easy to test individual components")
    logger.info("   ✅ Clear data flow and dependencies")
    logger.info("   ✅ Reusable modules across different scrapers")
    logger.info("   ✅ Type-safe configuration management")
    logger.info("   ✅ Complete storage workflow (reels + posts)")


async def main():
    """Main entry point"""
    try:
        await test_modular_architecture()
    except KeyboardInterrupt:
        print("\n\n⚠️  Test interrupted by user")
    except Exception as e:
        print(f"\n\n❌ Test failed: {e}")
        import traceback

        traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(main())
