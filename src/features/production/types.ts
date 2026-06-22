import type { Database } from "@/lib/types/database"

export type ProductionSummaryRpcRow = Database["public"]["Functions"]["api_production_summary"]["Returns"][number]

export type ProductionSummaryMetricsRow = {
  total_stocked_fish: number
  cumulative_mortality_fish: number
  total_transfer_out_fish: number
  total_harvested_kg: number
  total_harvested_fish: number
}
