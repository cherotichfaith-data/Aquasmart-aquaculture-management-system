const { test } = require("node:test")
const assert = require("node:assert/strict")
const fs = require("node:fs")
const ts = require("typescript")
function load(file, mocks = {}) {
  const module = { exports: {} }
  const code = ts.transpileModule(fs.readFileSync(file, "utf8"), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true,
  } }).outputText
  new Function("require", "module", "exports", code)(id => id in mocks ? mocks[id] : require(id), module, module.exports)
  return module.exports
}
const { loadHarvestSummary } = load("src/features/dashboard/harvest-summary.server.ts")
function client(pages, { reportError = null, pageError = null } = {}) {
  const calls = []
  const query = {}
  for (const method of ["select", "eq", "gte", "lte", "order"]) query[method] = (...args) => { calls.push([method, ...args]); return query }
  query.range = async (start, end) => { calls.push(["range", start, end]); return { data: pages[start / 1000] ?? [], error: pageError } }
  return { calls, rpc: async (name, args) => { calls.push([name, args]); return { error: reportError, data: { batch_harvests: [
    { cycle_id: 1, harvest_status: "ongoing", harvest_kg: 999999 },
    { cycle_id: 1, harvest_status: "ongoing" },
    { cycle_id: 2, harvest_status: "complete" },
    { cycle_id: 3, harvest_status: "check_stock" },
  ] } } }, from: table => { calls.push(["from", table]); return query } }
}
test("dashboard summary counts monthly individual harvests, not lifetime report quantities", async () => {
  const db = client([[{ number_of_fish_harvest: 978, total_weight_harvest: 307.21 }, { number_of_fish_harvest: 880, total_weight_harvest: 301.4 }]])
  const summary = await loadHarvestSummary(db, "farm-a", "2026-11-18")
  assert.equal(summary.fish, 1858)
  assert.ok(Math.abs(summary.kg - 608.61) < 1e-8)
  assert.equal(summary.ongoing, 1)
  assert.deepEqual(db.calls.find(c => c[0] === "eq"), ["eq", "system.farm_id", "farm-a"])
  assert.ok(db.calls.some(c => c[0] === "gte" && c[2] === "2026-11-01"))
  assert.ok(db.calls.some(c => c[0] === "lte" && c[2] === "2026-11-18"))
})
test("busy months paginate beyond the API limit without dropping harvests", async () => {
  const db = client([Array.from({ length: 1000 }, () => ({ number_of_fish_harvest: 1, total_weight_harvest: 2 })), [{ number_of_fish_harvest: 3, total_weight_harvest: 4 }]])
  const summary = await loadHarvestSummary(db, "farm-a", "2026-11-18")
  assert.equal(summary.fish, 1003)
  assert.equal(summary.kg, 2004)
  assert.deepEqual(db.calls.filter(c => c[0] === "range"), [["range", 0, 999], ["range", 1000, 1999]])
})
test("empty months show zero; missing weights and failed reads remain unknown", async () => {
  assert.equal((await loadHarvestSummary(client([[]]), "farm-a", "2026-11-18")).kg, 0)
  assert.equal((await loadHarvestSummary(client([[{ number_of_fish_harvest: 1, total_weight_harvest: null }]]), "farm-a", "2026-11-18")).kg, null)
  for (const options of [{ reportError: { message: "denied" } }, { pageError: { message: "unavailable" } }]) {
    assert.deepEqual(await loadHarvestSummary(client([], options), "farm-a", "2026-11-18"), { fish: null, kg: null, ongoing: null, unavailable: true })
  }
})
test("old analytics harvest URLs redirect with farm, month and cycle scope intact", async () => {
  const redirects = []
  const Page = load("src/app/analytics/page.tsx", {
    "next/navigation": { redirect: url => { redirects.push(url); throw new Error("redirect") } },
    "./page.client": {}, "@/features/farm/queries.server": {}, "@/features/farm/role.server": {},
    "@/features/analytics/queries.server": {}, "@/lib/supabase/require-user": {}, "@/features/analytics/workbook-client.server": {},
  }).default
  await assert.rejects(Page({ searchParams: Promise.resolve({ report: "harvests", farmId: "farm-a", month: "2026-10", period: "cycle" }) }), /redirect/)
  const target = new URL(redirects[0], "https://example.test")
  assert.equal(target.pathname, "/production/harvests")
  assert.equal(target.searchParams.get("farmId"), "farm-a")
  assert.equal(target.searchParams.get("month"), "2026-10")
  assert.equal(target.searchParams.get("period"), "cycle")
  assert.equal(target.searchParams.has("report"), false)
})
