const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const ts = require('typescript')
const source = fs.readFileSync('src/features/analytics/feed-model.ts', 'utf8')
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText
const context = { exports: {} }
vm.runInNewContext(code, context)
const { calculateFeed, planDays } = context.exports
const september = calculateFeed(1825, 347, '2026-09-01', '2026-09-30')
assert.ok(Math.abs(september.feed_kg - 161.73695891037497) < 1e-8)
const october = calculateFeed(1823, 296, '2026-10-01', '2026-10-31')
assert.ok(Math.abs(october.feed_kg - 193.27631375178277) < 1e-8)
assert.equal(october.end_fish, 1805)
for (const [abw, phase] of [[.3,1],[1,2],[5,3],[10,4],[70,5],[140,6],[210,7],[320,8],[450,9]]) {
 assert.equal(calculateFeed(100, abw, '2026-10-01', '2026-10-31').phase, phase)
}
assert.equal(calculateFeed(0,296,'2026-10-01','2026-10-31').feed_kg,0)
assert.ok(calculateFeed(3000,296,'2026-10-01','2026-10-31').feed_kg>october.feed_kg)
assert.ok(calculateFeed(1823,310,'2026-10-01','2026-10-31').feed_kg>october.feed_kg)
assert.equal(planDays('2026-09-23','2026-10-22'),30)
assert.ok(Math.abs(calculateFeed(1823,296,'2026-09-23','2026-10-22').mortality_pct-1)<1e-10)
assert.throws(()=>calculateFeed(1.5,296,'2026-10-01','2026-10-31'))
assert.throws(()=>calculateFeed(100,NaN,'2026-10-01','2026-10-31'))
assert.throws(()=>planDays('2026-02-30','2026-03-01'))
assert.throws(()=>planDays('2026-10-31','2026-10-01'))
assert.throws(()=>planDays('2026-01-01','2026-10-01'))
console.log('Feed model: workbook September/October parity, phase boundaries, input sensitivity and date validation passed.')
