"use client"

import { useMemo, useState } from "react"
import { CopyZoomChartTitle } from "@/components/shared/copy-zoom"
import type { CageHarvestRow, GrowthCurveRow, HarvestPointRow } from "@/features/analytics/types"
import { curvesByScenario, judgeBatchAgainstCurves, signedPct, verdictLabel, type HarvestCurveVerdict } from "@/features/analytics/harvest-curve"
import { BATCH_COLORS, CURVE_STYLE, Legend, compact, niceTop } from "./growth-charts"

// Same geometry, colours and line styles as the growth-analysis charts (growth-charts.tsx).
const W = 900
const H = 320
const PAD = { l: 58, r: 16, t: 14, b: 54 }
const RECORDED = "#0072B2"
const HARVEST = "#eb6834"
const SCENARIOS = ["slow", "main", "potential"] as const
const ALL = "all"

type Series = { key: string; name: string; color: string; harvestColor: string; points: HarvestPointRow[] }

function modelAt(curve: GrowthCurveRow[], day: number) {
  const next = curve.findIndex((c) => c.day >= day)
  if (next <= 0) return next === 0 ? curve[0].abw_g : null
  const a = curve[next - 1]
  const b = curve[next]
  return a.abw_g + ((b.abw_g - a.abw_g) * (day - a.day)) / Math.max(b.day - a.day, 1)
}

/** One batch (blue line, orange harvest diamonds) or every closed batch at once (one colour per batch). */
function HarvestCurveChart({ title, series, curves, multi }: { title: string; series: Series[]; curves: Record<(typeof SCENARIOS)[number], GrowthCurveRow[]>; multi: boolean }) {
  const all = useMemo(() => series.flatMap((s) => s.points), [series])
  if (all.length === 0) return <p className="planner-note">No weights recorded for this batch.</p>

  const minAge = Math.min(...all.map((p) => p.model_age_days))
  const maxAge = Math.max(...all.map((p) => p.model_age_days))
  const xMin = Math.max(0, Math.floor((minAge - 10) / 10) * 10)
  const xMax = Math.ceil((maxAge + 15) / 10) * 10
  const maxAbw = Math.max(...all.map((p) => p.abw_g))
  const mainEnd = modelAt(curves.main, xMax) ?? 0
  const yTop = niceTop(Math.max(maxAbw, mainEnd) * 1.1)
  const plotW = W - PAD.l - PAD.r
  const plotH = H - PAD.t - PAD.b
  const x = (d: number) => PAD.l + ((d - xMin) / Math.max(xMax - xMin, 1)) * plotW
  const y = (v: number) => PAD.t + plotH - (Math.min(v, yTop) / yTop) * plotH
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => yTop * f)
  const xTicks = Array.from({ length: 7 }, (_, i) => Math.round(xMin + ((xMax - xMin) / 6) * i))

  return (
    <figure className="rpt-chart">
      <CopyZoomChartTitle>{title}</CopyZoomChartTitle>
      <Legend
        items={[
          ...(multi
            ? series.map((s) => ({ label: s.name, color: s.color }))
            : [
                { label: "Recorded weight", color: RECORDED, swatch: "line" as const },
                { label: "Harvests", color: HARVEST },
              ]),
          ...SCENARIOS.map((s) => ({ label: CURVE_STYLE[s].label, color: CURVE_STYLE[s].color, dash: CURVE_STYLE[s].dash, swatch: "line" as const })),
        ]}
      />
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={title} className="rpt-chart__svg">
        {yTicks.map((t) => (
          <g key={t}>
            <line x1={PAD.l} x2={W - PAD.r} y1={y(t)} y2={y(t)} stroke="#e6ddd0" />
            <text x={PAD.l - 6} y={y(t) + 4} textAnchor="end" fontSize="11" fill="#6f746f">
              {compact(t)}
            </text>
          </g>
        ))}
        {xTicks.map((t) => (
          <text key={t} x={x(t)} y={H - PAD.b + 16} textAnchor="middle" fontSize="11" fill="#232a25">
            {t}
          </text>
        ))}
        {SCENARIOS.map((s) => (
          <polyline
            key={s}
            points={curves[s]
              .filter((c) => c.day >= xMin && c.day <= xMax && c.abw_g <= yTop)
              .map((c) => `${x(c.day)},${y(c.abw_g)}`)
              .join(" ")}
            fill="none"
            stroke={CURVE_STYLE[s].color}
            strokeWidth="1.6"
            strokeDasharray={CURVE_STYLE[s].dash}
          />
        ))}
        {series.map((s) => {
          const sorted = [...s.points].sort((a, b) => a.date.localeCompare(b.date))
          const recorded = sorted.filter((p) => p.kind !== "harvest")
          const harvests = sorted.filter((p) => p.kind === "harvest")
          return (
            <g key={s.key}>
              <polyline points={recorded.map((p) => `${x(p.model_age_days)},${y(p.abw_g)}`).join(" ")} fill="none" stroke={s.color} strokeWidth="1.5" strokeOpacity="0.75" />
              {recorded.map((p) => (
                <circle key={`${p.kind}-${p.date}`} cx={x(p.model_age_days)} cy={y(p.abw_g)} r="3.2" fill={s.color}>
                  <title>{`${s.name} - ${p.date}: ${p.abw_g.toFixed(1)} g, ${p.age_days} days since stocking (model age ${p.model_age_days})`}</title>
                </circle>
              ))}
              {harvests.map((p) => (
                <rect key={`h-${p.date}`} x={x(p.model_age_days) - 4} y={y(p.abw_g) - 4} width="8" height="8" fill={s.harvestColor} stroke="#fffdf9" strokeWidth="1.5" transform={`rotate(45 ${x(p.model_age_days)} ${y(p.abw_g)})`}>
                  <title>{`${s.name} - harvest ${p.date}: ${p.abw_g.toFixed(1)} g at ${p.age_days} days`}</title>
                </rect>
              ))}
            </g>
          )
        })}
        <text x={PAD.l + plotW / 2} y={H - 8} textAnchor="middle" fontSize="11" fill="#6f746f">
          Age on the growth model (days)
        </text>
        <text x={14} y={PAD.t + plotH / 2} textAnchor="middle" fontSize="11" fill="#6f746f" transform={`rotate(-90 14 ${PAD.t + plotH / 2})`}>
          Average body weight (g)
        </text>
      </svg>
    </figure>
  )
}

function verdictSentence(v: HarvestCurveVerdict) {
  if (!v.closest || v.gap === null) return `Too few weights to judge (${v.pointCount} after stocking).`
  const vs = v.finalVsMain === null ? "" : `; final weight ${signedPct(v.finalVsMain)} against Main`
  const name = verdictLabel(v)
  return v.outside ? `${name} curve${vs}.` : `Closest to the ${name} curve (${signedPct(v.gap)} on average)${vs}.`
}

export default function BatchHarvestCards({ rows, points, curves }: { rows: CageHarvestRow[]; points: HarvestPointRow[]; curves: GrowthCurveRow[] }) {
  const byScenario = useMemo(() => curvesByScenario(curves), [curves])
  // Rows arrive most recent first; one entry per closed batch cycle.
  const batches = useMemo(() => rows.map((r) => ({ cycleId: String(r.cycle_id), name: r.batch_name, own: points.filter((p) => p.cycle_id === r.cycle_id) })), [rows, points])
  const [selected, setSelected] = useState(batches[0]?.cycleId ?? ALL)
  if (rows.length === 0) return null

  const current = selected === ALL || batches.some((b) => b.cycleId === selected) ? selected : batches[0].cycleId
  const batch = batches.find((b) => b.cycleId === current)
  const compareAll = current === ALL
  const series: Series[] = compareAll
    ? batches.filter((b) => b.own.length > 0).map((b, i) => ({ key: b.cycleId, name: b.name, color: BATCH_COLORS[i % BATCH_COLORS.length], harvestColor: BATCH_COLORS[i % BATCH_COLORS.length], points: b.own }))
    : batch
      ? [{ key: batch.cycleId, name: batch.name, color: RECORDED, harvestColor: HARVEST, points: batch.own }]
      : []
  const verdict = batch ? judgeBatchAgainstCurves(batch.own, byScenario) : null

  return (
    <div className="grid gap-2">
      <div className="rpt-actions">
        <label className="rpt-small" htmlFor="harvest-batch">
          Batch
        </label>
        <select
          id="harvest-batch"
          value={current}
          onChange={(e) => setSelected(e.target.value)}
          className="h-9 rounded-full border border-[#e6ddd0] bg-[#fffdf9] px-3 text-sm font-semibold"
        >
          {batches.length > 1 ? <option value={ALL}>All batches</option> : null}
          {batches.map((b) => (
            <option key={b.cycleId} value={b.cycleId}>
              {b.name}
            </option>
          ))}
        </select>
      </div>
      <article className="rounded-xl border border-[#e6ddd0] bg-[#fffdf9] p-3 grid gap-2">
        {verdict ? (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="rpt-small">{verdictSentence(verdict)}</p>
            <span className="rounded-full bg-[#f6f1e8] px-3 py-1 text-xs font-semibold">{verdict.closest ? `Followed: ${verdictLabel(verdict)}` : verdictLabel(verdict)}</span>
          </div>
        ) : null}
        <HarvestCurveChart title={compareAll ? "ABW against age - all batches" : `ABW against age - batch ${batch?.name ?? ""}`} series={series} curves={byScenario} multi={compareAll} />
      </article>
    </div>
  )
}
