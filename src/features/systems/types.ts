import type { Database } from "@/lib/types/database"
import type { QueryResult } from "@/lib/supabase-client"
import type { TimeBounds } from "@/lib/time-period"
import type { DashboardSystemOption, SystemsTableData } from "@/features/dashboard/types"
import type { GrowthTrendRow } from "@/features/shared/queries.server"
import type { RecommendedActionRow } from "@/lib/types/insights"

export type CageMortalityTotal = { system_id: number; total: number }

/** Farm-wide KPI rollup for the Cages page -- every number here is computed in
 * SQL (api_systems_summary); the page only formats and displays it. */
export type SystemsSummaryRow = Database["public"]["Functions"]["api_systems_summary"]["Returns"][number]

export type WaterQualityMonthlyPoint = {
  month: string
  doAvg: number | null
  tempAvg: number | null
}

export type SystemsPageInitialData = {
  bounds: TimeBounds
  systemOptions: QueryResult<DashboardSystemOption>
  batchSystems: QueryResult<{ system_id: number }>
  systemsTable: SystemsTableData
  /** Per-cage ABW/eFCR series (api_production_summary), feeds the growth, eFCR, and projection charts. */
  growthSeries: GrowthTrendRow[]
  /** Total recorded mortalities per cage over the selected period. */
  mortalityByCage: CageMortalityTotal[]
  /** Farm-wide monthly DO/temperature averages (api_water_quality_trend, bucketed by month). */
  waterQualityMonthly: WaterQualityMonthlyPoint[]
  /** Open recommended-action rows for the farm's stocked cages, used for the banner and status badges. */
  alerts: RecommendedActionRow[]
  /** Best-effort cohort/batch label per cage, from batches that resolve to exactly one system. */
  cohortBySystemId: Record<number, string | null>
  /** Backend-computed KPI totals for the header cards (api_systems_summary). */
  summary: SystemsSummaryRow | null
}
