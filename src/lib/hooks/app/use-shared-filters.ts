"use client"

import { useEffect, useState } from "react"
import { DEFAULT_TIME_PERIOD, type TimePeriod } from "@/lib/time-period"
import { normalizeStageFilter, type StageFilter } from "@/lib/stage-filter"

export type { TimePeriod } from "@/lib/time-period"

export type SharedFiltersState = {
  selectedBatch: string
  selectedSystem: string
  selectedStage: StageFilter
  timePeriod: TimePeriod
}

export function useSharedFilters(
  defaultTimePeriod: TimePeriod = DEFAULT_TIME_PERIOD,
  initialValues?: Partial<SharedFiltersState>,
  options?: {
    authoritativeInitialValues?: boolean
    resetKey?: string | null
  },
) {
  const initialBatch = initialValues?.selectedBatch ?? "all"
  const initialSystem = initialValues?.selectedSystem ?? "all"
  const initialStage = normalizeStageFilter(initialValues?.selectedStage)
  const initialPeriod = initialValues?.timePeriod ?? defaultTimePeriod
  const [selectedBatch, setSelectedBatch] = useState<string>(initialBatch)
  const [selectedSystem, setSelectedSystem] = useState<string>(initialSystem)
  const [selectedStage, setSelectedStage] = useState<StageFilter>(initialStage)
  const [timePeriod, setTimePeriod] = useState<TimePeriod>(initialPeriod)

  useEffect(() => {
    setSelectedBatch(initialBatch)
    setSelectedSystem(initialSystem)
    setSelectedStage(initialStage)
    setTimePeriod(initialPeriod)
  }, [initialBatch, initialPeriod, initialStage, initialSystem, options?.resetKey])

  useEffect(() => {
    if (typeof window === "undefined") return

    const params = new URLSearchParams(window.location.search)
    let changed = false

    const syncParam = (key: keyof SharedFiltersState, value: string) => {
      const current = params.get(key === "timePeriod" ? "period" : key.replace("selected", "").toLowerCase())
      const urlKey = key === "timePeriod" ? "period" : key.replace("selected", "").toLowerCase()
      const isDefault = value === "all" || (key === "timePeriod" && value === defaultTimePeriod)

      if (current == null && isDefault) return
      if (current === value) return

      changed = true
      if (isDefault) {
        params.delete(urlKey)
      } else {
        params.set(urlKey, value)
      }
    }

    syncParam("selectedBatch", initialBatch)
    syncParam("selectedSystem", initialSystem)
    syncParam("selectedStage", initialStage)
    syncParam("timePeriod", initialPeriod)

    if (changed) {
      const nextQuery = params.toString()
      window.history.replaceState(null, "", nextQuery ? `${window.location.pathname}?${nextQuery}` : window.location.pathname)
    }
  }, [defaultTimePeriod, initialBatch, initialPeriod, initialStage, initialSystem, options?.resetKey])

  return {
    selectedBatch,
    setSelectedBatch,
    selectedSystem,
    setSelectedSystem,
    selectedStage,
    setSelectedStage,
    timePeriod,
    setTimePeriod,
  }
}

