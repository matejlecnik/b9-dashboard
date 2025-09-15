#!/usr/bin/env python3
import os
import sys
import time
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed
from threading import Lock
from supabase import create_client

sys.path.append(str(Path(__file__).parent.parent))
from dotenv import load_dotenv
load_dotenv(Path(__file__).parent.parent / '.env')

# Thread-safe counter
counter_lock = Lock()
total_updated = 0
processed_count = 0
UPDATE_ALL = (os.getenv('UPDATE_MODE', '').upper() == 'ALL') or (len(sys.argv) > 1 and str(sys.argv[1]).upper() == 'ALL')

def create_supabase_client():
    """Create a new Supabase client for each thread"""
    return create_client(
        os.getenv('SUPABASE_URL'),
        os.getenv('SUPABASE_SERVICE_ROLE_KEY')
    )

def process_subreddit(sub_data):
    """Process a single subreddit - will be run in parallel"""
    global total_updated, processed_count

    sub_index, total_subs, sub = sub_data
    supabase = create_supabase_client()

    sub_name = sub['name']
    category = sub['category_text']
    over18 = sub['over18']

    with counter_lock:
        processed_count += 1
        current_count = processed_count

    print(f"[{current_count}/{total_subs}] Processing r/{sub_name}", flush=True)

    try:
        offset = 0
        sub_total = 0

        if UPDATE_ALL:
            # Update ALL posts for this subreddit, regardless of current values
            while True:
                posts = None
                for attempt in range(3):
                    try:
                        posts = supabase.table('reddit_posts').select(
                            'id'
                        ).eq('subreddit_name', sub_name).range(offset, offset + 49).execute()
                        break
                    except Exception:
                        time.sleep(0.3 * (attempt + 1))
                        continue

                if not posts.data:
                    break

                for post in posts.data:
                    try:
                        update_payload = {
                            'sub_over18': over18
                        }
                        if category is not None and category != '':
                            update_payload['sub_category_text'] = category

                        supabase.table('reddit_posts').update(update_payload).eq('id', post['id']).execute()
                        sub_total += 1
                    except Exception:
                        pass

                offset += 50
                if offset % 500 == 0:
                    print(f"    r/{sub_name}: {offset}+ posts processed (ALL mode)...", flush=True)
                time.sleep(0.02)
        else:
            # Pass 1: posts with NULL sub_category_text
            while True:  # Process posts missing mirror fields (NULL)
                # Fetch with simple retry to avoid transient timeouts
                posts = None
                for attempt in range(3):
                    try:
                        posts = supabase.table('reddit_posts').select(
                            'id'
                        ).eq('subreddit_name', sub_name).filter('sub_category_text', 'is', 'null').range(offset, offset + 49).execute()
                        break
                    except Exception:
                        time.sleep(0.3 * (attempt + 1))
                        continue

                if not posts.data:
                    break

                # Update each post
                for post in posts.data:
                    try:
                        supabase.table('reddit_posts').update({
                            'sub_category_text': category,
                            'sub_over18': over18
                        }).eq('id', post['id']).execute()
                        sub_total += 1
                    except Exception:
                        pass

                offset += 50

                # Print progress for subreddits with many posts
                if offset % 500 == 0:
                    print(f"    r/{sub_name}: {offset}+ posts processed (NULL sub_category_text)...", flush=True)

                time.sleep(0.02)  # Small delay between batches

            # Pass 2: posts with empty-string sub_category_text
            offset = 0
            while True:  # Process posts missing mirror fields (empty string)
                # Fetch with simple retry to avoid transient timeouts
                posts = None
                for attempt in range(3):
                    try:
                        posts = supabase.table('reddit_posts').select(
                            'id'
                        ).eq('subreddit_name', sub_name).eq('sub_category_text', '').range(offset, offset + 49).execute()
                        break
                    except Exception:
                        time.sleep(0.3 * (attempt + 1))
                        continue

                if not posts.data:
                    break

                for post in posts.data:
                    try:
                        supabase.table('reddit_posts').update({
                            'sub_category_text': category,
                            'sub_over18': over18
                        }).eq('id', post['id']).execute()
                        sub_total += 1
                    except Exception:
                        pass

                offset += 50

                if offset % 500 == 0:
                    print(f"    r/{sub_name}: {offset}+ posts processed (empty sub_category_text)...", flush=True)

                time.sleep(0.02)

        with counter_lock:
            total_updated += sub_total

        print(f"  ✅ r/{sub_name}: {sub_total} posts updated", flush=True)
        return sub_total

    except Exception as e:
        print(f"  ❌ r/{sub_name}: Error - {str(e)[:50]}", flush=True)
        return 0

def main():
    global total_updated, processed_count

    print("=" * 60, flush=True)
    print("MULTI-THREADED UPDATE (5 threads)", flush=True)
    print("=" * 60, flush=True)
    print(f"Mode: {'ALL' if UPDATE_ALL else 'MISSING_ONLY'}", flush=True)

    # Create client (dotenv already loaded above)
    supabase = create_supabase_client()

    # Get all subreddits (fetch in batches to overcome 1000 limit)
    print("\nFetching subreddits...", flush=True)

    all_subs = []
    batch_size = 1000
    last_name = None

    while True:
        query = supabase.table('reddit_subreddits').select(
            'name, category_text, over18'
        )

        if UPDATE_ALL:
            # ALL mode: only subreddits reviewed as Ok and with a selected category
            query = query.eq('review', 'Ok').not_.is_('category_text', 'null').neq('category_text', '')
        else:
            # Default: previous behavior - any subreddit with a selected category
            query = query.neq('category_text', '').not_.is_('category_text', 'null')

        query = query.order('name')
        if last_name is not None:
            query = query.gt('name', last_name)

        response = query.limit(batch_size).execute()

        if not response.data:
            break

        all_subs.extend(response.data)
        last_name = response.data[-1]['name']

        if len(response.data) < batch_size:
            break

    print(f"Found {len(all_subs)} subreddits", flush=True)

    if not all_subs:
        print("No subreddits to process")
        return

    # Prepare data for threading
    total_subs = len(all_subs)
    subreddit_data = [(i, total_subs, sub) for i, sub in enumerate(all_subs, 1)]

    max_workers = int(os.getenv('UPDATE_THREADS', '5'))
    print(f"\nProcessing with {max_workers} threads...\n", flush=True)
    start_time = time.time()

    # Process subreddits in parallel with 5 threads
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        futures = [executor.submit(process_subreddit, data) for data in subreddit_data]

        # Wait for all to complete
        for future in as_completed(futures):
            pass  # Results are printed in the process_subreddit function

    # Final summary
    elapsed = time.time() - start_time
    print(f"\n{'='*60}", flush=True)
    print("SUMMARY", flush=True)
    print(f"{'='*60}", flush=True)
    print(f"✅ Subreddits processed: {processed_count}", flush=True)
    print(f"📝 Posts updated: {total_updated}", flush=True)
    print(f"⏱️  Time: {elapsed:.1f}s ({elapsed/60:.1f} minutes)", flush=True)
    print(f"📊 Rate: {total_updated/elapsed:.1f} posts/sec", flush=True)
    print(f"{'='*60}", flush=True)

if __name__ == "__main__":
    main()