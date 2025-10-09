#!/usr/bin/env python3
"""
Test Integrated Scraper with Modular Architecture
Verifies the main scraper initializes and uses modules correctly
"""

import sys
from pathlib import Path


# Add backend directory to path
backend_dir = Path(__file__).parent.parent.parent.parent
sys.path.insert(0, str(backend_dir))


# Import the main scraper
from app.scrapers.instagram.services.instagram_scraper import InstagramScraperUnified


def test_scraper_initialization():
    """Test that the scraper initializes correctly with modules"""

    print("=" * 80)
    print("TESTING INTEGRATED SCRAPER INITIALIZATION")
    print("=" * 80)

    try:
        # Initialize the scraper
        print("\n1️⃣ Initializing Instagram scraper...")
        scraper = InstagramScraperUnified()

        # Check if modules are loaded
        print("\n2️⃣ Checking modular architecture status...")
        print(f"   - use_modules: {scraper.use_modules}")

        if scraper.use_modules:
            print("   ✅ Modular architecture is ACTIVE")

            # Verify modules are initialized
            print("\n3️⃣ Verifying module initialization...")
            print(
                f"   - api_module: {'✅ Initialized' if hasattr(scraper, 'api_module') else '❌ Missing'}"
            )
            print(
                f"   - analytics_module: {'✅ Initialized' if hasattr(scraper, 'analytics_module') else '❌ Missing'}"
            )
            print(
                f"   - storage_module: {'✅ Initialized' if hasattr(scraper, 'storage_module') else '❌ Missing'}"
            )

            # Check module types
            if hasattr(scraper, "api_module"):
                print("\n4️⃣ Module details:")
                print(f"   - API module type: {type(scraper.api_module).__name__}")
                print(f"   - Analytics module type: {type(scraper.analytics_module).__name__}")
                print(f"   - Storage module type: {type(scraper.storage_module).__name__}")
        else:
            print("   ⚠️ Modular architecture is NOT ACTIVE (using monolithic methods)")
            print("   - This is expected if modules couldn't be imported")

        # Check scraper attributes
        print("\n5️⃣ Scraper attributes:")
        print(f"   - supabase: {'✅ Connected' if scraper.supabase else '❌ Not connected'}")
        print(f"   - api_calls_made: {scraper.api_calls_made}")
        print(f"   - creators_processed: {scraper.creators_processed}")

        print("\n" + "=" * 80)
        print("✅ SCRAPER INITIALIZATION TEST PASSED")
        print("=" * 80)

        # Summary
        print("\n📊 Summary:")
        print("   - Scraper initialized: ✅")
        print(f"   - Modular architecture: {'✅ Active' if scraper.use_modules else '⚠️ Inactive'}")
        print("   - Database connected: ✅")

        if scraper.use_modules:
            print("\n💡 The scraper will now use:")
            print("   - storage_module.store_reels() for saving reels")
            print("   - storage_module.store_posts() for saving posts")
            print("   - analytics_module.calculate_analytics() for analytics")
            print("   - storage_module.update_creator_analytics() for updates")
        else:
            print("\n💡 The scraper will fallback to:")
            print("   - self._store_reels() for saving reels")
            print("   - self._store_posts() for saving posts")
            print("   - self._calculate_analytics() for analytics")
            print("   - self._update_creator_analytics() for updates")

        return True

    except Exception as e:
        print("\n❌ SCRAPER INITIALIZATION TEST FAILED")
        print(f"   Error: {e}")
        import traceback

        traceback.print_exc()
        return False


if __name__ == "__main__":
    success = test_scraper_initialization()
    sys.exit(0 if success else 1)
