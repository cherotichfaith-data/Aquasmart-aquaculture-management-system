import type { Database } from "@/lib/types/database"
import { postJson } from "@/lib/commands/_utils"

type Row<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Row"]
type Insert<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Insert"]

type MutationResponse<T extends keyof Database["public"]["Tables"]> = {
  data: Row<T>
}

export type FeedSupplierInput = Insert<"feed_supplier">
export type FeedTypeInput = Insert<"feed_type">
export type FingerlingSupplierInput = Insert<"fingerling_supplier">
export type FingerlingBatchInput = Insert<"fingerling_batch">

export function createFeedSupplier(payload: FeedSupplierInput) {
  return postJson<MutationResponse<"feed_supplier">, FeedSupplierInput>("/api/feed-supplier/create", payload)
}

export function createFeedType(payload: FeedTypeInput) {
  return postJson<MutationResponse<"feed_type">, FeedTypeInput>("/api/feed-type/create", payload)
}

export function createFingerlingSupplier(payload: FingerlingSupplierInput) {
  return postJson<MutationResponse<"fingerling_supplier">, FingerlingSupplierInput>(
    "/api/fingerling-supplier/create",
    payload,
  )
}

export function createFingerlingBatch(payload: FingerlingBatchInput) {
  return postJson<MutationResponse<"fingerling_batch">, FingerlingBatchInput>(
    "/api/fingerling-batch/create",
    payload,
  )
}
