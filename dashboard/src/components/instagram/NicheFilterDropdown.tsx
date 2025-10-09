'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Filter, ChevronDown, Check } from 'lucide-react'
import { formatNumber } from '@/lib/formatters'
import { cn } from '@/lib/utils'
import { designSystem } from '@/lib/design-system'
import { createPortal } from 'react-dom'

interface NicheFilterDropdownProps {
  availableNiches: string[]
  selectedNiches: string[]
  onNichesChange: (niches: string[]) => void
  loading?: boolean
  unnichedCount?: number
  nichedCount?: number
  nicheCounts?: Record<string, number>
}

export function NicheFilterDropdown({
  availableNiches,
  selectedNiches,
  onNichesChange,
  loading = false,
  unnichedCount = 0,
  nichedCount = 0,
  nicheCounts = {}
}: NicheFilterDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 })
  const buttonRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        buttonRef.current && !buttonRef.current.contains(event.target as Node) &&
        dropdownRef.current && !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      setDropdownPosition({
        top: rect.bottom + window.scrollY + 4,
        left: rect.right - 256 + window.scrollX // 256px is the dropdown width
      })
    }
  }, [isOpen])

  const handleToggleNiche = (niche: string) => {
    if (selectedNiches.includes(niche)) {
      onNichesChange(selectedNiches.filter(n => n !== niche))
    } else {
      onNichesChange([...selectedNiches, niche])
    }
  }

  const handleSelectAll = () => {
    onNichesChange(availableNiches)
  }

  const handleClearAll = () => {
    onNichesChange([])
  }

  const isShowingUnniched = selectedNiches.length === 0
  const displayText = isShowingUnniched
    ? `Un-niched (${formatNumber(unnichedCount)})`
    : selectedNiches.length === availableNiches.length
    ? `All Niches (${formatNumber(nichedCount)})`
    : selectedNiches.length === 1
    ? selectedNiches[0]
    : `${selectedNiches.length} niches`

  return (
    <>
      <Button
        ref={buttonRef}
        variant="outline"
        onClick={() => setIsOpen(!isOpen)}
        disabled={loading}
        className={cn("h-8 px-3 text-xs font-medium border-default flex items-center gap-2", designSystem.background.hover.subtle)}
      >
        <Filter className="h-3.5 w-3.5" />
        <span>{displayText}</span>
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </Button>

      {isOpen && typeof document !== 'undefined' && createPortal(
        <div
          ref={dropdownRef}
          className={`fixed w-64 bg-white ${designSystem.borders.radius.sm} shadow-lg border border-default z-[9999]`}
          style={{
            top: `${dropdownPosition.top}px`,
            left: `${dropdownPosition.left}px`
          }}
        >
          <div className="p-2 border-b border-light">
            <div className="flex items-center justify-between mb-2">
              <span className={cn("text-xs font-semibold", designSystem.typography.color.secondary)}>Filter Niches</span>
              <div className="flex gap-1">
                <button
                  onClick={handleSelectAll}
                  className="text-xs text-primary hover:text-primary-hover font-medium px-2 py-0.5 hover:bg-primary/10 rounded"
                >
                  Select All
                </button>
                <button
                  onClick={handleClearAll}
                  className={cn("text-xs font-medium px-2 py-0.5 rounded", designSystem.background.hover.subtle, designSystem.typography.color.tertiary, `hover:${designSystem.typography.color.secondary}`)}
                >
                  Clear
                </button>
              </div>
            </div>

            {/* Show un-niched option */}
            <label className={cn("flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer", designSystem.background.hover.subtle)}>
              <div className="relative flex items-center justify-center w-4 h-4">
                <input
                  type="checkbox"
                  checked={isShowingUnniched}
                  onChange={() => handleClearAll()}
                  className="sr-only"
                />
                <div className={`w-4 h-4 rounded border ${
                  isShowingUnniched
                    ? 'bg-primary border-primary'
                    : 'bg-white border-strong'
                }`}>
                  {isShowingUnniched && (
                    <Check className="h-3 w-3 text-white absolute top-0.5 left-0.5" />
                  )}
                </div>
              </div>
              <span className={cn("text-xs flex-1", designSystem.typography.color.secondary)}>
                Show Un-niched
              </span>
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                {unnichedCount}
              </Badge>
            </label>
          </div>

          {/* Available niches */}
          <div className="max-h-64 overflow-y-auto p-2">
            {availableNiches.map((niche) => {
              const isSelected = selectedNiches.includes(niche)
              const count = nicheCounts[niche] || 0

              return (
                <label
                  key={niche}
                  className={cn("flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer", designSystem.background.hover.subtle)}
                >
                  <div className="relative flex items-center justify-center w-4 h-4">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleToggleNiche(niche)}
                      className="sr-only"
                    />
                    <div className={`w-4 h-4 rounded border ${
                      isSelected
                        ? 'bg-primary border-primary'
                        : 'bg-white border-strong'
                    }`}>
                      {isSelected && (
                        <Check className="h-3 w-3 text-white absolute top-0.5 left-0.5" />
                      )}
                    </div>
                  </div>
                  <span className={cn("text-xs flex-1 truncate", designSystem.typography.color.secondary)}>
                    {niche}
                  </span>
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                    {count}
                  </Badge>
                </label>
              )
            })}
          </div>

          {/* Total count */}
          <div className="p-2 border-t border-light">
            <div className={cn("text-xs text-center", designSystem.typography.color.subtle)}>
              Total: {formatNumber(nichedCount + unnichedCount)} creators
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}