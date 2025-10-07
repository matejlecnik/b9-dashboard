# Quick Jump Codes

┌─ COMMAND REFERENCE ─────────────────────────────────────┐
│ ● OPERATIONAL │ ████████████████████ 100% INDEXED      │
└─────────────────────────────────────────────────────────┘

## Navigation

```json
{
  "parent": "../../CLAUDE.md",
  "current": "QUICK_CODES.md",
  "siblings": [
    {"path": "../INDEX.md", "desc": "Full navigation", "status": "UPDATED"},
    {"path": "SESSION_LOG.md", "desc": "History", "status": "UPDATED"},
    {"path": "DOCUMENTATION_STANDARDS.md", "desc": "Rules", "status": "ENFORCED"}
  ]
}
```

## Fix Commands

```json
{
  "fix:memory": {
    "path": "/api-render/scrapers/README.md#memory-optimization",
    "tokens": 300,
    "command": "python3 -m memory_profiler main.py",
    "solution": "Close database connections, implement connection pooling"
  },
  "fix:build": {
    "path": "/dashboard/README.md#build-errors",
    "tokens": 200,
    "command": "npm install --legacy-peer-deps",
    "solution": "Clear node_modules, reinstall dependencies"
  },
  "fix:scraper": {
    "path": "/api-render/scrapers/reddit/README.md#troubleshooting",
    "tokens": 250,
    "command": "curl localhost:8000/api/scraper/status",
    "solution": "Check system_control table, restart scraper"
  },
  "fix:db": {
    "path": "/api-render/services/README.md#database-issues",
    "tokens": 200,
    "command": "psql $DATABASE_URL -c 'SELECT 1'",
    "solution": "Check connection string, verify Supabase status"
  },
  "fix:auth": {
    "path": "/dashboard/src/lib/README.md#auth-issues",
    "tokens": 150,
    "command": "npm run test:auth",
    "solution": "Verify JWT secret, check token expiration"
  },
  "fix:deploy": {
    "path": "/docs/deployment/DEPLOYMENT.md#common-issues",
    "tokens": 300,
    "command": "vercel logs",
    "solution": "Check environment variables, build logs"
  }
}
```

## New Feature Commands

```json
{
  "new:viral": {
    "path": "/dashboard/src/app/instagram/viral-content/",
    "tokens": 400,
    "status": "IN_PROGRESS",
    "progress": 40,
    "next_steps": ["Algorithm design", "ML model", "UI integration"]
  },
  "new:tiktok": {
    "path": "/dashboard/src/app/tiktok/",
    "tokens": 500,
    "status": "PLANNED",
    "target": "Q3_2025",
    "dependencies": ["API integration", "Data model", "UI components"]
  },
  "new:analytics": {
    "path": "/dashboard/src/app/instagram/analytics/",
    "tokens": 350,
    "status": "ACTIVE",
    "features": ["Engagement metrics", "Growth tracking", "Performance"]
  },
  "new:export": {
    "path": "/dashboard/src/components/export/",
    "tokens": 300,
    "status": "PLANNED",
    "formats": ["CSV", "JSON", "PDF"],
    "effort": "8h"
  }
}
```

## Clean Commands

```json
{
  "clean:logs": {
    "command": "grep -r 'console.log' --include='*.tsx' --include='*.ts' | wc -l",
    "action": "Remove all console.log statements",
    "impact": "Production readiness"
  },
  "clean:imports": {
    "command": "npm run lint -- --fix",
    "action": "Auto-fix import ordering and unused imports",
    "impact": "Code quality"
  },
  "clean:types": {
    "command": "npx tsc --noEmit",
    "action": "Fix TypeScript errors",
    "impact": "Type safety"
  },
  "clean:deps": {
    "command": "npm outdated",
    "action": "Update dependencies",
    "impact": "Security and performance"
  }
}
```

## Learn Commands

```json
{
  "learn:architecture": {
    "path": "/README.md#architecture",
    "tokens": 400,
    "topics": ["Monorepo", "Next.js", "FastAPI", "Supabase"]
  },
  "learn:react": {
    "path": "/dashboard/docs/REACT_QUERY_GUIDE.md",
    "tokens": 500,
    "topics": ["Hooks", "Query caching", "Mutations", "Optimistic updates"]
  },
  "learn:api": {
    "path": "/api-render/README.md",
    "tokens": 400,
    "topics": ["FastAPI", "Endpoints", "Authentication", "Rate limiting"]
  },
  "learn:supabase": {
    "path": "/api-render/core/database/README.md",
    "tokens": 400,
    "topics": ["RLS", "Realtime", "Auth", "Storage"]
  }
}
```

## Performance Commands

```json
{
  "perf:analyze": {
    "command": "npm run analyze",
    "output": "Bundle size report",
    "target": "< 2MB"
  },
  "perf:profile": {
    "command": "npm run profile",
    "output": "Component render times",
    "target": "< 100ms"
  },
  "perf:lighthouse": {
    "command": "npx lighthouse http://localhost:3000",
    "output": "Performance score",
    "target": "> 90"
  },
  "perf:memory": {
    "command": "python3 -m memory_profiler main.py",
    "output": "Memory usage report",
    "target": "< 500MB"
  }
}
```

## Deployment Commands

```json
{
  "deploy:preview": {
    "branch": "preview",
    "command": "git push origin preview",
    "url": "b9-dashboard-preview-*.vercel.app",
    "auto": true
  },
  "deploy:prod": {
    "branch": "main",
    "command": "git push origin main",
    "url": "b9-dashboard.com",
    "approval": "REQUIRED"
  },
  "deploy:api": {
    "service": "Render",
    "command": "git push render main",
    "url": "api-render.onrender.com",
    "auto": true
  }
}
```

## Test Commands

```json
{
  "test:unit": {
    "command": "npm test",
    "coverage": 87,
    "files": 45
  },
  "test:e2e": {
    "command": "npm run test:e2e",
    "scenarios": 12,
    "browser": "Chrome"
  },
  "test:api": {
    "command": "cd api-render && pytest",
    "coverage": 82,
    "endpoints": 36
  }
}
```

## Monitoring Commands

```json
{
  "monitor:logs": {
    "frontend": "vercel logs",
    "backend": "render logs",
    "database": "supabase logs"
  },
  "monitor:health": {
    "frontend": "curl https://b9-dashboard.com/api/health",
    "backend": "curl https://api-render.onrender.com/health",
    "database": "SELECT 1 FROM system_logs LIMIT 1"
  },
  "monitor:metrics": {
    "command": "curl https://api-render.onrender.com/metrics",
    "format": "json",
    "interval": "5min"
  }
}
```

## Quick Scripts

```bash
## Start everything
$ npm run dev & cd api-render && python3 main.py

## Check status
$ curl localhost:3000/api/health && curl localhost:8000/health

## Find issues
$ npm run lint && npx tsc --noEmit

## Clean build
$ rm -rf .next node_modules && npm i --legacy-peer-deps && npm run build

## Full test
$ npm test && npm run test:e2e && cd api-render && pytest
```

## Execution Plan

```json
{
  "daily": [
    "npm run dev",
    "git pull",
    "npm run lint"
  ],
  "before_commit": [
    "npm run lint",
    "npm run typecheck",
    "npm test"
  ],
  "before_deploy": [
    "npm run build",
    "npm run test:e2e",
    "Check env vars"
  ]
}
```

---

_Reference Version: 2.0.0 | Commands: 52 | Updated: 2024-01-28_
_Navigate: [← SESSION_LOG.md](SESSION_LOG.md) | [→ DOCUMENTATION_STANDARDS.md](DOCUMENTATION_STANDARDS.md)_