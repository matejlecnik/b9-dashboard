# Scrapers Module

## Overview
This directory contains platform-specific scrapers for B9 Dashboard. Each scraper is organized in its own subdirectory with all related components.

## Directory Structure

```
scrapers/
├── reddit/              # Reddit scraper module
│   ├── main.py         # Main orchestrator (RedditScraperV2)
│   ├── continuous.py   # Continuous scraping controller
│   ├── scrapers/       # Scraper implementations
│   │   ├── base.py     # Base scraper class
│   │   ├── subreddit.py # Subreddit data scraper
│   │   └── user.py     # User data scraper
│   ├── processors/     # Data processing
│   │   └── calculator.py # Metrics calculator
│   └── tests/          # Test suite
│
└── instagram/          # Instagram scraper module
    ├── continuous.py   # Continuous scraping controller
    └── services/       # Instagram-specific services
```

## TODO List
- [ ] Add comprehensive error recovery to Reddit scraper
- [ ] Implement proxy rotation failure handling
- [ ] Add Instagram main scraper orchestrator (similar to Reddit)
- [ ] Create unified scraper interface for all platforms

## Current Errors
- None currently known in new structure

## Potential Improvements
- **Unified base scraper**: Create a platform-agnostic base class for all scrapers
- **Shared rate limiting**: Move rate limiting to core utilities
- **Better proxy management**: Centralize proxy rotation logic
- **Metrics standardization**: Create unified metrics interface for all platforms

## How to Use

### Reddit Scraper
```python
from scrapers.reddit import RedditScraperV2

scraper = RedditScraperV2()
await scraper.initialize()
await scraper.run_scraping_cycle()
```

### Continuous Scraping
Both Reddit and Instagram scrapers support continuous operation:
- Check Supabase control table every 30 seconds
- Run when enabled, pause when disabled
- Automatic retry and error recovery

## Dependencies
- Core modules (clients, database, config)
- Supabase for data storage
- Proxy rotation (via core.config)