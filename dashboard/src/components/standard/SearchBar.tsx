'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { designSystem } from '@/lib/design-system'
import { Search, X } from 'lucide-react'
import { useDebounce } from '@/hooks/useDebounce'

interface SearchBarProps {
  value?: string
  onChange: (value: string) => void
  placeholder?: string
  debounce?: number
  showIcon?: boolean
  showClear?: boolean
  variant?: 'default' | 'glass' | 'outline'
  size?: 'sm' | 'md' | 'lg'
  className?: string
  onFocus?: () => void
  onBlur?: () => void
  autoFocus?: boolean
  disabled?: boolean
}

export const SearchBar: React.FC<SearchBarProps> = ({
  value: externalValue = '',
  onChange,
  placeholder = 'Search...',
  debounce = 300,
  showIcon = true,
  showClear = true,
  variant = 'default',
  size = 'md',
  className,
  onFocus,
  onBlur,
  autoFocus = false,
  disabled = false
}) => {
  const [internalValue, setInternalValue] = useState(externalValue)
  const debouncedValue = useDebounce(internalValue, debounce)

  // Sync with external value changes
  useEffect(() => {
    setInternalValue(externalValue)
  }, [externalValue])

  // Call onChange with debounced value
  useEffect(() => {
    if (debouncedValue !== externalValue) {
      onChange(debouncedValue)
    }
  }, [debouncedValue, externalValue, onChange])

  const handleClear = useCallback(() => {
    setInternalValue('')
    onChange('')
  }, [onChange])

  const variants = {
    default: cn(
      'bg-white border border-gray-300',
      'focus-within:border-b9-pink focus-within:ring-2 focus-within:ring-b9-pink/20'
    ),
    glass: cn(
      designSystem.glass.light,
      'focus-within:bg-white/80 focus-within:border-b9-pink/30'
    ),
    outline: cn(
      'bg-transparent border-2 border-gray-300',
      'focus-within:border-b9-pink'
    )
  }

  const sizes = {
    sm: 'text-sm py-1.5 px-3',
    md: 'text-base py-2 px-4',
    lg: 'text-lg py-3 px-5'
  }

  const iconSizes = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6'
  }

  return (
    <div
      className={cn(
        'relative flex items-center',
        designSystem.radius.sm,
        variants[variant],
        designSystem.animation.fast,
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
    >
      {showIcon && (
        <Search className={cn(
          iconSizes[size],
          'absolute left-3 text-gray-400 pointer-events-none'
        )} />
      )}

      <input
        type="text"
        value={internalValue}
        onChange={(e) => setInternalValue(e.target.value)}
        placeholder={placeholder}
        onFocus={onFocus}
        onBlur={onBlur}
        autoFocus={autoFocus}
        disabled={disabled}
        className={cn(
          'w-full bg-transparent outline-none',
          sizes[size],
          showIcon && 'pl-10',
          showClear && internalValue && 'pr-10',
          'placeholder:text-gray-400'
        )}
      />

      {showClear && internalValue && !disabled && (
        <button
          onClick={handleClear}
          className={cn(
            'absolute right-3 text-gray-400 hover:text-gray-600',
            designSystem.animation.fast
          )}
          type="button"
        >
          <X className={iconSizes[size]} />
        </button>
      )}
    </div>
  )
}

// Search with suggestions dropdown
interface SearchWithSuggestionsProps extends SearchBarProps {
  suggestions?: string[]
  onSelectSuggestion?: (suggestion: string) => void
  showRecent?: boolean
  recentSearches?: string[]
}

export const SearchWithSuggestions: React.FC<SearchWithSuggestionsProps> = ({
  suggestions = [],
  onSelectSuggestion,
  showRecent = false,
  recentSearches = [],
  ...searchProps
}) => {
  const [showDropdown, setShowDropdown] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)

  const handleSelectSuggestion = (suggestion: string) => {
    searchProps.onChange(suggestion)
    onSelectSuggestion?.(suggestion)
    setShowDropdown(false)
  }

  const filteredSuggestions = suggestions.filter(s =>
    s.toLowerCase().includes((searchProps.value || '').toLowerCase())
  )

  const displayItems = searchProps.value
    ? filteredSuggestions
    : showRecent ? recentSearches : []

  return (
    <div className="relative">
      <SearchBar
        {...searchProps}
        onFocus={() => setShowDropdown(true)}
        onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
      />

      {showDropdown && displayItems.length > 0 && (
        <div className={cn(
          'absolute z-10 w-full mt-1',
          designSystem.card.default,
          designSystem.radius.md,
          designSystem.shadows.lg,
          'max-h-60 overflow-auto'
        )}>
          {!searchProps.value && showRecent && (
            <div className="px-3 py-2 text-xs text-gray-500 font-semibold">
              Recent Searches
            </div>
          )}
          {displayItems.map((item, index) => (
            <button
              key={item}
              onClick={() => handleSelectSuggestion(item)}
              className={cn(
                'w-full text-left px-3 py-2 hover:bg-gray-50',
                designSystem.animation.fast,
                selectedIndex === index && 'bg-gray-50'
              )}
            >
              {item}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}