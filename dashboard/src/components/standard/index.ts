/**
 * Standard Component Library
 * Export all standardized components from a single entry point
 */

// Layout components
export { PageContainer, SimplePageContainer, PageSection } from './PageContainer'

// Card components
export { Card, CardHeader, CardContent, CardFooter, CardTitle } from './Card'

// Data display components
export { DataCard, MetricGrid, StatCard } from './DataCard'

// Search components
export { SearchBar, SearchWithSuggestions } from './SearchBar'

// Filter components
export { FilterPills, ActiveFilters, FilterGroup } from './FilterPills'

// Empty and loading states
export {
  EmptyState,
  LoadingCard,
  LoadingTable,
  LoadingGrid,
  Spinner
} from './EmptyState'

// Table components
export { StandardTable, createReviewColumns, createPostingColumns } from './StandardTable'
export type { TableVariant, TableColumn, StandardTableProps } from './StandardTable'

// Toolbar components
export {
  StandardToolbar,
  createReviewToolbar,
  createFilterToolbar,
  createSearchToolbar
} from './StandardToolbar'
export type { ToolbarVariant, StandardToolbarProps } from './StandardToolbar'

// Placeholder component
export { StandardPlaceholder } from './StandardPlaceholder'
export type { StandardPlaceholderProps } from './StandardPlaceholder'

// Icon library
export {
  SocialIcon,
  IconWithBackground,
  InstagramIcon,
  RedditIcon
} from './IconLibrary'
export type { IconSize } from './IconLibrary'

// Modal components
export { StandardModal, ConfirmDialog, AlertDialog } from './StandardModal'
export type { StandardModalProps, ModalSize, ModalVariant } from './StandardModal'

// Toast components
export {
  ToastProvider,
  useToast,
  showToast,
  toast
} from './StandardToast'
export type { Toast, ToastType, ToastPosition } from './StandardToast'

// Error components
export {
  StandardError,
  StandardErrorBoundary,
  getErrorMessage,
  isNetworkError,
  is404Error
} from './StandardError'
export type { StandardErrorProps, ErrorVariant, ErrorSeverity } from './StandardError'

// Re-export design system and formatters for convenience
export { designSystem, getDesignClasses, commonStyles } from '@/lib/design-system'
export * from '@/lib/formatters'