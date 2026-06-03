import type { Enums } from "@/lib/types/database"

export type ProductionSummaryParams = {
  farmId: string
  systemId?: number
  stage?: Enums<"system_growth_stage">
  dateFrom?: string
  dateTo?: string
  limit?: number
}

export type ProductionSummaryRpcArgs = {
  p_farm_id: string
  p_system_id?: number
  p_stage?: Enums<"system_growth_stage">
  p_start_date?: string
  p_end_date?: string
}

export function buildProductionSummaryRpcArgs(params: ProductionSummaryParams): ProductionSummaryRpcArgs {
  return {
    p_farm_id: params.farmId,
    p_system_id: params.systemId ?? undefined,
    p_stage: params.stage ?? undefined,
    p_start_date: params.dateFrom ?? undefined,
    p_end_date: params.dateTo ?? undefined,
  }
}
