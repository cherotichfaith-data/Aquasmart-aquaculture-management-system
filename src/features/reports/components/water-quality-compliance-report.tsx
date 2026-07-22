"use client"

import { useMemo, useState } from "react"
import { Card, CardContent } from "@/components/app-ui/card"
import { Input } from "@/components/app-ui/input"
import { useAlertThresholds, useWaterQualityMeasurements } from "@/features/water-quality/hooks"
import { downloadCsv, printBrandedPdf } from "@/lib/utils/report-export"
import { AnalyticsSection } from "@/components/shared/analytics-section"
import { formatNumberValue } from "@/lib/analytics-format"
import { getCombinedQueryMessages } from "@/lib/utils/query-result"
import {
  REPORT_SURFACE_CARD_CLASS,
  REPORT_TABLE_SHELL_CLASS,
  ReportMetricCard,
  ReportRecordsToolbar,
  ReportSectionHeader,
} from "./report-shared"
import { buildComplianceRows, buildExcursionLogRows } from "./report-selectors"

type Props = {
  farmId?: string | null
  dateRange?: { from: string; to: string }
  systemId?: number
  farmName?: string | null
}

type ReportDateDraft = {
  sourceToken: symbol
  from: string
  to: string
}

export default function WaterQualityComplianceReport({ farmId, dateRange, systemId, farmName }: Props) {
  const currentSourceToken = useMemo(
    () => Symbol(`${dateRange?.from ?? ""}|${dateRange?.to ?? ""}`),
    [dateRange?.from, dateRange?.to],
  )
  const [draft, setDraft] = useState<ReportDateDraft>(() => ({
    sourceToken: currentSourceToken,
    from: dateRange?.from ?? "",
    to: dateRange?.to ?? "",
  }))
  const resolvedDraft =
    draft.sourceToken === currentSourceToken
      ? draft
      : {
          sourceToken: currentSourceToken,
          from: dateRange?.from ?? "",
          to: dateRange?.to ?? "",
        }
  const reportDateFrom = resolvedDraft.from
  const reportDateTo = resolvedDraft.to
  const boundsReady = Boolean(reportDateFrom && reportDateTo)
  const updateDraftDates = (next: Partial<Pick<ReportDateDraft, "from" | "to">>) => {
    setDraft((current) => ({
      ...(current.sourceToken === currentSourceToken ? current : resolvedDraft),
      sourceToken: currentSourceToken,
      ...next,
    }))
  }

  const measurementsQuery = useWaterQualityMeasurements({
    farmId,
    systemId,
    dateFrom: reportDateFrom,
    dateTo: reportDateTo,
    requireSystem: false,
    enabled: boundsReady,
  })
  const thresholdsQuery = useAlertThresholds({ farmId })

  const loading = measurementsQuery.isLoading || thresholdsQuery.isLoading
  const errorMessages = getCombinedQueryMessages(
    { error: measurementsQuery.error, result: measurementsQuery.data },
    { error: thresholdsQuery.error, result: thresholdsQuery.data },
  )
  const latestUpdatedAt = Math.max(measurementsQuery.dataUpdatedAt ?? 0, thresholdsQuery.dataUpdatedAt ?? 0)

  const enrichedRows = useMemo(
    () =>
      buildComplianceRows(
        measurementsQuery.data?.status === "success" ? measurementsQuery.data.data : [],
        thresholdsQuery.data?.status === "success" ? thresholdsQuery.data.data : [],
      ),
    [measurementsQuery.data, thresholdsQuery.data],
  )

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
      <div className="space-y-2">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-foreground">Compliance Summary</h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Excursions resolve thresholds per system, then farm, then default.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <ReportMetricCard title="Readings" value={enrichedRows.length.toLocaleString()} meta="Water-quality measurements inside the report window." />
          <ReportMetricCard title="Excursion Episodes" value={excursionLogRows.length.toLocaleString()} meta="Resolved dissolved-oxygen or ammonia threshold breaches." />
          <ReportMetricCard title="Report Start" value={reportDateFrom || "N/A"} meta="Inclusive lower bound for the current report." />
          <ReportMetricCard title="Report End" value={reportDateTo || "N/A"} meta="Inclusive upper bound for the current report." />
        </div>
      </div>

      <Card className={REPORT_SURFACE_CARD_CLASS}>
        <ReportSectionHeader
          title="DO Excursion Log"
          description="All resolved dissolved-oxygen and ammonia excursion episodes in the report window."
          actions={
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap">
              <Input
                type="date"
                value={reportDateFrom}
                onChange={(event) => updateDraftDates({ from: event.target.value })}
                className="soft-input-surface sm:w-[170px]"
                aria-label="Water quality report start date"
              />
              <Input
                type="date"
                value={reportDateTo}
                onChange={(event) => updateDraftDates({ to: event.target.value })}
                className="soft-input-surface sm:w-[170px]"
                aria-label="Water quality report end date"
              />
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
          <div className={REPORT_TABLE_SHELL_CLASS}>
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

