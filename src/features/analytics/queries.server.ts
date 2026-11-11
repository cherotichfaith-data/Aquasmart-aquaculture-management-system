import { loadAutomaticFeedPlan } from "./automatic-feed-plan.server"
import { addMonths } from "./automatic-feed-plan"
import { buildHarvestPoints } from "./harvest-curve"
import { buildStockLossRows, type StockLossSources } from "./stock-loss"
import { createAccessTokenClient } from "@/lib/supabase/server"
import { logSbError } from "@/lib/supabase/log"
import {
  GROWTH_SCENARIOS,
  type AnalyticsReportData,
  type ForwardPlanInputs,
  type GrowthScenario,
  type HarvestPointRow,
  type OutlookReports,
  type PerformanceReports,
} from "./types"

const DEFAULT_PLANNED_STOCKING = 125_000
import type { AnalyticsPeriod } from "./report-period"
export { parseAnalyticsPeriod, type AnalyticsPeriod } from "./report-period"

/** `?stocking=150000&stockingAbw=2`: the planned monthly juvenile stocking behind the forward plan. */
export function parseForwardPlanInputs(searchParams: Record<string, string | string[] | undefined>): ForwardPlanInputs {
  const read = (key: string) => {
    const raw = searchParams[key]
    const n = typeof raw === "string" ? Number(raw) : NaN
    return Number.isFinite(n) && n >= 0 ? n : null
  }
  // The farm plans 100,000-150,000 juveniles a month; plan on the midpoint unless overridden.
  const plannedFish = Math.min(read("stocking") ?? DEFAULT_PLANNED_STOCKING, 10_000_000)
  const plannedAbwG = Math.min(Math.max(read("stockingAbw") ?? 2, 0.1), 100)
  const scenarioRaw = searchParams.scenario
  const scenario: GrowthScenario = GROWTH_SCENARIOS.find((s) => s === scenarioRaw) ?? "main"
  return { plannedFish, plannedAbwG, scenario }
}

/** The dropdown views (`?report=`); each only loads the sections it shows. */
export type AnalyticsView = "outlook" | "batches" | "growth" | "cages" | "planning" | "harvests"

export function parseAnalyticsView(raw: string | string[] | undefined): AnalyticsView {
  if (raw === "forecast") return "planning"
  return raw === "outlook" || raw === "batches" || raw === "growth" || raw === "cages" || raw === "planning" || raw === "harvests" ? raw : "outlook"
}

const SECTIONS_BY_VIEW: Record<AnalyticsView, { performance: string[]; outlook: string[] }> = {
  outlook: { performance: [], outlook: ["stock_profile"] },
  planning: { performance: [], outlook: ["farm_forecast", "forward_plan"] },
  batches: { performance: ["batches"], outlook: [] },
  growth: { performance: ["growth_by_batch", "abw_points", "abw_history", "growth_curve"], outlook: [] },
  harvests: { performance: ["cage_harvests", "batch_harvests", "growth_curve"], outlook: [] },
  cages: { performance: ["feed_vs_expected"], outlook: [] },
}

export async function getAnalyticsReportData(params: {
  farmId: string | null
  period: AnalyticsPeriod
  view: AnalyticsView
  accessToken: string
  forwardPlanInputs: ForwardPlanInputs
  planningParams?: Record<string, string | string[] | undefined>
}): Promise<AnalyticsReportData> {
  const empty: AnalyticsReportData = {
    month: params.period.month,
    periodMode: params.period.mode,
    periodStart: params.period.from,
    periodEnd: params.period.to,
    batches: [],
    stockLossRows: [],
    batchHarvests: [],
    batchHarvestPoints: [],
    cageHarvests: [],
    feedVsExpected: [],
    growthByBatch: [],
    abwPoints: [],
    growthCurve: [],
    stockProfile: [],
    farmForecast: [],
    forwardPlan: [],
    forwardPlanInputs: params.forwardPlanInputs,
    error: null,
  }
  if (!params.farmId) return empty

  const supabase = createAccessTokenClient(params.accessToken)
  let period = params.period
  if (period.mode === "cycle") {
    const cycles = await supabase
      .from("production_cycle")
      .select("cycle_start, fingerling_batch!inner(farm_id)")
      .eq("fingerling_batch.farm_id", params.farmId)
      .or(`and(cycle_end.is.null,ongoing_cycle.eq.true),cycle_end.gt.${period.to}`)
      .lte("cycle_start", period.to)
      .order("cycle_start", { ascending: true })
      .limit(1)
      .maybeSingle()
    if (cycles.error) {
      logSbError("analytics:cyclePeriod", cycles.error)
      return { ...empty, error: "The cycle reporting period could not be loaded. Try again shortly." }
    }
    period = { ...period, from: cycles.data?.cycle_start ?? period.month }
  }
  // Forecast and forward plan are monthly and anchored to the month holding the period end;
  // the three period reports use the exact from/to dates.
  const args = { p_farm_id: params.farmId, p_month: period.month }
  const periodArgs = {
    p_farm_id: params.farmId,
    p_month: period.to,
    p_period_start: period.from,
    p_period_end: period.to,
  }
  const planArgs = {
    p_planned_fish: params.forwardPlanInputs.plannedFish,
    p_planned_abw_g: params.forwardPlanInputs.plannedAbwG,
    p_scenario: params.forwardPlanInputs.scenario,
  }
  const needs = SECTIONS_BY_VIEW[params.view]
  const [performance, outlook, stockLoss] = await Promise.all([
    needs.performance.length > 0
      ? supabase.rpc("api_analytics_performance", {
          ...periodArgs,
          p_sections: period.mode === "month" ? [...needs.performance, "growth_custom"]
            : params.view === "batches" ? [...needs.performance, "stock_loss_cycle"] : needs.performance,
          p_scenario: params.forwardPlanInputs.scenario,
        })
      : Promise.resolve(null),
    needs.outlook.length > 0
      ? supabase.rpc("api_analytics_outlook", {
          ...args,
          p_as_of: period.to,
          p_sections: needs.outlook,
          ...planArgs,
        })
      : Promise.resolve(null),
    params.view === "batches"
      ? supabase.rpc("api_stock_loss_sources", { p_farm_id: params.farmId, p_as_of: period.to })
      : Promise.resolve(null),
  ])

  const failed = [performance, outlook, stockLoss].find((r) => r?.error)
  if (failed?.error) logSbError("analytics:getAnalyticsReportData", failed.error)
  const perf = (performance?.data ?? null) as PerformanceReports | null
  const out = (outlook?.data ?? null) as OutlookReports | null

  let batchHarvestPoints: HarvestPointRow[] = []
  const harvestedBatches = perf?.batch_harvests ?? []
  if (harvestedBatches.length > 0) {
    const batchIds = harvestedBatches.map((r) => r.batch_id)
    const [stocking, sampling, harvests] = await Promise.all([
      supabase.from("fish_stocking").select("batch_id, date, number_of_fish_stocking, total_weight_stocking").in("batch_id", batchIds),
      supabase.from("fish_sampling_weight").select("batch_id, date, number_of_fish_sampling, abw").in("batch_id", batchIds),
      supabase.from("fish_harvest").select("batch_id, cycle_id, date, number_of_fish_harvest, total_weight_harvest").in("batch_id", batchIds),
    ])
    const readError = stocking.error ?? sampling.error ?? harvests.error
    if (readError) logSbError("analytics:batchHarvestPoints", readError)
    else {
      batchHarvestPoints = buildHarvestPoints(
        harvestedBatches,
        stocking.data ?? [],
        sampling.data ?? [],
        harvests.data ?? [],
        (perf?.growth_curve ?? []).filter((c) => c.scenario === params.forwardPlanInputs.scenario),
      )
    }
  }

  let forwardPlan = out?.forward_plan ?? []
  let farmForecast = out?.farm_forecast ?? []
  let planningIssues: string[] = []
  if (params.view === "planning") {
    try {
      const planMonth = typeof params.planningParams?.planMonth === "string" ? params.planningParams.planMonth : addMonths(period.month, 1).slice(0, 7)
      const automatic = await loadAutomaticFeedPlan(params.farmId, params.accessToken, {
        ...params.planningParams,
        month: planMonth,
        stocking: String(params.forwardPlanInputs.plannedFish),
        stockingAbw: String(params.forwardPlanInputs.plannedAbwG),
      }, 12)
      planningIssues = automatic.result.issues
      forwardPlan = planningIssues.length ? [] : automatic.result.months.map(m => m.summary)
      // Keep historical benchmark/recorded values, replace future forecasts with
      // the same monthly engine and actual source records as the cage plan.
      farmForecast = farmForecast.map(row => {
        const projected = forwardPlan.find(m => m.month_start === row.month_start)
        return projected ? { ...row, biomass_forecast_kg: projected.biomass_end_kg, harvest_forecast_kg: projected.harvest_kg } : row.month_start > period.month ? { ...row, biomass_forecast_kg: null, harvest_forecast_kg: null } : row
      })
    } catch (error) {
      planningIssues = [error instanceof Error ? error.message : "Planning records could not be loaded."]
      forwardPlan = []
      farmForecast = farmForecast.filter(row => row.month_start <= period.month)
    }
  }
  return {
    month: period.month,
    periodMode: period.mode,
    periodStart: period.from,
    periodEnd: period.to,
    batches: perf?.batches ?? [],
    stockLossRows: stockLoss?.error ? [] : buildStockLossRows(stockLoss?.data as unknown as StockLossSources | null, period.to, period.mode === "month" ? period.month : undefined),
    batchHarvests: perf?.batch_harvests ?? [],
    batchHarvestPoints,
    cageHarvests: perf?.cage_harvests ?? [],
    feedVsExpected: perf?.feed_vs_expected ?? [],
    growthByBatch: perf?.growth_by_batch ?? [],
    abwPoints: (perf?.abw_points ?? []).filter((point) => period.mode === "cycle" || point.date >= period.from),
    abwHistoryPoints: perf?.abw_points ?? [],
    growthCurve: perf?.growth_curve ?? [],
    stockProfile: out?.stock_profile ?? [],
    farmForecast,
    forwardPlan,
    forwardPlanInputs: params.forwardPlanInputs,
    error: planningIssues.length ? planningIssues.join(" ") : failed?.error ? "Some analytics could not be loaded. Try again shortly." : null,
  }
}
