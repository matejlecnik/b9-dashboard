#!/usr/bin/env python3
"""
Script to reset all primary_category and tags fields to NULL in reddit_subreddits table
"""

import os
from dotenv import load_dotenv
from supabase import create_client, Client

# Load environment variables
load_dotenv()

def reset_categorization():
    """Reset all primary_category and tags fields to NULL"""

    # Initialize Supabase client
    url = os.getenv('SUPABASE_URL')
    key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

    if not url or not key:
        print("❌ Error: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment")
        return False

    supabase: Client = create_client(url, key)

    try:
        print("🔄 Resetting categorization data...")
        print("This will set primary_category and tags to NULL for ALL subreddits")

        # Get count of subreddits that will be affected
        count_response = supabase.table('reddit_subreddits').select('id', count='exact').execute()
        total_count = count_response.count if count_response else 0

        # Count how many have existing data
        with_category = supabase.table('reddit_subreddits').select('id', count='exact').not_.is_('primary_category', 'null').execute()
        with_tags = supabase.table('reddit_subreddits').select('id', count='exact').not_.is_('tags', 'null').execute()

        category_count = with_category.count if with_category else 0
        tags_count = with_tags.count if with_tags else 0

        print(f"\n📊 Current status:")
        print(f"   Total subreddits: {total_count}")
        print(f"   With primary_category: {category_count}")
        print(f"   With tags: {tags_count}")

        if category_count == 0 and tags_count == 0:
            print("\n✅ No categorization data to reset. All fields already NULL.")
            return True

        # Show what will be reset
        print(f"\n⚠️  This will reset categorization for up to {max(category_count, tags_count)} subreddits")
        print("Proceeding with reset...")

        # Execute the update
        print("\n🔄 Updating database...")

        # Reset all records - Supabase doesn't support setting to NULL directly via update
        # We need to use a different approach - update with None
        update_response = supabase.table('reddit_subreddits').update({
            'primary_category': None,
            'tags': None
        }).not_.is_('id', 'null').execute()  # Update all records

        # Count affected records
        affected_count = len(update_response.data) if update_response.data else 0

        print(f"✅ Successfully reset {affected_count} subreddit records")
        print("\n📝 All categorization data has been cleared:")
        print("   • primary_category → NULL")
        print("   • tags → NULL")
        print("\n🔄 You will need to recategorize subreddits using the new 82-tag system")

        return True

    except Exception as e:
        print(f"❌ Error during reset: {e}")
        return False

if __name__ == "__main__":
    success = reset_categorization()
    exit(0 if success else 1)