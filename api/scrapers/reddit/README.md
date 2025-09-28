# 🚀 Reddit Scraper v3.0 - Enhanced Batch Processing Architecture

## 🏗️ NEW ARCHITECTURE - Sub-Batch Processing with User Enrichment

### 🎯 Core Concept: Process 50 Subreddits in 5 Sub-Batches of 10
To manage memory efficiently and write data progressively, we process 50 subreddits as 5 sub-batches of 10 each. User enrichment and discovery happen after all 50 are collected.

### 🔄 The Complete Batch Cycle

```
FULL BATCH: 50 SUBREDDITS
         │
         ├── SUB-BATCHES (5 iterations of 10 subreddits)
         │   │
         │   ├── SUB-BATCH 1-5: Process 10 subreddits each
         │   │   ├── Scrape subreddits (hot/weekly/yearly posts)
         │   │   ├── Extract ALL users for foreign keys
         │   │   ├── Track HOT post users for later enrichment
         │   │   ├── Calculate engagement metrics
         │   │   └── WRITE: subreddits → users → posts
         │   │
         │   └── Accumulate HOT users across all sub-batches
         │
         ├── PHASE 2: USER ENRICHMENT (After all 50)
         │   ├── Take top 500 HOT post users
         │   ├── Scrape full profiles (karma, age, verified)
         │   ├── Analyze their posting history
         │   └── Discover NEW subreddits from their activity
         │
         ├── PHASE 3: DISCOVERY PROCESSING
         │   ├── Quick-scrape top 20 discoveries
         │   ├── Evaluate based on subscriber count (>1000)
         │   └── Write promising discoveries
         │
         └── Queue remaining discoveries for next batch
```

### 📝 CRITICAL: Only HOT Post Users Get Enrichment
- **HOT posts**: Users extracted AND enriched with full profiles
- **Weekly/Yearly posts**: Users extracted for foreign keys ONLY (no enrichment)

## 📊 Data Collection Strategy

### Per Sub-Batch (10 Subreddits)
```yaml
Subreddits Processed: 10
Posts Collected: ~1,500 (150 per subreddit avg)
Users Extracted: ~400-600 unique
HOT Post Users Tracked: ~100-200 (accumulated)
Memory Usage: ~10-20MB max
Write Operations: 3 sequential (subreddits → users → posts)
```

### Per Full Batch (50 Subreddits Total)
```yaml
Total Subreddits: 50
Total Posts: ~7,500
Total Users: ~2,000-3,000
HOT Users for Enrichment: Top 500
New Subreddits Discovered: ~100-500
User Profiles Scraped: 500 (HOT users only)
Sub-Batch Writes: 15 (5 sub-batches × 3 operations)
```

### Memory-Efficient Pipeline
```
1. Process 10 subreddits → Write immediately → Clear buffers
2. Repeat 5 times (50 total)
3. Enrich top 500 HOT users with full profiles
4. Discover new subreddits from enriched users
5. Write discoveries and enriched user data
```

## 🔧 Implementation Plan

### Phase 1: Sub-Batch Collection 🚧 IN PROGRESS
```python
# New sub-batch implementation
SUB_BATCH_SIZE = 10
full_batch_hot_users = {}  # Accumulate HOT users across all sub-batches

# Process 5 sub-batches of 10 subreddits each
for batch_num in range(5):  # 5 × 10 = 50
    sub_batch_subreddits = []
    sub_batch_all_users = {}
    sub_batch_posts = []

    # Process 10 subreddits
    for subreddit in batch_slice:
        data = scrape_subreddit()
        sub_batch_subreddits.append(data)

        # HOT posts - track users for enrichment
        for post in data['hot_posts']:
            author = post['author']
            full_batch_hot_users[author] = {'username': author, 'post_count': 0}
            full_batch_hot_users[author]['post_count'] += 1
            sub_batch_all_users[author] = {'username': author}  # Basic for FK
            sub_batch_posts.append(post)

        # Weekly/Yearly posts - basic users only
        for post in data['weekly_posts'] + data['yearly_posts']:
            sub_batch_all_users[post['author']] = {'username': post['author']}
            sub_batch_posts.append(post)

    # Write sub-batch immediately
    await write_subreddits(sub_batch_subreddits)
    await write_users(sub_batch_all_users)
    await write_posts(sub_batch_posts)
```

### Phase 2: User Enrichment 🚧 TO IMPLEMENT
```python
# After all 50 subreddits collected
async def enrich_hot_users(full_batch_hot_users):
    enriched_users = {}
    discovered_subreddits = set()

    # Sort by activity (post count in this batch)
    top_users = sorted(full_batch_hot_users.items(),
                      key=lambda x: x[1]['post_count'],
                      reverse=True)[:500]

    for username, _ in top_users:
        # Use existing UserScraper
        user_scraper = UserScraper(supabase, thread_id)
        result = await user_scraper.scrape(username)

        if result['success']:
            enriched_users[username] = result['user_data']

            # Track discoveries
            for sub in result['discovered_subreddits']:
                discovered_subreddits.add(sub['name'])

    return enriched_users, discovered_subreddits
```

### Phase 3: Discovery Processing 🚧 TO IMPLEMENT
```python
# Process newly discovered subreddits
async def process_discoveries(discovered_subreddits):
    processed_discoveries = []

    # Quick-scrape top 20
    for subreddit in list(discovered_subreddits)[:20]:
        scraper = SubredditScraper(supabase, thread_id)
        quick_data = await scraper.quick_scrape(subreddit)

        if quick_data['subscribers'] > 1000:
            processed_discoveries.append({
                'name': subreddit,
                'subscribers': quick_data['subscribers'],
                'over18': quick_data['over18'],
                'discovered_from_batch': True,
                'created_at': datetime.now().isoformat()
            })

    # Write discoveries
    if processed_discoveries:
        await write_subreddits(processed_discoveries)

    # Queue remaining for next batch
    remaining = list(discovered_subreddits)[20:]
    if remaining:
        await queue_for_next_batch(remaining)
```

### Phase 4: Enhanced Write Methods ✅ READY
```python
async def write_subreddits(subreddits, chunk_size=50):
    for i in range(0, len(subreddits), chunk_size):
        chunk = subreddits[i:i+chunk_size]
        supabase.table('reddit_subreddits').upsert(chunk, on_conflict='name')

async def write_users(users, chunk_size=100):
    users_list = list(users.values()) if isinstance(users, dict) else users
    for i in range(0, len(users_list), chunk_size):
        chunk = users_list[i:i+chunk_size]
        supabase.table('reddit_users').upsert(chunk, on_conflict='username')

async def write_posts(posts, chunk_size=100):
    for i in range(0, len(posts), chunk_size):
        chunk = posts[i:i+chunk_size]
        supabase.table('reddit_posts').upsert(chunk, on_conflict='reddit_id')
```

## 📈 Expected Improvements

### Before (Current v2.0)
- **Processing**: Sequential phases (subreddits → users → discovery)
- **User Data**: Basic info only (username)
- **Discovery**: Happens after all subreddits processed
- **Efficiency**: Many small writes
- **Growth**: Linear, predictable

### After (v3.0)
- **Processing**: Integrated batch cycles
- **User Data**: Full profiles with karma, age, verification
- **Discovery**: Continuous within each batch
- **Efficiency**: 3 large writes per 50 subreddits
- **Growth**: Exponential through discovery feedback loop

## 🎯 Key Benefits

1. **Richer Data**
   - Full user profiles instead of just usernames
   - User quality metrics for better scoring
   - Verification status and account age

2. **Continuous Discovery**
   - Find new subreddits with every batch
   - Self-reinforcing growth
   - No separate discovery phase needed

3. **Better Relationships**
   - Track user-subreddit connections
   - Identify power users and influencers
   - Build network graph of relationships

4. **Efficiency**
   - Everything in one pass
   - Minimized API calls through batching
   - Reduced database writes

## 📊 Metrics & Monitoring

### Per-Batch Metrics
```yaml
batch_id: UUID
batch_number: Sequential
subreddits_processed: 50
posts_collected: Count
users_extracted: Count
users_enriched: Count
new_discoveries: Count
write_time_ms: Duration
total_time_ms: Duration
memory_usage_mb: Peak
errors: List
```

### Success Criteria
- ✅ All posts have valid user references
- ✅ No foreign key violations
- ✅ Continuous discovery of new subreddits
- ✅ User profiles properly enriched
- ✅ Memory usage stays under limits

## 🚦 Implementation Status

### ✅ Completed
- [x] Batch collection architecture design
- [x] User extraction from posts
- [x] Proper write ordering (subreddits → users → posts)
- [x] Foreign key constraint handling
- [x] README documentation updated with v3.0 plan

### 🚧 In Progress
- [ ] Sub-batch processing (10 subreddits at a time)
- [ ] Separate HOT user tracking for enrichment
- [ ] UserScraper integration for profiles

### 📋 TODO
- [ ] Implement sub-batch collection logic
- [ ] Add HOT user accumulation across sub-batches
- [ ] Integrate UserScraper for enrichment
- [ ] Add discovery processing from enriched users
- [ ] Create quick-scrape for discovered subreddits
- [ ] Add discovery queue management
- [ ] Implement batch metrics tracking
- [ ] Add checkpoint/resume capability

## 🔒 Data Integrity Rules

### Write Order (CRITICAL)
1. **Subreddits** - Must exist before posts reference them
2. **Users** - Must exist before posts reference them
3. **Posts** - Written last with all references valid

### Unique Constraints
- Subreddits: `name` (upsert on conflict)
- Users: `username` (upsert on conflict)
- Posts: `reddit_id` (upsert on conflict)

### Never Overwrite
- `review` - Manual categorization
- `primary_category` - Manual assignment
- `tags` - Manual tagging

## 🛠️ Configuration

### Batch Processing
```python
FULL_BATCH_SIZE = 50  # Total subreddits per full batch
SUB_BATCH_SIZE = 10  # Subreddits per sub-batch (5 sub-batches total)
USER_ENRICH_LIMIT = 500  # Max HOT users to enrich after full batch
DISCOVERY_QUICK_LIMIT = 20  # Max discoveries to quick-scrape
WRITE_CHUNK_SIZE = 100  # Records per database write operation
```

### Processing Priorities
```python
# User prioritization for enrichment
PRIORITY_FACTORS = {
    'post_count': 0.4,
    'recent_activity': 0.3,
    'subreddit_diversity': 0.3
}

# Discovery evaluation criteria
DISCOVERY_THRESHOLD = {
    'min_subscribers': 1000,
    'min_posts_per_day': 5,
    'max_over18': True  # Process NSFW
}
```

## 🐛 Current Issues & Fixes

### Issue: Posts being written before users
**Status**: ✅ FIXED
**Solution**: Batch processing with proper write ordering

### Issue: User data is minimal
**Status**: 🚧 IN PROGRESS
**Solution**: Implementing user profile enrichment

### Issue: Discovery happens too late
**Status**: 🚧 IN PROGRESS
**Solution**: Integrating discovery into each batch

## 🚀 Quick Commands

### Monitor Batch Processing
```sql
-- Check latest batch progress
SELECT
    message,
    context->>'batch_number' as batch,
    context->>'subreddits_processed' as subs,
    context->>'users_enriched' as users,
    context->>'new_discoveries' as discoveries
FROM system_logs
WHERE source = 'reddit_scraper'
AND message LIKE '%Batch % completed%'
ORDER BY timestamp DESC
LIMIT 10;
```

### Check Discovery Pipeline
```sql
-- See newly discovered subreddits
SELECT
    name,
    discovered_at,
    discovered_from_user,
    subscriber_count
FROM reddit_discoveries
WHERE discovered_at > NOW() - INTERVAL '1 hour'
ORDER BY subscriber_count DESC;
```

### User Enrichment Status
```sql
-- Check enriched vs basic users
SELECT
    COUNT(*) FILTER (WHERE link_karma IS NOT NULL) as enriched,
    COUNT(*) FILTER (WHERE link_karma IS NULL) as basic_only,
    COUNT(*) as total
FROM reddit_users
WHERE created_at > NOW() - INTERVAL '1 day';
```

## 📝 Notes for Implementation

### Memory Management
- Process users in chunks to avoid memory overflow
- Clear buffers after each batch write
- Monitor memory usage throughout cycle

### API Rate Limiting
- User profile scraping is expensive (1 request per user)
- Implement adaptive throttling based on rate limit feedback
- Cache user profiles for 24 hours minimum

### Database Optimization
- Use COPY instead of INSERT for large batches
- Consider partitioning posts table by date
- Add indexes for discovery queries

## 🎯 Next Steps

1. **Immediate**: Fix user profile enrichment
2. **Next**: Integrate discovery processing
3. **Future**: Add ML-based subreddit evaluation
4. **Long-term**: Graph database for relationship mapping

---

*Last Updated: 2024-12-28*
*Architecture Version: 3.0 (Enhanced Batch Processing)*
*Status: 🚧 UNDER DEVELOPMENT*