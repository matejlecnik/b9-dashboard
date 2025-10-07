import { BadgeConfig } from '@/config/navigation'
import { Badge } from '@/components/ui/badge'
import { designSystem } from '@/lib/design-system'
import { cn } from '@/lib/utils'

interface NavigationBadgeProps {
  config: BadgeConfig
  className?: string
}

export const NavigationBadge: React.FC<NavigationBadgeProps> = ({ 
  config, 
  className 
}) => {
  if (config.type === 'dot') {
    return (
      <span
        className={cn(`absolute right-2 h-2 w-2 rounded-full`,
          config.color === 'success' ? 'bg-primary' :
          config.color === 'warning' ? designSystem.background.surface.dark :
          config.color === 'error' ? designSystem.background.surface.inverse :
          config.color === 'info' ? designSystem.background.surface.darker :
          'bg-b9-pink',
          config.pulse ? 'animate-pulse' : '',
          className || ''
        )}
        aria-hidden="true"
      />
    )
  }

  if (config.type === 'status') {
    return (
      <div className={cn(`flex items-center`, className || '')}>
        <span
          className={cn(`h-2 w-2 rounded-full mr-2`,
            config.color === 'success' ? 'bg-primary' :
            config.color === 'warning' ? designSystem.background.surface.dark :
            config.color === 'error' ? designSystem.background.surface.inverse :
            config.color === 'info' ? designSystem.background.surface.darker :
            designSystem.background.surface.muted,
            config.pulse ? 'animate-pulse' : ''
          )}
          aria-hidden="true"
        />
        {config.value && (
          <span className={cn("text-xs font-medium", designSystem.typography.color.tertiary)}>
            {config.value}
          </span>
        )}
      </div>
    )
  }

  if (config.type === 'count' && config.value) {
    return (
      <Badge 
        variant={config.color || 'default'}
        size="sm"
        className={`ml-auto ${config.pulse ? 'animate-pulse' : ''} ${className || ''}`}
      >
        {typeof config.value === 'number' && config.value > 99 ? '99+' : config.value}
      </Badge>
    )
  }

  if (config.type === 'alert' && config.value) {
    return (
      <Badge 
        variant={config.color || 'error'}
        size="sm"
        className={`ml-auto ${config.pulse ? 'animate-pulse' : ''} ${className || ''}`}
      >
        !
      </Badge>
    )
  }

  return null
}

