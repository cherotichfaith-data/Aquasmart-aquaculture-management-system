import { StatCard } from "@/components/shared/stat-card"
import { formatNumberValue } from "@/lib/analytics-format"
import { isFiniteNumber } from "@/features/dashboard/lib/table-cells"
import type { BatchesSummaryRow } from "@/features/batches/types"

/**
 * Header cards for the Batches page. Every figure comes straight from
 * api_batches_summary (SQL) -- this component only formats what the backend
 * hands it, it never sums or averages rows itself.
 */
export default function BatchesKpis({ summary }: { summary: BatchesSummaryRow | null }) {
  const totalStocked = summary?.total_stocked ?? null
  const activeBatches = summary?.active_batches ?? null
  const survivalRate = summary?.survival_pct ?? null
  const overallEfcr = summary?.overall_efcr ?? null
  const overallSgr = summary?.overall_sgr ?? null

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
      <StatCard
        label="Total Stocked"
        value={isFiniteNumber(totalStocked) ? formatNumberValue(totalStocked) : "--"}
        hint="fish, at delivery"
      />
      <StatCard
        label="Active Batches"
        value={isFiniteNumber(activeBatches) ? formatNumberValue(activeBatches) : "--"}
      />
      <StatCard
        label="Survival Rate"
        value={isFiniteNumber(survivalRate) ? `${formatNumberValue(survivalRate, { decimals: 1 })}%` : "--"}
        hint="live vs. stocked"
      />
      <StatCard
        label="Overall eFCR"
        value={isFiniteNumber(overallEfcr) ? formatNumberValue(overallEfcr, { decimals: 2 }) : "--"}
      />
      <StatCard
        label="Overall SGR"
        value={isFiniteNumber(overallSgr) ? `${formatNumberValue(overallSgr, { decimals: 2 })}%/day` : "--"}
      />
    </div>
  )
}
