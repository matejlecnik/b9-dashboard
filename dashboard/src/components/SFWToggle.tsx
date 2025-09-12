'use client'

import React from 'react'
import { Badge } from '@/components/ui/badge'
import { Shield, ShieldCheck, Eye, EyeOff } from 'lucide-react'

type SFWFilter = 'all' | 'sfw' | 'nsfw'

interface SFWToggleProps {
  sfwFilter: SFWFilter
  onSFWFilterChange: (filter: SFWFilter) => void
  sfwCount?: number
  nsfwCount?: number
  loading?: boolean
  className?: string
}

export function SFWToggle({ 
  sfwFilter, 
  onSFWFilterChange, 
  sfwCount = 0,
  nsfwCount = 0,
  loading = false,
  className = ''
}: SFWToggleProps) {
  const totalCount = sfwCount + nsfwCount

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-gray-700 flex items-center gap-2">
          <Shield className="h-4 w-4 text-gray-600" />
          Content Filtering
        </h4>
        <Badge variant="outline" className="text-xs text-gray-600">
          {loading ? '...' : `${totalCount} total`}
        </Badge>
      </div>

      {/* Filter options */}
      <div className="grid grid-cols-3 gap-2">
        {/* Show All */}
        <label className="relative group cursor-pointer">
          <div
            className="flex items-center justify-center p-3 rounded-xl border-2 transition-all duration-200 hover:scale-105"
            style={{
              background: sfwFilter === 'all' 
                ? 'linear-gradient(135deg, #FF8395, #FFB3C1)'
                : 'rgba(255, 255, 255, 0.8)',
              border: sfwFilter === 'all' ? '2px solid rgba(255, 255, 255, 0.2)' : '2px solid rgba(0, 0, 0, 0.08)',
              boxShadow: sfwFilter === 'all'
                ? '0 4px 12px rgba(255, 131, 149, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
                : '0 2px 6px rgba(0, 0, 0, 0.04)',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
            }}
          >
            <input
              type="radio"
              name="sfw-filter"
              checked={sfwFilter === 'all'}
              onChange={() => onSFWFilterChange('all')}
              className="sr-only"
              disabled={loading}
            />
            
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <Eye className={`h-5 w-5 ${sfwFilter === 'all' ? 'text-white' : 'text-gray-600'}`} />
              </div>
              <div className={`text-sm font-medium ${sfwFilter === 'all' ? 'text-white' : 'text-gray-700'}`}>
                Show All
              </div>
              <Badge 
                variant="secondary" 
                className="mt-1 text-xs border-0"
                style={{
                  background: sfwFilter === 'all' 
                    ? 'rgba(255, 255, 255, 0.2)' 
                    : 'rgba(255, 131, 149, 0.1)',
                  color: sfwFilter === 'all' ? 'white' : '#FF8395',
                }}
              >
                {loading ? '...' : totalCount}
              </Badge>
            </div>
          </div>
        </label>

        {/* SFW Only */}
        <label className="relative group cursor-pointer">
          <div
            className="flex items-center justify-center p-3 rounded-xl border-2 transition-all duration-200 hover:scale-105"
            style={{
              background: sfwFilter === 'sfw' 
                ? 'linear-gradient(135deg, #FF6B80, #FF8395)'
                : 'rgba(255, 255, 255, 0.8)',
              border: sfwFilter === 'sfw' ? '2px solid rgba(255, 255, 255, 0.2)' : '2px solid rgba(0, 0, 0, 0.08)',
              boxShadow: sfwFilter === 'sfw'
                ? '0 4px 12px rgba(255, 107, 128, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
                : '0 2px 6px rgba(0, 0, 0, 0.04)',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
            }}
          >
            <input
              type="radio"
              name="sfw-filter"
              checked={sfwFilter === 'sfw'}
              onChange={() => onSFWFilterChange('sfw')}
              className="sr-only"
              disabled={loading}
            />
            
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <ShieldCheck className={`h-5 w-5 ${sfwFilter === 'sfw' ? 'text-white' : 'text-pink-600'}`} />
              </div>
              <div className={`text-sm font-medium ${sfwFilter === 'sfw' ? 'text-white' : 'text-gray-700'}`}>
                SFW Only
              </div>
              <Badge 
                variant="secondary" 
                className="mt-1 text-xs border-0"
                style={{
                  background: sfwFilter === 'sfw' 
                    ? 'rgba(255, 255, 255, 0.2)' 
                    : 'rgba(255, 107, 128, 0.1)',
                  color: sfwFilter === 'sfw' ? 'white' : '#FF6B80',
                }}
              >
                {loading ? '...' : sfwCount}
              </Badge>
            </div>
          </div>
        </label>

        {/* NSFW Only */}
        <label className="relative group cursor-pointer">
          <div
            className="flex items-center justify-center p-3 rounded-xl border-2 transition-all duration-200 hover:scale-105"
            style={{
              background: sfwFilter === 'nsfw' 
                ? 'linear-gradient(135deg, #525252, #737373)'
                : 'rgba(255, 255, 255, 0.8)',
              border: sfwFilter === 'nsfw' ? '2px solid rgba(255, 255, 255, 0.2)' : '2px solid rgba(0, 0, 0, 0.08)',
              boxShadow: sfwFilter === 'nsfw'
                ? '0 4px 12px rgba(82, 82, 82, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
                : '0 2px 6px rgba(0, 0, 0, 0.04)',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
            }}
          >
            <input
              type="radio"
              name="sfw-filter"
              checked={sfwFilter === 'nsfw'}
              onChange={() => onSFWFilterChange('nsfw')}
              className="sr-only"
              disabled={loading}
            />
            
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <EyeOff className={`h-5 w-5 ${sfwFilter === 'nsfw' ? 'text-white' : 'text-gray-800'}`} />
              </div>
              <div className={`text-sm font-medium ${sfwFilter === 'nsfw' ? 'text-white' : 'text-gray-700'}`}>
                NSFW Only
              </div>
              <Badge 
                variant="secondary" 
                className="mt-1 text-xs border-0"
                style={{
                  background: sfwFilter === 'nsfw' 
                    ? 'rgba(255, 255, 255, 0.2)' 
                    : 'rgba(82, 82, 82, 0.1)',
                  color: sfwFilter === 'nsfw' ? 'white' : '#525252',
                }}
              >
                {loading ? '...' : nsfwCount}
              </Badge>
            </div>
          </div>
        </label>
      </div>

      {/* Alternative compact checkbox version */}
      {/* 
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <Checkbox 
            id="sfw-only"
            checked={sfwFilter === 'sfw'}
            onCheckedChange={(checked) => onSFWFilterChange(checked ? 'sfw' : 'all')}
            disabled={loading}
          />
          <label htmlFor="sfw-only" className="text-sm font-medium text-gray-700 cursor-pointer">
            SFW Only ({loading ? '...' : sfwCount})
          </label>
        </div>
        
        {sfwFilter === 'all' && (
          <Badge variant="outline" className="text-xs">
            Showing {loading ? '...' : nsfwCount} NSFW subreddits
          </Badge>
        )}
      </div>
      */}
    </div>
  )
}