# Instagram Services - Creator Content Scraping

## Overview
This directory contains the Instagram scraping services for fetching creator content (posts and reels) using RapidAPI's Instagram API.

## TODO List
- [ ] Implement retry mechanism for failed API calls
- [ ] Add proxy rotation if rate limits are hit
- [ ] Optimize batch processing for larger creator lists
- [ ] Add content deduplication logic

## Current Errors
- Occasional rate limiting from RapidAPI (60 requests/second limit)
- Memory usage can spike with large batches (300+ creators)

## Potential Improvements
- Consider implementing webhook notifications for scraping completion
- Add incremental scraping to only fetch new content
- Implement content quality scoring
- Add media download capabilities for backup

## Files

### __init__.py
Empty initialization file for the Instagram services module.

### instagram_config.py
**Configuration Constants**

Key settings for Instagram scraping:
- `MAX_WORKERS = 60` - Thread pool size for concurrent API calls
- `BATCH_SIZE = 300` - Number of creators to process per batch
- `API_DELAY = 0.017` - Delay between requests (60/sec rate limit)
- `RAPIDAPI_KEY` - API key for Instagram data access
- API endpoint URLs for posts and reels

### unified_scraper.py
**Main Instagram Scraper Implementation**

The `InstagramScraperUnified` class handles:
- **Concurrent API calls** using ThreadPoolExecutor (60 workers)
- **Rate limiting** to stay within RapidAPI limits
- **Batch processing** of creators (300 at a time)
- **Content fetching** for both posts and reels
- **Database persistence** to `instagram_posts` table
- **Detailed logging** of scraping progress and errors

**Key Methods:**
- `fetch_creator_posts()` - Fetches latest posts for a creator
- `fetch_creator_reels()` - Fetches latest reels for a creator
- `process_batch()` - Processes a batch of creators concurrently
- `run()` - Main entry point for scraping all creators

**Performance Characteristics:**
- Processes ~60 creators per second at full capacity
- Each creator takes 1-3 seconds depending on content volume
- Memory usage: ~500MB for 300 creator batch
- Database writes are batched for efficiency

## Integration with Core System

### Continuous Scraper (`/api/core/continuous_instagram_scraper.py`)
- Creates instances of `InstagramScraperUnified`
- Manages scraping cycles (4-hour intervals)
- Handles process lifecycle and restarts
- Monitors memory usage and health

### API Routes (`/api/routes/instagram_scraper_routes.py`)
- `/start` - Initiates scraping process
- `/stop` - Gracefully stops scraping
- `/status` - Returns current scraper state
- `/health` - Provides health metrics

## Database Schema

**instagram_posts table:**
```sql
- id: UUID primary key
- creator_id: Reference to instagram_creators
- post_id: Instagram's unique post ID
- post_type: 'post' or 'reel'
- caption: Post caption text
- media_url: URL to media content
- likes_count: Number of likes
- comments_count: Number of comments
- created_at: When posted on Instagram
- fetched_at: When we scraped it
```

## Error Handling

- API errors are logged but don't stop the batch
- Failed creators are retried in the next cycle
- Rate limit errors trigger automatic backoff
- Database errors are logged to system_logs

## Monitoring

Monitor scraping through:
- System logs in Supabase `system_logs` table
- Health endpoint at `/api/instagram/scraper/health`
- Metrics in scraper status endpoint
- Render logs for process-level issues