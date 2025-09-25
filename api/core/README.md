# Core - Scraper Implementations

## Overview
This directory contains the core scraper implementations that run 24/7 to collect data from Reddit and Instagram.

## Files

### continuous_scraper.py
**Reddit Continuous Scraper**
- Runs indefinitely, checking database every 30 seconds
- Controlled via `system_control` table (`script_name='reddit_scraper'`)
- Multi-account support with proxy rotation
- Auto-discovers new subreddits from user posts
- Logs all operations to `system_logs` table

**How it works:**
1. Checks `enabled` field in database
2. If enabled: runs scraping cycle
3. If disabled: waits 30 seconds and checks again
4. Updates heartbeat timestamp to show it's alive

### continuous_instagram_scraper.py
**Instagram Continuous Scraper**
- Runs indefinitely, checking database every 30 seconds
- Controlled via `system_control` table (`script_name='instagram_scraper'`)
- Fetches posts and reels from tracked creators
- Uses ThreadPoolExecutor for concurrent API calls (60 workers)
- Rate limited to 60 requests/second

**How it works:**
1. Same polling pattern as Reddit scraper
2. Processes creators in batches of 300
3. Saves new posts/reels to `instagram_posts` table
4. Tracks API usage and success rates

### reddit_scraper.py
**Core Reddit API Logic**
- `PublicRedditAPI` class for direct Reddit access
- `ProxyEnabledMultiScraper` for proxy rotation
- Handles authentication, rate limiting, error recovery
- Parses Reddit JSON responses
- Calculates quality scores for subreddits

## Control Mechanism

Both scrapers use the same control pattern:
```python
while True:
    enabled = check_database_status()
    if enabled:
        run_scraping_cycle()
    await asyncio.sleep(30)  # Check every 30 seconds
```

## Auto-Start on Deployment

When the API starts (via `start.py`):
1. Checks if scrapers are enabled in database
2. Launches subprocess for each enabled scraper
3. Scrapers run independently of main API process

## Database Tables Used

- `system_control` - Enable/disable control
- `system_logs` - All logging output
- `reddit_posts` - Reddit post data
- `reddit_users` - Reddit user data
- `instagram_creators` - Instagram accounts to track
- `instagram_posts` - Instagram content data

## Performance Considerations

- Reddit: ~100 requests/minute per account
- Instagram: ~60 requests/second total
- Memory usage: ~200-300MB per scraper
- CPU: Low, mostly I/O bound

## Important Notes

1. **Never manually restart scrapers** - They run continuously
2. **Control via database only** - Use API endpoints or direct SQL
3. **Check logs in Supabase** - All output goes to `system_logs`
4. **30-second delay is optimal** - Don't reduce polling interval
5. **Scrapers are resilient** - They auto-recover from errors

## TODO List

- [ ] Implement scraper health metrics endpoint
- [ ] Add configurable polling intervals via database
- [ ] Create scraper performance dashboard
- [ ] Implement automatic proxy rotation on failures
- [ ] Add retry logic with exponential backoff
- [ ] Create data validation layer for scraped content

## Current Errors

- **Reddit rate limiting** - Occasionally hits rate limits during peak hours (auto-recovers)
- **Instagram API changes** - Instagram frequently changes their API structure (monitoring required)
- **Memory usage** - Can grow over time if not properly managed (restart helps)

## Potential Improvements

- **Async everything** - Convert remaining sync code to async (performance boost)
- **Connection pooling** - Implement proper HTTP connection pooling (reduce overhead)
- **Distributed scraping** - Multiple worker processes for parallel scraping (discuss scaling needs)
- **Smart scheduling** - ML-based optimal scraping times (needs research)
- **Data deduplication** - Prevent duplicate entries at scraper level (architecture decision needed)