"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useAlertThresholds, useWaterQualityMeasurements } from "@/lib/hooks/use-water-quality"
import { downloadCsv, printBrandedPdf } from "@/lib/utils/report-export"
import { AnalyticsSection } from "@/components/shared/analytics-section"
import { formatNumberValue } from "@/lib/analytics-format"
import { getCombinedQueryMessages } from "@/lib/utils/query-result"
import { ReportRecordsToolbar, ReportSectionHeader } from "./report-shared"
import { buildComplianceRows, buildExcursionLogRows } from "./report-selectors"

type Props = {
  dateRange?: { from: string; to: string }
  systemId?: number
  farmName?: string | null
}

export default function WaterQualityComplianceReport({ dateRange, systemId, farmName }: Props) {
  const [reportDateFrom, setReportDateFrom] = useState(dateRange?.from ?? "")
  const [reportDateTo, setReportDateTo] = useState(dateRange?.to ?? "")
  const boundsReady = Boolean(reportDateFrom && reportDateTo)

  useEffect(() => {
    setReportDateFrom(dateRange?.from ?? "")
    setReportDateTo(dateRange?.to ?? "")
  }, [dateRange?.from, dateRange?.to])

  const measurementsQuery = useWaterQualityMeasurements({
    systemId,
    dateFrom: reportDateFrom,
    dateTo: reportDateTo,
    requireSystem: false,
    enabled: boundsReady,
  })
  const thresholdsQuery = useAlertThresholds()

  const rows = measurementsQuery.data?.status === "success" ? measurementsQuery.data.data : []
  const thresholdRows = thresholdsQuery.data?.status === "success" ? thresholdsQuery.data.data : []
  const loading = measurementsQuery.isLoading || thresholdsQuery.isLoading
  const errorMessages = getCombinedQueryMessages(
    { error: measurementsQuery.error, result: measurementsQuery.data },
    { error: thresholdsQuery.error, result: thresholdsQuery.data },
  )
  const latestUpdatedAt = Math.max(measurementsQuery.dataUpdatedAt ?? 0, thresholdsQuery.dataUpdatedAt ?? 0)

  const enrichedRows = useMemo(() => buildComplianceRows(rows, thresholdRows), [rows, thresholdRows])

  const excursionLogRows = useMemo(() => buildExcursionLogRows(enrichedRows), [enrichedRows])

  return (
    <AnalyticsSection
      errorTitle="Unable to load compliance report"
      errorMessage={errorMessages[0]}
      onRetry={() => {
        measurementsQuery.refetch()
        thresholdsQuery.refetch()
      }}
      updatedAt={latestUpdatedAt}
      isFetching={measurementsQuery.isFetching || thresholdsQuery.isFetching}
      isLoading={loading}
    >
      <Card>
        <CardHeader>
          <CardTitle>Compliance Summary</CardTitle>
          <CardDescription>Excursions resolve thresholds per system, then farm, then default.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <div className="rounded-md border border-border/80 p-3">
              <p className="text-xs text-muted-foreground">Readings in report window</p>
              <p className="text-xl font-semibold">{enrichedRows.length}</p>
            </div>
            <div className="rounded-md border border-border/80 p-3">
              <p className="text-xs text-muted-foreground">Excursion episodes</p>
              <p className="text-xl font-semibold">{excursionLogRows.length}</p>
            </div>
            <div className="rounded-md border border-border/80 p-3">
              <p className="text-xs text-muted-foreground">Report start</p>
              <p className="text-xl font-semibold">{reportDateFrom || "N/A"}</p>
            </div>
            <div className="rounded-md border border-border/80 p-3">
              <p className="text-xs text-muted-foreground">Report end</p>
              <p className="text-xl font-semibold">{reportDateTo || "N/A"}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <ReportSectionHeader
          title="DO Excursion Log"
          description="All resolved dissolved-oxygen and ammonia excursion episodes in the report window."
          actions={
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap">
              <Input type="date" value={reportDateFrom} onChange={(event) => setReportDateFrom(event.target.value)} className="sm:w-[170px]" aria-label="Water quality report start date" />
              <Input type="date" value={reportDateTo} onChange={(event) => setReportDateTo(event.target.value)} className="sm:w-[170px]" aria-label="Water quality report end date" />
              <ReportRecordsToolbar
                onExportCsv={() =>
                  downloadCsv({
                    filename: `water-quality-compliance-${reportDateFrom || "start"}-to-${reportDateTo || "end"}.csv`,
                    headers: ["date", "cage", "parameter", "value", "threshold", "duration_hours", "action_taken"],
                    rows: excursionLogRows.map((row) => [row.date, row.cage, row.parameter, row.value, row.threshold, row.durationHours, row.actionTaken]),
                  })
                }
                onExportPdf={() =>
                  printBrandedPdf({
                    title: "Water-Quality Compliance Report",
                    subtitle: "Export-ready excursion log",
                    farmName,
                    dateRange: { from: reportDateFrom, to: reportDateTo },
                    summaryLines: [
                      `Readings in report window: ${enrichedRows.length}`,
                      `Excursion episodes: ${excursionLogRows.length}`,
                      "Threshold precedence: system -> farm -> default",
                    ],
                    tableHeaders: ["Date", "Cage", "Parameter", "Value", "Threshold", "Duration (hours)", "Action taken"],
                    tableRows: excursionLogRows.map((row) => [
                      row.date,
                      row.cage,
                      row.parameter,
                      typeof row.value === "number" ? formatNumberValue(row.value, { decimals: 2, minimumDecimals: 2 }) : "-",
                      typeof row.threshold === "number" ? formatNumberValue(row.threshold, { decimals: 2, minimumDecimals: 2 }) : "-",
                      typeof row.durationHours === "number" ? formatNumberValue(row.durationHours, { decimals: 2, minimumDecimals: 2 }) : "-",
                      row.actionTaken,
                    ]),
                    commentary: "Action taken is currently unavailable in the source view and is exported as Not recorded.",
                  })
                }
              />
            </div>
          }
        />
        <CardContent>
          <div className="overflow-x-auto rounded-md border border-border/80">
            <table className="w-full min-w-[960px] text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/60">
                  <th className="px-4 py-2 text-left font-semibold">Date</th>
                  <th className="px-4 py-2 text-left font-semibold">Cage</th>
                  <th className="px-4 py-2 text-left font-semibold">Parameter</th>
                  <th className="px-4 py-2 text-left font-semibold">Value</th>
                  <th className="px-4 py-2 text-left font-semibold">Threshold</th>
                  <th className="px-4 py-2 text-left font-semibold">Duration (hours)</th>
                  <th className="px-4 py-2 text-left font-semibold">Action taken</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-4 text-center text-muted-foreground">Loading...</td>
                  </tr>
                ) : excursionLogRows.length ? (
                  excursionLogRows.map((row) => (
                    <tr key={row.id} className="border-b border-border/70 hover:bg-muted/35">
                      <td className="px-4 py-2">{row.date}</td>
                      <td className="px-4 py-2">{row.cage}</td>
                      <td className="px-4 py-2">{row.parameter}</td>
                      <td className="px-4 py-2">{typeof row.value === "number" ? formatNumberValue(row.value, { decimals: 2, minimumDecimals: 2 }) : "-"}</td>
                      <td className="px-4 py-2">{typeof row.threshold === "number" ? formatNumberValue(row.threshold, { decimals: 2, minimumDecimals: 2 }) : "-"}</td>
                      <td className="px-4 py-2">{typeof row.durationHours === "number" ? formatNumberValue(row.durationHours, { decimals: 2, minimumDecimals: 2 }) : "-"}</td>
                      <td className="px-4 py-2">{row.actionTaken}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="px-4 py-4 text-center text-muted-foreground">No excursions found in the selected report window.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </AnalyticsSection>
  )
}
