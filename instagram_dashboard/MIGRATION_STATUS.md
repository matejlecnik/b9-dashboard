# Instagram Data Migration Status

## Current Situation
- **Source**: Old Supabase project with 85 creators, 7,897 reels, and 9 niche groups
- **Destination**: New B9 Dashboard Supabase project with empty Instagram tables
- **Progress**: Tables created in new project, ready for data migration

## Source Data (Old Project)
- **URL**: `https://tjizsljxigpouniafthi.supabase.co`
- **Service Key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRqaXpzbGp4aWdwb3VuaWFmdGhpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTk2MDQ2NSwiZXhwIjoyMDcxNTM2NDY1fQ.uKmhDnAn1L2SkA-zFUbIXud8EK3HcsgEVq19EHWGZ_4`

### Data Volumes:
- **creators table**: 85 records
- **reels table**: 7,897 records
- **niche_groups table**: 9 records

### Old Table Fields:

**creators**:
```
ig_user_id, username, full_name, fbid, eimu_id, biography, external_url,
profile_pic_url, profile_pic_url_hd, category_name, is_business_account,
is_professional_account, is_private, is_verified, followers, following,
posts_count, highlight_reel_count, has_clips, has_guides, has_channel,
has_onboarded_to_text_post_app, show_account_transparency_details,
show_text_post_app_badge, bio_links, raw_profile_json, created_at,
updated_at, id, reels_count, total_views, avg_views_per_reel,
avg_reel_length_sec, avg_engagement, last_reels_rollup_at,
niche_group_id, oc, models
```

**reels**:
```
media_pk, media_id, shortcode, creator_id, creator_username, product_type,
taken_at, caption_text, original_width, original_height, has_audio,
video_duration, play_count, ig_play_count, like_count, comment_count,
save_count, share_count, pinned_in_reels_tab, video_urls, cover_url,
audio_type, music_canonical_id, original_audio_title, audio_asset_id,
audio_best_cluster_id, ig_artist_id, ig_artist_username, permalink,
raw_media_json, created_at, updated_at
```

**niche_groups**:
```
id (text), label, created_at
```

## Destination (New B9 Dashboard Project)
- **URL**: Your B9 Dashboard Supabase URL
- **Service Key**: Your B9 Dashboard service role key

### New Tables Created:
1. `instagram_niche_groups` - With UUID IDs and additional fields
2. `instagram_creators` - All fields from old + properly structured
3. `instagram_reels` - All core fields preserved
4. `instagram_creator_reel_stats` - View for analytics

## Migration Tasks Remaining

### 1. Field Mapping Issues to Handle:
- **niche_groups → instagram_niche_groups**:
  - Old `id` is text, new `id` is UUID
  - Need to create mapping table during migration

- **creators → instagram_creators**:
  - Extra fields in old: `oc`, `models` (can be added to new schema if needed)
  - `niche_group_id` needs mapping from old text to new UUID

- **reels → instagram_reels**:
  - Extra fields in old: `save_count`, `share_count` (can be added if needed)
  - Otherwise fully compatible

### 2. Next Steps:
1. **Create migration script** that:
   - Connects to both Supabase instances
   - Creates ID mapping for niche_groups (old text ID → new UUID)
   - Migrates niche_groups first
   - Migrates creators with mapped niche_group_id
   - Migrates reels in batches (500 at a time)
   - Updates creator stats after migration

2. **Add missing fields** (optional):
   ```sql
   -- Add to instagram_creators if needed:
   ALTER TABLE instagram_creators ADD COLUMN oc TEXT;
   ALTER TABLE instagram_creators ADD COLUMN models TEXT[];

   -- Add to instagram_reels if needed:
   ALTER TABLE instagram_reels ADD COLUMN save_count INTEGER DEFAULT 0;
   ALTER TABLE instagram_reels ADD COLUMN share_count INTEGER DEFAULT 0;
   ```

3. **Run migration** with progress tracking

## Files Created:
- `add-new-creator-to-supabase.py` - Updated for new tables
- `reels-scraper.py` - Updated for new tables
- `profile-tracker.py` - Converted to use Supabase
- `always-on-scraper.py` - Updated paths
- `.env.example` - Template for credentials
- `check_old_data_service.py` - Verification script

## Command to Continue:
In new terminal, navigate to:
```bash
cd /Users/matejlecnik/Desktop/b9_agency/b9_dashboard/instagram_dashboard
```

Then create the final migration script to transfer all data from old to new project.