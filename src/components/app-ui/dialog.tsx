"use client"

import type React from "react"
import { useEffect } from "react"
import { createPortal } from "react-dom"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

export interface DialogPropsCompat extends Omit<React.ComponentPropsWithoutRef<"div">, "title" | "onClose"> {
  open: boolean
  onClose: () => void
  title?: React.ReactNode
  description?: React.ReactNode
  actions?: React.ReactNode
  showCloseButton?: boolean
  maxWidth?: "xs" | "sm" | "md" | "lg" | "xl" | false
}

export function Dialog({
  open,
  onClose,
  title,
  description,
  actions,
  showCloseButton = true,
  maxWidth = "sm",
  children,
  className,
}: DialogPropsCompat) {
  useEffect(() => {
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

  const widthClassName =
    maxWidth === "xs"
      ? "max-w-md"
      : maxWidth === "md"
        ? "max-w-2xl"
        : maxWidth === "lg"
          ? "max-w-4xl"
          : maxWidth === "xl"
            ? "max-w-6xl"
            : maxWidth === false
              ? "max-w-none"
              : "max-w-lg"

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close dialog"
        className="absolute inset-0 bg-black/45"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          "relative z-[101] w-full rounded-xl border bg-card text-card-foreground shadow-xl",
          widthClassName,
          className,
        )}
      >
        {(title || description || showCloseButton) && (
          <div className="relative border-b px-6 py-4">
            {title ? <div className="pr-8 text-lg font-semibold tracking-tight">{title}</div> : null}
            {description ? <div className="mt-1 text-sm text-muted-foreground">{description}</div> : null}
            {showCloseButton ? (
              <button
                type="button"
                aria-label="Close dialog"
                onClick={onClose}
                className="absolute right-4 top-4 inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                <X size={16} />
              </button>
            ) : null}
          </div>
        )}
        <div className="px-6 py-4">{children}</div>
        {actions ? <div className="flex flex-wrap justify-end gap-2 px-6 pb-5">{actions}</div> : null}
      </div>
    </div>,
    document.body,
  )
}
