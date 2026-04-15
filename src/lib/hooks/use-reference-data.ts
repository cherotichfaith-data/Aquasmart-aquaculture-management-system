"use client"

import { invalidateReferenceDataQueries } from "@/lib/cache/react-query"
import {
  createFeedSupplier,
  createFeedType,
  createFingerlingBatch,
  createFingerlingSupplier,
} from "@/lib/commands/reference-data"
import { useWriteThroughMutation } from "@/lib/hooks/use-write-through-mutation"

export function useCreateFeedSupplier() {
  return useWriteThroughMutation({
    mutationFn: createFeedSupplier,
    invalidate: ({ queryClient }) =>
      invalidateReferenceDataQueries(queryClient, { kind: "feed-suppliers" }),
    successMessage: "Feed supplier created.",
    errorMessage: "Failed to create feed supplier.",
  })
}

export function useCreateFeedType() {
  return useWriteThroughMutation({
    mutationFn: createFeedType,
    invalidate: ({ queryClient }) => invalidateReferenceDataQueries(queryClient, { kind: "feed-types" }),
    successMessage: "Feed type created.",
    errorMessage: "Failed to create feed type.",
  })
}

export function useCreateFingerlingSupplier() {
  return useWriteThroughMutation({
    mutationFn: createFingerlingSupplier,
    invalidate: ({ queryClient }) =>
      invalidateReferenceDataQueries(queryClient, { kind: "fingerling-suppliers" }),
    successMessage: "Fingerling supplier created.",
    errorMessage: "Failed to create fingerling supplier.",
  })
}

export function useCreateFingerlingBatch() {
  return useWriteThroughMutation({
    mutationFn: createFingerlingBatch,
    invalidate: ({ queryClient, payload }) =>
      payload.farm_id
        ? invalidateReferenceDataQueries(queryClient, { kind: "batches", farmId: payload.farm_id })
        : Promise.resolve(),
    successMessage: "Batch created.",
    errorMessage: "Failed to create batch.",
  })
}
