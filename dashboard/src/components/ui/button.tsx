import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "relative inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium transition-all duration-300 ease-out disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-offset-2 hover:scale-[1.02] active:scale-[0.98] transform-gpu font-[-apple-system,BlinkMacSystemFont,'SF_Pro_Text','Helvetica_Neue',sans-serif] overflow-hidden",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-r from-[#FF8395] via-[#FF6B80] to-[#FF8395] bg-[length:200%_100%] text-white shadow-[0_8px_32px_rgba(255,131,149,0.25),inset_0_1px_1px_rgba(255,255,255,0.3)] backdrop-blur-xl backdrop-saturate-150 border border-white/20 hover:bg-[position:100%_0] hover:shadow-[0_12px_40px_rgba(255,131,149,0.4),inset_0_1px_1px_rgba(255,255,255,0.4)] focus-visible:ring-pink-500/50 active:shadow-[0_4px_20px_rgba(255,131,149,0.3),inset_0_1px_1px_rgba(255,255,255,0.2)] before:absolute before:inset-0 before:rounded-xl before:bg-gradient-to-b before:from-white/20 before:to-transparent before:pointer-events-none",
        destructive:
          "bg-gradient-to-br from-[rgba(17,24,39,0.85)] via-[rgba(31,41,55,0.9)] to-[rgba(17,24,39,0.85)] backdrop-blur-2xl backdrop-saturate-150 text-white border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.1)] hover:from-[rgba(17,24,39,0.95)] hover:to-[rgba(17,24,39,0.95)] hover:shadow-[0_12px_40px_rgba(0,0,0,0.6),inset_0_2px_2px_rgba(255,255,255,0.15)] focus-visible:ring-gray-500/50 before:absolute before:inset-0 before:rounded-xl before:bg-gradient-to-b before:from-white/5 before:to-transparent before:pointer-events-none",
        outline:
          "bg-gradient-to-br from-[rgba(255,255,255,0.6)] via-[rgba(248,250,252,0.5)] to-[rgba(255,255,255,0.6)] backdrop-blur-2xl backdrop-saturate-150 border border-white/40 text-gray-700 shadow-[0_8px_32px_rgba(0,0,0,0.08),inset_0_2px_4px_rgba(255,255,255,0.8)] hover:from-[rgba(255,255,255,0.9)] hover:via-[rgba(248,250,252,0.8)] hover:to-[rgba(255,255,255,0.9)] hover:text-gray-900 hover:shadow-[0_12px_40px_rgba(0,0,0,0.12),inset_0_2px_8px_rgba(255,255,255,0.9)] hover:border-pink-200/50 focus-visible:ring-pink-500/50 before:absolute before:inset-0 before:rounded-xl before:bg-gradient-to-t before:from-gray-50/50 before:to-transparent before:pointer-events-none",
        secondary:
          "bg-gradient-to-br from-[rgba(255,255,255,0.7)] via-[rgba(250,240,255,0.6)] to-[rgba(255,255,255,0.7)] backdrop-blur-2xl backdrop-saturate-150 border border-white/40 text-gray-700 shadow-[0_8px_32px_rgba(0,0,0,0.08),inset_0_2px_4px_rgba(255,255,255,0.8)] hover:from-[rgba(255,255,255,0.95)] hover:via-[rgba(250,240,255,0.85)] hover:to-[rgba(255,255,255,0.95)] hover:text-gray-900 hover:shadow-[0_12px_40px_rgba(255,131,149,0.15),inset_0_2px_8px_rgba(255,255,255,0.9)] hover:border-pink-300/50 focus-visible:ring-pink-500/50 before:absolute before:inset-0 before:rounded-xl before:bg-gradient-to-t before:from-pink-50/30 before:to-transparent before:pointer-events-none",
        ghost:
          "text-gray-700 hover:text-gray-900 hover:bg-gradient-to-br hover:from-[rgba(255,255,255,0.4)] hover:via-[rgba(248,250,252,0.3)] hover:to-[rgba(255,255,255,0.4)] hover:backdrop-blur-xl hover:backdrop-saturate-150 hover:shadow-[0_4px_16px_rgba(0,0,0,0.08),inset_0_1px_2px_rgba(255,255,255,0.6)] hover:border hover:border-white/20 focus-visible:ring-pink-500/50",
        link: "text-pink-500 underline-offset-4 hover:underline hover:text-pink-600 focus-visible:ring-pink-500/50 rounded-none shadow-none",
        glass: "bg-gradient-to-br from-[rgba(255,255,255,0.25)] via-[rgba(255,255,255,0.15)] to-[rgba(255,255,255,0.25)] backdrop-blur-2xl backdrop-saturate-200 border border-white/50 text-gray-700 shadow-[0_8px_32px_rgba(0,0,0,0.1),inset_0_2px_8px_rgba(255,255,255,0.7)] hover:from-[rgba(255,255,255,0.4)] hover:via-[rgba(255,255,255,0.3)] hover:to-[rgba(255,255,255,0.4)] hover:text-gray-900 hover:shadow-[0_12px_40px_rgba(0,0,0,0.15),inset_0_4px_12px_rgba(255,255,255,0.8)] hover:border-white/60 focus-visible:ring-gray-500/50 before:absolute before:inset-0 before:rounded-xl before:bg-gradient-to-t before:from-white/10 before:via-transparent before:to-white/10 before:pointer-events-none",
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
