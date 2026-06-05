"use client"

import type { WaterQualityPageFilters } from "@/features/water-quality/types"

export const WATER_QUALITY_TABS = new Set([
  "alerts",
  "parameter",
  "environment",
  "depth",
])

export const CHART_TABS = new Set(["parameter", "environment", "depth"])

export function resolveWaterQualityTab(value: string | null | undefined): WaterQualityPageFilters["activeTab"] {
  return value && WATER_QUALITY_TABS.has(value)
    ? (value as WaterQualityPageFilters["activeTab"])
    : "environment"
}

export function buildWaterQualityTabQuery(searchParams: URLSearchParams, value: string) {
  const params = new URLSearchParams(searchParams.toString())
  if (value === "environment") {
    params.delete("tab")
  } else {
    params.set("tab", value)
  }
  return params.toString()
}
