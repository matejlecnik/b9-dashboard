# Deployment Guide

┌─ DEPLOYMENT STATUS ─────────────────────────────────────┐
│ ● LIVE        │ ████████████████████ 100% DEPLOYED     │
└─────────────────────────────────────────────────────────┘

## Navigation

```json
{
  "parent": "README.md",
  "current": "DEPLOYMENT.md",
  "siblings": [
    {"path": "ARCHITECTURE.md", "desc": "System design", "status": "STABLE"},
    {"path": "API.md", "desc": "API reference", "status": "COMPLETE"},
    {"path": "MONITORING.md", "desc": "Health monitoring", "status": "ACTIVE"}
  ]
}
```

## Production Deployment

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

## Prerequisites

```bash
## Required
✓ Render.com account
✓ GitHub repository connected
✓ Supabase database configured
✓ OpenAI API key

## Optional
□ Custom domain
□ Render Dashboard access
□ Environment variable backup
```

## Environment Variables

```json
{
  "required": {
    "DATABASE_URL": {
      "source": "Supabase",
      "format": "postgresql://user:pass@host:port/db",
      "purpose": "PostgreSQL connection"
    },
    "SUPABASE_URL": {
      "source": "Supabase Project Settings",
      "format": "https://xxx.supabase.co",
      "purpose": "Supabase REST API"
    },
    "SUPABASE_SERVICE_ROLE_KEY": {
      "source": "Supabase API Settings",
      "format": "eyJxxx...",
      "purpose": "Full database access",
      "security": "CRITICAL - Never commit to git"
    },
    "OPENAI_API_KEY": {
      "source": "OpenAI Platform",
      "format": "sk-xxx",
      "purpose": "AI categorization"
    }
  },
  "optional": {
    "PORT": {
      "default": 8000,
      "purpose": "HTTP port (Render auto-configures)"
    },
    "ENVIRONMENT": {
      "default": "production",
      "options": ["development", "staging", "production"]
    },
    "LOG_LEVEL": {
      "default": "INFO",
      "options": ["DEBUG", "INFO", "WARNING", "ERROR"]
    }
  }
}
```

## Deployment Steps

### 1. Initial Setup

```bash
## 1. Push code to GitHub
git add .
git commit -m "Prepare for deployment"
git push origin main

## 2. Create Render Web Service
## - Go to dashboard.render.com
## - Click "New +" → "Web Service"
## - Connect GitHub repository
```

### 2. Configure Service

```json
{
  "settings": {
    "name": "b9-dashboard-api",
    "environment": "Python 3",
    "build_command": "pip install -r requirements.txt",
    "start_command": "python start.py",
    "plan": "Standard ($25/month)",
    "region": "Oregon (US West)"
  }
}
```

### 3. Add Environment Variables

```bash
## In Render Dashboard → Environment
DATABASE_URL=postgresql://...
SUPABASE_URL=https://...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
OPENAI_API_KEY=sk-...
PORT=8000
ENVIRONMENT=production
```

### 4. Deploy

```bash
## Render auto-deploys on push to main
## Or manual deploy:
## 1. Go to Render Dashboard
## 2. Click "Manual Deploy" → "Deploy latest commit"
## 3. Monitor build logs
```

### 5. Verify Deployment

```bash
## Check health endpoint
curl https://b9-dashboard.onrender.com/health

## Expected response:
{
  "status": "healthy",
  "version": "3.4.5",
  "timestamp": "2025-10-01T..."
}

## Check scrapers
curl https://b9-dashboard.onrender.com/api/scraper/status

## Check detailed health
curl -H "X-API-Key: your-key" \
  https://b9-dashboard.onrender.com/health/detailed
```

## Post-Deployment

```json
{
  "tasks": [
    {
      "task": "Enable auto-start for scrapers",
      "method": "Update system_control table",
      "sql": "UPDATE system_control SET enabled = true WHERE script_name = 'reddit_scraper'"
    },
    {
      "task": "Monitor logs",
      "location": "Render Dashboard → Logs",
      "watch_for": ["startup messages", "scraper status", "errors"]
    },
    {
      "task": "Verify scrapers running",
      "endpoint": "/api/scraper/status",
      "check": "is_running = true"
    },
    {
      "task": "Test API endpoints",
      "endpoints": ["/health", "/api/stats", "/api/scraper/status"]
    }
  ]
}
```

## Monitoring

```bash
## View live logs
## Render Dashboard → Service → Logs

## Check memory usage
## Render Dashboard → Metrics → Memory

## Monitor requests
## Render Dashboard → Metrics → Bandwidth

## Set up alerts
## Render Dashboard → Notifications
## - Deploy failures
## - High memory usage (> 1.5GB)
## - Service errors
```

## Rollback Procedure

```json
{
  "manual_rollback": {
    "step_1": "Go to Render Dashboard → Deploys",
    "step_2": "Find previous successful deploy",
    "step_3": "Click 'Rollback to this version'",
    "step_4": "Confirm and monitor deployment"
  },
  "git_rollback": {
    "step_1": "git revert HEAD",
    "step_2": "git push origin main",
    "step_3": "Render auto-deploys reverted code"
  }
}
```

## Troubleshooting

```json
{
  "issues": {
    "build_fails": {
      "symptoms": "Deployment fails during pip install",
      "solutions": [
        "Check requirements.txt syntax",
        "Verify Python version (3.11+)",
        "Check for missing system dependencies"
      ]
    },
    "runtime_crash": {
      "symptoms": "Service starts but crashes immediately",
      "solutions": [
        "Check environment variables",
        "Verify DATABASE_URL is correct",
        "Check start.py for errors in logs",
        "Ensure port binding to $PORT"
      ]
    },
    "scraper_not_starting": {
      "symptoms": "API works but scrapers don't start",
      "solutions": [
        "Check system_control table enabled=true",
        "Verify scraper paths in start.py",
        "Check log files: /tmp/*_scraper.log",
        "Ensure Supabase credentials are correct"
      ]
    },
    "high_memory": {
      "symptoms": "Memory usage > 1.5GB",
      "solutions": [
        "Restart service",
        "Check for memory leaks in logs",
        "Reduce batch sizes in scrapers",
        "Consider upgrading to Pro plan"
      ]
    }
  }
}
```

## Performance Optimization

```json
{
  "recommendations": [
    {
      "area": "Database",
      "action": "Use connection pooling (max 20)",
      "impact": "Reduced connection overhead"
    },
    {
      "area": "Caching",
      "action": "Enable in-memory caching",
      "impact": "40% faster API responses"
    },
    {
      "area": "Scrapers",
      "action": "Optimize batch sizes and intervals",
      "impact": "Lower memory usage"
    },
    {
      "area": "API",
      "action": "Enable GZIP compression",
      "impact": "Smaller response sizes"
    }
  ]
}
```

## Scaling Strategy

```json
{
  "current": {
    "plan": "Standard",
    "memory": "2GB",
    "cpu": "1 vCPU",
    "cost": "$25/month"
  },
  "upgrade_triggers": {
    "memory_usage": "> 1.5GB consistently",
    "cpu_usage": "> 80%",
    "response_time": "> 500ms p95",
    "concurrent_requests": "> 100"
  },
  "next_tier": {
    "plan": "Pro",
    "memory": "4GB",
    "cpu": "2 vCPU",
    "cost": "$85/month"
  }
}
```

## CI/CD Pipeline

```json
{
  "automatic_deployment": {
    "trigger": "Push to main branch",
    "steps": [
      "1. Render detects new commit",
      "2. Pulls latest code",
      "3. Runs build command (pip install)",
      "4. Runs health checks",
      "5. Switches traffic to new version",
      "6. Keeps old version for rollback (5 min)"
    ],
    "duration": "~2-3 minutes"
  },
  "manual_deployment": {
    "when": "Testing specific commit",
    "how": "Render Dashboard → Manual Deploy → Select commit"
  }
}
```

## Security

```json
{
  "best_practices": {
    "secrets": {
      "storage": "Render Environment Variables (encrypted)",
      "rotation": "Rotate API keys every 90 days",
      "access": "Limited to service admins"
    },
    "cors": {
      "allowed_origins": ["https://b9-dashboard.vercel.app"],
      "credentials": true
    },
    "rate_limiting": {
      "enabled": true,
      "limits": "100 req/min default, 500 req/min authenticated"
    },
    "https": {
      "status": "Enabled by default (Render)",
      "redirect": "HTTP → HTTPS automatic"
    }
  }
}
```

## Maintenance Schedule

```json
{
  "regular_tasks": [
    {
      "task": "Review logs",
      "frequency": "Daily",
      "duration": "5 minutes"
    },
    {
      "task": "Check system metrics",
      "frequency": "Daily",
      "duration": "5 minutes"
    },
    {
      "task": "Database cleanup",
      "frequency": "Weekly",
      "duration": "10 minutes",
      "action": "Run log cleanup query"
    },
    {
      "task": "Dependency updates",
      "frequency": "Monthly",
      "duration": "30 minutes",
      "action": "Update requirements.txt"
    },
    {
      "task": "API key rotation",
      "frequency": "Quarterly",
      "duration": "15 minutes"
    }
  ]
}
```

---

_Deployment Version: 3.4.5 | Platform: Render.com | Updated: 2025-10-01_
_Navigate: [← docs/](README.md) | [→ MONITORING.md](MONITORING.md) | [→ API.md](API.md)_
