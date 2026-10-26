import * as React from "react"
import { cn } from "@/lib/utils"

const Skeleton = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<"div"> & {
    animation?: "pulse" | "wave" | false
  }
>(({ className, animation = "pulse", ...props }, ref) => {
  return (
    <div
      ref={ref}
      data-slot="skeleton"
      className={cn(
        "rounded-md bg-muted/60",
        animation !== false && "animate-pulse",
        className,
      )}
      {...props}
    />
  )
})

Skeleton.displayName = "Skeleton"

export { Skeleton }
