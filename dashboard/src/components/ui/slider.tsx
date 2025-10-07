"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import * as SliderPrimitive from '@radix-ui/react-slider'
import { designSystem } from '@/lib/design-system'



const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SliderPrimitive.Root
    ref={ref}
    className={cn(
      "relative flex w-full touch-none select-none items-center",
      className
    )}
    {...props}
  >
    <SliderPrimitive.Track className={`relative h-1.5 w-full grow overflow-hidden ${designSystem.borders.radius.full} ${designSystem.background.surface.medium}`}>
      <SliderPrimitive.Range className="absolute h-full bg-gradient-to-r from-primary to-primary" />
    </SliderPrimitive.Track>
    <SliderPrimitive.Thumb className={`block h-4 w-4 ${designSystem.borders.radius.full} border-2 border-primary bg-white shadow-md ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:scale-110`} />
  </SliderPrimitive.Root>
))
Slider.displayName = SliderPrimitive.Root.displayName

export { Slider }