#!/usr/bin/env python3
"""
Test AI Categorization - Local test script for tag-based categorization
"""
import asyncio
import logging
import os
import sys
from dotenv import load_dotenv

# Add app directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from supabase import create_client
from app.services.categorization_service_tags import TagCategorizationService

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


async def main():
    """Test AI categorization with a few Ok subreddits"""
    # Load environment variables
    load_dotenv()

    logger.info("=" * 60)
    logger.info("Test - AI Tag Categorization")
    logger.info("=" * 60)

    # Check environment variables
    supabase_url = os.getenv('SUPABASE_URL')
    supabase_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
    openai_api_key = os.getenv('OPENAI_API_KEY')

    if not supabase_url or not supabase_key:
        logger.error("❌ SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set")
        sys.exit(1)

    if not openai_api_key:
        logger.error("❌ OPENAI_API_KEY not set in environment")
        sys.exit(1)

    logger.info("✅ Environment variables found")

    # Initialize service
    try:
        supabase = create_client(supabase_url, supabase_key)
        service = TagCategorizationService(supabase, openai_api_key)
        logger.info("✅ Service initialized")
    except Exception as e:
        logger.error(f"❌ Failed to initialize service: {e}")
        sys.exit(1)

    # Get stats
    logger.info("\n📊 Current Stats:")
    logger.info("-" * 60)
    try:
        stats = await service.get_tag_stats()
        logger.info(f"   Total approved (Ok) subreddits: {stats['total_approved_subreddits']}")
        logger.info(f"   Already tagged: {stats['total_tagged']}")
        logger.info(f"   Untagged remaining: {stats['untagged_remaining']}")
        logger.info(f"   Progress: {stats['tagging_progress_percent']:.1f}%")
    except Exception as e:
        logger.error(f"❌ Failed to get stats: {e}")

    # Get untagged subreddits
    logger.info("\n🔍 Fetching untagged subreddits...")
    logger.info("-" * 60)
    try:
        subreddits = await service.get_uncategorized_subreddits(limit=5)
        logger.info(f"   Found {len(subreddits)} untagged subreddits")

        if not subreddits:
            logger.info("✅ All subreddits are already tagged!")
            return

        # Show first 5
        logger.info("\n   First 5 untagged subreddits:")
        for i, sub in enumerate(subreddits[:5], 1):
            logger.info(f"      {i}. r/{sub['name']} - {sub.get('subscribers', 0):,} subscribers")

    except Exception as e:
        logger.error(f"❌ Failed to fetch untagged subreddits: {e}")
        sys.exit(1)

    # Ask for confirmation
    logger.info("\n⚠️  WARNING: This will use OpenAI API and cost money!")
    logger.info(f"   Estimated cost: ${len(subreddits) * 0.01:.2f} for {len(subreddits)} subreddits")
    confirm = input("\n   Continue? (yes/no): ")

    if confirm.lower() != 'yes':
        logger.info("❌ Aborted")
        return

    # Run categorization
    logger.info("\n🤖 Starting AI categorization...")
    logger.info("=" * 60)

    try:
        result = await service.tag_all_uncategorized(
            batch_size=2,
            limit=len(subreddits)
        )

        # Display results
        logger.info("\n" + "=" * 60)
        logger.info("✅ Categorization Complete!")
        logger.info("=" * 60)

        stats = result['stats']
        logger.info(f"\n📊 Results:")
        logger.info(f"   Total processed: {stats['total_processed']}")
        logger.info(f"   Successful: {stats['successful']}")
        logger.info(f"   Errors: {stats['errors']}")
        logger.info(f"   Success rate: {stats['success_rate_percent']:.1f}%")
        logger.info(f"   Total cost: ${stats['total_cost']:.4f}")
        logger.info(f"   Average cost per subreddit: ${stats['average_cost_per_subreddit']:.4f}")
        logger.info(f"   Duration: {stats['duration_minutes']:.2f} minutes")

        # Show top tags
        if stats.get('top_tags'):
            logger.info(f"\n🏷️  Top tags assigned:")
            for tag, count in list(stats['top_tags'].items())[:10]:
                logger.info(f"      {tag}: {count}")

        # Show individual results
        logger.info(f"\n📋 Individual Results:")
        logger.info("-" * 60)
        for result_item in result.get('results', [])[:10]:
            status = "✅" if result_item.success else "❌"
            logger.info(f"   {status} r/{result_item.subreddit_name}")
            if result_item.success:
                logger.info(f"      Tags: {', '.join(result_item.tags)}")
                logger.info(f"      Primary: {result_item.primary_category}")
                logger.info(f"      Cost: ${result_item.cost:.4f}")
            else:
                logger.info(f"      Error: {result_item.error_message}")

    except Exception as e:
        logger.error(f"\n❌ Categorization failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
