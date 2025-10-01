# System Improvement Plan

┌─ TECHNICAL BLUEPRINT ───────────────────────────────────┐
│ ● ACTIVE DEV │ ████████░░░░░░░░░░░░ 40% IN_PROGRESS    │
└─────────────────────────────────────────────────────────┘

## Navigation

```json
{
  "parent": "../../ROADMAP.md",
  "current": "SYSTEM_IMPROVEMENT_PLAN.md",
  "siblings": [
    {"path": "DOCUMENTATION_STANDARDS.md", "desc": "Mandatory rules", "status": "ACTIVE"},
    {"path": "DOCUMENTATION_AGENT_GUIDE.md", "desc": "Agent usage", "status": "NEW"},
    {"path": "SESSION_LOG.md", "desc": "Development history", "status": "ACTIVE"}
  ],
  "related": [
    {"path": "../../CLAUDE.md", "desc": "Mission control", "status": "ACTIVE"},
    {"path": "DOCUMENTATION_MAP.md", "desc": "Doc network", "status": "REFERENCE"}
  ]
}
```

## Executive Summary

```json
{
  "objective": "Achieve 95%+ documentation compliance with full automation",
  "current_state": {
    "compliance": "21.7% (20/92 files)",
    "issues": {"HIGH": 29, "MEDIUM": 40},
    "test_coverage": "0%",
    "duplicate_components": 10
  },
  "target_state": {
    "compliance": "95%+ (87/92 files)",
    "issues": {"HIGH": 0, "MEDIUM": "<5"},
    "test_coverage": "deferred",
    "duplicate_components": 0
  },
  "effort": "8-12h across 3 phases",
  "version": "3.6.0 → 3.8.0"
}
```

## Phase 1: Documentation Infrastructure (v3.6.0)

### 1.1 Core Documentation Files [████████████░░░░░░░░] 60%

```json
{
  "tasks": [
    {
      "id": "DOC-101",
      "file": "ROADMAP.md",
      "desc": "Strategic vision with versioning",
      "status": "COMPLETE",
      "effort": "1h",
      "lines": 500
    },
    {
      "id": "DOC-102",
      "file": "SYSTEM_IMPROVEMENT_PLAN.md",
      "desc": "Technical implementation details",
      "status": "IN_PROGRESS",
      "effort": "1.5h",
      "lines": 800
    },
    {
      "id": "DOC-103",
      "file": "CLAUDE.md",
      "desc": "Mission Control Dashboard redesign",
      "status": "PENDING",
      "effort": "1h",
      "changes": [
        "Add real-time health metrics",
        "Enhance quick navigation section",
        "Add recent activity log",
        "Reduce token count to <400"
      ]
    },
    {
      "id": "DOC-104",
      "file": "DOCUMENTATION_STANDARDS.md",
      "desc": "Add versioning, code comment, plan-in-md rules",
      "status": "PENDING",
      "effort": "30m",
      "additions": [
        "Semantic versioning section",
        "Code comment policy (minimal, reference .md)",
        "Plans must be saved in .md files rule",
        "Version footer requirements"
      ]
    },
    {
      "id": "DOC-105",
      "file": "DOCUMENTATION_AGENT_GUIDE.md",
      "desc": "Guide for using Claude agents for docs",
      "status": "PENDING",
      "effort": "45m",
      "sections": [
        "Agent capabilities",
        "Spawning agents for doc generation",
        "Review workflow",
        "Best practices"
      ]
    }
  ],
  "dependencies": [],
  "blockers": []
}
```

### 1.2 Agent-Based Documentation Generation [░░░░░░░░░░░░░░░░░░░░] 0%

```json
{
  "approach": "Claude Code background agents",
  "rationale": [
    "Built-in, no MCP setup required",
    "Autonomous processing of 72 files",
    "Customizable to terminal/JSON style",
    "Parallel execution capability"
  ],
  "implementation": {
    "script": "docs/scripts/generate-docs.py",
    "agent_prompt": {
      "task": "Convert non-compliant .md files to terminal/JSON style",
      "requirements": [
        "Status box with accurate progress",
        "Navigation JSON with correct paths",
        "Metrics section with real data",
        "Professional tone, no emojis",
        "Token-efficient content",
        "Semantic version number"
      ],
      "input": "List of 72 file paths + directory structure",
      "output": "Compliant .md files for review"
    }
  },
  "tasks": [
    {
      "id": "DOC-106",
      "task": "Create generate-docs.py orchestration script",
      "effort": "1h",
      "features": [
        "Scan for non-compliant files",
        "Gather context (dir structure, metrics)",
        "Spawn agent with instructions",
        "Monitor agent progress",
        "Collect generated files",
        "Generate review report"
      ]
    },
    {
      "id": "DOC-107",
      "task": "Spawn documentation agent",
      "effort": "2-3h (agent runtime)",
      "process": [
        "Agent receives 72 file paths",
        "Agent reads each file + context",
        "Agent generates compliant version",
        "Agent validates against standards",
        "Agent outputs to review directory"
      ]
    },
    {
      "id": "DOC-108",
      "task": "Review and merge agent output",
      "effort": "1h",
      "steps": [
        "Run validation on agent-generated files",
        "Spot-check 10 random files",
        "Fix any edge cases",
        "Merge compliant files",
        "Update metrics"
      ]
    }
  ]
}
```

### 1.3 Navigation Enhancement [░░░░░░░░░░░░░░░░░░░░] 0%

```json
{
  "features": [
    {
      "name": "Auto-generated navigation",
      "desc": "Scan directory structure, generate navigation JSON",
      "script": "docs/scripts/generate-navigation.py",
      "effort": "1.5h",
      "logic": {
        "parent": "Detect from file path hierarchy",
        "siblings": "Same directory, other .md files",
        "children": "Subdirectory README.md files",
        "related": "Import analysis + keyword matching"
      }
    },
    {
      "name": "Breadcrumb injection",
      "desc": "Auto-add breadcrumbs to all docs",
      "format": "Home > Docs > Development > [Current]",
      "placement": "After navigation JSON, before content",
      "effort": "30m"
    },
    {
      "name": "Mermaid diagram support",
      "desc": "Visual graph of doc relationships",
      "example": "```mermaid\\ngraph TD\\n  A[CLAUDE.md] --> B[ROADMAP.md]\\n```",
      "tool": "Mermaid CLI for static generation",
      "effort": "1h"
    },
    {
      "name": "Content similarity engine",
      "desc": "Suggest related docs based on content",
      "algorithm": "TF-IDF + cosine similarity",
      "threshold": 0.3,
      "effort": "2h",
      "output": "See also section at bottom of docs"
    }
  ],
  "total_effort": "5h"
}
```

## Phase 2: Code Quality & Structure (v3.7.0)

### 2.1 Component Deduplication [░░░░░░░░░░░░░░░░░░░░] 0%

```json
{
  "duplicates_found": [
    "AICategorizationModal.tsx",
    "AddSubredditModal.tsx",
    "AddUserModal.tsx",
    "ApiActivityLog.tsx",
    "CategoryFilterDropdown.tsx",
    "CategoryFilterPills.tsx",
    "CategorySelector.tsx",
    "DashboardLayout.tsx",
    "DatabasePerformancePanel.tsx",
    "DiscoveryTable.tsx"
  ],
  "resolution_strategy": {
    "step_1": "Identify canonical location for each",
    "step_2": "Run diff to check for divergence",
    "step_3": "Merge differences if needed",
    "step_4": "Delete duplicates",
    "step_5": "Update all imports (find/replace)",
    "step_6": "Test build passes"
  },
  "canonical_locations": {
    "AICategorizationModal.tsx": "components/features/ai/",
    "DiscoveryTable.tsx": "components/features/",
    "CategoryFilter*.tsx": "components/common/filters/",
    "DashboardLayout.tsx": "components/layouts/",
    "DatabasePerformancePanel.tsx": "components/features/monitoring/"
  },
  "effort": "1.5h",
  "risk": "Medium - could break imports"
}
```

### 2.2 Directory Structure Optimization [░░░░░░░░░░░░░░░░░░░░] 0%

```json
{
  "current_structure": {
    "components": [
      "shared/ (444KB - too large)",
      "features/ (304KB)",
      "standard/ (152KB - naming conflict)",
      "common/ (156KB)",
      "ui/ (108KB)",
      "layouts/ (60KB)",
      "instagram/ (56KB)",
      "templates/ (28KB)"
    ]
  },
  "target_structure": {
    "components": [
      "ui/ - Primitives (buttons, inputs)",
      "features/ - Business logic components (merge standard/)",
      "layouts/ - Page layouts",
      "shared/ - Split into domain subdirs",
      "common/ - Utilities only"
    ]
  },
  "actions": [
    {
      "action": "Merge components/standard/ → components/features/",
      "reason": "Naming conflict with UniversalTable pattern",
      "effort": "30m"
    },
    {
      "action": "Reorganize components/shared/ by domain",
      "subdirs": ["tables/", "forms/", "modals/", "charts/"],
      "effort": "1h"
    },
    {
      "action": "Remove 3 empty directories",
      "dirs": [
        "components/features/reddit",
        "components/common/filters",
        "components/common/cards"
      ],
      "effort": "5m"
    }
  ],
  "total_effort": "2h"
}
```

### 2.3 Barrel Export Completion [░░░░░░░░░░░░░░░░░░░░] 0%

```json
{
  "current": "10 index files",
  "target": "20+ index files (all major directories)",
  "missing": [
    "components/features/index.ts",
    "components/common/index.ts",
    "components/layouts/index.ts",
    "lib/utils/index.ts",
    "hooks/queries/index.ts",
    "hooks/mutations/index.ts"
  ],
  "template": {
    "format": "export * from './ComponentName'",
    "naming": "PascalCase for components, camelCase for utilities",
    "order": "Alphabetical"
  },
  "benefits": [
    "Cleaner imports: import {Foo, Bar} from '@/components/features'",
    "Easier refactoring",
    "Better tree-shaking",
    "Centralized export control"
  ],
  "effort": "1h"
}
```

### 2.4 Code Comment Optimization [░░░░░░░░░░░░░░░░░░░░] 0%

```json
{
  "new_policy": {
    "principle": "Minimal inline comments, reference .md files",
    "rules": [
      "Complex logic: 1-line comment + link to .md",
      "Public APIs: JSDoc with @see link to docs",
      "No verbose explanations in code",
      "Prefer descriptive names over comments"
    ]
  },
  "examples": {
    "bad": "// This function calculates the subreddit score by taking the square root of average upvotes and multiplying by engagement and 1000",
    "good": "// See: docs/database/REDDIT_SCHEMA.md#subreddit-score",
    "jsdoc": "/**\n * Calculate subreddit quality score.\n * @see docs/database/REDDIT_SCHEMA.md#scoring-algorithm\n */\nfunction calculateScore()"
  },
  "migration": {
    "scan": "Find all verbose comments (>50 chars)",
    "replace": "Shorten + add .md reference",
    "target_files": "50-100 files estimated",
    "effort": "2h"
  }
}
```

## Phase 3: Automation & Tooling (v3.8.0)

### 3.1 Lefthook Integration [░░░░░░░░░░░░░░░░░░░░] 0%

```json
{
  "tool": "Lefthook",
  "rationale": [
    "Fast parallel execution (Go-based)",
    "Supports Python + TypeScript",
    "Simple YAML config",
    "Modern, actively maintained"
  ],
  "installation": {
    "commands": [
      "brew install lefthook",
      "lefthook install"
    ],
    "effort": "10m"
  },
  "configuration": {
    "file": "lefthook.yml",
    "hooks": {
      "pre-commit": {
        "parallel": true,
        "commands": {
          "docs-validation": {
            "glob": "*.md",
            "run": "python3 docs/scripts/validate-docs.py {staged_files}"
          },
          "typescript-check": {
            "glob": "*.{ts,tsx}",
            "run": "npx tsc --noEmit"
          },
          "eslint": {
            "glob": "*.{ts,tsx,js,jsx}",
            "run": "npx eslint {staged_files} --fix"
          },
          "console-check": {
            "glob": "*.{ts,tsx,js,jsx}",
            "run": "! grep -n 'console\\.' {staged_files}",
            "exclude": ".*\\.test\\.(ts|tsx|js|jsx)$"
          },
          "python-format": {
            "glob": "*.py",
            "run": "black {staged_files}"
          }
        }
      },
      "pre-push": {
        "commands": {
          "compliance-check": {
            "run": "python3 docs/scripts/validate-docs.py --threshold 80"
          }
        }
      }
    },
    "effort": "1h"
  }
}
```

### 3.2 Enhanced Validation System [░░░░░░░░░░░░░░░░░░░░] 0%

```json
{
  "improvements": [
    {
      "feature": "JSON syntax validation",
      "desc": "Parse navigation/metrics JSON, report errors",
      "implementation": "json.loads() with error handling",
      "effort": "30m"
    },
    {
      "feature": "Version number detection",
      "desc": "Ensure footer has version number",
      "pattern": "_.*Version: \\d+\\.\\d+\\.\\d+.*_",
      "effort": "15m"
    },
    {
      "feature": "Broken link validation",
      "desc": "Check all internal links resolve",
      "current": "Partial support",
      "enhancement": "Handle relative paths better",
      "effort": "30m"
    },
    {
      "feature": "Auto-fix suggestions",
      "desc": "Generate diff patches for common issues",
      "examples": [
        "Missing status box → insert template",
        "No navigation → generate from path",
        "Invalid JSON → suggest fix"
      ],
      "effort": "1h"
    },
    {
      "feature": "Compliance reporting",
      "desc": "Generate detailed HTML report",
      "output": "docs/compliance-report.html",
      "metrics": [
        "Compliance score by directory",
        "Issue breakdown by severity",
        "Trend over time",
        "Files needing attention"
      ],
      "effort": "1h"
    }
  ],
  "total_effort": "3h"
}
```

### 3.3 Auto-Documentation Scripts [░░░░░░░░░░░░░░░░░░░░] 0%

```json
{
  "scripts": [
    {
      "name": "generate-docs.py",
      "desc": "Orchestrate agent-based doc generation",
      "usage": "python3 docs/scripts/generate-docs.py --target [dir]",
      "effort": "1h"
    },
    {
      "name": "generate-navigation.py",
      "desc": "Auto-generate navigation JSON for all docs",
      "usage": "python3 docs/scripts/generate-navigation.py --update",
      "effort": "1.5h"
    },
    {
      "name": "generate-metrics.py",
      "desc": "Scan codebase, generate real metrics",
      "metrics": [
        "File counts",
        "Line of code",
        "Dependency graph",
        "Complexity scores"
      ],
      "output": "docs/METRICS.json",
      "effort": "1h"
    },
    {
      "name": "cleanup.py",
      "desc": "Find and remove redundant files",
      "targets": [
        "*.old, *.backup files",
        "Commented code blocks",
        "Unused imports",
        "Orphaned files"
      ],
      "mode": "dry-run by default",
      "effort": "1h"
    },
    {
      "name": "analyze.py",
      "desc": "Generate codebase insights dashboard",
      "features": [
        "Component dependency graph",
        "Dead code detection",
        "Bundle size impact",
        "Import analysis"
      ],
      "effort": "2h"
    }
  ],
  "npm_scripts": {
    "docs:generate": "python3 docs/scripts/generate-docs.py",
    "docs:validate": "python3 docs/scripts/validate-docs.py",
    "docs:navigation": "python3 docs/scripts/generate-navigation.py",
    "cleanup": "python3 docs/scripts/cleanup.py",
    "analyze": "python3 docs/scripts/analyze.py"
  },
  "total_effort": "6.5h"
}
```

## Implementation Timeline

```json
{
  "week_1": {
    "days": "2025-10-01 to 2025-10-03",
    "focus": "Phase 1: Core documentation",
    "deliverables": [
      "5 core .md files created/updated",
      "Documentation agent deployed",
      "72 files converted to compliant format"
    ],
    "effort": "8h"
  },
  "week_2": {
    "days": "2025-10-04 to 2025-10-07",
    "focus": "Phase 2: Code quality",
    "deliverables": [
      "10 duplicates resolved",
      "Directory structure optimized",
      "Barrel exports complete",
      "Code comments updated"
    ],
    "effort": "6h"
  },
  "week_3": {
    "days": "2025-10-08 to 2025-10-10",
    "focus": "Phase 3: Automation",
    "deliverables": [
      "Lefthook installed and configured",
      "Enhanced validation system",
      "5 automation scripts created",
      "npm scripts added"
    ],
    "effort": "10h"
  }
}
```

## Risk Assessment

```json
{
  "risks": [
    {
      "risk": "Agent generates incorrect documentation",
      "probability": "Medium",
      "impact": "Medium",
      "mitigation": "Manual review of 10+ random samples before mass merge",
      "fallback": "Iterate on agent prompt, regenerate"
    },
    {
      "risk": "Component deduplication breaks imports",
      "probability": "Low",
      "impact": "High",
      "mitigation": "Test build after each deletion, comprehensive grep for imports",
      "fallback": "Revert specific changes, fix imports manually"
    },
    {
      "risk": "Lefthook hooks too strict, block workflow",
      "probability": "Low",
      "impact": "Low",
      "mitigation": "Start with warnings only, gradually enforce",
      "fallback": "Use --no-verify flag for emergency commits"
    },
    {
      "risk": "Navigation auto-generation misses relationships",
      "probability": "Medium",
      "impact": "Low",
      "mitigation": "Manual review + enhancement of related links",
      "fallback": "Keep current manual navigation as override option"
    }
  ]
}
```

## Success Metrics

```json
{
  "documentation": {
    "compliance": {
      "baseline": "21.7%",
      "target": "95%+",
      "measurement": "Run validate-docs.py"
    },
    "issues": {
      "baseline": {"HIGH": 29, "MEDIUM": 40},
      "target": {"HIGH": 0, "MEDIUM": "<5"},
      "measurement": "Issue count from validator"
    },
    "automation": {
      "baseline": "Manual doc creation",
      "target": "Agent-based generation",
      "measurement": "Agent successfully processes 72 files"
    }
  },
  "code_quality": {
    "duplicates": {
      "baseline": 10,
      "target": 0,
      "measurement": "find + basename + uniq -d"
    },
    "barrel_exports": {
      "baseline": 10,
      "target": "20+",
      "measurement": "find -name index.ts | wc -l"
    },
    "comment_efficiency": {
      "baseline": "Unknown",
      "target": "50% reduction in comment tokens",
      "measurement": "Token count analysis"
    }
  },
  "automation": {
    "git_hooks": {
      "baseline": "Basic bash pre-commit",
      "target": "Lefthook with 5+ checks",
      "measurement": "lefthook run pre-commit"
    },
    "scripts": {
      "baseline": "2 scripts (validate-docs.py, nav.sh)",
      "target": "7+ scripts",
      "measurement": "ls docs/scripts/*.py | wc -l"
    }
  }
}
```

## Next Steps

```json
{
  "immediate": [
    {"task": "Complete SYSTEM_IMPROVEMENT_PLAN.md", "eta": "30m"},
    {"task": "Update CLAUDE.md", "eta": "1h"},
    {"task": "Enhance DOCUMENTATION_STANDARDS.md", "eta": "30m"},
    {"task": "Create DOCUMENTATION_AGENT_GUIDE.md", "eta": "45m"}
  ],
  "short_term": [
    {"task": "Create generate-docs.py script", "eta": "1h"},
    {"task": "Spawn documentation agent", "eta": "2-3h"},
    {"task": "Review agent output", "eta": "1h"}
  ],
  "medium_term": [
    {"task": "Resolve component duplicates", "eta": "1.5h"},
    {"task": "Optimize directory structure", "eta": "2h"},
    {"task": "Complete barrel exports", "eta": "1h"}
  ]
}
```

---

_Plan Version: 1.0.0 | Updated: 2025-10-01 | Status: IN_PROGRESS_
_Navigate: [← ROADMAP.md](../../ROADMAP.md) | [→ DOCUMENTATION_AGENT_GUIDE.md](DOCUMENTATION_AGENT_GUIDE.md) | [→ DOCUMENTATION_STANDARDS.md](DOCUMENTATION_STANDARDS.md)_
