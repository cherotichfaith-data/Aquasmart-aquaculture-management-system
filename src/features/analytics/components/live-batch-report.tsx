"use client"

import { useQuery } from "@tanstack/react-query"
import { fetchRpc } from "@/lib/supabase/query-transport"
import type { PerformanceReports } from "@/features/analytics/types"
import BatchReportTable from "./batch-report-table"

/** `YYYY-MM-01` for the month containing `date` (YYYY-MM-DD), or the current month when absent. */
function monthStart(date: string | null | undefined, today = new Date()) {
  if (date && /^\d{4}-\d{2}-\d{2}/.test(date)) return `${date.slice(0, 7)}-01`
  return `${today.getUTCFullYear()}-${String(today.getUTCMonth() + 1).padStart(2, "0")}-01`
}

function dayLabel(date: string) {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })
}

function monthLabel(month: string) {
  return new Date(`${month}T00:00:00Z`).toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" })
}

type PerformanceResult = { status: "success"; data: PerformanceReports | PerformanceReports[] } | { status: "error" } | undefined

// The proxy returns the jsonb object as `data` (not wrapped in an array).
function batchRows(result: PerformanceResult) {
  if (!result || result.status !== "success") return []
  const payload = Array.isArray(result.data) ? result.data[0] : result.data
  return payload?.batches ?? []
}

/**
 * The live Detailed Batch Report for the Reports page: the month containing the end of the
 * selected period, for the active farm (same numbers as /analytics).
 */
export default function LiveBatchReport({
  farmId,
  dateFrom,
  dateTo,
}: {
  farmId?: string | null
  dateFrom?: string | null
  dateTo?: string | null
}) {
  const month = monthStart(dateTo)
  // The selected period is reported exactly; with no period the month containing today is used.
  const period = dateFrom && dateTo ? { from: dateFrom.slice(0, 10), to: dateTo.slice(0, 10) } : null

  const query = useQuery({
    queryKey: ["reports", "live-batch-report", farmId, month, period?.from ?? null, period?.to ?? null],
    enabled: Boolean(farmId),
    staleTime: 5 * 60_000,
    queryFn: ({ signal }) =>
      fetchRpc<PerformanceReports>(
        "liveBatchReport",
        "api_analytics_performance",
        {
          p_farm_id: farmId,
          p_month: period?.to ?? month,
          p_sections: ["batches"],
          ...(period ? { p_period_start: period.from, p_period_end: period.to } : {}),
        },
        signal,
      ),
  })

  if (!farmId) return <p className="planner-note">Select a farm to see the batch report.</p>
  if (query.isPending) return <p className="planner-note">Loading the batch report...</p>
  if (query.data?.status === "error" || query.isError) {
    return <p className="rpt-note">The batch report could not be loaded. Try again shortly.</p>
  }

  return (
    <>
      <p className="rpt-small">
        {period ? `${dayLabel(period.from)} to ${dayLabel(period.to)}` : monthLabel(month)}. Stock, ABW and biomass are as at the end of the
        period. Mortality, cage corrections, harvest, growth and feed are for the period; accumulated eFCR runs from stocking.
      </p>
      <BatchReportTable rows={batchRows(query.data)} />
    </>
  )
}
