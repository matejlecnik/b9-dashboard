'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import { designSystem } from '@/lib/design-system'

interface CardProps {
  children: React.ReactNode
  className?: string
  variant?: 'default' | 'glass' | 'elevated' | 'flat' | 'interactive'
  noPadding?: boolean
  onClick?: () => void
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ children, className, variant = 'default', noPadding = false, onClick }, ref) => {
    const baseClasses = cn(
      designSystem.card[variant],
      designSystem.radius.lg,
      !noPadding && designSystem.spacing.card,
      designSystem.animation.normal,
      onClick && 'cursor-pointer',
      className
    )

    return (
      <div ref={ref} className={baseClasses} onClick={onClick}>
        {children}
      </div>
    )
  }
)

Card.displayName = 'Card'

// Card subcomponents for better composition
interface CardHeaderProps {
  children: React.ReactNode
  className?: string
  noBorder?: boolean
}

export const CardHeader = React.forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ children, className, noBorder = false }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'px-6 py-4',
          !noBorder && 'border-b border-gray-200',
          className
        )}
      >
        {children}
      </div>
    )
  }
)

CardHeader.displayName = 'CardHeader'

interface CardContentProps {
  children: React.ReactNode
  className?: string
}

export const CardContent = React.forwardRef<HTMLDivElement, CardContentProps>(
  ({ children, className }, ref) => {
    return (
      <div ref={ref} className={cn('p-6', className)}>
        {children}
      </div>
    )
  }
)

CardContent.displayName = 'CardContent'

interface CardFooterProps {
  children: React.ReactNode
  className?: string
  noBorder?: boolean
}

export const CardFooter = React.forwardRef<HTMLDivElement, CardFooterProps>(
  ({ children, className, noBorder = false }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'px-6 py-4',
          !noBorder && 'border-t border-gray-200',
          className
        )}
      >
        {children}
      </div>
    )
  }
)

CardFooter.displayName = 'CardFooter'

// Card title component
interface CardTitleProps {
  children: React.ReactNode
  className?: string
  subtitle?: string
}

export const CardTitle = React.forwardRef<HTMLDivElement, CardTitleProps>(
  ({ children, className, subtitle }, ref) => {
    return (
      <div ref={ref} className={className}>
        <h3 className={designSystem.text.h3}>{children}</h3>
        {subtitle && (
          <p className={cn(designSystem.text.subtitle, 'mt-1')}>{subtitle}</p>
        )}
      </div>
    )
  }
)

CardTitle.displayName = 'CardTitle'