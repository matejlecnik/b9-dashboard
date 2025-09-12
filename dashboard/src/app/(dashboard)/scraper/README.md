# Scraper Monitoring

## Overview
Real-time monitoring dashboard for the Python Reddit scraper system. Tracks performance metrics, account health, and discovery rates to ensure continuous data collection for B9 Agency's subreddit analysis. Critical for maintaining 17,100 requests/hour capacity and business continuity.

**Core Features**: Real-time statistics, account status monitoring, throughput metrics, time-range filters (24h/7d/30d), SSR/hydration-safe rendering.

## TODO List
- [ ] Fix data display issue - currently not showing real scraper data (Priority #1)
- [ ] Add comprehensive Reddit account health monitoring dashboard
- [ ] Implement proxy status and performance tracking
- [ ] Build alert system for critical failures (email/SMS notifications)
- [ ] Add auto-restart controls for remote scraper operations
- [ ] Create data quality metrics tracking (accuracy and completeness)
- [ ] Implement performance trend analysis with historical charts

## Current Errors
- **CRITICAL**: Currently not displaying real scraper data from backend
- No alerting system for critical failures (account auth, rate limits)
- Missing proxy performance monitoring and rotation visibility
- Account rotation logic not exposed to user interface
- No automated failure recovery notifications

## Potential Improvements
- Advanced account health dashboard with individual Reddit account status
- Comprehensive proxy monitoring with rotation tracking and performance metrics
- Intelligent alert system with escalation procedures for different failure types
- Historical performance analysis with trend identification and forecasting
- Automated recovery controls with remote restart and configuration management
- Integration with external monitoring services for 24/7 oversight

## Technical Notes
- **API Endpoints**: `GET /api/scraper/status`, `GET /api/scraper/accounts`
- **Data Source**: `scraper_accounts`, `scraper_logs` (19k+ entries), `subreddits`
- **Performance KPIs**: 150 subreddits/hour, 500-1000 discoveries/day, >95% success rate
- **Architecture**: 10 Reddit accounts, 100 req/min per account, PythonAnywhere hosting
- **SSR/Hydration**: Deterministic formatting helpers, mounted gating, debounced refresh

**Related Systems**: [Python Scraper](../../../scraper/README.md) → [Subreddit Review](../subreddit-review/README.md)
