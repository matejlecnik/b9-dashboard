# API Deployment Guide (Render)

┌─ DEPLOYMENT STATUS ─────────────────────────────────────┐
│ ● LIVE        │ ████████████████████ 100% DEPLOYED     │
└─────────────────────────────────────────────────────────┘

## Navigation

```json
{
  "parent": "../README.md",
  "current": "DEPLOYMENT.md",
  "main_deployment_guide": "../../docs/deployment/DEPLOYMENT.md",
  "siblings": [
    {"path": "ARCHITECTURE.md", "desc": "System design", "status": "STABLE"},
    {"path": "API.md", "desc": "API reference", "status": "COMPLETE"},
    {"path": "MONITORING.md", "desc": "Health monitoring", "status": "ACTIVE"}
  ]
}
```

## Notice

For complete deployment instructions including both frontend (Vercel) and backend (Render), see:
**[`../../docs/deployment/DEPLOYMENT.md`](../../docs/deployment/DEPLOYMENT.md)**

This document contains only API-specific Render configuration.

## API-Specific Render Configuration

```json
{
  "platform": "Render.com",
  "service_type": "Web Service",
  "plan": "Standard",
  "region": "us-west (Oregon)",
  "url": "https://b9-dashboard.onrender.com",
  "auto_deploy": {
    "enabled": true,
    "branch": "main",
    "trigger": "on_push"
  }
}
```

## API Service Settings

```json
{
  "render_settings": {
    "name": "b9-dashboard-api",
    "environment": "Python 3",
    "build_command": "pip install -r requirements.txt",
    "start_command": "python start.py",
    "plan": "Standard ($25/month)",
    "region": "Oregon (US West)"
  }
}
```

## Required Environment Variables (API Only)

```bash
## Core API Variables
DATABASE_URL=postgresql://...
SUPABASE_URL=https://...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
OPENAI_API_KEY=sk-...
PORT=8000
ENVIRONMENT=production

## Scraper Configuration
REDDIT_SCRAPER_ENABLED=true
INSTAGRAM_SCRAPER_ENABLED=true
MAX_SCRAPER_WORKERS=4
```

## API Health Checks

```json
{
  "endpoints": {
    "health": "/health",
    "metrics": "/metrics",
    "status": "/api/status"
  },
  "monitoring": {
    "uptime": "99.99%",
    "response_time": "89ms p95",
    "error_rate": "<0.1%"
  }
}
```

## Render.yaml Configuration

```yaml
services:
  - type: web
    name: b9-dashboard-api
    runtime: python
    plan: standard
    buildCommand: pip install -r requirements.txt
    startCommand: python start.py
    envVars:
      - key: PORT
        value: 8000
      - key: ENVIRONMENT
        value: production
```

## Troubleshooting API Deployment

### Common Issues
1. **Build fails**: Check `requirements.txt` for missing dependencies
2. **Start fails**: Verify `start.py` exists and is executable
3. **502 errors**: Check PORT environment variable matches Render's expectations
4. **Timeout errors**: Increase scraper timeouts in config

### Logs
```bash
## View build logs
https://dashboard.render.com/web/srv-xxx/logs

## View runtime logs
https://dashboard.render.com/web/srv-xxx/events
```

## Quick Commands

```bash
## Deploy manually
git push origin main

## Check deployment status
curl https://b9-dashboard.onrender.com/health

## View logs
render logs --service b9-dashboard-api --tail
```

---
_Version: 2.0.0 | Updated: 2025-10-05 | API-Specific Only_
_Navigate: [→ Main Deployment Guide](../../docs/deployment/DEPLOYMENT.md) | [← README](../README.md)_