"use client"


import * as React from "react"
import { cn } from "@/lib/utils"
import * as CheckboxPrimitive from '@radix-ui/react-checkbox'
import { CheckIcon } from 'lucide-react'

function Checkbox({
  className,
  ...props
}: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        "peer glass-input border-white/40 data-[state=checked]:bg-b9-pink data-[state=checked]:text-white data-[state=checked]:border-b9-pink focus-visible:border-b9-pink focus-visible:ring-b9-pink/30 aria-invalid:ring-destructive/20 aria-invalid:border-destructive size-5 shrink-0 rounded-md border backdrop-blur-sm shadow-apple transition-all duration-300 outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 hover:border-b9-pink/60 hover:shadow-2xl hover:scale-105 data-[state=checked]:shadow-2xl",
        className
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="flex items-center justify-center text-white transition-all duration-200 scale-0 data-[state=checked]:scale-100"
      >
        <CheckIcon className="size-3.5 stroke-[3]" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}

export { Checkbox }
