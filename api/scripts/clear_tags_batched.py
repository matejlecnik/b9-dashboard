#!/usr/bin/env python3
"""
Script to clear all existing tags and primary_category fields for posts in batches
Since the posts table is large, we need to process in smaller chunks
"""

import os
import time
from dotenv import load_dotenv
from supabase import create_client, Client

# Load environment variables
load_dotenv()

def clear_posts_tags_batched():
    """Clear tags from reddit_posts table in batches"""

    # Initialize Supabase client
    url = os.getenv('SUPABASE_URL')
    key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

    if not url or not key:
        print("❌ Error: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment")
        return False

    supabase: Client = create_client(url, key)

    try:
        print("🔄 Clearing tags from reddit_posts table in batches...")

        # Get list of unique subreddit names that have posts
        print("📊 Getting list of subreddits with posts...")
        subreddits_response = supabase.table('reddit_subreddits').select('name').execute()
        subreddit_names = [sub['name'] for sub in subreddits_response.data] if subreddits_response.data else []

        total_subreddits = len(subreddit_names)
        print(f"Found {total_subreddits} subreddits to process")

        total_posts_cleared = 0
        batch_size = 50  # Process 50 subreddits at a time

        for i in range(0, total_subreddits, batch_size):
            batch = subreddit_names[i:i+batch_size]
            batch_end = min(i+batch_size, total_subreddits)

            print(f"\n🔄 Processing batch {i//batch_size + 1} ({i+1}-{batch_end} of {total_subreddits})...")

            for subreddit_name in batch:
                try:
                    # Clear tags for posts of this subreddit
                    posts_response = supabase.table('reddit_posts').update({
                        'sub_tags': None,
                        'sub_primary_category': None
                    }).eq('subreddit_name', subreddit_name).execute()

                    posts_count = len(posts_response.data) if posts_response.data else 0
                    total_posts_cleared += posts_count

                    if posts_count > 0:
                        print(f"   ✅ Cleared {posts_count} posts for r/{subreddit_name}")

                except Exception as e:
                    print(f"   ⚠️ Error clearing posts for r/{subreddit_name}: {e}")
                    # Continue with next subreddit
                    continue

            # Small delay between batches to avoid overloading
            if i + batch_size < total_subreddits:
                print(f"   ⏱️ Waiting 1 second before next batch...")
                time.sleep(1)

        print(f"\n✅ Successfully cleared tags for {total_posts_cleared} posts total")
        print(f"🎯 All post tags have been cleared. Ready to re-tag with improved system!")

        return True

    except Exception as e:
        print(f"❌ Error clearing posts tags: {e}")
        return False

if __name__ == "__main__":
    success = clear_posts_tags_batched()
    exit(0 if success else 1)