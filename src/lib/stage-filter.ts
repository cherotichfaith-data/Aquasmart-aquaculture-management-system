import { Constants, type Enums } from "@/lib/types/database"

export type StageFilter = "all" | Enums<"system_growth_stage">

export const GROWTH_STAGE_VALUES = Constants.public.Enums.system_growth_stage

export function formatGrowthStage(value: StageFilter | string | null | undefined) {
  switch (value) {
    case "fingerling":
      return "Fingerling"
    case "juvenile":
      return "Juvenile"
    case "sub_adult":
      return "Sub-adult"
    case "broodstock":
      return "Broodstock"
    case "all":
      return "All Stages"
    default:
      return "Unspecified"
  }
}

export function normalizeStageFilter(value: unknown): StageFilter {
  if (typeof value !== "string") return "all"
  const normalized = value.trim()
  if (!normalized || normalized === "all") return "all"
  if (!GROWTH_STAGE_VALUES.includes(normalized as Enums<"system_growth_stage">)) return "all"
  return normalized as StageFilter
}
