# Scraper Monitoring

> Real-time monitoring of Python scraper performance and system health

## 🎯 Business Purpose

This page ensures continuous data collection for business intelligence by monitoring the Python Reddit scraper. It tracks system health, account status, and discovery metrics to maintain the 17,100 requests/hour capacity needed for comprehensive subreddit analysis.

**Critical for business continuity** - Any downtime directly impacts new subreddit discoveries and marketing opportunities.

## 📊 Key Features

- [x] Real-time scraping statistics with time-range filters (24h/7d/30d)
- [x] Account status from scraper configuration
- [x] Top subreddits list with pagination  
- [x] Throughput metrics (subreddits/hour)
- [x] Loading skeletons and error states
- [ ] **BROKEN**: Currently not displaying real data (Priority #1 Fix)
- [ ] Reddit account health monitoring
- [ ] Proxy status and performance metrics
- [ ] Alert system for failures

## 🔄 Data Flow

```
Python scraper → Database writes → API aggregation → Dashboard metrics
Multi-account system → Request distribution → Success/failure tracking
PythonAnywhere hosting → Log generation → Dashboard integration
```

## 🏗️ Component Structure

```
scraper/
├── page.tsx                    # Main monitoring dashboard
├── README.md                   # This documentation
└── components/
    ├── MetricsCards.tsx        # Performance statistics display
    ├── AccountStatus.tsx       # Reddit account health
    └── ActivityChart.tsx       # Time-series visualizations
```

## 🔌 API Endpoints Used

- `GET /api/scraper/status` - Real-time system status and metrics
- `GET /api/scraper/accounts` - Individual account performance
- `GET /api/scraper/metrics?timeframe=24h|7d|30d` - Historical performance
- `GET /api/health` - Basic connectivity check

## 💾 Database Tables

- `scraper_accounts` - Account credentials, status, and performance metrics
- `scraper_logs` - Operational logs and error tracking (19k+ entries)
- `subreddits` - Discovery metrics and processing status
- `posts` - Engagement data collection tracking

## 🎨 UI/UX Specifications

- **Metrics Cards**: Key performance indicators in card layout
- **Time Range Filters**: 24h/7d/30d selection with smooth transitions
- **Status Indicators**: Color-coded health status (green/yellow/red)
- **Real-time Updates**: 30-second refresh cycle for live monitoring
- **Error Boundaries**: Graceful fallback when APIs fail

## 🐛 Known Issues

- Resolved: Hydration mismatch fixed via deterministic formatting and mounted gating
- No alerting system for critical failures
- Missing proxy performance monitoring
- Account rotation logic not visible to user

## 🚀 Future Enhancements

- Monitoring stabilized: SSR/hydration-safe rendering now in place
- **Account Health Dashboard**: Individual Reddit account status
- **Proxy Monitoring**: Track proxy performance and rotation
- **Alert System**: Email/SMS notifications for critical failures
- **Performance Trends**: Historical performance analysis and trends
- **Auto-restart Controls**: Remote control of scraper operations
- **Data Quality Metrics**: Track accuracy and completeness

## 📈 Key Performance Indicators

- **Throughput**: Target 150 subreddits analyzed/hour
- **Discovery Rate**: 500-1,000 new subreddits/day
- **Success Rate**: >95% successful API requests
- **Account Health**: All 10 accounts active and within rate limits
- **Data Quality**: >99% complete records with required fields

## ⚙️ System Architecture

- **Multi-Account**: 10 Reddit accounts with proxy rotation
- **Rate Limiting**: 100 requests/minute per account (1,000 total/min)
- **Hosting**: PythonAnywhere with scheduled execution
- **Monitoring**: Real-time status via Supabase integration
- **Error Recovery**: Exponential backoff and circuit breakers

## 🚨 Critical Alerts

- Account authentication failures
- Rate limit violations  
- No new discoveries in 24 hours
- Error rate above 10%
- Database connection failures

## 🔗 Related Systems

- **Python Scraper**: [../../../scraper/README.md](../../../scraper/README.md)
- **Supabase Database**: Stores all collected data
- **PythonAnywhere**: Hosting platform for scraper execution
- **Subreddit Review**: [../subreddit-review/README.md](../subreddit-review/README.md) - Processes discovered data

## ✅ SSR/Hydration Rules Implemented

- Deterministic formatting helpers in `src/lib/format.ts` for numbers and UTC times
- Replaced all `toLocaleString`/`toLocaleTimeString` usages with `format*` helpers
- Dynamic time text gated behind mount to keep SSR output stable
- Debounced realtime refresh (3s) and visibility-aware polling to avoid request bursts
- Abort in-flight API requests on unmount to prevent state updates on unmounted components
- Stable keys for lists and consistent list slicing for top subreddits

### Helper APIs
- `formatNumber(value)` → en-US, no decimals, returns `—` for invalid
- `formatPercent(value, digits)` → fixed digits, returns `—` for invalid
- `formatTimeISO(iso)`/`formatDateISO(iso)`/`formatDateTimeISO(iso)` → UTC
