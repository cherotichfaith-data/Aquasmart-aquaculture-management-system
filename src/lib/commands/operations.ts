import type { Database } from "@/lib/types/database"
import { postJson } from "@/lib/commands/_utils"

type Row<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Row"]
type Insert<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Insert"]
type WithFarmId<T> = T & {
  farm_id?: string | null
}
type DbAssignedCycle<T extends { cycle_id?: unknown }> = Omit<T, "cycle_id"> & {
  cycle_id?: T["cycle_id"]
}

type MutationMeta = {
  farmId: string
  systemId?: number | null
  date: string
}

type MutationResponse<T extends keyof Database["public"]["Tables"]> = {
  data: Row<T> | Row<T>[]
  meta: MutationMeta
}

export type HarvestInput = WithFarmId<Insert<"fish_harvest">>
export type SamplingInput = WithFarmId<Insert<"fish_sampling_weight">>
export type StockingInput = WithFarmId<DbAssignedCycle<Insert<"fish_stocking">>>
export type TransferInput = WithFarmId<Insert<"fish_transfer">>
export type WaterQualityInput = Array<WithFarmId<Insert<"water_quality_measurement">>>
export type MortalityInput = WithFarmId<Insert<"fish_mortality">>

export function recordHarvest(payload: HarvestInput) {
  return postJson<MutationResponse<"fish_harvest">, HarvestInput>("/api/harvest/record", payload)
}

export function recordSampling(payload: SamplingInput) {
  return postJson<MutationResponse<"fish_sampling_weight">, SamplingInput>("/api/sampling/record", payload)
}

export function recordStocking(payload: StockingInput) {
  return postJson<MutationResponse<"fish_stocking">, StockingInput>("/api/stocking/record", payload)
}

export function recordTransfer(payload: TransferInput) {
  return postJson<MutationResponse<"fish_transfer">, TransferInput>("/api/transfer/record", payload)
}

export function recordWaterQuality(payload: WaterQualityInput) {
  return postJson<MutationResponse<"water_quality_measurement">, WaterQualityInput>("/api/water-quality/record", payload)
}

export function recordMortality(payload: MortalityInput) {
  return postJson<MutationResponse<"fish_mortality">, MortalityInput>("/api/mortality/record", payload)
}
