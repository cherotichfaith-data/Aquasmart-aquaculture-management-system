"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/app-ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/app-ui/table"
import { DataErrorState, DataFetchingBadge, DataUpdatedAt, EmptyState } from "@/components/shared/data-states"
import type { ProductionPeriodViewRow } from "@/app/dashboard/production/_lib/production-page"
import { formatDateOnly, formatNumberValue } from "@/lib/analytics-format"

export default function ProductionTable({
  rows,
  title = "Production Summary (period-based)",
  isLoading,
  isFetching,
  updatedAt,
  error,
  onRetry,
  showHeader = true,
  standalone = false,
}: {
  rows: ProductionPeriodViewRow[]
  title?: string
  isLoading: boolean
  isFetching: boolean
  updatedAt?: number | null
  error?: string | null
  onRetry?: () => void
  showHeader?: boolean
  standalone?: boolean
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

  const content = (
    <CardContent className={showHeader ? "pt-2" : "pt-4"}>
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
                  <TableHead className="text-xs uppercase tracking-wide text-right">SGR (%/day)</TableHead>
                  <TableHead className="text-xs uppercase tracking-wide text-right">Fish</TableHead>
                  <TableHead className="text-xs uppercase tracking-wide text-right">Biomass (kg)</TableHead>
                  <TableHead className="text-xs uppercase tracking-wide text-right">ABW (g)</TableHead>
                  <TableHead className="text-xs uppercase tracking-wide text-right">Biomass Gain (kg)</TableHead>
                  <TableHead className="text-xs uppercase tracking-wide text-right">Feed (kg)</TableHead>
                  <TableHead className="text-xs uppercase tracking-wide text-right">eFCR</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row, index) => (
                  <TableRow key={`${row.date}-${index}`}>
                    <TableCell className="font-medium">{formatDateOnly(row.date, row.date)}</TableCell>
                    <TableCell className="max-w-[280px] truncate align-top">{row.systemName ?? "--"}</TableCell>
                    <TableCell className="text-right">{formatNumberValue(row.sgr, { decimals: 2 })}</TableCell>
                    <TableCell className="text-right">{formatNumberValue(row.numberOfFish)}</TableCell>
                    <TableCell className="text-right">{formatNumberValue(row.biomassKg, { decimals: 1 })}</TableCell>
                    <TableCell className="text-right">{formatNumberValue(row.abwG, { decimals: 1 })}</TableCell>
                    <TableCell className="text-right">{formatNumberValue(row.growthKg, { decimals: 2 })}</TableCell>
                    <TableCell className="text-right">{formatNumberValue(row.feedPeriodKg, { decimals: 1 })}</TableCell>
                    <TableCell className="text-right">{formatNumberValue(row.periodEfcr, { decimals: 2 })}</TableCell>
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
  )

  if (standalone) {
    return content
  }

  return (
    <Card>
      {showHeader ? (
        <CardHeader className="pb-1">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle>{title}</CardTitle>
            <DataFetchingBadge isFetching={isFetching} isLoading={isLoading} />
          </div>
          <DataUpdatedAt updatedAt={updatedAt} />
        </CardHeader>
      ) : null}
      {content}
    </Card>
  )
}

