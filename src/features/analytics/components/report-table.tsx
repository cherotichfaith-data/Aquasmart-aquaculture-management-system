"use client"

export const DASH = "-"

export function num(v: number | null | undefined, digits = 0) {
  if (v == null || !Number.isFinite(v)) return DASH
  return v.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits })
}

export function pct(v: number | null | undefined, digits = 1) {
  const text = num(v, digits)
  return text === DASH ? DASH : `${text}%`
}

export function dateText(v: string | null | undefined) {
  if (!v) return DASH
  const d = new Date(`${v}T00:00:00Z`)
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" })
}

export type Column<T> = { label: string; cell: (row: T) => string; numeric?: boolean }

export function ReportTable<T>({
  columns,
  rows,
  rowKey,
  emptyText,
  hasTotalRow = false,
}: {
  columns: Column<T>[]
  rows: T[]
  rowKey: (row: T, index: number) => string
  emptyText: string
  hasTotalRow?: boolean
}) {
  if (rows.length === 0) return <p className="planner-note">{emptyText}</p>
  return (
    <div className="plan-scroll">
      <table className="plan-table">
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.label}>{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={rowKey(row, i)} className={hasTotalRow && i === rows.length - 1 ? "rpt-total" : undefined}>
              {columns.map((c, ci) => (
                <td key={c.label} className={ci > 0 && c.numeric ? "n" : undefined}>
                  {c.cell(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
