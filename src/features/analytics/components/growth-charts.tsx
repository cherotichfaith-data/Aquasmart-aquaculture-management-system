"use client"

import { useMemo, useState } from "react"
import type { AbwPointRow, GrowthByBatchRow, GrowthCurveRow } from "@/features/analytics/types"

const W = 900
const H = 320
const PAD = { l: 58, r: 16, t: 14, b: 54 }
const RECORDED = "var(--sidebar, #0f4c81)"
const EXPECTED = "#e0a526"
// Categorical palette (colour-blind friendly first, then extra hues) for the per-batch lines.
const BATCH_COLORS = ["#0072B2", "#E69F00", "#009E73", "#CC79A7", "#56B4E9", "#D55E00", "#7A5195", "#8C564B", "#2CA02C", "#17BECF", "#BCBD22", "#E377C2"]
const CURVE_STYLE: Record<string, { color: string; dash: string; label: string }> = {
  slow: { color: "#6f746f", dash: "2 4", label: "Slow model" },
  main: { color: "#232a25", dash: "6 4", label: "Main model" },
  potential: { color: "#b45309", dash: "10 4", label: "Potential model" },
}

function compact(v: number) {
  if (Math.abs(v) >= 1000) return `${Math.round(v / 100) / 10}k`.replace(".0k", "k")
  return String(Math.round(v * 10) / 10).replace(/\.0$/, "")
}

function niceTop(max: number) {
  const m = Math.max(max, 1e-6)
  const step = Math.pow(10, Math.floor(Math.log10(m)))
  return Math.ceil(m / step) * step
}

function Legend({ items }: { items: { label: string; color: string; dash?: string; swatch?: "box" | "line" }[] }) {
  return (
    <div className="rpt-chart__legend">
      {items.map((i) => (
        <span key={i.label}>
          {i.swatch === "line" ? (
            <svg width="22" height="8" aria-hidden="true" style={{ marginRight: 6, verticalAlign: "middle" }}>
              <line x1="0" x2="22" y1="4" y2="4" stroke={i.color} strokeWidth="2" strokeDasharray={i.dash} />
            </svg>
          ) : (
            <i style={{ background: i.color }} />
          )}
          {i.label}
        </span>
      ))}
    </div>
  )
}

/** Chart 1: biomass gain per batch in the period, recorded against what the growth model expects. */
export function GrowthByBatchChart({ rows, cycleToDate = true }: { rows: GrowthByBatchRow[]; cycleToDate?: boolean }) {
  const data = rows.filter((r) => r.gain_recorded_kg != null || r.gain_expected_kg != null)
  if (data.length === 0) return <p className="planner-note">No growth data for this period.</p>

  const values = data.flatMap((r) => [r.gain_recorded_kg ?? 0, r.gain_expected_kg ?? 0])
  const lo = Math.min(0, ...values)
  const top = niceTop(Math.max(...values, 0))
  const bottom = lo < 0 ? -niceTop(-lo) : 0
  const plotW = W - PAD.l - PAD.r
  const plotH = H - PAD.t - PAD.b
  const group = plotW / data.length
  const bar = Math.min(26, (group * 0.78) / 2)
  const y = (v: number) => PAD.t + plotH - ((v - bottom) / (top - bottom)) * plotH
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => bottom + (top - bottom) * f)

  return (
    <figure className="rpt-chart">
      <figcaption className="rpt-chart__title">Growth per batch (kg gained {cycleToDate ? "cycle to date" : "in the selected period"})</figcaption>
      <Legend
        items={[
          { label: "Recorded biomass gain", color: RECORDED },
          { label: "Expected biomass gain (growth model)", color: EXPECTED },
        ]}
      />
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Recorded and expected biomass gain per batch" className="rpt-chart__svg">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.l} x2={W - PAD.r} y1={y(t)} y2={y(t)} stroke="#e6ddd0" />
            <text x={PAD.l - 6} y={y(t) + 4} textAnchor="end" fontSize="11" fill="#6f746f">
              {compact(t)}
            </text>
          </g>
        ))}
        {data.map((r, i) => {
          const x0 = PAD.l + i * group + (group - bar * 2) / 2
          const rec = r.gain_recorded_kg ?? 0
          const exp = r.gain_expected_kg ?? 0
          return (
            <g key={r.batch_id}>
              {[
                { v: rec, c: RECORDED, n: "Recorded" },
                { v: exp, c: EXPECTED, n: "Expected" },
              ].map((b, bi) => (
                <rect
                  key={b.n}
                  x={x0 + bi * bar}
                  y={Math.min(y(b.v), y(0))}
                  width={bar - 2}
                  height={Math.abs(y(b.v) - y(0))}
                  rx="2"
                  fill={b.c}
                >
                  <title>{`${r.batch_name} - ${b.n.toLowerCase()} gain ${Math.round(b.v).toLocaleString()} kg`}</title>
                </rect>
              ))}
              <text
                x={PAD.l + i * group + group / 2}
                y={H - PAD.b + 16}
                textAnchor="end"
                fontSize="11"
                fill="#232a25"
                transform={`rotate(-35 ${PAD.l + i * group + group / 2} ${H - PAD.b + 16})`}
              >
                {r.batch_name}
              </text>
            </g>
          )
        })}
        <text x={14} y={PAD.t + plotH / 2} textAnchor="middle" fontSize="11" fill="#6f746f" transform={`rotate(-90 14 ${PAD.t + plotH / 2})`}>
          Growth (kg)
        </text>
      </svg>
    </figure>
  )
}

/**
 * Charts 2 and 3: ABW against growth-model age. Each batch is a line through its stocking and sampling weights; the dashed
 * lines are the growth-model curves. Batches stocked at different sizes share one axis (model age = days since stocking plus
 * the model age at the stocking weight).
 */
export function AbwAgeChart({
  title,
  points,
  curves,
  batchNames,
}: {
  title: string
  points: AbwPointRow[]
  curves: GrowthCurveRow[]
  /** Batches to draw, in legend order. */
  batchNames: string[]
}) {
  const series = useMemo(
    () =>
      batchNames.map((name, i) => ({
        name,
        color: BATCH_COLORS[i % BATCH_COLORS.length],
        pts: points.filter((p) => p.batch_name === name).sort((a, b) => a.model_age_days - b.model_age_days),
      })),
    [batchNames, points],
  )
  const drawn = series.filter((s) => s.pts.length > 0)
  if (drawn.length === 0) return <p className="planner-note">No weight samples to plot for this selection.</p>

  const maxAge = Math.max(...drawn.flatMap((s) => s.pts.map((p) => p.model_age_days)))
  const minAge = Math.min(...drawn.flatMap((s) => s.pts.map((p) => p.model_age_days)))
  const xMin = Math.max(0, Math.floor((minAge - 10) / 10) * 10)
  const xMax = Math.ceil((maxAge + 15) / 10) * 10
  const curvesInRange = curves.filter((c) => c.day >= xMin && c.day <= xMax)
  const maxAbw = Math.max(...drawn.flatMap((s) => s.pts.map((p) => p.abw_g)))
  const yTop = niceTop(Math.max(maxAbw, ...curvesInRange.filter((c) => c.scenario === "slow").map((c) => c.abw_g)) * 1.05)
  const plotW = W - PAD.l - PAD.r
  const plotH = H - PAD.t - PAD.b
  const x = (d: number) => PAD.l + ((d - xMin) / Math.max(xMax - xMin, 1)) * plotW
  const y = (v: number) => PAD.t + plotH - (Math.min(v, yTop) / yTop) * plotH
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => yTop * f)
  const xTickCount = 6
  const xTicks = Array.from({ length: xTickCount + 1 }, (_, i) => Math.round(xMin + ((xMax - xMin) / xTickCount) * i))

  const scenarios = ["slow", "main", "potential"].filter((s) => curvesInRange.some((c) => c.scenario === s))

  return (
    <figure className="rpt-chart">
      <figcaption className="rpt-chart__title">{title}</figcaption>
      <Legend
        items={[
          ...drawn.map((s) => ({ label: s.name, color: s.color })),
          ...scenarios.map((s) => ({ label: CURVE_STYLE[s].label, color: CURVE_STYLE[s].color, dash: CURVE_STYLE[s].dash, swatch: "line" as const })),
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
        {scenarios.map((sc) => (
          <polyline
            key={sc}
            points={curvesInRange
              .filter((c) => c.scenario === sc)
              .map((c) => `${x(c.day)},${y(c.abw_g)}`)
              .join(" ")}
            fill="none"
            stroke={CURVE_STYLE[sc].color}
            strokeWidth="1.6"
            strokeDasharray={CURVE_STYLE[sc].dash}
          />
        ))}
        {drawn.map((s) => (
          <g key={s.name}>
            <polyline points={s.pts.map((p) => `${x(p.model_age_days)},${y(p.abw_g)}`).join(" ")} fill="none" stroke={s.color} strokeWidth="1.5" strokeOpacity="0.75" />
            {s.pts.map((p) => (
              <circle key={`${s.name}-${p.date}`} cx={x(p.model_age_days)} cy={y(p.abw_g)} r="3.2" fill={s.color}>
                <title>{`${s.name} - ${p.date}: ${p.abw_g.toFixed(1)} g at day ${p.age_days} since stocking (model age ${p.model_age_days})`}</title>
              </circle>
            ))}
          </g>
        ))}
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

/** Chart 3 wrapper: pick one batch and compare it with the model curves. */
export function SelectedBatchAbwChart({ points, curves, batchNames }: { points: AbwPointRow[]; curves: GrowthCurveRow[]; batchNames: string[] }) {
  const withPoints = batchNames.filter((n) => points.some((p) => p.batch_name === n))
  const initial = withPoints.includes("02.26b") ? "02.26b" : (withPoints[0] ?? "")
  const [batch, setBatch] = useState(initial)
  const current = withPoints.includes(batch) ? batch : initial
  if (withPoints.length === 0) return <p className="planner-note">No weight samples to plot.</p>

  return (
    <div className="grid gap-2">
      <div className="rpt-actions">
        <label className="rpt-small" htmlFor="growth-batch">
          Batch
        </label>
        <select
          id="growth-batch"
          value={current}
          onChange={(e) => setBatch(e.target.value)}
          className="h-9 rounded-full border border-[#e6ddd0] bg-[#fffdf9] px-3 text-sm font-semibold"
        >
          {withPoints.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </div>
      <AbwAgeChart title={`ABW against age - batch ${current}`} points={points} curves={curves} batchNames={[current]} />
    </div>
  )
}
