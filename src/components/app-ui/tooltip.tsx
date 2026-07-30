"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

type TooltipSide = "top" | "right" | "bottom" | "left"

const sideClassName: Record<TooltipSide, string> = {
  top: "bottom-full left-1/2 mb-2 -translate-x-1/2",
  bottom: "top-full left-1/2 mt-2 -translate-x-1/2",
  right: "left-full top-1/2 ml-2 -translate-y-1/2",
  left: "right-full top-1/2 mr-2 -translate-y-1/2",
}

/**
 * Lightweight CSS-only tooltip (hover/focus reveal). No positioning JS and no
 * extra runtime dependency — sufficient for the short static labels this app
 * uses tooltips for.
 */
function Tooltip({
  content,
  side = "top",
  disabled = false,
  className,
  wrapperClassName,
  children,
}: {
  content?: React.ReactNode
  side?: TooltipSide
  disabled?: boolean
  className?: string
  wrapperClassName?: string
  children: React.ReactElement
}) {
  if (disabled || !content) return children

  return (
    <span className={cn("group/tooltip relative inline-flex", wrapperClassName)}>
      {children}
      <span
        role="tooltip"
        className={cn(
          "pointer-events-none absolute z-50 whitespace-nowrap rounded-md bg-foreground px-2 py-1 text-xs font-medium text-background opacity-0 shadow-md transition-opacity duration-150 group-hover/tooltip:opacity-100 group-focus-within/tooltip:opacity-100",
          sideClassName[side],
          className,
        )}
      >
        {content}
      </span>
    </span>
  )
}

export { Tooltip }
