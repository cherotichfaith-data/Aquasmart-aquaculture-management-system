"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import Button from "@mui/material/Button"
import { createClient } from "@/lib/supabase/client"
import { isSbPermissionDenied, logSbError } from "@/lib/supabase/log"
import { useActiveFarm } from "@/lib/hooks/app/use-active-farm"
import { useAuth } from "@/components/providers/auth-provider"
import { useToast } from "@/lib/hooks/app/use-toast"
import { useRouter } from "next/navigation"
import { DATA_ENTRY_PATH, toDashboardPath } from "@/lib/app-entry"
import { formatNumberValue } from "@/lib/analytics-format"
import type { Tables } from "@/lib/types/database"
import { formatCageLabel } from "@/lib/system-options"

type AlertThresholdRow = Tables<"alert_threshold">
type WaterQualityRow = Tables<"water_quality_measurement">
type MortalityRow = Tables<"fish_mortality">
type SystemRow = Tables<"system">

type NotificationKind = "water_quality" | "mortality"
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
  href?: string
  actionLabel?: string
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

const formatPercent = (value: number, decimals = 2) =>
  formatNumberValue(value * 100, { decimals, minimumDecimals: decimals, fallback: "0" })

const isAbortLikeError = (err: unknown): boolean => {
  if (!err) return false
  const e = err as { name?: string; message?: string }
  const name = String(e.name ?? "").toLowerCase()
  const message = String(e.message ?? "").toLowerCase()
  return name.includes("abort") || name.includes("cancel") || message.includes("abort") || message.includes("cancel")
}

const buildSystemLabel = (systemMap: Record<number, string>, systemId?: number) => {
  if (!systemId) return "System"
  return systemMap[systemId] ?? "Missing cage name"
}

const hasMissingSystemName = (system: { name?: string | null }) => !system.name?.trim()

const resolveThreshold = (thresholds: AlertThresholdRow[], systemId?: number | null) => {
  if (!thresholds.length) return null
  if (systemId != null) {
    const systemThreshold = thresholds.find((row) => row.system_id === systemId)
    if (systemThreshold) return systemThreshold
  }
  return thresholds.find((row) => row.scope === "farm" && row.system_id == null) ?? thresholds[0]
}

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const supabase = useMemo(() => createClient(), [])
  const queryClient = useQueryClient()
  const router = useRouter()
  const { farmId } = useActiveFarm()
  const { profile, session, user } = useAuth()
  const { toast } = useToast()
  const userId = user?.id ?? null
  const [notifications, setNotifications] = useState<AlertNotification[]>([])
  const seenIds = useRef<Set<string>>(new Set())
  const storageKey = farmId ? `aqua_alert_history_${farmId}` : "aqua_alert_history"

  const notificationsEnabled = profile?.notifications_enabled ?? true
  const systemsQuery = useQuery({
    queryKey: ["notifications", "systems", farmId ?? "none"],
    enabled: Boolean(session) && Boolean(farmId),
    staleTime: 60_000,
    queryFn: async ({ signal }) => {
      let query = supabase
        .from("system")
        .select("id, name")
        .eq("farm_id", farmId!)
        .eq("is_active", true)
        .order("name", { ascending: true })
      if (signal) query = query.abortSignal(signal)
      const { data, error } = await query

      if (error) {
        if (!signal?.aborted && !isAbortLikeError(error) && !isSbPermissionDenied(error)) {
          logSbError("notifications:systems", error)
        }
        return [] as Array<{ id: number; label: string | null }>
      }

      const mapped = ((data ?? []) as Pick<SystemRow, "id" | "name">[])
        .filter((row) => typeof row.id === "number")
        .map((row) => ({
          id: row.id,
          label: row.name,
        }))
      return mapped
    },
  })
  const thresholdsQuery = useQuery({
    queryKey: ["notifications", "thresholds", farmId ?? "none"],
    enabled: Boolean(session) && Boolean(farmId),
    staleTime: 60_000,
    queryFn: async ({ signal }) => {
      let query = supabase
        .from("alert_threshold")
        .select("*")
        .or(`farm_id.eq.${farmId!},scope.eq.default`)
      if (signal) query = query.abortSignal(signal)
      const { data, error } = await query
      if (error) {
        if (!signal?.aborted && !isAbortLikeError(error) && !isSbPermissionDenied(error)) {
          logSbError("notifications:thresholds", error)
        }
        return [] as AlertThresholdRow[]
      }

      return (data as AlertThresholdRow[]) ?? []
    },
  })

  const thresholds = thresholdsQuery.data ?? []
  const systemMap = useMemo(() => {
    const map: Record<number, string> = {}
    ;(systemsQuery.data ?? []).forEach((row) => {
      map[row.id] = formatCageLabel({ id: row.id, label: row.label, unit: null })
    })
    return map
  }, [systemsQuery.data])

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
          action: notification.href ? (
            <Button size="small" color="inherit" onClick={() => router.push(notification.href!)}>
              {notification.actionLabel ?? "View"}
            </Button>
          ) : undefined,
        })
      }
    },
    [notificationsEnabled, router, toast],
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

  const systemsLoaded = systemsQuery.isSuccess
  const thresholdsLoaded = thresholdsQuery.isSuccess

  useEffect(() => {
    if (!session || !farmId || !systemsLoaded) return

    ;(systemsQuery.data ?? []).forEach((system) => {
      if (!hasMissingSystemName({ name: system.label })) return

      addNotification({
        id: `system-missing-name-${system.id}`,
        title: "Cage Name Missing",
        description: "An active cage is missing its name. Update system setup before recording more farm activity.",
        createdAt: new Date().toISOString(),
        systemId: system.id,
        kind: "water_quality",
        severity: "warning",
        read: false,
        href: DATA_ENTRY_PATH + "?type=system",
        actionLabel: "Update",
      })
    })
  }, [addNotification, farmId, session, systemsLoaded, systemsQuery.data])

  useEffect(() => {
    if (typeof window === "undefined") return
    try {
      const raw = window.localStorage.getItem(storageKey)
      if (!raw) {
        setNotifications([])
        seenIds.current.clear()
        return
      }
      const parsed = JSON.parse(raw) as AlertNotification[]
      if (!Array.isArray(parsed)) return
      const normalized = parsed
        .filter((item) => item && typeof item.id === "string")
        .slice(0, MAX_NOTIFICATIONS)
      setNotifications(normalized)
      seenIds.current = new Set(normalized.map((item) => item.id))
    } catch {
      // Ignore malformed local history.
    }
  }, [storageKey])

  useEffect(() => {
    if (typeof window === "undefined") return
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(notifications.slice(0, MAX_NOTIFICATIONS)))
    } catch {
      // Ignore storage write errors.
    }
  }, [notifications, storageKey])

  useEffect(() => {
    if (!farmId || !session || !userId) return

    const thresholdChannel = supabase
      .channel(`alerts-thresholds-${farmId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "alert_threshold", filter: `farm_id=eq.${farmId}` },
        () => {
          void queryClient.invalidateQueries({ queryKey: ["notifications", "thresholds", farmId] })
        },
      )
      .subscribe()
    const userSettingsChannel = supabase
      .channel(`alerts-user-settings-${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "user_settings", filter: `user_id=eq.${userId}` },
        () => {
          void queryClient.invalidateQueries({ queryKey: ["notifications", "thresholds", farmId] })
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(thresholdChannel)
      supabase.removeChannel(userSettingsChannel)
    }
  }, [farmId, queryClient, session, supabase, userId])

  useEffect(() => {
    if (!session || !farmId || !systemsLoaded || !thresholdsLoaded || !thresholds.length) return

    // Only subscribe to system_ids that belong to this farm.
    // water_quality_measurement has no direct farm_id column, so we filter by
    // the known set of system IDs instead.
    const farmSystemIds = (systemsQuery.data ?? []).map((s) => s.id)
    if (!farmSystemIds.length) return

    const qualityChannel = supabase
      .channel(`alerts-water-quality-${farmId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "water_quality_measurement",
          filter: `system_id=in.(${farmSystemIds.join(",")})`,
        },
        (payload) => {
          const row = payload.new as WaterQualityRow
          if (!row?.system_id) return
          if (!systemMap[row.system_id]) return

          const threshold = resolveThreshold(thresholds, row.system_id)
          if (!threshold) return

          const systemLabel = buildSystemLabel(systemMap, row.system_id)
          if (row.parameter_name === "dissolved_oxygen" && threshold.low_do_threshold != null) {
            if (row.parameter_value < threshold.low_do_threshold) {
              addNotification({
                id: `wq-do-${row.id}`,
                title: "Low Dissolved Oxygen",
                description: `${systemLabel} DO is ${formatNumberValue(row.parameter_value, { decimals: 2, minimumDecimals: 2, fallback: "0" })} mg/L (threshold ${formatNumberValue(
                  threshold.low_do_threshold,
                  { decimals: 2, minimumDecimals: 2, fallback: "0" },
                )}).`,
                createdAt: row.created_at ?? new Date().toISOString(),
                systemId: row.system_id,
                kind: "water_quality",
                severity: "critical",
                read: false,
                href: `${toDashboardPath("/water-quality")}?system=${row.system_id}`,
                actionLabel: "View water quality",
              })
            }
          }

          if (row.parameter_name === "ammonia" && threshold.high_ammonia_threshold != null) {
            if (row.parameter_value > threshold.high_ammonia_threshold) {
              addNotification({
                id: `wq-ammonia-${row.id}`,
                title: "High Ammonia Detected",
                description: `${systemLabel} ammonia is ${formatNumberValue(row.parameter_value, { decimals: 2, minimumDecimals: 2, fallback: "0" })} mg/L (threshold ${formatNumberValue(
                  threshold.high_ammonia_threshold,
                  { decimals: 2, minimumDecimals: 2, fallback: "0" },
                )}).`,
                createdAt: row.created_at ?? new Date().toISOString(),
                systemId: row.system_id,
                kind: "water_quality",
                severity: "critical",
                read: false,
                href: `${toDashboardPath("/water-quality")}?system=${row.system_id}`,
                actionLabel: "View water quality",
              })
            }
          }
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(qualityChannel)
    }
  }, [addNotification, farmId, session, supabase, systemMap, systemsLoaded, systemsQuery.data, thresholdsLoaded, thresholds])

  useEffect(() => {
    if (!session || !farmId || !systemsLoaded || !thresholdsLoaded || !thresholds.length) return

    const farmSystemIds = (systemsQuery.data ?? []).map((s) => s.id)
    if (!farmSystemIds.length) return

    const mortalityChannel = supabase
      .channel(`alerts-mortality-${farmId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "fish_mortality",
          filter: `system_id=in.(${farmSystemIds.join(",")})`,
        },
        (payload) => {
          const row = payload.new as MortalityRow
          if (!row?.system_id) return
          if (!systemMap[row.system_id]) return

          const threshold = resolveThreshold(thresholds, row.system_id)
          if (!threshold) return

          const systemLabel = buildSystemLabel(systemMap, row.system_id)
          if (row.is_mass_mortality || row.number_of_fish_mortality > 0) {
              addNotification({
                id: `mortality-${row.id}`,
                title: row.is_mass_mortality ? "Mass Mortality Recorded" : "Mortality Recorded",
                description: `${systemLabel} recorded ${formatNumberValue(row.number_of_fish_mortality, {
                  decimals: 0,
                  minimumDecimals: 0,
                  fallback: "0",
                })} mortality event(s).`,
                createdAt: row.created_at ?? new Date().toISOString(),
                systemId: row.system_id,
                kind: "mortality",
                severity: row.is_mass_mortality ? "critical" : "warning",
                read: false,
                href: `${toDashboardPath("/reports")}?tab=mortality&system=${row.system_id}`,
                actionLabel: "View mortality",
              })
          }
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(mortalityChannel)
    }
  }, [addNotification, farmId, session, supabase, systemMap, systemsLoaded, systemsQuery.data, thresholdsLoaded, thresholds])

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
