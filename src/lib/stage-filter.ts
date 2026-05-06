import type { Enums } from "@/lib/types/database"

export type StageFilter = "all" | Enums<"system_growth_stage">

export function normalizeStageFilter(value: unknown): StageFilter {
  if (typeof value !== "string") return "all"
  const normalized = value.trim()
  if (!normalized || normalized === "all") return "all"
  return normalized as StageFilter
}
