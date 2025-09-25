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

## TODO List

- [ ] Update to use 84-tag categorization system (currently using old 18 categories)
- [ ] Add caching for frequently accessed data
- [ ] Implement retry queue for failed operations
- [ ] Create service health monitoring
- [ ] Add unit tests for critical functions
- [ ] Document API response formats

## Current Errors

- **Categorization outdated** - Still references 18 categories instead of 84-tag system
- **No connection pooling** - Each service creates new connections (performance impact)
- **Missing error recovery** - Failed operations not retried automatically

## Potential Improvements

- **Service orchestration** - Coordinate multiple services for complex operations (needs design)
- **Event-driven architecture** - Use pub/sub for service communication (infrastructure change)
- **Caching layer** - Redis/Memcached for frequently accessed data (discuss implementation)
- **Circuit breakers** - Prevent cascading failures (resilience pattern)
- **Service mesh** - Microservices architecture (major refactor needed)