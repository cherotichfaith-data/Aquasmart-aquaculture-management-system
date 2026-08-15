"use client"

import { useMemo } from "react"
import { useRouter } from "next/navigation"
import type { ColumnDef } from "@tanstack/react-table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/app-ui/card"
import { DataTable } from "@/components/shared/data-table"
import type { DashboardSystemRow } from "@/features/dashboard/types"
import { SeverityValue, buildSystemFlags, isFiniteNumber, isMortalityCritical, median } from "@/features/dashboard/lib/table-cells"
import { formatNumberValue, formatUnitValue } from "@/lib/analytics-format"
import { formatCageLabel } from "@/lib/system-options"
import type { RecommendedActionRow } from "@/lib/types/insights"
import type { CageMortalityTotal } from "@/features/systems/types"

type CageStatus = "Optimal" | "Good" | "Monitor" | "Critical"

const STATUS_STYLES: Record<CageStatus, string> = {
  Optimal: "bg-success/15 text-success",
  Good: "bg-muted text-muted-foreground",
  Monitor: "bg-warning/15 text-warning",
  Critical: "bg-destructive/15 text-destructive",
}

const STATUS_ICON: Record<CageStatus, string> = {
  Optimal: "⭐",
  Good: "✓",
  Monitor: "→",
  Critical: "⚠",
}

/**
 * Real-data status rules (no arbitrary scoring): Critical = an actual
 * water-quality breach / eFCR outlier flag, or a rising mortality rate.
 * Monitor = an open recommended action for the cage, or a stale sample.
 * Optimal = clean and beating the farm's median eFCR. Good = clean, everything else.
 */
function deriveStatus(params: {
  row: DashboardSystemRow
  farmMedianEfcr: number | null
  hasOpenAlert: boolean
}): CageStatus {
  const { row, farmMedianEfcr, hasOpenAlert } = params
  const flags = buildSystemFlags(row, farmMedianEfcr)

  if (flags.length > 0 || isMortalityCritical(row)) return "Critical"
  if (hasOpenAlert || (row.sample_age_days ?? 0) > 30) return "Monitor"
  if (isFiniteNumber(row.efcr) && isFiniteNumber(farmMedianEfcr) && farmMedianEfcr > 0 && row.efcr <= farmMedianEfcr) {
    return "Optimal"
  }
  return "Good"
}

export default function CageStatusTable({
  rows,
  cohortBySystemId,
  mortalityByCage,
  alerts,
  emptyMessage = "No active cages found",
}: {
  rows: DashboardSystemRow[]
  cohortBySystemId: Record<number, string | null>
  mortalityByCage: CageMortalityTotal[]
  alerts: RecommendedActionRow[]
  emptyMessage?: string
}) {
  const router = useRouter()
  const farmMedianEfcr = useMemo(() => median(rows.map((row) => row.efcr).filter(isFiniteNumber)), [rows])
  const alertSystemIds = useMemo(() => new Set(alerts.map((row) => row.system_id)), [alerts])
  const mortalityBySystemId = useMemo(
    () => new Map(mortalityByCage.map((row) => [row.system_id, row.total])),
    [mortalityByCage],
  )

  const columns = useMemo<Array<ColumnDef<DashboardSystemRow, unknown>>>(
    () => [
      {
        id: "cage",
        header: "Cage",
        accessorFn: (row) => formatCageLabel({ id: row.system_id, label: row.system_name, unit: null }).toLowerCase(),
        sortDescFirst: false,
        meta: { width: "170px" },
        cell: ({ row }) => (
          <span className="text-sm font-semibold text-foreground">
            {formatCageLabel({ id: row.original.system_id, label: row.original.system_name, unit: null })}
          </span>
        ),
      },
      {
        id: "cohort",
        header: "Cohort",
        accessorFn: (row) => cohortBySystemId[row.system_id] ?? "",
        meta: { width: "160px" },
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">{cohortBySystemId[row.original.system_id] ?? "--"}</span>
        ),
      },
      {
        id: "fish_count",
        header: "Live Count",
        accessorFn: (row) => row.fish_end ?? undefined,
        sortUndefined: "last",
        sortDescFirst: true,
        meta: { width: "110px" },
        cell: ({ row }) => <span className="text-sm">{formatNumberValue(row.original.fish_end)}</span>,
      },
      {
        id: "abw",
        header: "ABW",
        accessorFn: (row) => row.abw ?? undefined,
        sortUndefined: "last",
        sortDescFirst: true,
        meta: { width: "100px" },
        cell: ({ row }) => <span className="text-sm">{formatUnitValue(row.original.abw, 1, "g")}</span>,
      },
      {
        id: "biomass",
        header: "Biomass",
        accessorFn: (row) => row.biomass_end ?? undefined,
        sortUndefined: "last",
        sortDescFirst: true,
        meta: { width: "110px" },
        cell: ({ row }) => <span className="text-sm">{formatUnitValue(row.original.biomass_end, 0, "kg")}</span>,
      },
      {
        id: "mortality",
        header: "Mortality",
        accessorFn: (row) => mortalityBySystemId.get(row.system_id) ?? 0,
        sortDescFirst: true,
        meta: { width: "110px" },
        cell: ({ row }) => (
          <span className="text-sm">
            <SeverityValue
              value={formatNumberValue(mortalityBySystemId.get(row.original.system_id) ?? 0)}
              active={isMortalityCritical(row.original)}
            />
          </span>
        ),
      },
      {
        id: "status",
        header: "Status",
        accessorFn: (row) => deriveStatus({ row, farmMedianEfcr, hasOpenAlert: alertSystemIds.has(row.system_id) }),
        meta: { width: "130px" },
        cell: ({ row }) => {
          const status = deriveStatus({
            row: row.original,
            farmMedianEfcr,
            hasOpenAlert: alertSystemIds.has(row.original.system_id),
          })
          return (
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLES[status]}`}
            >
              <span aria-hidden>{STATUS_ICON[status]}</span> {status}
            </span>
          )
        },
      },
    ],
    [alertSystemIds, cohortBySystemId, farmMedianEfcr, mortalityBySystemId],
  )

  return (
    <Card className="rounded-2xl">
      <CardHeader className="pb-1">
        <CardTitle>Cage Status — Latest Data</CardTitle>
      </CardHeader>
      <CardContent className="pt-2">
        <DataTable<DashboardSystemRow>
          columns={columns}
          data={rows}
          rowKey={(row) => row.system_id}
          onRowClick={(row) => router.push(`/production?system=${row.system_id}`)}
          emptyMessage={emptyMessage}
          initialSorting={[{ id: "cage", desc: false }]}
          shellClassName="production-records-table max-h-[520px]"
          tableClassName="min-w-[860px] table-fixed"
          headerVariant="plain"
        />
      </CardContent>
    </Card>
  )
}
