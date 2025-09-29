# Deployment Guide

┌─ DEPLOYMENT STATUS ─────────────────────────────────────┐
│ ● PRODUCTION  │ ████████████████████ 100% LIVE         │
└─────────────────────────────────────────────────────────┘

## Navigation

```json
{
  "parent": "../README.md",
  "current": "docs/DEPLOYMENT.md",
  "siblings": [
    {"path": "API_ENDPOINTS.md", "desc": "Endpoint reference", "status": "REFERENCE"},
    {"path": "MONITORING.md", "desc": "Health monitoring", "status": "GUIDE"},
    {"path": "PERFORMANCE.md", "desc": "Optimization", "status": "GUIDE"}
  ]
}
```

## Render Configuration

```json
{
  "service": {
    "type": "Web Service",
    "environment": "Python 3.11",
    "region": "Oregon (US West)",
    "plan": "Starter ($7/month)",
    "auto_deploy": true
  },
  "build": {
    "command": "pip install -r requirements.txt",
    "start_command": "python main.py",
    "health_check_path": "/health",
    "port": 8000
  },
  "resources": {
    "memory": "512MB",
    "cpu": "0.5 vCPU",
    "disk": "Ephemeral",
    "scaling": "Manual"
  }
}
```

## Environment Variables

```json
{
  "required": {
    "SUPABASE_URL": "Database URL",
    "SUPABASE_KEY": "Service role key",
    "RAPIDAPI_KEY": "Instagram API key",
    "REDDIT_CLIENT_ID": "Reddit OAuth ID",
    "REDDIT_CLIENT_SECRET": "Reddit OAuth secret",
    "API_KEY": "Admin API key"
  },
  "optional": {
    "DEBUG": "false",
    "LOG_LEVEL": "INFO",
    "PORT": "8000",
    "WORKERS": "1"
  }
}
```

## Deployment Steps

```json
{
  "initial_setup": [
    {"step": 1, "action": "Connect GitHub repo to Render"},
    {"step": 2, "action": "Create new Web Service"},
    {"step": 3, "action": "Configure build settings"},
    {"step": 4, "action": "Add environment variables"},
    {"step": 5, "action": "Deploy"}
  ],
  "updates": [
    {"method": "auto", "trigger": "Git push to main"},
    {"method": "manual", "trigger": "Render dashboard"},
    {"method": "api", "trigger": "Render API call"}
  ]
}
```

## Health Checks

```json
{
  "configuration": {
    "path": "/health",
    "interval": 30,
    "timeout": 10,
    "failure_threshold": 3,
    "success_threshold": 1
  },
  "monitoring": {
    "uptime": "99.99%",
    "last_downtime": "None in 30 days",
    "avg_response_time": "45ms"
  }
}
```

## Rollback Strategy

```json
{
  "automatic": {
    "enabled": true,
    "triggers": [
      "Health check failures",
      "Crash loops",
      "Memory exceeded"
    ],
    "rollback_to": "Last successful deploy"
  },
  "manual": {
    "via": "Render dashboard",
    "history": "Last 10 deployments",
    "time_to_rollback": "< 1 minute"
  }
}
```

---

_Deployment Version: 2.0.0 | Status: Production | Updated: 2024-01-29_
_Navigate: [← docs/](README.md) | [→ MONITORING.md](MONITORING.md)_