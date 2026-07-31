import type { Database } from "@/lib/types/database"
import type { RecordWaterQualityRowsInput } from "@/features/water-quality/schemas"

type Insert<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Insert"]
type WithFarmId<T> = T & {
  farm_id?: string | null
}
type DbAssignedCycle<T extends { cycle_id?: unknown }> = Omit<T, "cycle_id"> & {
  cycle_id?: T["cycle_id"]
}
type DbDerivedAbw<T extends { abw?: unknown }> = Omit<T, "abw"> & {
  abw?: never
}

export type HarvestInput = WithFarmId<DbDerivedAbw<Insert<"fish_harvest">>>
export type SamplingInput = WithFarmId<DbDerivedAbw<Insert<"fish_sampling_weight">>>
export type StockingInput = WithFarmId<DbDerivedAbw<DbAssignedCycle<Insert<"fish_stocking">>>>
export type TransferInput = WithFarmId<DbDerivedAbw<Insert<"fish_transfer">>>
export type WaterQualityInput = RecordWaterQualityRowsInput
export type MortalityInput = WithFarmId<Insert<"fish_mortality">>
