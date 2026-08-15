import type { ReactNode } from "react"
import { Card, CardContent } from "@/components/app-ui/card"

/** Plain count/metric tile -- no trend arrow, no chart. Used by overview-style
 * pages (Home, Cages) that want a quick "at a glance" number, as opposed to
 * the analytics pages' KPI cards which carry period-over-period trends. */
export function StatCard({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <Card className="rounded-2xl">
      <CardContent className="pt-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="mt-1.5 text-2xl font-bold text-foreground">{value}</p>
        {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
      </CardContent>
    </Card>
  )
}
