import type { QueryResult } from "@/lib/supabase-client"
import type { TimeBounds } from "@/lib/time-period"
import type { DashboardSystemOption, SystemsTableData } from "@/features/dashboard/types"
import type { GrowthTrendRow } from "@/features/shared/queries.server"
import type { RecommendedActionRow } from "@/lib/types/insights"

export type CageMortalityTotal = { system_id: number; total: number }

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
}
