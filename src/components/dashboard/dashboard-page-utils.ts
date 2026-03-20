"use client"

import * as XLSX from "xlsx"
import type { ReadonlyURLSearchParams } from "next/navigation"
import type { Enums } from "@/lib/types/database"
import { getProductionSummary } from "@/lib/api/production"

export const parseDashboardStageParam = (
  value: string | null,
): "all" | Enums<"system_growth_stage"> => {
  if (value === "nursing" || value === "grow_out") return value
  return "all"
}

export const hasDashboardUrlFilters = (searchParams: URLSearchParams | ReadonlyURLSearchParams) =>
  ["system", "stage", "period", "batch"].some((key) => searchParams.get(key) != null)

export function buildDashboardSearchParams(params: {
  searchParams: URLSearchParams | ReadonlyURLSearchParams
  selectedSystem: string
  selectedStage: "all" | Enums<"system_growth_stage">
  timePeriod: string
  selectedBatch: string
}) {
  const next = new URLSearchParams(params.searchParams.toString())
  if (params.selectedSystem !== "all") next.set("system", params.selectedSystem)
  else next.delete("system")
  if (params.selectedStage !== "all") next.set("stage", params.selectedStage)
  else next.delete("stage")
  next.set("period", params.timePeriod)
  if (params.selectedBatch !== "all") next.set("batch", params.selectedBatch)
  else next.delete("batch")
  return next
}

export async function downloadDashboardSummary(params: {
  farmId: string | null
  selectedSystem: string
  selectedStage: "all" | Enums<"system_growth_stage">
  dateFrom?: string
  dateTo?: string
}) {
  const systemId = params.selectedSystem !== "all" ? Number(params.selectedSystem) : undefined
  const stage = params.selectedStage === "all" ? undefined : params.selectedStage
  const resolvedSystemId = Number.isFinite(systemId) ? systemId : undefined
  const result = await getProductionSummary({
    stage,
    systemId: resolvedSystemId,
    limit: 1000,
    dateFrom: params.dateFrom,
    dateTo: params.dateTo,
    farmId: params.farmId ?? null,
  })

  if (result.status === "success" && result.data && result.data.length > 0) {
    const worksheet = XLSX.utils.json_to_sheet(result.data)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, "Production Summary")
    XLSX.writeFile(workbook, `AquaSmart_Dashboard_Data_${new Date().toISOString().split("T")[0]}.xlsx`)
  }
}
