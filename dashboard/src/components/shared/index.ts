// Shared components exports
// This file provides centralized exports for all shared components

// Tables
export { UniversalTable, createSubredditReviewTable, createCategorizationTable, createCompactSubredditTable } from './tables/UniversalTable'
export { UniversalCreatorTable } from './tables/UniversalCreatorTable'
export type { InstagramCreator as Creator } from './tables/UniversalCreatorTable'
// Note: VirtualizedCreatorTable removed (unused)

// Cards
export { MetricsCards } from './cards/MetricsCards'

// Filters
// Note: CategoryFilterPills, CategoryFilterDropdown, UnifiedFilters removed (unused)

// Toolbars
export { StandardToolbar } from './toolbars/StandardToolbar'

// Buttons
export { StandardActionButton } from './buttons/StandardActionButton'

// Modals
export { StandardModal } from './modals/StandardModal'
export type { StandardModalProps } from './modals/StandardModal'

// Layouts
export { SidebarTemplate } from './layouts/SidebarTemplate'
export { Header } from './layouts/Header'
export { DashboardLayout } from './layouts/DashboardLayout'