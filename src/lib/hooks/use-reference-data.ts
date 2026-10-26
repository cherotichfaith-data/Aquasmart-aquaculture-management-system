"use client"

import { invalidateReferenceDataQueries } from "@/lib/cache/react-query"
import {
  createFingerlingBatchAction,
  createFingerlingSupplierAction,
} from "@/features/farm/mutations.server"
import { useWriteThroughMutation } from "@/lib/hooks/use-write-through-mutation"

export function useCreateFingerlingSupplier() {
  return useWriteThroughMutation({
    mutationFn: createFingerlingSupplierAction,
    invalidate: ({ queryClient }) =>
      invalidateReferenceDataQueries(queryClient, { kind: "fingerling-suppliers" }),
    successMessage: "Fingerling supplier created.",
    errorMessage: "Failed to create fingerling supplier.",
  })
}

export function useCreateFingerlingBatch() {
  return useWriteThroughMutation({
    mutationFn: createFingerlingBatchAction,
    invalidate: ({ queryClient, payload }) =>
      payload.farm_id
        ? invalidateReferenceDataQueries(queryClient, { kind: "batches", farmId: payload.farm_id })
        : Promise.resolve(),
    successMessage: "Batch created.",
    errorMessage: "Failed to create batch.",
  })
}
