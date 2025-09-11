import * as React from "react"
import { cn } from "@/lib/utils"

export interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number
  max: number
  indicatorColor?: string
  size?: "default" | "sm" | "lg"
  showValue?: boolean
  formatValue?: (value: number, max: number) => string
}

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ className, value = 0, max = 100, indicatorColor, size = "default", showValue = false, formatValue, ...props }, ref) => {
    const percentage = value >= max ? 100 : (value / max) * 100
    
    const sizeClasses = {
      default: "h-2",
      sm: "h-1",
      lg: "h-3",
    }
    
    return (
      <div className="flex items-center space-x-2 w-full">
        <div
          ref={ref}
          className={cn(
            "w-full overflow-hidden rounded-full bg-secondary",
            sizeClasses[size],
            className
          )}
          {...props}
        >
          <div
            className={cn(
              "h-full transition-all",
              indicatorColor || "bg-primary"
            )}
            style={{ width: `${percentage}%` }}
          />
        </div>
        {showValue && (
          <div className="text-sm font-medium">
            {formatValue ? formatValue(value, max) : `${Math.round(percentage)}%`}
          </div>
        )}
      </div>
    )
  }
)

Progress.displayName = "Progress"

export { Progress } 