"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type SetStateAction } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/app-ui/button"
import { createClient } from "@/lib/supabase/client"
import { isSbPermissionDenied, logSbError } from "@/lib/supabase/log"
import { useActiveFarm } from "@/lib/hooks/app/use-active-farm"
import { useStockedSystemIds } from "@/lib/hooks/use-stocked-system-ids"
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
type HarvestRow = Tables<"fish_harvest">
type TransferRow = Tables<"fish_transfer">

type NotificationKind = "water_quality" | "mortality" | "cage_empty"
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
  const { farmId: liveFarmId } = useActiveFarm()
  const { profile, session, user } = useAuth()
  const { toast } = useToast()
  const userId = user?.id ?? null
  const seenIds = useRef<Set<string>>(new Set())
  // useActiveFarm() can briefly report `null` while it's re-deriving (e.g. a
  // stray loading/auth blip), even once a real farm has already been
  // resolved. Latching onto the last non-null value keeps the notification
  // storage key (and everything gated on farmId below) from bouncing back to
  // the farm-less default and losing sight of already-saved notifications.
  const lastKnownFarmIdRef = useRef<string | null>(null)
  if (liveFarmId) lastKnownFarmIdRef.current = liveFarmId
  const farmId = liveFarmId ?? lastKnownFarmIdRef.current
  const storageKey = farmId ? `aqua_alert_history_${farmId}` : "aqua_alert_history"
  const currentStorageToken = useMemo(() => Symbol(storageKey), [storageKey])
  const readStoredNotifications = useCallback(() => {
    if (typeof window === "undefined") return [] as AlertNotification[]
    try {
      const raw = window.localStorage.getItem(storageKey)
      if (!raw) return []
      const parsed = JSON.parse(raw) as unknown
      if (!Array.isArray(parsed)) return []
      return parsed
        .filter((item): item is AlertNotification => Boolean(item && typeof item === "object" && typeof (item as { id?: unknown }).id === "string"))
        .slice(0, MAX_NOTIFICATIONS)
    } catch {
      return []
    }
  }, [storageKey])
  const [notificationsDraft, setNotificationsDraft] = useState(() => ({
    sourceToken: currentStorageToken,
    value: readStoredNotifications(),
  }))
  const notifications =
    notificationsDraft.sourceToken === currentStorageToken
      ? notificationsDraft.value
      : readStoredNotifications()
  const setNotifications = useCallback((value: SetStateAction<AlertNotification[]>) => {
    setNotificationsDraft((current) => {
      const previousValue =
        current.sourceToken === currentStorageToken ? current.value : readStoredNotifications()
      const nextValue = typeof value === "function" ? value(previousValue) : value
      return {
        sourceToken: currentStorageToken,
        value: nextValue,
      }
    })
  }, [currentStorageToken, readStoredNotifications])

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

  const thresholds = useMemo(() => thresholdsQuery.data ?? [], [thresholdsQuery.data])
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
            <Button size="sm" variant="ghost" className="text-inherit hover:bg-white/15" onClick={() => router.push(notification.href!)}>
              {notification.actionLabel ?? "View"}
            </Button>
          ) : undefined,
        })
      }
    },
    [notificationsEnabled, router, setNotifications, toast],
  )

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((item) => ({ ...item, read: true })))
  }, [setNotifications])

  const markRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((item) => (item.id === id ? { ...item, read: true } : item)),
    )
  }, [setNotifications])

  const clearAll = useCallback(() => {
    setNotifications([])
    seenIds.current.clear()
  }, [setNotifications])

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

  // The harvest/transfer realtime listener below only catches a cage going
  // empty *after* this page is open and subscribed -- it can't see a cage
  // that was already empty before that (e.g. emptied out yesterday, or
  // before this feature shipped). This reconciles against the live
  // "currently stocked" set on every load/refresh so an already-empty cage
  // still shows up here, using a stable per-system id so it doesn't re-fire
  // on every render once seen.
  const { stockedIds: currentlyStockedIds, query: stockedSystemsQuery } = useStockedSystemIds(farmId, {
    enabled: Boolean(session) && Boolean(farmId),
  })
  useEffect(() => {
    if (!session || !farmId || !systemsLoaded || !stockedSystemsQuery.isSuccess) return

    ;(systemsQuery.data ?? []).forEach((system) => {
      if (currentlyStockedIds.has(system.id)) return

      addNotification({
        id: `cage-empty-current-${system.id}`,
        title: "Cage Now Empty",
        description: `${buildSystemLabel(systemMap, system.id)} has no fish remaining and is now available for restocking.`,
        createdAt: new Date().toISOString(),
        systemId: system.id,
        kind: "cage_empty",
        severity: "warning",
        read: false,
        href: `${DATA_ENTRY_PATH}?type=stocking&system=${system.id}`,
        actionLabel: "Restock cage",
      })
    })
  }, [addNotification, currentlyStockedIds, farmId, session, stockedSystemsQuery.isSuccess, systemMap, systemsLoaded, systemsQuery.data])

  useEffect(() => {
    seenIds.current = new Set(notifications.map((item) => item.id))
  }, [notifications])

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

  // Fires a "cage now empty" pop notification the moment a harvest or transfer
  // brings a cage's live fish count to zero, and refreshes the cached
  // "currently stocked" system lists (dashboard tables, report/production
  // filters) so the now-empty cage drops out of them right away.
  useEffect(() => {
    if (!session || !farmId || !systemsLoaded) return

    const farmSystemIds = (systemsQuery.data ?? []).map((s) => s.id)
    if (!farmSystemIds.length) return

    const notifyIfEmptied = async (systemId: number, sourceId: string) => {
      if (!systemMap[systemId]) return
      const { data: fishCount, error } = await supabase.rpc("current_fish_count", { p_system_id: systemId })
      if (error) {
        logSbError("notifications:cageEmpty", error)
        return
      }
      if ((fishCount ?? 0) > 0) return

      const systemLabel = buildSystemLabel(systemMap, systemId)
      addNotification({
        id: `cage-empty-${sourceId}`,
        title: "Cage Now Empty",
        description: `${systemLabel} has no fish remaining and is now available for restocking.`,
        createdAt: new Date().toISOString(),
        systemId,
        kind: "cage_empty",
        severity: "warning",
        read: false,
        href: `${DATA_ENTRY_PATH}?type=stocking&system=${systemId}`,
        actionLabel: "Restock cage",
      })

      void queryClient.invalidateQueries({
        predicate: ({ queryKey }) =>
          String(queryKey[0]) === "dashboard" && String(queryKey[1]) === "systems" && String(queryKey[2]) === farmId,
      })
    }

    const harvestChannel = supabase
      .channel(`alerts-cage-empty-harvest-${farmId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "fish_harvest",
          filter: `system_id=in.(${farmSystemIds.join(",")})`,
        },
        (payload) => {
          const row = payload.new as HarvestRow
          if (!row?.system_id) return
          void notifyIfEmptied(row.system_id, `harvest-${row.id}`)
        },
      )
      .subscribe()

    const transferChannel = supabase
      .channel(`alerts-cage-empty-transfer-${farmId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "fish_transfer",
          filter: `origin_system_id=in.(${farmSystemIds.join(",")})`,
        },
        (payload) => {
          const row = payload.new as TransferRow
          if (!row?.origin_system_id) return
          void notifyIfEmptied(row.origin_system_id, `transfer-${row.id}`)
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(harvestChannel)
      supabase.removeChannel(transferChannel)
    }
  }, [addNotification, farmId, queryClient, session, supabase, systemMap, systemsLoaded, systemsQuery.data])

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
