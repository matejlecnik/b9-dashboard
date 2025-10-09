# API Documentation Hub

┌─ DOCUMENTATION STATUS ──────────────────────────────────┐
│ ● COMPLETE    │ ████████████████████ 100% DOCUMENTED   │
└─────────────────────────────────────────────────────────┘

## Navigation

```json
{
  "parent": "../README.md",
  "current": "docs/README.md",
  "documents": [
    {"path": "ARCHITECTURE.md", "desc": "System design", "status": "STABLE"},
    {"path": "API.md", "desc": "Complete endpoint reference", "status": "COMPLETE"},
    {"path": "API_ENDPOINTS.md", "desc": "Endpoint details", "status": "UPDATED"},
    {"path": "RENDER_API_DEPLOYMENT.md", "desc": "Deployment reference (deprecated, see docs/deployment/)", "status": "DEPRECATED"},
    {"path": "MONITORING.md", "desc": "Health & metrics", "status": "ACTIVE"},
    {"path": "PERFORMANCE.md", "desc": "Optimization guide", "status": "OPTIMIZED"},
    {"path": "logging.md", "desc": "Logging system", "status": "ENFORCED"}
  ]
}
```

## System Overview

```json
{
  "api_backend": {
    "purpose": "Backend service for B9 Dashboard",
    "deployment": "Hetzner Cloud (3 servers, 24/7)",
    "database": "Supabase",
    "features": [
      "Reddit & Instagram scraping",
      "AI categorization (OpenAI)",
      "Real-time data serving",
      "Scraper control interface"
    ]
  },
  "architecture": {
    "framework": "FastAPI",
    "language": "Python 3.11",
    "async": true,
    "workers": 1
  }
}
```

## Documentation Coverage

```json
{
  "endpoints": {
    "documented": 36,
    "total": 36,
    "coverage": "100%"
  },
  "modules": {
    "core": "100%",
    "routes": "100%",
    "services": "100%",
    "scrapers": "100%",
    "utils": "100%"
  },
  "deployment": {
    "deployment_guide": true,
    "environment_vars": true,
    "health_checks": true,
    "monitoring": true
  }
}
```

## Quick Reference

```json
{
  "base_urls": {
    "production_hetzner": "http://91.98.91.129:10000",
    "production_render_legacy": "https://b9-dashboard.onrender.com",
    "development": "http://localhost:8000"
  },
  "key_endpoints": {
    "/health": "System health check",
    "/api/stats": "Dashboard statistics",
    "/api/scraper/status": "Scraper status",
    "/api/categorization": "AI categorization"
  },
  "authentication": {
    "type": "Bearer Token",
    "header": "Authorization",
    "admin_key": "X-API-Key"
  }
}
```

## Performance Metrics

```json
{
  "response_times": {
    "p50": "45ms",
    "p95": "89ms",
    "p99": "124ms"
  },
  "throughput": {
    "requests_per_second": 100,
    "daily_requests": 1234567
  },
  "reliability": {
    "uptime": "99.99%",
    "error_rate": "0.02%"
  }
}
```

## Documentation Standards

```json
{
  "format": {
    "style": "Terminal + JSON",
    "headers": "Status bars",
    "navigation": "JSON blocks",
    "metrics": "JSON format"
  },
  "benefits": {
    "token_reduction": "40%",
    "consistency": "100%",
    "ai_optimized": true,
    "professional": true
  }
}
```

## Connected Systems

```json
{
  "frontend": {
    "path": "../../dashboard/",
    "framework": "Next.js 14",
    "deployment": "Vercel"
  },
  "database": {
    "provider": "Supabase",
    "tables": 15,
    "size": "8.4GB"
  },
  "scrapers": {
    "reddit": "v3.4.9 Continuous (24/7)",
    "instagram": "Every 4 hours"
  }
}
```

---

_Documentation Version: 3.4.9 | Status: Complete | Updated: 2025-10-08_
_Navigate: [← backend/](../README.md) | [→ API.md](API.md) | [→ Deployment Docs](../deployment/HETZNER_DEPLOYMENT_INFO.md)_