"use client"

import { formatTimestamp, parameterLabels, type WqParameter } from "./water-quality-utils"
import { actionBadgeClass, ratingBadgeClass } from "./water-quality-badges"
import type { SystemRiskRow } from "./water-quality-selectors"

export function WaterQualityAlertsTab({
  criticalRiskRows,
  currentAlerts,
  emergingRisks,
  lowDoThreshold,
  highAmmoniaThreshold,
  onOpenSystemHistory,
}: {
  criticalRiskRows: SystemRiskRow[]
  currentAlerts: string[]
  emergingRisks: string[]
  lowDoThreshold: number
  highAmmoniaThreshold: number
  onOpenSystemHistory?: (systemId: number) => void
}) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px] gap-6">
        <div className="bg-card border border-border rounded-lg p-5 space-y-4">
          <div>
            <h2 className="font-semibold">System Risk Table</h2>
            <p className="text-sm text-muted-foreground">Ranked by severity and recency for the selected scope.</p>
          </div>
          <div className="overflow-x-auto rounded-md border border-border/80">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 border-b border-border">
                  <th className="px-3 py-2 text-left font-semibold">System</th>
                  <th className="px-3 py-2 text-left font-semibold">Latest rating</th>
                  <th className="px-3 py-2 text-left font-semibold">Rating date</th>
                  <th className="px-3 py-2 text-left font-semibold">Worst parameter</th>
                  <th className="px-3 py-2 text-left font-semibold">Worst value</th>
                  <th className="px-3 py-2 text-left font-semibold">Threshold</th>
                  <th className="px-3 py-2 text-left font-semibold">Last measurement</th>
                  <th className="px-3 py-2 text-left font-semibold">Trend</th>
                  <th className="px-3 py-2 text-left font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {criticalRiskRows.length ? (
                  criticalRiskRows.map((row) => (
                    <tr
                      key={`risk-${row.systemId}`}
                      className="border-b border-border hover:bg-muted/30 cursor-pointer"
                      onClick={() => onOpenSystemHistory?.(row.systemId)}
                    >
                      <td className="px-3 py-2 font-medium">{row.systemName}</td>
                      <td className="px-3 py-2">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${ratingBadgeClass(row.rating)}`}>
                          {row.rating ?? "Unknown"}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        {row.ratingDate ? formatTimestamp(`${row.ratingDate}T00:00:00`) : "--"}
                      </td>
                      <td className="px-3 py-2">
                        {row.worstParameter ? parameterLabels[row.worstParameter as WqParameter] ?? row.worstParameter : "--"}
                      </td>
                      <td className="px-3 py-2">
                        {row.worstValue != null ? `${row.worstValue.toFixed(2)}${row.worstUnit ? ` ${row.worstUnit}` : ""}` : "--"}
                      </td>
                      <td className="px-3 py-2">
                        <span className={row.thresholdBreached ? "text-destructive font-semibold" : "text-muted-foreground"}>
                          {row.thresholdBreached ? "Breached" : "OK"}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        {row.latestMeasurement ? formatTimestamp(row.latestMeasurement) : "--"}
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={`text-xs font-semibold ${
                            row.trendLabel === "Worsening"
                              ? "text-destructive"
                              : row.trendLabel === "Improving"
                                ? "text-emerald-600 dark:text-emerald-300"
                                : "text-muted-foreground"
                          }`}
                        >
                          {row.trendLabel}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${actionBadgeClass(row.action)}`}>
                          {row.action}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={9} className="px-4 py-6 text-center text-muted-foreground">
                      No critical alerts in the selected scope.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-card border border-border rounded-lg p-5">
            <h3 className="font-semibold">Current Alerts</h3>
            <p className="text-sm text-muted-foreground">Latest status and threshold conditions.</p>
            <div className="mt-3 space-y-2">
              {currentAlerts.length ? (
                currentAlerts.slice(0, 3).map((alert) => (
                  <div key={alert} className="rounded-md border border-border/80 bg-muted/20 p-3 text-sm">
                    {alert}
                  </div>
                ))
              ) : (
                <div className="rounded-md border border-border bg-muted/30 p-3 text-sm text-muted-foreground">
                  No active alerts in the current scope.
                </div>
              )}
              {currentAlerts.length > 3 ? (
                <p className="text-xs text-muted-foreground">See details below.</p>
              ) : null}
            </div>
          </div>
          <div className="bg-card border border-border rounded-lg p-5">
            <h3 className="font-semibold">Threshold Snapshot</h3>
            <p className="text-sm text-muted-foreground">Managed in farm settings.</p>
            <div className="mt-3 space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Low DO</span>
                <span className="font-semibold">{lowDoThreshold.toFixed(2)} mg/L</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">High ammonia</span>
                <span className="font-semibold">{highAmmoniaThreshold.toFixed(2)} mg/L</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-foreground">Alerts</h2>
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="bg-card border border-border rounded-lg p-5 space-y-3">
            <h3 className="font-semibold">Alert Intelligence</h3>
            <p className="text-sm text-muted-foreground">Current conditions that require attention.</p>
            {currentAlerts.length ? (
              <div className="space-y-2">
                {currentAlerts.map((alert) => (
                  <div key={alert} className="rounded-md border border-border/80 bg-muted/20 p-3 text-sm">
                    {alert}
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-md border border-border bg-muted/30 p-3 text-sm text-muted-foreground">
                No current alerts in the selected scope.
              </div>
            )}
          </div>

          <div className="bg-card border border-border rounded-lg p-5 space-y-3">
            <h3 className="font-semibold">Emerging Risks</h3>
            <p className="text-sm text-muted-foreground">Trend-based signals and volatility checks.</p>
            {emergingRisks.length ? (
              <div className="space-y-2">
                {emergingRisks.map((alert) => (
                  <div key={alert} className="rounded-md border border-orange-300/50 bg-orange-500/10 text-orange-700 dark:text-orange-300 p-3 text-sm">
                    {alert}
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-md border border-border bg-muted/30 p-3 text-sm text-muted-foreground">
                No emerging risks detected in the last two weeks.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
