import * as React from "react"
import { cn } from "@/lib/utils"

interface RowProps extends React.HTMLAttributes<HTMLDivElement> {}

const Row = React.forwardRef<HTMLDivElement, RowProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("flex flex-wrap", className)}
      {...props}
    />
  )
)
Row.displayName = "Row"

interface ColProps extends React.HTMLAttributes<HTMLDivElement> {
  md?: number
  sm?: number
  xs?: number
}

const Col = React.forwardRef<HTMLDivElement, ColProps>(
  ({ className, md, sm, xs, ...props }, ref) => {
    const colClasses = []
    if (md) colClasses.push(`md:w-${md}/12`)
    if (sm) colClasses.push(`sm:w-${sm}/12`)
    if (xs) colClasses.push(`w-${xs}/12`)

    return (
      <div
        ref={ref}
        className={cn(colClasses.join(" "), className)}
        {...props}
      />
    )
  }
)
Col.displayName = "Col"

export { Row, Col }