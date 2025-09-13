'use client'

import React, { useState } from 'react'
import { Search, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { UNIFIED_TOOLBAR_STYLES, TOOLBAR_DIMENSIONS, B9_GRADIENTS } from '@/lib/toolbarStyles'
import { formatNumber } from '@/lib/utils'

// Unified Search Input Component
interface ToolbarSearchProps {
  id: string
  placeholder: string
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  onFocus?: () => void
  onBlur?: () => void
  className?: string
  maxWidth?: string
}

export function ToolbarSearch({ 
  id,
  placeholder,
  value,
  onChange,
  disabled = false,
  onFocus,
  onBlur,
  className = '',
  maxWidth = TOOLBAR_DIMENSIONS.searchMaxWidth
}: ToolbarSearchProps) {
  const [isFocused, setIsFocused] = useState(false)
  
  const handleFocus = () => {
    setIsFocused(true)
    onFocus?.()
  }
  
  const handleBlur = () => {
    setIsFocused(false)
    onBlur?.()
  }

  const handleClear = () => {
    onChange('')
    document.getElementById(id)?.focus()
  }

  return (
    <div className={`relative flex-1 ${maxWidth} ${className}`} role="search">
      <div 
        className={`absolute left-3 top-1/2 transform -translate-y-1/2 z-10 transition-colors duration-200 ${
          isFocused ? 'text-b9-pink' : 'text-gray-400'
        }`}
      >
        <Search className="h-5 w-5" />
      </div>
      
      <input
        id={id}
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={handleFocus}
        onBlur={handleBlur}
        disabled={disabled}
        className={`w-full pl-11 ${value ? 'pr-11' : 'pr-4'} py-3 ${TOOLBAR_DIMENSIONS.borderRadius} transition-all duration-300 text-sm focus:outline-none`}
        style={{
          ...UNIFIED_TOOLBAR_STYLES.search.base,
          ...(isFocused ? UNIFIED_TOOLBAR_STYLES.search.focused : {})
        }}
      />
      
      {value && (
        <button
          onClick={handleClear}
          className={`absolute right-3 top-1/2 transform -translate-y-1/2 z-10 p-1 rounded-full transition-all duration-200 hover:bg-gray-100/60 ${
            isFocused ? 'text-b9-pink' : 'text-gray-400'
          }`}
          aria-label="Clear search"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}

// Unified Filter Button Component
interface ToolbarFilterButtonProps {
  id: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  isActive: boolean
  count?: number | string
  onClick: () => void
  disabled?: boolean
  gradient?: keyof typeof B9_GRADIENTS
  testId?: string
}

export function ToolbarFilterButton({
  id,
  label,
  icon: Icon,
  isActive,
  count,
  onClick,
  disabled = false,
  gradient = 'primary',
  testId
}: ToolbarFilterButtonProps) {
  return (
    <Button
      id={id}
      onClick={onClick}
      disabled={disabled}
      variant="ghost"
      size="sm"
      data-testid={testId}
      aria-pressed={isActive}
      title={`Filter: ${label}${count ? ` (${count})` : ''}`}
      className={`group relative overflow-hidden transform-gpu backdrop-blur-sm transition-all duration-300 border-0 focus:outline-none focus:ring-2 focus:ring-b9-pink text-sm min-w-fit ${TOOLBAR_DIMENSIONS.buttonHeight} ${TOOLBAR_DIMENSIONS.buttonPadding} ${TOOLBAR_DIMENSIONS.borderRadius} font-semibold hover:scale-105 active:scale-95`}
      style={{
        ...UNIFIED_TOOLBAR_STYLES.filterButton.base,
        ...(isActive ? {
          background: B9_GRADIENTS[gradient],
          color: '#ffffff',
          ...UNIFIED_TOOLBAR_STYLES.filterButton.active
        } : {})
      }}
      onMouseEnter={(e) => {
        if (!isActive && !disabled) {
          Object.assign(e.currentTarget.style, UNIFIED_TOOLBAR_STYLES.filterButton.hover)
        }
      }}
      onMouseLeave={(e) => {
        if (!isActive && !disabled) {
          Object.assign(e.currentTarget.style, UNIFIED_TOOLBAR_STYLES.filterButton.base)
        }
      }}
    >
      <Icon className={`h-4 w-4 mr-2 transition-transform duration-300 group-hover:scale-110`} />
      
      <span className="relative z-10">{label}</span>
      
      {count !== undefined && (
        <ToolbarBadge 
          count={count} 
          isActive={isActive} 
          disabled={disabled}
        />
      )}
    </Button>
  )
}

// Unified Badge Component
interface ToolbarBadgeProps {
  count: number | string
  isActive?: boolean
  disabled?: boolean
  className?: string
}

export function ToolbarBadge({ 
  count, 
  isActive = false, 
  disabled = false,
  className = ''
}: ToolbarBadgeProps) {
  return (
    <Badge 
      variant="secondary" 
      className={`ml-2 border-0 text-xs font-bold px-2 py-0.5 rounded-full transition-all duration-300 group-hover:scale-105 ${className}`}
      style={{
        ...UNIFIED_TOOLBAR_STYLES.badge.base,
        ...(isActive ? UNIFIED_TOOLBAR_STYLES.badge.active : UNIFIED_TOOLBAR_STYLES.badge.inactive)
      }}
    >
      {disabled ? (
        <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
      ) : (
        typeof count === 'number' ? formatNumber(count) : count
      )}
    </Badge>
  )
}

// Unified Stats Display Component
interface ToolbarStatsProps {
  children: React.ReactNode
  className?: string
}

export function ToolbarStats({ children, className = '' }: ToolbarStatsProps) {
  return (
    <div className={`flex items-center justify-between pt-3 border-t border-gray-200/50 ${className}`}>
      {children}
    </div>
  )
}