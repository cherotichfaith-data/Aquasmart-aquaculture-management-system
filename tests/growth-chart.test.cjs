const { test } = require("node:test")
const assert = require("node:assert/strict")
const fs = require("node:fs")
const path = require("node:path")
const ts = require("typescript")
const React = require("react")
const { renderToStaticMarkup } = require("react-dom/server")

const source = fs.readFileSync(path.join(__dirname, "../src/features/analytics/components/growth-charts.tsx"), "utf8")
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } }).outputText
const loaded = { exports: {} }
new Function("require", "module", "exports", compiled)(id =>
  id === "@/components/shared/copy-zoom"
    ? { CopyZoomChartTitle: ({ children }) => React.createElement("figcaption", { className: "rpt-chart__title" }, children) }
    : require(id), loaded, loaded.exports)
const chart = (rows) => renderToStaticMarkup(React.createElement(loaded.exports.GrowthByBatchChart, { rows }))
const row = (name, recorded, expected) => ({ batch_id: name, batch_name: name, date_in: "2026-10-01", gain_recorded_kg: recorded, gain_expected_kg: expected })

test("batches without growth remain visible and distinguish missing values from zero", () => {
  const markup = chart([row("05.26b", null, null), row("05.26mixi", null, null), row("zero", 0, 0)])
  assert.match(markup, /05\.26b/)
  assert.match(markup, /05\.26mixi/)
  assert.doesNotMatch(markup, /N\/A/)
  assert.equal((markup.match(/<rect /g) || []).length, 2, "only the known zero values render bars")
  assert.match(markup, /zero - recorded gain 0 kg/)
  assert.doesNotMatch(markup, /NaN|Infinity/)
})

test("negative growth bars extend below the zero baseline", () => {
  const markup = chart([row("loss", -20, 40)])
  const match = markup.match(/<rect[^>]*y="([\d.]+)"[^>]*height="([\d.]+)"[^>]*><title>loss - recorded gain -20 kg/)
  assert.ok(match, "negative recorded bar is rendered")
  assert.ok(Number(match[2]) > 0)
  const zero = markup.match(/<line[^>]*y1="([\d.]+)"[^>]*stroke="#6f746f"/)
  assert.equal(Number(match[1]), Number(zero[1]))
  assert.match(markup, />-20<\/text>/)
})

test("all-negative growth and empty periods have valid output", () => {
  assert.doesNotMatch(chart([row("loss", -20, null)]), /NaN|Infinity/)
  assert.match(chart([]), /No growth data for this period/)
})

test("stock loss expected area is automatic and follows per-batch expectations in both views", () => {
  for (const cycleToDate of [false, true]) {
    const rows = [{ batch_id: 1, batch_name: "low", stock_loss_chart_pct: 2, stock_loss_pct: null, stock_loss_expected_pct: 4 }, { batch_id: 2, batch_name: "blank", stock_loss_pct: null, stock_loss_expected_pct: null }]
    const markup = renderToStaticMarkup(React.createElement(loaded.exports.StockLossChart, { rows, cycleToDate }))
    assert.doesNotMatch(markup, /type="checkbox"/)
    assert.doesNotMatch(markup, /Maximum allowed|10% maximum/)
    assert.match(markup, /Expected loss/)
    assert.match(markup, /blank<\/text>/)
    assert.equal((markup.match(/<rect /g) || []).length, 3)
    assert.match(markup, /<path[^>]*data-series="expected-loss"[^>]*fill="#f4b183" fill-opacity="0.35"/)
    assert.doesNotMatch(markup, /stroke-dasharray/)
  }
})

test("unaccounted loss series are positive and stacked above zero", () => {
  const segments = loaded.exports.stockLossSegments({
    stock_loss_chart_pct: 12, stock_loss_pct: -4, stock_loss_mortality_pct: 2,
    stock_loss_adjustment_pct: -4, stock_loss_harvest_pct: 10,
  })
  assert.deepEqual(segments.map(({ start, end }) => [start, end]), [[0, 2], [2, 2], [2, 12]])
  const positive = loaded.exports.stockLossSegments({
    stock_loss_chart_pct: 13, stock_loss_mortality_pct: 2,
    stock_loss_adjustment_pct: 7, stock_loss_harvest_pct: 4,
  })
  assert.deepEqual(positive.map(({ start, end }) => [start, end]), [[0, 2], [2, 9], [9, 13]])
  const markup = renderToStaticMarkup(React.createElement(loaded.exports.StockLossChart, {
    rows: [{ batch_id: 1, batch_name: "loss", stock_loss_chart_pct: 13, stock_loss_mortality_pct: 2, stock_loss_adjustment_pct: 7, stock_loss_harvest_pct: 4 }],
  }))
  for (const color of ["#a6a6a6", "#7030a0", "#ff0000", "#f4b183"]) assert.ok(markup.includes(color))
  assert.match(markup, /transfer \/ adjustments %: 7.00%/)
  assert.match(markup, /harvest %: 4.00%/)
  assert.doesNotMatch(markup, /NaN|Infinity|height="-\d/)
})

test("expected-loss shading varies by batch and leaves missing expectations blank", () => {
  const rows = [
    { batch_id: 1, batch_name: "young", stock_loss_pct: 0, stock_loss_expected_pct: 4 },
    { batch_id: 2, batch_name: "older", stock_loss_pct: 0, stock_loss_expected_pct: 12 },
    { batch_id: 3, batch_name: "unknown", stock_loss_pct: null, stock_loss_expected_pct: null },
    { batch_id: 4, batch_name: "oldest", stock_loss_pct: 0, stock_loss_expected_pct: 18 },
  ]
  const html = renderToStaticMarkup(React.createElement(loaded.exports.StockLossChart, { rows }))
  const areas = [...html.matchAll(/data-series="expected-loss" d="([^"]+)"/g)]
  assert.equal(areas.length, 2, "missing expectations break the shaded area")
  const points = [...areas[0][1].matchAll(/L[\d.]+,([\d.]+)/g)].map(match => Number(match[1]))
  assert.notEqual(points[0], points[1], "young and older batches have different expected loss heights")
  assert.match(html, /unknown<\/text>/)
  assert.doesNotMatch(html, /10%|stroke-dasharray/)
})
