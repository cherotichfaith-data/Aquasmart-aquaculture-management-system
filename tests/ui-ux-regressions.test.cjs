const { test } = require("node:test")
const assert = require("node:assert/strict")
const fs = require("node:fs")
const path = require("node:path")
const ts = require("typescript")

function load(file, mocks = {}) {
  const source = fs.readFileSync(path.resolve(file), "utf8")
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true, target: ts.ScriptTarget.ES2022 } }).outputText
  const module = { exports: {} }
  const scopedRequire = (id) => {
    if (id in mocks) return mocks[id]
    if (id.startsWith("@/")) {
      const base = path.join("src", id.slice(2))
      return load(fs.existsSync(base + ".ts") ? base + ".ts" : base + ".tsx", mocks)
    }
    return require(id)
  }
  new Function("require", "module", "exports", compiled)(scopedRequire, module, module.exports)
  return module.exports
}

const { entryDate, entryQuarterHour } = load("src/lib/entry-time.ts")
test("entry dates retain the operator's calendar day across UTC boundaries", () => {
  const original = process.env.TZ
  try {
    process.env.TZ = "Africa/Nairobi"
    assert.equal(entryDate(new Date("2026-09-09T22:10:00Z")), "2026-09-10")
    assert.equal(entryQuarterHour(new Date("2026-09-09T22:10:00Z")), "01:00")
    process.env.TZ = "America/Los_Angeles"
    assert.equal(entryDate(new Date("2026-09-10T01:10:00Z")), "2026-09-09")
    assert.equal(entryQuarterHour(new Date(2026, 8, 9, 23, 59)), "23:45")
  } finally { if (original === undefined) delete process.env.TZ; else process.env.TZ = original }
})

const { findWaterQualityDuplicate } = load("src/features/data-entry/components/water-quality-duplicate.ts")
const reading = { date: "2026-09-10", metadata: { waterDepth: 1, time: "08:00", parameterName: "dissolved_oxygen" } }
const values = { date: "2026-09-10", time: "08:00", water_depth: "1", dissolved_oxygen: "0" }
test("water quality blocks the same parameter, time and depth, including zero readings", () => {
  assert.equal(findWaterQualityDuplicate([reading], values), reading)
})
test("water quality allows PM, different depth, different parameter and blank measurements", () => {
  for (const change of [{ time: "16:00" }, { water_depth: 2 }, { date: "2026-09-11" }, { dissolved_oxygen: "", pH: 7 }, { dissolved_oxygen: undefined }]) {
    assert.equal(findWaterQualityDuplicate([reading], { ...values, ...change }), undefined)
  }
})

function correctionRoute({ status = "rejected", owner = "operator", role = "system_operator", user = "operator", sourceError = null } = {}) {
  const submissions = []
  const source = { id: 42, farm_id: "farm-original", entry_type: "feeding", status, submitted_by: owner, payload: { system_id: 7 } }
  const supabase = { from(table) {
    const query = { select() { return query }, eq() { return query }, async single() { return table === "production_pending_entry" ? { data: source, error: sourceError } : { data: { role }, error: null } } }
    return query
  } }
  const route = load("src/app/api/approvals/[entryId]/route.ts", {
    "next/server": { NextResponse: { json: (body, init) => new Response(JSON.stringify(body), init) } },
    "@/lib/server/auth": { requireRateLimitedApiUser: async () => ({ user: { id: user }, supabase }) },
    "@/lib/server/rate-limit": { apiRateLimits: { mutation: {} } },
    "@/lib/server/approvals": { submitApproval: async (_client, type, farmId, payload) => { submissions.push({ type, farmId, payload }); return [{ id: 43, status: "pending" }] } },
  })
  return { route, submissions }
}
function request() { return new Request("http://localhost/api/approvals/42", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ payload: { farm_id: "wrong-farm", system_id: 99, date: "2026-09-10", feeding_amount: 1 } }) }) }
const context = { params: Promise.resolve({ entryId: "42" }) }
test("rejected corrections retain farm/cage identity and a stable source id", async () => {
  const { route, submissions } = correctionRoute()
  assert.equal((await route.POST(request(), context)).status, 202)
  assert.equal(submissions[0].farmId, "farm-original")
  assert.equal(submissions[0].payload.system_id, 7)
  assert.equal(submissions[0].payload.local_id, "correction:42")
})
test("operators cannot correct another operator's submission", async () => {
  const { route, submissions } = correctionRoute({ owner: "someone-else" })
  assert.equal((await route.POST(request(), context)).status, 403)
  assert.equal(submissions.length, 0)
})
test("approved and pending entries cannot be resubmitted as corrections", async () => {
  for (const status of ["approved", "pending"]) {
    const { route, submissions } = correctionRoute({ status })
    assert.equal((await route.POST(request(), context)).status, 409)
    assert.equal(submissions.length, 0)
  }
})
test("farm managers may correct rejected submissions", async () => {
  const { route } = correctionRoute({ owner: "someone-else", role: "farm_manager" })
  assert.equal((await route.POST(request(), context)).status, 202)
})

test("approval editor renders named choices, units and hides structural timestamps", () => {
  const React = require("react")
  const { renderToStaticMarkup } = require("react-dom/server")
  const { EntryEditor } = load("src/app/approvals/entry-editor.tsx")
  const markup = renderToStaticMarkup(React.createElement(EntryEditor, { type: "feeding", draft: { date: "2026-09-10", feeding_amount: 1, feeding_response: 3, feed_type_id: 8, synced_at: "internal" }, onChange() {}, disabled: false, systems: [], batches: [], feeds: [{ id: 8, name: "Test feed" }] }))
  assert.match(markup, /Test feed/)
  assert.match(markup, /Ideal Appetite/)
  assert.match(markup, /Feed given \(kg\)/)
  assert.doesNotMatch(markup, /synced_at|Synced at/)
})
