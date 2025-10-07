"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import * as ProgressPrimitive from '@radix-ui/react-progress'
import { designSystem } from '@/lib/design-system'


function Progress({
  className,
  value,
  ...props
}: React.ComponentProps<typeof ProgressPrimitive.Root>) {
  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      className={cn(
        `relative h-2 w-full overflow-hidden ${designSystem.borders.radius.full} ${designSystem.background.surface.neutral}`,
        className
      )}
      {...props}
    >
      <ProgressPrimitive.Indicator
        data-slot="progress-indicator"
        className="h-full w-full flex-1 transition-all relative overflow-hidden"
        style={{
          transform: `translateX(-${100 - (value || 0)}%)`,
          background: 'linear-gradient(135deg, var(--rose-400-alpha-90), var(--fuchsia-500-alpha-90), var(--pink-600-shade-alpha-90))',
          boxShadow: '0 2px 8px var(--fuchsia-500-alpha-50), inset 0 1px 2px var(--white-alpha-40), inset 0 -1px 1px var(--black-alpha-10)',
          backdropFilter: 'blur(10px) saturate(180%)',
          WebkitBackdropFilter: 'blur(10px) saturate(180%)',
        }}
      >
        <div
          className="absolute inset-0 opacity-50"
          style={{
            background: 'linear-gradient(to bottom, var(--white-alpha-30), transparent 40%, transparent 60%, var(--black-alpha-10))',
          }}
        />
        <div
          className="absolute inset-0 animate-pulse"
          style={{
            background: 'linear-gradient(90deg, transparent, var(--white-alpha-20) 50%, transparent)',
            animation: 'shimmer 2s infinite',
          }}
        />
      </ProgressPrimitive.Indicator>
    </ProgressPrimitive.Root>
  )
}

export { Progress }
