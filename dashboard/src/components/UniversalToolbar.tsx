'use client'

import React, { memo, useCallback, useEffect, useState, ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Check, 
  Ban, 
  Slash, 
  X, 
  CheckSquare, 
  Square, 
  Download, 
  Heart, 
  Users, 
  Search,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { UNIFIED_TOOLBAR_STYLES, TOOLBAR_DIMENSIONS } from '@/lib/toolbarStyles'
// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

type ToolbarVariant = 'bulk-actions' | 'user-bulk-actions' | 'posting' | 'post-analysis' | 'slim-post' | 'unified' | 'glass'

interface BaseAction {
  id: string
  label: string
  icon?: React.ComponentType<{ className?: string }>
  onClick: () => void
  disabled?: boolean
  variant?: 'default' | 'secondary' | 'outline' | 'ghost' | 'destructive'
  className?: string
  title?: string
  shortcut?: string
}

interface FilterAction extends BaseAction {
  isActive?: boolean
  count?: number | string
  activeBg?: string
  activeTextColor?: string
}

interface SearchConfig {
  id: string
  placeholder: string
  value: string
  onChange: (value: string) => void
  onFocus?: () => void
  onBlur?: () => void
  disabled?: boolean
  maxWidth?: string
}

interface SortConfig {
  sortBy: string
  sortDirection: 'asc' | 'desc'
  onSortChange: (field: string, direction: 'asc' | 'desc') => void
  options: Array<{
    id: string
    label: string
  }>
  loading?: boolean
}

interface StatsConfig {
  totalResults?: number
  filteredResults?: number
  selectedCount?: number
  loading?: boolean
  customStats?: ReactNode
}

interface KeyboardShortcuts {
  enabled?: boolean
  shortcuts?: Array<{
    key: string
    action: () => void
    description?: string
    modifier?: 'ctrl' | 'cmd' | 'shift' | 'alt'
  }>
}

// ============================================================================
// MAIN INTERFACE
// ============================================================================

interface UniversalToolbarProps {
  // Core configuration
  variant: ToolbarVariant
  className?: string
  testId?: string
  animate?: boolean
  
  // Content sections
  search?: SearchConfig
  filters?: FilterAction[]
  actions?: BaseAction[]
  sort?: SortConfig
  stats?: StatsConfig
  customContent?: ReactNode
  
  // Bulk actions specific
  selectedCount?: number
  onClearSelection?: () => void
  onUndoLastAction?: () => void
  
  // User bulk actions specific
  totalCount?: number
  onSelectAll?: () => void
  onSelectNone?: () => void
  
  // Layout options
  layout?: 'horizontal' | 'vertical' | 'responsive'
  position?: 'top' | 'bottom' | 'fixed-bottom'
  showResultsSummary?: boolean
  
  // Behavior
  hideWhenEmpty?: boolean
  collapsible?: boolean
  defaultCollapsed?: boolean
  
  // Keyboard shortcuts (DISABLED per user request)
  keyboard?: KeyboardShortcuts
  
  // Loading state
  loading?: boolean
  disabled?: boolean
  
  // Styling
  intensity?: 'light' | 'medium' | 'heavy'
  shadow?: 'sm' | 'md' | 'lg' | 'xl'
}

// ============================================================================
// COMPONENT IMPLEMENTATION
// ============================================================================

export const UniversalToolbar = memo(function UniversalToolbar({
  variant,
  className = '',
  testId,
  
  // Content
  search,
  filters = [],
  actions = [],
  stats,
  customContent,
  
  // Bulk actions
  selectedCount = 0,
  onClearSelection,
  onUndoLastAction,
  
  // User bulk actions
  totalCount = 0,
  onSelectAll,
  onSelectNone,
  
  // Layout
  layout = 'responsive',
  showResultsSummary = false,
  
  // Behavior
  hideWhenEmpty = false,
  collapsible = false,
  defaultCollapsed = false,
  
  // Keyboard
  keyboard = { enabled: false },
  
  // State
  loading = false,
  disabled = false,
  
  // Styling
  intensity = 'medium',
  shadow = 'lg'
}: UniversalToolbarProps) {
  
  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================
  
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed)
  const [isSearchFocused, setIsSearchFocused] = useState(false)
  const [isVisible, setIsVisible] = useState(true)
  
  // ============================================================================
  // KEYBOARD SHORTCUTS
  // ============================================================================
  
  useEffect(() => {
    if (!keyboard.enabled) return
    
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't interfere with input fields
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return
      }
      
      // Search shortcut
      if (search && e.key === '/' && !isSearchFocused) {
        e.preventDefault()
        document.getElementById(search.id)?.focus()
        return
      }
      
      // Escape to clear search
      if (search && e.key === 'Escape' && isSearchFocused) {
        search.onChange('')
        document.getElementById(search.id)?.blur()
        return
      }
      
      // Clear selection
      if (e.key === 'Escape' && selectedCount > 0 && onClearSelection) {
        onClearSelection()
        return
      }
      
      // Custom shortcuts
      keyboard.shortcuts?.forEach(shortcut => {
        const modifierPressed = !shortcut.modifier || 
          (shortcut.modifier === 'ctrl' && e.ctrlKey) ||
          (shortcut.modifier === 'cmd' && e.metaKey) ||
          (shortcut.modifier === 'shift' && e.shiftKey) ||
          (shortcut.modifier === 'alt' && e.altKey)
          
        if (e.key === shortcut.key && modifierPressed) {
          e.preventDefault()
          shortcut.action()
        }
      })
    }
    
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [keyboard, search, isSearchFocused, selectedCount, onClearSelection])
  
  // ============================================================================
  // VISIBILITY LOGIC
  // ============================================================================
  
  useEffect(() => {
    if (variant === 'user-bulk-actions') {
      setIsVisible(selectedCount > 0)
    } else if (hideWhenEmpty) {
      const hasContent = filters.length > 0 || actions.length > 0 || !!search || !!customContent
      setIsVisible(hasContent)
    }
  }, [variant, selectedCount, hideWhenEmpty, filters.length, actions.length, search, customContent])
  
  // ============================================================================
  // RENDER HELPERS
  // ============================================================================
  
  const renderSearch = useCallback(() => {
    if (!search) return null
    
    return (
      <div className={cn("relative flex-1", search.maxWidth)} role="search">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          id={search.id}
          type="text"
          placeholder={search.placeholder}
          value={search.value}
          onChange={(e) => search.onChange(e.target.value)}
          onFocus={() => {
            setIsSearchFocused(true)
            search.onFocus?.()
          }}
          onBlur={() => {
            setIsSearchFocused(false)
            search.onBlur?.()
          }}
          disabled={search.disabled || loading || disabled}
          className="w-full pl-10 pr-10 py-2 border border-gray-200 rounded-lg bg-white/90 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all duration-200"
        />
        {search.value && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => search.onChange('')}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0 hover:bg-gray-100"
            aria-label="Clear search"
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>
    )
  }, [search, loading, disabled])
  
  const renderFilters = useCallback(() => {
    if (filters.length === 0) return null
    
    return (
      <div className="flex items-center gap-2 flex-wrap" role="group" aria-label="Filters">
        {filters.map((filter) => (
          <Button
            key={filter.id}
            variant="ghost"
            onClick={filter.onClick}
            disabled={filter.disabled || loading || disabled}
            className={cn(
              "px-3 py-2 h-auto rounded-lg font-medium transition-all duration-200 border-0 focus:outline-none focus:ring-2 focus:ring-pink-500 text-sm",
              filter.className
            )}
            style={filter.isActive ? {
              background: filter.activeBg || 'linear-gradient(135deg, #FF8395, #FF6B80)',
              color: filter.activeTextColor || '#ffffff',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              boxShadow: '0 2px 8px rgba(255, 131, 149, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
            } : {
              background: 'rgba(255, 255, 255, 0.8)',
              color: '#374151',
              border: '1px solid rgba(0, 0, 0, 0.08)',
              boxShadow: '0 1px 4px rgba(0, 0, 0, 0.02)'
            }}
            aria-pressed={filter.isActive}
            title={filter.title || `Filter: ${filter.label}${filter.count ? ` (${filter.count})` : ''}`}
          >
            {filter.icon && <filter.icon className="h-4 w-4 mr-2" />}
            <span className="relative z-10">{filter.label}</span>
            {filter.count !== undefined && (
              <Badge 
                variant="secondary"
                className="ml-2 border-0 text-xs font-medium"
                style={{
                  background: filter.isActive 
                    ? 'rgba(255, 255, 255, 0.2)' 
                    : 'rgba(0, 0, 0, 0.06)',
                  color: filter.isActive ? 'white' : 'rgba(0, 0, 0, 0.75)'
                }}
              >
                {loading ? '...' : filter.count}
              </Badge>
            )}
          </Button>
        ))}
      </div>
    )
  }, [filters, loading, disabled])
  
  const renderActions = useCallback(() => {
    if (actions.length === 0) return null
    
    return (
      <div className="flex items-center gap-2 flex-wrap">
        {actions.map((action) => (
          <Button
            key={action.id}
            variant={action.variant || 'default'}
            size="sm"
            onClick={action.onClick}
            disabled={action.disabled || loading || disabled}
            className={cn("h-8", action.className)}
            title={action.title || action.label}
          >
            {action.icon && <action.icon className="h-3 w-3 mr-1" />}
            {action.label}
            {action.shortcut && (
              <span className="ml-2 text-xs opacity-70">
                {action.shortcut}
              </span>
            )}
          </Button>
        ))}
      </div>
    )
  }, [actions, loading, disabled])
  
  const renderBulkActions = useCallback(() => {
    if (variant !== 'bulk-actions') return null
    
    return (
      <div className="space-y-3">
        {/* Search Section - Always visible */}
        {search && (
          <div className="w-full">
            {renderSearch()}
          </div>
        )}
        
        {/* Bulk Actions Bar - Only visible when items are selected */}
        {selectedCount > 0 && (
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <Badge className="bg-pink-100 text-pink-700 border-pink-300">
                {selectedCount.toLocaleString('en-US')} selected
              </Badge>
              {onUndoLastAction && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={onUndoLastAction}
                  disabled={disabled}
                  className="h-8 px-2 text-xs"
                  title="Undo last action"
                >
                  Undo
                </Button>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              {renderActions()}
              {onClearSelection && (
                <Button 
                  size="sm" 
                  variant="ghost"
                  onClick={onClearSelection}
                  disabled={disabled}
                  className="h-8 px-2"
                  title="Clear selection"
                  aria-label="Clear selection"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    )
  }, [variant, selectedCount, onUndoLastAction, onClearSelection, disabled, renderActions, search, renderSearch])
  
  const renderUserBulkActions = useCallback(() => {
    if (variant !== 'user-bulk-actions' || selectedCount === 0) return null
    
    return (
      <div className="flex items-center gap-2 px-3 sm:px-4 py-3 rounded-xl shadow-lg border-0"
        style={{
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          boxShadow: `
            0 8px 32px rgba(0, 0, 0, 0.15),
            0 4px 16px rgba(0, 0, 0, 0.1),
            inset 0 1px 0 rgba(255, 255, 255, 0.2)
          `,
          border: '1px solid rgba(255, 255, 255, 0.3)',
        }}
      >
        {/* Selection Info */}
        <div className="flex items-center gap-2">
          <Badge 
            variant="secondary" 
            className="bg-pink-100 text-pink-700 border-pink-300 font-semibold"
          >
            <Users className="h-3 w-3 mr-1" />
            {selectedCount} selected
          </Badge>
          
          {/* Selection Controls */}
          <div className="flex items-center gap-1">
            {onSelectAll && onSelectNone && (
              <>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={selectedCount === totalCount ? onSelectNone : onSelectAll}
                  className="px-2 py-1 h-8 text-xs hover:bg-gray-100"
                  title={selectedCount === totalCount ? "Deselect all" : "Select all visible"}
                >
                  {selectedCount === totalCount ? (
                    <CheckSquare className="h-3 w-3" />
                  ) : (
                    <Square className="h-3 w-3" />
                  )}
                </Button>
                
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={onSelectNone}
                  className="px-2 py-1 h-8 text-xs hover:bg-gray-100"
                  title="Clear selection (Esc)"
                >
                  <X className="h-3 w-3" />
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Divider */}
        <div className="h-6 w-px bg-gray-300"></div>

        {/* Bulk Actions */}
        <div className="flex items-center gap-1">
          {renderActions()}
        </div>

        {/* Keyboard Hints */}
        <div className="hidden md:flex items-center text-xs text-gray-500 ml-2">
          <span>Ctrl/Cmd+1/2 for quick actions • ESC to clear</span>
        </div>
      </div>
    )
  }, [variant, selectedCount, totalCount, onSelectAll, onSelectNone, renderActions])
  
  const renderStats = useCallback(() => {
    if (!stats && !showResultsSummary) return null
    
    return (
      <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-200/50">
        {stats?.customStats || (
          <div className="text-sm text-gray-600">
            {stats?.filteredResults !== undefined && (
              <>
                Showing <span className="font-semibold text-pink-600">
                  {loading ? '...' : stats.filteredResults.toLocaleString('en-US')}
                </span>
                {stats.totalResults !== undefined && stats.filteredResults !== stats.totalResults && (
                  <> of <span className="font-semibold text-gray-900">
                    {stats.totalResults.toLocaleString('en-US')}
                  </span></>
                )} results
              </>
            )}
          </div>
        )}
      </div>
    )
  }, [stats, showResultsSummary, loading])
  
  // ============================================================================
  // STYLE VARIANTS
  // ============================================================================
  
  const getVariantStyles = useCallback(() => {
    switch (variant) {
      case 'bulk-actions':
        return {
          container: "sticky top-[72px] z-30 mb-2 rounded-xl border border-pink-200 bg-white/90 backdrop-blur-md shadow-sm px-3 py-2",
          role: "region",
          ariaLabel: "Bulk actions toolbar"
        }
      
      case 'user-bulk-actions':
        return {
          container: `fixed bottom-4 sm:bottom-6 left-1/2 transform -translate-x-1/2 z-50 transition-all duration-300 ${
            isVisible ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'
          }`,
          role: "region",
          ariaLabel: "User bulk actions toolbar"
        }
      
      case 'glass':
        const intensityStyles = {
          light: 'bg-white/60',
          medium: 'bg-white/80', 
          heavy: 'bg-white/90'
        }
        const shadowClasses = {
          sm: 'shadow-sm',
          md: 'shadow-md',
          lg: 'shadow-lg',
          xl: 'shadow-xl'
        }
        return {
          container: cn(
            'relative p-4 rounded-2xl border border-gray-200',
            intensityStyles[intensity],
            shadowClasses[shadow]
          ),
          role: "region",
          ariaLabel: "Toolbar"
        }
      
      case 'posting':
      case 'post-analysis':
      case 'slim-post':
      default:
        return {
          container: `mb-4 ${TOOLBAR_DIMENSIONS.padding} ${TOOLBAR_DIMENSIONS.borderRadius}`,
          style: UNIFIED_TOOLBAR_STYLES.container,
          role: "region",
          ariaLabel: "Toolbar"
        }
    }
  }, [variant, intensity, shadow, isVisible])
  
  // ============================================================================
  // RENDER MAIN COMPONENT
  // ============================================================================
  
  if (!isVisible) return null
  
  const variantStyles = getVariantStyles()
  
  return (
    <div 
      className={cn(variantStyles.container, className)}
      style={variantStyles.style}
      role={variantStyles.role}
      aria-label={variantStyles.ariaLabel}
      data-testid={testId}
    >
      {/* Collapsible Header */}
      {collapsible && (
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-gray-700">Filters</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="h-6 w-6 p-0"
          >
            {isCollapsed ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronUp className="h-4 w-4" />
            )}
          </Button>
        </div>
      )}
      
      {/* Main Content */}
      {(!collapsible || !isCollapsed) && (
        <>
          {/* Bulk Actions Layout */}
          {variant === 'bulk-actions' && renderBulkActions()}
          
          {/* User Bulk Actions Layout */}
          {variant === 'user-bulk-actions' && renderUserBulkActions()}
          
          {/* Standard Layout */}
          {!['bulk-actions', 'user-bulk-actions'].includes(variant) && (
            <div className={cn(
              "flex gap-3",
              layout === 'vertical' ? 'flex-col' : 
              layout === 'horizontal' ? 'flex-row items-center' :
              'flex-col lg:flex-row lg:items-center'
            )}>
              {/* Search Section */}
              {search && (
                <div className={cn(
                  layout === 'responsive' ? 'lg:flex-1' : 'flex-1'
                )}>
                  {renderSearch()}
                </div>
              )}
              
              {/* Filters and Actions Section */}
              <div className={cn(
                "flex gap-3 flex-wrap",
                layout === 'responsive' ? 'lg:justify-end' : 'justify-end'
              )}>
                {renderFilters()}
                {renderActions()}
              </div>
            </div>
          )}
          
          {/* Custom Content */}
          {customContent}
          
          {/* Stats Section */}
          {renderStats()}
        </>
      )}
    </div>
  )
})

// ============================================================================
// PRESET CONFIGURATIONS
// ============================================================================

// Preset factory functions for common use cases
export const createBulkActionsToolbar = (props: {
  selectedCount: number
  onBulkOk: () => void
  onBulkNoSeller: () => void
  onBulkNonRelated: () => void
  onClearSelection: () => void
  onUndoLastAction?: () => void
  disabled?: boolean
  className?: string
}) => ({
  variant: 'bulk-actions' as const,
  selectedCount: props.selectedCount,
  onClearSelection: props.onClearSelection,
  onUndoLastAction: props.onUndoLastAction,
  disabled: props.disabled,
  className: props.className,
  actions: [
    {
      id: 'ok',
      label: 'Ok',
      icon: Check,
      onClick: props.onBulkOk,
      variant: 'default' as const,
      className: 'bg-pink-500 hover:bg-pink-600',
      title: 'Mark selected as Ok'
    },
    {
      id: 'no-seller',
      label: 'No Seller',
      icon: Ban,
      onClick: props.onBulkNoSeller,
      variant: 'secondary' as const,
      title: 'Mark selected as No Seller'
    },
    {
      id: 'non-related',
      label: 'Non Related',
      icon: Slash,
      onClick: props.onBulkNonRelated,
      variant: 'outline' as const,
      title: 'Mark selected as Non Related'
    }
  ]
})

export const createUserBulkActionsToolbar = (props: {
  selectedCount: number
  totalCount: number
  onSelectAll: () => void
  onSelectNone: () => void
  onBulkToggleCreator?: () => void
  onBulkExport?: () => void
  onBulkDelete?: () => void
}) => ({
  variant: 'user-bulk-actions' as const,
  selectedCount: props.selectedCount,
  totalCount: props.totalCount,
  onSelectAll: props.onSelectAll,
  onSelectNone: props.onSelectNone,
  position: 'fixed-bottom' as const,
  actions: [
    props.onBulkToggleCreator && {
      id: 'toggle-creator',
      label: 'Toggle Creator',
      icon: Heart,
      onClick: props.onBulkToggleCreator,
      className: 'bg-pink-500 hover:bg-pink-600 text-white',
      title: 'Toggle creator status (Ctrl/Cmd+1)',
      shortcut: 'Ctrl+1'
    },
    props.onBulkExport && {
      id: 'export',
      label: 'Export CSV',
      icon: Download,
      onClick: props.onBulkExport,
      className: 'bg-pink-500 hover:bg-pink-600 text-white',
      title: 'Export selected users (Ctrl/Cmd+2)',
      shortcut: 'Ctrl+2'
    },
    props.onBulkDelete && {
      id: 'delete',
      label: 'Remove',
      icon: X,
      onClick: props.onBulkDelete,
      variant: 'destructive' as const,
      title: 'Remove selected users'
    }
  ].filter(Boolean) as BaseAction[]
})
