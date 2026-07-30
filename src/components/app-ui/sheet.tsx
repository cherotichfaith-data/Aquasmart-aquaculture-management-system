"use client"

import * as React from "react"
import { createPortal } from "react-dom"
import { cn } from "@/lib/utils"

type SheetSide = "left" | "right" | "bottom"

const sideClassName: Record<SheetSide, string> = {
  left: "inset-y-0 left-0 h-full animate-in slide-in-from-left duration-200",
  right: "inset-y-0 right-0 h-full animate-in slide-in-from-right duration-200",
  bottom: "inset-x-0 bottom-0 w-full max-h-[85vh] rounded-t-3xl animate-in slide-in-from-bottom duration-200",
}

/**
 * Slide-in panel (mobile nav drawer / bottom filter sheet). Hand-rolled with
 * a portal, matching the pattern already used by app-ui/dialog.tsx, instead
 * of pulling in a dedicated drawer dependency.
 */
export function Sheet({
  open,
  onClose,
  side = "left",
  className,
  containerClassName,
  children,
}: {
  open: boolean
  onClose: () => void
  side?: SheetSide
  className?: string
  /**
   * Extra classes for the outer fixed/portaled container (e.g. "md:hidden").
   * Needed because this renders via a portal straight to document.body, so a
   * responsive-visibility class on whatever wraps <Sheet/> in the component
   * tree has no effect on the actual rendered DOM — it has to live here.
   */
  containerClassName?: string
  children: React.ReactNode
}) {
  React.useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose()
    }
    document.body.style.overflow = "hidden"
    window.addEventListener("keydown", onKeyDown)
    return () => {
      document.body.style.overflow = ""
      window.removeEventListener("keydown", onKeyDown)
    }
  }, [open, onClose])

  if (!open || typeof document === "undefined") return null

  return createPortal(
    <div className={cn("fixed inset-0 z-[100]", containerClassName)}>
      <button
        type="button"
        aria-label="Close panel"
        className="absolute inset-0 bg-black/45"
        onClick={onClose}
      />
      <div
        className={cn(
          "absolute overflow-y-auto bg-card text-card-foreground shadow-xl",
          sideClassName[side],
          className,
        )}
      >
        {children}
      </div>
    </div>,
    document.body,
  )
}
