"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import * as ProgressPrimitive from '@radix-ui/react-progress'


function Progress({
  className,
  value,
  ...props
}: React.ComponentProps<typeof ProgressPrimitive.Root>) {
  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      className={cn(
        "relative h-2 w-full overflow-hidden rounded-full bg-gray-200",
        className
      )}
      {...props}
    >
      <ProgressPrimitive.Indicator
        data-slot="progress-indicator"
        className="h-full w-full flex-1 transition-all relative overflow-hidden"
        style={{
          transform: `translateX(-${100 - (value || 0)}%)`,
          background: 'linear-gradient(135deg, rgba(251, 113, 133, 0.9), rgba(236, 72, 153, 0.9), rgba(219, 39, 119, 0.9))',
          boxShadow: '0 2px 8px rgba(236, 72, 153, 0.5), inset 0 1px 2px rgba(255, 255, 255, 0.4), inset 0 -1px 1px rgba(0, 0, 0, 0.1)',
          backdropFilter: 'blur(10px) saturate(180%)',
          WebkitBackdropFilter: 'blur(10px) saturate(180%)',
        }}
      >
        <div
          className="absolute inset-0 opacity-50"
          style={{
            background: 'linear-gradient(to bottom, rgba(255, 255, 255, 0.3), transparent 40%, transparent 60%, rgba(0, 0, 0, 0.1))',
          }}
        />
        <div
          className="absolute inset-0 animate-pulse"
          style={{
            background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2) 50%, transparent)',
            animation: 'shimmer 2s infinite',
          }}
        />
      </ProgressPrimitive.Indicator>
    </ProgressPrimitive.Root>
  )
}

export { Progress }
