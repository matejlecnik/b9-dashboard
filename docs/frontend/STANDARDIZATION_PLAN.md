# Dashboard Standardization Plan

┌─ STANDARDIZATION PLAN ──────────────────────────────────┐
│ ● DEFERRED    │ ████░░░░░░░░░░░░░░░░ 20% COMPLETE       │
│ Status: LOW PRIORITY │ Updated: 2025-10-07              │
│ Note: Design system work (98%) completed Oct 5-7         │
└─────────────────────────────────────────────────────────┘

## Navigation

```json
{
  "parent": "../ROADMAP.md",
  "current": "docs/frontend/STANDARDIZATION_PLAN.md",
  "siblings": [
    {"path": "COMPONENT_GUIDE.md", "desc": "Component catalog", "status": "COMPLETE"},
    {"path": "templates/PAGE_PATTERNS.md", "desc": "Page patterns", "status": "COMPLETE"},
    {"path": "../archive/2025-10-07_DESIGN_SYSTEM_STANDARDIZATION.md", "desc": "Design system (98% complete)", "status": "ARCHIVED"}
  ],
  "related": [
    {"path": "../../ROADMAP.md", "desc": "v3.7.0 barrel exports", "status": "IN_PROGRESS"}
  ]
}
```

## Project Context

```json
{
  "version": "3.12.4",
  "focus": "Code standardization WITHOUT changing page UI/functionality",
  "current_state": {
    "barrel_exports": "Partially removed (4/15 deleted)",
    "component_dirs": 11,
    "avg_page_size": "500-900 LOC",
    "import_style": "Mixed (barrel + direct)",
    "design_system_usage": "40% adoption"
  },
  "constraints": {
    "reddit_module": "LOCKED - Do not modify functionality",
    "instagram_module": "ACTIVE - Maintain current behavior",
    "ui_changes": "FORBIDDEN - No visual/behavioral changes",
    "performance": "Maintain or improve current metrics"
  }
}
```

## Problem Statement

```json
{
  "issue": "Inconsistent code organization reduces maintainability and build performance",
  "symptoms": [
    "Mixed barrel export and direct import patterns",
    "11 overlapping component directories",
    "Inconsistent page structure patterns",
    "Underutilized design system (40% vs target 90%)",
    "Slower builds due to inefficient tree-shaking"
  ],
  "impact": {
    "developer_experience": "Confusion about where components live",
    "build_performance": "15-20% slower than optimal",
    "maintainability": "Duplicate patterns across pages",
    "onboarding": "Steep learning curve for new developers"
  }
}
```

## Goals & Success Metrics

```json
{
  "primary_goals": [
    {
      "goal": "Complete barrel export removal",
      "from": "4/15 removed",
      "to": "15/15 removed + all imports updated",
      "benefit": "15-20% faster builds, better tree-shaking"
    },
    {
      "goal": "Standardize import patterns",
      "from": "Mixed barrel + direct imports",
      "to": "100% direct imports",
      "benefit": "Consistent codebase, faster IDE navigation"
    },
    {
      "goal": "Consolidate component directories",
      "from": "11 directories (common, features, shared, standard, etc.)",
      "to": "4 clear directories (ui, primitives, patterns, templates)",
      "benefit": "Clear mental model, easier to find components"
    },
    {
      "goal": "Design system adoption",
      "from": "40% usage",
      "to": "90% usage",
      "benefit": "Consistent styling, smaller bundle size"
    }
  ],
  "success_metrics": {
    "build_time": "-15% (currently ~4.5s)",
    "bundle_size": "No regression (<1.8MB initial)",
    "import_consistency": "100% direct imports",
    "zero_regressions": "All pages work identically",
    "typescript_errors": "0 new errors"
  }
}
```

## Current Architecture Analysis

### Component Directory Structure

```json
{
  "current_structure": {
    "src/components/": {
      "ui/": {"desc": "shadcn/ui primitives", "files": 20, "status": "KEEP"},
      "standard/": {"desc": "Standard components", "files": 13, "status": "CONSOLIDATE"},
      "shared/": {"desc": "Shared complex components", "files": 31, "status": "CONSOLIDATE"},
      "common/": {"desc": "Common modals/tables", "files": 9, "status": "CONSOLIDATE"},
      "features/": {"desc": "Feature-specific", "files": 11, "status": "CONSOLIDATE"},
      "templates/": {"desc": "Page templates", "files": 6, "status": "KEEP"},
      "layouts/": {"desc": "Layout components", "files": 4, "status": "CONSOLIDATE"},
      "instagram/": {"desc": "Instagram-specific", "files": 7, "status": "CONSOLIDATE"}
    },
    "problems": [
      "Unclear boundaries between standard/, shared/, and common/",
      "Instagram-specific components mixed with shared",
      "Layout components not in shared/layouts/",
      "Features directory too broad"
    ]
  }
}
```

### Import Pattern Analysis

```json
{
  "current_imports": {
    "barrel_exports_remaining": [
      "src/components/templates/index.ts",
      "src/components/templates/hooks/index.ts",
      "src/components/shared/index.ts (if exists)",
      "src/components/standard/index.ts"
    ],
    "direct_imports": {
      "good_examples": [
        "import { Button } from '@/components/ui/button'",
        "import { UniversalTable } from '@/components/shared/tables/UniversalTable'"
      ],
      "inconsistent_examples": [
        "import { ReviewPageTemplate } from '@/components/templates'",
        "import { Card, CardTitle } from '@/components/ui/card'"
      ]
    },
    "impact": {
      "webpack_parsing": "Extra time resolving barrel exports",
      "ide_performance": "Slower autocomplete",
      "bundle_analysis": "Harder to track actual imports"
    }
  }
}
```

### Page Pattern Analysis

```json
{
  "page_patterns": {
    "instagram_pages": {
      "pattern": "Uses templates (ReviewPageTemplate)",
      "avg_loc": 342,
      "consistency": "HIGH",
      "example": "src/app/instagram/creator-review/page.tsx"
    },
    "reddit_pages": {
      "pattern": "Direct implementation",
      "avg_loc": 776,
      "consistency": "MEDIUM",
      "example": "src/app/reddit/categorization/page.tsx",
      "note": "LOCKED - cannot refactor to templates"
    },
    "recommendation": {
      "action": "Standardize imports and patterns WITHOUT changing structure",
      "reason": "Reddit module locked, Instagram already uses templates"
    }
  }
}
```

---

## Phase 1: Complete Barrel Export Removal (v3.7.1)

```json
{
  "version": "3.7.1",
  "timeline": "2-3 hours",
  "status": "READY",
  "priority": "HIGH",
  "dependencies": ["Current work (4 exports removed) must be committed first"]
}
```

### Tasks

```json
{
  "tasks": [
    {
      "id": "BARREL-001",
      "task": "Commit current barrel export removal work",
      "files": [
        "dashboard/src/components/index.ts (deleted)",
        "dashboard/src/components/ui/index.ts (deleted)",
        "dashboard/src/hooks/index.ts (deleted)",
        "dashboard/src/lib/index.ts (deleted)",
        "12 modified pages with updated imports"
      ],
      "effort": "15min",
      "status": "PENDING_COMMIT"
    },
    {
      "id": "BARREL-002",
      "task": "Find all remaining barrel exports",
      "command": "find dashboard/src -name 'index.ts' -o -name 'index.tsx'",
      "expected": ["templates/index.ts", "templates/hooks/index.ts", "standard/index.ts"],
      "effort": "10min"
    },
    {
      "id": "BARREL-003",
      "task": "Analyze imports using each barrel export",
      "command": "grep -r \"from '@/components/templates'\" dashboard/src",
      "output_to": "docs/frontend/temp/barrel-import-analysis.txt",
      "effort": "15min"
    },
    {
      "id": "BARREL-004",
      "task": "Update all imports to direct paths",
      "pattern_from": "import { ReviewPageTemplate } from '@/components/templates'",
      "pattern_to": "import { ReviewPageTemplate } from '@/components/templates/ReviewPageTemplate'",
      "files_affected": "~8-12 pages",
      "effort": "45min"
    },
    {
      "id": "BARREL-005",
      "task": "Delete barrel export files",
      "files": [
        "dashboard/src/components/templates/index.ts",
        "dashboard/src/components/templates/hooks/index.ts",
        "dashboard/src/components/standard/index.ts"
      ],
      "effort": "5min"
    },
    {
      "id": "BARREL-006",
      "task": "Verify build and TypeScript",
      "commands": [
        "npm run build",
        "npm run type-check"
      ],
      "expected": "0 errors",
      "effort": "10min"
    },
    {
      "id": "BARREL-007",
      "task": "Test all pages manually",
      "pages": ["reddit/categorization", "instagram/creator-review", "models", "tracking"],
      "verify": "No visual or functional changes",
      "effort": "30min"
    }
  ]
}
```

### Success Criteria

```json
{
  "criteria": [
    {"check": "Zero barrel export files remain", "command": "find src -name 'index.ts' | grep -v node_modules"},
    {"check": "All imports are direct", "pattern": "import .* from '@/[^']*/.+/.+'"},
    {"check": "Build succeeds", "command": "npm run build"},
    {"check": "No new TypeScript errors", "command": "npm run type-check"},
    {"check": "Pages load identically", "test": "Manual QA on 5 key pages"}
  ]
}
```

---

## Phase 2: Component Directory Consolidation (v3.8.0)

```json
{
  "version": "3.8.0",
  "timeline": "4-6 hours",
  "status": "PLANNED",
  "priority": "MEDIUM",
  "dependencies": ["Phase 1 complete"]
}
```

### New Directory Structure

```json
{
  "proposed_structure": {
    "src/components/": {
      "ui/": {
        "desc": "shadcn/ui primitives - NO CHANGE",
        "examples": ["button.tsx", "card.tsx", "input.tsx"],
        "rule": "Only shadcn components"
      },
      "primitives/": {
        "desc": "Basic reusable components",
        "merge_from": ["standard/", "shared/basic"],
        "examples": [
          "Table.tsx",
          "SearchBar.tsx",
          "EmptyState.tsx",
          "Card.tsx",
          "FilterPills.tsx"
        ],
        "rule": "Simple, single-purpose components"
      },
      "patterns/": {
        "desc": "Complex composite components",
        "merge_from": ["shared/", "features/", "common/"],
        "structure": {
          "DataTable/": ["UniversalTable.tsx", "UniversalCreatorTable.tsx"],
          "Toolbar/": ["StandardToolbar.tsx", "UnifiedToolbar.tsx"],
          "Metrics/": ["MetricsCards.tsx"],
          "Modals/": ["StandardModal.tsx", "AddUserModal.tsx", "AICategorizationModal.tsx"],
          "Filters/": ["CategoryFilterDropdown.tsx", "UnifiedFilters.tsx"],
          "Monitoring/": ["LogViewerSupabase.tsx", "ApiActivityLog.tsx"]
        },
        "rule": "Multi-component patterns, complex logic"
      },
      "templates/": {
        "desc": "Page templates - NO CHANGE",
        "files": [
          "ReviewPageTemplate.tsx",
          "DashboardTemplate.tsx",
          "hooks/useTemplateData.ts",
          "hooks/useTemplateActions.ts"
        ],
        "rule": "Full page templates only"
      }
    }
  }
}
```

### Migration Strategy

```json
{
  "strategy": "Gradual migration with zero downtime",
  "steps": [
    {
      "step": 1,
      "action": "Create new directories",
      "commands": [
        "mkdir -p src/components/primitives",
        "mkdir -p src/components/patterns/{DataTable,Toolbar,Metrics,Modals,Filters,Monitoring}"
      ]
    },
    {
      "step": 2,
      "action": "Move files to new structure (keep copies in old locations)",
      "reason": "Allows gradual import updates without breaking existing code",
      "example": {
        "from": "src/components/standard/SearchBar.tsx",
        "to": "src/components/primitives/SearchBar.tsx",
        "keep_original": true
      }
    },
    {
      "step": 3,
      "action": "Update imports page by page",
      "approach": "Update one page at a time, test, commit",
      "verification": "Manual testing after each page"
    },
    {
      "step": 4,
      "action": "Delete old files after all imports updated",
      "verification": "grep -r for old import paths returns zero results"
    },
    {
      "step": 5,
      "action": "Remove empty directories",
      "command": "find src/components -type d -empty -delete"
    }
  ]
}
```

### Detailed File Mapping

```json
{
  "file_migrations": {
    "to_primitives": [
      {"from": "standard/SearchBar.tsx", "to": "primitives/SearchBar.tsx"},
      {"from": "standard/EmptyState.tsx", "to": "primitives/EmptyState.tsx"},
      {"from": "standard/Card.tsx", "to": "primitives/Card.tsx"},
      {"from": "standard/FilterPills.tsx", "to": "primitives/FilterPills.tsx"},
      {"from": "standard/PageContainer.tsx", "to": "primitives/PageContainer.tsx"},
      {"from": "standard/DataCard.tsx", "to": "primitives/DataCard.tsx"},
      {"from": "shared/SortButton.tsx", "to": "primitives/SortButton.tsx"},
      {"from": "shared/SFWToggle.tsx", "to": "primitives/SFWToggle.tsx"}
    ],
    "to_patterns_DataTable": [
      {"from": "shared/tables/UniversalTable.tsx", "to": "patterns/DataTable/UniversalTable.tsx"},
      {"from": "shared/tables/UniversalCreatorTable.tsx", "to": "patterns/DataTable/UniversalCreatorTable.tsx"},
      {"from": "shared/tables/VirtualizedCreatorTable.tsx", "to": "patterns/DataTable/VirtualizedCreatorTable.tsx"}
    ],
    "to_patterns_Toolbar": [
      {"from": "shared/toolbars/StandardToolbar.tsx", "to": "patterns/Toolbar/StandardToolbar.tsx"},
      {"from": "ui/UnifiedToolbar.tsx", "to": "patterns/Toolbar/UnifiedToolbar.tsx"}
    ],
    "to_patterns_Metrics": [
      {"from": "shared/cards/MetricsCards.tsx", "to": "patterns/Metrics/MetricsCards.tsx"}
    ],
    "to_patterns_Modals": [
      {"from": "shared/modals/StandardModal.tsx", "to": "patterns/Modals/StandardModal.tsx"},
      {"from": "common/modals/AddSubredditModal.tsx", "to": "patterns/Modals/AddSubredditModal.tsx"},
      {"from": "features/AddUserModal.tsx", "to": "patterns/Modals/AddUserModal.tsx"},
      {"from": "features/ai/AICategorizationModal.tsx", "to": "patterns/Modals/AICategorizationModal.tsx"}
    ],
    "to_patterns_Filters": [
      {"from": "shared/filters/UnifiedFilters.tsx", "to": "patterns/Filters/UnifiedFilters.tsx"},
      {"from": "shared/filters/CategoryFilterDropdown.tsx", "to": "patterns/Filters/CategoryFilterDropdown.tsx"},
      {"from": "shared/filters/CategoryFilterPills.tsx", "to": "patterns/Filters/CategoryFilterPills.tsx"}
    ],
    "to_patterns_Monitoring": [
      {"from": "features/monitoring/LogViewerSupabase.tsx", "to": "patterns/Monitoring/LogViewerSupabase.tsx"},
      {"from": "features/monitoring/ApiActivityLog.tsx", "to": "patterns/Monitoring/ApiActivityLog.tsx"},
      {"from": "features/monitoring/DatabasePerformancePanel.tsx", "to": "patterns/Monitoring/DatabasePerformancePanel.tsx"}
    ]
  }
}
```

---

## Phase 3: Import Pattern Standardization (v3.8.1)

```json
{
  "version": "3.8.1",
  "timeline": "2-3 hours",
  "status": "PLANNED",
  "priority": "MEDIUM",
  "dependencies": ["Phase 1 and 2 complete"]
}
```

### Import Standards

```json
{
  "rules": {
    "ui_components": {
      "pattern": "import { ComponentName } from '@/components/ui/component-name'",
      "example": "import { Button } from '@/components/ui/button'",
      "note": "Matches shadcn/ui convention"
    },
    "primitives": {
      "pattern": "import { ComponentName } from '@/components/primitives/ComponentName'",
      "example": "import { SearchBar } from '@/components/primitives/SearchBar'"
    },
    "patterns": {
      "pattern": "import { ComponentName } from '@/components/patterns/Category/ComponentName'",
      "example": "import { UniversalTable } from '@/components/patterns/DataTable/UniversalTable'"
    },
    "templates": {
      "pattern": "import { TemplateName } from '@/components/templates/TemplateName'",
      "example": "import { ReviewPageTemplate } from '@/components/templates/ReviewPageTemplate'"
    },
    "hooks": {
      "pattern": "import { hookName } from '@/hooks/hookName'",
      "example": "import { useDebounce } from '@/hooks/useDebounce'"
    },
    "utils": {
      "pattern": "import { utilName } from '@/lib/utilName'",
      "example": "import { cn } from '@/lib/utils'"
    }
  },
  "forbidden_patterns": [
    "import * as Components from '@/components/...'",
    "import { Component1, Component2 } from '@/components'",
    "Relative imports beyond parent: '../../../components/...'",
    "Barrel exports: import from index.ts files"
  ]
}
```

### Enforcement Tools

```json
{
  "tools": [
    {
      "tool": "ESLint Rule",
      "config": "eslint-plugin-import",
      "rule": "no-restricted-imports",
      "enforcement": "Error on barrel imports"
    },
    {
      "tool": "Pre-commit Hook",
      "script": "scripts/validate-imports.sh",
      "check": "Grep for forbidden import patterns"
    },
    {
      "tool": "VS Code Settings",
      "file": ".vscode/settings.json",
      "config": {
        "typescript.preferences.importModuleSpecifier": "non-relative",
        "javascript.preferences.importModuleSpecifier": "non-relative"
      }
    }
  ]
}
```

---

## Phase 4: Design System Adoption (v3.9.0)

```json
{
  "version": "3.9.0",
  "timeline": "3-4 hours",
  "status": "PLANNED",
  "priority": "MEDIUM",
  "dependencies": ["Phase 1-3 complete"]
}
```

### Current Design System

```json
{
  "location": "src/lib/design-system.ts",
  "tokens": {
    "shadows": 7,
    "radius": 4,
    "spacing": 5,
    "text": 9,
    "glass": 4,
    "button": 5,
    "card": 5,
    "status": 5,
    "animation": 6,
    "grid": 5,
    "zIndex": 9
  },
  "current_adoption": "40%",
  "target_adoption": "90%"
}
```

### Adoption Strategy

```json
{
  "approach": "Gradual replacement of hardcoded styles",
  "phases": [
    {
      "phase": 1,
      "target": "primitives/ components",
      "action": "Replace all hardcoded Tailwind with designSystem tokens",
      "example": {
        "before": "className=\"rounded-lg p-4 shadow-sm\"",
        "after": "className={cn(designSystem.radius.sm, designSystem.spacing.compact, designSystem.shadows.sm)}"
      },
      "impact": "~20 files"
    },
    {
      "phase": 2,
      "target": "patterns/ components",
      "action": "Same as phase 1",
      "impact": "~30 files"
    },
    {
      "phase": 3,
      "target": "Page files",
      "action": "Replace hardcoded styles in page.tsx files",
      "note": "Only standardize repeated patterns",
      "impact": "~15 files"
    }
  ]
}
```

### Common Replacements

```json
{
  "replacements": [
    {
      "pattern": "rounded-lg",
      "replace_with": "designSystem.radius.sm",
      "occurrences": "~150"
    },
    {
      "pattern": "p-4 sm:p-6",
      "replace_with": "designSystem.spacing.card",
      "occurrences": "~80"
    },
    {
      "pattern": "shadow-sm",
      "replace_with": "designSystem.shadows.sm",
      "occurrences": "~120"
    },
    {
      "pattern": "text-xl font-semibold",
      "replace_with": "designSystem.text.h3",
      "occurrences": "~60"
    },
    {
      "pattern": "bg-white border border-gray-200",
      "replace_with": "designSystem.card.default",
      "occurrences": "~90"
    }
  ],
  "automated": {
    "tool": "codemod script",
    "script": "scripts/adopt-design-system.js",
    "dry_run": true,
    "review": "Manual review each file after transformation"
  }
}
```

---

## Phase 5: Documentation & Validation (v3.9.1)

```json
{
  "version": "3.9.1",
  "timeline": "1-2 hours",
  "status": "PLANNED",
  "priority": "HIGH",
  "dependencies": ["All other phases complete"]
}
```

### Documentation Updates

```json
{
  "files_to_update": [
    {
      "file": "dashboard/README.md",
      "updates": ["Component structure", "Import patterns", "Build metrics"]
    },
    {
      "file": "docs/frontend/COMPONENT_GUIDE.md",
      "updates": ["New directory structure", "Import examples", "Migration guide"]
    },
    {
      "file": "docs/frontend/templates/PAGE_PATTERNS.md",
      "updates": ["Updated import patterns", "Design system usage"]
    },
    {
      "file": "ROADMAP.md",
      "updates": ["Mark v3.7.0 complete", "Add v3.8.0-3.9.1"]
    },
    {
      "file": "CLAUDE.md",
      "updates": ["Update metrics", "Add standardization completion"]
    }
  ]
}
```

### Validation Checklist

```json
{
  "validation": [
    {
      "category": "Build",
      "checks": [
        {"check": "npm run build succeeds", "command": "npm run build"},
        {"check": "npm run type-check passes", "command": "npm run type-check"},
        {"check": "npm run lint passes", "command": "npm run lint"},
        {"check": "Bundle size not increased", "command": "npm run build:analyze"}
      ]
    },
    {
      "category": "Imports",
      "checks": [
        {"check": "No barrel exports", "command": "find src -name 'index.ts' | grep -v node_modules | wc -l"},
        {"check": "No relative imports beyond parent", "command": "grep -r '\\.\\./\\.\\./' src | wc -l"},
        {"check": "All imports use @ alias", "command": "grep -r \"from '\\.\\.\" src | wc -l"}
      ]
    },
    {
      "category": "Structure",
      "checks": [
        {"check": "Only 4 component dirs", "command": "ls src/components | wc -l"},
        {"check": "No empty directories", "command": "find src/components -type d -empty"},
        {"check": "All components in correct dirs", "manual": true}
      ]
    },
    {
      "category": "Functionality",
      "checks": [
        {"check": "All pages load", "pages": ["reddit/categorization", "reddit/posting", "instagram/creator-review", "models", "tracking"]},
        {"check": "No console errors", "browser_console": true},
        {"check": "Search works", "test": "Manual"},
        {"check": "Filters work", "test": "Manual"},
        {"check": "Bulk actions work", "test": "Manual"}
      ]
    },
    {
      "category": "Performance",
      "checks": [
        {"check": "Build time improved", "target": "-15%", "baseline": "4.5s"},
        {"check": "Bundle size stable", "max": "1.8MB"},
        {"check": "Page load time stable", "max": "342ms"}
      ]
    }
  ]
}
```

---

## Risk Assessment & Mitigation

```json
{
  "risks": [
    {
      "risk": "Breaking Reddit module (LOCKED)",
      "likelihood": "LOW",
      "impact": "HIGH",
      "mitigation": [
        "Test all Reddit pages after each phase",
        "Keep Reddit imports exactly as-is",
        "Don't refactor Reddit page structure"
      ]
    },
    {
      "risk": "Import resolution failures",
      "likelihood": "MEDIUM",
      "impact": "HIGH",
      "mitigation": [
        "Update imports incrementally, one page at a time",
        "Test after each page update",
        "Keep old files until all imports updated"
      ]
    },
    {
      "risk": "Increased bundle size",
      "likelihood": "LOW",
      "impact": "MEDIUM",
      "mitigation": [
        "Monitor bundle size after each phase",
        "Run build:analyze regularly",
        "Revert if size increases >5%"
      ]
    },
    {
      "risk": "Design system adoption bugs",
      "likelihood": "MEDIUM",
      "impact": "LOW",
      "mitigation": [
        "Visual regression testing",
        "Manual QA on all pages",
        "Review each file after codemod"
      ]
    }
  ]
}
```

---

## Implementation Timeline

```json
{
  "total_effort": "12-18 hours",
  "schedule": {
    "week_1": {
      "focus": "Phase 1 - Barrel Export Removal",
      "tasks": ["Commit current work", "Remove remaining exports", "Update imports"],
      "deliverable": "v3.7.1",
      "hours": "2-3"
    },
    "week_2": {
      "focus": "Phase 2 - Directory Consolidation",
      "tasks": ["Create new structure", "Move files", "Update imports"],
      "deliverable": "v3.8.0",
      "hours": "4-6"
    },
    "week_3": {
      "focus": "Phase 3 & 4 - Imports & Design System",
      "tasks": ["Standardize imports", "Adopt design system tokens"],
      "deliverable": "v3.9.0",
      "hours": "5-7"
    },
    "week_4": {
      "focus": "Phase 5 - Documentation & Testing",
      "tasks": ["Update docs", "Full QA", "Performance validation"],
      "deliverable": "v3.9.1",
      "hours": "1-2"
    }
  },
  "checkpoints": [
    {"after": "Phase 1", "verify": "Build works, all pages load"},
    {"after": "Phase 2", "verify": "New structure works, imports resolve"},
    {"after": "Phase 3", "verify": "No mixed import patterns"},
    {"after": "Phase 4", "verify": "Design system usage >90%"},
    {"after": "Phase 5", "verify": "All metrics green"}
  ]
}
```

---

## Expected Outcomes

```json
{
  "code_quality": {
    "before": {
      "component_dirs": 11,
      "barrel_exports": 15,
      "import_patterns": "Mixed",
      "design_system_usage": "40%",
      "avg_page_size": "500-900 LOC"
    },
    "after": {
      "component_dirs": 4,
      "barrel_exports": 0,
      "import_patterns": "100% direct",
      "design_system_usage": "90%",
      "avg_page_size": "500-900 LOC (unchanged)"
    }
  },
  "performance": {
    "build_time": "-15% (4.5s → 3.8s)",
    "bundle_size": "Stable or -5%",
    "tree_shaking": "+20% effectiveness",
    "ide_autocomplete": "+30% faster"
  },
  "maintainability": {
    "onboarding_time": "-40% (easier to understand structure)",
    "component_discovery": "+60% faster (clear hierarchy)",
    "refactoring_confidence": "+50% (consistent patterns)"
  }
}
```

---

## Commands Reference

```bash
## Phase 1: Barrel Export Removal
$ find dashboard/src -name 'index.ts' -o -name 'index.tsx'
$ grep -r "from '@/components/templates'" dashboard/src
$ npm run build && npm run type-check

## Phase 2: Directory Consolidation
$ mkdir -p dashboard/src/components/{primitives,patterns/{DataTable,Toolbar,Metrics,Modals,Filters,Monitoring}}
$ find dashboard/src/components -type d -empty -delete

## Phase 3: Import Validation
$ grep -r '\.\./\.\\./' dashboard/src
$ grep -r "from '\\." dashboard/src

## Phase 4: Design System
$ grep -r "rounded-lg" dashboard/src/components
$ node scripts/adopt-design-system.js --dry-run

## Phase 5: Final Validation
$ npm run build:analyze
$ npm run lint
$ npm run test
```

---

## Execution Plan

```json
{
  "immediate": {
    "timeline": "NOW",
    "tasks": [
      {"id": "EXEC-001", "task": "Review and approve this plan", "owner": "Team"},
      {"id": "EXEC-002", "task": "Commit current barrel export work", "owner": "Dev"}
    ]
  },
  "phase_1": {
    "timeline": "Week 1",
    "tasks": [
      {"id": "P1-001", "task": "Remove remaining barrel exports", "hours": 2},
      {"id": "P1-002", "task": "Update all imports", "hours": 1},
      {"id": "P1-003", "task": "Test and validate", "hours": 1}
    ]
  },
  "phase_2": {
    "timeline": "Week 2",
    "tasks": [
      {"id": "P2-001", "task": "Create new directory structure", "hours": 1},
      {"id": "P2-002", "task": "Move files to new locations", "hours": 2},
      {"id": "P2-003", "task": "Update imports page by page", "hours": 3}
    ]
  },
  "phase_3_4": {
    "timeline": "Week 3",
    "tasks": [
      {"id": "P3-001", "task": "Standardize import patterns", "hours": 2},
      {"id": "P4-001", "task": "Adopt design system in primitives", "hours": 2},
      {"id": "P4-002", "task": "Adopt design system in patterns", "hours": 3}
    ]
  },
  "phase_5": {
    "timeline": "Week 4",
    "tasks": [
      {"id": "P5-001", "task": "Update documentation", "hours": 1},
      {"id": "P5-002", "task": "Full QA testing", "hours": 1}
    ]
  }
}
```

---

_Version: 1.0.0 | Created: 2025-10-02 | Updated: 2025-10-10 | Status: DEFERRED | Effort: 12-18h_
_Navigate: [← ROADMAP.md](../../ROADMAP.md) | [→ COMPONENT_GUIDE.md](COMPONENT_GUIDE.md) | [↑ CLAUDE.md](../../CLAUDE.md)_
