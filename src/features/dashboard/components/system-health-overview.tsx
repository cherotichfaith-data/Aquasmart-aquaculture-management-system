"use client"

import { useMemo } from "react"
import { useSystemHealthScores } from "@/lib/hooks/use-analytics"
import { useActiveFarm } from "@/lib/hooks/app/use-active-farm"
import { DataErrorState, EmptyState } from "@/components/shared/data-states"
import { getErrorMessage, getQueryResultError } from "@/lib/utils/query-result"
import { normalizeHealthGrade } from "@/lib/health-grade"
import type { HealthGrade, SystemHealthRow } from "@/lib/types/insights"

const gradeLabel: Record<HealthGrade, string> = {
  excellent: "Excellent",
  good: "Good",
  fair: "Fair",
  poor: "Poor",
  critical: "Critical",
}

const gradeColors: Record<HealthGrade, { fill: string; text: string; badge: string }> = {
  excellent: {
    fill: "linear-gradient(90deg, var(--success) 0%, color-mix(in srgb, var(--success) 78%, white) 100%)",
    text: "var(--success)",
    badge: "color-mix(in srgb, var(--success) 12%, transparent)",
  },
  good: {
    fill: "linear-gradient(90deg, var(--primary) 0%, color-mix(in srgb, var(--primary) 74%, white) 100%)",
    text: "var(--primary)",
    badge: "color-mix(in srgb, var(--primary) 12%, transparent)",
  },
  fair: {
    fill: "linear-gradient(90deg, var(--warning) 0%, color-mix(in srgb, var(--warning) 75%, white) 100%)",
    text: "var(--warning)",
    badge: "color-mix(in srgb, var(--warning) 14%, transparent)",
  },
  poor: {
    fill: "linear-gradient(90deg, var(--destructive) 0%, color-mix(in srgb, var(--destructive) 78%, white) 100%)",
    text: "var(--destructive)",
    badge: "color-mix(in srgb, var(--destructive) 12%, transparent)",
  },
  critical: {
    fill: "linear-gradient(90deg, var(--destructive) 0%, color-mix(in srgb, var(--destructive) 72%, black) 100%)",
    text: "var(--destructive)",
    badge: "color-mix(in srgb, var(--destructive) 16%, transparent)",
  },
}

function HealthRowCard({ row }: { row: SystemHealthRow }) {
  const percent = Math.max(0, Math.min(100, (row.health_score / 10) * 100))
  const grade = normalizeHealthGrade(row.health_grade)
  const palette = gradeColors[grade]

  return (
    <div className="border-b border-border/60 py-3 last:border-b-0 last:pb-0 first:pt-0">
      <div className="flex items-center gap-4">
        <div className="min-w-[72px] text-sm font-medium text-foreground">{row.system_name}</div>
        <div className="min-w-0 flex-1">
          <div className="h-7 overflow-hidden rounded-sm bg-muted/45">
            <div
              className="h-full rounded-sm transition-[width] duration-500"
              style={{
                width: `${percent}%`,
                background: palette.fill,
              }}
            />
          </div>
        </div>
        <div
          className="flex min-w-[96px] items-center justify-end gap-2 rounded-md px-2.5 py-1.5"
          style={{ backgroundColor: palette.badge }}
        >
          <span className="text-[2rem] font-semibold leading-none text-foreground">
            {row.health_score.toFixed(1)}
          </span>
          <span className="text-sm font-semibold" style={{ color: palette.text }}>
            {gradeLabel[grade]}
          </span>
        </div>
      </div>
    </div>
  )
}

function SystemHealthSkeleton() {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="space-y-2">
            <div className="h-4 w-20 animate-pulse rounded bg-muted/60" />
            <div className="h-7 animate-pulse rounded-sm bg-muted/50" />
          </div>
        ))}
      </div>
    </div>
  )
}

export default function SystemHealthOverview({
  farmId: initialFarmId,
  systemId,
}: {
  farmId?: string | null
  systemId?: number
}) {
  const { farmId: activeFarmId } = useActiveFarm()
  const farmId = activeFarmId ?? initialFarmId

  const query = useSystemHealthScores({ farmId, systemId })
  const rows = query.data?.status === "success" ? query.data.data : []
  const errorMsg = getErrorMessage(query.error) ?? getQueryResultError(query.data)

  const rankedRows = useMemo(
    () => [...rows].sort((left, right) => right.health_score - left.health_score).slice(0, systemId ? 1 : 4),
    [rows, systemId],
  )

  if (query.isError || query.data?.status === "error") {
    return (
      <DataErrorState
        title="Unable to load system health scores"
        description={errorMsg ?? "Please retry or check your connection."}
        onRetry={() => query.refetch()}
      />
    )
  }

  if (query.isLoading) {
    return <SystemHealthSkeleton />
  }

  if (rankedRows.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-card p-5">
        <EmptyState
          title="No health scores available"
          description="Health scores are calculated from recent sampling, water quality, and feeding data."
        />
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="space-y-1">
        {rankedRows.map((row) => (
          <HealthRowCard key={row.system_id} row={row} />
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-border/60 pt-3 text-xs font-medium text-muted-foreground">
        <span className="inline-flex items-center gap-2">
          <span className="h-3 w-3 rounded-sm bg-success" />
          WQ
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-3 w-3 rounded-sm bg-warning" />
          FCR
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-3 w-3 rounded-sm bg-primary" />
          Mort
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-3 w-3 rounded-sm bg-destructive" />
          Growth
        </span>
      </div>
    </div>
  )
}
