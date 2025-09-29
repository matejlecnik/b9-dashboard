# Dashboard Documentation Map

┌─ NAVIGATION SYSTEM ─────────────────────────────────────┐
│ ● COMPLETE    │ ████████████████████ 100% MAPPED       │
└─────────────────────────────────────────────────────────┘

## Navigation

```json
{
  "hub": "../../CLAUDE.md",
  "current": "DOCUMENTATION_MAP.md",
  "parent": "../../docs/development/DOCUMENTATION_MAP.md",
  "sections": [
    {"path": "#app-modules", "desc": "Frontend modules", "status": "INDEXED"},
    {"path": "#components", "desc": "Component library", "status": "MAPPED"},
    {"path": "#api-endpoints", "desc": "API reference", "status": "DOCUMENTED"},
    {"path": "#deployment", "desc": "Deployment guides", "status": "READY"}
  ]
}
```

## Quick Jump

```bash
# Module Navigation
$ open ../src/app/reddit/          # Reddit module [LOCKED]
$ open ../src/app/instagram/       # Instagram module [ACTIVE]
$ open ../src/app/models/          # Models management [PLANNED]

# Component Libraries
$ open ../src/components/features/ # Feature components
$ open ../src/components/common/   # Common utilities
$ open ../src/components/layouts/  # Layout components
$ open ../src/components/ui/       # UI primitives

# API & Services
$ open ../src/app/api/             # API routes
$ open ../src/lib/                 # Utilities
$ open ../src/hooks/               # React hooks
```

## App Modules

### Reddit Module [LOCKED - DO NOT MODIFY]

```json
{
  "path": "../src/app/reddit/",
  "status": "LOCKED",
  "completion": 100,
  "pages": {
    "subreddit-review": {
      "path": "subreddit-review/page.tsx",
      "desc": "Review and approve subreddits",
      "hooks": ["useSubredditReview", "useSubredditStats"],
      "api": ["/api/subreddits", "/api/subreddits/stats"]
    },
    "categorization": {
      "path": "categorization/page.tsx",
      "desc": "AI-powered post categorization",
      "hooks": ["useCategorization", "useCategories"],
      "api": ["/api/categorization/tags", "/api/categories"]
    },
    "posting": {
      "path": "posting/page.tsx",
      "desc": "Content posting management",
      "hooks": ["usePosting", "useSchedule"],
      "api": ["/api/posts", "/api/schedule"]
    },
    "user-analysis": {
      "path": "user-analysis/page.tsx",
      "desc": "Reddit user analytics",
      "hooks": ["useUserAnalysis", "useUserMetrics"],
      "api": ["/api/users", "/api/users/stats"]
    },
    "post-analysis": {
      "path": "post-analysis/page.tsx",
      "desc": "Post performance analysis",
      "hooks": ["usePostAnalysis"],
      "api": ["/api/posts/analysis"]
    }
  }
}
```

### Instagram Module [ACTIVE DEVELOPMENT]

```json
{
  "path": "../src/app/instagram/",
  "status": "ACTIVE",
  "completion": 65,
  "pages": {
    "analytics": {
      "path": "analytics/page.tsx",
      "desc": "Creator analytics dashboard",
      "hooks": ["useInstagramAnalytics"],
      "api": ["/api/instagram/analytics"],
      "status": "OPERATIONAL"
    },
    "creator-review": {
      "path": "creator-review/page.tsx",
      "desc": "Review potential creators",
      "hooks": ["useCreatorReview"],
      "api": ["/api/instagram/creators"],
      "status": "OPERATIONAL"
    },
    "viral-content": {
      "path": "viral-content/page.tsx",
      "desc": "Viral content detection",
      "hooks": ["useViralPosts"],
      "api": ["/api/instagram/viral"],
      "status": "IN_DEVELOPMENT"
    },
    "niching": {
      "path": "niching/page.tsx",
      "desc": "Content niche analysis",
      "hooks": ["useNiching"],
      "api": ["/api/instagram/niching"],
      "status": "NEEDS_ACCURACY_FIX"
    }
  }
}
```

### Models Module [PLANNED]

```json
{
  "path": "../src/app/models/",
  "status": "PLANNED",
  "completion": 0,
  "pages": {
    "list": {
      "path": "page.tsx",
      "desc": "Model management dashboard",
      "planned_features": ["CRUD operations", "Performance metrics"]
    },
    "detail": {
      "path": "[id]/page.tsx",
      "desc": "Model detail view",
      "planned_features": ["Training history", "Predictions"]
    },
    "new": {
      "path": "new/page.tsx",
      "desc": "Create new model",
      "planned_features": ["Configuration", "Training setup"]
    }
  }
}
```

## Components

### Feature Components

```json
{
  "path": "../src/components/features/",
  "count": 28,
  "categories": {
    "tables": [
      "RedditUserTable",
      "SubredditTable",
      "CategoryTable",
      "InstagramCreatorTable"
    ],
    "forms": [
      "CategoryForm",
      "FilterForm",
      "CreatorForm",
      "SubredditForm"
    ],
    "modals": [
      "AICategorizationModal",
      "AddSubredditModal",
      "AddUserModal",
      "CategoryModal"
    ],
    "dashboards": [
      "PerformanceProfiler",
      "JobQueueDashboard",
      "DatabasePerformancePanel"
    ]
  }
}
```

### Common Components

```json
{
  "path": "../src/components/common/",
  "count": 12,
  "components": {
    "data-display": [
      "DataCard",
      "StatCard",
      "MetricCard",
      "ProgressCard"
    ],
    "feedback": [
      "LoadingSpinner",
      "ErrorBoundary",
      "EmptyState",
      "SuccessMessage"
    ],
    "navigation": [
      "Breadcrumbs",
      "TabNav",
      "Pagination"
    ]
  }
}
```

### UI Primitives

```json
{
  "path": "../src/components/ui/",
  "source": "shadcn/ui",
  "components": [
    "button",
    "card",
    "dialog",
    "dropdown-menu",
    "input",
    "label",
    "select",
    "table",
    "tabs",
    "textarea",
    "toast",
    "tooltip"
  ]
}
```

## API Endpoints

### Core APIs

```json
{
  "base_url": "/api",
  "authentication": "JWT",
  "rate_limiting": "100 req/min",
  "endpoints": {
    "subreddits": {
      "GET /subreddits": "List all subreddits",
      "GET /subreddits/stats": "Subreddit statistics",
      "GET /subreddits/[id]": "Get subreddit detail",
      "POST /subreddits": "Create subreddit",
      "PUT /subreddits/[id]": "Update subreddit",
      "POST /subreddits/bulk-review": "Bulk review subreddits"
    },
    "users": {
      "GET /users": "List Reddit users",
      "GET /users/search": "Search users",
      "POST /users/toggle-creator": "Toggle creator status",
      "POST /users/bulk-update": "Bulk update users"
    },
    "categorization": {
      "POST /categorization/tags/start": "Start categorization",
      "GET /categories": "List categories",
      "POST /categories": "Create category",
      "PUT /categories/[id]": "Update category",
      "POST /categories/merge": "Merge categories",
      "POST /categories/rename": "Rename category"
    },
    "instagram": {
      "GET /instagram/creators": "List creators",
      "GET /instagram/analytics": "Creator analytics",
      "GET /instagram/viral": "Viral content",
      "POST /instagram/niching": "Analyze niche"
    },
    "ai": {
      "POST /ai/categorize-batch": "Batch categorization",
      "GET /ai/accuracy-metrics": "AI accuracy metrics",
      "POST /ai/export": "Export AI data"
    },
    "scraper": {
      "POST /scraper/start": "Start scraper",
      "POST /scraper/stop": "Stop scraper",
      "GET /scraper/status": "Scraper status",
      "GET /scraper/errors": "Scraper errors",
      "GET /scraper/accounts": "Scraper accounts"
    }
  }
}
```

## Hooks Library

```json
{
  "path": "../src/hooks/",
  "categories": {
    "queries": {
      "path": "queries/",
      "hooks": [
        "useRedditReview",
        "useViralPosts",
        "useCreatorAnalytics",
        "useSubredditStats"
      ]
    },
    "mutations": {
      "hooks": [
        "useCreateCategory",
        "useUpdateSubreddit",
        "useToggleCreator"
      ]
    },
    "utilities": {
      "hooks": [
        "useDebounce",
        "useLocalStorage",
        "useInfiniteScroll",
        "usePostAnalysis"
      ]
    }
  }
}
```

## Library Utilities

```json
{
  "path": "../src/lib/",
  "files": {
    "utils.ts": "General utilities",
    "logger.ts": "Structured logging",
    "validations.ts": "Form validations",
    "performance-monitor.tsx": "Performance tracking",
    "dynamic-imports.tsx": "Code splitting"
  }
}
```

## Configuration

```json
{
  "environment": {
    ".env.local": "Local development",
    ".env.production": "Production variables"
  },
  "build": {
    "next.config.ts": "Next.js configuration",
    "tsconfig.json": "TypeScript config",
    "tailwind.config.ts": "Tailwind CSS",
    "postcss.config.mjs": "PostCSS plugins"
  },
  "quality": {
    "eslint.config.mjs": "Linting rules",
    "prettier.config.js": "Code formatting"
  }
}
```

## Deployment

```json
{
  "platform": "Vercel",
  "configuration": {
    "vercel.json": "Deployment settings",
    ".vercelignore": "Ignore patterns"
  },
  "environments": {
    "production": {
      "url": "https://b9-dashboard.vercel.app",
      "branch": "main"
    },
    "preview": {
      "url": "Auto-generated",
      "branch": "Any PR"
    }
  }
}
```

## Development Workflow

```bash
# Start development
$ npm run dev              # http://localhost:3000

# Code quality
$ npm run lint            # ESLint check
$ npm run typecheck       # TypeScript validation
$ npm run format          # Prettier formatting

# Build & deploy
$ npm run build          # Production build
$ npm run analyze        # Bundle analysis
$ vercel deploy          # Manual deployment
```

## Testing Structure

```json
{
  "framework": "Jest + React Testing Library",
  "structure": {
    "__tests__/": "Unit tests",
    "cypress/": "E2E tests (planned)",
    "coverage/": "Coverage reports"
  },
  "commands": {
    "npm test": "Run all tests",
    "npm run test:watch": "Watch mode",
    "npm run test:coverage": "Coverage report"
  }
}
```

## Performance Metrics

```json
{
  "current": {
    "lighthouse_score": 92,
    "first_contentful_paint": "0.8s",
    "time_to_interactive": "1.2s",
    "bundle_size": "1.8MB"
  },
  "targets": {
    "lighthouse_score": 95,
    "first_contentful_paint": "0.6s",
    "time_to_interactive": "1.0s",
    "bundle_size": "1.5MB"
  }
}
```

## Quick Reference

```bash
# Find any component
$ grep -r "ComponentName" src/components/

# Find API route
$ grep -r "route-name" src/app/api/

# Find hook usage
$ grep -r "useHookName" src/

# Check bundle size
$ npm run analyze

# Generate types from API
$ npm run generate:types
```

---

_Map Version: 1.0.0 | Updated: 2025-01-29 | Coverage: 100%_
_Navigate: [← Hub](../../CLAUDE.md) | [→ Component Guide](COMPONENT_GUIDE.md)_