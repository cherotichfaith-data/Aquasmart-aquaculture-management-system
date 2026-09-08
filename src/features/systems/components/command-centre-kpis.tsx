import { StatCard } from "@/components/shared/stat-card"
import type { SystemsSummaryRow } from "@/features/systems/types"
import { formatNumberValue, formatUnitValue } from "@/lib/analytics-format"
import { isFiniteNumber } from "@/features/dashboard/lib/table-cells"

/**
 * Header cards for the Cages page. Every figure comes straight from
 * api_systems_summary (SQL) -- this component only formats what the backend
 * hands it, it never sums or averages rows itself.
 */
export default function CommandCentreKpis({ summary }: { summary: SystemsSummaryRow | null }) {
  const totalFish = summary?.total_live_fish ?? null
  const activeCages = summary?.active_cages ?? null
  const totalBiomassKg = summary?.total_biomass_kg ?? null
  const overallEfcr = summary?.overall_efcr ?? null
  const avgDo = summary?.avg_dissolved_o2 ?? null

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      <StatCard
        label="Total Live Fish"
        value={isFiniteNumber(totalFish) ? formatNumberValue(totalFish) : "--"}
        hint={isFiniteNumber(activeCages) ? `across ${activeCages} active cages` : undefined}
      />
      <StatCard
        label="Total Biomass"
        value={isFiniteNumber(totalBiomassKg) ? formatUnitValue(totalBiomassKg, 0, "kg") : "--"}
      />
      <StatCard
        label="Overall eFCR"
        value={isFiniteNumber(overallEfcr) ? formatNumberValue(overallEfcr, { decimals: 2 }) : "--"}
      />
      <StatCard
        label="Avg Dissolved O₂"
        value={isFiniteNumber(avgDo) ? formatUnitValue(avgDo, 1, "mg/L") : "--"}
      />
    </div>
  )
}
