"use client"

import { Clock, Fish, Droplets, AlertCircle, CornerDownRight } from "lucide-react"
import { useMemo } from "react"
import { useRecentEntries } from "@/lib/hooks/use-reports"
import { useActiveFarm } from "@/hooks/use-active-farm"
import { useSystemOptions } from "@/lib/hooks/use-options"
import type { Enums } from "@/lib/types/database"
import { DataErrorState, DataFetchingBadge, DataUpdatedAt } from "@/components/shared/data-states"
import { getErrorMessage, getQueryResultError } from "@/lib/utils/query-result"

export default function RecentActivities({
  batch = "all",
  stage = "all",
  system = "all",
  title = "Activities",
  countLabel = "updates",
}: {
  batch?: string
  stage?: "all" | Enums<"system_growth_stage">
  system?: string
  title?: string
  countLabel?: string
}) {
  const { farmId } = useActiveFarm()
  const entriesQuery = useRecentEntries()
  const systemsQuery = useSystemOptions({ farmId, activeOnly: true })
  const loading = entriesQuery.isLoading || systemsQuery.isLoading
  const entryErrors = useMemo(() => {
    const data = entriesQuery.data
    if (!data) return []
    return [
      getQueryResultError(data.mortality),
      getQueryResultError(data.feeding),
      getQueryResultError(data.sampling),
      getQueryResultError(data.transfer),
      getQueryResultError(data.harvest),
      getQueryResultError(data.water_quality),
      getQueryResultError(data.incoming_feed),
      getQueryResultError(data.stocking),
      getQueryResultError(data.systems),
    ].filter(Boolean) as string[]
  }, [entriesQuery.data])
  const errorMessages = [
    getErrorMessage(entriesQuery.error),
    getErrorMessage(systemsQuery.error),
    ...entryErrors,
  ].filter(Boolean) as string[]

  const systemStageMap = useMemo(() => {
    const map = new Map<number, string | null | undefined>()
    const systems = systemsQuery.data?.status === "success" ? systemsQuery.data.data : []
    systems.forEach((row) => {
      if (row.id != null) map.set(row.id, row.growth_stage)
    })
    return map
  }, [systemsQuery.data])

  const activities = useMemo(() => {
    const data = entriesQuery.data
    if (!data) return []

    const normalize = <T extends { id: number | string; created_at?: string | null; date?: string | null }>(
      rows: T[],
      tableName: string,
      pick: (row: T) => { system_id?: number | null; batch_id?: number | null },
    ) =>
      rows.map((row) => ({
        id: `${tableName}-${row.id}`,
        table_name: tableName,
        change_type: "insert",
        column_name: null as string | null,
        change_time: row.created_at ?? row.date ?? "",
        ...pick(row),
      }))

    const merged = [
      ...normalize(data.mortality?.status === "success" ? data.mortality.data : [], "fish_mortality", (row: any) => ({
        system_id: row.system_id ?? null,
        batch_id: row.batch_id ?? null,
      })),
      ...normalize(data.feeding?.status === "success" ? data.feeding.data : [], "feeding_record", (row: any) => ({
        system_id: row.system_id ?? null,
        batch_id: row.batch_id ?? null,
      })),
      ...normalize(data.sampling?.status === "success" ? data.sampling.data : [], "fish_sampling_weight", (row: any) => ({
        system_id: row.system_id ?? null,
        batch_id: row.batch_id ?? null,
      })),
      ...normalize(data.transfer?.status === "success" ? data.transfer.data : [], "fish_transfer", (row: any) => ({
        system_id: row.origin_system_id ?? null,
        batch_id: row.batch_id ?? null,
      })),
      ...normalize(data.harvest?.status === "success" ? data.harvest.data : [], "fish_harvest", (row: any) => ({
        system_id: row.system_id ?? null,
        batch_id: row.batch_id ?? null,
      })),
      ...normalize(data.water_quality?.status === "success" ? data.water_quality.data : [], "water_quality_measurement", (row: any) => ({
        system_id: row.system_id ?? null,
        batch_id: null,
      })),
      ...normalize(data.incoming_feed?.status === "success" ? data.incoming_feed.data : [], "feed_incoming", (_row: any) => ({
        system_id: null,
        batch_id: null,
      })),
      ...normalize(data.stocking?.status === "success" ? data.stocking.data : [], "fish_stocking", (row: any) => ({
        system_id: row.system_id ?? null,
        batch_id: row.batch_id ?? null,
      })),
      ...normalize(data.systems?.status === "success" ? data.systems.data : [], "system", (row: any) => ({
        system_id: row.id ?? null,
        batch_id: null,
      })),
    ]

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
      .slice(0, 5)
  }, [batch, entriesQuery.data, stage, system, systemStageMap])

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
        return <Clock size={16} />
      case "fish_sampling_weight":
        return <Fish size={16} />
      case "water_quality_measurement":
        return <Droplets size={16} />
      case "fish_mortality":
        return <AlertCircle size={16} />
      case "fish_transfer":
        return <CornerDownRight size={16} />
      case "fish_harvest":
        return <Fish size={16} />
      case "feed_incoming":
        return <Clock size={16} />
      case "fish_stocking":
        return <Fish size={16} />
      default:
        return <Clock size={16} />
    }
  }

  const getColor = (table: string) => {
    switch (normalizeTableName(table)) {
      case "feeding_record":
        return "bg-chart-2/15 text-chart-2"
      case "fish_sampling_weight":
        return "bg-chart-3/15 text-chart-3"
      case "water_quality_measurement":
        return "bg-chart-2/15 text-chart-2"
      case "fish_mortality":
        return "bg-destructive/15 text-destructive"
      case "fish_transfer":
        return "bg-chart-4/15 text-chart-4"
      case "fish_harvest":
        return "bg-chart-2/15 text-chart-2"
      case "feed_incoming":
        return "bg-chart-3/15 text-chart-3"
      case "fish_stocking":
        return "bg-chart-2/15 text-chart-2"
      default:
        return "bg-muted text-muted-foreground"
    }
  }

  const getLabel = (table: string) => {
    switch (normalizeTableName(table)) {
      case "feeding_record":
        return "Feeding"
      case "fish_sampling_weight":
        return "Sampling"
      case "water_quality_measurement":
        return "Water quality"
      case "fish_mortality":
        return "Mortality"
      case "fish_transfer":
        return "Transfer"
      case "fish_harvest":
        return "Harvest"
      case "feed_incoming":
        return "Incoming feed"
      case "fish_stocking":
        return "Stocking"
      default:
        return normalizeTableName(table).replace(/_/g, " ")
    }
  }

  const formatTime = (value: string) => {
    const parsed = new Date(value)
    if (Number.isNaN(parsed.getTime())) return value
    return new Intl.DateTimeFormat(undefined, { month: "short", day: "2-digit" }).format(parsed)
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
      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-border">
          <h2 className="font-semibold text-sm">{title}</h2>
        </div>
        <div className="p-4 text-center text-muted-foreground text-sm">Loading...</div>
      </div>
    )
  }

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-sm">{title}</h2>
          <DataUpdatedAt updatedAt={entriesQuery.dataUpdatedAt} />
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>
            {activities.length} {countLabel}
          </span>
          <DataFetchingBadge isFetching={entriesQuery.isFetching} isLoading={entriesQuery.isLoading} />
        </div>
      </div>
      <div className="divide-y divide-border">
        {activities.length > 0 ? (
          activities.map((activity) => (
            <div key={activity.id} className="p-4 hover:bg-muted/30 transition-colors">
              <div className="flex items-center gap-3">
                <div className={`h-9 w-9 rounded-full flex items-center justify-center ${getColor(activity.table_name)}`}>
                  {getIcon(activity.table_name)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-foreground">{getLabel(activity.table_name)}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {activity.change_type}
                    {activity.column_name ? ` - ${activity.column_name}` : ""}
                  </p>
                </div>
                <span className="text-xs text-muted-foreground">{formatTime(activity.change_time)}</span>
              </div>
            </div>
          ))
        ) : (
          <div className="p-4 text-center text-muted-foreground text-sm">No recent activities found</div>
        )}
      </div>
    </div>
  )
}

