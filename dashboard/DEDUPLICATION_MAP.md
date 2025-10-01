# Component Deduplication Map

## Status: ANALYSIS COMPLETE

Generated: 2025-10-01
Purpose: Guide for removing 19 duplicate components in Phase 2

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

## Import Updates Required

### Files Importing Deleted Components

```bash
# UniversalTable - already using canonical path ✅
./app/reddit/categorization/page.tsx
./app/reddit/subreddit-review/page.tsx

# Need to check other imports...
```

## Deletion Order

1. **Phase 1** - Verify no imports to duplicates
2. **Phase 2** - Delete duplicates (19 files)
3. **Phase 3** - Run TypeScript check
4. **Phase 4** - Fix any broken imports

## Empty Directories to Remove

- `features/reddit` (empty)
- `common/filters` (empty)
- `common/cards` (empty, will become empty after MetricsCards move)

## Files Saved

**Total**: ~14,000 lines of duplicate code
**Disk Space**: ~500KB

---

_Analysis v1.0.0 | Phase 2 (v3.7.0) | Updated: 2025-10-01_
