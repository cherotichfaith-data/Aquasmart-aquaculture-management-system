"use client"

import { useEffect, useMemo, useState, type SetStateAction } from "react"
import { DEFAULT_TIME_PERIOD, type TimePeriod } from "@/lib/time-period"
import { normalizeStageFilter, type StageFilter } from "@/lib/stage-filter"

export type { TimePeriod } from "@/lib/time-period"

export type SharedFiltersState = {
  selectedBatch: string
  selectedSystem: string
  selectedStage: StageFilter
  timePeriod: TimePeriod
}

type SharedFiltersDraft = {
  sourceToken: symbol
  values: SharedFiltersState
}

const buildSharedFiltersState = (
  defaultTimePeriod: TimePeriod,
  initialValues?: Partial<SharedFiltersState>,
): SharedFiltersState => ({
  selectedBatch: initialValues?.selectedBatch ?? "all",
  selectedSystem: initialValues?.selectedSystem ?? "all",
  selectedStage: normalizeStageFilter(initialValues?.selectedStage),
  timePeriod: initialValues?.timePeriod ?? defaultTimePeriod,
})

const serializeSharedFiltersSource = (
  values: SharedFiltersState,
  resetKey?: string | null,
) =>
  [
    resetKey ?? "",
    values.selectedBatch,
    values.selectedSystem,
    values.selectedStage,
    values.timePeriod,
  ].join("|")

export function useSharedFilters(
  defaultTimePeriod: TimePeriod = DEFAULT_TIME_PERIOD,
  initialValues?: Partial<SharedFiltersState>,
  options?: {
    authoritativeInitialValues?: boolean
    resetKey?: string | null
    urlValues?: Partial<Record<keyof SharedFiltersState, string>>
    urlKeys?: Partial<Record<keyof SharedFiltersState, string>>
  },
) {
  const initialState = buildSharedFiltersState(defaultTimePeriod, initialValues)
  const sourceSignature = serializeSharedFiltersSource(initialState, options?.resetKey)
  const currentSourceToken = useMemo(() => Symbol(sourceSignature), [sourceSignature])
  const [draft, setDraft] = useState<SharedFiltersDraft>(() => ({
    sourceToken: currentSourceToken,
    values: initialState,
  }))
  const resolvedValues = draft.sourceToken === currentSourceToken ? draft.values : initialState

  const updateField = <Key extends keyof SharedFiltersState>(
    key: Key,
    value: SetStateAction<SharedFiltersState[Key]>,
  ) => {
    setDraft((current) => {
      const baseValues = current.sourceToken === currentSourceToken ? current.values : initialState
      const previousValue = baseValues[key]
      const nextValue =
        typeof value === "function"
          ? (value as (previous: SharedFiltersState[Key]) => SharedFiltersState[Key])(previousValue)
          : value

      return {
        sourceToken: currentSourceToken,
        values: {
          ...baseValues,
          [key]: nextValue,
        },
      }
    })
  }

  useEffect(() => {
    if (typeof window === "undefined") return

    const params = new URLSearchParams(window.location.search)
    let changed = false

    const syncParam = (key: keyof SharedFiltersState, value: string) => {
      const defaultUrlKey = key === "timePeriod" ? "period" : key.replace("selected", "").toLowerCase()
      const urlKey = options?.urlKeys?.[key] ?? defaultUrlKey
      const current = params.get(urlKey)
      const isDefault = value === "all" || (key === "timePeriod" && value === defaultTimePeriod)
      const nextUrlValue = options?.urlValues?.[key] ?? value

      if (current == null && isDefault) return
      if (current === nextUrlValue) return

      changed = true
      if (isDefault) {
        params.delete(urlKey)
        if (key === "selectedSystem" && urlKey === "cage") params.delete("system")
        if (key === "selectedSystem" && urlKey === "system") params.delete("cage")
      } else {
        params.set(urlKey, nextUrlValue)
        if (key === "selectedSystem" && urlKey === "cage") params.delete("system")
        if (key === "selectedSystem" && urlKey === "system") params.delete("cage")
      }
    }

    syncParam("selectedBatch", initialState.selectedBatch)
    syncParam("selectedSystem", initialState.selectedSystem)
    syncParam("selectedStage", initialState.selectedStage)
    syncParam("timePeriod", initialState.timePeriod)

    if (changed) {
      const nextQuery = params.toString()
      window.history.replaceState(null, "", nextQuery ? `${window.location.pathname}?${nextQuery}` : window.location.pathname)
    }
  }, [
    defaultTimePeriod,
    initialState.selectedBatch,
    initialState.selectedStage,
    initialState.selectedSystem,
    initialState.timePeriod,
    options?.resetKey,
    options?.urlKeys,
    options?.urlValues,
  ])

  return {
    selectedBatch: resolvedValues.selectedBatch,
    setSelectedBatch: (value: SetStateAction<string>) => updateField("selectedBatch", value),
    selectedSystem: resolvedValues.selectedSystem,
    setSelectedSystem: (value: SetStateAction<string>) => updateField("selectedSystem", value),
    selectedStage: resolvedValues.selectedStage,
    setSelectedStage: (value: SetStateAction<StageFilter>) => updateField("selectedStage", value),
    timePeriod: resolvedValues.timePeriod,
    setTimePeriod: (value: SetStateAction<TimePeriod>) => updateField("timePeriod", value),
  }
}

