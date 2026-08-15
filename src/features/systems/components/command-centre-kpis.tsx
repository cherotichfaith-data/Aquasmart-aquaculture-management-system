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
  const finiteEfcrRows = stockedRows.filter((row) => isFiniteNumber(row.efcr))
  const bestEfcrRow = finiteEfcrRows.length
    ? finiteEfcrRows.reduce((best, row) => (row.efcr! < best.efcr! ? row : best))
    : null
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
        label="Best eFCR"
        value={bestEfcrRow ? formatNumberValue(bestEfcrRow.efcr, { decimals: 2 }) : "--"}
        hint={bestEfcrRow ? bestEfcrRow.system_name ?? undefined : undefined}
      />
      <StatCard
        label="Avg Dissolved O₂"
        value={latestWaterQuality ? formatUnitValue(latestWaterQuality.doAvg, 1, "mg/L") : "--"}
        hint={latestWaterQuality ? latestWaterQuality.month : undefined}
      />
    </div>
  )
}
