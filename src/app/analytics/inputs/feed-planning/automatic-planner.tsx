"use client"
import { useState } from "react"
import Link from "next/link"
import type { AutomaticPlanData } from "@/features/analytics/automatic-feed-plan.server"
import { PELLETS } from "@/features/analytics/automatic-feed-plan"
import PlanningAutoRefresh from "@/features/analytics/components/planning-auto-refresh"
const fmt = (n: number) => n.toLocaleString("en-GB", { maximumFractionDigits: 1 })
const field = "block rounded-lg border bg-background px-3 py-2"

export default function AutomaticPlanner({ farmId, data }: { farmId: string; data: AutomaticPlanData }) {
  const { options, sources, result } = data
  const [editing, setEditing] = useState(false)
  const month = result.months[0]
  const incomplete = result.issues.length > 0
  const total = month.summary.total_feed_kg
  const outlookParams = new URLSearchParams({ farmId, report: "planning", planMonth: options.month.slice(0, 7), stocking: String(options.plannedFish), stockingAbw: String(options.plannedAbwG), stockingDay: String(options.stockingDay ?? 15), harvestWeight: String(options.harvestWeightG ?? 500) })
  options.harvests?.forEach(h => { outlookParams.set(`harvest_${h.system_id}`, String(h.fish)); outlookParams.set(`harvestDate_${h.system_id}`, h.date) })
  const period = new Date(`${options.month}T00:00:00Z`).toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" })
  function download() {
    const lines: (string | number)[][] = [["Month", "Cage", "Batch / stocking date", "Starting fish (projected)", "Starting ABW g (projected)", "End fish", "End ABW g", "Forecast deaths", "Planned harvest fish", "Planned harvest kg", "Feed kg", ...PELLETS.map(p => `${p} kg`)]]
    month.rows.forEach(r => lines.push([options.month.slice(0, 7), r.cage, r.batch, r.start_fish, r.start_abw_g, r.end_fish, r.end_abw_g, r.deaths, r.harvest_fish, r.harvest_kg, r.feed_kg, ...r.pellets]))
    lines.push(["Source records through", options.asOf], ["Model", "TB monthly biomass gain × eFCR"], ["Monthly stocking fish", options.plannedFish], ["Stocking ABW g", options.plannedAbwG], ["Stocking day", options.stockingDay ?? 15], ["Harvest target g", options.harvestWeightG ?? 500])
    lines.push([], ["Recorded source cage", "Stock date", "Fish count", "Sampled on", "Measured ABW g", "Recorded feed kg month-to-date", "Recorded deaths month-to-date"])
    sources.forEach(s => lines.push([s.cage_name, s.stock_date, s.stock_no, s.sampled_on ?? "Missing", s.abw_g ?? "Missing", s.actual_feed_kg, s.actual_mortality]))
    const csv = lines.map(line => line.map(value => `"${String(value).replaceAll('"', '""')}"`).join(",")).join("\r\n")
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }))
    const a = document.createElement("a"); a.href = url; a.download = `feed-plan-${options.month.slice(0, 7)}.csv`; a.click(); URL.revokeObjectURL(url)
  }
  return <div className="space-y-6">
    <PlanningAutoRefresh farmId={farmId}/>
    <section className="rounded-xl border bg-card p-5 space-y-4">
      <div><h2 className="text-lg font-semibold">1. Choose the planning month</h2><p className="text-sm text-muted-foreground">Fish counts, sampling, feed used and mortalities come from your production records.</p></div>
      <form className="flex flex-wrap items-end gap-3" method="get">
        <input type="hidden" name="farmId" value={farmId}/><input type="hidden" name="stocking" value={options.plannedFish}/><input type="hidden" name="stockingAbw" value={options.plannedAbwG}/><input type="hidden" name="stockingDay" value={options.stockingDay??15}/><input type="hidden" name="harvestWeight" value={options.harvestWeightG??500}/>
        <label className="text-sm">Planning month<input className={field} name="month" type="month" defaultValue={options.month.slice(0, 7)} required/></label>
        <button className="rounded-lg bg-primary px-4 py-2 text-primary-foreground">View plan</button>
      </form>
      <p className="text-sm">Using records dated on or before {options.asOf}. We project stock and weight forward to {period}. For a month already in progress, requirements cover the remaining forecast period; recorded feed is shown separately.</p>
    </section>
    <section className="rounded-xl border bg-card p-5 space-y-4">
      <div className="flex flex-wrap justify-between gap-3"><div><h2 className="text-lg font-semibold">2. Review the starting records</h2><p className="text-sm text-muted-foreground">Recorded fish counts already include mortality, transfers and harvests. Measured weights and forecast weights are labelled separately.</p></div><Link className="text-sm underline" href={`/data-entry?farmId=${farmId}`}>Record sampling or production data</Link></div>
      {result.issues.length > 0?<div role="alert" className="rounded-lg border border-destructive p-3"><p className="font-semibold">Complete these records before using the total</p><ul className="list-disc pl-5">{result.issues.map(issue=><li key={issue}>{issue}</li>)}</ul></div>:null}
      {result.warnings.length > 0?<div className="rounded-lg border p-3 text-sm">{result.warnings.map(w=><p key={w}>{w}</p>)}</div>:null}
      <p className="font-medium">{sources.length} stocked cages · {fmt(sources.reduce((n,s)=>n+s.stock_no,0))} recorded fish</p>
      <details><summary className="cursor-pointer text-sm underline">View recorded stock, sampling and actuals</summary>
      <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr>{["Cage", "Stock recorded", "Recorded fish", "Sampled on", "Measured ABW (g)", "Recorded feed (kg)", "Recorded deaths"].map(h=><th className="p-2 text-left whitespace-nowrap" key={h}>{h}</th>)}</tr></thead><tbody>{sources.map(s=><tr className="border-t" key={s.system_id}><td className="p-2 font-medium">{s.cage_name}</td><td className="p-2 whitespace-nowrap">{s.stock_date}</td><td className="p-2">{fmt(s.stock_no)}</td><td className="p-2 whitespace-nowrap">{s.sampled_on??"Needs sampling"}</td><td className="p-2">{s.abw_g==null?"Needs sampling":fmt(s.abw_g)}</td><td className="p-2">{fmt(s.actual_feed_kg)}</td><td className="p-2">{fmt(s.actual_mortality)}</td></tr>)}</tbody></table></div>
      <p className="text-xs text-muted-foreground">Recorded feed and deaths are month-to-date for {options.asOf.slice(0,7)}, for the stocked cages shown above. They are actual records, not forecast inputs to re-enter.</p></details>
      {sources.length===0?<p>No stocked cages were found. This plan includes future stocking assumptions only.</p>:null}
    </section>
    <section className="rounded-xl border bg-card p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-semibold">3. Set future assumptions</h2><Link className="text-sm underline" href={`/analytics/inputs?farmId=${farmId}&view=planning`}>Set farm defaults</Link></div>
      <p className="text-sm">{fmt(options.plannedFish)} new fish at {fmt(options.plannedAbwG)} g on day {options.stockingDay ?? 15}. Harvest is forecast at {fmt(options.harvestWeightG ?? 500)} g unless a dated harvest is specified. These assumptions do not create production records.</p>
      <details onToggle={e=>setEditing(e.currentTarget.open)}><summary className="cursor-pointer text-sm font-medium underline">Adjust stocking and harvest assumptions</summary>
        <form key={JSON.stringify(options)} method="get" className="mt-4 space-y-4">
          <input type="hidden" name="farmId" value={farmId}/><input type="hidden" name="month" value={options.month.slice(0,7)}/>
          <div className="flex flex-wrap gap-4"><label>New fish per month<input className={field} type="number" name="stocking" defaultValue={options.plannedFish} min="0" max="10000000" step="1" required/></label><label>Stocking ABW (g)<input className={field} type="number" name="stockingAbw" defaultValue={options.plannedAbwG} min="0.3" max="100" step="any" required/></label><label>Stocking day<input className={field} type="number" name="stockingDay" defaultValue={options.stockingDay??15} min="1" max="28" step="1" required/></label><label>Harvest target (g)<input className={field} type="number" name="harvestWeight" defaultValue={options.harvestWeightG??500} min="100" max="1000" required/></label></div>
          <p className="text-sm text-muted-foreground">Optional dated harvests override the target-weight assumption for that cage. Fish are fed through the harvest date.</p>
          <div className="overflow-x-auto"><table className="text-sm"><thead><tr><th className="p-2 text-left">Cage</th><th className="p-2 text-left">Fish to harvest</th><th className="p-2 text-left">Harvest date</th></tr></thead><tbody>{sources.map(s=>{const h=options.harvests?.find(h=>h.system_id===s.system_id);return <tr key={s.system_id}><td className="p-2">{s.cage_name}</td><td className="p-2"><input aria-label={`Harvest fish ${s.cage_name}`} className={field} type="number" min="0" step="1" name={`harvest_${s.system_id}`} defaultValue={h?.fish??0}/></td><td className="p-2"><input aria-label={`Harvest date ${s.cage_name}`} className={field} type="date" name={`harvestDate_${s.system_id}`} defaultValue={h?.date??""} min={options.month} max={monthEndForUI(options.month)}/></td></tr>})}</tbody></table></div>
          <button className="rounded-lg border px-4 py-2">Update forecast</button>
        </form>
      </details>
      {editing?<p className="text-xs text-muted-foreground">New records continue to update the forecast. Apply your assumptions when ready.</p>:null}
    </section>
    <section className="rounded-xl border bg-card p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-semibold">4. Feed requirements · {period}</h2><p className="text-2xl font-semibold">{incomplete?"Total unavailable":`${fmt(total)} kg`}</p></div><button disabled={incomplete} onClick={download} className="rounded-lg bg-primary px-4 py-2 text-primary-foreground disabled:opacity-50">Download feed plan</button></div>
      {!incomplete?<><div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{PELLETS.map((p,i)=><div className="rounded-lg bg-muted p-3" key={p}><p className="text-sm">{p}</p><p className="font-semibold">{fmt(month.rows.reduce((n,r)=>n+r.pellets[i],0))} kg</p></div>)}</div><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr>{["Cage / stocking", "Starting fish", "Starting ABW (g)", "End fish", "End ABW (g)", "Harvest (kg)", "Feed (kg)"].map(h=><th className="p-2 text-left whitespace-nowrap" key={h}>{h}</th>)}</tr></thead><tbody>{month.rows.map(r=><tr className="border-t" key={r.key}><td className="p-2">{r.cage}{r.planned?` · ${r.batch}`:""}</td><td className="p-2">{fmt(r.start_fish)}</td><td className="p-2">{fmt(r.start_abw_g)}</td><td className="p-2">{fmt(r.end_fish)}</td><td className="p-2">{fmt(r.end_abw_g)}</td><td className="p-2">{fmt(r.harvest_kg)}</td><td className="p-2">{fmt(r.feed_kg)}</td></tr>)}</tbody></table></div><p className="text-xs text-muted-foreground">Starting and ending values in this table are forecasts. Feed-size totals use the projected fish sizes and reconcile to total feed. New records replace projected starting values automatically.</p></>:<p>Correct the source records or assumptions above to complete the forecast.</p>}
      <Link className="inline-block text-sm underline" href={`/analytics?${outlookParams.toString()}`}>View the 12-month outlook</Link>
    </section>
  </div>
}
function monthEndForUI(month: string) { return new Date(Date.UTC(Number(month.slice(0,4)),Number(month.slice(5,7)),0)).toISOString().slice(0,10) }
