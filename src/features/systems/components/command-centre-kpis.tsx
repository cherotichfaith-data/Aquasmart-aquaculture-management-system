import { StatCard } from "@/components/shared/stat-card"
import type { DashboardSystemRow } from "@/features/dashboard/types"
import type { WaterQualityMonthlyPoint } from "@/features/systems/types"
import { formatNumberValue, formatUnitValue } from "@/lib/analytics-format"
import { isFiniteNumber } from "@/features/dashboard/lib/table-cells"

export default function CommandCentreKpis({
  stockedRows,
  waterQualityMonthly,
}: {
  stockedRows: DashboardSystemRow[]
  waterQualityMonthly: WaterQualityMonthlyPoint[]
}) {
  const totalFish = stockedRows.reduce((sum, row) => sum + (row.fish_end ?? 0), 0)
  const totalBiomassKg = stockedRows.reduce((sum, row) => sum + (row.biomass_end ?? 0), 0)

  // Farm-wide cage eFCR for the selected period: total feed / total biomass gain
  // (gain_i = feed_i / eFCR_i), feed-weighted. Cages with no eFCR yet -- e.g. a
  // just-stocked cage with no sampling -- are excluded rather than counted as 0.
  const efcrInputs = stockedRows.filter(
    (row) => isFiniteNumber(row.efcr) && row.efcr! > 0 && isFiniteNumber(row.feed_total) && row.feed_total! > 0,
  )
  const totalFeedForEfcr = efcrInputs.reduce((sum, row) => sum + row.feed_total!, 0)
  const totalGainForEfcr = efcrInputs.reduce((sum, row) => sum + row.feed_total! / row.efcr!, 0)
  const overallEfcr = totalGainForEfcr > 0 ? totalFeedForEfcr / totalGainForEfcr : null

  const latestWaterQuality = waterQualityMonthly[waterQualityMonthly.length - 1] ?? null

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      <StatCard
        label="Total Live Fish"
        value={formatNumberValue(totalFish)}
        hint={`across ${stockedRows.length} active cages`}
      />
      <StatCard label="Total Biomass" value={formatUnitValue(totalBiomassKg, 0, "kg")} />
      <StatCard
        label="Overall eFCR"
        value={overallEfcr != null ? formatNumberValue(overallEfcr, { decimals: 2 }) : "--"}
      />
      <StatCard
        label="Avg Dissolved O₂"
        value={latestWaterQuality ? formatUnitValue(latestWaterQuality.doAvg, 1, "mg/L") : "--"}
        hint={latestWaterQuality ? latestWaterQuality.month : undefined}
      />
    </div>
  )
}
