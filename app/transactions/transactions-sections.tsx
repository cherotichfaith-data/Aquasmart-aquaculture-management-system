"use client"

import { EVENT_LABEL, formatTime, getColor, getIcon, type ActivityType, type ConsolidatedActivity, type OperatorSummary } from "./transactions-utils"

type SummaryProps = {
  summary: {
    totalActivities: number
    feedPurchasedKg: number
    mortalityIncidents: number
    samplingCount: number
  }
  setSelectedEventType: (type: ActivityType) => void
}

export function TransactionsSummaryCards({ summary, setSelectedEventType }: SummaryProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <button type="button" className="bg-card border border-border rounded-lg p-4 text-left" onClick={() => setSelectedEventType("all")}>
        <p className="text-sm text-muted-foreground">Total Activities</p>
        <p className="text-2xl font-bold mt-1">{summary.totalActivities}</p>
      </button>
      <button type="button" className="bg-card border border-border rounded-lg p-4 text-left" onClick={() => setSelectedEventType("feed_incoming")}>
        <p className="text-sm text-muted-foreground">Feed Purchased (kg)</p>
        <p className="text-2xl font-bold mt-1">{summary.feedPurchasedKg.toFixed(1)}</p>
      </button>
      <button type="button" className="bg-card border border-border rounded-lg p-4 text-left" onClick={() => setSelectedEventType("fish_mortality")}>
        <p className="text-sm text-muted-foreground">Mortality Incidents</p>
        <p className="text-2xl font-bold mt-1">{summary.mortalityIncidents}</p>
      </button>
      <button type="button" className="bg-card border border-border rounded-lg p-4 text-left" onClick={() => setSelectedEventType("fish_sampling_weight")}>
        <p className="text-sm text-muted-foreground">Sampling Count</p>
        <p className="text-2xl font-bold mt-1">{summary.samplingCount}</p>
      </button>
    </div>
  )
}

type ActivityFeedProps = {
  loading: boolean
  filteredActivities: ConsolidatedActivity[]
  systemLabelById: Map<number, string>
}

export function ConsolidatedActivityFeedTable({ loading, filteredActivities, systemLabelById }: ActivityFeedProps) {
  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="px-6 py-4 border-b border-border">
        <h2 className="font-semibold">Consolidated Activity Feed</h2>
        <p className="text-sm text-muted-foreground">Single timeline view across feeding, mortality, sampling, transfers, stocking, and harvest activity.</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-muted/50 border-b border-border">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold">Type</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">System</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Operator</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Details</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Time</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">Loading activities...</td>
              </tr>
            ) : filteredActivities.length > 0 ? (
              filteredActivities.map((activity) => {
                const systemLabel = activity.systemIds.length
                  ? activity.systemIds.map((id) => systemLabelById.get(id) ?? `System ${id}`).join(" -> ")
                  : "Farm level"

                return (
                  <tr key={activity.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg w-fit ${getColor(activity.normalizedType)}`}>{getIcon(activity.normalizedType)}</div>
                        <span className="text-sm font-medium">{EVENT_LABEL[activity.normalizedType]}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm">{systemLabel}</td>
                    <td className="px-6 py-4 text-sm">{activity.operatorLabel}</td>
                    <td className="px-6 py-4 text-sm">{activity.details}</td>
                    <td className="px-6 py-4 text-sm">{formatTime(activity.changeTime)}</td>
                  </tr>
                )
              })
            ) : (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">No activities found for selected filters.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

type OperatorTableProps = {
  operatorSummaries: OperatorSummary[]
  onExport: () => void
}

export function OperatorActivityTable({ operatorSummaries, onExport }: OperatorTableProps) {
  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="px-6 py-4 border-b border-border flex items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold">Operator Activity Tracking</h2>
          <p className="text-sm text-muted-foreground">Transactions linked to operator IDs with downloadable report.</p>
        </div>
        <button type="button" className="px-3 py-2 rounded-md border border-border text-sm hover:bg-muted/40" onClick={onExport}>
          Export Operator Report
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-muted/50 border-b border-border">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold">Operator</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Total</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Feed</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Mortality</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Sampling</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {operatorSummaries.length > 0 ? (
              operatorSummaries.map((row) => (
                <tr key={row.operatorId} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 text-sm">{row.operatorLabel}</td>
                  <td className="px-4 py-3 text-sm">{row.total}</td>
                  <td className="px-4 py-3 text-sm">{row.feeds}</td>
                  <td className="px-4 py-3 text-sm">{row.mortalities}</td>
                  <td className="px-4 py-3 text-sm">{row.samplings}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-sm text-center text-muted-foreground">No operator activity for current filters.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

type SystemActivityRow = {
  systemId: number
  systemName: string
  activities: number
  operators: number
  turnoverFlag: boolean
  mortalityRate: number | null
  efcr: number | null
}

type SystemTableProps = {
  systemActivityRows: SystemActivityRow[]
}

export function SystemPerformanceByActivityTable({ systemActivityRows }: SystemTableProps) {
  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="px-6 py-4 border-b border-border">
        <h2 className="font-semibold">System Performance by Activity</h2>
        <p className="text-sm text-muted-foreground">Correlates activity volume with mortality/eFCR and flags high operator turnover.</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-muted/50 border-b border-border">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold">System</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Activities</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Operators</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Mortality</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">eFCR</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {systemActivityRows.length > 0 ? (
              systemActivityRows.map((row) => (
                <tr key={row.systemId} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 text-sm">
                    <p className="font-medium">{row.systemName}</p>
                    <p className="text-xs text-muted-foreground">{row.turnoverFlag ? "High operator turnover" : "Stable operator assignment"}</p>
                  </td>
                  <td className="px-4 py-3 text-sm">{row.activities}</td>
                  <td className="px-4 py-3 text-sm">{row.operators}</td>
                  <td className="px-4 py-3 text-sm">{row.mortalityRate ?? "-"}</td>
                  <td className="px-4 py-3 text-sm">{row.efcr ?? "-"}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-sm text-center text-muted-foreground">No system KPI/activity overlap for current filters.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
