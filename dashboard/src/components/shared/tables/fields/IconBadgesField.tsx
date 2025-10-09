'use client'

import { memo } from 'react'
import { BadgeCheck, Lock, Briefcase, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { designSystem } from '@/lib/design-system'

export interface IconBadge {
  icon: LucideIcon
  show: boolean
  title: string
  color?: string
  className?: string
}

interface IconBadgesFieldProps {
  badges: IconBadge[]
  className?: string
  size?: 'sm' | 'md'
}

export const IconBadgesField = memo(function IconBadgesField({
  badges,
  className,
  size = 'sm'
}: IconBadgesFieldProps) {
  const visibleBadges = badges.filter(b => b.show)

  if (visibleBadges.length === 0) {
    return null
  }

  const sizeClass = size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4'

  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      {visibleBadges.map((badge, index) => {
        const Icon = badge.icon
        return (
          <span key={index} title={badge.title}>
            <Icon className={cn(sizeClass, 'flex-shrink-0', badge.className, badge.color)} />
          </span>
        )
      })}
    </div>
  )
})

// Preset badge configurations for common use cases
export const BadgePresetConfigs = {
  instagram: {
    verified: (isVerified: boolean): IconBadge => ({
      icon: BadgeCheck,
      show: isVerified,
      title: 'Verified Account',
      color: 'text-blue-500'
    }),
    business: (isBusiness: boolean): IconBadge => ({
      icon: Briefcase,
      show: isBusiness,
      title: 'Business Account',
      color: 'text-secondary'
    }),
    private: (isPrivate: boolean): IconBadge => ({
      icon: Lock,
      show: isPrivate,
      title: 'Private Account',
      className: designSystem.typography.color.disabled
    })
  },
  reddit: {
    verified: (verificationRequired: boolean): IconBadge => ({
      icon: BadgeCheck,
      show: verificationRequired,
      title: 'Verification Required',
      color: 'text-blue-500'
    })
  }
}
