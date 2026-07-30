"use client"

import * as React from "react"
import { createPortal } from "react-dom"
import { AlertTriangle, CheckCircle2, Info, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { useToast } from "@/lib/hooks/app/use-toast"
import type { ToastVariant } from "@/lib/hooks/app/use-toast"

const variantConfig: Record<
  ToastVariant,
  { icon: React.ComponentType<React.ComponentProps<typeof Info>>; className: string }
> = {
  default: { icon: Info, className: "border-border bg-foreground text-background" },
  destructive: { icon: AlertTriangle, className: "border-destructive bg-destructive text-destructive-foreground" },
  success: { icon: CheckCircle2, className: "border-success bg-success text-success-foreground" },
  warning: { icon: AlertTriangle, className: "border-warning bg-warning text-warning-foreground" },
}

function ToastItem({
  title,
  description,
  action,
  variant,
  duration,
  onOpenChange,
}: {
  title?: React.ReactNode
  description?: React.ReactNode
  action?: React.ReactNode
  variant?: ToastVariant
  duration?: number
  onOpenChange?: (open: boolean) => void
}) {
  const { icon: Icon, className } = variantConfig[variant ?? "default"]

  React.useEffect(() => {
    const timer = setTimeout(() => onOpenChange?.(false), duration ?? 5000)
    return () => clearTimeout(timer)
  }, [duration, onOpenChange])

  return (
    <div
      role="status"
      className={cn(
        "pointer-events-auto flex w-full min-w-[280px] items-start gap-2.5 rounded-xl border px-4 py-3 shadow-lg animate-in fade-in-0 slide-in-from-top-2 sm:min-w-[360px]",
        className,
      )}
    >
      <Icon size={18} className="mt-0.5 shrink-0" />
      <div className="min-w-0 flex-1">
        {title ? <div className="text-sm font-semibold">{title}</div> : null}
        {description ? <div className="mt-0.5 text-sm opacity-90">{description}</div> : null}
      </div>
      <div className="flex shrink-0 items-center gap-1.5 pt-0.5">
        {action}
        <button
          type="button"
          aria-label="Close"
          onClick={() => onOpenChange?.(false)}
          className="inline-flex size-6 items-center justify-center rounded-md opacity-80 transition-opacity hover:opacity-100"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  )
}

export function Toaster() {
  const { toasts } = useToast()

  if (typeof document === "undefined" || toasts.length === 0) return null

  return createPortal(
    <div className="pointer-events-none fixed right-4 top-4 z-[200] flex w-full max-w-sm flex-col gap-2.5">
      {toasts
        .filter((t) => t.open !== false)
        .map(({ id, title, description, action, variant, duration, onOpenChange }) => (
          <ToastItem
            key={id}
            title={title}
            description={description}
            action={action}
            variant={variant}
            duration={duration}
            onOpenChange={onOpenChange}
          />
        ))}
    </div>,
    document.body,
  )
}
