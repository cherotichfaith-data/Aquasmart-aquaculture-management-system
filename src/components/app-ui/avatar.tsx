import * as React from "react"
import { cn } from "@/lib/utils"

function Avatar({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="avatar"
      className={cn(
        "relative inline-flex size-9 shrink-0 select-none items-center justify-center overflow-hidden rounded-full bg-primary text-sm font-bold text-primary-foreground",
        className,
      )}
      {...props}
    />
  )
}

export { Avatar }
