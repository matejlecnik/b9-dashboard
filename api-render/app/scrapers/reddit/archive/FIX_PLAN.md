# 🚨 CRITICAL FIX PLAN - Reddit Scraper Issues

## 📊 Issues Discovered (Last 5 Minutes Analysis)

### 1. ❌ **DUPLICATE PROCESSING** (Critical)
Subreddits are being processed TWICE with different cases:
- `r/MyTeenGirl` AND `r/myteengirl` (same subreddit, different threads)
- `r/GothStyle` AND `r/gothstyle`
- `r/Goon_Galaxy` AND `r/goon_galaxy`
- `r/ThickThighs` AND `r/thickthighs`
- `r/TheArtOfTheTease` AND `r/theartofthetease`

**Root Cause**: Database has mixed case subreddit names, causing duplicates

### 2. ❌ **POSTS NOT SAVING** (Critical)
All posts failing with two errors:
- `PGRST102: All object keys must match` - Posts have inconsistent field sets
- `ON CONFLICT DO UPDATE command cannot affect row a second time` - Duplicate reddit_ids

**Root Cause**: Line 1039 removes None values, creating inconsistent schemas

### 3. ✅ **PARALLEL PROCESSING WORKING**
- Batch 1: 88.7 seconds (10 subreddits)
- Batch 2: ~65 seconds (10 subreddits)
- Performance improved but duplicates waste resources

### 4. ❌ **NO SUBREDDITS BEING SAVED**
- Writing "0 subreddits" in every batch
- Only users and posts being attempted (posts fail)

## 🔧 REQUIRED FIXES

### Fix 1: Normalize Subreddit Names (PRIORITY 1)
**Location**: `load_target_subreddits()` in main.py

```python
# When loading subreddits from database
for subreddit in ok_response.data:
    # Normalize the name to lowercase
    subreddit['name'] = subreddit['name'].lower()
    subreddit['display_name'] = subreddit.get('display_name', subreddit['name'])
```

**Also fix**: In database query to prevent future issues:
```sql
-- Update all subreddit names to lowercase
UPDATE reddit_subreddits
SET name = LOWER(name)
WHERE name != LOWER(name);
```

### Fix 2: Consistent Post Schema (PRIORITY 1)
**Location**: `process_single_subreddit()` line 1021-1039

```python
# REMOVE this line that causes inconsistent schemas:
# cleaned_post = {k: v for k, v in cleaned_post.items() if v is not None}

# Instead, ensure ALL posts have ALL fields:
cleaned_post = {
    'reddit_id': post.get('reddit_id'),
    'title': post.get('title'),
    'author_username': post.get('author'),
    'subreddit_name': post.get('subreddit'),
    'score': post.get('score', 0),
    'upvote_ratio': post.get('upvote_ratio', 0),
    'num_comments': post.get('num_comments', 0),
    'created_utc': post.get('created_utc'),
    'url': post.get('url'),
    'selftext': post.get('selftext'),
    'is_video': post.get('is_video', False),
    'link_flair_text': post.get('link_flair_text'),
    'over_18': post.get('over_18', False),
    'created_at': datetime.now(timezone.utc).isoformat(),
    # Add default values for missing database columns
    'is_self': post.get('is_self', False),
    'spoiler': post.get('spoiler', False),
    'stickied': post.get('stickied', False),
    'locked': post.get('locked', False),
    'gilded': post.get('gilded', 0),
    'distinguished': post.get('distinguished'),
    'archived': post.get('archived', False),
    'edited': post.get('edited', False)
}
# DO NOT remove None values - keep consistent schema
```

### Fix 3: Deduplicate Posts Before Writing
**Location**: `batch_write_parallel_data()` line 1097

```python
# Before writing posts, deduplicate by reddit_id
if batch_posts:
    # Remove duplicates
    seen_ids = set()
    unique_posts = []
    for post in batch_posts:
        if post['reddit_id'] not in seen_ids:
            seen_ids.add(post['reddit_id'])
            unique_posts.append(post)

    logger.info(f"Deduplication: {len(batch_posts)} -> {len(unique_posts)} posts")
    batch_posts = unique_posts
```

### Fix 4: Save Subreddit Metadata
**Location**: `process_single_subreddit()` line 991

The subreddit_data is being created but never added to batch_subreddits_data when it's not None.

```python
# After line 1002
if response_data['subreddit_data']:
    # Make sure this is actually being collected
    pass  # Check if parent function is collecting this properly
```

## 📝 Implementation Order

1. **IMMEDIATE**: Fix duplicate processing (Fix 1)
   - Normalize all subreddit names to lowercase
   - Run database update to fix existing data

2. **IMMEDIATE**: Fix post saving (Fix 2 & 3)
   - Remove the None filter line
   - Add all required fields with defaults
   - Deduplicate posts before batch write

3. **TEST**: After fixes, verify:
   - No duplicate processing in logs
   - Posts successfully saving to database
   - Subreddit metadata being saved

## 🎯 Expected Results After Fix

- **Processing time**: ~60-90 seconds per 10 subreddits
- **No duplicates**: Each subreddit processed once
- **Posts saved**: 150-160 posts per subreddit successfully saved
- **Data integrity**: All posts have consistent schema
- **Efficiency**: 50% reduction in API calls (no duplicates)

## 📊 Verification Queries

```sql
-- Check for duplicate processing
SELECT name, COUNT(*)
FROM reddit_subreddits
GROUP BY LOWER(name)
HAVING COUNT(*) > 1;

-- Verify posts are being saved
SELECT COUNT(*) as posts_last_5min
FROM reddit_posts
WHERE created_at >= NOW() - INTERVAL '5 minutes';

-- Check for case issues
SELECT name
FROM reddit_subreddits
WHERE name != LOWER(name)
LIMIT 10;
```

## ⚠️ Warning

The current setup is processing 2326 subreddits but with duplicates, it's actually processing ~3000+ API calls. This fix will:
- Reduce API calls by ~30%
- Improve speed by ~30%
- Fix data integrity issues
- Enable proper post collection

## 🚀 Deployment Steps

1. Stop scraper: `curl -X POST https://b9-dashboard.onrender.com/api/scraper/stop`
2. Apply fixes to main.py
3. Run database normalization query
4. Deploy to Render
5. Start scraper: `curl -X POST https://b9-dashboard.onrender.com/api/scraper/start`
6. Monitor logs for success