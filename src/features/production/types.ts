import type { Database } from "@/lib/types/database"

export type ProductionSummaryRpcRow = Database["public"]["Functions"]["api_production_summary"]["Returns"][number]

export type ProductionSummaryMetricsRow = {
  period_start_fish: number
  mortality_fish: number
  transfer_out_fish: number
  total_harvested_kg: number
  total_harvested_fish: number
}
