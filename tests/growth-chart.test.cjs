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
  assert.equal((markup.match(/>N\/A<\/text>/g) || []).length, 4)
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
