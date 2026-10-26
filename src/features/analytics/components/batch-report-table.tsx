"use client"

import type { BatchReportRow } from "@/features/analytics/types"
import { ReportTable, dateText, num, pct, type Column } from "./report-table"

const BATCH_COLUMNS: Column<BatchReportRow>[] = [
  { label: "Batch ID", cell: (r) => r.batch_name },
  { label: "Date in", cell: (r) => dateText(r.date_in) },
  { label: "Age (days)", cell: (r) => num(r.age_days), numeric: true },
  { label: "Stock end no.", cell: (r) => num(r.stock_end), numeric: true },
  { label: "ABW (g)", cell: (r) => num(r.abw_g, 1), numeric: true },
  { label: "Harvest number", cell: (r) => num(r.harvest_number), numeric: true },
  { label: "Harvest weight (kg)", cell: (r) => num(r.harvest_kg, 1), numeric: true },
  { label: "Harvest ABW (g)", cell: (r) => num(r.harvest_abw_g, 1), numeric: true },
  { label: "Biomass (kg)", cell: (r) => num(r.biomass_kg, 1), numeric: true },
  { label: "Cage corrections (no.)", cell: (r) => num(r.cage_corrections), numeric: true },
  { label: "Mortality (no.)", cell: (r) => num(r.mortality), numeric: true },
  { label: "Stock loss (%)", cell: (r) => pct(r.stock_loss_pct, 2), numeric: true },
  { label: "Growth (kg)", cell: (r) => num(r.growth_kg, 1), numeric: true },
  { label: "Feed used (kg)", cell: (r) => num(r.feed_kg, 1), numeric: true },
  { label: "eFCR", cell: (r) => num(r.efcr, 2), numeric: true },
  { label: "Acc. eFCR", cell: (r) => num(r.acc_efcr, 2), numeric: true },
]

/** The Detailed Batch Report table (last row = total of the rows shown). Shared by /analytics and /reports. */
export default function BatchReportTable({ rows }: { rows: BatchReportRow[] }) {
  return (
    <ReportTable
      columns={BATCH_COLUMNS}
      rows={rows}
      rowKey={(r, i) => `${r.batch_id ?? "total"}-${i}`}
      emptyText="No active batches for this period."
      hasTotalRow={rows.at(-1)?.batch_name === "Total"}
    />
  )
}
