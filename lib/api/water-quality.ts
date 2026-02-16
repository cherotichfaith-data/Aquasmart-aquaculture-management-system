import type { Enums, Tables } from "@/lib/types/database"
import type { QueryResult } from "@/lib/supabase-client"
import { getClientOrError, toQueryError, toQuerySuccess } from "@/lib/api/_utils"

type DashboardRow = Tables<"api_dashboard">
type WaterQualityFrameworkRow = Tables<"water_quality_framework">
type WaterQualityMeasurementRow = Tables<"water_quality_measurement">

type WaterQualityRatingPoint = {
  system_id: number | null
  rating: Enums<"water_quality_rating"> | null
  rating_numeric: number | null
  rating_date: string | null
  worst_parameter?: string | null
  worst_parameter_value?: number | null
  worst_parameter_unit?: string | null
}

export type WaterQualityMeasurementWithUnit = WaterQualityMeasurementRow & {
  water_quality_framework: Pick<WaterQualityFrameworkRow, "unit"> | null
}

export async function getWaterQualityRatings(params?: {
  systemId?: number
  dateFrom?: string
  dateTo?: string
  limit?: number
  farmId?: string | null
  signal?: AbortSignal
}): Promise<QueryResult<WaterQualityRatingPoint>> {
  if (!params?.farmId) {
    return toQuerySuccess<WaterQualityRatingPoint>([])
  }
  const clientResult = await getClientOrError("getWaterQualityRatings", { requireSession: true })
  if ("error" in clientResult) return clientResult.error
  const { supabase } = clientResult

  let query = supabase
    .rpc("api_dashboard", {
      p_farm_id: params.farmId,
      p_system_id: params.systemId ?? null,
      p_growth_stage: null,
      p_start_date: params.dateFrom ?? null,
      p_end_date: params.dateTo ?? null,
      p_time_period: null,
    })
    .order("input_end_date", { ascending: false })
  if (params?.limit) query = query.limit(params.limit)
  if (params?.signal) query = query.abortSignal(params.signal)

  const { data, error } = await query
  if (error) return toQueryError("getWaterQualityRatings", error)

  const rows = (data as DashboardRow[] | null | undefined ?? [])

  const mapped: WaterQualityRatingPoint[] = rows.map((row) => ({
    system_id: row.system_id ?? null,
    rating: (row as any).water_quality_rating_average ?? null,
    rating_numeric: (row as any).water_quality_rating_numeric_average ?? null,
    rating_date: (row as any).water_quality_latest_date ?? row.input_end_date ?? null,
    worst_parameter: (row as any).worst_parameter ?? null,
    worst_parameter_value: (row as any).worst_parameter_value ?? null,
    worst_parameter_unit: (row as any).worst_parameter_unit ?? null,
  }))

  return toQuerySuccess<WaterQualityRatingPoint>(mapped)
}

export async function getWaterQualityMeasurements(params?: {
  systemId?: number
  parameter?: Enums<"water_quality_parameters">
  dateFrom?: string
  dateTo?: string
  limit?: number
  signal?: AbortSignal
}): Promise<QueryResult<WaterQualityMeasurementWithUnit>> {
  const clientResult = await getClientOrError("getWaterQualityMeasurements")
  if ("error" in clientResult) return clientResult.error
  const { supabase } = clientResult

  let query = supabase.from("water_quality_measurement").select("*,water_quality_framework(unit)")
  if (params?.systemId) query = query.eq("system_id", params.systemId)
  if (params?.parameter) query = query.eq("parameter_name", params.parameter)
  if (params?.dateFrom) query = query.gte("date", params.dateFrom)
  if (params?.dateTo) query = query.lte("date", params.dateTo)
  query = query.order("date", { ascending: false })
  if (params?.limit) query = query.limit(params.limit)
  if (params?.signal) query = query.abortSignal(params.signal)

  const { data, error } = await query
  if (error) return toQueryError("getWaterQualityMeasurements", error)
  return toQuerySuccess<WaterQualityMeasurementWithUnit>(data as WaterQualityMeasurementWithUnit[])
}
