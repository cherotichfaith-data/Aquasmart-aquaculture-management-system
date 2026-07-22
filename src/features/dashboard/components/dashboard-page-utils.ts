"use client"

import { normalizeStageFilter, type StageFilter } from "@/lib/stage-filter"

export const parseDashboardStageParam = (value: string | null): StageFilter => normalizeStageFilter(value)

/** Dashboard scope toggle: `?view=cage|batch`, default cage. */
export type DashboardViewMode = "cage" | "batch"

export const parseDashboardViewParam = (value: string | null): DashboardViewMode =>
  value === "batch" ? "batch" : "cage"
