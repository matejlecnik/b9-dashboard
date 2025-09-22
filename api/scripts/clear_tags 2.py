#!/usr/bin/env python3
"""
Script to clear all existing tags and primary_category fields for all subreddits
This allows us to start fresh with the improved tagging system
"""

import os
from dotenv import load_dotenv
from supabase import create_client, Client

# Load environment variables
load_dotenv()

def clear_all_tags():
    """Clear tags and primary_category for all subreddits"""

    # Initialize Supabase client
    url = os.getenv('SUPABASE_URL')
    key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

    if not url or not key:
        print("❌ Error: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment")
        return False

    supabase: Client = create_client(url, key)

    try:
        print("🔄 Clearing tags and primary_category for all subreddits...")

        # Update all subreddits - set tags and primary_category to null
        response = supabase.table('reddit_subreddits').update({
            'tags': None,
            'primary_category': None,
            'tags_updated_at': None,
            'tags_updated_by': None
        }).neq('id', 0).execute()  # neq('id', 0) matches all records

        count = len(response.data) if response.data else 0
        print(f"✅ Successfully cleared tags for {count} subreddits")

        # Also clear tags from reddit_posts table
        print("🔄 Clearing tags from reddit_posts table...")
        posts_response = supabase.table('reddit_posts').update({
            'sub_tags': None,
            'sub_primary_category': None
        }).neq('id', 0).execute()

        posts_count = len(posts_response.data) if posts_response.data else 0
        print(f"✅ Successfully cleared tags for {posts_count} posts")

        # Get count of subreddits that need tagging (review = 'Ok')
        ok_subreddits = supabase.table('reddit_subreddits').select('id', count='exact').eq('review', 'Ok').execute()
        ok_count = ok_subreddits.count if hasattr(ok_subreddits, 'count') else 0

        print(f"\n📊 Summary:")
        print(f"   - Total subreddits cleared: {count}")
        print(f"   - Total posts cleared: {posts_count}")
        print(f"   - Subreddits ready for tagging (review='Ok'): {ok_count}")
        print(f"\n🎯 All tags have been cleared. Ready to re-tag with improved system!")

        return True

    except Exception as e:
        print(f"❌ Error clearing tags: {e}")
        return False

if __name__ == "__main__":
    success = clear_all_tags()
    exit(0 if success else 1)