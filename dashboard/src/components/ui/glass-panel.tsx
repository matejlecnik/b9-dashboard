'use client'

import React, { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface GlassPanelProps {
  className?: string
  children: ReactNode
  intensity?: 'light' | 'medium' | 'heavy'
  shadow?: 'sm' | 'md' | 'lg' | 'xl'
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl'
  interactive?: boolean
}

export function GlassPanel({
  className,
  children,
  intensity = 'medium',
  shadow = 'lg',
  rounded = '2xl',
  interactive = false,
  ...props
}: GlassPanelProps) {
  const intensityStyles = {
    light: 'bg-white/60',
    medium: 'bg-white/80', 
    heavy: 'bg-white/90'
  }

  const shadowClasses = {
    sm: 'shadow-sm',
    md: 'shadow-md',
    lg: 'shadow-lg',
    xl: 'shadow-xl'
  }

  const roundedClasses = {
    none: 'rounded-none',
    sm: 'rounded-sm',
    md: 'rounded-md', 
    lg: 'rounded-lg',
    xl: 'rounded-xl',
    '2xl': 'rounded-2xl',
    '3xl': 'rounded-3xl'
  }

  return (
    <div
      className={cn(
        'relative',
        intensityStyles[intensity],
        roundedClasses[rounded],
        shadowClasses[shadow],
        'border border-gray-200',
        interactive && 'hover:bg-white/95',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

// Simplified specialized panels
export function GlassToolbar({
  children,
  className,
  ...props
}: {
  children: ReactNode
  className?: string
} & Omit<GlassPanelProps, 'intensity' | 'shadow' | 'rounded'>) {
  return (
    <GlassPanel
      intensity="heavy"
      shadow="xl"
      rounded="2xl"
      className={cn('p-4', className)}
      {...props}
    >
      {children}
    </GlassPanel>
  )
}

export function GlassCard({
  children,
  className,
  ...props
}: {
  children: ReactNode
  className?: string
} & Omit<GlassPanelProps, 'intensity'>) {
  return (
    <GlassPanel
      intensity="medium"
      interactive
      className={cn('p-6', className)}
      {...props}
    >
      {children}
    </GlassPanel>
  )
}