import type { Enums } from "@/lib/types/database"

/**
 * Transfer types available in the data-entry UI.
 * Subset of the `transfer_type` DB enum; excludes internal-only types:
 * broodstock, count_check, lab_sample, and training.
 */
export const UI_TRANSFER_TYPES = [
  "transfer",
  "grading",
  "density_thinning",
  "external_out",
] as const satisfies readonly Enums<"transfer_type">[]

export type UiTransferType = (typeof UI_TRANSFER_TYPES)[number]

export const TRANSFER_TYPE_LABELS: Record<UiTransferType, string> = {
  transfer: "Transfer",
  grading: "Grading",
  density_thinning: "Density thinning",
  external_out: "External out",
}
