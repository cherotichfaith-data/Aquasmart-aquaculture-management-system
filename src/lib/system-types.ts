import type { Enums } from "@/lib/types/database"

/**
 * System types selectable in data-entry UI.
 * Subset of the `system_type` DB enum; excludes DB/internal aggregate types:
 * cage, compartment, and all_active_cages.
 */
export const FORM_SYSTEM_TYPES = [
  "rectangular_cage",
  "circular_cage",
  "pond",
  "tank",
] as const satisfies readonly Enums<"system_type">[]

const FORM_SYSTEM_TYPE_LABELS: Record<(typeof FORM_SYSTEM_TYPES)[number], string> = {
  rectangular_cage: "Rectangular Cage",
  circular_cage: "Circular Cage",
  pond: "Pond",
  tank: "Tank",
}

export const FORM_SYSTEM_TYPE_OPTIONS = FORM_SYSTEM_TYPES.map((value) => ({
  value,
  label: FORM_SYSTEM_TYPE_LABELS[value],
}))
