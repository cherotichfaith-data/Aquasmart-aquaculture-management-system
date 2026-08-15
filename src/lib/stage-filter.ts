import { Constants, type Enums } from "@/lib/types/database"

export type StageFilter = "all" | Enums<"system_growth_stage">

export const GROWTH_STAGE_VALUES = Constants.public.Enums.system_growth_stage

export function formatGrowthStage(value: StageFilter | string | null | undefined) {
  switch (value) {
    case "nursing":
      return "Nursing"
    case "grow_out":
      return "Grow Out"
    case "all":
      return "All Stages"
    default:
      return value ? String(value).replaceAll("_", " ") : "Unspecified"
  }
}

export function normalizeStageFilter(value: unknown): StageFilter {
  if (typeof value !== "string") return "all"
  const normalized = value.trim()
  if (!normalized || normalized === "all") return "all"
  if (!GROWTH_STAGE_VALUES.includes(normalized as Enums<"system_growth_stage">)) return "all"
  return normalized as StageFilter
}
