"use client"

import type { ReactNode } from "react"

import type { DashboardPageInitialData, DashboardPageInitialFilters } from "@/features/dashboard/types"

import KPIOverview from "./kpi-overview"
import SystemsTable from "./systems-table"

function SectionLabel({
  title,
  description,
  action,
}: {
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="mb-2 flex items-start justify-between">
      <div>
        <p className="text-[0.9375rem] font-semibold tracking-[-0.01em]">
          {title}
        </p>
        {description ? (
          <p className="mt-0.5 block text-xs text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div>{action}</div> : null}
    </div>
  )
}

export default function DashboardPage({
  initialFarmId,
  initialFilters,
  initialData,
  renderedAt,
}: {
  initialFarmId?: string | null
  initialFilters?: DashboardPageInitialFilters
  initialData: DashboardPageInitialData
  renderedAt: number
}) {
  const farmId = initialFarmId ?? null
  const selectedStage = initialFilters?.selectedStage ?? "all"
  const selectedBatch = initialFilters?.selectedBatch ?? "all"
  const selectedSystem = initialFilters?.selectedSystem ?? "all"
  const timePeriod = initialFilters?.timePeriod ?? "month"

  if (!farmId) return <div className="min-h-[60vh]" />

  return (
    <div className="container mx-auto flex flex-col gap-8 p-4 md:p-8">
      <section>
        <SectionLabel title="Core Performance Overview" />
        <KPIOverview
          metrics={initialData.kpiOverview.metrics}
          isLoading={false}
          isFetching={false}
          stage={selectedStage}
          timePeriod={timePeriod}
          batch={selectedBatch}
          system={selectedSystem}
        />
      </section>

      <section>
        <SectionLabel title="Production" />
        <SystemsTable
          rows={initialData.systemsTable.rows}
          isLoading={false}
          isFetching={false}
          emptyReason={initialData.systemsTable.meta.reason ?? null}
          updatedAt={renderedAt}
          stage={selectedStage}
          batch={selectedBatch}
          timePeriod={timePeriod}
          farmId={farmId}
          showHeader={false}
        />
      </section>
    </div>
  )
}
