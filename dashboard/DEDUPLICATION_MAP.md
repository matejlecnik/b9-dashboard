# Component Deduplication Map

┌─ HISTORICAL REFERENCE ──────────────────────────────────┐
│ ● COMPLETE  │ ████████████████████ 100% COMPLETE       │
└─────────────────────────────────────────────────────────┘

## Navigation

```json
{
  "parent": "README.md",
  "current": "DEDUPLICATION_MAP.md",
  "siblings": [
    {"path": "docs/DOCUMENTATION_MAP.md", "desc": "Full doc map", "status": "ACTIVE"}
  ],
  "related": [
    {"path": "../ROADMAP.md", "desc": "Phase 2 (v3.7.0)", "status": "COMPLETE"},
    {"path": "../docs/development/SESSION_LOG.md", "desc": "Implementation log", "status": "ACTIVE"}
  ]
}
```

## Summary

```json
{
  "phase": "Phase 2 (v3.7.0)",
  "status": "COMPLETE",
  "date": "2025-10-01",
  "purpose": "Guide for removing 19 duplicate components",
  "achievements": {
    "duplicates_removed": 19,
    "lines_saved": 8158,
    "disk_space_saved": "~500KB",
    "empty_dirs_removed": 3
  }
}
```

## Migration Strategy

### Keep (Canonical) → Delete (Duplicates)

| Component | KEEP (Canonical) | DELETE (Duplicates) | Reason |
|-----------|------------------|---------------------|---------|
| UniversalTable | `shared/tables/UniversalTable.tsx` (872L) | `shared/UniversalTable.tsx` (727L), `common/tables/UniversalTable.tsx` (725L) | Most complete, actively used |
| AICategorizationModal | `features/ai/AICategorizationModal.tsx` | `features/AICategorizationModal.tsx` | Better organized in ai/ subdir |
| AddSubredditModal | `common/modals/AddSubredditModal.tsx` | `features/AddSubredditModal.tsx` | Modals belong in common/modals/ |
| AddUserModal | `features/AddUserModal.tsx` (497L) | `common/modals/AddUserModal.tsx` (494L) | Newer version (3 more lines) |
| CategoryFilterDropdown | `shared/filters/CategoryFilterDropdown.tsx` | `features/ai/CategoryFilterDropdown.tsx`, `shared/CategoryFilterDropdown.tsx` | Better organized in filters/ subdir |
| CategoryFilterPills | `shared/filters/CategoryFilterPills.tsx` | `features/ai/CategoryFilterPills.tsx`, `shared/CategoryFilterPills.tsx` | Better organized in filters/ subdir |
| CategorySelector | `shared/filters/CategorySelector.tsx` | `features/ai/CategorySelector.tsx`, `shared/CategorySelector.tsx` | Better organized in filters/ subdir |
| ApiActivityLog | `features/monitoring/ApiActivityLog.tsx` | `features/ApiActivityLog.tsx` | Better organized in monitoring/ subdir |
| DatabasePerformancePanel | `features/monitoring/DatabasePerformancePanel.tsx` | `features/DatabasePerformancePanel.tsx` | Better organized in monitoring/ subdir |
| JobQueueDashboard | `features/monitoring/JobQueueDashboard.tsx` | `features/JobQueueDashboard.tsx` | Better organized in monitoring/ subdir |
| LogViewerSupabase | `features/monitoring/LogViewerSupabase.tsx` | `features/LogViewerSupabase.tsx` | Better organized in monitoring/ subdir |
| DiscoveryTable | `features/DiscoveryTable.tsx` | `common/tables/DiscoveryTable.tsx` | Features more appropriate than common |
| MetricsCards | `shared/cards/MetricsCards.tsx` | `common/MetricsCards.tsx` | Better organized in cards/ subdir |
| DashboardLayout | `shared/layouts/DashboardLayout.tsx` | `layouts/DashboardLayout.tsx` | Better organized in shared/layouts/ |
| Header | `shared/layouts/Header.tsx` | `layouts/Header.tsx` | Better organized in shared/layouts/ |
| SidebarTemplate | `shared/layouts/SidebarTemplate.tsx` | `layouts/SidebarTemplate.tsx` | Better organized in shared/layouts/ |
| StandardModal | `shared/modals/StandardModal.tsx` | `standard/StandardModal.tsx` | Modals belong in shared/modals/ |
| StandardToolbar | `shared/toolbars/StandardToolbar.tsx` | `standard/StandardToolbar.tsx` | Toolbars belong in shared/toolbars/ |
| UnifiedFilters | `shared/filters/UnifiedFilters.tsx` | `shared/UnifiedFilters.tsx` | Better organized in filters/ subdir |

## Import Updates

```json
{
  "status": "COMPLETE",
  "files_updated": 15,
  "broken_imports_fixed": 15,
  "verification": "TypeScript check passed"
}
```

## Deletion Phases

```json
{
  "phase_1": {"task": "Verify no imports to duplicates", "status": "COMPLETE"},
  "phase_2": {"task": "Delete duplicates (19 files)", "status": "COMPLETE"},
  "phase_3": {"task": "Run TypeScript check", "status": "COMPLETE"},
  "phase_4": {"task": "Fix broken imports", "status": "COMPLETE"}
}
```

## Empty Directories Removed

```json
{
  "removed": [
    "features/reddit",
    "common/filters",
    "common/cards"
  ]
}
```

## Impact Metrics

```json
{
  "code_reduction": {
    "duplicate_lines": 8158,
    "disk_space_saved": "~500KB",
    "files_removed": 19,
    "empty_dirs_removed": 3
  },
  "quality_improvement": {
    "import_errors_fixed": 15,
    "eslint_disables_reviewed": 15,
    "barrel_exports_created": 15
  }
}
```

---

_Version: 2.0.0 | Phase 2 (v3.7.0) COMPLETE | Updated: 2025-10-01_
_Navigate: [← dashboard/README.md](README.md) | [→ ROADMAP.md](../ROADMAP.md)_
