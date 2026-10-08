"use client"

import { useCallback, useState, type ReactNode } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Info } from "lucide-react"
import { Dialog } from "@/components/app-ui/dialog"
import {
  GROWTH_SCENARIOS,
  type AnalyticsReportData,
  type CageHarvestRow,
  type FarmForecastRow,
  type FeedVsExpectedRow,
  type ForwardPlanRow,
  type GrowthScenario,
} from "@/features/analytics/types"
import { FilterPopover } from "@/components/shared/filter-popover"
import TimePeriodSelector from "@/components/shared/time-period-selector"
import BatchReportTable from "./batch-report-table"
import StockProfileChart, { classLabel } from "./stock-profile-chart"
import { AbwAgeChart, GrowthByBatchChart, SelectedBatchAbwChart } from "./growth-charts"
import { DASH, ReportTable, dateText, num, pct, type Column } from "./report-table"
import "@/features/reports/monthly/monthly-reports.css"

function dayLabel(date: string) {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })
}

/** "September 2026" for a whole calendar month, otherwise "23 Aug 2026 to 23 Sep 2026". */
function periodLabel(from: string, to: string) {
  const lastDay = new Date(Date.UTC(Number(to.slice(0, 4)), Number(to.slice(5, 7)), 0)).getUTCDate()
  const wholeMonth = from.slice(0, 7) === to.slice(0, 7) && from.endsWith("-01") && Number(to.slice(8, 10)) === lastDay
  return wholeMonth ? monthLabel(from) : `${dayLabel(from)} to ${dayLabel(to)}`
}

function monthLabel(month: string) {
  return new Date(`${month}T00:00:00Z`).toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" })
}

function Section({ title, note, noteAsInfo = false, infoLabel, children }: { title?: string; note?: string; noteAsInfo?: boolean; infoLabel?: string; children: ReactNode }) {
  const [infoOpen, setInfoOpen] = useState(false)
  return (
    <section className="planner-card">
      {title || (note && noteAsInfo) ? (
        <div className="flex items-center gap-2">
          {title ? <h3 className="rpt-heading">{title}</h3> : null}
          {note && noteAsInfo ? (
            <button
              type="button"
              aria-label={`About ${infoLabel || title || "this report"}`}
              aria-haspopup="dialog"
              onClick={() => setInfoOpen(true)}
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Info size={16} aria-hidden="true" />
            </button>
          ) : null}
        </div>
      ) : null}
      {note && !noteAsInfo ? <p className="rpt-small">{note}</p> : null}
      {note && noteAsInfo ? (
        <Dialog open={infoOpen} onClose={() => setInfoOpen(false)} title={infoLabel ?? title ?? "Report information"} maxWidth="sm">
          <p className="text-sm leading-relaxed">{note}</p>
        </Dialog>
      ) : null}
      {children}
    </section>
  )
}


const HARVEST_COLUMNS: Column<CageHarvestRow>[] = [
  { label: "Unit", cell: (r) => r.unit ?? DASH },
  { label: "Cage", cell: (r) => r.cage_name ?? DASH },
  { label: "Batch ID", cell: (r) => r.batch_name },
  { label: "Harvest completed", cell: (r) => dateText(r.harvest_date) },
  { label: "Original stock date", cell: (r) => dateText(r.original_stock_date) },
  { label: "Age (days)", cell: (r) => num(r.age_days), numeric: true },
  { label: "Production number stocked", cell: (r) => num(r.total_stocked), numeric: true },
  { label: "Mortalities", cell: (r) => num(r.mortalities), numeric: true },
  { label: "Mortality (%)", cell: (r) => pct(r.mortality_pct, 2), numeric: true },
  { label: "Cage corrections", cell: (r) => num(r.cage_corrections), numeric: true },
  { label: "Cage correction (%)", cell: (r) => pct(r.cage_correction_pct, 2), numeric: true },
  { label: "Survival (%)", cell: (r) => pct(r.survival_pct, 2), numeric: true },
  { label: "Harvest no.", cell: (r) => num(r.harvest_number), numeric: true },
  { label: "Harvest (kg)", cell: (r) => num(r.harvest_kg, 2), numeric: true },
  { label: "Harvest ABW (g)", cell: (r) => num(r.harvest_abw_g, 1), numeric: true },
  { label: "Feed fed (kg)", cell: (r) => num(r.feed_kg, 2), numeric: true },
  { label: "eFCR", cell: (r) => num(r.efcr, 2), numeric: true },
]

const BATCH_HARVEST_COLUMNS = HARVEST_COLUMNS.filter((column) => column.label !== "Unit" && column.label !== "Cage")

const HARVEST_METHOD_NOTE = "Stocked excludes count corrections. Corrections are signed count adjustments; correction and mortality percentages use original stock. Survival is harvested fish divided by original estimated stock and may exceed 100%; it is not a measured biological survival rate. eFCR uses recorded feed divided by harvested biomass plus productive transfers out minus input biomass; escapes and count-only adjustments are excluded from biomass. Age runs from original stocking to final harvest. Missing weights leave eFCR blank."

const FEED_COLUMNS: Column<FeedVsExpectedRow>[] = [
  { label: "Cage", cell: (r) => r.cage_name },
  { label: "Batch ID", cell: (r) => r.batch_name },
  { label: "Feed fed (kg)", cell: (r) => num(r.feed_fed_kg), numeric: true },
  { label: "Feed expected (kg)", cell: (r) => num(r.feed_expected_kg), numeric: true },
  { label: "ABW start (g)", cell: (r) => num(r.abw_start_g, 1), numeric: true },
  { label: "ABW end (g)", cell: (r) => num(r.abw_end_g, 1), numeric: true },
  { label: "ABW increase (%)", cell: (r) => pct(r.abw_increase_pct, 0), numeric: true },
  { label: "Feed fed vs expected (%)", cell: (r) => pct(r.feed_vs_expected_pct, 0), numeric: true },
]

const FORWARD_ROWS: { label: string; value: (r: ForwardPlanRow) => number; digits?: number; strong?: boolean; indent?: boolean }[] = [
  { label: "Juvenile stocking (no.)", value: (r) => r.juvenile_stocking },
  { label: "Harvest plan (kg)", value: (r) => r.harvest_kg },
  { label: "Total feed (kg)", value: (r) => r.total_feed_kg, strong: true },
  { label: "0.5-1mm", value: (r) => r.feed_0_5_1mm_kg, indent: true },
  { label: "0.9-1.6mm", value: (r) => r.feed_0_9_1_6mm_kg, indent: true },
  { label: "2mm", value: (r) => r.feed_2mm_kg, indent: true },
  { label: "3mm", value: (r) => r.feed_3mm_kg, indent: true },
  { label: "4mm", value: (r) => r.feed_4mm_kg, indent: true },
  { label: "6mm", value: (r) => r.feed_6mm_kg, indent: true },
]

function shortMonth(v: string) {
  return new Date(`${v}T00:00:00Z`).toLocaleDateString("en-GB", { month: "short", year: "2-digit", timeZone: "UTC" })
}

function ForwardPlanningTable({ rows }: { rows: ForwardPlanRow[] }) {
  if (rows.length === 0) return <p className="planner-note">No forward plan available for this month.</p>
  return (
    <div className="plan-scroll">
      <table className="plan-table">
        <thead>
          <tr>
            <th />
            {rows.map((r) => (
              <th key={r.month_start}>{shortMonth(r.month_start)}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {FORWARD_ROWS.map((def) => (
            <tr key={def.label} className={def.strong ? "rpt-total" : undefined}>
              <td>{def.indent ? `  ${def.label}` : def.label}</td>
              {rows.map((r) => (
                <td key={r.month_start} className="n">
                  {def.value(r) > 0 ? num(def.value(r), def.digits ?? 0) : DASH}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ForecastTable({ rows }: { rows: FarmForecastRow[] }) {
  if (rows.length === 0) return <p className="planner-note">No forecast available for this month.</p>
  const lines: { label: string; sub?: string; value: (r: FarmForecastRow) => number | null; strong?: boolean }[] = [
    { label: "Biomass", sub: "Forecast (kg)", value: (r) => r.biomass_forecast_kg },
    { label: "", sub: "Recorded (kg)", value: (r) => r.biomass_recorded_kg, strong: true },
    { label: "Harvest", sub: "Forecast (kg)", value: (r) => r.harvest_forecast_kg },
    { label: "", sub: "Recorded (kg)", value: (r) => r.harvest_recorded_kg, strong: true },
  ]
  return (
    <div className="plan-scroll">
      <table className="plan-table">
        <thead>
          <tr>
            <th />
            <th />
            {rows.map((r) => (
              <th key={r.month_start}>{shortMonth(r.month_start)}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {lines.map((line) => (
            <tr key={`${line.label}${line.sub}`} className={line.strong ? "rpt-total" : undefined}>
              <td>{line.label}</td>
              <td>{line.sub}</td>
              {rows.map((r) => {
                const v = line.value(r)
                return (
                  <td key={r.month_start} className="n">
                    {v != null && v > 0 ? num(v) : DASH}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function StockingPlanForm({
  fish,
  abw,
  scenario,
  onApply,
}: {
  fish: number
  abw: number
  scenario: GrowthScenario
  onApply: (fish: number, abw: number, scenario: GrowthScenario) => void
}) {
  const [fishText, setFishText] = useState(String(fish))
  const [abwText, setAbwText] = useState(String(abw))
  const [scenarioValue, setScenarioValue] = useState<GrowthScenario>(scenario)
  const inputClass = "h-9 w-32 rounded-full border border-[#e6ddd0] bg-[#fffdf9] px-3 text-sm font-semibold"
  return (
    <form
      className="rpt-actions"
      onSubmit={(e) => {
        e.preventDefault()
        onApply(Number(fishText) || 0, Number(abwText) || 2, scenarioValue)
      }}
    >
      <label className="rpt-small" htmlFor="plan-fish">
        Planned stocking per month (fish)
      </label>
      <input id="plan-fish" inputMode="numeric" value={fishText} onChange={(e) => setFishText(e.target.value)} className={inputClass} />
      <label className="rpt-small" htmlFor="plan-abw">
        Stocking ABW (g)
      </label>
      <input id="plan-abw" inputMode="decimal" value={abwText} onChange={(e) => setAbwText(e.target.value)} className={inputClass} />
      <label className="rpt-small" htmlFor="plan-scenario">
        Growth scenario
      </label>
      <select
        id="plan-scenario"
        value={scenarioValue}
        onChange={(e) => setScenarioValue(e.target.value as GrowthScenario)}
        className={inputClass}
      >
        {GROWTH_SCENARIOS.map((sc) => (
          <option key={sc} value={sc}>
            {sc}
          </option>
        ))}
      </select>
      <button type="submit" className="btn btn--primary">
        Update plan
      </button>
    </form>
  )
}

// Related reports share a view: the dropdown picks a view, not a single report.
const REPORT_OPTIONS = [
  { value: "outlook", label: "Stock profile" },
  { value: "batches", label: "Batch performance" },
  { value: "growth", label: "Growth analysis" },
  { value: "cages", label: "Cage performance: feed vs expectation" },
  { value: "harvests", label: "Harvest reports" },
  { value: "planning", label: "Biomass forecast and forward planning" },
] as const

type ReportKey = (typeof REPORT_OPTIONS)[number]["value"]

function parseReportKey(raw: string | null): ReportKey {
  if (raw === "forecast") return "planning"
  return REPORT_OPTIONS.find((o) => o.value === raw)?.value ?? "outlook"
}

export default function AnalyticsReport({ data }: { data: AnalyticsReportData }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const report = parseReportKey(searchParams.get("report"))
  const cycleToDate = searchParams.get("period") !== "custom"
  const show = (key: ReportKey) => report === key

  const onCustomRangeChange = (range: { start: string; end: string }) => {
    const params = new URLSearchParams(searchParams.toString())
    params.delete("month")
    params.set("period", "custom")
    params.set("from", range.start)
    params.set("to", range.end)
    router.replace(`${pathname}?${params.toString()}`)
  }

  const onCycleToDate = () => {
    const params = new URLSearchParams(searchParams.toString())
    params.set("period", "cycle")
    params.delete("month")
    params.delete("from")
    params.delete("to")
    router.replace(`${pathname}?${params.toString()}`)
  }

  const onReportChange = useCallback(
    (value: string) => {
      const params = new URLSearchParams(searchParams.toString())
      params.set("report", value)
      const query = params.toString()
      router.replace(query ? `${pathname}?${query}` : pathname)
    },
    [pathname, router, searchParams],
  )

  const onPlanApply = useCallback(
    (fish: number, abw: number, scenario: GrowthScenario) => {
      const params = new URLSearchParams(searchParams.toString())
      params.set("stocking", String(Math.max(0, Math.round(fish))))
      params.set("stockingAbw", String(abw))
      params.set("scenario", scenario)
      router.replace(`${pathname}?${params.toString()}`)
    },
    [pathname, router, searchParams],
  )

  const label = report === "harvests" ? monthLabel(data.month) : cycleToDate ? "Cycle to date" : periodLabel(data.periodStart, data.periodEnd)
  // Oldest batch first, so legend colours stay stable as new batches are added.
  const growthBatchNames = Array.from(new Set(data.growthByBatch.map((b) => b.batch_name))).reverse()
  const forecastLabel = monthLabel(data.month)

  return (
    <div className="tb-monthly">
      <div className="rpt-titlebar">
        <Link className="underline text-sm" href={`/analytics/inputs${searchParams.get("farmId") ? `?farmId=${encodeURIComponent(searchParams.get("farmId")!)}` : ""}`}>Feed planning</Link>
        <div className="rpt-actions">
          <div className="w-full sm:w-[320px]">
            <FilterPopover
              value={report}
              options={REPORT_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
              placeholder="Select report"
              onChange={onReportChange}
              searchable={false}
              className="w-full"
            />
          </div>
          <div className="w-full sm:w-[240px]">
            {report === "harvests" ? (
              <input
                type="month"
                aria-label="Harvest month"
                value={data.month.slice(0, 7)}
                onInput={(event) => {
                  const month = event.currentTarget.value
                  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return
                  const params = new URLSearchParams(searchParams.toString())
                  params.set("month", month)
                  params.delete("period")
                  params.delete("from")
                  params.delete("to")
                  router.replace(pathname + "?" + params.toString())
                }}
                className="h-10 w-full rounded-full border border-border bg-background px-4 text-sm"
              />
            ) : <TimePeriodSelector
              selectedPeriod="all history"
              periods={["all history"]}
              customLabels={{ "all history": "Cycle to date" }}
              onPeriodChange={onCycleToDate}
              customRange={cycleToDate ? null : { start: data.periodStart, end: data.periodEnd }}
              onCustomRangeChange={onCustomRangeChange}
              variant="compact"
            />}
          </div>
        </div>
      </div>

      {data.error ? <p className="rpt-note">{data.error}</p> : null}

      {show("outlook") ? (
        <Section
          title={`Stock Profile - ${dayLabel(data.periodEnd)}`}
          noteAsInfo
          note={`Fish in the cages at the end of the period, grouped by each cage's average weight, against the ideal if ${num(data.forwardPlanInputs.plannedFish)} juveniles were stocked every month and grown on the ${data.forwardPlanInputs.scenario} growth model.`}
        >
          <StockProfileChart rows={data.stockProfile} />
          <div className="plan-scroll">
            <table className="plan-table">
              <thead>
                <tr>
                  <th>Weight class (g)</th>
                  <th>Ideal fish</th>
                  <th>Recorded fish</th>
                  <th>Cages</th>
                </tr>
              </thead>
              <tbody>
                {data.stockProfile.map((r) => (
                  <tr key={r.class_no}>
                    <td>{classLabel(r)}</td>
                    <td className="n">{r.ideal_fish > 0 ? num(r.ideal_fish) : DASH}</td>
                    <td className="n">{r.recorded_fish > 0 ? num(r.recorded_fish) : DASH}</td>
                    <td>{r.cage_names?.length ? r.cage_names.join(", ") : DASH}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      ) : null}

      {show("planning") ? (
        <Section
          title={`Farm-Wide Biomass and Harvest Forecast - as at ${forecastLabel}`}
          noteAsInfo
          note="Forecast is what the farm should hold and harvest if every stocking followed the growth model (past months) and the forward plan (coming months). Recorded is from the farm's records. The growth scenario and stocking plan under Forward Planning drive it."
        >
          <ForecastTable rows={data.farmForecast} />
        </Section>
      ) : null}

      {show("planning") ? (
        <Section
          title={`Forward Planning - from ${forecastLabel}`}
          noteAsInfo
          note="Next 12 months. Every cage is grown from its current size along the growth model and harvested at the target weight; feed is biomass times the model feeding rate, split by pellet size from fish weight. Planned stocking is an assumption you set here. Slow and potential use main mortality assumptions unless their own benchmarks are configured. Update plan previews these choices; save farm defaults under Production inputs → Planning inputs."
        >
          <StockingPlanForm
            key={`${data.forwardPlanInputs.plannedFish}-${data.forwardPlanInputs.plannedAbwG}-${data.forwardPlanInputs.scenario}`}
            fish={data.forwardPlanInputs.plannedFish}
            abw={data.forwardPlanInputs.plannedAbwG}
            scenario={data.forwardPlanInputs.scenario}
            onApply={onPlanApply}
          />
          <ForwardPlanningTable rows={data.forwardPlan} />
        </Section>
      ) : null}

      {show("batches") ? (
        <Section
          title={`Detailed Batch Report - ${label}`}
          note="Stock, ABW and biomass are as at the end of the period. Mortality, cage corrections, harvest, growth and feed are for the period; accumulated eFCR runs from stocking."
        >
          <BatchReportTable rows={data.batches} />
        </Section>
      ) : null}

      {show("growth") ? (
        <Section
          title="Growth analysis"
          infoLabel=""
          noteAsInfo
          note="Recorded growth against the growth model. Batches are placed on the model's age axis (days since stocking plus the model age at their stocking weight) so batches stocked at different sizes can be compared; the dashed lines are the model scenarios."
        >
          <GrowthByBatchChart rows={data.growthByBatch} cycleToDate={cycleToDate} />
          <AbwAgeChart
            title="ABW against age - batches up to 450 days on the model"
            points={data.abwPoints}
            curves={data.growthCurve}
            batchNames={growthBatchNames.filter((n) => Math.max(0, ...data.abwPoints.filter((p) => p.batch_name === n).map((p) => p.model_age_days)) <= 450)}
          />
          <SelectedBatchAbwChart points={data.abwPoints} curves={data.growthCurve} batchNames={growthBatchNames} />
        </Section>
      ) : null}

      {show("cages") ? (
        <Section
          title={`ABW Increase and Feed Fed vs Expectation - ${label}`}
          note="Expected feed uses the growth model feeding rates for each day's fish size and biomass."
        >
          <ReportTable
            columns={FEED_COLUMNS}
            rows={data.feedVsExpected}
            rowKey={(r) => String(r.system_id)}
            emptyText="No cages with fish in this period."
          />
        </Section>
      ) : null}

      {show("harvests") ? (
        <Section
          title={`Cage Harvest Report - ${label}`}
          note={`Cages with a harvest in the selected period and a reconciled zero balance at their last harvest. Figures cover only the batch in that cage. Unit is the recorded cage unit. ${HARVEST_METHOD_NOTE}`}
          noteAsInfo
        >
          <ReportTable
            columns={HARVEST_COLUMNS}
            rows={data.cageHarvests}
            rowKey={(r) => `${r.cycle_id}:${r.system_id}`}
            emptyText="No fully harvested cages are confirmed for this period."
          />
        </Section>
      ) : null}
      {show("harvests") ? (
        <Section title={`Batch Harvest Report - ${label}`} note={`Completed batches harvested in the selected period. Figures cover all cages from stocking through final harvest. ${HARVEST_METHOD_NOTE}`} noteAsInfo>
          <ReportTable columns={BATCH_HARVEST_COLUMNS} rows={data.batchHarvests} rowKey={(r) => String(r.cycle_id)} emptyText="No fully harvested batches are confirmed for this period." />
        </Section>
      ) : null}

    </div>
  )
}
