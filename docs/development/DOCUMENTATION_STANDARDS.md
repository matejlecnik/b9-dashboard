# Documentation Standards & Rules

┌─ MANDATORY COMPLIANCE ──────────────────────────────────┐
│ ● ENFORCED  │ ALL .md FILES MUST FOLLOW THESE RULES   │
└─────────────────────────────────────────────────────────┘

## Navigation

```json
{
  "parent": "DOCUMENTATION_MAP.md",
  "current": "DOCUMENTATION_STANDARDS.md",
  "related": [
    {"path": "DOCUMENTATION_TEMPLATE.md", "desc": "Template file", "use": "COPY"},
    {"path": "../../CLAUDE.md", "desc": "Central hub", "use": "START_HERE"}
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

## Validation Checklist

```json
{
  "must_have": [
    {"item": "Status box with progress", "check": "□"},
    {"item": "Navigation JSON", "check": "□"},
    {"item": "Execution plan", "check": "□"},
    {"item": "Professional tone", "check": "□"},
    {"item": "JSON-heavy content", "check": "□"},
    {"item": "Footer with version/date", "check": "□"}
  ],
  "must_not_have": [
    {"item": "Emojis (except status)", "check": "□"},
    {"item": "Friendly language", "check": "□"},
    {"item": "Verbose explanations", "check": "□"},
    {"item": "Questions to reader", "check": "□"}
  ]
}
```

## Quick Template

```markdown
# [Module Name]

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

---

_Standards Version: 1.0.0 | Effective: 2024-01-28 | Mandatory: YES_
_Navigate: [← DOCUMENTATION_MAP.md](DOCUMENTATION_MAP.md) | [→ DOCUMENTATION_TEMPLATE.md](DOCUMENTATION_TEMPLATE.md)_