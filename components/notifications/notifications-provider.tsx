"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react"
import { createClient } from "@/utils/supabase/client"
import { useActiveFarm } from "@/hooks/use-active-farm"
import { useAuth } from "@/components/auth-provider"
import { useToast } from "@/hooks/use-toast"
import type { Tables } from "@/lib/types/database"

type AlertThresholdRow = Tables<"alert_threshold">
type WaterQualityRow = Tables<"water_quality_measurement">
type DailyInventoryRow = Tables<"daily_fish_inventory_table">
type SystemRow = Tables<"system">

type NotificationKind = "water_quality" | "mortality" | "feeding"
type NotificationSeverity = "warning" | "critical"

export type AlertNotification = {
  id: string
  title: string
  description: string
  createdAt: string
  systemId?: number
  kind: NotificationKind
  severity: NotificationSeverity
  read: boolean
}

type NotificationsContextValue = {
  notifications: AlertNotification[]
  unreadCount: number
  markAllRead: () => void
  markRead: (id: string) => void
  clearAll: () => void
}

const NotificationsContext = createContext<NotificationsContextValue | undefined>(undefined)

const MAX_NOTIFICATIONS = 50

const formatNumber = (value: number, decimals = 2) => Number(value.toFixed(decimals))

const buildSystemLabel = (systemMap: Record<number, string>, systemId?: number) => {
  if (!systemId) return "System"
  return systemMap[systemId] ?? `System ${systemId}`
}

const resolveThreshold = (thresholds: AlertThresholdRow[], systemId?: number | null) => {
  if (!thresholds.length) return null
  if (systemId != null) {
    const systemThreshold = thresholds.find((row) => row.system_id === systemId)
    if (systemThreshold) return systemThreshold
  }
  return thresholds.find((row) => row.scope === "farm" && row.system_id == null) ?? thresholds[0]
}

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { farmId } = useActiveFarm()
  const { profile } = useAuth()
  const { toast } = useToast()
  const [notifications, setNotifications] = useState<AlertNotification[]>([])
  const [thresholds, setThresholds] = useState<AlertThresholdRow[]>([])
  const [systemMap, setSystemMap] = useState<Record<number, string>>({})
  const seenIds = useRef<Set<string>>(new Set())

  const notificationsEnabled = profile?.notifications_enabled ?? true

  const addNotification = useCallback(
    (notification: AlertNotification) => {
      if (seenIds.current.has(notification.id)) return
      seenIds.current.add(notification.id)

      setNotifications((prev) => {
        const next = [notification, ...prev].slice(0, MAX_NOTIFICATIONS)
        return next
      })

      if (notificationsEnabled) {
        toast({
          title: notification.title,
          description: notification.description,
          variant: notification.severity === "critical" ? "destructive" : "default",
        })
      }
    },
    [notificationsEnabled, toast],
  )

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((item) => ({ ...item, read: true })))
  }, [])

  const markRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((item) => (item.id === id ? { ...item, read: true } : item)),
    )
  }, [])

  const clearAll = useCallback(() => {
    setNotifications([])
    seenIds.current.clear()
  }, [])

  const unreadCount = useMemo(() => notifications.filter((item) => !item.read).length, [notifications])

  const loadSystems = useCallback(async () => {
    if (!farmId) return
    const { data, error } = await supabase
      .from("system")
      .select("id,name")
      .eq("farm_id", farmId)

    if (error) {
      console.error("[notifications] Failed to load systems:", error)
      return
    }

    const map: Record<number, string> = {}
    ;(data as Pick<SystemRow, "id" | "name">[] | null)?.forEach((row) => {
      map[row.id] = row.name
    })
    setSystemMap(map)
  }, [farmId, supabase])

  const loadThresholds = useCallback(async () => {
    if (!farmId) return
    const { data, error } = await supabase
      .from("alert_threshold")
      .select("*")
      .eq("farm_id", farmId)

    if (error) {
      console.error("[notifications] Failed to load thresholds:", error)
      return
    }

    setThresholds((data as AlertThresholdRow[]) ?? [])
  }, [farmId, supabase])

  useEffect(() => {
    void loadSystems()
    void loadThresholds()
  }, [loadSystems, loadThresholds])

  useEffect(() => {
    if (!farmId) return

    const thresholdChannel = supabase
      .channel(`alerts-thresholds-${farmId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "alert_threshold", filter: `farm_id=eq.${farmId}` },
        () => {
          void loadThresholds()
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(thresholdChannel)
    }
  }, [farmId, loadThresholds, supabase])

  useEffect(() => {
    if (!farmId) return

    const qualityChannel = supabase
      .channel(`alerts-water-quality-${farmId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "water_quality_measurement" },
        (payload) => {
          const row = payload.new as WaterQualityRow
          if (!row?.system_id) return
          if (Object.keys(systemMap).length && !systemMap[row.system_id]) return

          const threshold = resolveThreshold(thresholds, row.system_id)
          if (!threshold) return

          const systemLabel = buildSystemLabel(systemMap, row.system_id)
          if (row.parameter_name === "dissolved_oxygen" && threshold.low_do_threshold != null) {
            if (row.parameter_value < threshold.low_do_threshold) {
              addNotification({
                id: `wq-do-${row.id}`,
                title: "Low Dissolved Oxygen",
                description: `${systemLabel} DO is ${formatNumber(row.parameter_value)} mg/L (threshold ${formatNumber(
                  threshold.low_do_threshold,
                )}).`,
                createdAt: row.created_at ?? new Date().toISOString(),
                systemId: row.system_id,
                kind: "water_quality",
                severity: "critical",
                read: false,
              })
            }
          }

          if (row.parameter_name === "ammonia_ammonium" && threshold.high_ammonia_threshold != null) {
            if (row.parameter_value > threshold.high_ammonia_threshold) {
              addNotification({
                id: `wq-ammonia-${row.id}`,
                title: "High Ammonia Detected",
                description: `${systemLabel} ammonia is ${formatNumber(row.parameter_value)} mg/L (threshold ${formatNumber(
                  threshold.high_ammonia_threshold,
                )}).`,
                createdAt: row.created_at ?? new Date().toISOString(),
                systemId: row.system_id,
                kind: "water_quality",
                severity: "critical",
                read: false,
              })
            }
          }
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(qualityChannel)
    }
  }, [addNotification, farmId, supabase, systemMap, thresholds])

  useEffect(() => {
    if (!farmId) return

    const mortalityChannel = supabase
      .channel(`alerts-mortality-${farmId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "daily_fish_inventory_table" },
        (payload) => {
          const row = payload.new as DailyInventoryRow
          if (!row?.system_id) return
          if (Object.keys(systemMap).length && !systemMap[row.system_id]) return

          const threshold = resolveThreshold(thresholds, row.system_id)
          if (!threshold) return

          const systemLabel = buildSystemLabel(systemMap, row.system_id)
          if (threshold.high_mortality_threshold != null && row.mortality_rate != null) {
            if (row.mortality_rate > threshold.high_mortality_threshold) {
              addNotification({
                id: `mortality-${row.id}`,
                title: "High Mortality Rate",
                description: `${systemLabel} mortality is ${formatNumber(row.mortality_rate)}% (threshold ${formatNumber(
                  threshold.high_mortality_threshold,
                )}%).`,
                createdAt: row.inventory_date ?? new Date().toISOString(),
                systemId: row.system_id,
                kind: "mortality",
                severity: "critical",
                read: false,
              })
            }
          }

          const feedingRate = row.feeding_rate
          const lowFeed = threshold.low_feeding_rate_threshold
          const highFeed = threshold.high_feeding_rate_threshold

          if (typeof feedingRate === "number") {
            if (typeof lowFeed === "number" && feedingRate < lowFeed) {
              addNotification({
                id: `feeding-low-${row.id}`,
                title: "Low Feeding Rate",
                description: `${systemLabel} feeding rate is ${formatNumber(feedingRate)} kg/t (threshold ${formatNumber(
                  lowFeed,
                )}).`,
                createdAt: row.inventory_date ?? new Date().toISOString(),
                systemId: row.system_id,
                kind: "feeding",
                severity: "warning",
                read: false,
              })
            }
            if (typeof highFeed === "number" && feedingRate > highFeed) {
              addNotification({
                id: `feeding-high-${row.id}`,
                title: "High Feeding Rate",
                description: `${systemLabel} feeding rate is ${formatNumber(feedingRate)} kg/t (threshold ${formatNumber(
                  highFeed,
                )}).`,
                createdAt: row.inventory_date ?? new Date().toISOString(),
                systemId: row.system_id,
                kind: "feeding",
                severity: "warning",
                read: false,
              })
            }
          }
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(mortalityChannel)
    }
  }, [addNotification, farmId, supabase, systemMap, thresholds])

  const value = useMemo(
    () => ({ notifications, unreadCount, markAllRead, markRead, clearAll }),
    [clearAll, markAllRead, markRead, notifications, unreadCount],
  )

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>
}

export function useNotifications() {
  const context = useContext(NotificationsContext)
  if (!context) {
    throw new Error("useNotifications must be used within NotificationsProvider")
  }
  return context
}
