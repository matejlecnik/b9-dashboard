
import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { designSystem } from "@/lib/design-system"

/**
 * Button Component - Migrated to Design Token System v2.0
 *
 * Now uses CSS variables from globals.css for dynamic theming.
 * All hardcoded colors replaced with semantic tokens.
 */

const buttonVariants = cva(
  `relative inline-flex items-center justify-center gap-2 whitespace-nowrap ${designSystem.borders.radius.md} text-sm font-medium transition-all duration-300 ease-out disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-offset-2 hover:scale-[1.02] active:scale-[0.98] transform-gpu font-mac-text overflow-hidden`,
  {
    variants: {
      variant: {
        default:
          // Primary gradient using CSS variables
          "bg-gradient-to-r from-primary via-primary-hover to-primary bg-[length:200%_100%] text-white shadow-pink-lg backdrop-blur-xl backdrop-saturate-150 border border-white/20 hover:bg-[position:100%_0] hover:shadow-pink-lg focus-visible:ring-pink-500/50 active:shadow-pink before:absolute before:inset-0 before:rounded-xl before:bg-gradient-to-b before:from-white/20 before:to-transparent before:pointer-events-none",
        destructive:
          // Error/danger variant using gray
          "bg-gradient-to-br from-gray-900/85 via-gray-800/90 to-gray-900/85 backdrop-blur-2xl backdrop-saturate-150 text-white border border-white/10 shadow-xl hover:from-gray-900/95 hover:to-gray-900/95 hover:shadow-2xl focus-visible:ring-gray-500/50 before:absolute before:inset-0 before:rounded-xl before:bg-gradient-to-b before:from-white/5 before:to-transparent before:pointer-events-none",
        outline:
          // Outline variant with glassmorphism
          `bg-gradient-to-br from-white/60 via-gray-50/50 to-white/60 backdrop-blur-2xl backdrop-saturate-150 border border-white/40 ${designSystem.typography.color.secondary} shadow-md hover:from-white/90 hover:via-gray-50/80 hover:to-white/90 hover:${designSystem.typography.color.primary} hover:shadow-lg hover:border-primary/50 focus-visible:ring-primary/50 before:absolute before:inset-0 before:rounded-xl before:bg-gradient-to-t before:from-gray-50/50 before:to-transparent before:pointer-events-none`,
        secondary:
          // Secondary variant with subtle pink tint
          `bg-gradient-to-br from-white/70 via-pink-50/60 to-white/70 backdrop-blur-2xl backdrop-saturate-150 border border-white/40 ${designSystem.typography.color.secondary} shadow-md hover:from-white/95 hover:via-pink-50/85 hover:to-white/95 hover:${designSystem.typography.color.primary} hover:shadow-pink hover:border-primary/50 focus-visible:ring-primary/50 before:absolute before:inset-0 before:rounded-xl before:bg-gradient-to-t before:from-pink-50/30 before:to-transparent before:pointer-events-none`,
        ghost:
          // Ghost variant with minimal styling
          `${designSystem.typography.color.secondary} hover:${designSystem.typography.color.primary} hover:bg-gradient-to-br hover:from-white/40 hover:via-gray-50/30 hover:to-white/40 hover:backdrop-blur-xl hover:backdrop-saturate-150 hover:shadow-sm hover:border hover:border-white/20 focus-visible:ring-primary/50`,
        link:
          // Link variant using primary color
          `text-primary underline-offset-4 hover:underline hover:text-primary-hover focus-visible:ring-primary/50 ${designSystem.borders.radius.none} shadow-none`,
        glass:
          // Glassmorphism variant
          `bg-gradient-to-br from-white/25 via-white/15 to-white/25 backdrop-blur-2xl backdrop-saturate-200 border border-white/50 ${designSystem.typography.color.secondary} shadow-lg hover:from-white/40 hover:via-white/30 hover:to-white/40 hover:${designSystem.typography.color.primary} hover:shadow-xl hover:border-white/60 focus-visible:ring-gray-500/50 before:absolute before:inset-0 before:rounded-xl before:bg-gradient-to-t before:from-white/10 before:via-transparent before:to-white/10 before:pointer-events-none`,
      },
      size: {
        default: "h-10 px-6 py-2 has-[>svg]:px-4",
        sm: `h-8 ${designSystem.borders.radius.sm} gap-1.5 px-3 text-xs has-[>svg]:px-3`,
        lg: `h-12 ${designSystem.borders.radius.md} px-8 text-base has-[>svg]:px-6`,
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

const Button = React.forwardRef<HTMLButtonElement, React.ComponentProps<"button"> & VariantProps<typeof buttonVariants> & { asChild?: boolean }>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
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
        ref={ref}
        {...finalProps}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
