"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DataErrorState, DataFetchingBadge, DataUpdatedAt, EmptyState } from "@/components/shared/data-states"
import { formatNumberValue } from "@/lib/analytics-format"
import type { Database } from "@/lib/types/database"

type ProductionSummaryRow = Database["public"]["Functions"]["api_production_summary"]["Returns"][number]

export default function ProductionTable({
  rows,
  isLoading,
  isFetching,
  updatedAt,
  error,
  onRetry,
}: {
  rows: ProductionSummaryRow[]
  isLoading: boolean
  isFetching: boolean
  updatedAt?: number | null
  error?: string | null
  onRetry?: () => void
}) {
  if (error) {
    return (
      <DataErrorState
        title="Unable to load production table"
        description={error}
        onRetry={onRetry}
      />
    )
  }

  return (
    <Card>
      <CardHeader className="pb-1">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle>Production Detail</CardTitle>
          <DataFetchingBadge isFetching={isFetching} isLoading={isLoading} />
        </div>
        <DataUpdatedAt updatedAt={updatedAt} />
      </CardHeader>
      <CardContent className="pt-2">
        {isLoading ? (
          <div className="h-[240px] flex items-center justify-center text-muted-foreground">
            Loading table...
          </div>
        ) : rows.length ? (
          <div className="soft-table-shell max-h-[480px]">
            <Table>
              <TableHeader className="bg-muted/60">
                <TableRow>
                  <TableHead className="text-xs uppercase tracking-wide">Date</TableHead>
                  <TableHead className="text-xs uppercase tracking-wide">System</TableHead>
                  <TableHead className="text-xs uppercase tracking-wide">Activity</TableHead>
                  <TableHead className="text-xs uppercase tracking-wide text-right">Fish</TableHead>
                  <TableHead className="text-xs uppercase tracking-wide text-right">Biomass (kg)</TableHead>
                  <TableHead className="text-xs uppercase tracking-wide text-right">ABW (g)</TableHead>
                  <TableHead className="text-xs uppercase tracking-wide text-right">Biomass Gain (kg)</TableHead>
                  <TableHead className="text-xs uppercase tracking-wide text-right">Feed (kg)</TableHead>
                  <TableHead className="text-xs uppercase tracking-wide text-right">eFCR</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={`${row.system_id ?? "system"}-${row.date ?? ""}-${row.activity ?? "activity"}-${row.activity_rank ?? "rank"}`}>
                    <TableCell className="font-medium">{row.date ?? "--"}</TableCell>
                    <TableCell>{row.system_name ?? row.system_id ?? "--"}</TableCell>
                    <TableCell>{row.activity ?? "--"}</TableCell>
                    <TableCell className="text-right">{formatNumberValue(row.number_of_fish_inventory)}</TableCell>
                    <TableCell className="text-right">{formatNumberValue(row.total_biomass, { decimals: 1 })} kg</TableCell>
                    <TableCell className="text-right">{formatNumberValue(row.average_body_weight, { decimals: 1 })} g</TableCell>
                    <TableCell className="text-right">{formatNumberValue(row.biomass_increase_period, { decimals: 2 })} kg</TableCell>
                    <TableCell className="text-right">{formatNumberValue(row.total_feed_amount_period, { decimals: 1 })} kg</TableCell>
                    <TableCell className="text-right">{formatNumberValue(row.efcr_period, { decimals: 2 })}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <EmptyState
            title="No production records"
            description="No production records matched the selected filters. Systems need at least one stocking event with a completed production cycle to appear here."
          />
        )}
      </CardContent>
    </Card>
  )
}
