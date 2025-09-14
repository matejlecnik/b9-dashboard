# Reddit Scraper Migration & Infrastructure Plan

## 🚀 Executive Summary
Complete migration of Reddit scraper from integrated API service to dedicated Render worker service with enhanced infrastructure for 24/7 reliability, improved data collection, and real-time monitoring.

**Status**: 🟡 In Progress
**Target Deployment**: Render Worker Service
**Priority**: High - Core business functionality

---

## 📊 Current Architecture Analysis

### Existing Components
| Component | Location | Lines | Status | Purpose |
|-----------|----------|-------|--------|---------|
| ProxyEnabledMultiScraper | `/scraper/reddit_scraper.py` | 2992 | ✅ Working | Full-featured standalone scraper |
| RedditScraperService | `/api/services/scraper_service.py` | 498 | ⚠️ To Remove | Simplified API integration |
| Worker Integration | `/api/worker.py` | ~100 | ⚠️ To Remove | Background job runner |
| API Routes | `/api/routes/scraper_routes.py` | ~200 | 📝 To Update | HTTP endpoints |

### Data Collection Features (MUST PRESERVE)
- ✅ **Subreddit Analysis**: Hot 30 posts, timing patterns, engagement metrics
- ✅ **User Analysis**: Quality scores, karma analysis, account age evaluation
- ✅ **Minimum Requirements**: 10th percentile calculations for posting thresholds
- ✅ **Performance Metrics**: Best posting times (hour/day), engagement ratios
- ✅ **Anti-Detection**: Proxy rotation, user agent randomization, intelligent delays

---

## 🏗️ Infrastructure Improvements

### 1. Service Architecture
```
┌─────────────────────────────────────────────────────────┐
│                    RENDER SERVICES                       │
├─────────────────┬────────────────┬──────────────────────┤
│ reddit-scraper  │ b9-dashboard   │ b9-dashboard-redis   │
│   (Worker)      │     (API)      │     (Cache)          │
└────────┬────────┴───────┬────────┴──────────┬───────────┘
         │                │                    │
         ▼                ▼                    ▼
┌─────────────────────────────────────────────────────────┐
│                      SUPABASE                            │
│  • reddit_users  • reddit_posts  • reddit_subreddits    │
│  • scraper_logs  • reddit_accounts  • performance_logs  │
└─────────────────────────────────────────────────────────┘
```

### 2. Enhanced Monitoring Stack
```python
# New monitoring capabilities to implement
class ScraperMonitor:
    - Real-time metrics dashboard
    - Account health tracking
    - Proxy performance metrics
    - Rate limit monitoring per account
    - Error rate tracking
    - Data quality validation
    - Supabase write performance
```

### 3. Reliability Improvements
- **Circuit Breaker Pattern**: Prevent cascade failures
- **Exponential Backoff**: Smart retry logic
- **Health Checks**: `/health` endpoint with detailed status
- **State Recovery**: Resume from last successful batch
- **Graceful Shutdown**: Save state before termination

### 4. Account Management System
```python
class AccountManager:
    def __init__(self):
        self.accounts = []  # Load from Supabase
        self.health_scores = {}  # Track per-account health
        self.rate_limits = {}  # Monitor usage patterns

    async def get_healthiest_account(self):
        # Return account with best health score

    async def mark_account_limited(self, account_id):
        # Temporarily disable rate-limited accounts

    async def rotate_accounts(self):
        # Intelligent rotation based on health
```

---

## 📋 Migration Checklist

### Phase 1: Preparation ✅
- [x] Analyze current implementations
- [x] Test Reddit JSON API still works
- [x] Document all data collection features
- [x] Create migration plan

### Phase 2: Infrastructure Setup 🔄
- [ ] Create `/scraper/config.py` - Configuration management
- [ ] Create `/scraper/monitoring.py` - Metrics and logging
- [ ] Create `/scraper/account_manager.py` - Account rotation
- [ ] Create `/scraper/requirements.txt` - Dependencies
- [ ] Update `/scraper/reddit_scraper.py` - Add new features

### Phase 3: Render Deployment 📝
- [ ] Add `reddit-scraper` service to `render.yaml`
- [ ] Configure environment variables
- [ ] Set up health check endpoints
- [ ] Configure auto-restart policies
- [ ] Set resource limits

### Phase 4: API Integration Updates 🔧
- [ ] Remove `scraper_service.py` from API
- [ ] Update `worker.py` to remove scraper
- [ ] Update API routes to query status only
- [ ] Clean up unused imports

### Phase 5: Testing & Validation ✅
- [ ] Test account rotation
- [ ] Verify proxy failover
- [ ] Validate data calculations
- [ ] Check Supabase writes
- [ ] Monitor for 24 hours

### Phase 6: Production Deployment 🚀
- [ ] Deploy to Render
- [ ] Monitor initial performance
- [ ] Verify all metrics collected
- [ ] Check error rates < 1%
- [ ] Document any issues

---

## 🔍 Data Validation Checklist

### Subreddit Data
```python
# Required fields that MUST be collected
{
    'name': str,
    'display_name': str,
    'subscribers': int,
    'active_user_count': int,
    'posts_per_day': float,
    'avg_upvotes_per_post': float,
    'avg_comments_per_post': float,
    'best_posting_hour': int,  # 0-23
    'best_posting_day': int,   # 0-6
    'nsfw_percentage': float,
    'created_at': datetime,
    'min_post_karma': int,     # 10th percentile
    'min_comment_karma': int,  # 10th percentile
    'min_account_age': int,    # days
}
```

### User Data
```python
# Quality scoring that MUST work
{
    'username': str,
    'post_karma': int,
    'comment_karma': int,
    'account_age_days': int,
    'username_quality_score': float,  # 0-10
    'age_quality_score': float,       # 0-10
    'karma_quality_score': float,     # 0-10
    'overall_user_score': float,      # 0-10 weighted
    'is_creator': bool,
    'subreddits_posted': list,
}
```

### Post Data
```python
# Engagement metrics to track
{
    'id': str,
    'title': str,
    'score': int,
    'num_comments': int,
    'created_utc': int,
    'author': str,
    'subreddit': str,
    'over_18': bool,
    'comment_to_upvote_ratio': float,
    'engagement_score': float,
}
```

---

## 🛠️ New Features to Implement

### 1. Real-time Status API
```python
@app.get("/scraper/status")
async def get_scraper_status():
    return {
        "status": "running|stopped|error",
        "current_batch": 5,
        "total_batches": 100,
        "accounts_healthy": 8,
        "accounts_limited": 2,
        "requests_last_hour": 450,
        "errors_last_hour": 3,
        "last_successful_run": "2024-01-14T10:30:00Z"
    }
```

### 2. Manual Control Endpoints
```python
@app.post("/scraper/pause")
@app.post("/scraper/resume")
@app.post("/scraper/force-rotate")
@app.post("/scraper/analyze-subreddit/{name}")
```

### 3. Performance Metrics
```python
class PerformanceTracker:
    - Requests per minute/hour/day
    - Success rate percentage
    - Average response time
    - Data quality scores
    - Supabase write latency
```

---

## 📦 Dependencies Update

### Current (reddit_scraper.py)
```txt
asyncpraw==7.7.1
aiohttp==3.9.1
supabase==2.0.0
python-dotenv==1.0.0
fake-useragent==1.4.0
```

### Additional Required
```txt
tenacity==8.2.3       # Retry logic
prometheus-client==0.19.0  # Metrics
circuitbreaker==2.0.0      # Circuit breaker
redis==5.0.1               # Cache/queue
structlog==24.1.0         # Structured logging
```

---

## 🚨 Critical Success Factors

1. **Data Integrity**: All calculations MUST match current implementation
2. **Rate Limiting**: MUST NOT exceed Reddit limits (100 req/min per account)
3. **Proxy Rotation**: MUST failover smoothly when proxy fails
4. **State Recovery**: MUST resume from last position after crash
5. **Monitoring**: MUST have visibility into all operations

---

## 📈 Performance Targets

| Metric | Current | Target | Priority |
|--------|---------|--------|----------|
| Uptime | ~80% | 99.9% | Critical |
| Error Rate | ~5% | <1% | High |
| Requests/Hour | 500 | 5000 | Medium |
| Data Quality | 85% | 99% | Critical |
| Recovery Time | Manual | <1min | High |

---

## 🔄 Rollback Plan

If migration fails:
1. Keep old API service running in parallel
2. Switch traffic back via environment variable
3. Debug issues with new service
4. Fix and retry deployment
5. Document lessons learned

---

## 📝 Environment Variables

### Required for reddit-scraper service
```bash
# Supabase
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=xxx

# Reddit Accounts (from Supabase)
REDDIT_ACCOUNTS_TABLE=reddit_accounts

# Proxy Configuration
PROXY_ENABLED=true
PROXY_URL=http://proxy.beyondproxy.com:8080
PROXY_USERNAME=xxx
PROXY_PASSWORD=xxx

# Rate Limiting
MAX_REQUESTS_PER_MINUTE=100
MIN_DELAY_SECONDS=2.5
MAX_DELAY_SECONDS=6.0

# Monitoring
ENABLE_METRICS=true
METRICS_PORT=9090
LOG_LEVEL=info

# Redis Cache
REDIS_URL=redis://xxx

# Control
AUTO_START=true
BATCH_SIZE=10
MAX_DAILY_REQUESTS=50000
```

---

## 🎯 Next Steps

1. **Immediate**: Create config.py and monitoring.py modules
2. **Today**: Update reddit_scraper.py with new infrastructure
3. **Tomorrow**: Deploy to Render staging environment
4. **This Week**: Complete migration and testing
5. **Next Week**: Full production deployment

---

## 📞 Support & Documentation

- **Primary Developer**: AI Assistant
- **Documentation**: This file + inline code comments
- **Monitoring Dashboard**: [To be created]
- **Logs**: Supabase `scraper_logs` table
- **Alerts**: [To be configured]

---

## ⚠️ Known Issues & Workarounds

1. **Rate Limiting**: Some accounts get limited faster
   - *Workaround*: Increase delay between requests

2. **Proxy Timeouts**: BeyondProxy occasionally times out
   - *Workaround*: Implement retry with backoff

3. **Memory Usage**: Large subreddit analysis can spike memory
   - *Workaround*: Process in smaller batches

4. **Supabase Writes**: Bulk inserts can be slow
   - *Workaround*: Batch writes with async operations

---

*Last Updated: 2024-01-14*
*Version: 2.0.0*
*Status: Migration In Progress*