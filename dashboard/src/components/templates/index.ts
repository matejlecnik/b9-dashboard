// Template Components
export { DashboardTemplate } from './DashboardTemplate'
export type { DashboardTemplateProps } from './DashboardTemplate'

export { ReviewPageTemplate } from './ReviewPageTemplate'
export type {
  ReviewPageFilter,
  ReviewPageSortOption,
  ReviewPageBulkAction,
  ReviewPageStats
} from './ReviewPageTemplate'

export { AnalyticsPageTemplate } from './AnalyticsPageTemplate'
export type {
  AnalyticsMetric,
  AnalyticsChart,
  AnalyticsFilter
} from './AnalyticsPageTemplate'

// Template Hooks
export { useTemplateData } from './hooks/useTemplateData'
export type { UseTemplateDataOptions, UseTemplateDataReturn } from './hooks/useTemplateData'

export { useTemplateActions } from './hooks/useTemplateActions'
export type {
  UseTemplateActionsOptions,
  UseTemplateActionsReturn,
  BulkActionParams,
  SingleActionParams
} from './hooks/useTemplateActions'