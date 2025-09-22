#!/usr/bin/env python3
"""
Script to test model-subreddit matching with the new 84-tag system
"""

import os
import json
from dotenv import load_dotenv
from supabase import create_client, Client

# Load environment variables
load_dotenv()

def test_model_matching():
    """Test model-subreddit matching with various tag combinations"""

    # Initialize Supabase client
    url = os.getenv('SUPABASE_URL')
    key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

    if not url or not key:
        print("❌ Error: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment")
        return False

    supabase: Client = create_client(url, key)

    try:
        print("🔬 Testing Model-Subreddit Matching System")
        print("=" * 50)

        # Test cases with different tag combinations
        test_cases = [
            {
                "name": "Single precise tag (optimal)",
                "tags": ["ethnicity:asian"],
                "description": "Model with Asian ethnicity"
            },
            {
                "name": "Two complementary tags (good)",
                "tags": ["body:petite", "style:goth"],
                "description": "Petite goth model"
            },
            {
                "name": "Three specific tags (ok)",
                "tags": ["focus:ass", "body:thick", "ethnicity:latina"],
                "description": "Thick Latina focused on ass content"
            },
            {
                "name": "Body focus combination",
                "tags": ["focus:breasts", "breasts:large"],
                "description": "Model focusing on large breasts"
            },
            {
                "name": "Style and niche combination",
                "tags": ["niche:cosplay", "style:egirl"],
                "description": "E-girl doing cosplay"
            }
        ]

        for test in test_cases:
            print(f"\n📋 Test: {test['name']}")
            print(f"   Tags: {', '.join(test['tags'])}")
            print(f"   Description: {test['description']}")

            # Query subreddits that match these tags
            # Use the overlap operator for JSONB arrays
            response = supabase.table('reddit_subreddits')\
                .select('name, tags, subscribers')\
                .filter('tags', 'cs', json.dumps(test['tags']))\
                .eq('review', 'Ok')\
                .order('subscribers', desc=True)\
                .limit(10)\
                .execute()

            if response.data:
                print(f"   ✅ Found {len(response.data)} matching subreddits")
                print("   Top matches:")
                for sub in response.data[:5]:
                    sub_tags = sub.get('tags', [])
                    matching_tags = [tag for tag in test['tags'] if tag in sub_tags]
                    print(f"      • r/{sub['name']:<25} ({sub['subscribers']:,} subs)")
                    print(f"        Matching tags: {', '.join(matching_tags)}")
                    print(f"        All tags: {', '.join(sub_tags[:3])}" +
                          ("..." if len(sub_tags) > 3 else ""))
            else:
                print(f"   ⚠️  No matching subreddits found")

            # Also get total count
            count_response = supabase.table('reddit_subreddits')\
                .select('*', count='exact', head=True)\
                .filter('tags', 'cs', json.dumps(test['tags']))\
                .eq('review', 'Ok')\
                .execute()

            if count_response.count:
                print(f"   📊 Total matches: {count_response.count} subreddits")

        # Test with actual model from database
        print("\n" + "=" * 50)
        print("📝 Testing with actual models in database:")

        models_response = supabase.table('models').select('*').execute()
        models = models_response.data if models_response.data else []

        if models:
            for model in models:
                model_tags = model.get('assigned_tags', [])
                if model_tags:
                    print(f"\n🧑 Model: {model['stage_name']}")
                    print(f"   Tags: {', '.join(model_tags)}")

                    # Get matching subreddits
                    match_response = supabase.table('reddit_subreddits')\
                        .select('*', count='exact', head=True)\
                        .filter('tags', 'cs', json.dumps(model_tags))\
                        .eq('review', 'Ok')\
                        .execute()

                    print(f"   ✅ Matches {match_response.count} approved subreddits")

                    # Get top 3 matches for preview
                    preview_response = supabase.table('reddit_subreddits')\
                        .select('name, tags, subscribers')\
                        .filter('tags', 'cs', json.dumps(model_tags))\
                        .eq('review', 'Ok')\
                        .order('subscribers', desc=True)\
                        .limit(3)\
                        .execute()

                    if preview_response.data:
                        print("   Top subreddit matches:")
                        for sub in preview_response.data:
                            print(f"      • r/{sub['name']} ({sub['subscribers']:,} subs)")
                else:
                    print(f"\n🧑 Model: {model['stage_name']}")
                    print(f"   ⚠️  No tags assigned yet")
        else:
            print("\n⚠️  No models found in database")

        # Statistics on tag usage
        print("\n" + "=" * 50)
        print("📊 Tag Usage Statistics:")

        # Get all subreddits with tags
        all_subs = supabase.table('reddit_subreddits')\
            .select('tags')\
            .eq('review', 'Ok')\
            .execute()

        tag_counts = {}
        if all_subs.data:
            for sub in all_subs.data:
                for tag in sub.get('tags', []):
                    tag_counts[tag] = tag_counts.get(tag, 0) + 1

        # Sort by usage
        sorted_tags = sorted(tag_counts.items(), key=lambda x: x[1], reverse=True)

        print(f"Total approved subreddits with tags: {len(all_subs.data) if all_subs.data else 0}")
        print(f"Unique tags in use: {len(sorted_tags)}")
        print("\nTop 10 most common tags in approved subreddits:")
        for tag, count in sorted_tags[:10]:
            print(f"  • {tag:<30} used in {count} subreddits")

        return True

    except Exception as e:
        print(f"❌ Error during testing: {e}")
        return False

if __name__ == "__main__":
    success = test_model_matching()
    exit(0 if success else 1)