"use client"

import type React from "react"
import { useMemo } from "react"
import { Droplets, HeartPulse } from "lucide-react"
import type { Enums } from "@/lib/types/database"
import { useActiveFarm } from "@/hooks/use-active-farm"
import { useHealthSummary } from "@/lib/hooks/use-dashboard"
import { DataErrorState, DataFetchingBadge, DataUpdatedAt } from "@/components/shared/data-states"
import { getErrorMessage } from "@/lib/utils/query-result"

type Tone = "good" | "warn" | "bad"

const toneText = {
  good: "text-chart-2",
  warn: "text-chart-4",
  bad: "text-destructive",
}

const toneBar = {
  good: "bg-chart-2",
  warn: "bg-chart-4",
  bad: "bg-destructive",
}

function StatusCard({
  icon,
  title,
  status,
  tone,
  progress,
  detail,
}: {
  icon: React.ReactNode
  title: string
  status: string
  tone: Tone
  progress: number
  detail?: string
}) {
  return (
    <div className="bg-card border border-border rounded-2xl p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
          <p className={`text-lg font-semibold mt-1 ${toneText[tone]}`}>{status}</p>
        </div>
        <div className="h-10 w-10 rounded-full bg-muted/60 flex items-center justify-center text-muted-foreground">
          {icon}
        </div>
      </div>
      <div className="mt-4">
        <div className="h-2 rounded-full bg-muted/70">
          <span className={`block h-2 rounded-full ${toneBar[tone]}`} style={{ width: `${progress * 100}%` }} />
        </div>
        {detail ? <p className="text-xs text-muted-foreground mt-2">{detail}</p> : null}
      </div>
    </div>
  )
}

export default function HealthSummary({
  stage,
  batch,
  system,
  timePeriod: _timePeriod,
  periodParam,
}: {
  stage?: "all" | Enums<"system_growth_stage">
  batch?: string
  system?: string
  timePeriod?: Enums<"time_period">
  periodParam?: string | null
}) {
  const { farmId } = useActiveFarm()
  const summaryQuery = useHealthSummary({
    farmId,
    stage: stage ?? "all",
    batch: batch ?? "all",
    system,
    timePeriod: _timePeriod ?? "2 weeks",
    periodParam,
  })

  const waterQuality = useMemo(() => summaryQuery.data?.waterQuality ?? null, [summaryQuery.data])
  const fishHealth = useMemo(() => summaryQuery.data?.fishHealth ?? null, [summaryQuery.data])

  const errorMessage = getErrorMessage(summaryQuery.error)

  if (summaryQuery.isError) {
    return (
      <DataErrorState
        title="Unable to load health summary"
        description={errorMessage ?? "Please retry or check your connection."}
        onRetry={() => summaryQuery.refetch()}
      />
    )
  }

  if (summaryQuery.isLoading || !waterQuality || !fishHealth) {
    return (
      <div className="grid gap-4">
        <div className="bg-muted/30 rounded-2xl h-32 animate-pulse" />
        <div className="bg-muted/30 rounded-2xl h-32 animate-pulse" />
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <DataUpdatedAt updatedAt={summaryQuery.dataUpdatedAt} />
        <DataFetchingBadge isFetching={summaryQuery.isFetching} isLoading={summaryQuery.isLoading} />
      </div>
      <div className="grid gap-4">
        <StatusCard
          icon={<Droplets size={18} />}
          title={waterQuality.title}
          status={waterQuality.status}
          tone={waterQuality.tone}
          progress={waterQuality.progress}
          detail={waterQuality.detail}
        />
        <StatusCard
          icon={<HeartPulse size={18} />}
          title={fishHealth.title}
          status={fishHealth.status}
          tone={fishHealth.tone}
          progress={fishHealth.progress}
          detail={fishHealth.detail}
        />
      </div>
    </div>
  )
}
