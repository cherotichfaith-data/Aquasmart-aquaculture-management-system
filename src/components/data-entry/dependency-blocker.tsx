"use client"

import type { ReactNode } from "react"
import { Button } from "@/components/ui/button"

interface DependencyBlockerProps {
  title: string
  description?: string
  actionLabel?: string
  onAction?: () => void
  children?: ReactNode
}

export function DependencyBlocker({
  title,
  description,
  actionLabel,
  onAction,
  children,
}: DependencyBlockerProps) {
  return (
    <div className="max-w-2xl rounded-xl border border-dashed border-border/80 bg-muted/30 p-6">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {actionLabel && onAction ? (
        <div className="mt-4">
          <Button type="button" onClick={onAction}>
            {actionLabel}
          </Button>
        </div>
      ) : null}
      {children ? <div className="mt-6">{children}</div> : null}
    </div>
  )
}
