"use client"

import { normalizeStageFilter, type StageFilter } from "@/lib/stage-filter"

export const parseDashboardStageParam = (value: string | null): StageFilter => normalizeStageFilter(value)
