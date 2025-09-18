# Services - Business Logic Layer

## Overview
This directory contains the core business logic and service implementations.

## Files

### categorization_service.py
**AI-Powered Subreddit Categorization**

Uses OpenAI GPT-4 to categorize subreddits into 18 marketing categories:
- Technology, Business, Career, Personal Development
- Science, News, Gaming, Sports
- Memes, Animals, Art, Fashion
- Relationships, NSFW, OnlyFans Related
- Non-English, Uncategorizable

**Key Functions:**
- `categorize_subreddit()` - Analyzes subreddit and assigns category
- `start_categorization()` - Batch processes approved subreddits
- Uses system_logger for tracking progress

### database.py
**Supabase Client Management**

Provides centralized Supabase client initialization:
- `get_supabase()` - Returns configured Supabase client
- Handles service role authentication
- Used by all services and routes


## Instagram Subdirectory

### instagram/unified_scraper.py
**Instagram Scraping Logic**

Core Instagram API integration:
- `InstagramScraperUnified` class
- Handles posts and reels fetching
- Rate limiting (60 req/sec)
- Concurrent processing with ThreadPoolExecutor
- Batch processing (300 creators at a time)

**Key Features:**
- Multi-threaded API calls (60 workers)
- Automatic retry with exponential backoff
- Detailed logging and metrics tracking
- Saves to `instagram_posts` table

### instagram/instagram_config.py
**Instagram Configuration**

Configuration constants:
- `MAX_WORKERS = 60` - Thread pool size
- `BATCH_SIZE = 300` - Creators per batch
- `API_DELAY = 0.017` - Rate limiting (60/sec)
- API endpoints and headers

## Database Interactions

All services interact with these tables:
- `system_logs` - Centralized logging
- `system_control` - Scraper control
- `reddit_posts` - Reddit content
- `reddit_users` - Reddit accounts
- `instagram_creators` - IG accounts to track
- `instagram_posts` - IG content
- `categorized_subreddits` - AI categorization results

## Error Handling

Services use try/except blocks with:
- Detailed error logging to system_logs
- Graceful degradation
- Automatic retry logic where appropriate

## Performance Notes

- Categorization: ~1-2 seconds per subreddit (OpenAI API)
- Instagram: 60 requests/second max
- Database: Connection pooling via Supabase
- All services designed for concurrent operation

## Future Improvements

- Add caching layer for categorization results
- Implement user authentication service
- Add webhook support for real-time updates
- Enhanced error recovery mechanisms