"use client"

import * as React from "react"
import { createPortal } from "react-dom"
import { cn } from "@/lib/utils"

type Align = "start" | "end" | "center"
type Side = "bottom" | "top" | "right"

type Position = { top: number; left: number; minWidth: number }

function computePosition(anchor: HTMLElement, side: Side, align: Align, sideOffset: number): Position {
  const rect = anchor.getBoundingClientRect()

  if (side === "right") {
    return {
      top: rect.top + rect.height / 2,
      left: rect.right + sideOffset,
      minWidth: 0,
    }
  }

  const top = side === "top" ? rect.top - sideOffset : rect.bottom + sideOffset
  const left = align === "end" ? rect.right : align === "center" ? rect.left + rect.width / 2 : rect.left

  return { top, left, minWidth: rect.width }
}

/**
 * Anchored floating panel: portals to document.body, positions itself next
 * to a trigger element, and closes on outside click / Escape / route change.
 * Hand-rolled (no Radix Popover dependency available in this environment).
 */
export function AnchoredPopover({
  open,
  anchorEl,
  onClose,
  side = "bottom",
  align = "start",
  sideOffset = 8,
  className,
  children,
}: {
  open: boolean
  anchorEl: HTMLElement | null
  onClose: () => void
  side?: Side
  align?: Align
  sideOffset?: number
  className?: string
  children: React.ReactNode
}) {
  const panelRef = React.useRef<HTMLDivElement>(null)
  const [position, setPosition] = React.useState<Position | null>(null)

  React.useEffect(() => {
    if (!open || !anchorEl) {
      setPosition(null)
      return
    }

    const update = () => setPosition(computePosition(anchorEl, side, align, sideOffset))
    update()

    window.addEventListener("resize", update)
    window.addEventListener("scroll", update, true)
    return () => {
      window.removeEventListener("resize", update)
      window.removeEventListener("scroll", update, true)
    }
  }, [align, anchorEl, open, side, sideOffset])

  React.useEffect(() => {
    if (!open) return

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node
      if (panelRef.current?.contains(target)) return
      if (anchorEl?.contains(target)) return
      onClose()
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose()
    }

    document.addEventListener("pointerdown", onPointerDown)
    window.addEventListener("keydown", onKeyDown)
    return () => {
      document.removeEventListener("pointerdown", onPointerDown)
      window.removeEventListener("keydown", onKeyDown)
    }
  }, [anchorEl, onClose, open])

  if (!open || !position || typeof document === "undefined") return null

  const translate =
    side === "right"
      ? "translateY(-50%)"
      : align === "end"
        ? "translate(-100%, 0)"
        : align === "center"
          ? "translate(-50%, 0)"
          : side === "top"
            ? "translate(0, -100%)"
            : "none"

  return createPortal(
    <div
      ref={panelRef}
      role="dialog"
      style={{
        position: "fixed",
        top: position.top,
        left: position.left,
        minWidth: position.minWidth || undefined,
        transform: translate,
      }}
      className={cn(
        "z-50 animate-in fade-in-0 zoom-in-95 rounded-lg border border-border bg-popover text-popover-foreground shadow-lg",
        className,
      )}
    >
      {children}
    </div>,
    document.body,
  )
}
