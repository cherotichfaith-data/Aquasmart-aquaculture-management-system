import type { Tables } from "@/lib/types/database"
import type { ProductionTrendRpcRow } from "@/features/dashboard/types"
import type { FeedingRecordWithType } from "@/lib/api/reports"
import type { TimePeriod } from "@/lib/time-period"
import type { EfcrTrendPoint, FeedRatePoint } from "../_lib/feed-analytics"
import { FeedCoreSection, FeedDashboardError } from "./feed-dashboard-sections"

export function FeedDashboard({
  errorMessage,
  onRetry,
  loading,
  systemNameById,
  feedRatePoints,
  efcrTrendPoints,
  productionRows,
  mortalityRows,
}: {
  timePeriod: TimePeriod
  errorMessage: string | null
  onRetry: () => void
  loading: boolean
  systemNameById: Map<number, string>
  feedingRecords: FeedingRecordWithType[]
  feedRatePoints: FeedRatePoint[]
  efcrTrendPoints: EfcrTrendPoint[]
  productionRows: ProductionTrendRpcRow[]
  mortalityRows: Tables<"fish_mortality">[]
}) {
  return (
    <>
      {errorMessage ? <FeedDashboardError errorMessage={errorMessage} onRetry={onRetry} /> : null}
      <FeedCoreSection
        loading={loading}
        feedRatePoints={feedRatePoints}
        efcrTrendPoints={efcrTrendPoints}
        productionRows={productionRows}
        mortalityRows={mortalityRows}
        systemNameById={systemNameById}
      />
    </>
  )
}
