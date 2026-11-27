const { test } = require("node:test")
const assert = require("node:assert/strict")
const fs = require("node:fs")
const path = require("node:path")
const ts = require("typescript")
function load(file) {
  const module = { exports: {} }
  const code = ts.transpileModule(fs.readFileSync(file, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  new Function("require", "module", "exports", code)(id => load(path.resolve(path.dirname(file), id + ".ts")), module, module.exports)
  return module.exports
}
const { forecastMortality, MORTALITY_FIT } = load("src/features/analytics/mortality-forecast.ts")
test("mortality forecast uses workbook growth to advance into the next weight phase", () => {
  const cohorts = [{ key: "synthetic", fish: 1000, abwG: 14.9, ageDays: 60 }]
  const result = forecastMortality(cohorts, "2026-11", 2)
  const first = 1000 * MORTALITY_FIT.olderPer30[0].p * MORTALITY_FIT.season["11"]
  const second = (1000 - first) * MORTALITY_FIT.olderPer30[1].p * MORTALITY_FIT.season["12"]
  assert.ok(Math.abs(result.months[0].deaths - first) < 1e-10)
  assert.ok(Math.abs(result.months[1].deaths - second) < 1e-10)
  assert.ok(result.months.every(month => Number.isFinite(month.fish_end)))
  assert.equal(cohorts[0].abwG, 14.9)
  assert.equal(cohorts[0].fish, 1000)
})
