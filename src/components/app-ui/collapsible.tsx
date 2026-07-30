import * as React from "react"
import { cn } from "@/lib/utils"

/**
 * Pure-CSS expand/collapse using the grid-template-rows 0fr/1fr technique.
 * Animates height without JS measurement (no ResizeObserver needed).
 */
function Collapsible({
  open,
  className,
  children,
  ...props
}: React.ComponentProps<"div"> & { open: boolean }) {
  return (
    <div
      data-slot="collapsible"
      data-state={open ? "open" : "closed"}
      className={cn(
        "grid transition-[grid-template-rows] duration-200 ease-out",
        open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        className,
      )}
      {...props}
    >
      <div className="overflow-hidden">{children}</div>
    </div>
  )
}

export { Collapsible }
