# Deployment Guide

┌─ DEPLOYMENT STATUS ─────────────────────────────────────┐
│ ● OPERATIONAL │ ████████████████████ 100% AUTOMATED    │
└─────────────────────────────────────────────────────────┘

## Navigation

```json
{
  "parent": "../../CLAUDE.md",
  "current": "DEPLOYMENT.md",
  "siblings": [
    {"path": "DEPLOYMENT_SECRETS.md", "desc": "Secret management", "status": "SECURE"}
  ],
  "related": [
    {"path": "../development/DOCUMENTATION_MAP.md", "desc": "Full navigation", "status": "GUIDE"}
  ]
}
```

## Infrastructure

```json
{
  "services": {
    "frontend": {
      "provider": "Vercel",
      "framework": "Next.js 15",
      "url": "b9-dashboard.com",
      "status": "PRODUCTION"
    },
    "backend": {
      "provider": "Render",
      "framework": "FastAPI",
      "url": "api-render.onrender.com",
      "status": "PRODUCTION"
    },
    "database": {
      "provider": "Supabase",
      "type": "PostgreSQL 15",
      "region": "us-east-1",
      "status": "OPERATIONAL"
    }
  }
}
```

## Branch Strategy

```json
{
  "branches": {
    "main": {
      "environment": "PRODUCTION",
      "url": "b9-dashboard.com",
      "auto_deploy": true,
      "protection": "ENABLED"
    },
    "preview": {
      "environment": "STAGING",
      "url": "b9-dashboard-preview-*.vercel.app",
      "auto_deploy": true,
      "protection": "DISABLED"
    },
    "develop": {
      "environment": "DEVELOPMENT",
      "url": "localhost:3000",
      "auto_deploy": false,
      "protection": "DISABLED"
    }
  }
}
```

## Deployment Process

```bash
# Development Testing
$ git checkout preview
$ git add .
$ git commit -m "feat: description"
$ git push origin preview
# Auto-deploys to preview URL

# Production Deployment
$ git checkout main
$ git merge preview
$ git push origin main
# Auto-deploys to production
```

## Environment Variables

```json
{
  "frontend": {
    "required": [
      "NEXT_PUBLIC_SUPABASE_URL",
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      "NEXT_PUBLIC_API_URL"
    ],
    "optional": [
      "NEXT_PUBLIC_ENVIRONMENT",
      "NEXT_PUBLIC_LOG_LEVEL"
    ]
  },
  "backend": {
    "required": [
      "SUPABASE_URL",
      "SUPABASE_SERVICE_ROLE_KEY",
      "OPENAI_API_KEY",
      "DATABASE_URL"
    ],
    "optional": [
      "LOG_LEVEL",
      "ENVIRONMENT",
      "PORT"
    ]
  }
}
```

## Health Checks

```json
{
  "endpoints": {
    "frontend": {
      "health": "https://b9-dashboard.com/api/health",
      "status": "https://b9-dashboard.com/api/status"
    },
    "backend": {
      "health": "https://api-render.onrender.com/health",
      "ready": "https://api-render.onrender.com/ready",
      "metrics": "https://api-render.onrender.com/metrics"
    }
  },
  "monitoring": {
    "interval": "5min",
    "timeout": "30s",
    "retries": 3
  }
}
```

## Performance Metrics

```
Response Times:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Frontend     [███░░░░░░░] 89ms P95
Backend API  [███░░░░░░░] 92ms P95
Database     [██░░░░░░░░] 45ms P95
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Uptime:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Frontend     [████████████████████] 99.99%
Backend API  [████████████████████] 99.99%
Database     [████████████████████] 100.0%
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## CI/CD Pipeline

```json
{
  "stages": [
    {
      "name": "lint",
      "command": "npm run lint",
      "timeout": "2min",
      "required": true
    },
    {
      "name": "typecheck",
      "command": "npm run typecheck",
      "timeout": "3min",
      "required": true
    },
    {
      "name": "test",
      "command": "npm test",
      "timeout": "5min",
      "required": true
    },
    {
      "name": "build",
      "command": "npm run build",
      "timeout": "5min",
      "required": true
    },
    {
      "name": "deploy",
      "command": "vercel deploy",
      "timeout": "10min",
      "required": true
    }
  ]
}
```

## Rollback Procedures

```bash
# Frontend Rollback
$ vercel rollback <deployment-id>

# Backend Rollback
$ render deploy --service api-render --commit <commit-sha>

# Database Rollback
$ supabase db reset --version <migration-version>
```

## Common Issues

```json
{
  "build_failure": {
    "symptoms": ["Build failed", "Type errors"],
    "diagnosis": "npm run typecheck",
    "solution": "Fix TypeScript errors, check imports"
  },
  "env_missing": {
    "symptoms": ["Undefined variables", "API failures"],
    "diagnosis": "vercel env ls",
    "solution": "Add missing environment variables"
  },
  "memory_limit": {
    "symptoms": ["Out of memory", "Build timeout"],
    "diagnosis": "Check build logs",
    "solution": "Optimize bundle size, increase limits"
  },
  "rate_limit": {
    "symptoms": ["429 errors", "API throttling"],
    "diagnosis": "Check API logs",
    "solution": "Implement caching, reduce requests"
  }
}
```

## Execution Plan

```json
{
  "daily": {
    "tasks": [
      {"id": "DEPLOY-001", "task": "Check health endpoints", "automated": true},
      {"id": "DEPLOY-002", "task": "Monitor error rates", "automated": true},
      {"id": "DEPLOY-003", "task": "Review deployment logs", "manual": true}
    ]
  },
  "weekly": {
    "tasks": [
      {"id": "DEPLOY-004", "task": "Update dependencies", "effort": "2h"},
      {"id": "DEPLOY-005", "task": "Performance audit", "effort": "1h"},
      {"id": "DEPLOY-006", "task": "Security scan", "effort": "1h"}
    ]
  },
  "monthly": {
    "tasks": [
      {"id": "DEPLOY-007", "task": "Cost analysis", "effort": "1h"},
      {"id": "DEPLOY-008", "task": "Disaster recovery test", "effort": "4h"},
      {"id": "DEPLOY-009", "task": "Infrastructure review", "effort": "2h"}
    ]
  }
}
```

## Cost Analysis

```json
{
  "monthly_costs": {
    "vercel": {"plan": "Pro", "cost": 20, "usage": "5GB bandwidth"},
    "render": {"plan": "Starter", "cost": 7, "usage": "512MB RAM"},
    "supabase": {"plan": "Pro", "cost": 25, "usage": "8GB database"},
    "total": 52
  },
  "projections": {
    "3_months": 156,
    "6_months": 312,
    "12_months": 624
  }
}
```

## Commands

```bash
# Deployment
$ npm run deploy:preview    # Deploy to staging
$ npm run deploy:prod       # Deploy to production

# Monitoring
$ vercel logs              # Frontend logs
$ render logs              # Backend logs
$ supabase logs            # Database logs

# Rollback
$ vercel rollback          # Rollback frontend
$ render rollback          # Rollback backend

# Health Check
$ curl https://b9-dashboard.com/api/health
$ curl https://api-render.onrender.com/health
```

---

_Deployment Version: 2.0.0 | Providers: Vercel + Render + Supabase | Updated: 2024-01-28_
_Navigate: [← CLAUDE.md](../../CLAUDE.md) | [→ DEPLOYMENT_SECRETS.md](DEPLOYMENT_SECRETS.md)_