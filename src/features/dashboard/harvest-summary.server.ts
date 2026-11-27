import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/types/database"
import type { PerformanceReports } from "@/features/analytics/types"

export type HarvestSummaryData = { fish: number | null; kg: number | null; ongoing: number | null; unavailable: boolean }

/** Monthly quantities come from individual harvests, not the reports' lifetime totals. */
export async function loadHarvestSummary(client: SupabaseClient<Database>, farmId: string, cutoff: string): Promise<HarvestSummaryData> {
  const month = `${cutoff.slice(0, 7)}-01`
  try {
    const report = await client.rpc("api_analytics_performance", { p_farm_id: farmId, p_month: cutoff,
      p_period_start: month, p_period_end: cutoff, p_sections: ["batch_harvests"] })
    if (report.error) throw report.error
    let fish = 0, kg = 0, weightsKnown = true
    // Explicit pagination avoids silently truncating busy months at the API row limit.
    for (let offset = 0; ; offset += 1000) {
      const page = await client.from("fish_harvest")
        .select("id, number_of_fish_harvest, total_weight_harvest, system!inner(farm_id)")
        .eq("system.farm_id", farmId).gte("date", month).lte("date", cutoff)
        .order("id").range(offset, offset + 999)
      if (page.error) throw page.error
      const rows = page.data ?? []
      for (const row of rows) {
        fish += row.number_of_fish_harvest
        if (row.total_weight_harvest == null) weightsKnown = false
        else kg += row.total_weight_harvest
      }
      if (rows.length < 1000) break
    }
    const reports = report.data as unknown as PerformanceReports
    return { fish, kg: weightsKnown ? kg : null, ongoing: new Set((reports?.batch_harvests ?? [])
      .filter(row => row.harvest_status === "ongoing").map(row => row.cycle_id)).size, unavailable: false }
  } catch {
    return { fish: null, kg: null, ongoing: null, unavailable: true }
  }
}
