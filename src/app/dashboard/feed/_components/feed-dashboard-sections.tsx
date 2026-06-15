"use client"

import type { Tables } from "@/lib/types/database"
import type { ProductionTrendRpcRow } from "@/features/dashboard/types"
import {
  FeedEfcrSection,
  FeedRateBiomassSection,
  FeedRateMortalitySection,
  FeedRateSection,
} from "../_lib/feed-sections"
import type { EfcrTrendPoint, FeedRatePoint } from "../_lib/feed-analytics"

export function FeedDashboardError({
  errorMessage,
  onRetry,
}: {
  errorMessage: string
  onRetry: () => void
}) {
  return (
    <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
      <div className="font-semibold">Unable to load feed analytics</div>
      <div className="mt-1">{errorMessage}</div>
      <button type="button" onClick={onRetry} className="mt-3 rounded-md border border-destructive/30 px-3 py-1.5">
        Retry
      </button>
    </div>
  )
}

export function FeedCoreSection({
  loading,
  feedRatePoints,
  efcrTrendPoints,
  productionRows,
  mortalityRows,
  systemNameById,
}: {
  loading: boolean
  feedRatePoints: FeedRatePoint[]
  efcrTrendPoints: EfcrTrendPoint[]
  productionRows: ProductionTrendRpcRow[]
  mortalityRows: Tables<"fish_mortality">[]
  systemNameById: Map<number, string>
}) {
  return (
    <div className="space-y-6">
      <FeedRateSection loading={loading} points={feedRatePoints} systemNameById={systemNameById} />

      <FeedEfcrSection loading={loading} points={efcrTrendPoints} />

      <FeedRateBiomassSection
        loading={loading}
        feedRatePoints={feedRatePoints}
        productionRows={productionRows}
      />

      <FeedRateMortalitySection
        loading={loading}
        feedRatePoints={feedRatePoints}
        mortalityRows={mortalityRows}
      />
    </div>
  )
}
