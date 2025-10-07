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
  fadeHeight = '2%',
  topFadeOpacity = 'from-black/2 via-black/1',
  bottomFadeOpacity = 'from-black/2 via-black/1',
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
      <Card className={`p-0 border-light bg-gradient-to-br from-gray-100/80 via-gray-50/60 to-gray-100/40 backdrop-blur-xl shadow-xl ${className}`}>
        <CardContent className="p-0">
          <div className="relative" style={{ height }}>
            {/* Top fade gradient - configurable */}
            <div
              style={{ height: fadeHeight }}
              className={`absolute top-0 left-0 right-0 bg-gradient-to-b ${topFadeOpacity} to-transparent pointer-events-none z-10`}
            />

            {/* Log content (provided as children) */}
            {children}

            {/* Bottom fade gradient - configurable */}
            <div
              style={{ height: fadeHeight }}
              className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t ${bottomFadeOpacity} to-transparent pointer-events-none z-10`}
            />
          </div>
        </CardContent>

        {/* Status badges (Live, Paused, etc.) */}
        {statusBadges}
      </Card>
    </div>
  )
}
