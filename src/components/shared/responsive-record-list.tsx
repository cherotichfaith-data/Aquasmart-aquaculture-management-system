"use client"

import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

/**
 * Card-list rendering for "record-heavy" data below `md` -- one row read at
 * a time (a cage, a batch, a log entry) rather than compared side-by-side.
 * DataTable's own mobile mode (components/shared/data-table.tsx) and the
 * report record tables (features/reports/components) both render through
 * this, so there's exactly one card/empty/loading treatment in the app
 * instead of a slightly different one per table.
 */
export function ResponsiveRecordList<TRow>({
  data,
  rowKey,
  renderCard,
  onRowClick,
  loading = false,
  loadingMessage = "Loading...",
  emptyMessage = "No results.",
  className,
}: {
  data: TRow[]
  rowKey: (row: TRow) => string | number
  renderCard: (row: TRow) => ReactNode
  onRowClick?: (row: TRow) => void
  loading?: boolean
  loadingMessage?: ReactNode
  emptyMessage?: ReactNode
  className?: string
}) {
  const cardClassName = "w-full rounded-lg border border-border/70 bg-background p-3 text-left transition-colors"

  return (
    <div className={cn("grid gap-3", className)}>
      {loading ? (
        <div className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
          {loadingMessage}
        </div>
      ) : data.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
          {emptyMessage}
        </div>
      ) : (
        data.map((row) => {
          const key = rowKey(row)
          const body = renderCard(row)

          return onRowClick ? (
            <button
              key={key}
              type="button"
              onClick={() => onRowClick(row)}
              className={cn(cardClassName, "hover:bg-muted/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring")}
            >
              {body}
            </button>
          ) : (
            <div key={key} className={cardClassName}>
              {body}
            </div>
          )
        })
      )}
    </div>
  )
}
