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
    select() { return query }, eq() { return query }, lte() { return query }, order() { return query }, limit() { return query },
    async maybeSingle() { calls.push({ cycleLookup: true }); return { data: { cycle_start: "2026-05-18" }, error: null } },
  }
  const { getAnalyticsReportData } = load("src/features/analytics/queries.server.ts", {
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
})

test("cycle-to-date reports include the original May start, including harvest reports", async () => {
  for (const view of ["batches", "harvests"]) {
    const { data, calls } = await reportCalls("cycle", view)
    assert.equal(calls[0].cycleLookup, true)
    assert.equal(calls[1].args.p_period_start, "2026-05-18")
    assert.equal(calls[1].args.p_period_end, "2026-10-26")
    assert.equal(data.periodStart, "2026-05-18")
    assert.equal(data.periodMode, "cycle")
  }
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
    "./stock-profile-chart": { default: noop, classLabel: () => "" },
    "./growth-charts": { AbwAgeChart: noop, GrowthByBatchChart: noop, SelectedBatchAbwChart: noop },
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
