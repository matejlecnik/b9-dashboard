"""Test database connection and basic queries"""
import sys
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from src.database.queries import (  # noqa: E402
    get_creators_for_processing,
    get_creator_images,
    get_tagging_stats,
)
from config.settings import validate_config  # noqa: E402


def main():
    print("=" * 60)
    print("Instagram AI Tagger - Database Connection Test")
    print("=" * 60)
    print()

    # Validate configuration
    try:
        validate_config()
    except ValueError as e:
        print(f"❌ Configuration error: {e}")
        return

    print()
    print("-" * 60)
    print("TEST 1: Fetch creators for processing")
    print("-" * 60)

    try:
        creators = get_creators_for_processing(limit=5)
        print(f"✅ Found {len(creators)} creators")

        for i, creator in enumerate(creators, 1):
            print(f"\n{i}. {creator.get('username', 'N/A')}")
            print(f"   ID: {creator['id']}")
            print(f"   IG User ID: {creator.get('ig_user_id', 'N/A')}")
            print(f"   Followers: {creator.get('followers', 0):,}")
            print(f"   Has tags: {creator.get('body_tags') is not None}")

    except Exception as e:
        print(f"❌ Error: {str(e)}")

    print()
    print("-" * 60)
    print("TEST 2: Fetch images for first creator")
    print("-" * 60)

    try:
        if creators:
            creator = creators[0]
            ig_user_id = creator.get("ig_user_id")

            if ig_user_id:
                images = get_creator_images(ig_user_id, limit=5)
                print(f"✅ Found {len(images)} images for {creator.get('username')}")

                for i, img in enumerate(images, 1):
                    print(f"\n{i}. {img['type'].upper()}")
                    print(f"   Engagement: {img['engagement']:,}")
                    print(f"   URL: {img['url'][:80]}...")
            else:
                print("⚠️  Creator missing ig_user_id")
        else:
            print("⚠️  No creators available")

    except Exception as e:
        print(f"❌ Error: {str(e)}")

    print()
    print("-" * 60)
    print("TEST 3: Get tagging stats")
    print("-" * 60)

    try:
        stats = get_tagging_stats()
        print("✅ Statistics retrieved")
        print(f"\n   Total creators: {stats['total_creators']}")
        print(f"   Tagged: {stats['tagged_creators']}")
        print(f"   Untagged: {stats['untagged_creators']}")
        print(f"   Completion: {stats['completion_percentage']:.1f}%")

    except Exception as e:
        print(f"❌ Error: {str(e)}")

    print()
    print("=" * 60)
    print("✅ Database connection test complete!")
    print("=" * 60)


if __name__ == "__main__":
    main()
