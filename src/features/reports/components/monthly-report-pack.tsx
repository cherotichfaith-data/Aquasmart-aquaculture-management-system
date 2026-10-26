"use client"

import { useState, type ReactNode } from "react"
import Link from "next/link"
import pack from "@/features/reports/monthly/tanganyika-blue-2026-09.json"
import { FilterPopover } from "@/components/shared/filter-popover"
import "@/features/reports/monthly/monthly-reports.css"

type Block =
  | { t: "kpis"; items: string[][] }
  | { t: "h"; text: string }
  | { t: "table"; head: string[]; rows: string[][]; total: boolean }
  | { t: "chart"; title: string; cats: string[]; series: { name: string; data: number[] }[] }
  | { t: "note"; html: string }
  | { t: "small"; text: string }

type MonthlyReport = { id: string; file: string; title: string; question: string; blocks: Block[] }

const REPORTS = pack.reports as MonthlyReport[]
// These fixed snapshots overlap live workbook-based views in Analytics.
const ARCHIVED_REPORT_IDS = new Set(["02", "06"])
const ROUTINE_REPORTS = REPORTS.filter(report => !ARCHIVED_REPORT_IDS.has(report.id))
const PDF_BASE = "/reports/tanganyika-blue-2026-09"
// The pack is a fixed snapshot of one farm's data, so it is only shown for that farm.
const PACK_FARM = /tanganyika|tanlake/i
const NUMERIC = /^[-+]?[\d,]+(\.\d+)?%?( kg| g)?$/
const FLAG = /^(High|Open|CHECK)\b|\bLATE\b/
const OK = /^(OK|Ready)/

function Emphasis({ html }: { html: string }) {
  // The pack only ever uses <b>...</b>; split on it instead of injecting HTML.
  return (
    <>
      {html.split(/(<b>.*?<\/b>)/g).map((part, i) =>
        part.startsWith("<b>") ? <strong key={i}>{part.slice(3, -4)}</strong> : <span key={i}>{part}</span>,
      )}
    </>
  )
}

const SERIES_COLORS = ["var(--sidebar, #0f4c81)", "#e0a526", "#9ca3af"]

function compact(v: number) {
  if (v >= 1000) return `${Math.round(v / 100) / 10}k`.replace(".0k", "k")
  return String(Math.round(v))
}

function PackChart({ title, cats, series }: { title: string; cats: string[]; series: { name: string; data: number[] }[] }) {
  const W = 900
  const H = 260
  const pad = { l: 48, r: 12, t: 12, b: 46 }
  const max = Math.max(1, ...series.flatMap((s) => s.data))
  const step = Math.pow(10, Math.floor(Math.log10(max)))
  const top = Math.ceil(max / step) * step
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => top * f)
  const plotW = W - pad.l - pad.r
  const plotH = H - pad.t - pad.b
  const group = plotW / cats.length
  const bar = Math.min(34, (group * 0.72) / series.length)
  const y = (v: number) => pad.t + plotH - (v / top) * plotH

  return (
    <figure className="rpt-chart">
      <figcaption className="rpt-chart__title">{title}</figcaption>
      {series.length > 1 ? (
        <div className="rpt-chart__legend">
          {series.map((s, i) => (
            <span key={s.name}>
              <i style={{ background: SERIES_COLORS[i % SERIES_COLORS.length] }} />
              {s.name}
            </span>
          ))}
        </div>
      ) : null}
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={title} className="rpt-chart__svg">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} stroke="#e6ddd0" />
            <text x={pad.l - 6} y={y(t) + 4} textAnchor="end" fontSize="11" fill="#6f746f">
              {compact(t)}
            </text>
          </g>
        ))}
        {cats.map((c, ci) => {
          const x0 = pad.l + ci * group + (group - bar * series.length) / 2
          return (
            <g key={c + ci}>
              {series.map((s, si) => {
                const v = s.data[ci] ?? 0
                return (
                  <rect key={s.name} x={x0 + si * bar} y={y(v)} width={bar - 2} height={pad.t + plotH - y(v)} rx="2" fill={SERIES_COLORS[si % SERIES_COLORS.length]}>
                    <title>{`${s.name}: ${Math.round(v).toLocaleString()}`}</title>
                  </rect>
                )
              })}
              <text x={pad.l + ci * group + group / 2} y={H - pad.b + 16} textAnchor="middle" fontSize="11" fill="#232a25">
                {c}
              </text>
            </g>
          )
        })}
      </svg>
    </figure>
  )
}

function PackTable({ head, rows, total }: { head: string[]; rows: string[][]; total: boolean }) {
  return (
    <div className="plan-scroll">
      <table className="plan-table">
        <thead>
          <tr>
            {head.map((h, i) => (
              <th key={h + i}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri} className={total && ri === rows.length - 1 ? "rpt-total" : undefined}>
              {row.map((cell, ci) => {
                const cls = [
                  ci > 0 && (NUMERIC.test(cell.trim()) || cell.trim() === "-") ? "n" : "",
                  FLAG.test(cell) ? "rpt-flag" : "",
                  OK.test(cell) ? "rpt-ok" : "",
                ]
                  .filter(Boolean)
                  .join(" ")
                return (
                  <td key={ci} className={cls || undefined}>
                    {cell}
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

// The reports cover one fixed month. The header's time filter decides whether that month is in view.
const PACK_START = "2026-08-23"
const PACK_END = "2026-09-23"

export default function MonthlyReports({
  farmId,
  farmName,
  dateFrom,
  dateTo,
  filterSlot,
}: {
  farmId?: string | null
  farmName?: string | null
  dateFrom?: string | null
  dateTo?: string | null
  /** The period filter; shown directly under the report picker (or on its own when no report is in view). */
  filterSlot?: ReactNode
}) {
  const [active, setActive] = useState(ROUTINE_REPORTS[0].id)
  const [showArchived, setShowArchived] = useState(false)
  const availableReports = showArchived ? REPORTS : ROUTINE_REPORTS
  const report = availableReports.find(item => item.id === active) ?? availableReports[0]
  const analyticsHref = (view: string) => {
    const params = new URLSearchParams({ report: view })
    if (farmId) params.set("farmId", farmId)
    if (dateFrom && dateTo) { params.set("from", dateFrom); params.set("to", dateTo) }
    return `/analytics?${params.toString()}`
  }
  const liveReports = (
      <section className="planner-card">
        <h2>Production analysis</h2>
        <p className="planner-note">Use the live workbook-based views for batch performance, growth, cage performance and farm planning.</p>
        <nav aria-label="Live production reports" className="flex flex-wrap gap-4 text-sm underline">
          <Link href={analyticsHref("batches")}>Batch performance</Link>
          <Link href={analyticsHref("growth")}>Growth analysis</Link>
          <Link href={analyticsHref("cages")}>Cage performance</Link>
          <Link href={analyticsHref("outlook")}>Stock profile</Link>
          <Link href={analyticsHref("planning")}>Biomass forecast and forward planning</Link>
        </nav>
      </section>
  )
  const hasRange = Boolean(dateFrom && dateTo)
  const overlaps = !hasRange || (dateFrom! <= PACK_END && dateTo! >= PACK_START)

  if (!farmName || !PACK_FARM.test(farmName)) {
    return (
      <div className="tb-monthly">
        {liveReports}
        <section className="planner-card">
          <p className="planner-note">
            The monthly reports (23 Aug to 23 Sep 2026) are a snapshot for {pack.meta.farm}. Select that farm to view them.
          </p>
        </section>
      </div>
    )
  }

  if (!overlaps) {
    return (
      <div className="tb-monthly">
        {liveReports}
        {filterSlot}
        <section className="planner-card">
          <h2>No report for this period</h2>
          <p className="planner-note">
            The selected period ({dateFrom} to {dateTo}) has no monthly report yet. Available: 23 Aug to 23 Sep 2026. Change the
            time filter to include that month.
          </p>
        </section>
      </div>
    )
  }

  const exact = !hasRange || (dateFrom === PACK_START && dateTo === PACK_END)

  return (
    <div className="tb-monthly">
      {liveReports}
      <p className="rpt-small">Historical review: 23 Aug–23 Sep 2026. The reports below are fixed snapshots, including their PDF downloads.</p>
      <div className="rpt-titlebar">
        <h2>{report.title}</h2>
        <div className="rpt-actions">
          {filterSlot}
          <a className="btn btn--primary" href={`${PDF_BASE}/${report.file}`} target="_blank" rel="noreferrer">
            Download PDF
          </a>
        </div>
      </div>
      {exact ? null : (
        <p className="rpt-note">
          The selected period ({dateFrom} to {dateTo}) only partly overlaps this report, which covers 23 Aug to 23 Sep 2026. Figures are for
          the report window, not re-cut to your selection.
        </p>
      )}

      <div className="rpt-filters">
        <div className="rpt-filter-report">
          <FilterPopover
            value={report.id}
            options={availableReports.map((r) => ({ value: r.id, label: `${r.title.replace(/ Report$/, "")}${ARCHIVED_REPORT_IDS.has(r.id) ? " (archived)" : ""}` }))}
            placeholder="Select report"
            onChange={setActive}
            searchable={false}
            className="w-full"
          />
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={showArchived} onChange={event => {
          const checked = event.target.checked
          setShowArchived(checked)
          if (!checked && ARCHIVED_REPORT_IDS.has(active)) setActive(ROUTINE_REPORTS[0].id)
        }} />
        Include archived batch-performance and stock-profile snapshots
      </label>
      <section className="planner-card">
        <p className="rpt-question">{report.question}</p>
        {report.blocks.map((b, i) => {
          if (b.t === "kpis")
            return (
              <div key={i} className="rpt-kpis">
                {b.items.map(([value, label]) => (
                  <div key={label} className="rpt-kpi">
                    <b>{value}</b>
                    <span>{label}</span>
                  </div>
                ))}
              </div>
            )
          if (b.t === "h")
            return (
              <h3 key={i} className="rpt-heading">
                {b.text}
              </h3>
            )
          if (b.t === "chart") return <PackChart key={i} title={b.title} cats={b.cats} series={b.series} />
          if (b.t === "table") return <PackTable key={i} head={b.head} rows={b.rows} total={b.total} />
          if (b.t === "note")
            return (
              <p key={i} className="rpt-note">
                <Emphasis html={b.html} />
              </p>
            )
          return (
            <p key={i} className="rpt-small">
              {b.text}
            </p>
          )
        })}
      </section>
    </div>
  )
}
