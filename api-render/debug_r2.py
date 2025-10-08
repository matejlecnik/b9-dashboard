#!/usr/bin/env python3
"""
Debug R2 Upload Condition
Check why R2 uploads aren't happening
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.core.config.r2_config import r2_config
from app.utils.media_storage import process_and_upload_video
from app.scrapers.instagram.services.instagram_scraper import InstagramScraperUnified

print("=" * 70)
print("R2 Upload Condition Debug")
print("=" * 70)
print()

# Check each condition
print("1. r2_config exists:", r2_config is not None)
print("2. r2_config.ENABLED:", r2_config.ENABLED if r2_config else "N/A")
print("3. process_and_upload_video exists:", process_and_upload_video is not None)
print()

# Fetch a reel and check video_url
print("4. Testing reel data extraction...")
scraper = InstagramScraperUnified()
test_user_id = "58710898123"

try:
    reels = scraper._fetch_reels(test_user_id, count=1)

    if reels:
        reel = reels[0]
        print(f"   Fetched 1 reel: {reel.get('pk')}")
        print(f"   Has 'video_versions': {'video_versions' in reel}")

        if 'video_versions' in reel:
            video_versions = reel.get('video_versions', [])
            print(f"   Number of versions: {len(video_versions)}")

            if video_versions and len(video_versions) > 0:
                video_url = video_versions[0].get('url')
                print(f"   video_url extracted: {video_url is not None}")
                if video_url:
                    print(f"   URL preview: {video_url[:80]}...")
                else:
                    print("   ❌ video_url is None!")
            else:
                print("   ❌ video_versions is empty!")
        else:
            print("   ❌ No 'video_versions' key in reel data!")
            print(f"   Available keys: {list(reel.keys())[:10]}")
    else:
        print("   ❌ No reels returned from API")

except Exception as e:
    print(f"   ❌ Error: {e}")
    import traceback
    traceback.print_exc()

print()
print("=" * 70)
print("Checking R2 upload condition:")
print("=" * 70)
print()

if r2_config and r2_config.ENABLED and process_and_upload_video:
    if reels and len(reels) > 0:
        reel = reels[0]
        video_versions = reel.get('video_versions', [])
        if video_versions:
            video_url = video_versions[0].get('url')
            if video_url:
                print("✅ ALL CONDITIONS MET - R2 upload should run!")
            else:
                print("❌ video_url is None - R2 upload will NOT run")
        else:
            print("❌ video_versions is empty - R2 upload will NOT run")
    else:
        print("❌ No reels fetched - cannot test")
else:
    print("❌ R2 config/functions not available - R2 upload will NOT run")
