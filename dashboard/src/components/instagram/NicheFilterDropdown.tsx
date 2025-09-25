'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Filter, ChevronDown, Check } from 'lucide-react'
import { formatNumber } from '@/lib/utils'
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
        className="h-8 px-3 text-xs font-medium border-gray-200 hover:bg-gray-50 flex items-center gap-2"
      >
        <Filter className="h-3.5 w-3.5" />
        <span>{displayText}</span>
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </Button>

      {isOpen && typeof document !== 'undefined' && createPortal(
        <div
          ref={dropdownRef}
          className="fixed w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-[9999]"
          style={{
            top: `${dropdownPosition.top}px`,
            left: `${dropdownPosition.left}px`
          }}
        >
          <div className="p-2 border-b border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-gray-700">Filter Niches</span>
              <div className="flex gap-1">
                <button
                  onClick={handleSelectAll}
                  className="text-xs text-blue-600 hover:text-blue-700 font-medium px-2 py-0.5 hover:bg-blue-50 rounded"
                >
                  Select All
                </button>
                <button
                  onClick={handleClearAll}
                  className="text-xs text-gray-600 hover:text-gray-700 font-medium px-2 py-0.5 hover:bg-gray-50 rounded"
                >
                  Clear
                </button>
              </div>
            </div>

            {/* Show un-niched option */}
            <label className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-50 rounded cursor-pointer">
              <div className="relative flex items-center justify-center w-4 h-4">
                <input
                  type="checkbox"
                  checked={isShowingUnniched}
                  onChange={() => handleClearAll()}
                  className="sr-only"
                />
                <div className={`w-4 h-4 rounded border ${
                  isShowingUnniched
                    ? 'bg-pink-500 border-pink-500'
                    : 'bg-white border-gray-300'
                }`}>
                  {isShowingUnniched && (
                    <Check className="h-3 w-3 text-white absolute top-0.5 left-0.5" />
                  )}
                </div>
              </div>
              <span className="text-xs text-gray-700 flex-1">
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
                  className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-50 rounded cursor-pointer"
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
                        ? 'bg-pink-500 border-pink-500'
                        : 'bg-white border-gray-300'
                    }`}>
                      {isSelected && (
                        <Check className="h-3 w-3 text-white absolute top-0.5 left-0.5" />
                      )}
                    </div>
                  </div>
                  <span className="text-xs text-gray-700 flex-1 truncate">
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
          <div className="p-2 border-t border-gray-100">
            <div className="text-xs text-gray-500 text-center">
              Total: {formatNumber(nichedCount + unnichedCount)} creators
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}