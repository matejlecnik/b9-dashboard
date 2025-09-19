'use client'

import React, { useState, useEffect } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { createBrowserClient } from '@supabase/ssr'

interface NicheSelectorProps {
  creatorId: number
  currentNiche: string | null
  availableNiches: string[]
  onNicheChange?: (niche: string | null) => void
  disabled?: boolean
}

const CLEAR_VALUE = '__UNNICHED__'

export function NicheSelector({
  creatorId,
  currentNiche,
  availableNiches,
  onNicheChange,
  disabled = false
}: NicheSelectorProps) {
  const [localNiche, setLocalNiche] = useState(currentNiche)
  const [isUpdating, setIsUpdating] = useState(false)

  useEffect(() => {
    setLocalNiche(currentNiche)
  }, [currentNiche])

  const handleNicheChange = async (value: string) => {
    const newNiche = value === CLEAR_VALUE ? null : value
    setLocalNiche(newNiche)
    setIsUpdating(true)

    try {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )
      const { error } = await supabase
        .from('instagram_creators')
        .update({ niche: newNiche })
        .eq('id', creatorId)

      if (error) throw error

      if (onNicheChange) {
        onNicheChange(newNiche)
      }
    } catch (error) {
      console.error('Error updating niche:', error)
      // Revert on error
      setLocalNiche(currentNiche)
    } finally {
      setIsUpdating(false)
    }
  }

  const selectedValue = localNiche && localNiche.length > 0 ? localNiche : CLEAR_VALUE

  return (
    <Select
      value={selectedValue}
      onValueChange={handleNicheChange}
      disabled={disabled || isUpdating}
    >
      <SelectTrigger 
        className="h-8 text-xs font-medium border-gray-200 hover:bg-gray-50"
        aria-label="Select niche"
      >
        <SelectValue>
          {localNiche || (
            <span className="text-gray-400">Un-niched</span>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="max-h-72">
        <SelectItem value={CLEAR_VALUE} className="text-xs">
          <span className="text-gray-400">Clear Niche</span>
        </SelectItem>
        {availableNiches.map((niche) => (
          <SelectItem key={niche} value={niche} className="text-xs">
            {niche}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}