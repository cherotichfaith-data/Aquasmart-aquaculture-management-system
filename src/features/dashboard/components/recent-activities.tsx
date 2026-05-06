"use client"

import { useMemo } from "react"
import {
  AlertTriangle,
  ArrowRightLeft,
  Clock3,
  Droplets,
  Fish,
  Package2,
  Scale,
  Waves,
} from "lucide-react"
import { useAuth } from "@/components/providers/auth-provider"
import { useActiveFarm } from "@/lib/hooks/app/use-active-farm"
import { useSystemOptions } from "@/lib/hooks/use-options"
import { useRecentActivities } from "@/lib/hooks/use-dashboard"
import type { Enums } from "@/lib/types/database"
import { DataErrorState, DataFetchingBadge, DataUpdatedAt } from "@/components/shared/data-states"
import { getErrorMessage } from "@/lib/utils/query-result"
import { formatNumberValue } from "@/lib/analytics-format"

type ActivityItem = {
  id: string
  table_name: string
  change_time: string
  system_id?: number | null
  batch_id?: number | null
  raw: Record<string, unknown>
}

export default function RecentActivities({
  batch = "all",
  stage = "all",
  system = "all",
  dateFrom,
  dateTo,
  title = "Activities",
  countLabel = "updates",
  farmId: initialFarmId,
  maxItems = 3,
  showHeader = true,
}: {
  batch?: string
  stage?: "all" | Enums<"system_growth_stage">
  system?: string
  dateFrom?: string
  dateTo?: string
  title?: string
  countLabel?: string
  farmId?: string | null
  maxItems?: number
  showHeader?: boolean
}) {
  const { session, role, isLoading: authLoading } = useAuth()
  const { farmId: activeFarmId } = useActiveFarm()
  const farmId = initialFarmId ?? activeFarmId
  const isAuthorized = Boolean(session && role)
  const queryFarmId = isAuthorized ? farmId : null
  const entriesQuery = useRecentActivities({
    farmId: queryFarmId,
    dateFrom,
    dateTo,
    limit: Math.max(maxItems * 12, 50),
    enabled: isAuthorized,
  })
  const systemsQuery = useSystemOptions({ farmId: queryFarmId, stage, activeOnly: false, enabled: isAuthorized })
  const loading = authLoading || entriesQuery.isLoading || systemsQuery.isLoading

  const errorMessages = [
    getErrorMessage(entriesQuery.error),
    getErrorMessage(systemsQuery.error),
  ].filter(Boolean) as string[]

  const systemStageMap = useMemo(() => {
    const map = new Map<number, string | null | undefined>()
    const systems = systemsQuery.data?.status === "success" ? systemsQuery.data.data : []
    systems.forEach((row) => {
      if (row.id != null) map.set(row.id, row.growth_stage)
    })
    return map
  }, [systemsQuery.data])

  const systemNameMap = useMemo(() => {
    const map = new Map<number, string>()
    const systems = systemsQuery.data?.status === "success" ? systemsQuery.data.data : []
    systems.forEach((row) => {
      if (row.id != null && typeof row.label === "string") {
        map.set(row.id, row.label)
      }
    })
    return map
  }, [systemsQuery.data])

  const activities = useMemo(() => {
    const rows = entriesQuery.data?.status === "success" ? entriesQuery.data.data : []
    const merged: ActivityItem[] = rows.map((row) => ({
      id: `${row.table_name ?? "activity"}-${row.id}`,
      table_name: row.table_name ?? "activity",
      change_time: row.change_time ?? "",
      system_id: row.system_id ?? null,
      batch_id: row.batch_id ?? null,
      raw: row as unknown as Record<string, unknown>,
    }))

    return merged
      .filter((row) => {
        if (system !== "all") return String(row.system_id ?? "") === system
        return true
      })
      .filter((row) => {
        if (batch !== "all") return String(row.batch_id ?? "") === batch
        return true
      })
      .filter((row) => {
        if (stage === "all") return true
        if (row.system_id == null) return false
        return systemStageMap.get(row.system_id) === stage
      })
      .sort((a, b) => String(b.change_time ?? "").localeCompare(String(a.change_time ?? "")))
      .slice(0, maxItems)
  }, [batch, entriesQuery.data, maxItems, stage, system, systemStageMap])

  const normalizeTableName = (table: string) => {
    switch (table) {
      case "feeding_events":
      case "feeding_record":
        return "feeding_record"
      case "sampling_events":
      case "fish_sampling_weight":
        return "fish_sampling_weight"
      case "water_quality_events":
      case "water_quality_measurement":
        return "water_quality_measurement"
      case "mortality_events":
      case "fish_mortality":
        return "fish_mortality"
      case "transfer_events":
      case "fish_transfer":
        return "fish_transfer"
      case "harvest_events":
      case "fish_harvest":
        return "fish_harvest"
      case "incoming_feed_events":
      case "feed_incoming":
        return "feed_incoming"
      case "stocking_events":
      case "fish_stocking":
        return "fish_stocking"
      default:
        return table
    }
  }

  const getIcon = (table: string) => {
    switch (normalizeTableName(table)) {
      case "feeding_record":
        return <Package2 className="h-4 w-4" />
      case "fish_sampling_weight":
        return <Scale className="h-4 w-4" />
      case "water_quality_measurement":
        return <Droplets className="h-4 w-4" />
      case "fish_mortality":
        return <AlertTriangle className="h-4 w-4" />
      case "fish_transfer":
        return <ArrowRightLeft className="h-4 w-4" />
      case "fish_harvest":
        return <Fish className="h-4 w-4" />
      case "feed_incoming":
        return <Package2 className="h-4 w-4" />
      case "fish_stocking":
        return <Waves className="h-4 w-4" />
      default:
        return <Clock3 className="h-4 w-4" />
    }
  }

  const getColor = (table: string) => {
    switch (normalizeTableName(table)) {
      case "feeding_record":
        return "bg-primary/10 text-primary"
      case "fish_sampling_weight":
        return "bg-muted text-muted-foreground"
      case "water_quality_measurement":
        return "bg-muted text-muted-foreground"
      case "fish_mortality":
        return "bg-destructive/10 text-destructive"
      case "fish_transfer":
        return "bg-warning/10 text-warning"
      case "fish_harvest":
        return "bg-primary/10 text-primary"
      case "feed_incoming":
        return "bg-muted text-muted-foreground"
      case "fish_stocking":
        return "bg-primary/10 text-primary"
      default:
        return "bg-muted text-muted-foreground"
    }
  }

  const getLabel = (table: string) => {
    switch (normalizeTableName(table)) {
      case "feeding_record":
        return "Feeding Update"
      case "fish_sampling_weight":
        return "Sampling Update"
      case "water_quality_measurement":
        return "Water Quality Check"
      case "fish_mortality":
        return "Mortality Event"
      case "fish_transfer":
        return "Transfer Event"
      case "fish_harvest":
        return "Harvest Update"
      case "feed_incoming":
        return "Feed Inventory"
      case "fish_stocking":
        return "Stocking Event"
      default:
        return normalizeTableName(table).replace(/_/g, " ")
    }
  }

  const getSubtitle = (activity: ActivityItem) => {
    const table = normalizeTableName(activity.table_name)
    const systemName =
      activity.system_id != null ? systemNameMap.get(activity.system_id) ?? `System ${activity.system_id}` : null
    const raw = activity.raw

    switch (table) {
      case "feeding_record": {
        const amount =
          typeof raw.feeding_amount === "number"
            ? `${formatNumberValue(raw.feeding_amount, { decimals: 0 })} kg fed`
            : "Feeding entry logged"
        return `${systemName ?? "Farm"} - ${amount}`
      }
      case "water_quality_measurement":
        return `${systemName ?? "Farm"} - Water quality recorded`
      case "fish_mortality": {
        const count =
          typeof raw.number_of_fish === "number"
            ? `${formatNumberValue(raw.number_of_fish, { decimals: 0 })} dead fish`
            : "Mortality logged"
        return `${systemName ?? "Farm"} - ${count}`
      }
      case "fish_sampling_weight":
        return `${systemName ?? "Farm"} - ABW sample recorded`
      case "fish_transfer":
        return `${systemName ?? "Farm"} - Transfer entry recorded`
      case "fish_harvest":
        return `${systemName ?? "Farm"} - Harvest entry recorded`
      case "feed_incoming":
        return "Incoming feed stock recorded"
      case "fish_stocking":
        return `${systemName ?? "Farm"} - Stocking entry recorded`
      default:
        return systemName ? `${systemName} - Entry logged` : "Entry logged"
    }
  }

  const formatTime = (value: string) => {
    const parsed = new Date(value)
    if (Number.isNaN(parsed.getTime())) return value
    const now = new Date()
    const diffDays = Math.max(0, Math.floor((now.getTime() - parsed.getTime()) / (1000 * 60 * 60 * 24)))
    if (diffDays === 0) return "Today"
    if (diffDays === 1) return "1 day ago"
    if (diffDays < 30) return `${diffDays} days ago`
    return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(parsed)
  }

  if (!isAuthorized || authLoading) {
    return (
      <div className="rounded-[1.2rem] border border-border/80 bg-card">
        {showHeader ? (
          <div className="border-b border-border/80 px-5 py-4">
            <h2 className="text-[1.15rem] font-semibold text-primary">{title}</h2>
            <p className="mt-1 text-xs text-muted-foreground">Checking access...</p>
          </div>
        ) : null}
        <div className="space-y-3 p-4">
          {Array.from({ length: maxItems }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 rounded-xl border border-border/70 bg-muted/20 p-4">
              <div className="h-10 w-10 shrink-0 rounded-xl bg-muted/60 animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="h-3.5 w-24 rounded bg-muted/60 animate-pulse" />
                <div className="h-3 w-40 rounded bg-muted/40 animate-pulse" />
              </div>
              <div className="h-3 w-16 rounded bg-muted/40 animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (errorMessages.length > 0) {
    return (
      <DataErrorState
        title="Unable to load recent activities"
        description={errorMessages[0]}
        onRetry={() => {
          entriesQuery.refetch()
          systemsQuery.refetch()
        }}
      />
    )
  }

  if (loading) {
    return (
      <div className="rounded-[1.2rem] border border-border/80 bg-card">
        {showHeader ? (
          <div className="border-b border-border/80 px-5 py-4">
            <h2 className="text-[1.15rem] font-semibold text-primary">{title}</h2>
          </div>
        ) : null}
        <div className="space-y-3 p-4">
          {Array.from({ length: maxItems }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 rounded-xl border border-border/70 bg-muted/20 p-4">
              <div className="h-10 w-10 shrink-0 rounded-xl bg-muted/60 animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="h-3.5 w-24 rounded bg-muted/60 animate-pulse" />
                <div className="h-3 w-40 rounded bg-muted/40 animate-pulse" />
              </div>
              <div className="h-3 w-16 rounded bg-muted/40 animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-[1.2rem] border border-border/80 bg-card">
      {showHeader ? (
        <div className="flex items-center justify-between border-b border-border/80 px-5 py-4">
          <div>
            <h2 className="text-[1.15rem] font-semibold text-primary">{title}</h2>
            <DataUpdatedAt updatedAt={entriesQuery.dataUpdatedAt} />
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>
              {activities.length} {countLabel}
            </span>
            <DataFetchingBadge isFetching={entriesQuery.isFetching} isLoading={entriesQuery.isLoading} />
          </div>
        </div>
      ) : null}
      <div className="space-y-3 p-4">
        {activities.length > 0 ? (
          activities.map((activity) => (
            <div
              key={activity.id}
              className="flex items-start gap-3 rounded-xl border border-border/70 bg-muted/15 p-4 transition-colors hover:bg-muted/30"
            >
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${getColor(activity.table_name)}`}>
                {getIcon(activity.table_name)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-primary">{getLabel(activity.table_name)}</p>
                    <p className="mt-1 text-sm text-foreground">{getSubtitle(activity)}</p>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">{formatTime(activity.change_time)}</span>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
            No recent activities found
          </div>
        )}
      </div>
    </div>
  )
}
