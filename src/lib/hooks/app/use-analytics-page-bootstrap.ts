"use client"

import { useSearchParams } from "next/navigation"
import { useActiveFarm } from "@/lib/hooks/app/use-active-farm"
import { DEFAULT_TIME_PERIOD, parseCustomPeriodUrlValue, type AnalyticsTimeScope } from "@/lib/time-period"
import {
  useSharedFilters,
  type SharedFiltersState,
  type TimePeriod,
} from "@/lib/hooks/app/use-shared-filters"
import { useTimePeriodBounds } from "@/lib/hooks/app/use-time-period-bounds"

type SharedFilterOverrides = Partial<SharedFiltersState>

const hasSharedFilterOverrides = (value?: SharedFilterOverrides) =>
  Boolean(
    value &&
      (value.selectedBatch !== undefined ||
        value.selectedSystem !== undefined ||
        value.selectedStage !== undefined ||
        value.timePeriod !== undefined),
  )

const normalizeFarmId = (value?: string | null) => {
  const trimmed = typeof value === "string" ? value.trim() : ""
  if (!trimmed || trimmed === "null" || trimmed === "undefined") {
    return null
  }
  return trimmed
}

const mergeSharedFilterOverrides = (
  initialFilters?: SharedFilterOverrides,
  filterOverrides?: SharedFilterOverrides,
) => {
  const merged: SharedFilterOverrides = {}

  if (initialFilters?.selectedBatch !== undefined) {
    merged.selectedBatch = initialFilters.selectedBatch
  }
  if (initialFilters?.selectedSystem !== undefined) {
    merged.selectedSystem = initialFilters.selectedSystem
  }
  if (initialFilters?.selectedStage !== undefined) {
    merged.selectedStage = initialFilters.selectedStage
  }
  if (initialFilters?.timePeriod !== undefined) {
    merged.timePeriod = initialFilters.timePeriod
  }

  if (filterOverrides?.selectedBatch !== undefined) {
    merged.selectedBatch = filterOverrides.selectedBatch
  }
  if (filterOverrides?.selectedSystem !== undefined) {
    merged.selectedSystem = filterOverrides.selectedSystem
  }
  if (filterOverrides?.selectedStage !== undefined) {
    merged.selectedStage = filterOverrides.selectedStage
  }
  if (filterOverrides?.timePeriod !== undefined) {
    merged.timePeriod = filterOverrides.timePeriod
  }

  return hasSharedFilterOverrides(merged) ? merged : undefined
}

export function useAnalyticsPageBootstrap(params: {
  initialFarmId?: string | null
  initialFarmName?: string | null
  defaultTimePeriod?: TimePeriod
  initialFilters?: SharedFilterOverrides
  filterOverrides?: SharedFilterOverrides
  boundsEnabled?: boolean
  boundsScope?: AnalyticsTimeScope
  useSystemBounds?: boolean
  filterUrlValues?: Partial<Record<keyof SharedFiltersState, string>>
  filterUrlKeys?: Partial<Record<keyof SharedFiltersState, string>>
} = {}) {
  const searchParams = useSearchParams()
  const initialFarmId = normalizeFarmId(params.initialFarmId)
  const activeFarm = useActiveFarm({ initialFarmId, initialFarmName: params.initialFarmName })
  const farmId = activeFarm.farmId ?? initialFarmId ?? null
  const rawPeriodParam = searchParams.get("period")
  const customRange = parseCustomPeriodUrlValue(rawPeriodParam)

  const sharedFilterInitialValues = mergeSharedFilterOverrides(params.initialFilters, params.filterOverrides)

  const sharedFilters = useSharedFilters(params.defaultTimePeriod ?? DEFAULT_TIME_PERIOD, sharedFilterInitialValues, {
    urlValues: params.filterUrlValues,
    urlKeys: params.filterUrlKeys,
  })
  const selectedSystemId =
    sharedFilters.selectedSystem !== "all" && Number.isFinite(Number(sharedFilters.selectedSystem))
      ? Number(sharedFilters.selectedSystem)
      : undefined
  const selectedBatchId =
    sharedFilters.selectedBatch !== "all" && Number.isFinite(Number(sharedFilters.selectedBatch))
      ? Number(sharedFilters.selectedBatch)
      : undefined
  const boundsSystemId = params.useSystemBounds === false ? undefined : selectedSystemId
  const boundsQuery = useTimePeriodBounds({
    farmId,
    timePeriod: sharedFilters.timePeriod,
    customRange,
    systemId: boundsSystemId,
    batchId: selectedBatchId,
    scope: params.boundsScope ?? "dashboard",
    enabled: params.boundsEnabled,
  })

  return {
    ...activeFarm,
    farmId,
    ...sharedFilters,
    boundsQuery,
    dateFrom: boundsQuery.start ?? undefined,
    dateTo: boundsQuery.end ?? undefined,
    boundsReady: boundsQuery.hasBounds,
  }
}
