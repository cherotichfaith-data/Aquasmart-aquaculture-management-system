"use client"

import { fetchRpc, toQuerySuccess } from "@/lib/supabase/query-transport"
import type { QueryResult } from "@/lib/supabase-client"
import { parseAnalyticsPeriod } from "./report-period"
import type { MeasuredInterval } from "./measured-intervals"

export async function loadMeasuredIntervals(params: {
  farmId?: string | null
  dateFrom?: string
  dateTo?: string
  systemId?: number
  systemIds?: number[]
  batchId?: number
  signal?: AbortSignal
}): Promise<QueryResult<MeasuredInterval>> {
  if (!params.farmId) return toQuerySuccess([])
  const end = params.dateTo ?? parseAnalyticsPeriod({}).to
  const response = await fetchRpc<{ measured_intervals?: MeasuredInterval[] }>(
    "analytics:measuredIntervals", "api_analytics_performance",
    { p_farm_id: params.farmId, p_month: end, p_period_start: params.dateFrom ?? "0001-01-01",
      p_period_end: end, p_sections: ["measured_intervals"] }, params.signal,
  )
  if (response.status === "error") return response
  const payload = Array.isArray(response.data) ? response.data[0] : response.data
  return toQuerySuccess((payload?.measured_intervals ?? []).filter(row =>
    (params.systemId == null || row.system_id === params.systemId)
    && (!params.systemIds?.length || params.systemIds.includes(row.system_id))
    && (params.batchId == null || row.batch_id === params.batchId)))
}
