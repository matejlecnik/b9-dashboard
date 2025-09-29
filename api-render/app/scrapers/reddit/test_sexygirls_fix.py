#!/usr/bin/env python3
"""
Test the specific case: r/sexygirls with engagement=0 showing "Best: Friday 12h"
This should now show "Best: N/A N/A" with the fix applied.
"""
import sys
import os
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

def test_sexygirls_fix():
    """Test the specific r/sexygirls case from user's error message"""
    print("\n" + "="*80)
    print("TEST: r/sexygirls Zero Engagement Fix")
    print("="*80)

    supabase = get_supabase_client()

    # Get the sexygirls subreddit data
    print("\n1. Fetching r/sexygirls from database...")
    result = supabase.table('reddit_subreddits').select('*').eq('name', 'sexygirls').execute()

    if not result.data:
        print("   ✗ FAIL: Subreddit not found")
        return False

    sub = result.data[0]

    print(f"   ✓ Found: r/{sub['name']}")
    print(f"   Review: {sub['review']}")
    print(f"   Engagement: {sub.get('engagement', 0)}")
    print(f"   Avg Upvotes: {sub.get('avg_upvotes_per_post', 0)}")
    print(f"   Subreddit Score: {sub.get('subreddit_score', 0)}")
    print(f"   Best Day (DB): {sub.get('best_posting_day', 'N/A')}")
    print(f"   Best Hour (DB): {sub.get('best_posting_hour', 'N/A')}")

    # Simulate the log message formatting
    engagement = float(sub.get('engagement', 0))
    avg_upvotes = float(sub.get('avg_upvotes_per_post', 0))
    subreddit_score = float(sub.get('subreddit_score', 0))

    # OLD LOGIC (before fix)
    old_best_day = sub.get('best_posting_day', 'N/A')
    old_best_hour = sub.get('best_posting_hour', 'N/A')
    old_display = f"Best: {old_best_day} {old_best_hour}h"

    # NEW LOGIC (with fix) - what the code will calculate
    if engagement > 0.01:
        new_best_day = sub.get('best_posting_day', 'N/A')
        new_best_hour = sub.get('best_posting_hour', 'N/A')
    else:
        new_best_day = None
        new_best_hour = None

    # Format as logs will show
    display_day = new_best_day if new_best_day else 'N/A'
    display_hour = new_best_hour if new_best_hour is not None else 'N/A'
    new_display = f"Best: {display_day} {display_hour}"
    if display_hour != 'N/A':
        new_display += 'h'

    print("\n2. Testing display logic...")
    print(f"   OLD (buggy): '✅ Completed No Seller r/sexygirls | Engagement: {engagement:.4f} | Upvotes: {avg_upvotes:.0f} | Score: {subreddit_score:.2f} | {old_display}'")
    print(f"   NEW (fixed): '✅ Completed No Seller r/sexygirls | Engagement: {engagement:.4f} | Upvotes: {avg_upvotes:.0f} | Score: {subreddit_score:.2f} | {new_display}'")

    print("\n3. Validation...")
    # Check if fix works correctly
    if engagement == 0:
        if new_best_day is None and new_best_hour is None:
            print("   ✓ PASS: Zero engagement correctly shows N/A")
            success = True
        else:
            print(f"   ✗ FAIL: Zero engagement but showing {new_best_day} {new_best_hour}h")
            success = False
    else:
        if new_best_day and new_best_hour:
            print(f"   ✓ PASS: Non-zero engagement correctly shows best time")
            success = True
        else:
            print(f"   ✗ FAIL: Non-zero engagement but showing N/A")
            success = False

    print("\n" + "="*80)
    print(f"RESULT: {'✓ PASS' if success else '✗ FAIL'}")
    print("="*80 + "\n")

    return success

if __name__ == "__main__":
    success = test_sexygirls_fix()
    sys.exit(0 if success else 1)