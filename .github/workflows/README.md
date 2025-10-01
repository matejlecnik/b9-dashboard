# GitHub Workflows

┌─ CI/CD STATUS ──────────────────────────────────────────┐
│ ● ACTIVE      │ ████████████████████ 100% CONFIGURED   │
└─────────────────────────────────────────────────────────┘

## Navigation

```json
{
  "parent": "../../README.md",
  "current": ".github/workflows/README.md",
  "related": [
    {"path": "../../docs/development/GITHUB_ACTIONS_CLAUDE_PLAN.md", "desc": "Claude integration plan", "status": "PLANNED"}
  ]
}
```

## Workflow Overview

```json
{
  "total_workflows": 8,
  "categories": {
    "continuous_integration": ["ci.yml", "api-render.yml"],
    "deployment": ["vercel-production.yml", "vercel-preview.yml"],
    "quality": ["code-quality.yml", "docs-check.yml"],
    "maintenance": ["dependency-update.yml", "dependabot.yml"]
  },
  "schedule": {
    "on_push": ["ci", "api-render", "vercel-production"],
    "on_pr": ["ci", "api-render", "vercel-preview", "code-quality"],
    "scheduled": ["dependency-update", "code-quality"],
    "manual": ["dependency-update", "docs-check"]
  }
}
```

## Workflow Descriptions

### Core CI/CD

```json
{
  "ci.yml": {
    "purpose": "Main CI pipeline for frontend and backend",
    "triggers": ["push to main", "pull requests"],
    "jobs": ["frontend-checks", "backend-checks", "code-quality", "docker-build"],
    "features": ["caching", "parallel execution", "quality reports"]
  },
  "api-render.yml": {
    "purpose": "Backend API testing and validation",
    "triggers": ["changes to api-render/**"],
    "jobs": ["lint-format", "test-api", "security-scan", "performance-check"],
    "matrix": ["Python 3.10", "Python 3.11", "Python 3.12"]
  }
}
```

### Deployment Workflows

```json
{
  "vercel-production.yml": {
    "purpose": "Production deployment to Vercel",
    "triggers": ["push to main", "manual dispatch"],
    "environment": "production",
    "requires": ["VERCEL_TOKEN", "VERCEL_ORG_ID", "VERCEL_PROJECT_ID"]
  },
  "vercel-preview.yml": {
    "purpose": "Preview deployments for PRs",
    "triggers": ["pull requests"],
    "environment": "preview",
    "features": ["automatic preview URLs", "PR comments"]
  }
}
```

### Quality Assurance

```json
{
  "code-quality.yml": {
    "purpose": "Comprehensive code quality checks",
    "schedule": "Weekly on Monday 9:00 AM UTC",
    "checks": ["formatting", "linting", "type-checking", "complexity"],
    "reports": ["ESLint", "complexity metrics", "bundle size"]
  },
  "docs-check.yml": {
    "purpose": "Documentation validation",
    "triggers": ["changes to *.md files"],
    "checks": ["markdown lint", "link validation", "coverage", "terminal style"]
  }
}
```

### Maintenance

```json
{
  "dependency-update.yml": {
    "purpose": "Dependency management and updates",
    "schedule": "Weekly on Sunday 2:00 AM UTC",
    "features": ["security audits", "outdated checks", "automated PRs"],
    "update_types": ["security", "minor", "major", "all"]
  },
  "dependabot.yml": {
    "purpose": "Automated dependency updates",
    "ecosystems": ["npm", "pip", "github-actions", "docker"],
    "schedule": "Weekly for deps, monthly for actions",
    "grouping": ["react", "radix", "fastapi", "supabase"]
  }
}
```

## Required Secrets

```json
{
  "deployment": {
    "VERCEL_TOKEN": "Required for Vercel deployments",
    "VERCEL_ORG_ID": "Vercel organization ID",
    "VERCEL_PROJECT_ID": "Vercel project ID"
  },
  "api_keys": {
    "NEXT_PUBLIC_SUPABASE_URL": "Supabase project URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY": "Supabase anonymous key",
    "OPENAI_API_KEY": "OpenAI API key for tests"
  },
  "optional": {
    "NPM_TOKEN": "For private npm packages",
    "SLACK_WEBHOOK": "For notifications",
    "CODECOV_TOKEN": "For coverage reports"
  }
}
```

## Workflow Features

```json
{
  "optimizations": {
    "caching": {
      "npm": "node_modules cached",
      "pip": "Python packages cached",
      "docker": "Layer caching enabled"
    },
    "parallel_execution": {
      "frontend_backend": "Run simultaneously",
      "matrix_testing": "Multiple versions tested"
    },
    "conditional_steps": {
      "continue_on_error": "Non-blocking checks",
      "path_filters": "Only run on relevant changes"
    }
  },
  "reporting": {
    "github_summary": "Markdown reports in PR",
    "artifacts": ["coverage", "performance", "security"],
    "status_badges": "Available for README"
  }
}
```

## Usage Guide

### Manual Triggers

```bash
## Trigger dependency updates
gh workflow run dependency-update.yml \
  -f update_type=security

## Trigger production deployment
gh workflow run vercel-production.yml

## Trigger documentation check
gh workflow run docs-check.yml
```

### View Workflow Runs

```bash
## List recent workflow runs
gh run list --limit 10

## View specific workflow
gh run view <run-id>

## Watch a running workflow
gh run watch <run-id>
```

### Debugging Failed Workflows

```bash
## Re-run failed jobs
gh run rerun <run-id> --failed

## Download artifacts
gh run download <run-id>

## View logs
gh run view <run-id> --log
```

## Best Practices

```json
{
  "security": [
    "Never commit secrets",
    "Use GitHub secrets for sensitive data",
    "Review Dependabot PRs carefully",
    "Run security scans regularly"
  ],
  "performance": [
    "Use caching for dependencies",
    "Run heavy checks only on PRs",
    "Use matrix builds sparingly",
    "Optimize Docker builds"
  ],
  "maintenance": [
    "Review and update workflows monthly",
    "Clean up old workflow runs",
    "Monitor usage and costs",
    "Keep actions up to date"
  ]
}
```

## Status Badges

Add these to your main README.md:

```markdown
![CI](https://github.com/USER/REPO/workflows/CI/badge.svg)
![Code Quality](https://github.com/USER/REPO/workflows/Code%20Quality/badge.svg)
![Docs Check](https://github.com/USER/REPO/workflows/Documentation%20Check/badge.svg)
```

---

_Workflows Version: 1.0.0 | Status: Active | Updated: 2024-01-29_
_Navigate: [← .github/](..) | [→ ci.yml](ci.yml)_