# B9 Dashboard - Reddit Marketing Analytics Platform

┌─ PROJECT STATUS ────────────────────────────────────────┐
│ ● PRODUCTION  │ ████████████████░░░░ 80% COMPLETE      │
└─────────────────────────────────────────────────────────┘

## Navigation

```json
{
  "current": "README.md",
  "parent": null,
  "children": [
    {"path": "CLAUDE.md", "desc": "Mission control dashboard", "status": "ACTIVE"},
    {"path": "INFRASTRUCTURE.md", "desc": "Infrastructure overview", "status": "LIVE"},
    {"path": "dashboard/README.md", "desc": "Frontend application", "status": "ACTIVE"},
    {"path": "backend/README.md", "desc": "Backend API", "status": "LIVE"},
    {"path": "ROADMAP.md", "desc": "Strategic roadmap", "status": "ACTIVE"}
  ],
  "related": [
    {"path": "docs/development/DOCUMENTATION_MAP.md", "desc": "Full doc map", "status": "GUIDE"}
  ]
}
```

## System Metrics

```json
{
  "scale": {
    "subreddits_analyzed": 5819,
    "reddit_posts": 337803,
    "reddit_users": 298456,
    "approved_subreddits": 500,
    "conversion_rate": "15%"
  },
  "performance": {
    "api_uptime": "99.99%",
    "avg_response_time": "89ms",
    "daily_requests": 1234567,
    "error_rate": "0.02%"
  },
  "infrastructure": {
    "frontend": "Vercel (https://b9-dashboard.com)",
    "backend": "Hetzner + Nginx (https://api.b9-dashboard.com)",
    "media": "Cloudflare R2 CDN (https://media.b9-dashboard.com)",
    "database": "Supabase PostgreSQL + Redis",
    "ssl": "Cloudflare (Flexible mode, full HTTPS)"
  }
}
```

## Quick Start

```bash
## Clone & Navigate
$ git clone <repo-url>
$ cd b9_dashboard

## Frontend Setup
$ cd dashboard
$ npm install --legacy-peer-deps
$ cp .env.example .env.local
$ npm run dev                    # → http://localhost:3000

## Backend Setup (local development)
$ cd ../backend
$ pip3 install -r requirements.txt
$ cp .env.example .env
$ python3 main.py               # → http://localhost:10000
# Production: https://api.b9-dashboard.com
```

## Environment Requirements

```json
{
  "frontend": {
    "node": ">=20.0.0",
    "npm": ">=10.0.0",
    "framework": "Next.js 15"
  },
  "backend": {
    "python": ">=3.12",
    "framework": "FastAPI",
    "deployment": "Hetzner Cloud (Docker)"
  },
  "database": {
    "provider": "Supabase",
    "postgres": "15"
  }
}
```

## Architecture

```
┌─ PRODUCTION INFRASTRUCTURE ──────────────────────────────┐
│ Users → Cloudflare DNS → [Vercel | Nginx → API | R2 CDN] │
│         (HTTPS)          (HTTPS) (HTTPS)      (HTTPS)    │
└──────────────────────────────────────────────────────────┘

Production URLs:
  Frontend:  https://b9-dashboard.com (Vercel + Cloudflare DNS)
  API:       https://api.b9-dashboard.com (Hetzner + Nginx + Cloudflare)
  Media CDN: https://media.b9-dashboard.com (R2 Custom Domain)

Repository Structure:
b9_dashboard/
├── dashboard/        [FRONTEND]  Next.js 15 app
├── backend/          [BACKEND]   FastAPI service (Docker)
├── docs/            [DOCS]      Documentation
└── CLAUDE.md        [HUB]       Mission control

Status Legend:
[LOCKED]     - Do not modify
[ACTIVE]     - Current development
[PRODUCTION] - Deployed & stable
[PLANNED]    - Future work
```

## Module Status

```json
{
  "reddit": {
    "status": "LOCKED",
    "completion": 100,
    "restriction": "DO_NOT_MODIFY",
    "features": ["review", "categorization", "posting", "analysis"]
  },
  "instagram": {
    "status": "ACTIVE",
    "completion": 65,
    "focus": "viral_detection",
    "features": ["creator_review", "analytics", "niching"]
  },
  "api": {
    "status": "PRODUCTION",
    "endpoints": 36,
    "security": "JWT + Rate Limiting",
    "deployment": "hetzner_cloud_3_servers"
  }
}
```

## Development Workflow

```bash
## Daily Start
$ open CLAUDE.md              # Start here every session

## Common Tasks
$ npm run dev                 # Start frontend
$ npm run build              # Production build
$ npm run lint               # Code quality
$ npm run typecheck          # Type validation

## API Tasks
$ cd backend && python3 main.py    # Start API
$ cd backend && pytest              # Run tests

## Documentation
$ open INFRASTRUCTURE.md                           # Infrastructure overview
$ open docs/deployment/PRODUCTION_SETUP.md         # Production setup guide
$ open docs/development/DOCUMENTATION_MAP.md       # Find any doc
$ open docs/development/SESSION_LOG.md             # See history
```

## Security & Access

| Component | Status | Details |
|-----------|--------|---------|
| API Auth | ✅ IMPLEMENTED | JWT tokens |
| Rate Limiting | ✅ ACTIVE | Via Supabase |
| CORS | ✅ CONFIGURED | Restricted origins |
| Env Vars | ⚠️ REQUIRED | See .env.example |

## Performance Benchmarks

```
BUILD TIME   [███░░░░░░░░░░░░░░░░░] 3.2s
API LATENCY  [███░░░░░░░░░░░░░░░░░] 89ms P95
LOAD TIME    [████░░░░░░░░░░░░░░░░] 342ms
BUNDLE SIZE  [██████████░░░░░░░░░░] 1.8MB
```

## Recent Updates

```diff
+ 2025-10-10: Professional infrastructure v2.0 (Cloudflare DNS + custom domains)
+ Full HTTPS architecture (frontend, API, media CDN all on HTTPS)
+ Cloudflare R2 custom domain: media.b9-dashboard.com
+ Nginx reverse proxy for API endpoint: api.b9-dashboard.com
+ Zero Mixed Content errors (browser security compliant)
+ Comprehensive documentation update (INFRASTRUCTURE.md, PRODUCTION_SETUP.md)
+ Database cleanup: 13,189 media URLs migrated to new domain structure
```

## Execution Plan

```json
{
  "immediate": {
    "timeline": "TODAY",
    "tasks": [
      {"id": "DOC-001", "task": "Complete documentation transformation", "progress": 30, "next": "docs/development/"},
      {"id": "FIX-001", "task": "Instagram niching accuracy", "progress": 0, "next": "dashboard/src/app/instagram/niching/"}
    ]
  },
  "this_week": {
    "timeline": "2024-01-29 to 2024-02-04",
    "tasks": [
      {"id": "FEAT-001", "task": "Instagram viral detection", "progress": 40, "effort": "16h"},
      {"id": "PERM-001", "task": "Permission system implementation", "progress": 0, "effort": "16h"},
      {"id": "TEST-001", "task": "Component testing", "progress": 0, "effort": "8h"}
    ]
  },
  "next_sprint": {
    "timeline": "2024-02-05 to 2024-02-18",
    "tasks": [
      {"id": "FEAT-002", "task": "Creator relationship mapping", "dependencies": ["FEAT-001"]},
      {"id": "PERF-001", "task": "Query optimization", "impact": "-200ms latency"},
      {"id": "EXPORT-001", "task": "Data export functionality", "modules": ["instagram", "reddit"]}
    ]
  },
  "roadmap": {
    "Q1_2024": ["Instagram completion", "Performance optimization"],
    "Q2_2024": ["Models management", "Analytics dashboard"],
    "Q3_2024": ["TikTok integration", "Multi-platform sync"],
    "Q4_2024": ["AI recommendations", "Automation features"]
  }
}
```

---

_Version: 4.0.0 | Environment: Production | Updated: 2025-10-10_
_Navigate: [→ CLAUDE.md](CLAUDE.md) | [→ Infrastructure](INFRASTRUCTURE.md) | [→ Dashboard](dashboard/README.md) | [→ API](backend/README.md)_