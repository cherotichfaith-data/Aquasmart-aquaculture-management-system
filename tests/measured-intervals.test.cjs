const { test } = require("node:test")
const assert = require("node:assert/strict")
const fs = require("node:fs")
const ts = require("typescript")
function load(file, mocks = {}) {
  const compiled = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText
  const module = { exports: {} }
  new Function("require", "module", "exports", compiled)(id => {
    if (id in mocks) return mocks[id]
    return require(id)
  }, module, module.exports)
  return module.exports
}
const { summarizeMeasuredIntervals } = load("src/features/analytics/measured-intervals.ts")
const row = (feed, gain, extra = {}) => ({
  batch_id: 1, cycle_id: 1, system_id: 1, date: "2026-10-23", previous_date: "2026-09-23",
  previous_fish: 1000, previous_biomass: 100, feed, gain, ...extra,
})
test("totals divide matching feed by net signed growth rather than averaging ratios", () => {
  assert.deepEqual(summarizeMeasuredIntervals([row(100, 100), row(40, -20)]), {
    feedKg: 140, growthKg: 80, efcr: 1.75,
  })
  assert.deepEqual(summarizeMeasuredIntervals([]), { feedKg: null, growthKg: null, efcr: null })
  assert.equal(summarizeMeasuredIntervals([row(10, -5)]).efcr, null)
  assert.equal(summarizeMeasuredIntervals([row(10, 0)]).efcr, null)
})
test("Reports read shared intervals from object or array RPC payloads and retain cage/batch scope", async () => {
  for (const wrapped of [false, true]) {
    const payload = { measured_intervals: [row(10, 5), row(100, 20, { system_id: 2 }), row(20, 10, { batch_id: 2 })] }
    const calls = []
    const { loadMeasuredIntervals } = load("src/features/analytics/measured-intervals.client.ts", {
      "@/lib/supabase/query-transport": {
        fetchRpc: async (...args) => { calls.push(args); return { status: "success", data: wrapped ? [payload] : payload } },
        toQuerySuccess: data => ({ status: "success", data }),
      },
      "./report-period": { parseAnalyticsPeriod: () => ({ to: "2026-10-31" }) },
    })
    const result = await loadMeasuredIntervals({ farmId: "farm", systemId: 1, batchId: 1,
      dateFrom: "2026-10-01", dateTo: "2026-10-31" })
    assert.deepEqual(result.data, [row(10, 5)])
    assert.equal(calls[0][1], "api_analytics_performance")
    assert.deepEqual(calls[0][2].p_sections, ["measured_intervals"])
    assert.equal(calls[0][2].p_period_start, "2026-10-01")
    assert.equal(calls[0][2].p_period_end, "2026-10-31")
  }
})
