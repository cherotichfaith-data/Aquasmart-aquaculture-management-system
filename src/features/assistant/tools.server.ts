import { createAccessTokenClient } from "@/lib/supabase/access-token-client"

type Row = Record<string, unknown>

export type AssistantTool = {
  name: string
  description: string
  parameters: Record<string, unknown>
  run: (ctx: ToolContext, args: Record<string, unknown>) => Promise<unknown>
}

type ToolContext = { accessToken: string; farmId: string }

const noArgs = { type: "object", properties: {} }

function round(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? Math.round(value * 100) / 100 : value
}

// Small local models do best with short, flat rows, so each tool keeps only the
// fields a farm manager would quote and rounds the numbers.
function pick(rows: Row[] | null, keys: string[]) {
  return (rows ?? []).map((row) => Object.fromEntries(keys.map((key) => [key, round(row[key])])))
}

async function rpc(ctx: ToolContext, name: string, args: Record<string, unknown>) {
  const supabase = createAccessTokenClient(ctx.accessToken)
  const { data, error } = await supabase.rpc(name as never, { p_farm_id: ctx.farmId, ...args } as never)
  if (error) throw new Error(error.message)
  return data as unknown
}

export const ASSISTANT_TOOLS: AssistantTool[] = [
  {
    name: "farm_summary",
    description: "Farm-wide totals: active batches and cages, live fish, biomass, survival, eFCR, SGR, dissolved oxygen.",
    parameters: noArgs,
    async run(ctx) {
      const [batches, cages] = await Promise.all([rpc(ctx, "api_batches_summary", {}), rpc(ctx, "api_systems_summary", {})])
      return {
        batches: pick(batches as Row[], ["active_batches", "total_stocked", "total_live", "survival_pct", "total_biomass_kg", "overall_efcr", "overall_sgr"]),
        cages: pick(cages as Row[], ["active_cages", "total_live_fish", "total_biomass_kg", "avg_dissolved_o2", "overall_efcr"]),
      }
    },
  },
  {
    name: "cage_status",
    description: "Latest per-cage figures: average body weight (g), fish count, biomass, mortality rate, eFCR, SGR, feeding rate, cycle day, progress to target weight.",
    parameters: noArgs,
    async run(ctx) {
      const rows = (await rpc(ctx, "api_dashboard_systems", {})) as Row[]
      return pick(rows, ["system_name", "growth_stage", "cycle_day", "abw", "fish_end", "biomass_end", "mortality_rate", "efcr", "sgr", "feeding_rate", "target_weight_g", "target_weight_progress_pct", "as_of_date"])
    },
  },
  {
    name: "batch_status",
    description: "Latest per-batch figures: average body weight (g), stocked and live fish, survival %, biomass, eFCR, SGR, number of cages.",
    parameters: noArgs,
    async run(ctx) {
      const rows = (await rpc(ctx, "api_dashboard_batches", {})) as Row[]
      return pick(rows, ["batch_name", "growth_stage", "cycle_day", "abw", "fish_end", "survival_pct", "biomass_end", "mortality_rate", "efcr", "sgr", "system_count", "as_of_date"])
    },
  },
  {
    name: "water_quality",
    description: "Latest water quality rating per cage with the worst parameter and its value.",
    parameters: noArgs,
    async run(ctx) {
      const rows = (await rpc(ctx, "api_latest_water_quality_status", {})) as Row[]
      return pick(rows, ["system_name", "rating", "rating_date", "worst_parameter", "worst_parameter_value", "worst_parameter_unit"])
    },
  },
  {
    name: "active_alerts",
    description: "Cages currently outside their healthy range (mortality, water quality, feeding) with the metric, value and thresholds.",
    parameters: noArgs,
    async run(ctx) {
      const rows = (await rpc(ctx, "api_recommended_actions", {})) as Row[]
      return pick(rows, ["system_name", "metric_name", "severity", "current_value", "threshold_low", "threshold_high", "unit"])
    },
  },
  {
    name: "recent_activity",
    description: "Most recent records entered on the farm (feeding, mortality, sampling, stocking, harvest, water quality).",
    parameters: {
      type: "object",
      properties: { limit: { type: "number", description: "How many records, default 10, max 25." } },
    },
    async run(ctx, args) {
      const limit = Math.min(Math.max(Number(args.limit) || 10, 1), 25)
      const rows = (await rpc(ctx, "api_recent_activity_feed", { p_limit: limit })) as Row[]
      return pick(rows, ["activity_date", "table_name", "system_id", "batch_id", "notes"]).slice(0, limit)
    },
  },
]
