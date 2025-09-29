#!/usr/bin/env python3
"""
TEST-002: Cache Validation
Verifies that cache loading detects incomplete loads and logs warnings
"""
import sys
import os
from datetime import datetime, timezone
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
env_path = Path(__file__).parent.parent.parent.parent / '.env'
load_dotenv(env_path)

# Setup path
current_dir = os.path.dirname(os.path.abspath(__file__))
api_root = os.path.join(current_dir, '..', '..')
sys.path.insert(0, api_root)

from core.database.supabase_client import get_supabase_client


def test_cache_validation():
    """Test cache loading and validation logic"""
    print("\n" + "="*80)
    print("TEST-002: Cache Validation")
    print("="*80)

    supabase = get_supabase_client()
    tests_passed = 0
    tests_failed = 0

    # TEST 1: Get actual total count
    print("\n1. Querying total subreddit count...")
    try:
        count_result = supabase.table('reddit_subreddits').select('id', count='exact').limit(1).execute()
        total_count = count_result.count
        print(f"   ✓ Total subreddits in database: {total_count:,}")
        tests_passed += 1
    except Exception as e:
        print(f"   ✗ FAIL: Could not get total count: {e}")
        tests_failed += 1
        return False

    # TEST 2: Simulate pagination loading
    print("\n2. Testing pagination with .range().order('name')...")
    try:
        all_subreddits_cache = {}
        batch_size = 1000
        offset = 0
        total_loaded = 0
        batch_num = 0

        while True:
            batch_num += 1

            # Query with pagination (same as scraper)
            result = supabase.table('reddit_subreddits').select(
                'name, review, primary_category, tags, over18'
            ).range(offset, offset + batch_size - 1).order('name').execute()

            if not result.data:
                break

            # Build cache
            for r in result.data:
                if r.get('name'):
                    all_subreddits_cache[r['name'].lower()] = {
                        'review': r.get('review'),
                        'primary_category': r.get('primary_category'),
                        'tags': r.get('tags', []),
                        'over18': r.get('over18', False)
                    }

            batch_count = len(result.data)
            total_loaded += batch_count
            print(f"   Batch {batch_num}: loaded {batch_count} records (offset {offset})")

            offset += batch_count

            if batch_count < batch_size:
                break

        print(f"\n   ✓ Loaded {total_loaded:,} subreddits in {batch_num} batches")

        # Validate completeness
        cache_complete = total_loaded >= total_count
        completion_rate = 100 * total_loaded / total_count if total_count > 0 else 0

        print(f"   Completion rate: {completion_rate:.1f}%")

        if cache_complete:
            print(f"   ✓ SUCCESS: Cache is complete ({total_loaded}/{total_count})")
            tests_passed += 1
        else:
            print(f"   ⚠️ WARNING: Cache is incomplete ({total_loaded}/{total_count})")
            print(f"   This would cause data loss in production!")
            tests_failed += 1

    except Exception as e:
        print(f"   ✗ FAIL: Pagination error: {e}")
        tests_failed += 1
        return False

    # TEST 3: Test validation logic that will be added to scraper
    print("\n3. Testing validation logic...")
    try:
        # This is the logic that will be added to the scraper
        if total_loaded < total_count:
            validation_message = f"⚠️ Cache incomplete: {total_loaded}/{total_count} ({completion_rate:.1f}%)"
            validation_level = 'error'
        else:
            validation_message = f"✅ Cache complete: {total_loaded}/{total_count}"
            validation_level = 'success'

        print(f"   Validation message: {validation_message}")
        print(f"   Log level: {validation_level}")

        if cache_complete and validation_level == 'success':
            print(f"   ✓ Validation logic correct")
            tests_passed += 1
        elif not cache_complete and validation_level == 'error':
            print(f"   ✓ Validation logic correctly detects incomplete cache")
            tests_passed += 1
        else:
            print(f"   ✗ FAIL: Validation logic incorrect")
            tests_failed += 1

    except Exception as e:
        print(f"   ✗ FAIL: Validation error: {e}")
        tests_failed += 1

    # TEST 4: Verify cache contents (sample check)
    print("\n4. Verifying cache contents (sample check)...")
    try:
        test_subs = ['gonewild', 'nsfw', 'realgirls']
        all_found = True

        for sub_name in test_subs:
            if sub_name.lower() in all_subreddits_cache:
                cached_data = all_subreddits_cache[sub_name.lower()]
                print(f"   ✓ r/{sub_name}: review={cached_data['review']}, category={cached_data['primary_category']}")
            else:
                print(f"   ✗ r/{sub_name}: NOT IN CACHE")
                all_found = False

        if all_found:
            print(f"   ✓ All sample subreddits found in cache")
            tests_passed += 1
        else:
            print(f"   ⚠️ Some subreddits missing from cache")
            tests_failed += 1

    except Exception as e:
        print(f"   ✗ FAIL: Cache verification error: {e}")
        tests_failed += 1

    # Summary
    print("\n" + "="*80)
    print("TEST RESULTS")
    print("="*80)
    print(f"  Total Subreddits: {total_count:,}")
    print(f"  Cache Loaded: {total_loaded:,}")
    print(f"  Completion: {completion_rate:.1f}%")
    print(f"  Tests Passed: {tests_passed}/4")
    print(f"  Tests Failed: {tests_failed}/4")

    if tests_failed == 0:
        print("\n  🎉 ALL TESTS PASSED!")
        print("="*80 + "\n")
        return True
    else:
        print(f"\n  ⚠️ {tests_failed} test(s) failed")
        print("="*80 + "\n")
        return False


if __name__ == "__main__":
    success = test_cache_validation()
    sys.exit(0 if success else 1)