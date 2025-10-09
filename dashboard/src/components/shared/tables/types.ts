import { type ActionButton } from './fields/ActionsField'
import { type BadgeVariant } from './fields/BadgeField'

// Base column alignment and sizing
export type ColumnAlign = 'left' | 'center' | 'right'
export type ColumnWidth = string | number // e.g., 'w-48', '200px', 200

// Field type definitions
export type FieldType =
  | 'text'
  | 'number'
  | 'percentage'
  | 'badge'
  | 'tags'
  | 'avatar'
  | 'actions'
  | 'custom'

// Configuration for each field type
export interface TextFieldConfig {
  type: 'text'
  truncate?: boolean
  maxLength?: number
  placeholder?: string
  bold?: boolean
  color?: 'primary' | 'secondary' | 'tertiary' | 'subtle'
  dangerouslySetHTML?: boolean
}

export interface NumberFieldConfig {
  type: 'number'
  format?: 'number' | 'compact' | 'abbreviated'
  decimals?: number
  placeholder?: string
  color?: 'primary' | 'secondary' | 'tertiary' | 'subtle'
  bold?: boolean
}

export interface PercentageFieldConfig {
  type: 'percentage'
  decimals?: number
  placeholder?: string
  bold?: boolean
  colorThresholds?: Array<{ min: number; color: string }>
  showSign?: boolean
  showPercentSymbol?: boolean
}

export interface BadgeFieldConfig {
  type: 'badge'
  variantMap?: Record<string, BadgeVariant>
  classNameMap?: Record<string, string>
  defaultVariant?: BadgeVariant
  defaultClassName?: string
}

export interface TagsFieldConfig {
  type: 'tags'
  maxVisible?: number
  showCount?: boolean
  extractCategories?: boolean
  variant?: 'default' | 'secondary' | 'outline'
  size?: 'sm' | 'md'
}

export interface AvatarFieldConfig {
  type: 'avatar'
  fallback?: React.ReactNode
  size?: 'sm' | 'md' | 'lg'
  showBorder?: boolean
}

export interface ActionsFieldConfig {
  type: 'actions'
  size?: 'sm' | 'default'
  getActions: (item: any) => ActionButton[]
}

export interface CustomFieldConfig {
  type: 'custom'
  render: (item: any) => React.ReactNode
}

export type FieldConfig =
  | TextFieldConfig
  | NumberFieldConfig
  | PercentageFieldConfig
  | BadgeFieldConfig
  | TagsFieldConfig
  | AvatarFieldConfig
  | ActionsFieldConfig
  | CustomFieldConfig

// Column definition with generics
export interface ColumnDefinition<T = any> {
  id: string
  header: string
  accessor: keyof T | ((item: T) => any)
  field: FieldConfig
  width?: ColumnWidth
  align?: ColumnAlign
  sortable?: boolean
  hidden?: boolean
  className?: string
  headerClassName?: string
}

// Table configuration
export interface TableConfig<T = any> {
  columns: ColumnDefinition<T>[]
  showCheckbox?: boolean
  rowClassName?: string | ((item: T) => string)
  onRowClick?: (item: T) => void
  emptyState?: {
    icon?: React.ReactNode
    title: string
    description?: string
  }
}

// Helper function to get value from accessor
export function getColumnValue<T>(item: T, accessor: keyof T | ((item: T) => any)): any {
  if (typeof accessor === 'function') {
    return accessor(item)
  }
  return item[accessor]
}
