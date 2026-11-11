const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const ts = require('typescript')
const compiled = ts.transpileModule(fs.readFileSync('src/features/analytics/harvest-curve.ts','utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText
const loaded = { exports: {} }
new Function('require','module','exports',compiled)(require,loaded,loaded.exports)
const { buildHarvestPoints, judgeBatchAgainstCurves, curvesByScenario } = loaded.exports
const row = { cycle_id: 1, batch_id: 1, batch_name: 'test', original_stock_date: '2026-01-01', harvest_date: '2026-02-01', report_cutoff: '2026-03-31' }
const sample = (date, abw, cycle_id = 1) => ({ batch_id: 1, cycle_id, date, abw, number_of_fish_sampling: 10 })
const harvest = (date, kg) => ({ batch_id: 1, cycle_id: 1, date, number_of_fish_harvest: 10, total_weight_harvest: kg })
const curve = [{ scenario: 'main', day: 0, abw_g: 1 },{ scenario: 'main', day: 200, abw_g: 500 }]

test('ongoing harvest curves include subsequent measurements through cutoff only', () => {
  const points = buildHarvestPoints([row],[],[sample('2026-01-10',20),sample('2026-03-01',100),sample('2026-04-01',150),sample('2025-12-01',10),sample('2026-02-10',200,2)],[harvest('2026-02-01',0.5)],curve)
  assert.deepEqual(points.map(p => p.date),['2026-01-10','2026-02-01','2026-03-01'])
  assert.equal(points[0].is_baseline,true)
  assert.equal(points[2].abw_g,100)
  assert.equal(judgeBatchAgainstCurves(points,curvesByScenario(curve)).finalAbwG,100)
})

test('missing stocking weight uses first actual sampling as opening baseline', () => {
  const stock = [{ batch_id: 1, cycle_id: 1, date: '2026-01-01', number_of_fish_stocking: 100, total_weight_stocking: null }]
  const points = buildHarvestPoints([row],stock,[sample('2026-01-10',20)],[],curve)
  assert.equal(points.length,1)
  assert.equal(points[0].kind,'sampling')
  assert.equal(judgeBatchAgainstCurves(points,curvesByScenario(curve)).pointCount,0)
})

test('recorded transfer weight can anchor a batch with no stocking weight', () => {
  const transfer = { batch_id: 1, cycle_id: 1, date: '2026-01-02', target_system_id: 2, number_of_fish_transfer: 100, total_weight_transfer: 2, abw: null, transfer_type: 'internal' }
  const points = buildHarvestPoints([row],[],[sample('2026-01-10',25)],[],curve,[transfer])
  assert.equal(points[0].kind,'transfer')
  assert.equal(points[0].abw_g,20)
  assert.equal(points[0].is_baseline,true)
})

test('incomplete harvest weights do not create an understated ABW', () => {
  const points = buildHarvestPoints([row],[],[sample('2026-01-10',20)],[harvest('2026-02-01',1),harvest('2026-02-01',null)],curve)
  assert.equal(points.length,1)
})

test('future stocking cannot replace the historical sampling baseline', () => {
  const stock = [{ batch_id: 1, cycle_id: 1, date: '2026-04-01', number_of_fish_stocking: 100, total_weight_stocking: 1 }]
  const points = buildHarvestPoints([row],stock,[sample('2026-01-10',20)],[],curve)
  assert.equal(points[0].date,'2026-01-10')
  assert.equal(points[0].is_baseline,true)
})
