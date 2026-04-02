import type { Database } from "@/lib/types/database"
import { postJson } from "@/lib/commands/_utils"

type Row<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Row"]
type Insert<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Insert"]

type MutationMeta = {
  farmId: string
  systemId?: number | null
  date: string
}

type MutationResponse<T extends keyof Database["public"]["Tables"]> = {
  data: Row<T> | Row<T>[]
  meta: MutationMeta
}

export type HarvestInput = Insert<"fish_harvest">
export type SamplingInput = Insert<"fish_sampling_weight">
export type StockingInput = Insert<"fish_stocking">
export type TransferInput = Insert<"fish_transfer">
export type WaterQualityInput = Insert<"water_quality_measurement">[]
export type FeedInventorySnapshotInput = Insert<"feed_inventory_snapshot">
export type MortalityInput = Insert<"fish_mortality">
export type SystemInput = Insert<"system">

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

export function recordFeedInventorySnapshot(payload: FeedInventorySnapshotInput) {
  return postJson<MutationResponse<"feed_inventory_snapshot">, FeedInventorySnapshotInput>(
    "/api/feed-inventory/record",
    payload,
  )
}

export function recordMortality(payload: MortalityInput) {
  return postJson<MutationResponse<"fish_mortality">, MortalityInput>("/api/mortality/record", payload)
}

export function createSystem(payload: SystemInput) {
  return postJson<MutationResponse<"system">, SystemInput>("/api/system/create", payload)
}
