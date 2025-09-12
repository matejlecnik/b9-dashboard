import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium transition-all duration-300 ease-out disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-offset-2 hover:scale-[1.02] active:scale-[0.98] transform-gpu font-[-apple-system,BlinkMacSystemFont,'SF_Pro_Text','Helvetica_Neue',sans-serif]",
  {
    variants: {
      variant: {
        default:
          "bg-[#FF8395] text-white shadow-[0_4px_14px_rgba(255,131,149,0.25)] hover:bg-[#FF6B80] hover:shadow-[0_6px_20px_rgba(255,131,149,0.35)] focus-visible:ring-pink-500/50 active:bg-[#FF4D68]",
        destructive:
          "bg-[rgba(17,24,39,0.9)] backdrop-blur-[15px] text-white border border-white/10 shadow-[0_4px_14px_rgba(17,24,39,0.25)] hover:bg-[rgba(17,24,39,0.95)] hover:shadow-[0_6px_20px_rgba(17,24,39,0.35)] focus-visible:ring-gray-500/50",
        outline:
          "bg-[rgba(248,250,252,0.7)] backdrop-blur-[15px] border border-white/20 text-gray-700 hover:bg-[rgba(248,250,252,0.9)] hover:text-gray-900 hover:shadow-[0_6px_20px_rgba(0,0,0,0.12)] hover:border-pink-200/30 focus-visible:ring-pink-500/50 shadow-[0_4px_14px_rgba(0,0,0,0.08)]",
        secondary:
          "bg-[rgba(248,250,252,0.7)] backdrop-blur-[15px] border border-white/20 text-gray-700 hover:bg-[rgba(248,250,252,0.9)] hover:text-gray-900 hover:shadow-[0_6px_20px_rgba(0,0,0,0.12)] hover:border-pink-200/30 focus-visible:ring-pink-500/50 shadow-[0_4px_14px_rgba(0,0,0,0.08)]",
        ghost:
          "text-gray-700 hover:text-gray-900 hover:bg-[rgba(248,250,252,0.6)] hover:backdrop-blur-[10px] hover:shadow-[0_2px_8px_rgba(0,0,0,0.08)] focus-visible:ring-pink-500/50",
        link: "text-pink-500 underline-offset-4 hover:underline hover:text-pink-600 focus-visible:ring-pink-500/50 rounded-none shadow-none",
        glass: "bg-[rgba(255,255,255,0.6)] backdrop-blur-[12px] border border-white/30 text-gray-700 hover:bg-[rgba(255,255,255,0.8)] hover:text-gray-900 hover:shadow-[0_4px_16px_rgba(0,0,0,0.12)] focus-visible:ring-gray-500/50 shadow-[0_2px_10px_rgba(0,0,0,0.08)]",
      },
      size: {
        default: "h-10 px-6 py-2 has-[>svg]:px-4",
        sm: "h-8 rounded-lg gap-1.5 px-3 text-xs has-[>svg]:px-3",
        lg: "h-12 rounded-xl px-8 text-base has-[>svg]:px-6",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  // For button elements, ensure type is always set (default to "button")
  // For Slot component (asChild), pass props as-is
  const finalProps = asChild 
    ? props 
    : {
        ...props,
        type: (props as React.ComponentProps<"button">).type ?? 'button'
      }

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...finalProps}
    />
  )
}

export { Button, buttonVariants }
