import type { Database, Enums } from "@/lib/types/database"
import type { QueryResult } from "@/lib/supabase-client"
import type { CustomTimeRange, TimeBounds, TimePeriod } from "@/lib/time-period"
import type { GrowthTrendRow } from "@/features/shared/queries.server"
import type { RecommendedActionRow } from "@/lib/types/insights"

/**
 * Full per-batch rollup RPC row (batch-level analog of api_dashboard_systems).
 * Already defined server-side in supabase/migrations, just not wired to any
 * page before this feature.
 */
export type DashboardBatchRpcRow = Database["public"]["Functions"]["api_dashboard_batches"]["Returns"][number]

export type BatchMortalityTotal = { batch_id: number; total: number }

/** The stocking/lineage side of a batch -- from fingerling_batch + fingerling_supplier,
 * not from api_dashboard_batches (which only knows current/period state). */
export type BatchStockingInfo = {
  dateOfDelivery: string | null
  numberOfFish: number | null
  abw: number | null
  supplierName: string | null
}

export type BatchesPageFilters = {
  selectedStage: "all" | Enums<"system_growth_stage">
  selectedBatch: string
  timePeriod: TimePeriod
  customTimeRange: CustomTimeRange | null
}

export type BatchesPageInitialData = {
  bounds: TimeBounds
  batches: QueryResult<DashboardBatchRpcRow>
  /** ABW/eFCR series for the fetched batches' own production cycles -- charts roll
   * this up to batch level via cycleIdToBatchId + aggregateGrowthByBatch. */
  growthSeries: GrowthTrendRow[]
  mortalityByBatch: BatchMortalityTotal[]
  alerts: RecommendedActionRow[]
  /** Production cycle -> batch. The key for attributing growthSeries rows:
   * a cage's current batch is not who its historical cycles belonged to. */
  cycleIdToBatchId: Record<number, number>
  /** Stocking/lineage details per batch (fingerling_batch + fingerling_supplier). */
  stockingByBatchId: Record<number, BatchStockingInfo>
}
