"use client"

import { useEffect, useRef, useState } from "react"
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
const EVENT_NAME = "aquasmart:shared-filters"
const TIME_PERIODS: TimePeriod[] = ["day", "week", "2 weeks", "month", "quarter", "6 months", "year"]
const STAGES: StageFilter[] = ["all", "nursing", "grow_out"]

const isTimePeriod = (value: unknown): value is TimePeriod =>
  typeof value === "string" && TIME_PERIODS.includes(value as TimePeriod)

const isStage = (value: unknown): value is StageFilter =>
  typeof value === "string" && STAGES.includes(value as StageFilter)

export function useSharedFilters(defaultTimePeriod: TimePeriod = "2 weeks") {
  const initialDefaultPeriod = useRef(defaultTimePeriod)
  const instanceId = useRef(`shared-filters-${Math.random().toString(36).slice(2)}`)
  const suppressEmit = useRef(false)
  const [selectedBatch, setSelectedBatch] = useState<string>("all")
  const [selectedSystem, setSelectedSystem] = useState<string>("all")
  const [selectedStage, setSelectedStage] = useState<StageFilter>("all")
  const [timePeriod, setTimePeriod] = useState<TimePeriod>(initialDefaultPeriod.current)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    if (typeof window === "undefined") return
    const fallbackPeriod = initialDefaultPeriod.current
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<SharedFiltersState>
        setSelectedBatch(typeof parsed.selectedBatch === "string" ? parsed.selectedBatch : "all")
        setSelectedSystem(typeof parsed.selectedSystem === "string" ? parsed.selectedSystem : "all")
        setSelectedStage(isStage(parsed.selectedStage) ? parsed.selectedStage : "all")
        setTimePeriod(isTimePeriod(parsed.timePeriod) ? parsed.timePeriod : fallbackPeriod)
      } else {
        setTimePeriod(fallbackPeriod)
      }
    } catch {
      setTimePeriod(fallbackPeriod)
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
  }, [])

  useEffect(() => {
    if (!hydrated || typeof window === "undefined") return
    const payload: SharedFiltersState = {
      selectedBatch,
      selectedSystem,
      selectedStage,
      timePeriod,
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
    if (suppressEmit.current) {
      suppressEmit.current = false
      return
    }
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: { sourceId: instanceId.current, state: payload } }))
  }, [hydrated, selectedBatch, selectedStage, selectedSystem, timePeriod])

  useEffect(() => {
    if (typeof window === "undefined") return
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ sourceId: string; state: SharedFiltersState }>).detail
      if (!detail || detail.sourceId === instanceId.current) return
      const next = detail.state
      suppressEmit.current = true
      setSelectedBatch(next.selectedBatch)
      setSelectedSystem(next.selectedSystem)
      setSelectedStage(next.selectedStage)
      setTimePeriod(next.timePeriod)
      setHydrated(true)
    }
    window.addEventListener(EVENT_NAME, handler as EventListener)
    return () => window.removeEventListener(EVENT_NAME, handler as EventListener)
  }, [])

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

