"use client"

import { useEffect, useState } from "react"
import type { Enums } from "@/lib/types/database"

type StageFilter = "all" | Enums<"system_growth_stage">
type TimePeriod = Enums<"time_period">

type SharedFiltersState = {
  selectedBatch: string
  selectedSystem: string
  selectedStage: StageFilter
  timePeriod: TimePeriod
}

const STORAGE_KEY = "aquasmart:shared-filters:v1"
const TIME_PERIODS: TimePeriod[] = ["day", "week", "2 weeks", "month", "quarter", "6 months", "year"]
const STAGES: StageFilter[] = ["all", "nursing", "grow_out"]

const isTimePeriod = (value: unknown): value is TimePeriod =>
  typeof value === "string" && TIME_PERIODS.includes(value as TimePeriod)

const isStage = (value: unknown): value is StageFilter =>
  typeof value === "string" && STAGES.includes(value as StageFilter)

export function useSharedFilters(defaultTimePeriod: TimePeriod = "2 weeks") {
  const [selectedBatch, setSelectedBatch] = useState<string>("all")
  const [selectedSystem, setSelectedSystem] = useState<string>("all")
  const [selectedStage, setSelectedStage] = useState<StageFilter>("all")
  const [timePeriod, setTimePeriod] = useState<TimePeriod>(defaultTimePeriod)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    if (typeof window === "undefined") return
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<SharedFiltersState>
        setSelectedBatch(typeof parsed.selectedBatch === "string" ? parsed.selectedBatch : "all")
        setSelectedSystem(typeof parsed.selectedSystem === "string" ? parsed.selectedSystem : "all")
        setSelectedStage(isStage(parsed.selectedStage) ? parsed.selectedStage : "all")
        setTimePeriod(isTimePeriod(parsed.timePeriod) ? parsed.timePeriod : defaultTimePeriod)
      } else {
        setTimePeriod(defaultTimePeriod)
      }
    } catch {
      setTimePeriod(defaultTimePeriod)
    } finally {
      if (typeof window !== "undefined") {
        const params = new URLSearchParams(window.location.search)
        const paramSystem = params.get("system")
        const paramBatch = params.get("batch")
        const paramStage = params.get("stage")
        const paramPeriod = params.get("period")

        if (paramSystem) setSelectedSystem(paramSystem)
        if (paramBatch) setSelectedBatch(paramBatch)
        if (isStage(paramStage)) setSelectedStage(paramStage)
        if (isTimePeriod(paramPeriod)) setTimePeriod(paramPeriod)
      }
      setHydrated(true)
    }
  }, [defaultTimePeriod])

  useEffect(() => {
    if (!hydrated || typeof window === "undefined") return
    const payload: SharedFiltersState = {
      selectedBatch,
      selectedSystem,
      selectedStage,
      timePeriod,
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  }, [hydrated, selectedBatch, selectedStage, selectedSystem, timePeriod])

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

