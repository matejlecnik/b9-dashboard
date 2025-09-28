# 🚀 B9 Dashboard API Documentation

## Overview
The B9 Dashboard API is a FastAPI-based service deployed on Render that provides backend functionality for the B9 Agency Reddit and Instagram analytics platform. It manages scraper control, data categorization, user management, and subreddit analytics.

**Production URL**: https://b9-dashboard.onrender.com
**Framework**: FastAPI 0.100.0+
**Python Version**: 3.12.0
**Deployment**: Render (Web Service)

---

## 🏗️ Architecture

### Core Components

```
api/
├── main.py                 # FastAPI application & endpoints
├── start.py               # Entry point for Render
├── requirements.txt       # Python dependencies
├── .env.example          # Environment variables template
│
├── routes/               # API endpoint routers
│   ├── scraper_routes.py         # Reddit scraper control
│   ├── user_routes.py           # User management
│   ├── instagram_scraper_routes.py   # Instagram scraper
│   └── instagram_related_creators_routes.py  # Creator discovery
│
├── services/            # Business logic
│   ├── categorization_service_tags.py  # AI categorization
│   └── single_subreddit_fetcher.py    # Subreddit data fetcher
│
├── scrapers/           # Data collection engines
│   ├── reddit/        # Reddit scraper v2 architecture
│   └── instagram/     # Instagram scraper
│
├── utils/             # Utilities
│   ├── monitoring.py      # Health checks & metrics
│   ├── system_logger.py   # Supabase logging
│   ├── memory_monitor.py  # Memory tracking
│   └── supabase_logger.py # Log handler
│
└── core/              # Core functionality
    ├── database/      # Supabase client & batch writer
    ├── config/        # Proxy & scraper configuration
    └── cache/         # Cache manager for scrapers
```

---

## 📡 API Endpoints

### System Health & Monitoring

#### `GET /`
Returns service information and available endpoints.

**Response:**
```json
{
  "service": "B9 Dashboard API",
  "version": "3.0.0",
  "status": "operational",
  "environment": "production",
  "timestamp": "2025-09-28T17:30:00Z",
  "endpoints": {
    "health": "/health",
    "readiness": "/ready",
    "liveness": "/alive",
    "metrics": "/metrics"
  }
}
```

#### `GET /health`
Comprehensive health check for all services.

#### `GET /ready`
Kubernetes/Render readiness probe.

#### `GET /alive`
Kubernetes/Render liveness probe.

#### `GET /metrics`
System performance metrics.

---

### Reddit Scraper Control (`/api/scraper/*`)

#### `POST /api/scraper/start`
Start the Reddit scraper.

**Response:**
```json
{
  "success": true,
  "message": "Reddit scraper started successfully",
  "status": "running"
}
```

#### `POST /api/scraper/stop`
Gracefully stop the Reddit scraper.

#### `POST /api/scraper/force-kill`
Force terminate the scraper process.

#### `GET /api/scraper/status`
Get current scraper status.

**Response:**
```json
{
  "enabled": true,
  "status": "running",
  "last_heartbeat": "2025-09-28T17:30:00Z",
  "config": {
    "batch_size": 10,
    "delay_between_batches": 30
  }
}
```

#### `GET /api/scraper/logs`
Retrieve recent scraper logs.

**Query Parameters:**
- `limit` (int): Number of logs to return (default: 100)
- `level` (string): Filter by log level (info, warning, error)

---

### Data Operations

#### `POST /api/categorization/start`
Start AI categorization of subreddits.

**Request Body:**
```json
{
  "batchSize": 30,
  "limit": 100,
  "subredditIds": [1, 2, 3]
}
```

#### `GET /api/categorization/stats`
Get categorization statistics.

#### `POST /api/subreddits/fetch-single`
Fetch data for a single subreddit.

**Request Body:**
```json
{
  "subreddit_name": "programming"
}
```

---

### User Management (`/api/users/*`)

#### `GET /api/users`
List all users.

#### `POST /api/users`
Create a new user.

#### `GET /api/users/{user_id}`
Get specific user details.

#### `PUT /api/users/{user_id}`
Update user information.

#### `DELETE /api/users/{user_id}`
Delete a user.

---

### Instagram Scrapers

Similar endpoints to Reddit scraper but prefixed with:
- `/api/instagram/scraper/*` - Instagram scraper control
- `/api/instagram/related/*` - Related creators discovery

---

## 🔧 Configuration

### Environment Variables

Required environment variables (see `.env.example`):

```bash
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# OpenAI (for categorization)
OPENAI_API_KEY=your-openai-key

# Reddit API Credentials
REDDIT_CLIENT_ID=your-client-id
REDDIT_CLIENT_SECRET=your-client-secret
REDDIT_USER_AGENT=B9-Dashboard/1.0

# Proxy Configuration
RAPIDAPI_KEY=your-rapid-proxy-key
BEYONDPROXY_KEY=your-beyond-proxy-key

# API Settings
PORT=10000
ENVIRONMENT=production
LOG_LEVEL=info
API_WORKERS=1
ENABLE_CORS=true
```

### CORS Configuration

CORS is enabled for the following origins:
- http://localhost:3000 (development)
- https://b9-dashboard.vercel.app (production)

---

## 🗄️ Database

All data is stored in Supabase PostgreSQL with the following main tables:
- `reddit_subreddits` - Subreddit metadata and scores
- `reddit_posts` - Post data and metrics
- `reddit_users` - User profiles and karma
- `system_control` - Scraper control flags
- `system_logs` - Application logs
- `background_jobs` - Job queue

---

## 🚀 Deployment

The API is deployed on Render as a web service:

1. **Automatic Deployment**: Pushes to `main` branch trigger deployment
2. **Build Command**: `pip install -r requirements.txt`
3. **Start Command**: `python start.py`
4. **Health Check Path**: `/health`
5. **Environment**: All env vars configured in Render dashboard

### Deployment Process
```bash
# Code is pushed to GitHub
git push origin main

# Render automatically:
1. Detects new commit
2. Builds Docker container
3. Installs dependencies
4. Starts API with start.py
5. Runs health checks
6. Routes traffic to new version
```

---

## 📊 Monitoring & Logging

### Logging System
- All logs written to Supabase `system_logs` table
- Structured logging with context
- Log levels: DEBUG, INFO, WARNING, ERROR, CRITICAL

### Monitoring Endpoints
- `/metrics` - System metrics
- `/health` - Service health
- `/api/scraper/status` - Scraper status

### Performance Targets
- API Response: <200ms
- Scraper Batch: 10 subreddits in 2 minutes
- Memory Usage: <500MB
- CPU Usage: <50%

---

## 🔐 Security

### Authentication
- Service-to-service auth via API keys
- Supabase Row Level Security (RLS)
- Environment variables for secrets

### Rate Limiting
- Currently disabled (was Redis-based)
- Can be re-enabled with new implementation

### Input Validation
- Pydantic models for request validation
- SQL injection protection via Supabase client
- XSS prevention in responses

---

## 🧪 Testing

### Local Development
```bash
# Install dependencies
pip install -r requirements.txt

# Set environment variables
cp .env.example .env
# Edit .env with your values

# Run locally
python main.py
# Or with uvicorn
uvicorn main:app --reload --port 8000
```

### Test Endpoints
```bash
# Health check
curl https://b9-dashboard.onrender.com/health

# Start scraper
curl -X POST https://b9-dashboard.onrender.com/api/scraper/start

# Get status
curl https://b9-dashboard.onrender.com/api/scraper/status
```

---

## 🐛 Troubleshooting

### Common Issues

1. **Scraper Not Starting**
   - Check `system_control` table in Supabase
   - Verify proxy credentials are valid
   - Check logs: `/api/scraper/logs`

2. **Foreign Key Violations**
   - Ensure write order: Subreddits → Users → Posts
   - Check case sensitivity in subreddit names

3. **High Memory Usage**
   - Monitor with `/metrics` endpoint
   - Reduce batch size in scraper config
   - Check for memory leaks in logs

4. **API Timeout**
   - Render has 30-second timeout limit
   - Use background jobs for long operations
   - Check Render logs for details

---

## 📝 Maintenance

### Regular Tasks
- Monitor error rate in logs
- Check proxy validity monthly
- Update dependencies quarterly
- Review and archive old logs

### Database Maintenance
```sql
-- Clean old logs (>30 days)
DELETE FROM system_logs
WHERE timestamp < NOW() - INTERVAL '30 days';

-- Check table sizes
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

---

## 📚 Additional Resources

- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Render Documentation](https://render.com/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Project Repository](https://github.com/your-repo/b9-dashboard)

---

*Last Updated: September 28, 2025*
*Version: 3.0.0*