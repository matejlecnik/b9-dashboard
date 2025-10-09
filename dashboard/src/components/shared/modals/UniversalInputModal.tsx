'use client'

import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import { X, type LucideIcon } from 'lucide-react'
import { designSystem } from '@/lib/design-system'
import { cn } from '@/lib/utils'

interface UniversalInputModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (value: string) => void
  title: string
  subtitle?: string
  placeholder?: string
  defaultValue?: string
  suggestions?: string[] // For autocomplete (e.g., available tags)
  icon?: LucideIcon
  platform?: 'reddit' | 'instagram' | 'default'
  multiline?: boolean
}

/**
 * UniversalInputModal - Mac-style input dialog
 *
 * Replaces native prompt() with proper Mac-style modal
 * Features:
 * - Tag autocomplete
 * - Comma-separated input support
 * - Mac glassmorphism
 * - Platform theming
 * - Keyboard shortcuts (Enter to submit, Esc to cancel)
 */
export function UniversalInputModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  subtitle,
  placeholder = '',
  defaultValue = '',
  suggestions = [],
  icon: Icon,
  platform: _platform = 'default',
  multiline = false
}: UniversalInputModalProps) {
  const [value, setValue] = useState(defaultValue)
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null)

  // Reset value when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setValue(defaultValue)
      // Focus input when modal opens
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isOpen, defaultValue])

  // Filter suggestions based on current input (memoized to prevent infinite loops)
  const filteredSuggestions = useMemo(() => {
    if (!value.trim() || suggestions.length === 0) {
      return []
    }

    // Get the last comma-separated value for autocomplete
    const values = value.split(',').map(v => v.trim())
    const lastValue = values[values.length - 1].toLowerCase()

    if (!lastValue) {
      return []
    }

    return suggestions
      .filter(s => s.toLowerCase().includes(lastValue))
      .filter(s => !values.slice(0, -1).includes(s)) // Exclude already added tags
      .slice(0, 5) // Limit to 5 suggestions
  }, [value, suggestions])

  const showSuggestions = filteredSuggestions.length > 0

  // Handle suggestion selection
  const handleSelectSuggestion = useCallback((suggestion: string) => {
    const values = value.split(',').map(v => v.trim())
    values[values.length - 1] = suggestion
    setValue(values.join(', ') + ', ')
    inputRef.current?.focus()
  }, [value])

  // Handle submit
  const handleSubmit = useCallback(() => {
    const trimmedValue = value.trim()
    if (trimmedValue) {
      onConfirm(trimmedValue)
      setValue('')
    }
  }, [value, onConfirm])

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    } else if (e.key === 'Escape') {
      onClose()
    }
  }, [handleSubmit, onClose])

  // Always use pink icon color (standardized to gray/pink design system)
  const iconColor = 'text-pink-600'

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-gray-900/20 backdrop-blur-md z-50 transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className={`relative w-full max-w-md ${designSystem.borders.radius.xl}`}
          style={{
            background: 'linear-gradient(180deg, var(--gray-200-alpha-85) 0%, var(--gray-300-alpha-80) 100%)',
            backdropFilter: 'blur(20px) saturate(140%)',
            WebkitBackdropFilter: 'blur(20px) saturate(140%)',
            border: '1px solid var(--slate-400-alpha-60)',
            boxShadow: '0 20px 50px var(--black-alpha-12), 0 1px 0 var(--white-alpha-60) inset, 0 -1px 0 var(--black-alpha-02) inset'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="relative px-5 py-3 border-b border-default">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                {Icon && (
                  <div
                    className="p-2 rounded-lg"
                    style={{
                      background: 'linear-gradient(135deg, var(--pink-alpha-50) 0%, var(--pink-alpha-40) 100%)',
                      backdropFilter: 'blur(20px) saturate(180%)',
                      WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                      border: '1px solid var(--pink-600)',
                      boxShadow: '0 8px 32px var(--pink-alpha-40)'
                    }}
                  >
                    <Icon className={cn("h-4 w-4", iconColor)} />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h2 className={cn(
                    "text-sm font-semibold font-mac-display break-words",
                    designSystem.typography.color.primary
                  )}>
                    {title}
                  </h2>
                  {subtitle && (
                    <p className={cn("text-[10px] font-mac-text break-words", designSystem.typography.color.subtle)}>
                      {subtitle}
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={onClose}
                className={cn(
                  `p-1 ${designSystem.borders.radius.sm}`,
                  "hover:bg-gray-200/50 transition-colors"
                )}
              >
                <X className="h-3.5 w-3.5 text-gray-500 hover:text-gray-700" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="px-5 py-4">
            <div className="space-y-3">
              {/* Input field */}
              <div className="relative">
                {multiline ? (
                  <textarea
                    ref={inputRef as React.RefObject<HTMLTextAreaElement>}
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholder}
                    className={cn(
                      "w-full min-h-[80px] px-3 py-2 text-sm font-mac-text resize-none",
                      "rounded-lg bg-white/40 backdrop-blur-sm",
                      "border border-gray-200/60",
                      "focus:border-gray-400/50 focus:ring-4 focus:ring-gray-400/20",
                      "shadow-[inset_0_1px_2px_var(--black-alpha-05)]",
                      "hover:border-gray-300/60",
                      "transition-all duration-200",
                      "outline-none focus:outline-none focus-visible:outline-none active:outline-none",
                      designSystem.typography.color.primary
                    )}
                  />
                ) : (
                  <input
                    ref={inputRef as React.RefObject<HTMLInputElement>}
                    type="text"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholder}
                    className={cn(
                      "w-full h-9 px-3 text-sm font-mac-text",
                      "rounded-lg bg-white/40 backdrop-blur-sm",
                      "border border-gray-200/60",
                      "focus:border-gray-400/50 focus:ring-4 focus:ring-gray-400/20",
                      "shadow-[inset_0_1px_2px_var(--black-alpha-05)]",
                      "hover:border-gray-300/60",
                      "transition-all duration-200",
                      "outline-none focus:outline-none focus-visible:outline-none active:outline-none",
                      designSystem.typography.color.primary
                    )}
                  />
                )}

                {/* Autocomplete suggestions */}
                {showSuggestions && filteredSuggestions.length > 0 && (
                  <div className={cn(
                    "absolute top-full left-0 right-0 mt-1 z-10",
                    "rounded-lg bg-white/95 backdrop-blur-sm",
                    "border border-gray-200/60 shadow-lg",
                    "overflow-hidden"
                  )}>
                    {filteredSuggestions.map((suggestion, index) => (
                      <button
                        key={index}
                        onClick={() => handleSelectSuggestion(suggestion)}
                        className={cn(
                          "w-full px-3 py-2 text-left text-sm font-mac-text",
                          "hover:bg-gray-100/80 transition-colors",
                          designSystem.typography.color.primary
                        )}
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Help text */}
              {suggestions.length > 0 && (
                <p className={cn("text-[10px] font-mac-text", designSystem.typography.color.subtle)}>
                  Start typing to see suggestions. Separate multiple values with commas.
                </p>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="px-5 py-3 border-t border-default">
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={onClose}
                className={cn(
                  "text-xs h-8 px-4 font-mac-text rounded-lg",
                  "bg-white/60 backdrop-blur-sm",
                  "border border-gray-200/60",
                  "hover:bg-white/80 hover:border-gray-300/60",
                  "shadow-sm hover:shadow",
                  "transition-all duration-200"
                )}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={!value.trim()}
                className={cn(
                  "text-xs h-8 px-4 font-mac-text font-medium rounded-lg",
                  "transition-all duration-200",
                  "disabled:opacity-40 disabled:cursor-not-allowed"
                )}
                style={{
                  background: 'linear-gradient(135deg, var(--pink-alpha-50) 0%, var(--pink-alpha-40) 100%)',
                  backdropFilter: 'blur(20px) saturate(180%)',
                  WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                  border: '1px solid var(--pink-600)',
                  boxShadow: '0 8px 32px var(--pink-alpha-40)',
                  color: 'var(--pink-600)'
                }}
                onMouseEnter={(e) => {
                  if (value.trim()) {
                    e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255, 131, 149, 0.7) 0%, var(--pink-alpha-50) 100%)'
                    e.currentTarget.style.boxShadow = '0 12px 40px var(--pink-alpha-50)'
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'linear-gradient(135deg, var(--pink-alpha-50) 0%, var(--pink-alpha-40) 100%)'
                  e.currentTarget.style.boxShadow = '0 8px 32px var(--pink-alpha-40)'
                }}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
