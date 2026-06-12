import type { Database } from "@/lib/types/database"
import type { DashboardSystemOption, DashboardSystemRow } from "@/features/dashboard/types"

type DashboardConsolidatedRow = Database["public"]["Functions"]["api_dashboard_consolidated"]["Returns"][number]
type DailyFishInventoryRow = Database["public"]["Functions"]["api_daily_fish_inventory_rpc"]["Returns"][number]

export function toDashboardSystemRows(params: {
  consolidatedRows: DashboardConsolidatedRow[]
  systemOptions: DashboardSystemOption[]
  activeScopedSystemIds: number[]
  dateFrom: string
  dateTo: string
}): DashboardSystemRow[] {
  const systemOptionsById = new Map(
    params.systemOptions
      .filter((system) => typeof system.id === "number")
      .map((system) => [system.id as number, system]),
  )
  const scopedSet = new Set(params.activeScopedSystemIds)

  return params.consolidatedRows
    .filter((row) => scopedSet.has(row.system_id))
    .map((row) => {
      const system = systemOptionsById.get(row.system_id)
      return {
        abw: row.abw_asof_end ?? null,
        abw_delta: row.abw_asof_end_delta ?? null,
        abw_trend: (row.abw_asof_end_delta ?? 0) > 0 ? "up" : (row.abw_asof_end_delta ?? 0) < 0 ? "down" : "flat",
        as_of_date: row.input_end_date ?? params.dateTo,
        biomass_density: row.biomass_density ?? null,
        biomass_end: row.average_biomass ?? null,
        efcr: row.efcr_period_consolidated ?? null,
        efcr_date: row.input_end_date ?? params.dateTo,
        feed_total: null,
        feeding_rate: row.feeding_rate ?? null,
        fish_end: null,
        growth_stage: system?.growth_stage ?? "grow_out",
        input_end_date: row.input_end_date ?? params.dateTo,
        input_start_date: row.input_start_date ?? params.dateFrom,
        is_complete: true,
        missing_days_count: 0,
        mortality_rate: row.mortality_rate ?? null,
        sample_age_days: null,
        sampling_end_date: row.input_end_date ?? params.dateTo,
        system_id: row.system_id,
        system_name: system?.label ?? system?.name ?? `System ${row.system_id}`,
        water_quality_latest_date: row.input_end_date ?? params.dateTo,
        water_quality_rating_average: row.water_quality_rating_average ?? null,
        water_quality_rating_numeric_average: row.water_quality_rating_numeric_average ?? null,
        worst_parameter: null,
        worst_parameter_unit: null,
        worst_parameter_value: null,
      } as unknown as DashboardSystemRow
    })
}

export function toDashboardSystemRowsFromInventory(params: {
  inventoryRows: DailyFishInventoryRow[]
  systemOptions: DashboardSystemOption[]
  activeScopedSystemIds: number[]
  dateFrom: string
  dateTo: string
}): DashboardSystemRow[] {
  const systemOptionsById = new Map(
    params.systemOptions
      .filter((system) => typeof system.id === "number")
      .map((system) => [system.id as number, system]),
  )
  const scopedSet = new Set(params.activeScopedSystemIds)
  const rowsBySystem = new Map<number, DailyFishInventoryRow[]>()

  params.inventoryRows.forEach((row) => {
    if (!scopedSet.has(row.system_id)) return
    const rows = rowsBySystem.get(row.system_id) ?? []
    rows.push(row)
    rowsBySystem.set(row.system_id, rows)
  })

  return Array.from(rowsBySystem.entries()).map(([systemId, rows]) => {
    const sorted = rows.slice().sort((left, right) => String(right.inventory_date).localeCompare(String(left.inventory_date)))
    const latest = sorted[0]
    const previousWithAbw = sorted.slice(1).find((row) => row.abw_last_sampling != null)
    const abwDelta =
      latest.abw_last_sampling != null && previousWithAbw?.abw_last_sampling != null
        ? latest.abw_last_sampling - previousWithAbw.abw_last_sampling
        : null
    const feedTotal = rows.reduce((sum, row) => sum + (row.feeding_amount ?? 0), 0)
    const system = systemOptionsById.get(systemId)

    return {
      abw: latest.abw_last_sampling ?? null,
      abw_delta: abwDelta,
      abw_trend: (abwDelta ?? 0) > 0 ? "up" : (abwDelta ?? 0) < 0 ? "down" : "flat",
      as_of_date: latest.inventory_date ?? params.dateTo,
      biomass_density: latest.biomass_density ?? null,
      biomass_end: latest.biomass_last_sampling ?? null,
      efcr: null,
      efcr_date: latest.inventory_date ?? params.dateTo,
      feed_total: feedTotal || null,
      feeding_rate: latest.feeding_rate ?? null,
      fish_end: latest.number_of_fish ?? null,
      growth_stage: (system?.growth_stage ?? latest.growth_stage ?? "grow_out") as DashboardSystemRow["growth_stage"],
      input_end_date: params.dateTo,
      input_start_date: params.dateFrom,
      is_complete: Boolean(latest.has_inventory_count || latest.has_abw || latest.has_feed_record),
      missing_days_count: Math.max(0, rows.filter((row) => !row.has_inventory_count && !row.has_abw && !row.has_feed_record).length),
      mortality_rate: latest.mortality_rate ?? null,
      sample_age_days:
        latest.last_abw_date && latest.inventory_date
          ? Math.max(
              Math.floor(
                (Date.parse(`${latest.inventory_date}T00:00:00Z`) - Date.parse(`${latest.last_abw_date}T00:00:00Z`)) /
                  86_400_000,
              ),
              0,
            )
          : null,
      sampling_end_date: latest.last_abw_date ?? null,
      system_id: systemId,
      system_name: system?.label ?? system?.name ?? latest.system_name ?? `System ${systemId}`,
      water_quality_latest_date: latest.inventory_date ?? params.dateTo,
      water_quality_rating_average: null,
      water_quality_rating_numeric_average: null,
      worst_parameter: null,
      worst_parameter_unit: null,
      worst_parameter_value: null,
    } as unknown as DashboardSystemRow
  })
}
