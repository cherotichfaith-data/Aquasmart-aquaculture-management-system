import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

/**
 * The 2-column label/value tile grid used inside every mobile record card
 * (see ResponsiveRecordList) -- one shared look for "Fish 1,240 / eFCR 1.42"
 * style facts instead of each table hand-rolling its own tile markup.
 */
export function MetricGrid({ items, className }: { items: Array<{ label: string; value: ReactNode }>; className?: string }) {
  return (
    <div className={cn("mt-3 grid grid-cols-2 gap-2 text-xs", className)}>
      {items.map((item) => (
        <div key={item.label} className="rounded-md bg-muted/45 px-2.5 py-2">
          <p className="text-micro font-semibold uppercase tracking-wide text-muted-foreground">{item.label}</p>
          <p className="mt-0.5 font-semibold text-foreground">{item.value}</p>
        </div>
      ))}
    </div>
  )
}
