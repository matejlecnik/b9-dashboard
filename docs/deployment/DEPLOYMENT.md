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
    {"path": "PRODUCTION_SETUP.md", "desc": "Complete setup guide", "status": "NEW"},
    {"path": "TROUBLESHOOTING.md", "desc": "Issue resolution", "status": "PENDING"},
    {"path": "DEPLOYMENT_SECRETS.md", "desc": "Secret management", "status": "SECURE"}
  ],
  "related": [
    {"path": "../INDEX.md", "desc": "Full navigation", "status": "GUIDE"}
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
      "url": "https://b9-dashboard.com",
      "ssl": "Cloudflare DNS (Automatic)",
      "status": "PRODUCTION"
    },
    "backend": {
      "provider": "Hetzner Cloud + Nginx",
      "framework": "FastAPI (Docker)",
      "url": "https://api.b9-dashboard.com",
      "ssl": "Cloudflare Flexible SSL",
      "architecture": "Nginx reverse proxy → FastAPI :10000",
      "status": "PRODUCTION"
    },
    "media": {
      "provider": "Cloudflare R2",
      "url": "https://media.b9-dashboard.com",
      "cdn": "Global Cloudflare network",
      "status": "PRODUCTION"
    },
    "database": {
      "provider": "Supabase",
      "type": "PostgreSQL 15 + Redis",
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
## Development Testing
$ git checkout preview
$ git add .
$ git commit -m "feat: description"
$ git push origin preview
## Auto-deploys to preview URL

## Production Deployment
$ git checkout main
$ git merge preview
$ git push origin main
## Auto-deploys to production
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
  "backend_hetzner": {
    "required": [
      "SUPABASE_URL",
      "SUPABASE_SERVICE_ROLE_KEY",
      "OPENAI_API_KEY",
      "RAPIDAPI_KEY",
      "R2_ACCOUNT_ID",
      "R2_ACCESS_KEY_ID",
      "R2_SECRET_ACCESS_KEY",
      "R2_BUCKET_NAME",
      "REDIS_HOST",
      "REDIS_PORT",
      "REDIS_PASSWORD"
    ],
    "optional": [
      "LOG_LEVEL",
      "ENVIRONMENT",
      "PORT",
      "WORKER_ID"
    ],
    "notes": "Workers use same env vars but with REDIS_HOST=91.98.91.129"
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
      "health": "https://api.b9-dashboard.com/health",
      "ready": "https://api.b9-dashboard.com/ready",
      "metrics": "https://api.b9-dashboard.com/metrics",
      "docs": "https://api.b9-dashboard.com/docs"
    },
    "media": {
      "test": "https://media.b9-dashboard.com/",
      "cdn_status": "Global Cloudflare R2"
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
## Frontend Rollback
$ vercel rollback <deployment-id>

## Backend Rollback
$ ssh hetzner "docker stop b9-api && docker run ... <previous-image>"

## Database Rollback
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
    "hetzner": {"plan": "1 VPS", "cost": 11, "usage": "FastAPI + Nginx + Redis"},
    "cloudflare": {"plan": "Free", "cost": 0, "usage": "DNS + R2 (10GB free)"},
    "supabase": {"plan": "Pro", "cost": 25, "usage": "8GB database"},
    "total": 56,
    "savings_vs_render": "$569/month (91% cost reduction)"
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
## Deployment
$ npm run deploy:preview    # Deploy to staging
$ npm run deploy:prod       # Deploy to production

## Monitoring
$ vercel logs                          # Frontend logs
$ ssh hetzner "docker logs b9-api"     # Backend logs
$ supabase logs                        # Database logs

## Rollback
$ vercel rollback                              # Rollback frontend
$ ssh hetzner "docker restart b9-api"          # Restart backend
$ ssh hetzner "docker pull image && restart"   # Update backend

## Health Check
$ curl https://b9-dashboard.com/api/health
$ curl https://api.b9-dashboard.com/health
$ curl -I https://media.b9-dashboard.com/
```

---

_Deployment Version: 3.0.0 | Infrastructure: Vercel + Hetzner + Cloudflare + Supabase | Updated: 2025-10-10_
_Navigate: [← CLAUDE.md](../../CLAUDE.md) | [→ PRODUCTION_SETUP.md](PRODUCTION_SETUP.md) | [→ DEPLOYMENT_SECRETS.md](DEPLOYMENT_SECRETS.md)_