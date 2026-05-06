"use client"

import * as XLSX from "xlsx"
import { getProductionSummary } from "@/lib/api/production"
import { normalizeStageFilter, type StageFilter } from "@/lib/stage-filter"

export const parseDashboardStageParam = (value: string | null): StageFilter => normalizeStageFilter(value)

export async function downloadDashboardSummary(params: {
  farmId: string | null
  selectedSystem: string
  selectedStage: StageFilter
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
