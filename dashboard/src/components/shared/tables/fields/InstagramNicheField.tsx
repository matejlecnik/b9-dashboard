'use client'

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'
import { designSystem } from '@/lib/design-system'
import { MoreVertical, Edit2, X, Plus } from 'lucide-react'

interface InstagramNicheFieldProps {
  niche: string | null
  onUpdate?: (newNiche: string) => void
  onRemove?: () => void
  availableNiches?: string[]
}

/**
 * Instagram Niche Field - Single value niche display with inline editing
 * Similar styling to Reddit TagsDisplay but for single niche values
 */
export function InstagramNicheField({
  niche,
  onUpdate,
  onRemove,
  availableNiches = []
}: InstagramNicheFieldProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [position, setPosition] = useState({ top: 0, left: 0 })
  const buttonRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      setPosition({
        top: rect.bottom + 4,
        left: rect.left
      })
    }
  }, [isOpen])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        buttonRef.current && !buttonRef.current.contains(event.target as Node) &&
        dropdownRef.current && !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
        setIsEditing(false)
        setSearchQuery('')
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  useEffect(() => {
    if (isEditing && searchInputRef.current) {
      searchInputRef.current.focus()
    }
  }, [isEditing])

  const handleSelectNiche = (newNiche: string) => {
    if (onUpdate) {
      onUpdate(newNiche)
    }
    setIsEditing(false)
    setIsOpen(false)
    setSearchQuery('')
  }

  const handleRemove = () => {
    if (onRemove) {
      onRemove()
    }
    setIsOpen(false)
  }

  // Filter available niches based on search
  const filteredNiches = searchQuery
    ? availableNiches.filter(n =>
        n.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : availableNiches

  // If no niche, show "Add Niche" button
  if (!niche) {
    return (
      <>
        <button
          ref={buttonRef}
          onClick={() => {
            setIsOpen(!isOpen)
            setIsEditing(true)
          }}
          className={cn(
            "inline-flex items-center gap-1 px-2 py-1 rounded-full",
            "text-[9px] font-medium transition-all duration-200",
            "hover:shadow-sm cursor-pointer border",
            "bg-white/30 border-gray-200/40",
            designSystem.typography.color.tertiary,
            "hover:bg-pink-50/50 hover:text-pink-600 hover:border-pink-200/40"
          )}
          title="Add Niche"
        >
          <Plus className="w-3 h-3" />
          <span>Add Niche</span>
        </button>

        {isOpen && typeof window !== 'undefined' && createPortal(
          <div
            ref={dropdownRef}
            className={cn(
              "fixed border-0 backdrop-blur-xl backdrop-saturate-150 z-50 w-64",
              designSystem.borders.radius.sm
            )}
            style={{
              top: position.top,
              left: position.left,
              background: 'linear-gradient(180deg, var(--gray-200-alpha-85) 0%, var(--gray-300-alpha-80) 100%)',
              border: '1px solid var(--slate-400-alpha-60)',
              boxShadow: '0 12px 32px var(--black-alpha-15)'
            }}
          >
            <div className="p-2 border-b border-light">
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setIsOpen(false)
                    setSearchQuery('')
                  } else if (e.key === 'Enter' && searchQuery.trim()) {
                    handleSelectNiche(searchQuery.trim())
                  }
                }}
                placeholder="Type or select niche..."
                className="w-full px-2 py-1 text-xs border border-default rounded focus:outline-none focus:ring-1 focus:ring-pink-500/20 focus:border-pink-200/40"
              />
              <div className={cn("text-[9px] mt-1", designSystem.typography.color.disabled)}>
                Press Enter to create, or select from list
              </div>
            </div>

            <div className="max-h-48 overflow-y-auto p-2">
              {filteredNiches.length === 0 ? (
                <div className={cn("text-xs text-center py-4", designSystem.typography.color.subtle)}>
                  {searchQuery ? 'Press Enter to create new niche' : 'No niches available'}
                </div>
              ) : (
                <div className="space-y-0.5">
                  {filteredNiches.map((n) => (
                    <button
                      key={n}
                      onClick={() => handleSelectNiche(n)}
                      className={cn(
                        "w-full flex items-center gap-2 px-2 py-1 text-xs text-left rounded",
                        designSystem.background.hover.subtle
                      )}
                    >
                      <span className="truncate">{n}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>,
          document.body
        )}
      </>
    )
  }

  // Show niche badge with edit menu
  return (
    <>
      <div
        className={cn(
          "group relative inline-flex items-center gap-1 px-2 py-1 rounded-full",
          "text-[9px] font-medium transition-all duration-200",
          "hover:shadow-sm cursor-default border",
          "bg-gradient-to-r from-pink-50/50 to-rose-50/50",
          "text-pink-600 border-pink-200/40"
        )}
        title={niche}
      >
        {/* Niche emoji */}
        <span className="flex-shrink-0 text-[10px]">🎯</span>

        {/* Niche text */}
        <span className="truncate max-w-[100px]">{niche}</span>

        {/* Edit button */}
        {(onUpdate || onRemove) && (
          <button
            ref={buttonRef}
            onClick={() => setIsOpen(!isOpen)}
            className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:bg-white/50 rounded"
          >
            <MoreVertical className="w-2.5 h-2.5" />
          </button>
        )}
      </div>

      {isOpen && typeof window !== 'undefined' && createPortal(
        <div
          ref={dropdownRef}
          className={cn(
            "fixed border-0 backdrop-blur-xl backdrop-saturate-150 py-1 min-w-[150px] z-50",
            designSystem.borders.radius.sm
          )}
          style={{
            top: position.top,
            left: position.left,
            background: 'linear-gradient(180deg, var(--gray-200-alpha-85) 0%, var(--gray-300-alpha-80) 100%)',
            border: '1px solid var(--slate-400-alpha-60)',
            boxShadow: '0 12px 32px var(--black-alpha-15)'
          }}
        >
          {isEditing ? (
            <div className="w-64">
              {/* Search input */}
              <div className="p-2 border-b border-light">
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                      setIsEditing(false)
                      setSearchQuery('')
                    } else if (e.key === 'Enter' && searchQuery.trim()) {
                      handleSelectNiche(searchQuery.trim())
                    }
                  }}
                  placeholder="Type or select niche..."
                  className="w-full px-2 py-1 text-xs border border-default rounded focus:outline-none focus:ring-1 focus:ring-pink-500/20 focus:border-pink-200/40"
                />
                <div className={cn("text-[9px] mt-1", designSystem.typography.color.disabled)}>
                  Press Enter to create, or select from list
                </div>
              </div>

              {/* Niches list */}
              <div className="max-h-48 overflow-y-auto p-2">
                {filteredNiches.length === 0 ? (
                  <div className={cn("text-xs text-center py-4", designSystem.typography.color.subtle)}>
                    {searchQuery ? 'Press Enter to create new niche' : 'No niches available'}
                  </div>
                ) : (
                  <div className="space-y-0.5">
                    {filteredNiches.map((n) => (
                      <button
                        key={n}
                        onClick={() => handleSelectNiche(n)}
                        className={cn(
                          "w-full flex items-center gap-2 px-2 py-1 text-xs text-left rounded",
                          designSystem.background.hover.subtle,
                          n === niche && "bg-pink-50/50"
                        )}
                      >
                        <span className="truncate">{n}</span>
                        {n === niche && (
                          <span className={cn("text-[9px] ml-auto flex-shrink-0", designSystem.typography.color.disabled)}>
                            Current
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Cancel button */}
              <div className="p-2 border-t border-light">
                <button
                  onClick={() => {
                    setIsEditing(false)
                    setSearchQuery('')
                  }}
                  className={cn(
                    "w-full px-2 py-1 text-xs rounded",
                    designSystem.background.surface.light,
                    designSystem.background.hover.neutral,
                    designSystem.typography.color.tertiary
                  )}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              <button
                onClick={() => setIsEditing(true)}
                className={cn(
                  "flex items-center gap-2 w-full px-3 py-1.5 text-xs text-left",
                  designSystem.background.hover.subtle
                )}
              >
                <Edit2 className="w-3 h-3" />
                Edit niche
              </button>
              {onRemove && (
                <button
                  onClick={handleRemove}
                  className="flex items-center gap-2 w-full px-3 py-1.5 text-xs hover:bg-pink-50/50 text-pink-600 text-left"
                >
                  <X className="w-3 h-3" />
                  Remove niche
                </button>
              )}
            </>
          )}
        </div>,
        document.body
      )}
    </>
  )
}
