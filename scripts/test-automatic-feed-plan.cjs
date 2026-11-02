const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const ts = require('typescript')
const load = (name, dependencies = {}) => {
  const context = { exports: {}, require: key => { if (dependencies[key]) return dependencies[key]; throw new Error(`Unexpected dependency ${key}`) } }
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(`src/features/analytics/${name}.ts`, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, context)
  return context.exports
}
const model = load('feed-model')
const { buildFeedPlan, nairobiToday } = load('automatic-feed-plan', { './feed-model': model })
const source = { system_id: 1, cage_name: 'A', batch_name: 'Batch', stock_no: 1823, stock_date: '2026-10-31', abw_g: 354, sampled_on: '2026-10-31', actual_feed_kg: 200, actual_mortality: 4 }
const options = { month: '2026-11-01', months: 1, asOf: '2026-10-31', plannedFish: 0, plannedAbwG: 2, harvestWeightG: 1000 }
let p = buildFeedPlan([source], options)
assert.equal(p.issues.length, 0)
assert.ok(Math.abs(p.months[0].summary.total_feed_kg - 164.80575725550534) < 1e-8)
const fields = ['feed_0_5_1mm_kg','feed_0_9_1_6mm_kg','feed_2mm_kg','feed_3mm_kg','feed_4mm_kg','feed_6mm_kg']
const reconcile = plan => plan.months.forEach(m => {
  assert.ok(Math.abs(fields.reduce((n,k)=>n+m.summary[k],0)-m.summary.total_feed_kg)<1e-7)
  assert.ok(Math.abs(m.rows.reduce((n,r)=>n+r.feed_kg,0)-m.summary.total_feed_kg)<1e-7)
})
reconcile(p)
// All nine phases use the same monthly model as the existing workbook parity tests.
for (const abw of [.3, 1, 5, 10, 70, 140, 210, 320, 450]) {
  const plan=buildFeedPlan([{...source,stock_no:1000,abw_g:abw}],options)
  assert.ok(Math.abs(plan.months[0].summary.total_feed_kg-model.calculateFeed(1000,abw,options.month,'2026-11-30').feed_kg)<1e-8)
}
const younger={...source,stock_no:10000,abw_g:50}
p=buildFeedPlan([younger],{...options,months:12,plannedFish:100000,harvestWeightG:500})
assert.equal(p.issues.length,0);reconcile(p)
assert.ok(p.months.some(m=>m.summary.harvest_kg>0))
const cohort=p.months.flatMap(m=>m.rows).filter(r=>r.key==='1')
assert.equal(cohort.at(-1).end_fish,0)
const dated=buildFeedPlan([younger],{...options,months:2,harvests:[{system_id:1,date:'2026-11-15',fish:9900}]})
assert.equal(dated.issues.length,0);assert.ok(dated.months[1].rows[0].start_fish<100);reconcile(dated)
const invalid=buildFeedPlan([younger],{...options,harvests:[{system_id:1,date:'2026-11-15',fish:20000}]})
assert.ok(invalid.issues.some(s=>s.includes('exceeds')),JSON.stringify(invalid))
assert.ok(buildFeedPlan([{...source,abw_g:null}],options).issues.length)
assert.ok(buildFeedPlan([{...source,sampled_on:'2026-11-01'}],options).issues.length)
assert.ok(buildFeedPlan([{...source,stock_date:'2026-09-01'}],options).issues.length)
assert.ok(buildFeedPlan([source,source],options).issues.length)
const fresh=buildFeedPlan([{...source,abw_g:370}],options)
assert.notEqual(fresh.months[0].summary.total_feed_kg,buildFeedPlan([source],options).months[0].summary.total_feed_kg)
// Actual feed and deaths are already recorded; changing those display-only totals
// must not subtract them from stock or add them to forecast demand a second time.
assert.equal(buildFeedPlan([{...source,actual_feed_kg:99999,actual_mortality:1000}],options).months[0].summary.total_feed_kg,buildFeedPlan([source],options).months[0].summary.total_feed_kg)
const olderSample=buildFeedPlan([{...source,sampled_on:'2026-10-23'}],options)
assert.ok(olderSample.months[0].rows[0].start_abw_g>source.abw_g)
const newStock=buildFeedPlan([],{...options,plannedFish:100000,plannedAbwG:3,stockingDay:15})
assert.equal(newStock.months[0].summary.juvenile_stocking,100000)
assert.ok(newStock.months[0].summary.total_feed_kg<model.calculateFeed(100000,3,'2026-11-01','2026-11-30').feed_kg)
assert.equal(buildFeedPlan([],{...options,asOf:'2026-11-20',plannedFish:100000}).months[0].summary.juvenile_stocking,0)
assert.equal(nairobiToday(new Date('2026-10-31T22:00:00Z')),'2026-11-01')
// The monthly screen and the first column of the 12-month outlook must be identical.
const oneMonth=buildFeedPlan([younger],{...options,plannedFish:100000,harvestWeightG:500})
const twelveMonths=buildFeedPlan([younger],{...options,months:12,plannedFish:100000,harvestWeightG:500})
assert.equal(JSON.stringify(oneMonth.months[0]),JSON.stringify(twelveMonths.months[0]))
const current=buildFeedPlan([{...younger,stock_date:'2026-11-20',sampled_on:'2026-11-20'}],{...options,asOf:'2026-11-20',plannedFish:100000})
assert.equal(current.months[0].summary.juvenile_stocking,0)
assert.ok(current.months[0].summary.total_feed_kg<model.calculateFeed(younger.stock_no,younger.abw_g,'2026-11-01','2026-11-30').feed_kg)
assert.ok(buildFeedPlan([younger],{...options,harvests:[{system_id:1,date:'2026-10-30',fish:10}]}).issues.length)
assert.throws(()=>buildFeedPlan([],{...options,stockingDay:0}))
assert.throws(()=>buildFeedPlan([],{...options,plannedFish:NaN}))
console.log('PASS: monthly workbook parity, 9 phases, source-date projection, live updates, actuals not double-counted, partial stockings, dated/target harvests, missing/stale records, and cage/pellet/month reconciliation.')
