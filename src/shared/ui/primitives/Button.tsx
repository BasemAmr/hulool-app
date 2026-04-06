import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/shared/utils/cn"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary:
          "bg-action-primary text-primary-foreground hover:bg-primary/90 shadow-sm",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border-default shadow-sm",
        danger:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-sm",
        "outline-primary":
          "border border-primary text-primary bg-transparent hover:bg-primary hover:text-primary-foreground transition-colors",
        "outline-success":
          "border border-status-success-border text-status-success-text bg-transparent hover:bg-status-success-bg transition-colors",
        "outline-danger":
          "border border-destructive text-destructive bg-transparent hover:bg-destructive hover:text-destructive-foreground transition-colors",
        "outline-info":
          "border border-border-default text-text-primary bg-transparent hover:bg-bg-surface-muted transition-colors",
        "outline-secondary":
          "border border-border-default text-text-secondary bg-transparent hover:bg-bg-surface-muted transition-colors",
      },
      size: {
        sm: "h-8 rounded-lg px-3 text-xs",
        lg: "h-11 rounded-lg px-8 text-base",
        default: "h-10 px-5 py-2",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  isLoading?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, isLoading = false, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={isLoading || props.disabled}
        {...props}
      >
        {isLoading ? (
          <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        ) : props.children}
      </button>
    )
  }
)
Button.displayName = "Button"

export default Button
