"use client"

import { useInsertMutation } from "@/lib/hooks/use-insert-mutation"

export function useCreateFeedSupplier() {
  return useInsertMutation({
    table: "feed_supplier",
    invalidate: ["options"],
    successMessage: "Feed supplier created.",
    errorMessage: "Failed to create feed supplier.",
  })
}

export function useCreateFeedType() {
  return useInsertMutation({
    table: "feed_type",
    invalidate: ["options"],
    successMessage: "Feed type created.",
    errorMessage: "Failed to create feed type.",
  })
}

export function useCreateFingerlingSupplier() {
  return useInsertMutation({
    table: "fingerling_supplier",
    invalidate: ["options"],
    successMessage: "Fingerling supplier created.",
    errorMessage: "Failed to create fingerling supplier.",
  })
}

export function useCreateFingerlingBatch() {
  return useInsertMutation({
    table: "fingerling_batch",
    invalidate: ["options"],
    successMessage: "Batch created.",
    errorMessage: "Failed to create batch.",
  })
}
