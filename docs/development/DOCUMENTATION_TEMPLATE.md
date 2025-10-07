# Documentation Template

┌─ TEMPLATE ──────────────────────────────────────────────┐
│ ● REFERENCE │ USE THIS FOR ALL NEW DOCUMENTATION       │
└─────────────────────────────────────────────────────────┘

## Navigation

```json
{
  "parent": "DOCUMENTATION_STANDARDS.md",
  "current": "DOCUMENTATION_TEMPLATE.md",
  "related": [
    {"path": "../INDEX.md", "desc": "Full navigation", "use": "REFERENCE"},
    {"path": "../../CLAUDE.md", "desc": "Central hub", "use": "START_HERE"}
  ]
}
```

## Template Structure

```markdown
## [Module Name]

┌─ [STATUS TYPE] ─────────────────────────────────────────┐
│ ● [STATUS]  │ ████████████░░░░░░░░ XX% COMPLETE       │
└─────────────────────────────────────────────────────────┘

## Navigation

```json
{
  "parent": "../parent/README.md",
  "current": "current.md",
  "children": [
    {"path": "child1/", "desc": "Brief description", "status": "ACTIVE"},
    {"path": "child2/", "desc": "Brief description", "status": "PLANNED"}
  ],
  "siblings": [
    {"path": "../sibling/", "desc": "Brief description", "status": "OK"}
  ]
}
```

## System Health

```
SERVICE   [OK]   Metric: XXms    | Status: Running
DATABASE  [WARN] Connections: 80/100 | Load: High
CACHE     [ERR]  Hit Rate: 45%   | Action: Required
```

## Metrics

```json
{
  "performance": {
    "requests_24h": 0,
    "p95_latency": "0ms",
    "error_rate": "0%",
    "uptime": "0%"
  },
  "resources": {
    "cpu": 0,
    "memory": 0,
    "disk": 0
  }
}
```

## Architecture

```json
{
  "components": [
    {"name": "Component1", "type": "service", "status": "OK"},
    {"name": "Component2", "type": "handler", "status": "DEV"}
  ],
  "data_flow": [
    {"from": "input", "to": "processor", "latency": "10ms"},
    {"from": "processor", "to": "output", "latency": "5ms"}
  ]
}
```

## Execution Plan

```json
{
  "current_sprint": {
    "timeline": "YYYY-MM-DD to YYYY-MM-DD",
    "tasks": [
      {"id": "TYPE-001", "task": "Description", "progress": 0, "effort": "Xh"}
    ]
  },
  "next_sprint": {
    "tasks": [
      {"id": "TYPE-002", "task": "Description", "dependencies": ["TYPE-001"]}
    ]
  },
  "backlog": [
    {"id": "TYPE-003", "task": "Future task", "priority": "P2"}
  ]
}
```

## Performance

```
Load Times:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Component A  [███░░░░░░░] 120ms
Component B  [████░░░░░░] 180ms
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Resources:
CPU     [████████░░░░░░░░░░░░] 40%
MEMORY  [██████████████░░░░░░] 70%
```

## Commands

```bash
$ npm run module:dev         # Development
$ npm run module:test        # Testing
$ npm run module:build       # Production
```

---

_Version: 0.0.0 | Updated: YYYY-MM-DD_
_Navigate: [← Parent](../) | [→ Next](./next/) | [↑ Hub](../../CLAUDE.md)_
```
```

## Copy-Paste Template

```markdown
## Module Name

┌─ MODULE STATUS ─────────────────────────────────────────┐
│ ● ACTIVE DEV  │ ████████████░░░░░░░░ 60% COMPLETE      │
└─────────────────────────────────────────────────────────┘

## Navigation

```json
{
  "parent": "../README.md",
  "current": "README.md",
  "children": [],
  "siblings": []
}
```

## Metrics

```json
{
  "performance": {
    "latency": "0ms",
    "throughput": 0,
    "error_rate": "0%"
  }
}
```

## Execution Plan

```json
{
  "current": [
    {"id": "TASK-001", "task": "Task", "progress": 0}
  ],
  "next": [],
  "backlog": []
}
```

## Commands

```bash
$ command --flag
```

---

_Version: 1.0.0 | Updated: 2024-01-28_
```

## Status Types Reference

```
┌─ OPERATIONAL ───────────────────────────────────────────┐
│ ● OPERATIONAL │ System running in production           │
└─────────────────────────────────────────────────────────┘

┌─ ACTIVE DEV ────────────────────────────────────────────┐
│ ● ACTIVE DEV  │ Currently under development            │
└─────────────────────────────────────────────────────────┘

┌─ LOCKED ────────────────────────────────────────────────┐
│ ● LOCKED      │ Do not modify - complete & working    │
└─────────────────────────────────────────────────────────┘

┌─ PLANNED ───────────────────────────────────────────────┐
│ ● PLANNED     │ Future work - not started             │
└─────────────────────────────────────────────────────────┘

┌─ DEPRECATED ────────────────────────────────────────────┐
│ ● DEPRECATED  │ Being phased out - do not use         │
└─────────────────────────────────────────────────────────┘
```

## Task ID Prefixes

```json
{
  "prefixes": {
    "FEAT": "New feature",
    "FIX": "Bug fix",
    "DOC": "Documentation",
    "TEST": "Testing",
    "PERF": "Performance",
    "REFACTOR": "Code refactoring",
    "STYLE": "Formatting/style",
    "CHORE": "Maintenance"
  },
  "format": "PREFIX-XXX",
  "example": "FEAT-001"
}
```

## Health Status Indicators

```
[OK]   - Operating normally
[WARN] - Needs attention
[ERR]  - Critical issue
[DEV]  - Under development
[OFF]  - Disabled/offline
```

## Progress Bar Format

```
Empty:    [░░░░░░░░░░░░░░░░░░░░]  0%
Quarter:  [█████░░░░░░░░░░░░░░░] 25%
Half:     [██████████░░░░░░░░░░] 50%
Three-Q:  [███████████████░░░░░] 75%
Complete: [████████████████████] 100%
```

---

_Template Version: 2.0.0 | Style: Terminal + JSON | Mandatory: YES_
_Navigate: [← DOCUMENTATION_STANDARDS.md](DOCUMENTATION_STANDARDS.md) | [→ INDEX.md](../INDEX.md)_