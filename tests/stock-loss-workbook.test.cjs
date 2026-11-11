const { test } = require("node:test")
const assert = require("node:assert/strict")
const fs = require("node:fs")
const path = require("node:path")
const ts = require("typescript")
function load(file) {
  const compiled = ts.transpileModule(fs.readFileSync(file, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  const module = { exports: {} }
  new Function("require", "module", "exports", compiled)(id => id.startsWith(".") ? load(path.resolve(path.dirname(file), id + ".ts")) : require(id), module, module.exports)
  return module.exports
}
const { workbookStockLoss, buildStockLossRows } = load(path.join(__dirname, "../src/features/analytics/stock-loss.ts"))
const event = (date, delta, kind, extras = {}) => ({ batch_id: 1, system_id: 1, date, delta, received: 0, kind, abw: null, sample_n: 0, ...extras })
const sources = events => ({ batches: [{ batch_id: 1, batch_name: "valid", date_in: "2026-01-15" }], events })
const stock = () => event("2026-01-15", 1000, "stocking", { received: 1000, abw: 2 })

test("monthly membership includes overlapping cycles and any monthly record, with cumulative losses", () => {
  const input = sources([stock(), event("2026-01-20", -100, "mortality")])
  input.batches[0].active_periods = [{ from: "2026-01-15", to: "2026-02-10" }]
  input.batches.push(
    { batch_id: 2, batch_name: "closed earlier", date_in: "2026-01-01", active_periods: [{ from: "2026-01-01", to: "2026-01-31" }] },
    { batch_id: 3, batch_name: "feeding only", date_in: "2026-01-01", active_periods: [], record_dates: ["2026-02-05"] },
    { batch_id: 4, batch_name: "sampling only", date_in: "2026-01-01", active_periods: [] },
    { batch_id: 5, batch_name: "empty active", date_in: "2026-01-01", active_periods: [{ from: "2026-01-01", to: null }] },
    { batch_id: 6, batch_name: "future record", date_in: "2026-01-01", active_periods: [], record_dates: ["2026-03-01"] },
  )
  input.events.push(event("2026-02-07", 0, "sampling", { batch_id: 4, abw: 20, sample_n: 50 }))
  const rows = buildStockLossRows(input, "2026-02-28", "2026-02-01")
  assert.deepEqual(new Set(rows.map(row => row.batch_id)), new Set([1, 3, 4, 5]))
  assert.equal(rows.find(row => row.batch_id === 1).stock_loss_chart_pct, 10)
  assert.equal(rows.find(row => row.batch_id === 5).stock_loss_chart_pct, null)
  assert.equal(buildStockLossRows(input, "2026-02-28").length, 6) // Cycle view keeps historical batches.
})

test("a closure on the first day counts, while a later-month closure does not rewrite history", () => {
  const input = sources([stock()])
  input.batches[0].active_periods = [{ from: "2026-01-15", to: "2026-03-01" }]
  assert.equal(buildStockLossRows(input, "2026-02-28", "2026-02-01").length, 1)
  assert.equal(buildStockLossRows(input, "2026-03-31", "2026-03-01").length, 1)
  assert.equal(buildStockLossRows(input, "2026-04-30", "2026-04-01").length, 0)
})

test("workbook correction netting offsets categories without negative unaccounted losses", () => {
  assert.deepEqual(workbookStockLoss(1000, 20, 100, -40), { population: 1000, mortality: 2, adjustment: 6, harvest: 0 })
  assert.deepEqual(workbookStockLoss(1000, 20, -40, 100), { population: 1000, mortality: 2, adjustment: 0, harvest: 6 })
  const found = workbookStockLoss(25678, 1357, -46730, 0)
  assert.equal(found.population, 72408)
  assert.ok(found.mortality > 0)
  assert.equal(found.adjustment, 0)
  assert.equal(found.harvest, 0)
  assert.equal(workbookStockLoss(0, 20, 0, 0), null)
})

test("expected loss accumulates rounded workbook monthly mortality using actual opening fish", () => {
  const rows = buildStockLossRows(sources([stock(), event("2026-01-31", -20, "mortality")]), "2026-02-28")
  assert.equal(rows[0].stock_loss_mortality_pct, 2)
  assert.equal(rows[0].stock_loss_expected_pct, 4) // 20 in January, round(980 × 2%) in February.
  const large = buildStockLossRows(sources([{ ...stock(), abw: 100 }]), "2026-01-31")
  assert.equal(large[0].stock_loss_expected_pct, 1)
})

test("opening samples change the expected phase; later samples cannot change a past cutoff", () => {
  const history = [stock(), event("2026-01-31", -20, "mortality"), event("2026-02-01", 0, "sampling", { abw: 200, sample_n: 100 })]
  assert.equal(buildStockLossRows(sources(history), "2026-02-28")[0].stock_loss_expected_pct, 3)
  assert.equal(buildStockLossRows(sources(history), "2026-01-31")[0].stock_loss_expected_pct, 2)
})

test("internal cage transfers do not double-count expected mortality or losses", () => {
  const history = [stock(), event("2026-01-20", -1000, "transfer", { abw: 3 }), event("2026-01-20", 1000, "transfer", { system_id: 2, abw: 3 })]
  const row = buildStockLossRows(sources(history), "2026-01-31")[0]
  assert.equal(row.stock_loss_expected_pct, 2)
  assert.equal(row.stock_loss_chart_pct, 0)
})

test("all valid batches remain visible, including closed and missing-data batches", () => {
  const input = sources([stock()])
  input.batches.push({ batch_id: 2, batch_name: "closed", date_in: "2025-03-13" }, { batch_id: 3, batch_name: "BATCH-legacy", date_in: "2024-01-01" }, { batch_id: 4, batch_name: "future", date_in: "2026-03-01" })
  const rows = buildStockLossRows(input, "2026-02-28")
  assert.deepEqual(rows.map(row => row.batch_name), ["valid", "closed"])
  assert.equal(rows[1].stock_loss_chart_pct, null)
  assert.equal(rows[1].stock_loss_expected_pct, null)
})

test("harvest and transfer discrepancies carry forward and net against extra fish found", () => {
  const history = [stock(), event("2026-01-25", -100, "adjustment"), event("2026-02-05", 40, "harvest_adjustment")]
  const january = buildStockLossRows(sources(history), "2026-01-31")[0]
  const february = buildStockLossRows(sources(history), "2026-02-28")[0]
  assert.equal(january.stock_loss_adjustment_pct, 10)
  assert.equal(february.stock_loss_adjustment_pct, 6)
  assert.equal(february.stock_loss_harvest_pct, 0)
})

test("mixing retains source weight and does not become unaccounted loss", () => {
  const input = sources([stock(), event("2026-02-15", -1000, "transfer", { abw: 20 }), event("2026-02-15", 1000, "transfer", { system_id: 2, abw: 20 }),
    event("2026-02-15", -1000, "mix", { system_id: 2 }), event("2026-02-15", 1000, "mix", { batch_id: 2, system_id: 2, received: 1000 })])
  input.batches.push({ batch_id: 2, batch_name: "mix", date_in: "2026-02-15" })
  const mixed = buildStockLossRows(input, "2026-02-28").find(row => row.batch_id === 2)
  assert.equal(mixed.stock_loss_chart_pct, 0)
  assert.equal(mixed.stock_loss_expected_pct, 1.5)
})

test("missing weights do not become a false zero expected loss", () => {
  const row = buildStockLossRows(sources([{ ...stock(), abw: null }]), "2026-01-31")[0]
  assert.equal(row.stock_loss_chart_pct, 0)
  assert.equal(row.stock_loss_expected_pct, null)
})
