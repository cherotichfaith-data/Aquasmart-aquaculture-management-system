"use client"

import { useMemo } from "react"
import type { TimeBounds } from "@/lib/api/dashboard"
import { useActiveFarm } from "@/lib/hooks/app/use-active-farm"
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

export function useAnalyticsPageBootstrap(params: {
  initialFarmId?: string | null
  defaultTimePeriod?: TimePeriod
  initialFilters?: SharedFilterOverrides
  filterOverrides?: SharedFilterOverrides
  initialBounds?: TimeBounds
  boundsEnabled?: boolean
} = {}) {
  const activeFarm = useActiveFarm({ initialFarmId: params.initialFarmId })
  const farmId = activeFarm.farmId ?? params.initialFarmId ?? null

  const sharedFilterInitialValues = useMemo(() => {
    const merged: SharedFilterOverrides = {}

    if (params.initialFilters?.selectedBatch !== undefined) {
      merged.selectedBatch = params.initialFilters.selectedBatch
    }
    if (params.initialFilters?.selectedSystem !== undefined) {
      merged.selectedSystem = params.initialFilters.selectedSystem
    }
    if (params.initialFilters?.selectedStage !== undefined) {
      merged.selectedStage = params.initialFilters.selectedStage
    }
    if (params.initialFilters?.timePeriod !== undefined) {
      merged.timePeriod = params.initialFilters.timePeriod
    }

    if (params.filterOverrides?.selectedBatch !== undefined) {
      merged.selectedBatch = params.filterOverrides.selectedBatch
    }
    if (params.filterOverrides?.selectedSystem !== undefined) {
      merged.selectedSystem = params.filterOverrides.selectedSystem
    }
    if (params.filterOverrides?.selectedStage !== undefined) {
      merged.selectedStage = params.filterOverrides.selectedStage
    }
    if (params.filterOverrides?.timePeriod !== undefined) {
      merged.timePeriod = params.filterOverrides.timePeriod
    }

    return hasSharedFilterOverrides(merged) ? merged : undefined
  }, [
    params.filterOverrides?.selectedBatch,
    params.filterOverrides?.selectedStage,
    params.filterOverrides?.selectedSystem,
    params.filterOverrides?.timePeriod,
    params.initialFilters?.selectedBatch,
    params.initialFilters?.selectedStage,
    params.initialFilters?.selectedSystem,
    params.initialFilters?.timePeriod,
  ])

  const sharedFilters = useSharedFilters(params.defaultTimePeriod ?? "2 weeks", sharedFilterInitialValues)
  const boundsQuery = useTimePeriodBounds({
    farmId,
    timePeriod: sharedFilters.timePeriod,
    enabled: params.boundsEnabled,
    initialData: params.initialBounds,
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
