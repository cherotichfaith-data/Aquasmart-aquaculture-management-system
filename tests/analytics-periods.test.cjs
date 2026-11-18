const { test } = require("node:test")
const assert = require("node:assert/strict")
const fs = require("node:fs")
const path = require("node:path")
const ts = require("typescript")

function load(file, mocks = {}) {
  const source = fs.readFileSync(file, "utf8")
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText
  const module = { exports: {} }
  new Function("require", "module", "exports", compiled)(id => {
    if (id in mocks) return mocks[id]
    if (id.startsWith(".")) return load(path.resolve(path.dirname(file), id + ".ts"), mocks)
    return require(id)
  }, module, module.exports)
  return module.exports
}

const { parseAnalyticsPeriod } = load("src/features/analytics/report-period.ts")
const today = new Date("2026-10-26T10:00:00Z")

test("October defaults to calendar-month activity, not a rolling month or all cycles", () => {
  assert.deepEqual(parseAnalyticsPeriod({}, today), {
    from: "2026-10-01", to: "2026-10-26", month: "2026-10-01", mode: "month",
  })
})

test("past months cover the full calendar month, including leap February", () => {
  const september = parseAnalyticsPeriod({ month: "2026-09" }, today)
  assert.equal(september.from, "2026-09-01")
  assert.equal(september.to, "2026-09-30")
  assert.equal(parseAnalyticsPeriod({ month: "2024-02" }, today).to, "2024-02-29")
})

test("Nairobi month boundaries are independent of the server timezone", () => {
  const period = parseAnalyticsPeriod({}, new Date("2026-09-30T22:30:00Z"))
  assert.equal(period.from, "2026-10-01")
  assert.equal(period.to, "2026-10-01")
})

test("legacy custom links normalize to a month, and invalid/future months cannot forecast actuals", () => {
  const legacy = parseAnalyticsPeriod({ period: "custom", from: "2026-08-23", to: "2026-09-23" }, today)
  assert.equal(legacy.mode, "month")
  assert.equal(legacy.from, "2026-09-01")
  assert.equal(legacy.to, "2026-09-30")
  for (const month of ["2026-13", "2027-01", "invalid"]) {
    assert.equal(parseAnalyticsPeriod({ month }, today).month, "2026-10-01")
  }
})

async function reportCalls(mode, view = "batches") {
  const calls = []
  const query = {
    select() { return query }, eq() { return query }, lte(column, date) { calls.push({ cutoffColumn: column, cutoffDate: date }); return query }, order() { return query }, limit() { return query },
    or(filter) { calls.push({ cutoffFilter: filter }); return query },
    then(resolve) { calls.push({ cycleLookup: true }); return Promise.resolve({ data: [
      { cycle_id: 1, batch_id: 10, cycle_start: "2025-01-01", cycle_end: "2025-12-31" },
      { cycle_id: 2, batch_id: 20, cycle_start: "2026-05-18", cycle_end: null },
      { cycle_id: 3, batch_id: 30, cycle_start: "2026-06-01", cycle_end: "2026-10-06" },
    ], error: null }).then(resolve) },
  }
  const { getAnalyticsReportData } = load("src/features/analytics/queries.server.ts", {
    "./automatic-feed-plan.server": { loadAutomaticFeedPlan: async () => { throw new Error("Unexpected planning query") } },
    "@/lib/supabase/server": { createAccessTokenClient: () => ({ from: () => query, rpc: async (name, args) => { calls.push({ name, args }); return { data: {}, error: null } } }) },
    "@/lib/supabase/log": { logSbError: () => {} },
  })
  const data = await getAnalyticsReportData({ farmId: "farm", accessToken: "test", view,
    period: parseAnalyticsPeriod({ period: mode }, today),
    forwardPlanInputs: { plannedFish: 100000, plannedAbwG: 2, scenario: "main" } })
  return { data, calls }
}

test("monthly reports send October bounds to the backend and never expand to May", async () => {
  const { data, calls } = await reportCalls("month")
  assert.equal(calls.some(c => c.cycleLookup), false)
  assert.equal(calls[0].args.p_period_start, "2026-10-01")
  assert.equal(calls[0].args.p_period_end, "2026-10-26")
  assert.equal(data.periodStart, "2026-10-01")
  assert.equal(data.periodMode, "month")
  const stockLoss = calls.find(c => c.name === "api_stock_loss_sources")
  assert.equal(stockLoss.args.p_as_of, "2026-10-26")
  assert.equal(stockLoss.args.p_farm_id, "farm")
})

test("cycle-to-date retains lifetime calculations only for cycles overlapping the selected month", async () => {
  for (const view of ["batches", "growth", "harvests"]) {
    const { data, calls } = await reportCalls("cycle", view)
    assert.equal(calls.find(c => c.cycleLookup).cycleLookup, true)
    assert.equal(calls.some(c => c.cutoffFilter), false)
    assert.deepEqual(calls.find(c => c.cutoffColumn), { cutoffColumn: "cycle_start", cutoffDate: "2026-10-26" })
    const performance = calls.find(c => c.name === "api_analytics_performance")
    assert.equal(performance.args.p_period_start, view === "harvests" ? "2026-10-01" : "2026-05-18")
    assert.equal(performance.args.p_period_end, "2026-10-26")
    assert.equal(performance.args.p_sections.includes("stock_loss_cycle"), ["batches", "growth"].includes(view))
    assert.equal(data.periodStart, "2026-05-18")
    assert.equal(data.periodMode, "cycle")
  }
})

const { monthCycles, monthSystemIds, cohortBatchRows } = load("src/features/analytics/cycle-cohort.ts")
test("month cohort keeps completions on the first day, open and later-closed cycles, but excludes historical and future cycles", () => {
  const cycle = (cycle_id, cycle_start, cycle_end) => ({ cycle_id, batch_id: cycle_id, cycle_start, cycle_end })
  const rows = [cycle(1,"2025-01-01","2025-12-31"), cycle(2,"2026-01-01","2026-10-01"),
    cycle(3,"2026-10-26",null), cycle(4,"2026-10-27",null), cycle(5,"2026-01-01","2026-11-03")]
  assert.deepEqual(monthCycles(rows,"2026-10-01","2026-10-26").map(c=>c.cycle_id),[2,3,5])
})
test("cage cohort excludes an old placement of an active batch and keeps a cage completed in the month", () => {
  const cycles = [{ cycle_id: 9, batch_id: 11, cycle_start: "2025-03-13", cycle_end: null, system_id: 51,
    production_cycle_system: [
      { system_id: 12, started_at: "2025-03-13", ended_at: "2025-12-31" },
      { system_id: 14, started_at: "2026-01-01", ended_at: "2026-11-01" },
      { system_id: 51, started_at: "2026-08-19", ended_at: null },
      { system_id: 99, started_at: "2026-11-30", ended_at: null },
    ] }]
  assert.deepEqual([...monthSystemIds(cycles,"2026-11-01","2026-11-18")],[14,51])
})
test("cohort totals exclude hidden rows and retain weighted ABW, ratio-of-totals eFCR and cumulative losses", () => {
  const row = (batch_id, fish, kg, feed, gain) => ({ batch_id, batch_name: String(batch_id),
    total_stocked: fish, stock_end: fish, biomass_kg: kg, harvest_number: fish, harvest_kg: kg,
    feed_kg: feed, efcr_feed_kg: feed, efcr_growth_kg: gain, acc_efcr_feed_kg: feed, acc_efcr_growth_kg: gain })
  const sources = { batches: [], events: [
    { batch_id: 2, received: 100, delta: 100, kind: "stocking" },
    { batch_id: 2, received: 0, delta: -10, kind: "mortality" },
    { batch_id: 3, received: 300, delta: 300, kind: "stocking" },
  ] }
  const selected = cohortBatchRows([row(1,9000,9000,9000,1),row(2,100,10,20,10),row(3,300,90,60,20),
    { batch_id: null, batch_name: "Total", biomass_kg: 99999 }],new Set([2,3]),sources)
  assert.deepEqual(selected.map(r=>r.batch_id),[2,3,null])
  const total = selected.at(-1)
  assert.equal(total.abw_g,250)
  assert.equal(total.harvest_abw_g,250)
  assert.equal(total.efcr,80/30)
  assert.equal(total.stock_loss_pct,2.5)
  assert.deepEqual(cohortBatchRows(selected,new Set(),sources),[])
})

test("report controls offer only Monthly and Cycle to date with the selected calendar month", async () => {
  const React = require("react")
  const { renderToStaticMarkup } = require("react-dom/server")
  const { data } = await reportCalls("month")
  const noop = () => null
  const report = load("src/features/analytics/components/analytics-report.tsx", {
    "next/navigation": { useRouter: () => ({ replace() {} }), usePathname: () => "/analytics", useSearchParams: () => new URLSearchParams("report=batches") },
    "next/link": { default: ({ children }) => React.createElement("a", null, children) },
    "lucide-react": { Info: noop },
    "@/components/app-ui/dialog": { Dialog: noop },
    "@/features/analytics/types": { GROWTH_SCENARIOS: ["main"] },
    "@/components/shared/filter-popover": { FilterPopover: ({ options, value, placeholder }) => React.createElement("select", { value, readOnly: true, "aria-label": placeholder }, options.map(o => React.createElement("option", { key: o.value, value: o.value }, o.label))) },
    "./batch-report-table": { default: noop },
    "./batch-harvest-cards": { default: noop },
    "./planning-auto-refresh": { default: noop },
    "@/features/analytics/harvest-curve": { curvesByScenario: () => ({}), judgeBatchAgainstCurves: noop, signedPct: noop, verdictLabel: noop },
    "@/components/shared/copy-zoom": { CopyZoom: ({ children }) => children },
    "./stock-profile-chart": { default: noop, classLabel: () => "" },
    "./growth-charts": { AbwAgeChart: noop, GrowthByBatchChart: noop, SelectedBatchAbwChart: noop, StockLossChart: noop },
    "./report-table": { DASH: "-", ReportTable: noop, dateText: value => value, num: value => value, pct: value => value },
    "@/features/reports/monthly/monthly-reports.css": {},
  }).default
  const html = renderToStaticMarkup(React.createElement(report, { data }))
  assert.match(html, /Detailed Batch Report - October 2026/)
  assert.match(html, /value="month" selected="">Monthly/)
  assert.match(html, /value="cycle">Cycle to date/)
  assert.match(html, /type="month".*value="2026-10"/)
  assert.doesNotMatch(html, /Custom|Last 30|Sep 26/)
})
