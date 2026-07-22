"use client"

import type { ColumnDef } from "@tanstack/react-table"
import type { ProductionPeriodViewRow } from "@/features/production/period-view"
import { formatDateOnly, formatNumberValue } from "@/lib/analytics-format"

/**
 * Declarative columns for the production records table (design guide):
 * date left-aligned, numeric columns right-aligned, a space before units,
 * biomass increase in success green, mortality rate as 2-decimal percent.
 */
const NoValue = () => <span className="text-muted-foreground">No data</span>

const isFiniteNumber = (value: number | null | undefined): value is number =>
  typeof value === "number" && Number.isFinite(value)

function numberCell(
  value: number | null | undefined,
  decimals: number,
  unit?: string,
  className?: string,
) {
  if (!isFiniteNumber(value)) return <NoValue />
  const formatted = formatNumberValue(value, { decimals, minimumDecimals: decimals })
  return <span className={className}>{unit ? `${formatted} ${unit}` : formatted}</span>
}

export const productionTableColumns: Array<ColumnDef<ProductionPeriodViewRow, unknown>> = [
  {
    id: "date",
    header: "Date",
    accessorFn: (row) => row.date,
    sortDescFirst: true,
    meta: { width: "110px" },
    cell: ({ row }) => (
      <span className="py-1 text-left text-muted-foreground">{formatDateOnly(row.original.date)}</span>
    ),
  },
  {
    id: "system",
    header: "System",
    accessorFn: (row) => row.systemName ?? "",
    sortDescFirst: false,
    meta: { width: "110px" },
    cell: ({ row }) =>
      row.original.systemName ? (
        <span className="font-semibold text-foreground">{row.original.systemName}</span>
      ) : (
        <NoValue />
      ),
  },
  {
    id: "numberOfFish",
    header: "Number of fish",
    accessorFn: (row) => row.numberOfFish ?? undefined,
    sortUndefined: "last",
    sortDescFirst: true,
    meta: { width: "120px", align: "right" },
    cell: ({ row }) =>
      isFiniteNumber(row.original.numberOfFish) ? (
        <>{formatNumberValue(row.original.numberOfFish)}</>
      ) : (
        <NoValue />
      ),
  },
  {
    id: "biomassKg",
    header: "Total weight",
    accessorFn: (row) => row.biomassKg ?? undefined,
    sortUndefined: "last",
    sortDescFirst: true,
    meta: { width: "110px", align: "right" },
    cell: ({ row }) => numberCell(row.original.biomassKg, 1, "kg"),
  },
  {
    id: "abwG",
    header: "ABW",
    accessorFn: (row) => row.abwG ?? undefined,
    sortUndefined: "last",
    sortDescFirst: true,
    meta: { width: "90px", align: "right" },
    cell: ({ row }) => numberCell(row.original.abwG, 0, "g"),
  },
  {
    id: "growthKg",
    header: "Biomass increase",
    accessorFn: (row) => row.growthKg ?? undefined,
    sortUndefined: "last",
    sortDescFirst: true,
    meta: { width: "130px", align: "right" },
    cell: ({ row }) => numberCell(row.original.growthKg, 2, "kg", "text-success"),
  },
  {
    id: "feedPeriodKg",
    header: "Feed amount",
    accessorFn: (row) => row.feedPeriodKg ?? undefined,
    sortUndefined: "last",
    sortDescFirst: true,
    meta: { width: "110px", align: "right" },
    cell: ({ row }) => numberCell(row.original.feedPeriodKg, 1, "kg"),
  },
  {
    id: "periodEfcr",
    header: "eFCR",
    accessorFn: (row) => row.periodEfcr ?? undefined,
    sortUndefined: "last",
    sortDescFirst: true,
    meta: { width: "110px", align: "right" },
    cell: ({ row }) => numberCell(row.original.periodEfcr, 2),
  },
  {
    id: "mortalityRatePct",
    header: "Mortality",
    accessorFn: (row) => row.mortalityRatePct ?? undefined,
    sortUndefined: "last",
    sortDescFirst: true,
    meta: { width: "130px", align: "right" },
    cell: ({ row }) => numberCell(row.original.mortalityRatePct, 2, "%"),
  },
]
