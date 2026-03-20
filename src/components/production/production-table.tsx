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
      <CardHeader className="border-b border-border">
        <div className="flex items-center justify-between">
          <CardTitle>Production Detail</CardTitle>
          <DataFetchingBadge isFetching={isFetching} isLoading={isLoading} />
        </div>
        <DataUpdatedAt updatedAt={updatedAt} />
      </CardHeader>
      <CardContent className="pt-4">
        {isLoading ? (
          <div className="h-[240px] flex items-center justify-center text-muted-foreground">
            Loading table...
          </div>
        ) : rows.length ? (
          <div className="max-h-[480px] overflow-auto rounded-md border border-border/80">
            <Table>
              <TableHeader className="bg-muted/60">
                <TableRow>
                  <TableHead className="text-xs uppercase tracking-wide">Date</TableHead>
                  <TableHead className="text-xs uppercase tracking-wide">System</TableHead>
                  <TableHead className="text-xs uppercase tracking-wide text-right">Fish</TableHead>
                  <TableHead className="text-xs uppercase tracking-wide text-right">Biomass</TableHead>
                  <TableHead className="text-xs uppercase tracking-wide text-right">ABW</TableHead>
                  <TableHead className="text-xs uppercase tracking-wide text-right">Biomass +</TableHead>
                  <TableHead className="text-xs uppercase tracking-wide text-right">Feed</TableHead>
                  <TableHead className="text-xs uppercase tracking-wide text-right">eFCR</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={`${row.system_id ?? "system"}-${row.date ?? ""}`}>
                    <TableCell className="font-medium">{row.date ?? "--"}</TableCell>
                    <TableCell>{row.system_name ?? row.system_id ?? "--"}</TableCell>
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
            description="No `api_production_summary` rows matched the selected filters. Systems without a trustworthy production timeline are left empty instead of being assigned fake cycle dates."
          />
        )}
      </CardContent>
    </Card>
  )
}
