"use client"

import { useMemo } from "react"
import DashboardLayout from "@/components/layout/dashboard-layout"
import CommandCentreBanner from "@/features/systems/components/command-centre-banner"
import CommandCentreKpis from "@/features/systems/components/command-centre-kpis"
import CageStatusTable from "@/features/systems/components/cage-status-table"
import AbwGrowthChart from "@/features/systems/components/charts/abw-growth-chart"
import MortalityByCageChart from "@/features/systems/components/charts/mortality-by-cage-chart"
import EfcrByPeriodChart from "@/features/systems/components/charts/efcr-by-period-chart"
import WaterQualityMonthlyChart from "@/features/systems/components/charts/water-quality-monthly-chart"
import AbwProjectionChart from "@/features/systems/components/charts/abw-projection-chart"
import { formatCageLabel } from "@/lib/system-options"
import type { DashboardPageInitialFilters } from "@/features/dashboard/types"
import type { SystemsPageInitialData } from "@/features/systems/types"

export default function SystemsPageClient({
  initialFarmId,
  initialFarmName,
  initialFarmRole,
  initialFilters,
  initialData,
}: {
  initialFarmId?: string | null
  initialFarmName?: string | null
  initialFarmRole?: string | null
  initialFilters: DashboardPageInitialFilters
  initialData: SystemsPageInitialData
}) {
  // Cages that have been fully harvested or emptied out no longer belong in
  // the command centre -- they'll come back once they're restocked.
  const stockedRows = useMemo(
    () => initialData.systemsTable.rows.filter((row) => (row.fish_end ?? 0) > 0),
    [initialData.systemsTable.rows],
  )
  const systemLabels = useMemo(
    () =>
      Object.fromEntries(
        stockedRows.map((row) => [
          row.system_id,
          formatCageLabel({ id: row.system_id, label: row.system_name, unit: null }),
        ]),
      ),
    [stockedRows],
  )

  return (
    <DashboardLayout
      initialFarmId={initialFarmId}
      initialFarmName={initialFarmName}
      headerDataOverrides={{ role: initialFarmRole ?? null, timeBounds: initialData.bounds }}
    >
      <div className="page-shell">
        <CommandCentreBanner alerts={initialData.alerts} />

        <CommandCentreKpis stockedRows={stockedRows} waterQualityMonthly={initialData.waterQualityMonthly} />

        <CageStatusTable
          rows={stockedRows}
          cohortBySystemId={initialData.cohortBySystemId}
          mortalityByCage={initialData.mortalityByCage}
          alerts={initialData.alerts}
          timePeriod={initialFilters.timePeriod}
          emptyMessage={initialData.systemsTable.meta.reason ?? "No active cages found"}
        />

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <AbwGrowthChart growthSeries={initialData.growthSeries} systemLabels={systemLabels} />
          <MortalityByCageChart mortalityByCage={initialData.mortalityByCage} systemLabels={systemLabels} />
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <EfcrByPeriodChart growthSeries={initialData.growthSeries} systemLabels={systemLabels} />
          <WaterQualityMonthlyChart points={initialData.waterQualityMonthly} />
        </div>
        <AbwProjectionChart growthSeries={initialData.growthSeries} systemLabels={systemLabels} />
      </div>
    </DashboardLayout>
  )
}
