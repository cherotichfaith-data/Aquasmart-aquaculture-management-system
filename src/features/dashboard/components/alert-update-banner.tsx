"use client"

import { useMemo } from "react"
import { AlertTriangle, BellRing } from "lucide-react"
import { useRouter } from "next/navigation"
import type { RecommendedAction } from "@/features/dashboard/types"
import { useNotifications, type ActiveAlert } from "@/components/notifications/notifications-provider"
import { toDashboardPath } from "@/lib/app-entry"

type BannerItem = {
  id: string
  title: string
  description: string
  severity: "critical" | "warning"
  href?: string
}

const MAX_VISIBLE = 4

function fromRecommendedAction(action: RecommendedAction, index: number): BannerItem {
  return {
    id: `seed:${action.priority}:${action.title}:${index}`,
    title: action.title,
    description: action.description,
    severity: action.priority === "High" ? "critical" : "warning",
  }
}

function fromActiveAlert(alert: ActiveAlert): BannerItem {
  return {
    id: alert.id,
    title: alert.title,
    description: alert.description,
    severity: alert.severity,
    href: alert.href,
  }
}

/**
 * Always-visible strip of the farm's currently-open alert conditions (empty
 * cage, mortality rate high, water quality). Driven by the live `activeAlerts`
 * feed so each entry appears and clears on its own; the server-rendered
 * `alerts` prop is only a first-paint seed while that feed loads.
 */
export default function AlertUpdateBanner({
  alerts,
}: {
  farmId: string
  alerts: RecommendedAction[]
}) {
  const router = useRouter()
  const { activeAlerts, activeAlertsLoading } = useNotifications()

  const items = useMemo<BannerItem[]>(() => {
    if (activeAlertsLoading && activeAlerts.length === 0) {
      return alerts.map(fromRecommendedAction)
    }
    return activeAlerts.map(fromActiveAlert)
  }, [activeAlerts, activeAlertsLoading, alerts])

  if (items.length === 0) return null

  const visible = items.slice(0, MAX_VISIBLE)
  const hiddenCount = items.length - visible.length
  const hasCritical = items.some((item) => item.severity === "critical")
  const Icon = hasCritical ? AlertTriangle : BellRing

  return (
    <div
      className={`mb-3 overflow-hidden rounded-xl border ${
        hasCritical ? "border-destructive/25 bg-destructive/8" : "border-sky-200 bg-sky-50/80"
      }`}
    >
      <div className="flex items-center gap-2 px-3.5 py-2">
        <Icon className={`size-4 shrink-0 ${hasCritical ? "text-destructive" : "text-sky-700"}`} />
        <p className="text-[13px] font-semibold text-foreground">
          {items.length} {items.length === 1 ? "alert needs" : "alerts need"} attention
        </p>
      </div>
      <ul className="divide-y divide-border/50 border-t border-border/50">
        {visible.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              disabled={!item.href}
              onClick={() => item.href && router.push(item.href)}
              className="flex w-full items-start gap-2.5 px-3.5 py-2 text-left transition-colors enabled:hover:bg-background/60"
            >
              <span
                className={`mt-1.5 inline-flex size-2 shrink-0 rounded-full ${
                  item.severity === "critical" ? "bg-destructive" : "bg-sky-500"
                }`}
              />
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] font-semibold leading-5 text-foreground">{item.title}</span>
                <span className="block text-xs leading-5 text-muted-foreground">{item.description}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
      {hiddenCount > 0 ? (
        <button
          type="button"
          onClick={() => router.push(toDashboardPath("/systems"))}
          className="block w-full border-t border-border/50 px-3.5 py-2 text-left text-xs font-semibold text-muted-foreground hover:bg-background/60"
        >
          +{hiddenCount} more — view all
        </button>
      ) : null}
    </div>
  )
}
