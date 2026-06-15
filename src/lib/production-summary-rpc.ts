import type { Enums } from "@/lib/types/database"
import { toRpcDate, toRpcSystemId, type RpcDate, type RpcSystemId } from "@/lib/rpc-params"

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
  p_system_id: RpcSystemId
  p_stage?: Enums<"system_growth_stage">
  p_start_date: RpcDate
  p_end_date: RpcDate
}

export function buildProductionSummaryRpcArgs(params: ProductionSummaryParams): ProductionSummaryRpcArgs {
  return {
    p_farm_id: params.farmId,
    p_system_id: toRpcSystemId(params.systemId),
    p_stage: params.stage ?? undefined,
    p_start_date: toRpcDate(params.dateFrom),
    p_end_date: toRpcDate(params.dateTo),
  }
}
