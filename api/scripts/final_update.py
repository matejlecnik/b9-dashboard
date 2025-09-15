#!/usr/bin/env python3
import os
import sys
import time
from pathlib import Path

sys.path.append(str(Path(__file__).parent.parent))
from dotenv import load_dotenv
load_dotenv(Path(__file__).parent.parent / '.env')

from supabase import create_client

supabase = create_client(
    os.getenv('SUPABASE_URL'),
    os.getenv('SUPABASE_SERVICE_ROLE_KEY')
)

print("Starting update process...", flush=True)

# Get subreddits
print("Fetching subreddits...", flush=True)
subs = supabase.table('reddit_subreddits').select(
    'name, category_text, over18'
).neq('category_text', '').not_.is_('category_text', None).limit(10000).execute()

print(f"Found {len(subs.data)} subreddits", flush=True)

total = 0
# Process all subreddits
total_subs = len(subs.data)
for i, sub in enumerate(subs.data, 1):
    print(f"\n[{i}/{total_subs}] r/{sub['name']}", flush=True)

    # Get posts in small batches
    offset = 0
    sub_total = 0

    while True:  # Process ALL posts for this subreddit
        posts = supabase.table('reddit_posts').select(
            'id'
        ).eq('subreddit_name', sub['name']).range(offset, offset + 49).execute()

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
            except:
                pass

        print(f"  Batch {offset//50 + 1}: {len(posts.data)} posts", flush=True)
        offset += 50
        time.sleep(0.05)  # Small delay

    total += sub_total
    print(f"  Total: {sub_total} posts updated", flush=True)

print(f"\nDone! Updated {total} posts total", flush=True)