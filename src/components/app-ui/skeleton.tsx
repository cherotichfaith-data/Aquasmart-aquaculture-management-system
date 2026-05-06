import * as React from "react"
import MuiSkeleton from "@mui/material/Skeleton"
import { cn } from "@/lib/utils"

const Skeleton = React.forwardRef<
  HTMLSpanElement,
  React.ComponentPropsWithoutRef<"div"> & {
    animation?: "pulse" | "wave" | false
  }
>(({ className, animation = "pulse", ...props }, ref) => {
  return (
    <MuiSkeleton
      ref={ref}
      data-slot="skeleton"
      animation={animation === "pulse" ? "wave" : animation}
      className={cn("rounded-md", className)}
      {...props}
    />
  )
})

Skeleton.displayName = "Skeleton"

export { Skeleton }
