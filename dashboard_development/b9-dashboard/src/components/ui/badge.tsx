import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-full px-3 py-1 text-xs font-semibold w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1.5 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive transition-all duration-300 overflow-hidden backdrop-blur-sm shadow-sm",
  {
    variants: {
      variant: {
        default:
          "bg-b9-pink/90 text-white border border-b9-pink/20 [a&]:hover:bg-b9-pink [a&]:hover:shadow-md [a&]:hover:scale-105",
        secondary:
          "bg-white/70 text-gray-700 border border-white/30 [a&]:hover:bg-white/90 [a&]:hover:shadow-md [a&]:hover:scale-105",
        destructive:
          "bg-red-500/90 text-white border border-red-500/20 [a&]:hover:bg-red-500 [a&]:hover:shadow-md [a&]:hover:scale-105",
        outline:
          "text-gray-700 border border-gray-300/60 bg-white/50 [a&]:hover:bg-white/80 [a&]:hover:text-gray-900 [a&]:hover:shadow-md [a&]:hover:scale-105",
        success:
          "bg-green-500/90 text-white border border-green-500/20 [a&]:hover:bg-green-500 [a&]:hover:shadow-md [a&]:hover:scale-105",
        warning:
          "bg-yellow-500/90 text-white border border-yellow-500/20 [a&]:hover:bg-yellow-500 [a&]:hover:shadow-md [a&]:hover:scale-105",
        glass:
          "glass-button text-gray-700 border-0 [a&]:hover:text-gray-900 [a&]:hover:scale-105",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "span"

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
