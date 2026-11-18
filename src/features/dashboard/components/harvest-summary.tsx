import Link from "next/link"
import { createAccessTokenClient } from "@/lib/supabase/server"
import { nairobiToday } from "@/features/analytics/automatic-feed-plan"
import { loadHarvestSummary } from "../harvest-summary.server"

export default async function HarvestSummary({ farmId, accessToken }: { farmId: string; accessToken: string }) {
  const today = nairobiToday()
  const summary = await loadHarvestSummary(createAccessTokenClient(accessToken), farmId, today)
  const label = new Date(`${today}T00:00:00Z`).toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" })
  const href = `/production/harvests?${new URLSearchParams({ farmId, month: today.slice(0, 7) })}`
  const number = (value: number | null, decimals = 0) => value == null ? "—" : value.toLocaleString("en-GB", { maximumFractionDigits: decimals })
  return <section aria-labelledby="harvest-summary-title" className="rounded-2xl border border-border bg-card p-4 sm:p-5">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div><h2 id="harvest-summary-title" className="text-base font-semibold">Harvests</h2><p className="text-xs text-muted-foreground">{label} · farm-wide</p></div>
      <Link href={href} className="text-sm font-semibold text-primary underline underline-offset-4">View harvest reports</Link>
    </div>
    <dl className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
      {[["Fish harvested this month", number(summary.fish)], ["Harvested this month (kg)", number(summary.kg, 2)], ["Ongoing harvested batches", number(summary.ongoing)]].map(([title, value]) =>
        <div key={title}><dt className="text-xs text-muted-foreground">{title}</dt><dd className="mt-1 text-2xl font-semibold tabular-nums">{value}</dd></div>)}
    </dl>
    {summary.unavailable ? <p className="mt-3 text-sm text-muted-foreground">Harvest summary could not be loaded. Open the reports or try again shortly.</p> : null}
  </section>
}
