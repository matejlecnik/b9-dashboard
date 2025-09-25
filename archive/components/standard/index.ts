/**
 * Standard Component Library (Optimized)
 * Only exports components that are actually used
 */

// Layout components - KEEP (used in some places)
export { PageContainer, SimplePageContainer, PageSection } from './PageContainer'


// Re-export design system and formatters for convenience
export { designSystem, getDesignClasses, commonStyles } from '@/lib/design-system'
export * from '@/lib/formatters'