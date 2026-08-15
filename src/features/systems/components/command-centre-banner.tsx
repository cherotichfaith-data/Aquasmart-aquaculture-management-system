import { AlertTriangle } from "lucide-react"
import { mergeRecommendedActionRows } from "@/features/dashboard/analytics-rpc-shared"
import type { RecommendedActionRow } from "@/lib/types/insights"

/** Top-of-page critical banner, shown only when at least one high-priority
 * recommended action is open. Reuses the same row→description logic the
 * Alerts widget already applies (mergeRecommendedActionRows) rather than
 * re-deriving it, so the two surfaces never disagree about what's critical. */
export default function CommandCentreBanner({ alerts }: { alerts: RecommendedActionRow[] }) {
  const merged = mergeRecommendedActionRows(alerts)
  const critical = merged.filter((action) => action.priority === "High")

  if (critical.length === 0) return null

  return (
    <div className="flex items-start gap-2.5 rounded-r-md border-l-[3px] border-destructive bg-destructive/10 px-3.5 py-3">
      <AlertTriangle size={16} className="mt-0.5 shrink-0 text-destructive" />
      <p className="text-dense leading-5 text-foreground">
        {critical.map((action, index) => (
          <span key={action.title}>
            {index > 0 ? <span className="mx-2 text-muted-foreground">|</span> : null}
            <strong className="font-semibold">{action.title}:</strong> {action.description}
          </span>
        ))}
      </p>
    </div>
  )
}
