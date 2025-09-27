# B9 Dashboard API - Production Ready

## 🚀 STATUS: STABLE - DO NOT MODIFY WITHOUT APPROVAL

FastAPI backend service for B9 Dashboard - Reddit & Instagram analytics for OnlyFans creator discovery.

## Overview

Production-ready FastAPI backend deployed on Render that powers the B9 Dashboard. Provides Reddit and Instagram scraping, AI-powered categorization, and analytics endpoints. Runs 24/7 continuous scrapers with database-controlled enable/disable.

## ✅ Current Status

**All systems operational:**
- Reddit scraper: Working 24/7 with continuous polling
- Instagram scraper: Working 24/7 with continuous polling
- Both scrapers auto-start on deployment if enabled
- Full API endpoints functional
- Deployed on Render with automatic GitHub deployments

## 🏗️ Architecture Overview

### Core Components

1. **Platform Scrapers** (`/scrapers/`)
   - **Reddit** (`/scrapers/reddit/`)
     - `main.py` - Main orchestrator (RedditScraperV2)
     - `continuous.py` - 30-second database polling controller
     - `scrapers/` - Subreddit and user data collectors
     - `processors/` - Metrics and score calculations
   - **Instagram** (`/scrapers/instagram/`)
     - `continuous.py` - 30-second database polling controller
     - `services/` - Instagram API logic with rate limiting

2. **Shared Infrastructure** (`/core/`)
   - `cache/` - Redis-backed caching with TTL support
   - `clients/` - Thread-safe API client pools
   - `config/` - Proxy management and configuration
   - `database/` - Batch writers and DB utilities
   - `utils/` - Shared utilities and logging

3. **API Routes** (`/routes/`)
   - `/api/scraper/*` - Reddit scraper control endpoints
   - `/api/instagram/scraper/*` - Instagram scraper control endpoints
   - `/api/users/*` - User discovery from Reddit
   - `/api/categorization/*` - AI-powered subreddit categorization

4. **Services** (`/services/`)
   - `categorization_service.py` - OpenAI GPT integration
   - `database.py` - Supabase client management

5. **Utilities** (`/utils/`)
   - `system_logger.py` - Centralized logging to Supabase
   - `cache.py` - Redis caching (when available)
   - `rate_limit.py` - API rate limiting
   - `monitoring.py` - Health checks

### How Scrapers Work

Both scrapers follow the same pattern:
1. Start once (via `start.py` on deployment or manual trigger)
2. Run forever in a loop:
   - Check database every 30 seconds
   - If enabled=true: run scraping cycle
   - If enabled=false: wait and check again
   - Update heartbeat to show alive status
3. Never exit unless process is killed

### Control Flow
```
Dashboard → API Endpoint → Update Database → Scraper sees change in 30s
```

## 📋 API Endpoints

### Health & Status
- `GET /` - Health check
- `GET /health` - Detailed health check
- `GET /api/stats` - System statistics
- `GET /ready` - Readiness probe
- `GET /alive` - Liveness probe

### Reddit Scraper Control
- `POST /api/scraper/start` - Enable Reddit scraper
- `POST /api/scraper/stop` - Disable Reddit scraper
- `GET /api/scraper/status` - Get Reddit scraper status
- `POST /api/scraper/analyze-subreddit/{name}` - Analyze specific subreddit
- `POST /api/scraper/discover-subreddits` - Discover subreddits from users

### Instagram Scraper Control
- `POST /api/instagram/scraper/start` - Enable Instagram scraper (also starts subprocess)
- `POST /api/instagram/scraper/stop` - Disable Instagram scraper
- `GET /api/instagram/scraper/status` - Get Instagram scraper status
- `GET /api/instagram/scraper/cycle-status` - Get current cycle information
- `GET /api/instagram/scraper/success-rate` - Get success rate metrics

### Categorization
- `POST /api/categorization/start` - Start AI categorization for approved subreddits
- `GET /api/categorization/stats` - Get categorization statistics
- `GET /api/categorization/categories` - List all 18 marketing categories

### Users
- `POST /api/users/discover` - Discover and analyze Reddit user (used by posting page)
- `GET /api/users/health` - User routes health check

## 🛠️ Deployment

### Render (Production)

The API is deployed on Render and automatically deploys from GitHub pushes to main branch.

**Environment Variables** (set in Render dashboard):
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
OPENAI_API_KEY=your-openai-api-key
ENVIRONMENT=production
PORT=10000
```

**Deployment Process:**
1. Push changes to GitHub
2. Render automatically deploys via webhook
3. `start.py` runs on deployment
4. Scrapers auto-start if enabled in database

### Local Development

```bash
# Install dependencies
pip install -r requirements.txt

# Set up environment
cp .env.example .env
# Edit .env with your actual values

# Run API
python main.py
# Or
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

## 📊 Database Schema

### Main Tables Used
- `system_control` - Controls scraper enable/disable status
- `system_logs` - Centralized logging for all operations
- `reddit_users` - Reddit user data and stats
- `reddit_posts` - Reddit post data
- `instagram_creators` - Instagram creator data
- `categorized_subreddits` - AI categorization results

### Logging Sources
- `reddit_scraper` - Reddit scraping operations
- `instagram_scraper` - Instagram scraping operations
- `reddit_categorizer` - Categorization operations
- `user_discovery` - User discovery operations
- `api` - General API operations

## 🔧 File Structure

```
api/
├── core/                       # Scraper implementations
│   ├── continuous_scraper.py      # Reddit 24/7 scraper
│   ├── continuous_instagram_scraper.py  # Instagram 24/7 scraper
│   └── reddit_scraper.py          # Reddit API logic
│
├── routes/                     # API endpoints
│   ├── scraper_routes.py          # Reddit scraper control
│   ├── instagram_scraper_routes.py # Instagram scraper control
│   ├── instagram_related_creators_routes.py # Related creators discovery
│   └── user_routes.py             # User discovery
│
├── services/                   # Business logic
│   ├── categorization_service_tags.py  # OpenAI integration with tag system
│   ├── single_subreddit_fetcher.py # Single subreddit analysis
│   └── instagram/
│       └── unified_scraper.py     # Instagram scraping logic
│
├── middleware/                 # API middleware
│   └── error_handler.py           # Global error handling
│
├── utils/                      # Utilities
│   ├── system_logger.py           # Centralized logging
│   ├── cache.py                   # Redis caching
│   ├── rate_limit.py              # Rate limiting
│   └── monitoring.py              # Health checks
│
├── docs/                       # API documentation
│   └── TAG_CATEGORIES.md          # 84-tag categorization reference
│
├── main.py                     # FastAPI application
├── start.py                    # Deployment startup script
├── requirements.txt            # Python dependencies
└── render.yaml                # Render deployment config
```

## 🔐 Security

- All API keys stored as environment variables
- Supabase service role key for database operations
- CORS configured for dashboard integration
- Rate limiting on all endpoints
- Comprehensive error handling and logging

## 📈 Performance

- **Redis Caching**: When available, caches frequently accessed data
- **Rate Limiting**: Prevents API abuse
- **Background Processing**: Long-running tasks handled by workers
- **Connection Pooling**: Optimized database connections
- **Concurrent Processing**: Multi-threaded scraping for efficiency

## 🚨 Important Notes

1. **DO NOT MODIFY** scraper logic without thorough testing
2. **Scrapers run continuously** - they don't need to be restarted
3. **Database polling** - 30-second interval is optimal
4. **Auto-deployment** - Every GitHub push triggers Render deployment
5. **Logs** - Check `system_logs` table in Supabase for debugging

## TODO List

- [ ] Implement request caching for frequently accessed endpoints
- [ ] Add comprehensive API documentation with Swagger UI
- [ ] Create health check dashboard endpoint
- [ ] Implement webhook notifications for scraper status changes
- [ ] Add bulk operations for categorization
- [ ] Create backup/restore utilities for system_control state

## Current Errors

- **None in production** - System is stable and operational
- **Known limitation**: Rate limiting may affect bulk operations during peak usage

## Potential Improvements

- **WebSocket support** - Real-time updates for scraper status (needs architecture discussion)
- **GraphQL endpoint** - More flexible data querying (evaluate if needed)
- **Distributed task queue** - Replace threading with Celery/RQ (major refactor)
- **API versioning** - Implement /v1, /v2 endpoints (discuss versioning strategy)
- **Prometheus metrics** - Enhanced monitoring capabilities (requires infrastructure setup)

## ⚠️ Memory Requirements

**Current Issue:** Running both scrapers simultaneously requires >512MB RAM

**Render Plan Requirements:**
- **Starter (512MB)** - Can run ONE scraper at a time
- **Standard (2GB)** - Recommended for both scrapers ✅
- **Pro (4GB)** - For future expansion

**Memory Usage Breakdown:**
- Reddit scraper: ~200-300MB
- Instagram scraper: ~150-250MB
- FastAPI + overhead: ~100-150MB
- **Total peak**: ~600-700MB

**Temporary Workaround if on Starter:**
```sql
-- Disable one scraper to stay under 512MB
UPDATE system_control SET enabled = false WHERE script_name = 'instagram_scraper';
```

## 📝 Maintenance

### Common Tasks

**Check scraper status:**
```bash
curl https://b9-dashboard.onrender.com/api/scraper/status
curl https://b9-dashboard.onrender.com/api/instagram/scraper/status
```

**Enable/disable scrapers:**
```sql
-- Via Supabase
UPDATE system_control SET enabled = true WHERE script_name = 'reddit_scraper';
UPDATE system_control SET enabled = false WHERE script_name = 'instagram_scraper';
```

**View logs:**
```sql
-- Recent scraper logs
SELECT * FROM system_logs
WHERE source IN ('reddit_scraper', 'instagram_scraper')
ORDER BY timestamp DESC
LIMIT 100;
```

---

Built for B9 Agency - Optimizing OnlyFans marketing through data-driven Reddit & Instagram intelligence.

**Last Updated**: September 17, 2025
**Status**: Production Ready - All Systems Operational