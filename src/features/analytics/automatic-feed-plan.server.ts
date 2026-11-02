import "server-only"
import { workbookClient } from "./workbook-client.server"
import { addMonths, buildFeedPlan, monthEnd, nairobiToday, type PlannedHarvest, type PlanningOptions } from "./automatic-feed-plan"
import { validDate } from "./feed-model"

type Params = Record<string, string | string[] | undefined>
export async function loadAutomaticFeedPlan(farmId: string, accessToken: string, params: Params = {}, horizon = 1) {
  const today = nairobiToday()
  const raw = typeof params.month === "string" ? params.month : ""
  const month = /^\d{4}-\d{2}$/.test(raw) && validDate(`${raw}-01`) ? `${raw}-01` : addMonths(`${today.slice(0, 7)}-01`, 1)
  const asOf = monthEnd(month) < today ? monthEnd(month) : today
  const db = workbookClient(accessToken)
  const [source, settings] = await Promise.all([
    db.rpc("api_automatic_feed_plan_sources", { p_farm_id: farmId, p_as_of: asOf }),
    db.from("production_planning_settings").select("*").eq("farm_id", farmId).maybeSingle(),
  ])
  if (source.error || settings.error) throw new Error("Planning records could not be loaded. Please try again.")
  const sources = source.data ?? []
  const read = (key: string, fallback: number) => params[key] === undefined ? fallback : typeof params[key] === "string" ? Number(params[key]) : NaN
  const harvests: PlannedHarvest[] = []
  for (const s of sources) {
    const count = read(`harvest_${s.system_id}`, 0)
    if (count !== 0) harvests.push({ system_id: s.system_id, fish: count, date: typeof params[`harvestDate_${s.system_id}`] === "string" ? params[`harvestDate_${s.system_id}`] as string : "" })
  }
  const options: PlanningOptions = { month, months: horizon, asOf, plannedFish: read("stocking", settings.data?.planned_fish ?? 100000), plannedAbwG: read("stockingAbw", settings.data?.planned_abw_g ?? 2), stockingDay: read("stockingDay", 15), harvestWeightG: read("harvestWeight", 500), harvests }
  const result = buildFeedPlan(sources, options)
  return { today, sources, options, result }
}
export type AutomaticPlanData = Awaited<ReturnType<typeof loadAutomaticFeedPlan>>
