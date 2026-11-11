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
new Function("require", "module", "exports", compiled)(require, loaded, loaded.exports)
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

test("monthly stock loss limit toggles on and off and stays inside the plot", () => {
  let enabled = false
  const testModule = { exports: {} }
  new Function("require", "module", "exports", compiled)(id => id === "react"
    ? { ...React, useState: () => [enabled, value => { enabled = value }] }
    : require(id), testModule, testModule.exports)
  const rows = [{ batch_id: 1, batch_name: "low", stock_loss_pct: 2 }, { batch_id: 2, batch_name: "blank", stock_loss_pct: null }]
  const render = (cycleToDate = false) => testModule.exports.StockLossChart({ rows, cycleToDate })
  const findInput = element => {
    if (!element || typeof element !== "object") return null
    if (element.type === "input") return element
    return React.Children.toArray(element.props?.children).map(findInput).find(Boolean)
  }
  const before = render()
  assert.doesNotMatch(renderToStaticMarkup(before), /Maximum allowed: 10%/)
  findInput(before).props.onChange({ target: { checked: true } })
  const markup = renderToStaticMarkup(render())
  assert.match(markup, /Maximum allowed: 10%/)
  assert.match(markup, /blank<\/text>/)
  assert.equal((markup.match(/<rect /g) || []).length, 4, "three causes and the threshold background")
  const line = markup.match(/<line[^>]*y1="([\d.]+)"[^>]*stroke="#b45309"/)
  assert.ok(line && Number(line[1]) > 14 && Number(line[1]) < 266)
  assert.doesNotMatch(renderToStaticMarkup(render(true)), /type="checkbox"|Maximum allowed: 10%/)
  findInput(render()).props.onChange({ target: { checked: false } })
  assert.doesNotMatch(renderToStaticMarkup(render()), /Maximum allowed: 10%/)
})

test("stock loss causes stack separately above and below zero", () => {
  const segments = loaded.exports.stockLossSegments({
    stock_loss_pct: 8, stock_loss_mortality_pct: 2,
    stock_loss_adjustment_pct: -4, stock_loss_harvest_pct: 10,
  })
  assert.deepEqual(segments.map(({ start, end }) => [start, end]), [[0, 2], [0, -4], [2, 12]])
  const markup = renderToStaticMarkup(React.createElement(loaded.exports.StockLossChart, {
    rows: [{ batch_id: 1, batch_name: "signed", stock_loss_pct: 8, stock_loss_mortality_pct: 2, stock_loss_adjustment_pct: -4, stock_loss_harvest_pct: 10 }],
  }))
  for (const color of ["#a6a6a6", "#7030a0", "#ff0000", "#fce4d6"]) assert.ok(markup.includes(color))
  assert.match(markup, /adjustment losses %: -4.00%/)
  assert.doesNotMatch(markup, /NaN|Infinity|height="-/)
})
