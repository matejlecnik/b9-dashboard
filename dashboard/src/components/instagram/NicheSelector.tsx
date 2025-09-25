'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { ChevronDown, Check, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { createBrowserClient } from '@supabase/ssr'
import { logger } from '@/lib/logger'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

interface NicheSelectorProps {
  creatorId: number
  currentNiche: string | null
  availableNiches: string[]
  onNicheChange?: (niche: string | null) => void
  disabled?: boolean
}

export function NicheSelector({
  creatorId,
  currentNiche,
  availableNiches,
  onNicheChange,
  disabled = false
}: NicheSelectorProps) {
  const [localNiche, setLocalNiche] = useState(currentNiche)
  const [isUpdating, setIsUpdating] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [newNicheInput, setNewNicheInput] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setLocalNiche(currentNiche)
  }, [currentNiche])

  const handleNicheChange = async (niche: string | null) => {
    if (niche === localNiche) {
      setIsOpen(false)
      return
    }

    setLocalNiche(niche)
    setIsUpdating(true)
    setIsOpen(false)

    try {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )
      const { error } = await supabase
        .from('instagram_creators')
        .update({ niche })
        .eq('id', creatorId)

      if (error) throw error

      if (onNicheChange) {
        onNicheChange(niche)
      }
    } catch (error) {
      logger.error('Error updating niche:', error)
      // Revert on error
      setLocalNiche(currentNiche)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleAddNewNiche = async () => {
    const trimmedNiche = newNicheInput.trim()
    if (!trimmedNiche) return

    await handleNicheChange(trimmedNiche)
    setNewNicheInput('')
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAddNewNiche()
    }
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={isOpen}
          className="h-8 w-full justify-between text-xs font-medium border-gray-200 hover:bg-gray-50"
          disabled={disabled || isUpdating}
        >
          <span className={cn(!localNiche && "text-gray-400")}>
            {localNiche || "Un-niched"}
          </span>
          <ChevronDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0 bg-white" align="start">
        <div className="max-h-[300px] overflow-auto">
          {/* Clear option */}
          <button
            className="relative flex w-full cursor-pointer select-none items-center px-2 py-1.5 text-xs outline-none hover:bg-gray-100 data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
            onClick={() => handleNicheChange(null)}
          >
            {!localNiche ? <Check className="mr-2 h-3 w-3" /> : <span className="mr-2 h-3 w-3" />}
            <span className="text-gray-400">Clear Niche</span>
          </button>

          {/* Existing niches */}
          {availableNiches.map((niche) => (
            <button
              key={niche}
              className="relative flex w-full cursor-pointer select-none items-center px-2 py-1.5 text-xs outline-none hover:bg-gray-100 data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
              onClick={() => handleNicheChange(niche)}
            >
              {localNiche === niche ? <Check className="mr-2 h-3 w-3" /> : <span className="mr-2 h-3 w-3" />}
              {niche}
            </button>
          ))}

          {/* Divider */}
          <div className="border-t border-gray-200 my-1" />

          {/* Add new niche input */}
          <div className="p-2">
            <div className="flex items-center gap-1">
              <Input
                ref={inputRef}
                type="text"
                placeholder="Add new niche..."
                value={newNicheInput}
                onChange={(e) => setNewNicheInput(e.target.value)}
                onKeyPress={handleKeyPress}
                className="h-7 text-xs flex-1"
              />
              <Button
                size="sm"
                variant="ghost"
                onClick={handleAddNewNiche}
                disabled={!newNicheInput.trim()}
                className="h-7 w-7 p-0"
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}