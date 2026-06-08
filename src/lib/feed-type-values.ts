import type { Enums } from "@/lib/types/database"

/**
 * Feed categories selectable when creating feed types.
 * Subset of the `feed_category` DB enum; excludes the unknown fallback value.
 */
export const UI_FEED_CATEGORIES = [
  "pre-starter",
  "starter",
  "pre-grower",
  "grower",
  "finisher",
  "broodstock",
] as const satisfies readonly Enums<"feed_category">[]

/**
 * Feed pellet sizes selectable when creating feed types.
 * Subset of the `feed_pellet_size` DB enum; excludes legacy/alternate sizes
 * and the unknown fallback value.
 */
export const UI_FEED_PELLET_SIZES = [
  "mash_powder",
  "<0.49mm",
  "0.5-0.99mm",
  "1.0-1.5mm",
  "1.5-1.99mm",
  "2mm",
  "2.5mm",
  "3mm",
] as const satisfies readonly Enums<"feed_pellet_size">[]
