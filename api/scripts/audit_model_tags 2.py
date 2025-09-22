#!/usr/bin/env python3
"""
Script to audit and clean model tags to ensure they match the new 84-tag system
"""

import os
import json
from dotenv import load_dotenv
from supabase import create_client, Client

# Load environment variables
load_dotenv()

# Define the official 84 tags from the TAG_CATEGORIES system
VALID_TAGS = [
    # CONTENT/NICHE (14 tags)
    'niche:cosplay', 'niche:gaming', 'niche:anime', 'niche:fitness',
    'niche:yoga', 'niche:outdoors', 'niche:bdsm', 'niche:amateur',
    'niche:verified', 'niche:sellers', 'niche:cnc', 'niche:voyeur',
    'niche:rating', 'niche:general',

    # BODY FOCUS (10 tags)
    'focus:breasts', 'focus:ass', 'focus:pussy', 'focus:legs',
    'focus:thighs', 'focus:feet', 'focus:face', 'focus:belly',
    'focus:curves', 'focus:full_body',

    # BODY TYPE (9 tags)
    'body:petite', 'body:slim', 'body:athletic', 'body:average',
    'body:curvy', 'body:thick', 'body:slim_thick', 'body:bbw',
    'body:ssbbw',

    # ASS SPECIFIC (4 tags)
    'ass:small', 'ass:bubble', 'ass:big', 'ass:jiggly',

    # BREASTS SPECIFIC (7 tags)
    'breasts:small', 'breasts:medium', 'breasts:large', 'breasts:huge',
    'breasts:natural', 'breasts:enhanced', 'breasts:perky',

    # AGE GROUP (5 tags)
    'age:college', 'age:adult', 'age:milf', 'age:mature', 'age:gilf',

    # ETHNICITY (7 tags)
    'ethnicity:asian', 'ethnicity:latina', 'ethnicity:ebony',
    'ethnicity:white', 'ethnicity:indian', 'ethnicity:middle_eastern',
    'ethnicity:mixed',

    # STYLE/AESTHETIC (12 tags)
    'style:alt', 'style:goth', 'style:egirl', 'style:tattooed',
    'style:pierced', 'style:natural', 'style:bimbo', 'style:tomboy',
    'style:femdom', 'style:submissive', 'style:lingerie', 'style:uniform',

    # HAIR (4 tags)
    'hair:blonde', 'hair:redhead', 'hair:brunette', 'hair:colored',

    # SPECIAL ATTRIBUTES (8 tags)
    'special:hairy', 'special:flexible', 'special:tall', 'special:short',
    'special:breeding', 'special:slutty', 'special:clothed', 'special:bent_over',

    # CONTENT TYPE (2 tags)
    'content:oc', 'content:professional'
]

def audit_model_tags():
    """Audit and clean model tags to ensure they're all valid"""

    # Initialize Supabase client
    url = os.getenv('SUPABASE_URL')
    key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

    if not url or not key:
        print("❌ Error: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment")
        return False

    supabase: Client = create_client(url, key)

    try:
        print("🔄 Auditing model tags...")

        # Fetch all models
        models_response = supabase.table('models').select('*').execute()
        models = models_response.data if models_response.data else []

        print(f"Found {len(models)} models to check")

        total_invalid = 0
        models_to_update = []

        for model in models:
            model_id = model.get('id')
            stage_name = model.get('stage_name', 'Unknown')
            assigned_tags = model.get('assigned_tags', [])

            if not assigned_tags:
                continue

            # Check for invalid tags
            invalid_tags = [tag for tag in assigned_tags if tag not in VALID_TAGS]

            if invalid_tags:
                total_invalid += len(invalid_tags)
                print(f"\n⚠️  Model '{stage_name}' (ID: {model_id}) has {len(invalid_tags)} invalid tags:")
                for tag in invalid_tags:
                    print(f"   ❌ {tag}")

                # Filter to keep only valid tags
                valid_tags = [tag for tag in assigned_tags if tag in VALID_TAGS]

                print(f"   → Keeping {len(valid_tags)} valid tags: {', '.join(valid_tags[:5])}" +
                      ("..." if len(valid_tags) > 5 else ""))

                models_to_update.append({
                    'id': model_id,
                    'stage_name': stage_name,
                    'new_tags': valid_tags,
                    'removed_tags': invalid_tags
                })

        if total_invalid == 0:
            print("\n✅ All model tags are valid! No cleanup needed.")
            return True

        print(f"\n⚠️  Found {total_invalid} invalid tags across {len(models_to_update)} models")

        # Ask for confirmation before updating
        response = input("\nDo you want to remove these invalid tags? (y/n): ")
        if response.lower() != 'y':
            print("Cancelled.")
            return False

        # Update models
        print("\n🔄 Updating models...")
        for update in models_to_update:
            try:
                supabase.table('models').update({
                    'assigned_tags': update['new_tags']
                }).eq('id', update['id']).execute()

                print(f"✅ Updated '{update['stage_name']}' - removed {len(update['removed_tags'])} invalid tags")
            except Exception as e:
                print(f"❌ Failed to update '{update['stage_name']}': {e}")

        print(f"\n✅ Cleanup complete! Removed {total_invalid} invalid tags from {len(models_to_update)} models.")

        # Show summary of remaining tags
        print("\n📊 Summary of valid tags in use:")
        tag_usage = {}

        # Re-fetch models to count tag usage
        models_response = supabase.table('models').select('*').execute()
        models = models_response.data if models_response.data else []

        for model in models:
            for tag in model.get('assigned_tags', []):
                tag_usage[tag] = tag_usage.get(tag, 0) + 1

        # Sort by usage
        sorted_tags = sorted(tag_usage.items(), key=lambda x: x[1], reverse=True)

        print(f"Total unique tags in use: {len(sorted_tags)}")
        print("\nTop 10 most used tags:")
        for tag, count in sorted_tags[:10]:
            print(f"  • {tag}: {count} models")

        return True

    except Exception as e:
        print(f"❌ Error during audit: {e}")
        return False

if __name__ == "__main__":
    success = audit_model_tags()
    exit(0 if success else 1)