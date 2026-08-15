import { StatCard } from "@/components/shared/stat-card"
import { formatNumberValue } from "@/lib/analytics-format"
import { isFiniteNumber } from "@/features/dashboard/lib/table-cells"
import type { BatchStockingInfo, DashboardBatchRpcRow } from "@/features/batches/types"

export default function BatchesKpis({
  batches,
  stockingByBatchId,
}: {
  batches: DashboardBatchRpcRow[]
  stockingByBatchId: Record<number, BatchStockingInfo>
}) {
  const stockingRows = batches.map((batch) => stockingByBatchId[batch.batch_id]).filter(Boolean) as BatchStockingInfo[]
  const totalStocked = stockingRows.reduce((sum, row) => sum + (row.numberOfFish ?? 0), 0)
  const finiteEfcrBatches = batches.filter((batch) => isFiniteNumber(batch.efcr))
  const bestEfcrBatch = finiteEfcrBatches.length
    ? finiteEfcrBatches.reduce((best, batch) => (batch.efcr! < best.efcr! ? batch : best))
    : null

  // Survival = live fish now (fish_end) against fish stocked at delivery, weighted across
  // batches (not a simple average) so a handful of small batches can't skew the headline number.
  const survivalPairs = batches
    .map((batch) => ({ stocked: stockingByBatchId[batch.batch_id]?.numberOfFish, live: batch.fish_end }))
    .filter(
      (pair): pair is { stocked: number; live: number } =>
        isFiniteNumber(pair.stocked) && pair.stocked > 0 && isFiniteNumber(pair.live),
    )
  const stockedForSurvival = survivalPairs.reduce((sum, pair) => sum + pair.stocked, 0)
  const survivalRate = stockedForSurvival > 0
    ? (survivalPairs.reduce((sum, pair) => sum + pair.live, 0) / stockedForSurvival) * 100
    : null

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      <StatCard label="Total Stocked" value={formatNumberValue(totalStocked)} hint="fish, at delivery" />
      <StatCard label="Active Batches" value={formatNumberValue(batches.length)} />
      <StatCard
        label="Survival Rate"
        value={survivalRate != null ? `${formatNumberValue(survivalRate, { decimals: 1 })}%` : "--"}
        hint="live vs. stocked"
      />
      <StatCard
        label="Best eFCR"
        value={bestEfcrBatch ? formatNumberValue(bestEfcrBatch.efcr, { decimals: 2 }) : "--"}
        hint={bestEfcrBatch ? bestEfcrBatch.batch_name ?? undefined : undefined}
      />
    </div>
  )
}
