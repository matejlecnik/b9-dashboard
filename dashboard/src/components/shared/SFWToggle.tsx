'use client'

import { Shield, Eye, ShieldCheck, EyeOff } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { designSystem } from '@/lib/design-system'
import { cn } from '@/lib/utils'

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
    <div className={cn('space-y-3', className)}>
      {/* Header */}
      <div className={designSystem.layout.flex.rowBetween}>
        <h4 className={cn(designSystem.typography.size.sm, designSystem.typography.weight.medium, designSystem.typography.color.secondary, designSystem.layout.flex.rowStart, designSystem.spacing.gap.tight)}>
          <Shield className={cn("h-4 w-4", designSystem.typography.color.tertiary)} />
          Content Filtering
        </h4>
        <Badge variant="outline" className={cn(designSystem.typography.size.xs, designSystem.typography.color.tertiary)}>
          {loading ? '...' : `${totalCount} total`}
        </Badge>
      </div>

      {/* Filter options */}
      <div className={cn('grid grid-cols-3', designSystem.spacing.gap.tight)}>
        {/* Show All */}
        <label className="relative group cursor-pointer">
          <div
            className={cn('flex items-center justify-center p-3', designSystem.borders.radius.md, 'border-2', designSystem.animation.transition.default, 'hover:scale-105')}
            style={{
              background: sfwFilter === 'all'
                ? 'linear-gradient(135deg, var(--pink-500), var(--pink-300))'
                : 'var(--white-alpha-80)',
              border: sfwFilter === 'all' ? '2px solid var(--white-alpha-20)' : '2px solid var(--black-alpha-08)',
              boxShadow: sfwFilter === 'all'
                ? '0 4px 12px var(--pink-alpha-25), inset 0 1px 0 var(--white-alpha-10)'
                : '0 2px 6px var(--black-alpha-04)',
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
                <Eye className={cn("h-5 w-5", sfwFilter === 'all' ? 'text-white' : designSystem.typography.color.tertiary)} />
              </div>
              <div className={cn(designSystem.typography.size.sm, designSystem.typography.weight.medium, sfwFilter === 'all' ? 'text-white' : designSystem.typography.color.secondary)}>
                Show All
              </div>
              <Badge
                variant="secondary"
                className="mt-1 text-xs border-0"
                style={{
                  background: sfwFilter === 'all'
                    ? 'var(--white-alpha-20)'
                    : 'var(--pink-alpha-10)',
                  color: sfwFilter === 'all' ? 'white' : 'var(--pink-500)',
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
            className={cn('flex items-center justify-center p-3', designSystem.borders.radius.md, 'border-2', designSystem.animation.transition.default, 'hover:scale-105')}
            style={{
              background: sfwFilter === 'sfw'
                ? 'linear-gradient(135deg, var(--pink-600), var(--pink-500))'
                : 'var(--white-alpha-80)',
              border: sfwFilter === 'sfw' ? '2px solid var(--white-alpha-20)' : '2px solid var(--black-alpha-08)',
              boxShadow: sfwFilter === 'sfw'
                ? '0 4px 12px var(--pink-600-alpha-25), inset 0 1px 0 var(--white-alpha-10)'
                : '0 2px 6px var(--black-alpha-04)',
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
                <ShieldCheck className={`h-5 w-5 ${sfwFilter === 'sfw' ? 'text-white' : 'text-primary-hover'}`} />
              </div>
              <div className={cn(designSystem.typography.size.sm, designSystem.typography.weight.medium, sfwFilter === 'sfw' ? 'text-white' : designSystem.typography.color.secondary)}>
                SFW Only
              </div>
              <Badge
                variant="secondary"
                className="mt-1 text-xs border-0"
                style={{
                  background: sfwFilter === 'sfw'
                    ? 'var(--white-alpha-20)'
                    : 'var(--pink-600-alpha-10)',
                  color: sfwFilter === 'sfw' ? 'white' : 'var(--pink-600)',
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
            className={cn('flex items-center justify-center p-3', designSystem.borders.radius.md, 'border-2', designSystem.animation.transition.default, 'hover:scale-105')}
            style={{
              background: sfwFilter === 'nsfw'
                ? 'linear-gradient(135deg, var(--gray-600), var(--gray-500))'
                : 'var(--white-alpha-80)',
              border: sfwFilter === 'nsfw' ? '2px solid var(--white-alpha-20)' : '2px solid var(--black-alpha-08)',
              boxShadow: sfwFilter === 'nsfw'
                ? '0 4px 12px var(--gray-500-alpha-25), inset 0 1px 0 var(--white-alpha-10)'
                : '0 2px 6px var(--black-alpha-04)',
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
                <EyeOff className={cn("h-5 w-5", sfwFilter === 'nsfw' ? 'text-white' : designSystem.typography.color.secondary)} />
              </div>
              <div className={cn(designSystem.typography.size.sm, designSystem.typography.weight.medium, sfwFilter === 'nsfw' ? 'text-white' : designSystem.typography.color.secondary)}>
                NSFW Only
              </div>
              <Badge
                variant="secondary"
                className="mt-1 text-xs border-0"
                style={{
                  background: sfwFilter === 'nsfw'
                    ? 'var(--white-alpha-20)'
                    : 'var(--gray-500-alpha-10)',
                  color: sfwFilter === 'nsfw' ? 'white' : 'var(--gray-600)',
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
          <label htmlFor="sfw-only" className={cn("text-sm font-medium cursor-pointer", designSystem.typography.color.secondary)}>
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