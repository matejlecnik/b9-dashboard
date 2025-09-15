#!/usr/bin/env python3
import os
import sys
import time
from pathlib import Path

sys.path.append(str(Path(__file__).parent.parent))
from dotenv import load_dotenv
load_dotenv(Path(__file__).parent.parent / '.env')

from supabase import create_client

supabase_url = os.getenv('SUPABASE_URL')
supabase_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
if not supabase_url or not supabase_key:
    print("Missing Supabase environment variables.", flush=True)
    print(f"SUPABASE_URL present: {bool(supabase_url)}", flush=True)
    print(f"SERVICE_ROLE_KEY present: {bool(supabase_key)}", flush=True)
    sys.exit(1)

supabase = create_client(
    supabase_url,
    supabase_key
)

print("Starting update process...", flush=True)

# Get subreddits
print("Fetching subreddits...", flush=True)
subs = supabase.table('reddit_subreddits').select(
    'name, category_text, over18'
).neq('category_text', '').not_.is_('category_text', 'null').limit(10000).execute()

print(f"Found {len(subs.data)} subreddits", flush=True)

total = 0
# Process all subreddits
total_subs = len(subs.data)
for i, sub in enumerate(subs.data, 1):
    print(f"\n[{i}/{total_subs}] r/{sub['name']}", flush=True)

    # Get posts in small batches
    offset = 0
    sub_total = 0

    # Pass 1: posts with NULL sub_category_text
    while True:  # Process posts missing mirror fields (NULL)
        posts = supabase.table('reddit_posts').select(
            'id'
        ).eq('subreddit_name', sub['name']).filter('sub_category_text', 'is', 'null').range(offset, offset + 49).execute()

        if not posts.data:
            break

        # Update each post
        for post in posts.data:
            try:
                supabase.table('reddit_posts').update({
                    'sub_category_text': sub['category_text'],
                    'sub_over18': sub['over18']
                }).eq('id', post['id']).execute()
                sub_total += 1
            except Exception:
                pass

        print(f"  Batch {offset//50 + 1}: {len(posts.data)} posts (NULL sub_category_text)", flush=True)
        offset += 50
        time.sleep(0.05)  # Small delay

    # Pass 2: posts with empty-string sub_category_text
    offset = 0
    while True:  # Process posts missing mirror fields (empty string)
        posts = supabase.table('reddit_posts').select(
            'id'
        ).eq('subreddit_name', sub['name']).eq('sub_category_text', '').range(offset, offset + 49).execute()

        if not posts.data:
            break

        for post in posts.data:
            try:
                supabase.table('reddit_posts').update({
                    'sub_category_text': sub['category_text'],
                    'sub_over18': sub['over18']
                }).eq('id', post['id']).execute()
                sub_total += 1
            except Exception:
                pass

        print(f"  Batch {offset//50 + 1}: {len(posts.data)} posts (empty sub_category_text)", flush=True)
        offset += 50
        time.sleep(0.05)

    total += sub_total
    print(f"  Total: {sub_total} posts updated", flush=True)

print(f"\nDone! Updated {total} posts total", flush=True)