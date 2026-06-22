"use client"

import { postJson } from "@/lib/commands/_utils"
import { isAbortLikeError } from "@/lib/api/_utils"
import type { DashboardPageInitialData } from "./types"

export async function getDashboardKpiOverview(params?: {
  farmId?: string | null
  stage?: string | null
  systemIds?: number[] | null
  dateFrom?: string | null
  dateTo?: string | null
  signal?: AbortSignal
}): Promise<DashboardPageInitialData["kpiOverview"]> {
  if (!params?.farmId || !params.dateFrom || !params.dateTo) {
    return { metrics: [], dateBounds: { start: params?.dateFrom ?? null, end: params?.dateTo ?? null } }
  }

  try {
    const response = await postJson<{ data: DashboardPageInitialData["kpiOverview"] }, Omit<NonNullable<typeof params>, "signal">>(
      "/api/dashboard/kpi-overview/query",
      {
        farmId: params.farmId,
        stage: params.stage,
        systemIds: params.systemIds ?? undefined,
        dateFrom: params.dateFrom,
        dateTo: params.dateTo,
      },
      { signal: params.signal },
    )
    return response.data
  } catch (error) {
    if (params.signal?.aborted || isAbortLikeError(error)) {
      return { metrics: [], dateBounds: { start: params.dateFrom ?? null, end: params.dateTo ?? null } }
    }
    return { metrics: [], dateBounds: { start: params.dateFrom ?? null, end: params.dateTo ?? null } }
  }
}
