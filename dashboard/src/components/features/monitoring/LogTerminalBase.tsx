'use client'

import { Card, CardContent } from '@/components/ui/card'
import { designSystem } from '@/lib/design-system'
import { cn } from '@/lib/utils'

interface LogTerminalBaseProps {
  title?: string
  height: string
  fadeHeight?: string
  topFadeOpacity?: string
  bottomFadeOpacity?: string
  children: React.ReactNode
  className?: string
  statusBadges?: React.ReactNode
}

/**
 * LogTerminalBase - Reusable UI wrapper for all log terminal components
 *
 * Provides consistent structure:
 * - Header outside the card box
 * - Configurable fade gradients at top and bottom
 * - Full height dedicated to log content
 * - Optional status badges (Live, Paused, etc.)
 *
 * @example
 * <LogTerminalBase title="Activity Logs" height="120px" fadeHeight="h-12">
 *   <div className="overflow-y-auto h-full">
 *     {logs.map(log => <LogEntry key={log.id} {...log} />)}
 *   </div>
 * </LogTerminalBase>
 */
export function LogTerminalBase({
  title,
  height,
  fadeHeight: _fadeHeight = '60px',
  topFadeOpacity: _topFadeOpacity = 'from-pink-500 to-pink-500',
  bottomFadeOpacity: _bottomFadeOpacity = 'from-pink-500 to-pink-500',
  children,
  className = '',
  statusBadges
}: LogTerminalBaseProps) {
  return (
    <div className="flex flex-col gap-1">
      {/* Header outside the box */}
      {title && (
        <h3 className={cn("text-[10px] font-medium whitespace-nowrap px-2", designSystem.typography.color.tertiary)}>
          {title}
        </h3>
      )}

      {/* Log card with full height */}
      <Card
        className={`!p-0 !gap-0 !py-0 border-light backdrop-blur-glass-lg shadow-xl hover:!scale-100 hover:!translate-y-0 hover:!bg-white/70 hover:!shadow-xl ${className}`}
        style={{
          background: 'linear-gradient(to bottom right, var(--gray-150) 0%, var(--gray-100) 50%, var(--gray-150) 100%)'
        }}
      >
        <CardContent className="p-0">
          <div className="relative overflow-hidden" style={{ height }}>
            {/* Log content (provided as children) */}
            {children}
          </div>
        </CardContent>

        {/* Status badges (Live, Paused, etc.) */}
        {statusBadges}
      </Card>
    </div>
  )
}
