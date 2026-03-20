"use client"

import SystemHistorySheet from "@/components/systems/system-history-sheet"
import { DataErrorState } from "@/components/shared/data-states"
import { TimelineIntegrityNote } from "@/components/shared/timeline-integrity-note"
import {
  FeedExceptionsRail,
  FeedFcrSection,
  FeedKpiStrip,
  FeedMatrixSection,
  FeedRateSection,
  FeedStockCompact,
  type FeedExceptionItem,
} from "../_lib/feed-sections"

export function FeedDashboard({
  selectedFeedType,
  onSelectedFeedTypeChange,
  feedTypes,
  formatFeedTypeLabel,
  hasSystem,
  systemId,
  boundsStart,
  boundsEnd,
  errorMessage,
  onRetry,
  latestFeedDate,
  feedTodayKg,
  fedSystemsToday,
  activeSystemCount,
  minStockDays,
  overfeedingCount,
  poorAppetiteCount,
  lowGrowthCount,
  survivalRiskCount,
  worstFcr,
  loading,
  scopedSystemIdList,
  heatmapDates,
  matrixCells,
  systemNameById,
  exceptionItems,
  runningStockRows,
  feedRatePoints,
  fcrIntervals,
  selectedHistorySystemId,
  onSelectedHistorySystemIdChange,
  farmId,
  dateFrom,
  dateTo,
}: {
  selectedFeedType: string
  onSelectedFeedTypeChange: (value: string) => void
  feedTypes: Array<{ id: number | null }>
  formatFeedTypeLabel: (feedType: any) => string
  hasSystem: boolean
  systemId: number | null | undefined
  boundsStart: string | null
  boundsEnd: string | null
  errorMessage: string | null
  onRetry: () => void
  latestFeedDate: string | null
  feedTodayKg: number
  fedSystemsToday: number
  activeSystemCount: number
  minStockDays: number | null
  overfeedingCount: number
  poorAppetiteCount: number
  lowGrowthCount: number
  survivalRiskCount: number
  worstFcr: { label: string; value: number | null } | null
  loading: boolean
  scopedSystemIdList: number[]
  heatmapDates: string[]
  matrixCells: any[]
  systemNameById: Map<number, string>
  exceptionItems: FeedExceptionItem[]
  runningStockRows: any[]
  feedRatePoints: any[]
  fcrIntervals: any[]
  selectedHistorySystemId: number | null
  onSelectedHistorySystemIdChange: (value: number | null) => void
  farmId: string | null
  dateFrom: string | null
  dateTo: string | null
}) {
  return (
    <>
      <div className="flex items-center justify-between rounded-lg border border-border/80 bg-card p-4 shadow-sm">
        <h1 className="text-3xl font-bold">Feed</h1>
        <select
          value={selectedFeedType}
          onChange={(event) => onSelectedFeedTypeChange(event.target.value)}
          className="h-10 min-w-[220px] rounded-md border border-input bg-background px-3 text-sm font-medium text-foreground"
          aria-label="Filter by feed type"
        >
          <option value="all">All Feed Types</option>
          {feedTypes.map((feedType) => (
            <option key={feedType.id} value={String(feedType.id)}>
              {formatFeedTypeLabel(feedType)}
            </option>
          ))}
        </select>
      </div>

      <TimelineIntegrityNote
        systemId={hasSystem ? (systemId ?? undefined) : undefined}
        dateFrom={boundsStart ?? null}
        dateTo={boundsEnd ?? null}
      />

      {errorMessage ? (
        <DataErrorState
          title="Unable to load feed management data"
          description={errorMessage}
          onRetry={onRetry}
        />
      ) : null}

      <FeedKpiStrip
        latestFeedDate={latestFeedDate}
        feedTodayKg={feedTodayKg}
        fedSystemsToday={fedSystemsToday}
        activeSystemCount={activeSystemCount}
        minStockDays={minStockDays}
        overfeedingCount={overfeedingCount}
        poorAppetiteCount={poorAppetiteCount}
        lowGrowthCount={lowGrowthCount}
        survivalRiskCount={survivalRiskCount}
        worstFcr={worstFcr}
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.65fr)_360px]">
        <FeedMatrixSection
          loading={loading}
          systemIds={scopedSystemIdList}
          dates={heatmapDates}
          cells={matrixCells}
          systemNameById={systemNameById}
          onSystemSelect={onSelectedHistorySystemIdChange}
        />
        <div className="space-y-6">
          <FeedExceptionsRail loading={loading} items={exceptionItems} onSystemSelect={onSelectedHistorySystemIdChange} />
          <FeedStockCompact rows={runningStockRows} />
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <FeedRateSection loading={loading} points={feedRatePoints} systemNameById={systemNameById} />
        <FeedFcrSection loading={loading} intervals={fcrIntervals} systemNameById={systemNameById} />
      </div>

      <SystemHistorySheet
        open={selectedHistorySystemId !== null}
        onOpenChange={(open) => !open && onSelectedHistorySystemIdChange(null)}
        farmId={farmId}
        systemId={selectedHistorySystemId}
        systemLabel={selectedHistorySystemId != null ? (systemNameById.get(selectedHistorySystemId) ?? null) : null}
        dateFrom={dateFrom ?? undefined}
        dateTo={dateTo ?? undefined}
      />
    </>
  )
}
