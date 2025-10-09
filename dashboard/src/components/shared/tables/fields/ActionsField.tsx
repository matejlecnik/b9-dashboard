'use client'

import { memo } from 'react'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface ActionButton {
  icon: React.ComponentType<{ className?: string }>
  label?: string
  onClick: (e: React.MouseEvent) => void
  variant?: 'default' | 'ghost' | 'outline' | 'destructive'
  disabled?: boolean
  loading?: boolean
  className?: string
  showLabel?: boolean
}

interface ActionsFieldProps {
  actions: ActionButton[]
  className?: string
  size?: 'sm' | 'default'
}

export const ActionsField = memo(function ActionsField({
  actions,
  className,
  size = 'sm'
}: ActionsFieldProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      {actions.map((action, index) => {
        const Icon = action.icon
        const isLoading = action.loading || false

        return (
          <Button
            key={index}
            size={size}
            variant={action.variant || 'ghost'}
            onClick={action.onClick}
            disabled={action.disabled || isLoading}
            className={cn(action.className)}
            aria-label={action.label}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Icon className="h-4 w-4" />
                {action.showLabel && action.label && (
                  <span className="ml-1.5">{action.label}</span>
                )}
              </>
            )}
          </Button>
        )
      })}
    </div>
  )
})
