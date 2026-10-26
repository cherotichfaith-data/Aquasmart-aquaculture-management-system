"use client"

import type { StockProfileRow } from "@/features/analytics/types"

const W = 900
const H = 300
const PAD = { l: 56, r: 14, t: 14, b: 54 }
const BAR_COLOR = "var(--sidebar, #0f4c81)"
const AREA_COLOR = "#e0a526"

function compact(v: number) {
  if (v >= 1_000_000) return `${Math.round(v / 100_000) / 10}M`.replace(".0M", "M")
  if (v >= 1000) return `${Math.round(v / 100) / 10}k`.replace(".0k", "k")
  return String(Math.round(v))
}

function gram(v: number) {
  return v >= 100 ? String(Math.round(v)) : String(Math.round(v * 10) / 10)
}

export function classLabel(row: StockProfileRow) {
  if (row.abw_to_g == null) return `${gram(row.abw_from_g)}+`
  return `${gram(row.abw_from_g)}-${gram(row.abw_to_g)}`
}

/**
 * Combo chart of the stock profile: the "ideal" fish per weight class as an area, the fish actually in cages
 * as bars. X axis = weight class (g), Y axis = number of fish.
 */
export default function StockProfileChart({ rows }: { rows: StockProfileRow[] }) {
  if (rows.length === 0) return <p className="planner-note">No stock profile available for this date.</p>

  const max = Math.max(1, ...rows.flatMap((r) => [r.ideal_fish, r.recorded_fish]))
  const step = Math.pow(10, Math.floor(Math.log10(max)))
  const top = Math.ceil(max / step) * step
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => top * f)
  const plotW = W - PAD.l - PAD.r
  const plotH = H - PAD.t - PAD.b
  const group = plotW / rows.length
  const bar = Math.min(46, group * 0.6)
  const y = (v: number) => PAD.t + plotH - (v / top) * plotH
  const cx = (i: number) => PAD.l + i * group + group / 2

  const line = rows.map((r, i) => `${cx(i)},${y(r.ideal_fish)}`)
  const areaPath = `M${cx(0)},${y(0)} L${line.join(" L")} L${cx(rows.length - 1)},${y(0)} Z`

  return (
    <figure className="rpt-chart">
      <figcaption className="rpt-chart__title">Number of fish per weight class</figcaption>
      <div className="rpt-chart__legend">
        <span>
          <i style={{ background: AREA_COLOR, opacity: 0.6 }} />
          Ideal number of fish
        </span>
        <span>
          <i style={{ background: BAR_COLOR }} />
          Recorded number of fish
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Ideal and recorded number of fish per weight class" className="rpt-chart__svg">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.l} x2={W - PAD.r} y1={y(t)} y2={y(t)} stroke="#e6ddd0" />
            <text x={PAD.l - 6} y={y(t) + 4} textAnchor="end" fontSize="11" fill="#6f746f">
              {compact(t)}
            </text>
          </g>
        ))}
        <path d={areaPath} fill={AREA_COLOR} fillOpacity="0.35" />
        <polyline points={line.join(" ")} fill="none" stroke={AREA_COLOR} strokeWidth="2" />
        {rows.map((r, i) => (
          <g key={r.class_no}>
            <rect x={cx(i) - bar / 2} y={y(r.recorded_fish)} width={bar} height={PAD.t + plotH - y(r.recorded_fish)} rx="2" fill={BAR_COLOR}>
              <title>{`${classLabel(r)} g - recorded ${Math.round(r.recorded_fish).toLocaleString()} fish in ${r.recorded_cages} cage(s); ideal ${Math.round(r.ideal_fish).toLocaleString()}`}</title>
            </rect>
            <text x={cx(i)} y={H - PAD.b + 16} textAnchor="middle" fontSize="11" fill="#232a25">
              {classLabel(r)}
            </text>
          </g>
        ))}
        <text x={PAD.l + plotW / 2} y={H - 8} textAnchor="middle" fontSize="11" fill="#6f746f">
          Weight class (g)
        </text>
      </svg>
    </figure>
  )
}
