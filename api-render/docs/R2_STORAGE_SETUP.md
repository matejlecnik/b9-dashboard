# Cloudflare R2 Storage Setup Guide

## Overview

Permanent media storage system for Instagram profile pictures, videos, and photos using Cloudflare R2.

**Features:**
- ✅ Automatic compression (profile pics: 200KB, photos: 300KB, videos: 1.5MB)
- ✅ Permanent URLs (no expiration like Instagram CDN)
- ✅ Zero egress fees (unlimited bandwidth)
- ✅ Deduplication (skip upload if media already in R2)
- ✅ H.264 video codec (QuickTime & Safari compatible)
- ✅ Profile pictures automatically overwrite on each scrape
- ✅ 30-70% cost savings vs competitors

**Cost:** ~$1,590/year for 10K creators (17.6TB storage)

---

## 1. Create Cloudflare R2 Bucket

### Step 1: Sign up for Cloudflare
1. Go to https://dash.cloudflare.com/
2. Create account (free tier available)
3. Navigate to R2 storage

### Step 2: Create Bucket
1. Click "Create bucket"
2. Name: `b9-instagram-media`
3. Location: Automatic (global distribution)
4. Click "Create bucket"

### Step 3: Configure Public Access
1. Go to bucket settings
2. Click "Public access" tab
3. Add custom domain: `media.b9dashboard.com`
4. Follow DNS setup instructions (add CNAME record)

### Step 4: Generate API Credentials
1. Go to "Manage R2 API Tokens"
2. Click "Create API token"
3. Permissions: Read & Write
4. TTL: Never expire
5. Copy:
   - Account ID
   - Access Key ID
   - Secret Access Key

---

## 2. Install Dependencies

### Server Requirements
```bash
# FFmpeg required for video compression
# Ubuntu/Debian:
sudo apt-get update
sudo apt-get install ffmpeg

# macOS:
brew install ffmpeg

# Verify installation:
ffmpeg -version
```

### Python Packages
Already added to `requirements.txt`:
```bash
pip install -r requirements.txt
# Installs: boto3, Pillow, ffmpeg-python
```

---

## 3. Configure Environment Variables

### Update `.env` file:
```bash
# Cloudflare R2 Storage
R2_ACCOUNT_ID=your-account-id-from-step-4
R2_ACCESS_KEY_ID=your-access-key-id-from-step-4
R2_SECRET_ACCESS_KEY=your-secret-access-key-from-step-4
R2_BUCKET_NAME=b9-instagram-media
R2_PUBLIC_URL=https://media.b9dashboard.com
ENABLE_R2_STORAGE=true  # Set to 'true' to enable
```

### Verify Configuration
```bash
# Test R2 connection
python3 -c "from app.core.config.r2_config import r2_config; print(r2_config.validate_config())"
# Expected: (True, None)
```

---

## 4. How It Works

### Automatic Processing Flow

**When scraper runs:**
```
1. Fetch media from Instagram API
   ↓
2. Check database for existing R2 URLs
   - If exists: Skip upload, use existing URL (deduplication)
   - If not: Continue to step 3
   ↓
3. Download from Instagram CDN
   ↓
4. Compress media
   - Photos: 500KB → 300KB (JPEG 85%)
   - Videos: 10MB → 1.5MB (H.264 720p, QuickTime compatible)
   ↓
5. Upload to R2
   - Path: photos/2025/10/creator_id/media_pk_0.jpg
   - Path: videos/2025/10/creator_id/media_pk.mp4
   ↓
6. Store R2 URL in database
   - image_urls: ["https://media.b9dashboard.com/photos/..."]
   - video_url: "https://media.b9dashboard.com/videos/..."
```

### Folder Structure in R2
```
b9-instagram-media/
├── profile_pictures/
│   ├── 58710898123/
│   │   └── profile.jpg  (overwrites on each scrape)
│   ├── 45632110987/
│   │   └── profile.jpg
│   └── ...
├── photos/
│   ├── 2025/
│   │   ├── 10/
│   │   │   ├── 58710898123/  (creator_id)
│   │   │   │   ├── 3730331932190911171_0.jpg
│   │   │   │   ├── 3730331932190911171_1.jpg
│   │   │   │   └── 3730331932190911171_2.jpg
│   │   │   └── ...
│   │   └── 11/
│   └── ...
└── videos/
    ├── 2025/
    │   ├── 10/
    │   │   ├── 58710898123/
    │   │   │   ├── 3728882130354055892.mp4
    │   │   │   └── 3728164856336921193.mp4
    │   │   └── ...
    │   └── 11/
    └── ...
```

---

## 5. Monitoring & Costs

### Check Storage Usage
```bash
# Via Cloudflare Dashboard:
# R2 → b9-instagram-media → Storage usage

# Current month costs shown in real-time
```

### Cost Breakdown (10K Creators)
```
Storage Growth:
- Month 1:  1.47TB  = $22/month
- Month 6:  8.82TB  = $132/month
- Month 12: 17.6TB  = $265/month

Year 1 Total: ~$1,590
Year 2 Total: ~$3,180
Year 3 Total: ~$4,770

Pricing:
- Storage: $0.015/GB/month
- Egress: $0 (FREE unlimited bandwidth)
```

### Cost Alerts
Set up budget alerts in Cloudflare dashboard:
1. R2 → Settings → Billing
2. Add alert at $100/month
3. Add alert at $200/month

---

## 6. Testing

### Test Single Creator Upload
```python
# Run scraper on one creator to test R2
from app.scrapers.instagram.services.instagram_scraper import InstagramScraperUnified
from app.core.database import get_db

scraper = InstagramScraperUnified()
supabase = get_db()

# Get test creator
creator = supabase.table('instagram_creators')\
    .select('*')\
    .eq('username', 'sophieraiin')\
    .single()\
    .execute()

# Process creator (will upload to R2)
success = scraper.process_creator(creator.data)

# Check database for R2 URLs
posts = supabase.table('instagram_posts')\
    .select('image_urls')\
    .eq('creator_id', creator.data['ig_user_id'])\
    .limit(1)\
    .execute()

# Should see: https://media.b9dashboard.com/photos/...
print(posts.data[0]['image_urls'])
```

### Verify in Dashboard
1. Go to Cloudflare R2 dashboard
2. Browse bucket: `b9-instagram-media`
3. Check `photos/` and `videos/` folders
4. Files should appear with current date

---

## 7. Troubleshooting

### Error: "R2_ACCOUNT_ID not set"
**Fix:** Check `.env` file has all 5 R2 variables set

### Error: "FFmpeg compression failed"
**Fix:** Install FFmpeg on server
```bash
sudo apt-get install ffmpeg
```

### Error: "Failed to upload to R2"
**Fix:** Verify API credentials are correct
```python
from app.utils.media_storage import R2Client
client = R2Client().get_client()
# Should not error
```

### Images not appearing in dashboard
**Fix:** Check R2 public domain is configured
- Go to R2 bucket settings → Public access
- Verify `media.b9dashboard.com` is connected
- Check DNS CNAME record points to R2

### Compression taking too long
**Solution:** Compression adds ~5-10s per creator
- This is normal for video compression (H.265)
- Runs async, doesn't block other creators
- Can disable with `ENABLE_R2_STORAGE=false` if needed

---

## 8. Disabling R2 Storage

### Temporary Disable
```bash
# Set in .env:
ENABLE_R2_STORAGE=false

# Scraper will store Instagram CDN URLs (expire in 7-30 days)
```

### Permanent Disable
```bash
# 1. Disable in .env
ENABLE_R2_STORAGE=false

# 2. (Optional) Delete bucket in Cloudflare dashboard
# WARNING: This deletes all stored media permanently!
```

---

## 9. Migration Guide

### Backfill Existing Creators
```python
# Re-scrape existing creators to populate R2
from app.scrapers.instagram.services.instagram_scraper import InstagramScraperUnified
from app.core.database import get_db

scraper = InstagramScraperUnified()
supabase = get_db()

# Get all creators
creators = supabase.table('instagram_creators')\
    .select('*')\
    .execute()

# Process each (will upload to R2)
for creator in creators.data:
    print(f"Processing {creator['username']}...")
    scraper.process_creator(creator)

print(f"✅ Migrated {len(creators.data)} creators to R2")
```

**Time estimate:** ~2 hours for 414 creators

---

## 10. Performance Impact

### Before R2 (CDN URLs only):
- Scraper time: ~8s per creator
- Database: CDN URLs (expire after 30 days)

### After R2 (permanent storage):
- **First scrape:** ~15s per creator (+7s for compression/upload)
- **Re-scrape (deduplication):** ~5s per creator (skips upload, 67% faster)
- Database: R2 URLs (permanent, never expire)

### Video Compression Details:
- **Codec:** H.264 (libx264) - QuickTime/Safari compatible
- **Resolution:** 720p (maintains aspect ratio)
- **Quality:** CRF 23 (high quality)
- **Size reduction:** 50-60% typical (3.4MB → 1.5MB)
- **Time:** ~3-5s per video

**Deduplication Benefits:**
- Automatically skips upload if R2 URL exists in database
- Saves bandwidth and processing time on subsequent scrapes
- 67% time savings on re-scrapes

---

## Support

**Issues?**
1. Check logs: `tail -f logs/instagram_scraper.log`
2. Verify configuration: `python3 -c "from app.core.config.r2_config import r2_config; print(r2_config.validate_config())"`
3. Test upload: Run test script from section 6

**Cloudflare Support:**
- Dashboard: https://dash.cloudflare.com/
- Docs: https://developers.cloudflare.com/r2/
- Community: https://community.cloudflare.com/
