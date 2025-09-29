#!/usr/bin/env python3
"""
TEST-001: Protected UPSERT Logic
Verifies that UPSERT preserves existing review, primary_category, tags, subscribers
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


def test_protected_upsert():
    """Test that UPSERT preserves existing protected fields"""
    print("\n" + "="*80)
    print("TEST-001: Protected UPSERT Logic")
    print("="*80)

    supabase = get_supabase_client()
    test_sub_name = 'test_protected_upsert_temp'
    tests_passed = 0
    tests_failed = 0

    try:
        # SETUP: Create test subreddit with protected data
        print("\n1. Setup: Creating test subreddit with protected data...")
        test_data = {
            'name': test_sub_name,
            'display_name_prefixed': f'r/{test_sub_name}',
            'url': f'/r/{test_sub_name}/',
            'review': 'Ok',
            'primary_category': 'Style',
            'tags': ['lingerie', 'bikini'],
            'over18': True,
            'subscribers': 50000,
            'accounts_active': 1000,
            'created_at': datetime.now(timezone.utc).isoformat()
        }

        # Delete if exists from previous run
        supabase.table('reddit_subreddits').delete().eq('name', test_sub_name).execute()

        # Insert test data
        insert_result = supabase.table('reddit_subreddits').insert(test_data).execute()
        print(f"   ✓ Created r/{test_sub_name} with protected data")

        # Verify inserted
        before = supabase.table('reddit_subreddits').select('*').eq('name', test_sub_name).execute()
        assert before.data, "Test subreddit not created"
        before_data = before.data[0]

        print(f"   ✓ Before: review={before_data['review']}, category={before_data['primary_category']}")
        print(f"            tags={before_data['tags']}, subscribers={before_data['subscribers']}")

        # TEST 1: Simulate OLD BUGGY code (UPSERT without protection)
        print("\n2. Testing OLD code (should FAIL - demonstrating bug)...")
        buggy_upsert = {
            'name': test_sub_name,
            'display_name_prefixed': f'r/{test_sub_name}',
            'url': f'/r/{test_sub_name}/',
            'review': None,  # Overwrites!
            'primary_category': 'Unknown',  # Overwrites!
            'subscribers': 0,  # Overwrites!
            'accounts_active': 0,
            'last_scraped_at': None
        }

        supabase.table('reddit_subreddits').upsert(buggy_upsert, on_conflict='name').execute()

        after_buggy = supabase.table('reddit_subreddits').select('*').eq('name', test_sub_name).execute()
        after_buggy_data = after_buggy.data[0]

        print(f"   After OLD code:")
        print(f"      review: {before_data['review']} → {after_buggy_data['review']}")
        print(f"      category: {before_data['primary_category']} → {after_buggy_data['primary_category']}")
        print(f"      tags: {before_data['tags']} → {after_buggy_data.get('tags')}")
        print(f"      subscribers: {before_data['subscribers']} → {after_buggy_data['subscribers']}")

        # Verify data loss occurred
        data_loss_occurred = (
            after_buggy_data['review'] is None and
            after_buggy_data['primary_category'] == 'Unknown' and
            after_buggy_data['subscribers'] == 0
        )

        if data_loss_occurred:
            print(f"   ✓ Confirmed: OLD code causes data loss (as expected)")
            tests_passed += 1
        else:
            print(f"   ✗ UNEXPECTED: OLD code did not cause data loss")
            tests_failed += 1

        # RE-INSERT original data for protected test
        print("\n3. Re-inserting original data for NEW code test...")
        supabase.table('reddit_subreddits').delete().eq('name', test_sub_name).execute()
        supabase.table('reddit_subreddits').insert(test_data).execute()
        print(f"   ✓ Re-created r/{test_sub_name} with original data")

        # TEST 2: Simulate NEW PROTECTED code
        print("\n4. Testing NEW code (protected UPSERT)...")

        # Fetch existing protected fields
        existing = supabase.table('reddit_subreddits').select(
            'review, primary_category, tags, over18, subscribers, accounts_active'
        ).eq('name', test_sub_name).execute()

        existing_data = existing.data[0] if existing.data else {}

        # Build protected UPSERT
        protected_upsert = {
            'name': test_sub_name,
            'display_name_prefixed': f'r/{test_sub_name}',
            'url': f'/r/{test_sub_name}/',
            'last_scraped_at': None  # Update this to re-queue
        }

        protected_fields = []

        # REVIEW: Preserve if set
        if existing_data.get('review'):
            protected_fields.append('review')
            # Don't include in upsert - keeps existing
        else:
            protected_upsert['review'] = None

        # PRIMARY_CATEGORY: Preserve if not Unknown/NULL
        if existing_data.get('primary_category') and existing_data.get('primary_category') != 'Unknown':
            protected_fields.append('primary_category')
        else:
            protected_upsert['primary_category'] = 'Unknown'

        # TAGS: Preserve if set
        if existing_data.get('tags') and len(existing_data.get('tags', [])) > 0:
            protected_fields.append('tags')
        # Don't set - keeps existing

        # OVER18: Preserve if set
        if 'over18' in existing_data and existing_data['over18'] is not None:
            protected_fields.append('over18')

        # SUBSCRIBERS: Preserve if > 0
        if existing_data.get('subscribers', 0) > 0:
            protected_fields.append('subscribers')
        else:
            protected_upsert['subscribers'] = 0

        # ACCOUNTS_ACTIVE: Preserve if > 0
        if existing_data.get('accounts_active', 0) > 0:
            protected_fields.append('accounts_active')
        else:
            protected_upsert['accounts_active'] = 0

        print(f"   Protected fields: {protected_fields}")

        # Execute protected UPSERT
        supabase.table('reddit_subreddits').upsert(protected_upsert, on_conflict='name').execute()

        after_protected = supabase.table('reddit_subreddits').select('*').eq('name', test_sub_name).execute()
        after_protected_data = after_protected.data[0]

        print(f"   After NEW code:")
        print(f"      review: {before_data['review']} → {after_protected_data['review']}")
        print(f"      category: {before_data['primary_category']} → {after_protected_data['primary_category']}")
        print(f"      tags: {before_data['tags']} → {after_protected_data.get('tags')}")
        print(f"      subscribers: {before_data['subscribers']} → {after_protected_data['subscribers']}")
        print(f"      last_scraped_at: {before_data.get('last_scraped_at')} → {after_protected_data.get('last_scraped_at')}")

        # Verify data preserved
        data_preserved = (
            after_protected_data['review'] == 'Ok' and
            after_protected_data['primary_category'] == 'Style' and
            after_protected_data.get('tags') == ['lingerie', 'bikini'] and
            after_protected_data['subscribers'] == 50000 and
            after_protected_data['accounts_active'] == 1000 and
            after_protected_data['last_scraped_at'] is None  # Updated
        )

        if data_preserved:
            print(f"   ✓ SUCCESS: All protected data preserved!")
            tests_passed += 1
        else:
            print(f"   ✗ FAIL: Some data was overwritten")
            tests_failed += 1

    finally:
        # CLEANUP: Delete test subreddit
        print("\n5. Cleanup: Deleting test subreddit...")
        try:
            supabase.table('reddit_subreddits').delete().eq('name', test_sub_name).execute()
            print(f"   ✓ Deleted r/{test_sub_name}")
        except Exception as cleanup_error:
            print(f"   ⚠ Cleanup warning: {cleanup_error}")

    # Summary
    print("\n" + "="*80)
    print("TEST RESULTS")
    print("="*80)
    print(f"  Tests Passed: {tests_passed}/2")
    print(f"  Tests Failed: {tests_failed}/2")

    if tests_failed == 0:
        print("\n  🎉 ALL TESTS PASSED!")
        print("="*80 + "\n")
        return True
    else:
        print(f"\n  ⚠️ {tests_failed} test(s) failed")
        print("="*80 + "\n")
        return False


if __name__ == "__main__":
    success = test_protected_upsert()
    sys.exit(0 if success else 1)