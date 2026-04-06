import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/shared/utils/cn"

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-border-focus focus:ring-offset-1",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary:
          "border-transparent bg-bg-surface-muted text-text-secondary hover:bg-bg-surface-hover",
        destructive:
          "border-status-danger-border bg-status-danger-bg text-status-danger-text hover:bg-status-danger-border/30",
        outline:
          "border-border-default text-text-primary bg-transparent",
        success:
          "border-status-success-border bg-status-success-bg text-status-success-text",
        warning:
          "border-status-warning-border bg-status-warning-bg text-status-warning-text",
        info:
          "border-status-info-border bg-status-info-bg text-status-info-text",
        neutral:
          "border-status-neutral-border bg-status-neutral-bg text-status-neutral-text",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
