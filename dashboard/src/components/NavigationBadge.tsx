import React from 'react'
import { Badge } from '@/components/ui/badge'
import { BadgeConfig } from '@/config/navigation'

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
        className={`absolute right-2 h-2 w-2 rounded-full ${
          config.color === 'success' ? 'bg-pink-500' :
          config.color === 'warning' ? 'bg-gray-500' :
          config.color === 'error' ? 'bg-gray-900' :
          config.color === 'info' ? 'bg-gray-600' :
          'bg-b9-pink'
        } ${config.pulse ? 'animate-pulse' : ''} ${className || ''}`}
        aria-hidden="true"
      />
    )
  }

  if (config.type === 'status') {
    return (
      <div className={`flex items-center ${className || ''}`}>
        <span 
          className={`h-2 w-2 rounded-full mr-2 ${
            config.color === 'success' ? 'bg-pink-500' :
            config.color === 'warning' ? 'bg-gray-500' :
            config.color === 'error' ? 'bg-gray-900' :
            config.color === 'info' ? 'bg-gray-600' :
            'bg-gray-400'
          } ${config.pulse ? 'animate-pulse' : ''}`}
          aria-hidden="true"
        />
        {config.value && (
          <span className="text-xs text-gray-600 font-medium">
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

