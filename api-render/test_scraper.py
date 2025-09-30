#!/usr/bin/env python3
"""Test script for Reddit scraper with limited subreddits"""
import asyncio
import sys
import os

# Setup path
sys.path.insert(0, '/Users/matejlecnik/Desktop/b9_agency/b9_dashboard/api-render')

from app.scrapers.reddit.reddit_scraper import RedditScraper
from app.core.database.supabase_client import get_supabase_client


async def main():
    """Run scraper with test subreddits"""
    print("🧪 Starting Reddit scraper test with 2 subreddits...\n")

    supabase = get_supabase_client()
    scraper = RedditScraper(supabase)

    # Override get_target_subreddits for testing
    async def test_get_target_subreddits():
        """Return test subreddits with cached metadata"""
        # Fetch metadata from database for test subreddits
        ok_result = supabase.table('reddit_subreddits').select(
            'name, review, primary_category, tags, over18'
        ).eq('name', 'Gone_Wild_Coffee').execute()

        no_seller_result = supabase.table('reddit_subreddits').select(
            'name, review, primary_category, tags, over18'
        ).eq('name', 'OUTFITS').execute()

        # Cache metadata for OK subreddit
        if ok_result.data:
            item = ok_result.data[0]
            scraper.subreddit_metadata_cache[item['name']] = {
                'review': item.get('review'),
                'primary_category': item.get('primary_category'),
                'tags': item.get('tags'),
                'over18': item.get('over18')
            }

        # Cache metadata for No Seller subreddit
        if no_seller_result.data:
            item = no_seller_result.data[0]
            scraper.subreddit_metadata_cache[item['name']] = {
                'review': item.get('review'),
                'primary_category': item.get('primary_category'),
                'tags': item.get('tags'),
                'over18': item.get('over18')
            }

        print("📋 Test subreddits loaded:")
        print("   ✅ OK: Gone_Wild_Coffee (full processing with users)")
        print("   ✅ No Seller: OUTFITS (posts only, no users)\n")

        return {
            'ok': ['Gone_Wild_Coffee'],
            'no_seller': ['OUTFITS']
        }

    scraper.get_target_subreddits = test_get_target_subreddits

    # Run one cycle
    print("▶️  Starting scraper run...\n")
    print("=" * 80)
    await scraper.run()


if __name__ == '__main__':
    asyncio.run(main())