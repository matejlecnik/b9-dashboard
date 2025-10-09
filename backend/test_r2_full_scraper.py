#!/usr/bin/env python3
"""
Test Production Instagram Scraper with R2 Storage
Tests the full workflow: fetch → compress → upload → store
"""
import os
import sys
from datetime import datetime


# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.core.config.r2_config import r2_config
from app.core.database import get_db
from app.scrapers.instagram.services.instagram_scraper import InstagramScraperUnified


print("=" * 70)
print("Instagram Scraper + R2 Storage Test")
print("=" * 70)
print()

# Check R2 is enabled
print("📋 Configuration Check:")
print(f"   R2 Enabled: {r2_config.ENABLED}")
print(f"   R2 Bucket: {r2_config.BUCKET_NAME}")
print(f"   Compression: Photos {r2_config.IMAGE_MAX_SIZE_KB}KB, Videos {r2_config.VIDEO_TARGET_SIZE_MB}MB")
print()

if not r2_config.ENABLED:
    print("❌ R2 storage is disabled!")
    print("   Set ENABLE_R2_STORAGE=true in .env")
    sys.exit(1)

# Initialize
scraper = InstagramScraperUnified()
supabase = get_db()

# Test creator
test_username = "sophieraiin"
test_ig_user_id = "58710898123"

print("=" * 70)
print(f"🎯 Test Creator: {test_username}")
print("=" * 70)
print()

# Step 1: Get creator from database
print("Step 1: Fetching creator from Supabase...")
try:
    creator = supabase.table('instagram_creators')\
        .select('*')\
        .eq('ig_user_id', test_ig_user_id)\
        .single()\
        .execute()

    if not creator.data:
        print(f"❌ Creator {test_username} not found in database")
        sys.exit(1)

    creator_data = creator.data
    print(f"✅ Found: {creator_data['username']}")
    print(f"   ID: {creator_data['ig_user_id']}")
    print(f"   Followers: {creator_data.get('followers', 0):,}")
    print()

except Exception as e:
    print(f"❌ Error fetching creator: {e}")
    sys.exit(1)

# Step 2: Fetch posts from Instagram API
print("Step 2: Fetching posts from Instagram API...")
print("   (This may take 10-15 seconds...)")
try:
    posts = scraper._fetch_posts(test_ig_user_id, count=12)

    if not posts:
        print("⚠️  No posts returned from API (might be rate limited)")
        print("   Tip: Try again in a few minutes")
        sys.exit(1)

    # Count carousels and total photos
    carousel_count = sum(1 for p in posts if p.get("carousel_media"))
    total_photos = sum(len(p.get("carousel_media", [])) for p in posts if p.get("carousel_media"))

    print(f"✅ Fetched {len(posts)} posts")
    print(f"   Carousels: {carousel_count} ({total_photos} photos)")
    print()

except Exception as e:
    print(f"❌ Error fetching posts: {e}")
    print("   This might be due to:")
    print("   - RapidAPI rate limit")
    print("   - Invalid API key")
    print("   - Creator's content is private")
    sys.exit(1)

# Step 3: Process and upload posts with R2
print("=" * 70)
print("Step 3: Processing Photos with R2 Upload")
print("=" * 70)
print()
print("This will:")
print("  1. Download each photo from Instagram CDN")
print("  2. Compress to ~300KB")
print("  3. Upload to your R2 bucket")
print("  4. Store R2 URL in database")
print()
print("⏳ Starting upload process...")
print()

try:
    start_time = datetime.now()

    saved, new_count, existing_count = scraper._store_posts(
        creator_id=test_ig_user_id,
        username=test_username,
        posts=posts,
        creator_niche=creator_data.get('niche')
    )

    elapsed = (datetime.now() - start_time).total_seconds()

    print()
    print(f"✅ Processed {saved} posts in {elapsed:.1f}s")
    print(f"   New: {new_count}, Updated: {existing_count}")
    print()

except Exception as e:
    print(f"❌ Error processing posts: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

# Step 4: Fetch reels from Instagram API
print("=" * 70)
print("Step 4: Fetching reels from Instagram API...")
print("=" * 70)
print()

try:
    reels = scraper._fetch_reels(test_ig_user_id, count=12)

    if not reels:
        print("⚠️  No reels returned from API")
    else:
        print(f"✅ Fetched {len(reels)} reels")
        print()

except Exception as e:
    print(f"❌ Error fetching reels: {e}")
    reels = []

# Step 5: Process and upload reels with R2
if reels:
    print("=" * 70)
    print("Step 5: Processing Videos with R2 Upload")
    print("=" * 70)
    print()
    print("This will:")
    print("  1. Download each video from Instagram CDN")
    print("  2. Compress to ~3MB (720p H.265)")
    print("  3. Upload to your R2 bucket")
    print("  4. Store R2 URL in database")
    print()
    print("⚠️  VIDEO COMPRESSION CAN TAKE 5-10 SECONDS PER VIDEO")
    print()
    print("⏳ Starting upload process...")
    print()

    try:
        start_time = datetime.now()

        saved, new_count, existing_count = scraper._store_reels(
            creator_id=test_ig_user_id,
            username=test_username,
            reels=reels,
            creator_niche=creator_data.get('niche')
        )

        elapsed = (datetime.now() - start_time).total_seconds()

        print()
        print(f"✅ Processed {saved} reels in {elapsed:.1f}s")
        print(f"   New: {new_count}, Updated: {existing_count}")
        print()

    except Exception as e:
        print(f"❌ Error processing reels: {e}")
        import traceback
        traceback.print_exc()

# Step 6: Verify R2 URLs in database
print("=" * 70)
print("Step 6: Verifying R2 URLs in Database")
print("=" * 70)
print()

# Check posts
posts_result = supabase.table('instagram_posts')\
    .select('media_pk, post_type, image_urls, thumbnail_url')\
    .eq('creator_id', test_ig_user_id)\
    .eq('post_type', 'carousel')\
    .order('taken_at', desc=True)\
    .limit(3)\
    .execute()

if posts_result.data:
    print("📸 Sample Posts (R2 URLs):")
    for i, post in enumerate(posts_result.data, 1):
        image_urls = post.get('image_urls', [])
        print(f"\n{i}. Post {post['media_pk']}")
        if image_urls and len(image_urls) > 0:
            first_url = image_urls[0]
            if 'r2.cloudflarestorage.com' in first_url:
                print(f"   ✅ R2 URL: {first_url[:80]}...")
                print(f"   Total photos: {len(image_urls)}")
            else:
                print(f"   ⚠️  CDN URL (R2 upload may have failed): {first_url[:80]}...")
        else:
            print("   ❌ No image_urls")
else:
    print("⚠️  No carousel posts found")

print()

# Check reels
reels_result = supabase.table('instagram_reels')\
    .select('media_pk, video_url')\
    .eq('creator_id', test_ig_user_id)\
    .order('taken_at', desc=True)\
    .limit(3)\
    .execute()

if reels_result.data:
    print("🎥 Sample Reels (R2 URLs):")
    for i, reel in enumerate(reels_result.data, 1):
        video_url = reel.get('video_url')
        print(f"\n{i}. Reel {reel['media_pk']}")
        if video_url:
            if 'r2.cloudflarestorage.com' in video_url:
                print(f"   ✅ R2 URL: {video_url[:80]}...")
            else:
                print(f"   ⚠️  CDN URL (R2 upload may have failed): {video_url[:80]}...")
        else:
            print("   ❌ No video_url")
else:
    print("⚠️  No reels found")

print()
print("=" * 70)
print("✅ TEST COMPLETE!")
print("=" * 70)
print()
print("Next Steps:")
print("  1. Check your Cloudflare R2 dashboard:")
print("     https://dash.cloudflare.com/")
print("     → R2 → {r2_config.BUCKET_NAME}")
print()
print("  2. Verify files are there:")
print("     - photos/2025/10/58710898123/")
print("     - videos/2025/10/58710898123/")
print()
print("  3. Check storage size and costs in dashboard")
print()
