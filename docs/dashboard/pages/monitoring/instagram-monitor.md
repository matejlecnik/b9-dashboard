# Instagram Monitor

┌─ MODULE STATUS ─────────────────────────────────────────┐
│ ● PRODUCTION │ ████████████████████ 100% COMPLETE       │
└─────────────────────────────────────────────────────────┘

## Navigation

```json
{
  "current": "dashboard/src/app/monitor/instagram/README.md",
  "parent": "dashboard/src/app/monitor/instagram/README.md"
}
```

## Overview

Real-time Instagram monitoring dashboard for tracking scraper status, data collection progress, and system health. This module provides visibility into the Instagram data pipeline and helps identify issues before they impact operations.

**Purpose**: Monitor Instagram scraping operations, API health, and data quality to ensure reliable creator discovery and analytics.

## Features

### Current Implementation ✅
- **Real-time Dashboard**: Live scraper metrics (success rate, cost, cycle time)
- **Start/Stop Controls**: Manual scraper control with optimistic UI updates
- **4 Log Viewers**: Organized 2x2 grid layout
  - Instagram Scraper Activity (main operations)
  - Related Creators (discovery logs)
  - Creator Updates (addition/modification logs)
  - AI Tagging (visual attribute processing logs)
- **Metrics Cards**: Success rate, cycle length, cost tracking
- **Auto-refresh**: 20-second polling for real-time updates
- **Supabase Integration**: System logs with source filtering

### Planned Features 🟡
- **Queue Monitoring**: Job queue visualization
- **Alert System**: Automated notifications

## Potential Improvements

### Monitoring Features
1. **Predictive Alerts**: ML-based issue prediction
2. **Auto-remediation**: Automatic error recovery
3. **Historical Analysis**: Trend-based insights
4. **Custom Dashboards**: User-configurable views
5. **Mobile Monitoring**: Mobile app for alerts

### Technical Enhancements
1. **Grafana Integration**: Advanced visualization
2. **Prometheus Metrics**: Industry-standard monitoring
3. **Log Aggregation**: Centralized log management
4. **Distributed Tracing**: Request flow tracking

## Monitoring Metrics

### Scraper Metrics
```typescript
interface ScraperMetrics {
  // Status
  status: 'running' | 'stopped' | 'error'
  uptime: number  // seconds
  last_run: Date
  
  // Performance
  profiles_scraped: number
  posts_collected: number
  scrape_rate: number  // per minute
  error_rate: number  // percentage
  
  // Queue
  queue_size: number
  processing_time: number  // avg seconds
  backlog: number
  
  // Resources
  memory_usage: number  // MB
  cpu_usage: number  // percentage
  api_calls: number
  rate_limit_remaining: number
}
```

### Data Quality Metrics
```typescript
interface DataQuality {
  completeness: number  // % of required fields
  accuracy: number  // validation pass rate
  freshness: number  // hours since update
  duplicates: number  // duplicate records
  anomalies: number  // detected issues
}
```

## Alert Configurations

### Critical Alerts
- Scraper completely stopped
- API authentication failure
- Database connection lost
- Rate limit exceeded
- Data corruption detected

### Warning Alerts
- High error rate (>5%)
- Slow processing (>2x normal)
- Queue backlog growing
- Memory usage high (>80%)
- Stale data (>24 hours)

### Info Alerts
- Scraper restarted
- Configuration changed
- Maintenance scheduled
- New version deployed
- Threshold adjusted

## Current Dashboard Layout

### Metrics Row (4 cards)
1. **Start/Stop Button** - Scraper control with loading states
2. **Success Rate** - Percentage + successful/total ratio
3. **Current Cycle** - Elapsed time since cycle start
4. **Today's Cost** - Daily spend + monthly projection

### Logs Section (2x2 Grid)

**Row 1: Core Operations**
- **Instagram Scraper Activity** (left)
  - Source filter: `instagram_scraper`
  - Shows: Scraping progress, API calls, errors
  - Height: calc((100vh - 400px) / 2)

- **Related Creators** (right)
  - Source filter: `instagram_related_creators`
  - Shows: Discovery operations, API responses
  - Height: calc((100vh - 400px) / 2)

**Row 2: Content Processing**
- **Creator Updates** (left)
  - Source filter: `creator_addition`
  - Shows: New creators, profile updates
  - Height: calc((100vh - 400px) / 2)

- **AI Tagging** (right)
  - Source filter: `instagram_ai_tagging`
  - Shows: Visual analysis, tag assignments, costs
  - Height: calc((100vh - 400px) / 2)

**Layout Features**:
- Responsive: Side-by-side on desktop, stacked on mobile
- Equal width distribution (flex-1)
- Consistent styling and refresh rates (5s)
- Auto-scroll enabled for all viewers

## API Endpoints

- `GET /api/monitor/instagram/status` - Overall status
- `GET /api/monitor/instagram/scrapers` - Scraper list
- `GET /api/monitor/instagram/metrics` - Performance metrics
- `GET /api/monitor/instagram/alerts` - Active alerts
- `POST /api/monitor/instagram/scrapers/:id/restart` - Restart scraper
- `POST /api/monitor/instagram/alerts/:id/acknowledge` - Ack alert

## UI Components

### Status Components
- `StatusIndicator` - Overall health indicator
- `ScraperCard` - Individual scraper status
- `MetricGauge` - Visual metric display
- `AlertBadge` - Alert count indicator

### Chart Components
- `TimeSeriesChart` - Metrics over time
- `QueueChart` - Queue size visualization
- `ErrorRateChart` - Error tracking
- `PerformanceChart` - Speed metrics

## Monitoring Tools

### Internal Tools
- Custom dashboard (this page)
- API health endpoints
- Log aggregation
- Metric collection

### External Integrations
- Slack notifications
- Email alerts
- PagerDuty (critical)
- Datadog (optional)

## Troubleshooting Guide

### Common Issues

1. **Scraper Stopped**
   - Check API credentials
   - Verify rate limits
   - Review error logs
   - Restart if needed

2. **High Error Rate**
   - Check Instagram changes
   - Verify selectors
   - Review proxy status
   - Adjust retry logic

3. **Slow Processing**
   - Check queue size
   - Verify database performance
   - Review memory usage
   - Scale if needed

## Best Practices

### Monitoring Guidelines
1. Check dashboard daily
2. Respond to critical alerts immediately
3. Review metrics weekly
4. Update thresholds monthly
5. Document all incidents

### Alert Management
1. Acknowledge alerts promptly
2. Document resolution steps
3. Update runbooks
4. Adjust thresholds as needed
5. Conduct post-mortems

## Related Documentation

- **Instagram Dashboard**: `/src/app/instagram/README.md`
- **Reddit Monitor**: `/src/app/monitor/reddit/README.md`
- **API Documentation**: `/src/app/api/instagram/scraper/README.md`

---

*Instagram Monitor - Ensuring reliable Instagram data collection for B9 Agency operations*

---

_Version: 2.0.0 | Updated: 2025-10-11 | Layout: 2x2 Grid_