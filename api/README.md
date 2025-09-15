# B9 Dashboard API

Consolidated Reddit Analytics API with comprehensive functionality for OnlyFans marketing optimization.

## Directory Documentation Block

### Overview
- FastAPI service deployed on Render. Provides categorization, stats, background jobs, and scraper/user services. Integrates with Supabase and Redis for data, caching, and rate limiting.

### TODO List
- [ ] Add 429 response examples and headers to API docs
- [ ] Add SSE or polling progress endpoints for long-running tasks (if applicable)
- [ ] Document authentication model and CORS in production vs. dev
- [ ] Add OpenAPI examples for each endpoint

### Current Errors
- Scraper reliability issues and proxy/account rotation instability are known. Monitor logs and rate limiting.

### Potential Improvements
- Add per-endpoint rate limits in docs and align with dashboard usage
- Expand `/api/stats` payload with category/user/scraper breakdowns used by dashboard
- Provide typed client examples (TypeScript fetch helpers) for the dashboard

## 🚀 Features

- **Categorization**: AI-powered subreddit categorization (17 categories)
- **Scraper**: Multi-account Reddit scraping with proxy support
- **User Management**: User discovery and quality scoring
- **Logging**: Comprehensive logging to Supabase tables

## 📋 API Endpoints

### Health & Status
- `GET /` - Health check
- `GET /health` - Detailed health check
- `GET /api/stats` - System statistics
 - `GET /ready` - Readiness probe
 - `GET /alive` - Liveness probe
 - `GET /metrics` - System and application metrics

### Categorization
- `POST /api/categorization/start` - Start AI categorization for approved subreddits
- `GET /api/categorization/stats` - Get categorization statistics and progress
- `GET /api/categorization/categories` - List all 18 marketing categories

#### Examples
```bash
curl -X POST "http://localhost:8000/api/categorization/start" \
  -H "Content-Type: application/json" \
  -d '{"batchSize":30, "limit": 200}'

curl "http://localhost:8000/api/categorization/stats"

curl "http://localhost:8000/api/categorization/categories"
```

### Scraper
- `POST /api/scraper/analyze-subreddit/{name}` - Analyze specific subreddit
- `POST /api/scraper/discover-subreddits` - Discover subreddits from users
- `GET /api/scraper/stats` - Get scraper statistics

### Users
- `POST /api/users/discover` - Discover and analyze Reddit user
- `GET /api/users/{username}` - Get user information
- `GET /api/users` - Get paginated users list
- `GET /api/users/stats` - Get user statistics

### Logging
- `GET /api/logs/stats` - Get logging statistics
- `POST /api/logs/flush` - Force flush log buffers

### Background Jobs
- `POST /api/jobs/start` - Queue a background job
- `GET /api/jobs/{job_id}` - Get job status

#### Examples
```bash
curl -X POST "http://localhost:8000/api/jobs/start" \
  -H "Content-Type: application/json" \
  -d '{"job_type":"categorization", "parameters": {"batchSize": 30}, "priority":"normal"}'

curl "http://localhost:8000/api/jobs/job_1736739392000"
```

## 🛠️ Deployment

### Render (Production)

1. **Environment Variables** (set in Render dashboard):
   ```
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   OPENAI_API_KEY=your-openai-api-key
   ENVIRONMENT=production
   PORT=10000
   ```

2. **Deploy**:
   - Connect GitHub repository to Render
   - Render will automatically deploy using `render.yaml`
   - Background workers handle long-running tasks

### Local Development

1. **Install Dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

2. **Environment Setup**:
   ```bash
   cp .env.example .env
   # Edit .env with your actual values
   ```

3. **Run**:
   ```bash
   uvicorn main:app --reload --host 0.0.0.0 --port 8000
   ```

## 📊 Database Schema

The API uses 4 specialized Supabase logging tables:
- `categorization_logs` - Categorization operations  
- `user_discovery_logs` - User discovery operations
- `scraper_operation_logs` - Scraping operations
- `api_operation_logs` - API operations

## 🔧 Architecture

```
api/
├── services/           # Core business logic
│   ├── logging_service.py
│   ├── user_service.py
│   ├── categorization_service.py
│   └── scraper_service.py
├── models/            # Data models
├── utils/            # Utilities
├── scripts/          # Database scripts
└── main.py          # FastAPI application
```

## 🔐 Security

- All API keys stored as environment variables
- Supabase service role key for database operations
- CORS configured for dashboard integration
- Comprehensive error handling and logging

## 📈 Monitoring

- Real-time logging to Supabase
- Health check endpoints
- Performance metrics tracking
- Error tracking and reporting

Built for B9 Agency - Optimizing OnlyFans marketing through data-driven Reddit intelligence.

## Performance & Scalability

- **Redis Caching**: Multi-layer caching with TTL management
- **Rate Limiting**: Advanced rate limiting with Redis backend  
- **Background Jobs**: Render-native background workers
- **Response Compression**: GZip compression for optimized delivery
- **Connection Pooling**: Optimized database connections

## Security Features

- **Comprehensive Error Handling**: Structured error responses with monitoring
- **Rate Limiting**: Prevents API abuse with intelligent throttling
- **Health Monitoring**: Multi-level health checks for load balancers
- **Trusted Hosts**: Production host validation
- **CORS Security**: Environment-specific CORS configuration
# Deployment trigger Mon Sep 15 17:41:52 CEST 2025
