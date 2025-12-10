import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-primary/20 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary: "bg-gradient-to-r from-primary to-primary/90 text-primary-foreground shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 hover:scale-[1.02] active:scale-[0.98]",
        secondary: "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80 border border-border",
        danger: "bg-gradient-to-r from-destructive to-destructive/90 text-destructive-foreground shadow-md shadow-destructive/20 hover:shadow-lg hover:shadow-destructive/30 hover:scale-[1.02] active:scale-[0.98]",
        "outline-primary": "border-[1.5px] border-primary text-primary bg-white hover:bg-primary hover:text-primary-foreground hover:shadow-md hover:shadow-primary/20 transition-all",
        "outline-success": "border-[1.5px] border-green-500 text-green-600 bg-white hover:bg-green-500 hover:text-white hover:shadow-md",
        "outline-danger": "border-[1.5px] border-destructive text-destructive bg-white hover:bg-destructive hover:text-destructive-foreground hover:shadow-md",
        "outline-info": "border-[1.5px] border-border text-foreground bg-white hover:bg-muted",
        "outline-secondary": "border-[1.5px] border-secondary text-secondary-foreground bg-white hover:bg-secondary hover:shadow-sm",
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
