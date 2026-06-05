"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/app-ui/card"
import { formatTimestamp, parameterLabels, type WqParameter } from "../_lib/water-quality-utils"
import { actionBadgeClass, ratingBadgeClass } from "../_lib/water-quality-badges"
import type { SystemRiskRow } from "../_lib/water-quality-selectors"

export function WaterQualityAlertsTab({
  alertRows,
  currentAlerts,
}: {
  alertRows: SystemRiskRow[]
  currentAlerts: string[]
}) {
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <Card className="border border-border bg-card">
        <CardHeader className="border-b border-border/70 pb-4">
          <CardTitle className="text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Alerts
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="border-b border-border/70 text-xs uppercase tracking-[0.12em] text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">System</th>
                <th className="px-4 py-3 text-left font-semibold">Latest rating</th>
                <th className="px-4 py-3 text-left font-semibold">Rating date</th>
                <th className="px-4 py-3 text-left font-semibold">Worst parameter</th>
                <th className="px-4 py-3 text-left font-semibold">Worst value</th>
                <th className="px-4 py-3 text-left font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {alertRows.length ? (
                alertRows.map((row) => (
                  <tr key={`risk-${row.systemId}`}>
                    <td className="px-4 py-3 font-medium">{row.systemName}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${ratingBadgeClass(row.rating)}`}>
                        {row.rating ?? "Unknown"}
                      </span>
                    </td>
                    <td className="px-4 py-3">{row.ratingDate ? formatTimestamp(`${row.ratingDate}T00:00:00`) : "--"}</td>
                    <td className="px-4 py-3">
                      {row.worstParameter ? parameterLabels[row.worstParameter as WqParameter] ?? row.worstParameter : "--"}
                    </td>
                    <td className="px-4 py-3">
                      {row.worstValue != null ? `${row.worstValue.toFixed(2)}${row.worstUnit ? ` ${row.worstUnit}` : ""}` : "--"}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${actionBadgeClass(row.action)}`}>
                        {row.action}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">
                    No active alerts in the selected scope.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card className="border border-border bg-card">
        <CardHeader className="border-b border-border/70 pb-4">
          <CardTitle className="text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Current alerts
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 pt-4">
          {currentAlerts.length ? (
            currentAlerts.map((alert) => (
              <div key={alert} className="rounded-md border border-border/70 bg-muted/20 p-3 text-sm">
                {alert}
              </div>
            ))
          ) : (
            <div className="rounded-md border border-border/70 bg-muted/20 p-3 text-sm text-muted-foreground">
              No current alerts in the selected scope.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
