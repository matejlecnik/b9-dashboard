# Instagram Scraper Unified

## Overview

Unified Instagram scraper system for B9 Agency that efficiently fetches reels, posts, and profile information for approved creators. Optimized to use only 2.4 API calls per creator on average.

## TODO List

- [ ] Complete unified_scraper.py implementation
- [ ] Test with small batch of creators
- [ ] Deploy to Render
- [ ] Monitor API usage and costs
- [ ] Optimize based on performance data

## Current Errors

- None yet (new implementation)

## Potential Improvements

- Add parallel processing for faster execution
- Implement caching for rarely-changing profile data
- Add webhook notifications for viral content
- Create data export functionality

## Architecture

### Data Flow
1. Fetch all "OK" status creators from Supabase
2. For each creator, determine if new (0 content) or existing
3. New creators: Fetch profile + 90 reels + 30 posts (3-4 calls)
4. Existing creators: Fetch 30 reels + 10 posts (2 calls)
5. Calculate analytics and detect viral content
6. Store in Supabase with cost tracking

### API Usage
- **Average calls per creator**: 2.4
- **Rate limit**: 60 requests/second
- **Monthly budget**: 1M requests ($200)
- **Supported creators**: 13,000 with daily updates

## Features

### Smart Fetching
- Checks existing content count
- Adjusts fetch strategy based on creator status
- Minimizes API calls

### Analytics
- Average views per reel
- Engagement rate calculation
- Posting frequency tracking
- Viral content detection (50k+ views AND 5x average)
- Growth rate monitoring

### Cost Management
- Real-time API call tracking
- Monthly budget monitoring
- Per-creator cost calculation
- Automatic throttling when approaching limits

## Configuration

### Environment Variables
```bash
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_service_role_key
RAPIDAPI_KEY=your_rapidapi_key
RAPIDAPI_HOST=instagram-looter2.p.rapidapi.com
UPDATE_FREQUENCY=21600  # 6 hours
BATCH_SIZE=100
MAX_DAILY_API_CALLS=24000
```

### Update Frequencies
- **4x daily**: Top 3,000 creators
- **2x daily**: Next 3,000 creators
- **Daily**: Remaining 7,000 creators
- **Total**: ~13,000 creators within 1M requests

## Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Copy `.env.example` to `.env` and configure
4. Run manually:
   ```bash
   python unified_scraper.py
   ```

## Deployment

### Render Configuration
- **Service Type**: Background Worker
- **Schedule**: Every 6 hours
- **Build Command**: `pip install -r requirements.txt`
- **Start Command**: `python unified_scraper.py`

### Manual Control
The scraper can be controlled via the Instagram Monitor dashboard:
- Start/stop execution
- View real-time logs
- Monitor API usage
- Adjust configuration

## API Endpoints

- `POST /api/instagram/scraper/start` - Start scraper
- `POST /api/instagram/scraper/stop` - Stop scraper
- `GET /api/instagram/scraper/status` - Get status
- `GET /api/instagram/scraper/metrics` - Get metrics
- `GET /api/instagram/scraper/logs` - Get recent logs

## Database Tables

### instagram_scraper_control
- Tracks scraper status and configuration
- Stores run history and metrics

### instagram_scraper_logs
- Detailed logging of all operations
- API call tracking
- Error logging

### instagram_creators
- Enhanced with analytics fields
- Caches calculated metrics
- Tracks last scrape time

## Monitoring

Access the Instagram Monitor at `/monitor/instagram` to:
- View real-time scraper status
- Monitor API usage and costs
- Review error logs
- Adjust configuration
- Start/stop scraper

## Cost Analysis

With 2.4 calls per creator:
- **10,000 creators daily**: 720,000 calls/month = $200
- **20,000 creators daily**: 1,440,000 calls/month = $400
- **Cost per creator**: $0.02/month

## Support

For issues or questions, contact B9 Agency technical team.

---

**Last Updated**: January 2025
**Version**: 1.0.0
**Status**: In Development