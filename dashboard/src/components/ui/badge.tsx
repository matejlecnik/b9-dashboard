
import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { designSystem } from "@/lib/design-system"

/**
 * Badge Component - Migrated to Design Token System v2.0
 *
 * Now uses CSS variables and semantic color tokens.
 * All hardcoded colors replaced with design system references.
 */

const badgeVariants = cva(
  `inline-flex items-center ${designSystem.borders.radius.full} border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2`,
  {
    variants: {
      variant: {
        default:
          // Primary badge using CSS variables
          "border-transparent bg-primary text-white hover:bg-primary-hover",
        secondary:
          // Secondary badge with subtle styling
          `border-transparent ${designSystem.background.surface.light} ${designSystem.typography.color.secondary} ${designSystem.background.hover.neutral}`,
        destructive:
          // Destructive/error badge
          `border-transparent ${designSystem.background.surface.inverse} text-white hover:${designSystem.background.surface.deepest}`,
        outline:
          // Outline badge with border
          `${designSystem.typography.color.secondary} border-default`,
        success:
          // Success badge using primary pink
          "border-transparent bg-primary text-white hover:bg-primary-hover",
        warning:
          // Warning badge using gray
          `border-transparent ${designSystem.background.surface.darker} text-white hover:${designSystem.background.surface.darkest}`,
        error:
          // Error badge using dark gray
          `border-transparent ${designSystem.background.surface.inverse} text-white hover:${designSystem.background.surface.deepest}`,
        info:
          // Info badge using medium gray
          `border-transparent ${designSystem.background.surface.darker} text-white hover:${designSystem.background.surface.darkest}`,
      },
      size: {
        default: "px-2.5 py-0.5 text-xs",
        sm: "px-1.5 py-0.5 text-xs",
        lg: "px-3 py-1 text-sm",
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {
  pulse?: boolean
  children?: React.ReactNode
  className?: string
}

const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant = "default", size = "default", pulse, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          badgeVariants({ variant, size }),
          pulse && "animate-pulse",
          className
        )}
        {...props}
      >
        {children}
      </div>
    )
  }
)
Badge.displayName = "Badge"

export { Badge, badgeVariants }
