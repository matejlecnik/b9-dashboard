#!/usr/bin/env python3
"""
Test script to verify that seed subreddits get their minimum requirements calculated
"""

import os
import sys
import asyncio
import logging
from datetime import datetime, timezone
from dotenv import load_dotenv
from supabase import create_client

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def check_seed_subreddit_requirements():
    """Check if seed subreddits have minimum requirements set"""

    # Initialize Supabase
    supabase_url = os.getenv('SUPABASE_URL')
    supabase_key = os.getenv('SUPABASE_ANON_KEY')

    if not supabase_url or not supabase_key:
        logger.error("❌ Missing SUPABASE_URL or SUPABASE_ANON_KEY in environment")
        return

    supabase = create_client(supabase_url, supabase_key)

    try:
        # Get all subreddits with 'Ok' review status (seed subreddits)
        response = supabase.table('reddit_subreddits').select(
            'name, review, min_post_karma, min_comment_karma, min_account_age_days, '
            'requirements_last_updated, best_posting_hour, best_posting_day, '
            'avg_upvotes_per_post, subscriber_engagement_ratio'
        ).eq('review', 'Ok').execute()

        if not response.data:
            logger.warning("⚠️ No seed subreddits found with 'Ok' review status")
            return

        logger.info(f"\n{'='*80}")
        logger.info(f"SEED SUBREDDIT REQUIREMENTS CHECK")
        logger.info(f"{'='*80}")
        logger.info(f"Found {len(response.data)} seed subreddits with 'Ok' review status\n")

        # Categorize subreddits
        with_requirements = []
        without_requirements = []
        with_metrics = []
        without_metrics = []

        for sub in response.data:
            name = sub['name']

            # Check minimum requirements
            has_requirements = (
                sub.get('min_post_karma') is not None and
                sub.get('min_comment_karma') is not None and
                sub.get('min_account_age_days') is not None
            )

            # Check other metrics
            has_metrics = (
                sub.get('best_posting_hour') is not None and
                sub.get('best_posting_day') is not None and
                sub.get('avg_upvotes_per_post') is not None
            )

            if has_requirements:
                with_requirements.append(sub)
            else:
                without_requirements.append(sub)

            if has_metrics:
                with_metrics.append(sub)
            else:
                without_metrics.append(sub)

        # Report results
        logger.info(f"📊 MINIMUM REQUIREMENTS STATUS:")
        logger.info(f"   ✅ WITH requirements: {len(with_requirements)} subreddits")
        logger.info(f"   ❌ WITHOUT requirements: {len(without_requirements)} subreddits")

        if with_requirements:
            logger.info(f"\n   Examples WITH requirements:")
            for sub in with_requirements[:3]:
                logger.info(f"      r/{sub['name']}: post_karma≥{sub['min_post_karma']}, "
                          f"comment_karma≥{sub['min_comment_karma']}, "
                          f"age≥{sub['min_account_age_days']}d")
                if sub.get('requirements_last_updated'):
                    logger.info(f"         Updated: {sub['requirements_last_updated']}")

        if without_requirements:
            logger.info(f"\n   ⚠️ Subreddits WITHOUT requirements (need scraping):")
            for sub in without_requirements[:10]:
                logger.info(f"      r/{sub['name']}")
            if len(without_requirements) > 10:
                logger.info(f"      ... and {len(without_requirements) - 10} more")

        logger.info(f"\n📈 OTHER METRICS STATUS:")
        logger.info(f"   ✅ WITH metrics (best time, engagement): {len(with_metrics)} subreddits")
        logger.info(f"   ❌ WITHOUT metrics: {len(without_metrics)} subreddits")

        if with_metrics:
            logger.info(f"\n   Examples WITH metrics:")
            for sub in with_metrics[:3]:
                logger.info(f"      r/{sub['name']}: best_hour={sub['best_posting_hour']}, "
                          f"best_day={sub['best_posting_day']}, "
                          f"avg_upvotes={sub['avg_upvotes_per_post']}")

        # Summary
        logger.info(f"\n{'='*80}")
        logger.info(f"SUMMARY:")
        logger.info(f"{'='*80}")

        completion_rate = (len(with_requirements) / len(response.data)) * 100 if response.data else 0
        metrics_rate = (len(with_metrics) / len(response.data)) * 100 if response.data else 0

        logger.info(f"📊 Requirements completion: {completion_rate:.1f}% ({len(with_requirements)}/{len(response.data)})")
        logger.info(f"📈 Metrics completion: {metrics_rate:.1f}% ({len(with_metrics)}/{len(response.data)})")

        if completion_rate < 100:
            logger.info(f"\n⚠️ ACTION NEEDED: Run the scraper to update {len(without_requirements)} subreddits without requirements")
        else:
            logger.info(f"\n✅ SUCCESS: All seed subreddits have minimum requirements calculated!")

        if metrics_rate < 100:
            logger.info(f"⚠️ ACTION NEEDED: {len(without_metrics)} subreddits need metrics update")
        else:
            logger.info(f"✅ SUCCESS: All seed subreddits have metrics calculated!")

    except Exception as e:
        logger.error(f"❌ Error checking seed subreddit requirements: {e}")

def main():
    """Run the test"""
    logger.info("Starting seed subreddit requirements check...")
    check_seed_subreddit_requirements()
    logger.info("\nTest completed!")

if __name__ == "__main__":
    main()