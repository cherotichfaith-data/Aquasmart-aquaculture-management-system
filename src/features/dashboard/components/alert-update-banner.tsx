"use client"

import { useEffect, useMemo, useState } from "react"
import { AlertTriangle, BellRing, Info } from "lucide-react"
import type { RecommendedAction } from "@/features/dashboard/types"
import { useNotifications } from "@/components/notifications/notifications-provider"

type BannerAlert = {
  id: string
  title: string
  description: string
  priority: RecommendedAction["priority"]
  sortTime: string | null
}

const PRIORITY_STYLES: Record<
  RecommendedAction["priority"],
  {
    icon: typeof AlertTriangle
    containerClassName: string
    iconClassName: string
    accentClassName: string
    dotClassName: string
  }
> = {
  High: {
    icon: AlertTriangle,
    containerClassName: "border-destructive/20 bg-destructive/8",
    iconClassName: "text-destructive",
    accentClassName: "bg-destructive",
    dotClassName: "bg-destructive",
  },
  Medium: {
    icon: BellRing,
    containerClassName: "border-sky-200 bg-sky-50/80",
    iconClassName: "text-sky-700",
    accentClassName: "bg-sky-500",
    dotClassName: "bg-sky-500",
  },
  Info: {
    icon: Info,
    containerClassName: "border-teal-200 bg-teal-50/80",
    iconClassName: "text-teal-700",
    accentClassName: "bg-teal-500",
    dotClassName: "bg-teal-500",
  },
}

function buildAlertIdentity(alert: BannerAlert) {
  return alert.id
}

export default function AlertUpdateBanner({
  farmId,
  alerts,
}: {
  farmId: string
  alerts: RecommendedAction[]
}) {
  const { notifications } = useNotifications()
  const [selectedAlertId, setSelectedAlertId] = useState<string | null>(null)
  const storageKey = useMemo(() => `dashboard-alert-update-${farmId}`, [farmId])
  const bannerAlerts = useMemo<BannerAlert[]>(() => {
    const notificationAlerts: BannerAlert[] = notifications
      .filter((notification) => notification.kind === "water_quality" || notification.kind === "mortality" || notification.kind === "cage_empty")
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
      .map((notification) => ({
        id: `notification:${notification.kind}`,
        title: notification.title,
        description: notification.description,
        priority: notification.severity === "critical" ? "High" : "Medium",
        sortTime: notification.createdAt,
      }))

    const recommendedAlerts: BannerAlert[] = alerts.map((alert) => ({
      id: `recommended:${alert.priority}:${alert.title}`,
      title: alert.title,
      description: alert.description,
      priority: alert.priority,
      sortTime: null,
    }))

    const deduped = new Map<string, BannerAlert>()
    for (const item of [...notificationAlerts, ...recommendedAlerts]) {
      if (!deduped.has(item.id)) deduped.set(item.id, item)
    }

    return Array.from(deduped.values()).sort((left, right) => {
      const priorityDelta =
        (left.priority === "High" ? 0 : left.priority === "Medium" ? 1 : 2) -
        (right.priority === "High" ? 0 : right.priority === "Medium" ? 1 : 2)
      if (priorityDelta !== 0) return priorityDelta
      if (left.sortTime && right.sortTime && left.sortTime !== right.sortTime) {
        return right.sortTime.localeCompare(left.sortTime)
      }
      if (left.sortTime && !right.sortTime) return -1
      if (!left.sortTime && right.sortTime) return 1
      return left.title.localeCompare(right.title)
    })
  }, [alerts, notifications])

  const activeAlert = useMemo(() => {
    if (!bannerAlerts.length) return null
    const persisted = selectedAlertId ? bannerAlerts.find((alert) => buildAlertIdentity(alert) === selectedAlertId) : null
    return persisted ?? bannerAlerts[0]
  }, [bannerAlerts, selectedAlertId])

  useEffect(() => {
    if (typeof window === "undefined") return
    try {
      const stored = window.localStorage.getItem(storageKey)
      setSelectedAlertId(stored || null)
    } catch {
      setSelectedAlertId(null)
    }
  }, [storageKey])

  useEffect(() => {
    if (typeof window === "undefined") return

    if (!bannerAlerts.length) {
      setSelectedAlertId(null)
      try {
        window.localStorage.removeItem(storageKey)
      } catch {
        // Ignore storage errors.
      }
      return
    }

    const hasPersistedAlert = selectedAlertId
      ? bannerAlerts.some((alert) => buildAlertIdentity(alert) === selectedAlertId)
      : false

    if (hasPersistedAlert) return

    const nextAlertId = buildAlertIdentity(bannerAlerts[0])
    setSelectedAlertId(nextAlertId)
    try {
      window.localStorage.setItem(storageKey, nextAlertId)
    } catch {
      // Ignore storage errors.
    }
  }, [bannerAlerts, selectedAlertId, storageKey])

  if (!activeAlert) return null

  const styles = PRIORITY_STYLES[activeAlert.priority]
  const Icon = styles.icon

  return (
    <div className={`relative mb-3 overflow-hidden rounded-xl border px-3.5 py-3 shadow-none ${styles.containerClassName}`}>
      <div className={`absolute inset-y-0 left-0 w-1 ${styles.accentClassName}`} />
      <div className="flex items-start gap-2.5 pl-1">
        <div className="mt-0.5 rounded-full bg-background/85 p-1.5 ring-1 ring-border/40">
          <Icon className={`size-3.5 ${styles.iconClassName}`} />
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-center gap-2">
            <span className={`inline-flex size-2 rounded-full ${styles.dotClassName}`} />
            <p className="text-[13px] font-semibold leading-5 text-foreground">{activeAlert.title}</p>
          </div>
          <p className="text-xs leading-5 text-muted-foreground">{activeAlert.description}</p>
        </div>
      </div>
    </div>
  )
}
