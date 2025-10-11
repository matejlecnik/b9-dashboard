# Instagram AI Tagging System - Production Guide

## Overview

Automated visual attribute tagging for Instagram creators using **Gemini 2.5 Flash** vision AI.

**Model:** `gemini-2.5-flash`
**Prompt Version:** v2.1 (High Confidence - all attributes ≥0.75)
**Cost:** ~$0.0013 per creator
**Processing Time:** ~20 seconds per creator (sequential)

## What It Does

Analyzes Instagram creator profile pictures and posts to assign visual attribute tags:

- **Body attributes**: body_type, breasts, butt
- **Appearance**: hair_color, hair_length, style, age_appearance
- **Features**: tattoos, piercings, ethnicity

All tags include confidence scores (minimum 0.75).

## Files

```
backend/
├── migrations/
│   └── add_instagram_tags_fields.sql      # Database schema migration
├── scripts/
│   ├── tag_instagram_creators.py          # Main tagging script
│   ├── deploy_tagging.sh                  # Deployment helper
│   └── INSTAGRAM_TAGGING_README.md        # This file
└── requirements.txt                        # Updated with AI dependencies
```

## Quick Start

### 1. Setup (First Time)

```bash
cd backend
./scripts/deploy_tagging.sh setup
```

This will:
- Install dependencies (`google-generativeai`, `Pillow`, etc.)
- Run database migration (adds tag columns)
- Verify environment variables

### 2. Test with Dry Run

```bash
./scripts/deploy_tagging.sh dry-run 5
```

Process 5 creators without saving to database (test mode).

### 3. Run Production

```bash
# Process all untagged creators
./scripts/deploy_tagging.sh run

# Process only 50 creators
./scripts/deploy_tagging.sh run 50

# Use 5 parallel workers
./scripts/deploy_tagging.sh parallel 5

# Use 10 workers for 100 creators
./scripts/deploy_tagging.sh parallel 10 100
```

## Environment Variables Required

Add to `backend/.env`:

```bash
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Google AI
GOOGLE_API_KEY=your-google-api-key
```

## Database Schema

Migration adds these columns to `instagram_creators`:

```sql
body_tags          text[]        -- Array of tags (e.g., ['body_type:curvy', 'hair_color:blonde'])
tag_confidence     jsonb         -- Confidence scores (e.g., {"body_type": 0.9, "breasts": 0.95})
tags_analyzed_at   timestamptz   -- When tagging was performed
model_version      text          -- Model used (e.g., 'gemini-2.5-flash-v2.1')
```

## Processing Logic

1. **Fetch creators**: `review_status='ok'` AND `body_tags IS NULL`
2. **Get images**: 1 profile pic + up to 4 recent posts
3. **Call Gemini**: Analyze with prompt v2.1
4. **Validate**: All confidence scores ≥ 0.75
5. **Save**: Tags + confidence + timestamp to database

### Image Handling

- Works with both R2 CDN and Instagram CDN images
- For carousel posts: takes first image only
- Fetches recent posts sorted by date
- Skips videos (needs image_urls)

## Cost Estimation

| Creators | Cost   | Time (1 worker) | Time (5 workers) | Time (10 workers) |
|----------|--------|-----------------|------------------|-------------------|
| 10       | $0.01  | ~3 min          | ~1 min           | ~30 sec           |
| 50       | $0.07  | ~17 min         | ~4 min           | ~2 min            |
| 89       | $0.12  | ~30 min         | ~6 min           | ~3 min            |
| 1000     | $1.30  | ~5.5 hrs        | ~1.1 hrs         | ~35 min           |

## Command Reference

### Direct Python Usage

```bash
cd backend

# Basic usage
python3 scripts/tag_instagram_creators.py

# With options
python3 scripts/tag_instagram_creators.py --limit 20 --dry-run
python3 scripts/tag_instagram_creators.py --workers 5
python3 scripts/tag_instagram_creators.py --workers 10 --limit 100
```

### Deployment Script Usage

```bash
# Setup
./scripts/deploy_tagging.sh setup

# Dry run
./scripts/deploy_tagging.sh dry-run [limit]

# Production
./scripts/deploy_tagging.sh run [limit]

# Parallel
./scripts/deploy_tagging.sh parallel <workers> [limit]

# Help
./scripts/deploy_tagging.sh help
```

## Logging

Progress is logged to three destinations:
- **Console**: Real-time output (stdout)
- **File**: `tagging_progress.log` (in backend directory)
- **Supabase**: `system_logs` table (database logging)

Log format:
```
2025-10-11 12:00:00 - INFO - [1/89] username
2025-10-11 12:00:20 - INFO - ✅ username: 10 tags | $0.0013 | 18.5s
```

### Supabase Logging

All progress logs are automatically saved to the `system_logs` table in Supabase with rich context data. This allows you to:
- ✅ Query tagging progress remotely from anywhere
- ✅ Monitor long-running jobs without server access
- ✅ Audit trail of all tagging operations
- ✅ Integrated with existing Instagram scraper logs

#### Query Logs in Real-Time

```sql
-- View recent tagging logs
SELECT timestamp, level, message, context
FROM system_logs
WHERE source = 'instagram_ai_tagger'
ORDER BY timestamp DESC
LIMIT 50;

-- Count successful tags today
SELECT COUNT(*)
FROM system_logs
WHERE source = 'instagram_ai_tagger'
  AND message LIKE '%✅%'
  AND timestamp >= CURRENT_DATE;

-- View only errors
SELECT timestamp, message, context
FROM system_logs
WHERE source = 'instagram_ai_tagger'
  AND level = 'ERROR'
ORDER BY timestamp DESC;

-- Get tagging statistics from logs
SELECT
  COUNT(*) FILTER (WHERE context->>'action' = 'tag_creator_success') as successful,
  COUNT(*) FILTER (WHERE context->>'action' = 'tag_creator_failed') as failed,
  ROUND(AVG((context->>'cost')::numeric), 4) as avg_cost,
  ROUND(AVG((context->>'response_time')::numeric), 1) as avg_time
FROM system_logs
WHERE source = 'instagram_ai_tagger'
  AND timestamp >= CURRENT_DATE;

-- View completion summary
SELECT message, context
FROM system_logs
WHERE source = 'instagram_ai_tagger'
  AND context->>'action' = 'tagging_complete'
ORDER BY timestamp DESC
LIMIT 5;
```

#### Monitor Progress Remotely

You can track tagging progress from the Supabase dashboard or any SQL client:

```sql
-- Watch live progress (run repeatedly or use as a view)
SELECT
  COUNT(*) as total_processed,
  COUNT(*) FILTER (WHERE level = 'INFO' AND message LIKE '%✅%') as successful,
  COUNT(*) FILTER (WHERE level = 'ERROR') as errors,
  MAX(timestamp) as last_activity
FROM system_logs
WHERE source = 'instagram_ai_tagger'
  AND timestamp >= NOW() - INTERVAL '1 hour';
```

## Error Handling

The script handles:
- ✅ Missing images (skips creator)
- ✅ Network failures (retries)
- ✅ JSON parse errors (logs and continues)
- ✅ Database errors (logs and continues)
- ✅ Rate limiting (adds delays)

Failed creators are logged but don't stop execution.

## Resumability

The script is **fully resumable**:
- Only processes creators with `body_tags IS NULL`
- Safe to stop and restart anytime
- Automatically skips already-tagged creators

## Querying Tagged Creators

```sql
-- Get all tagged creators
SELECT username, body_tags, tag_confidence, tags_analyzed_at
FROM instagram_creators
WHERE body_tags IS NOT NULL;

-- Search by specific tag
SELECT username, body_tags, followers_count
FROM instagram_creators
WHERE 'body_type:curvy' = ANY(body_tags);

-- Get tagging statistics
SELECT
  COUNT(*) FILTER (WHERE body_tags IS NOT NULL) as tagged,
  COUNT(*) FILTER (WHERE body_tags IS NULL) as untagged,
  COUNT(*) as total
FROM instagram_creators
WHERE review_status = 'ok';
```

## Monitoring Progress

```bash
# Watch live progress
tail -f tagging_progress.log

# Count tagged creators
psql $SUPABASE_URL -c "SELECT COUNT(*) FROM instagram_creators WHERE body_tags IS NOT NULL;"

# Check remaining
psql $SUPABASE_URL -c "SELECT COUNT(*) FROM instagram_creators WHERE review_status='ok' AND body_tags IS NULL;"
```

## Troubleshooting

### "GOOGLE_API_KEY not set"
Add `GOOGLE_API_KEY=your-key` to `backend/.env`

### "Supabase credentials not configured"
Add `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` to `backend/.env`

### "No creators to process"
Either:
- All creators already tagged (check with `WHERE body_tags IS NOT NULL`)
- No creators with `review_status='ok'` (check with `WHERE review_status='ok'`)

### "Failed to load image"
- Image URL expired (Instagram CDN)
- Network issue
- Script will skip and continue with next creator

### Migration fails
Column might already exist. Check with:
```sql
SELECT column_name FROM information_schema.columns
WHERE table_name='instagram_creators' AND column_name='body_tags';
```

## Production Recommendations

1. **Test first**: Always run `--dry-run` with small `--limit`
2. **Use parallel workers**: 5-10 workers for best performance
3. **Monitor logs**: Watch `tagging_progress.log` for errors
4. **Check costs**: View total cost in final summary
5. **Backup database**: Before first production run

## Success Metrics

After completion, check:
- ✅ Success rate (should be >95%)
- ✅ Average confidence scores (should be ≥0.75)
- ✅ Total cost matches estimate
- ✅ All creators have timestamps

```sql
SELECT
  COUNT(*) as total_tagged,
  ROUND(AVG((tag_confidence->>'body_type')::numeric), 2) as avg_body_confidence,
  ROUND(AVG((tag_confidence->>'breasts')::numeric), 2) as avg_breasts_confidence,
  MIN(tags_analyzed_at) as first_tagged,
  MAX(tags_analyzed_at) as last_tagged
FROM instagram_creators
WHERE body_tags IS NOT NULL;
```

## Support

For issues or questions:
1. Check logs: `tagging_progress.log`
2. Verify environment: `./scripts/deploy_tagging.sh setup`
3. Test with dry-run: `./scripts/deploy_tagging.sh dry-run 1`

---

**Version:** 1.0
**Last Updated:** 2025-10-11
**Model:** gemini-2.5-flash
**Prompt:** v2.1 (High Confidence)
