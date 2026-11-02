"use client"

import { useMemo } from "react"
import type { CageHarvestRow, GrowthCurveRow, HarvestPointRow } from "@/features/analytics/types"
import { curvesByScenario, judgeBatchAgainstCurves, signedPct, verdictLabel, type HarvestCurveVerdict } from "@/features/analytics/harvest-curve"
import { CURVE_STYLE, Legend, compact, niceTop } from "./growth-charts"

const W = 640
const H = 260
const PAD = { l: 48, r: 16, t: 14, b: 46 }
const RECORDED = "#2a78d6"
const HARVEST = "#eb6834"
const SCENARIOS = ["slow", "main", "potential"] as const
// Spreadsheet-style smoothed scatter: thin solid lines, no dashes.
const MODEL_WIDTH = 1.25
const RECORDED_WIDTH = 1.75

/** Smooth line through the points (monotone cubic, so it never overshoots between weights), like Excel's smoothed scatter. */
function smoothPath(pts: [number, number][]): string {
  if (pts.length === 0) return ""
  if (pts.length < 3) return pts.map(([px, py], i) => `${i === 0 ? "M" : "L"}${px},${py}`).join(" ")
  const dx = pts.slice(1).map((p, i) => p[0] - pts[i][0])
  const slope = pts.slice(1).map((p, i) => (p[1] - pts[i][1]) / (dx[i] || 1))
  const t = pts.map((_, i) => {
    if (i === 0) return slope[0]
    if (i === pts.length - 1) return slope[i - 1]
    if (slope[i - 1] * slope[i] <= 0) return 0
    return (3 * (dx[i - 1] + dx[i])) / ((2 * dx[i] + dx[i - 1]) / slope[i - 1] + (dx[i] + 2 * dx[i - 1]) / slope[i])
  })
  let d = `M${pts[0][0]},${pts[0][1]}`
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i]
    const [x1, y1] = pts[i + 1]
    d += ` C${x0 + dx[i] / 3},${y0 + (t[i] * dx[i]) / 3} ${x1 - dx[i] / 3},${y1 - (t[i + 1] * dx[i]) / 3} ${x1},${y1}`
  }
  return d
}

function modelAt(curve: GrowthCurveRow[], day: number) {
  const next = curve.findIndex((c) => c.day >= day)
  if (next <= 0) return next === 0 ? curve[0].abw_g : null
  const a = curve[next - 1]
  const b = curve[next]
  return a.abw_g + ((b.abw_g - a.abw_g) * (day - a.day)) / Math.max(b.day - a.day, 1)
}

function HarvestCurveChart({ title, points, curves }: { title: string; points: HarvestPointRow[]; curves: Record<(typeof SCENARIOS)[number], GrowthCurveRow[]> }) {
  const sorted = useMemo(() => [...points].sort((a, b) => a.date.localeCompare(b.date)), [points])
  const recorded = sorted.filter((p) => p.kind !== "harvest")
  const harvests = sorted.filter((p) => p.kind === "harvest")
  if (sorted.length === 0) return <p className="planner-note">No weights recorded for this batch.</p>

  const minAge = Math.min(...sorted.map((p) => p.model_age_days))
  const maxAge = Math.max(...sorted.map((p) => p.model_age_days))
  const xMin = Math.max(0, Math.floor((minAge - 10) / 10) * 10)
  const xMax = Math.ceil((maxAge + 15) / 10) * 10
  const maxAbw = Math.max(...sorted.map((p) => p.abw_g))
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
      <figcaption className="rpt-chart__title">{title}</figcaption>
      <Legend
        items={[
          { label: "Recorded weight", color: RECORDED, swatch: "line" },
          { label: "Harvests", color: HARVEST },
          ...SCENARIOS.map((s) => ({ label: CURVE_STYLE[s].label, color: CURVE_STYLE[s].color, swatch: "line" as const })),
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
          <path
            key={s}
            d={smoothPath(
              curves[s]
                .filter((c) => c.day >= xMin && c.day <= xMax && c.abw_g <= yTop)
                .map((c): [number, number] => [x(c.day), y(c.abw_g)]),
            )}
            fill="none"
            stroke={CURVE_STYLE[s].color}
            strokeWidth={MODEL_WIDTH}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
        <path
          d={smoothPath(recorded.map((p): [number, number] => [x(p.model_age_days), y(p.abw_g)]))}
          fill="none"
          stroke={RECORDED}
          strokeWidth={RECORDED_WIDTH}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {recorded.map((p) => (
          <circle key={`${p.kind}-${p.date}`} cx={x(p.model_age_days)} cy={y(p.abw_g)} r="3" fill={RECORDED} stroke="#fffdf9" strokeWidth="1.5">
            <title>{`${p.date}: ${p.abw_g.toFixed(1)} g, ${p.age_days} days since stocking (model age ${p.model_age_days})`}</title>
          </circle>
        ))}
        {harvests.map((p) => (
          <rect key={`h-${p.date}`} x={x(p.model_age_days) - 4} y={y(p.abw_g) - 4} width="8" height="8" fill={HARVEST} stroke="#fffdf9" strokeWidth="1.5" transform={`rotate(45 ${x(p.model_age_days)} ${y(p.abw_g)})`}>
            <title>{`Harvest ${p.date}: ${p.abw_g.toFixed(1)} g at ${p.age_days} days`}</title>
          </rect>
        ))}
        <text x={PAD.l + plotW / 2} y={H - 8} textAnchor="middle" fontSize="11" fill="#6f746f">
          Age on the growth model (days)
        </text>
        <text x={12} y={PAD.t + plotH / 2} textAnchor="middle" fontSize="11" fill="#6f746f" transform={`rotate(-90 12 ${PAD.t + plotH / 2})`}>
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
  if (rows.length === 0) return null
  return (
    <div className="grid gap-3">
      {rows.map((row) => {
        const own = points.filter((p) => p.cycle_id === row.cycle_id)
        const verdict = judgeBatchAgainstCurves(own, byScenario)
        const title = `ABW against age - batch ${row.batch_name}`
        return (
          <article key={row.cycle_id} className="rounded-xl border border-[#e6ddd0] bg-[#fffdf9] p-3 grid gap-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="rpt-small">{verdictSentence(verdict)}</p>
              <span className="rounded-full bg-[#f6f1e8] px-3 py-1 text-xs font-semibold">{verdict.closest ? `Followed: ${verdictLabel(verdict)}` : verdictLabel(verdict)}</span>
            </div>
            {own.length > 0 ? <HarvestCurveChart title={title} points={own} curves={byScenario} /> : <p className="planner-note">No weights recorded for this batch.</p>}
          </article>
        )
      })}
    </div>
  )
}
