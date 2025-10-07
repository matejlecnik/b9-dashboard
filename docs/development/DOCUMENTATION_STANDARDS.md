# Documentation Standards & Rules

┌─ MANDATORY COMPLIANCE ──────────────────────────────────┐
│ ● ENFORCED  │ ALL .md FILES MUST FOLLOW THESE RULES   │
└─────────────────────────────────────────────────────────┘

## Navigation

```json
{
  "parent": "../INDEX.md",
  "current": "DOCUMENTATION_STANDARDS.md",
  "siblings": [
    {"path": "DOCUMENTATION_AGENT_GUIDE.md", "desc": "Agent usage", "status": "NEW"},
    {"path": "SYSTEM_IMPROVEMENT_PLAN.md", "desc": "Technical plan", "status": "NEW"}
  ],
  "related": [
    {"path": "DOCUMENTATION_TEMPLATE.md", "desc": "Template file", "use": "COPY"},
    {"path": "../../ROADMAP.md", "desc": "Strategic vision", "use": "CONTEXT"},
    {"path": "../../CLAUDE.md", "desc": "Mission control", "use": "START_HERE"}
  ]
}
```

## Critical Rules (NEW)

```json
{
  "MANDATORY": [
    {
      "rule": "Plans must be saved in .md files",
      "rationale": "Comprehensive plans belong in documentation, not TodoWrite tool",
      "format": "Use ROADMAP.md or create specific plan files",
      "violation": "Using TodoWrite for multi-phase plans"
    },
    {
      "rule": "Minimal code comments - reference .md files",
      "rationale": "Reduce token waste, centralize documentation",
      "format": "// See: docs/path/to/file.md#section",
      "example": "/**\n * Calculate subreddit score.\n * @see docs/database/REDDIT_SCHEMA.md#scoring-algorithm\n */",
      "violation": "50+ char inline explanations"
    },
    {
      "rule": "All .md files must have semantic version",
      "format": "_Version: MAJOR.MINOR.PATCH | Updated: YYYY-MM-DD_",
      "bump_rules": {
        "MAJOR": "Breaking structure changes",
        "MINOR": "New sections added",
        "PATCH": "Content updates, fixes"
      }
    }
  ]
}
```

## Mandatory Structure

```json
{
  "required_sections": [
    {"order": 1, "name": "Title", "format": "# Module Name"},
    {"order": 2, "name": "Status Box", "format": "Terminal ASCII box with progress"},
    {"order": 3, "name": "Navigation", "format": "JSON with parent/children/siblings"},
    {"order": 4, "name": "Metrics/Health", "format": "JSON or Terminal status"},
    {"order": 5, "name": "Content", "format": "JSON-heavy, minimal prose"},
    {"order": 6, "name": "Execution Plan", "format": "JSON with timeline and tasks"},
    {"order": 7, "name": "Commands", "format": "bash code blocks"},
    {"order": 8, "name": "Footer", "format": "Version, date, navigation links"}
  ]
}
```

## Style Rules

### 1. STATUS BOX (Required)
```
┌─ [MODULE TYPE] ─────────────────────────────────────────┐
│ ● [STATUS]  │ ████████████░░░░░░░░ XX% COMPLETE       │
└─────────────────────────────────────────────────────────┘

Status Types:
● OPERATIONAL - Working system
● ACTIVE DEV  - Under development
● LOCKED      - Do not modify
● PLANNED     - Future work
● DEPRECATED  - Being removed
```

### 2. NAVIGATION (Required)
```json
{
  "parent": "path/to/parent.md",
  "current": "current_file.md",
  "children": [
    {"path": "child1/README.md", "desc": "Description", "status": "STATUS"}
  ],
  "siblings": [
    {"path": "../sibling/README.md", "desc": "Description", "status": "STATUS"}
  ],
  "related": [
    {"path": "../../related.md", "desc": "Description", "use": "CONTEXT"}
  ]
}
```

### 3. TONE & LANGUAGE
```json
{
  "forbidden": [
    "Emojis (except in status: ✅ ⚠️ ❌ only)",
    "Friendly greetings ('Hello!', 'Welcome!')",
    "Casual language ('Let's', 'We'll', 'You')",
    "Exclamation marks (except warnings)",
    "Questions to reader"
  ],
  "required": [
    "Professional tone",
    "Direct statements",
    "Technical accuracy",
    "JSON for data",
    "Terminal aesthetics"
  ]
}
```

### 4. DATA PRESENTATION
```json
{
  "prefer_json": {
    "lists": "Convert to JSON arrays",
    "configs": "JSON objects",
    "metrics": "JSON with numbers",
    "status": "JSON with states"
  },
  "progress_bars": {
    "format": "[████████░░░░░░░░] XX%",
    "chars": "█ for filled, ░ for empty",
    "width": 20
  },
  "tables": {
    "when": "Comparing options",
    "format": "Markdown tables",
    "align": "Left-aligned"
  }
}
```

### 5. EXECUTION PLAN (Required)
```json
{
  "structure": {
    "current_sprint": {
      "timeline": "YYYY-MM-DD to YYYY-MM-DD",
      "tasks": [
        {"id": "PREFIX-XXX", "task": "Description", "progress": 0-100}
      ]
    },
    "next_sprint": {},
    "backlog": [],
    "milestones": {}
  },
  "id_format": {
    "pattern": "[TYPE]-[NUMBER]",
    "types": ["FEAT", "FIX", "DOC", "TEST", "PERF", "REFACTOR"],
    "example": "FEAT-001"
  },
  "timeline_estimation": {
    "rules": [
      "Be realistic - don't say 'week 3' for 2h tasks",
      "Use ranges: '2-4h' not 'approximately 3h'",
      "Break phases into 15-30min subtasks",
      "Track actual time and update estimates"
    ],
    "bad_example": "Phase 1: Documentation (Week 1-3)",
    "good_example": "Phase 1.1: Convert 5 READMEs (30m)",
    "max_phase_size": "2-4h before splitting required"
  }
}
```

### 6. METRICS FORMAT
```json
{
  "performance": {
    "format": "JSON with units",
    "example": {"latency": "89ms", "requests": 1234567}
  },
  "health": {
    "format": "Terminal style",
    "example": "API [OK] Latency: 12ms | Uptime: 99.99%"
  },
  "progress": {
    "format": "ASCII bar",
    "example": "[████████████░░░░░░░░] 60%"
  }
}
```

### 7. FILE NAMING
```json
{
  "rules": [
    "README.md for directory roots",
    "UPPERCASE for system docs (DOCUMENTATION_MAP.md)",
    "kebab-case for specific docs (api-guide.md)",
    "No spaces in filenames"
  ]
}
```

### 8. TOKEN EFFICIENCY
```json
{
  "targets": {
    "main_docs": "300-500 tokens",
    "module_docs": "200-400 tokens",
    "component_docs": "150-300 tokens"
  },
  "techniques": [
    "JSON over prose",
    "Abbreviations in keys",
    "No redundant explanations",
    "Single-line comments"
  ]
}
```

### 9. SEMANTIC VERSIONING (NEW)
```json
{
  "format": "MAJOR.MINOR.PATCH",
  "rules": {
    "MAJOR": {
      "when": "Breaking changes to structure or API",
      "examples": [
        "Removing required sections",
        "Changing navigation format",
        "Complete doc restructure"
      ]
    },
    "MINOR": {
      "when": "Adding new sections or features",
      "examples": [
        "New rule sections",
        "Additional examples",
        "New validation checks"
      ]
    },
    "PATCH": {
      "when": "Updates, fixes, clarifications",
      "examples": [
        "Typo fixes",
        "Clarifying existing rules",
        "Updating metrics"
      ]
    }
  },
  "footer_format": "_Version: 2.1.0 | Updated: 2025-10-01_",
  "required": "ALL .md files must have version in footer"
}
```

### 10. CODE COMMENT POLICY (NEW)
```json
{
  "principle": "Minimal inline comments, reference .md documentation",
  "rules": [
    "Complex logic: 1-line comment + .md link",
    "Public APIs: JSDoc with @see link",
    "No verbose explanations (>50 chars)",
    "Prefer descriptive names over comments"
  ],
  "examples": {
    "BAD": {
      "comment": "// This function calculates the subreddit score by taking the square root of average upvotes, multiplying by engagement factor, and scaling by 1000 to get final score",
      "issues": ["Too verbose", "Duplicates code", "High token cost"]
    },
    "GOOD": {
      "comment": "// See: docs/database/REDDIT_SCHEMA.md#subreddit-score",
      "benefits": ["Concise", "Centralized docs", "Low token cost"]
    },
    "JSDOC_GOOD": {
      "format": "/**\n * Calculate subreddit quality score.\n * @see docs/database/REDDIT_SCHEMA.md#scoring-algorithm\n * @param {number} avgUpvotes\n * @param {number} engagement\n * @returns {number} Quality score 0-1000\n */",
      "usage": "Public APIs, exported functions"
    }
  },
  "migration": {
    "scan_for": "Comments >50 characters",
    "action": "Replace with .md reference",
    "tool": "docs/scripts/cleanup.py --comments"
  }
}
```

## Validation Checklist

```json
{
  "must_have": [
    {"item": "Status box with progress", "check": "□"},
    {"item": "Navigation JSON", "check": "□"},
    {"item": "Execution plan (if actionable doc)", "check": "□"},
    {"item": "Professional tone", "check": "□"},
    {"item": "JSON-heavy content", "check": "□"},
    {"item": "Footer with semantic version", "check": "□"},
    {"item": "Semantic version (MAJOR.MINOR.PATCH)", "check": "□", "new": true}
  ],
  "must_not_have": [
    {"item": "Emojis (except status)", "check": "□"},
    {"item": "Friendly language", "check": "□"},
    {"item": "Verbose explanations", "check": "□"},
    {"item": "Questions to reader", "check": "□"},
    {"item": "Plans in TodoWrite (use .md files)", "check": "□", "new": true}
  ]
}
```

## Quick Template

```markdown
## [Module Name]

┌─ [STATUS TYPE] ─────────────────────────────────────────┐
│ ● [STATUS]  │ ████████████░░░░░░░░ XX% COMPLETE       │
└─────────────────────────────────────────────────────────┘

## Navigation
```json
{
  "parent": "parent.md",
  "current": "this.md",
  "children": []
}
```

## Metrics
```json
{
  "key": "value"
}
```

## Execution Plan
```json
{
  "current_sprint": {},
  "next_sprint": {},
  "backlog": []
}
```

## Commands
```bash
$ command --flag
```

---
_Version: X.X.X | Updated: YYYY-MM-DD_
```

## Enforcement

| Rule | Penalty | Enforcement |
|------|---------|-------------|
| Missing navigation | Build fails | CI/CD check |
| Wrong tone | Review required | Manual review |
| No execution plan | Not mergeable | PR blocked |
| Missing status box | Auto-rejected | Linter rule |

## Examples

```json
{
  "good": [
    "dashboard/README.md",
    "CLAUDE.md",
    "dashboard/src/app/instagram/README.md"
  ],
  "bad": [
    "Old friendly READMEs",
    "Verbose documentation",
    "No navigation links"
  ]
}
```

## 11. DOCUMENTATION STRUCTURE RULES (NEW v2.1.0)

```json
{
  "principle": "Prevent redundancy, ensure logical organization",
  "readme_placement": {
    "create_when": [
      "Directory contains 3+ files with related functionality",
      "Complex module requiring overview",
      "Entry point for developers (e.g., src/components/, api-render/app/)"
    ],
    "skip_when": [
      "Single-file directories",
      "Self-explanatory structure (e.g., .github/, .vscode/)",
      "Parent README adequately documents children"
    ]
  },
  "prevent_redundancy": {
    "no_duplicate_content": "Don't copy-paste same content across READMEs",
    "use_references": "Link to authoritative docs instead of duplicating",
    "example": "Multiple components/ subdirs → link to parent components/README.md"
  },
  "agent_output_handling": {
    "temp_directory": "docs/agent-output/",
    "workflow": [
      "1. Agent generates files in temp directory",
      "2. Review generated files",
      "3. Deploy to final locations",
      "4. Delete temp directory",
      "5. Agent-output/ is gitignored"
    ],
    "never_commit": "docs/agent-output/ or docs/agent-output-backup-*/"
  },
  "validation": {
    "tool": "docs/scripts/validate-docs.py",
    "checks": [
      "Exactly one H1 header per file",
      "Navigation JSON present",
      "Terminal-style status box",
      "No duplicate README content"
    ],
    "target": "95%+ compliance"
  }
}
```

### Anti-Patterns to Avoid

| ❌ Don't Do This | ✅ Do This Instead |
|-----------------|-------------------|
| Create README.md in every subdirectory | Only create READMEs for complex modules |
| Copy same "How to use" section across 5 READMEs | Link to single authoritative guide |
| Commit `docs/agent-output/` to git | Add to .gitignore, delete after deployment |
| Write 50-line inline code comments | 1-line comment + link to .md doc |
| Keep 8 H1 headers in one file | Fix with `docs/scripts/fix-headers.py` |

### Directory Structure Example

```
✅ GOOD STRUCTURE:
/src
  /components
    README.md          ← Overview of all components
    /ui
      button.tsx       ← No README needed (parent covers it)
      input.tsx
    /features
      README.md        ← Complex module, needs its own README
      Header.tsx
      Footer.tsx

❌ BAD STRUCTURE:
/src
  /components
    README.md
    /ui
      README.md        ← Redundant! Parent README covers this
      button.tsx
      README.md        ← Redundant! No need for single-file README
    /features
      README.md
      Header.tsx
      README.md        ← Redundant! Same info as parent
```

---

_Standards Version: 2.1.0 | Updated: 2025-10-01 | Mandatory: YES_
_Changes: v2.1.0 - Added documentation structure rules, anti-patterns, directory guidelines_
_Navigate: [← INDEX.md](../INDEX.md) | [→ DOCUMENTATION_AGENT_GUIDE.md](DOCUMENTATION_AGENT_GUIDE.md) | [→ ROADMAP.md](../../ROADMAP.md)_