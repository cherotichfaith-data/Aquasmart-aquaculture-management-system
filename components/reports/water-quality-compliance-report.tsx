"use client"

import { useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useAlertThresholds, useWaterQualityMeasurements } from "@/lib/hooks/use-water-quality"
import { downloadCsv, printBrandedPdf } from "@/lib/utils/report-export"

type Props = {
  dateRange?: { from: string; to: string }
  systemId?: number
  farmName?: string | null
}

export default function WaterQualityComplianceReport({ dateRange, systemId, farmName }: Props) {
  const measurementsQuery = useWaterQualityMeasurements({
    systemId,
    dateFrom: dateRange?.from,
    dateTo: dateRange?.to,
    requireSystem: false,
    limit: 10000,
  })
  const thresholdsQuery = useAlertThresholds()

  const rows = measurementsQuery.data?.status === "success" ? measurementsQuery.data.data : []
  const thresholdRows = thresholdsQuery.data?.status === "success" ? thresholdsQuery.data.data : []
  const loading = measurementsQuery.isLoading || thresholdsQuery.isLoading

  const farmThreshold = useMemo(
    () => thresholdRows.find((row) => row.scope === "farm" && row.system_id == null) ?? null,
    [thresholdRows],
  )

  const enrichedRows = useMemo(() => {
    const lowDo = farmThreshold?.low_do_threshold ?? 4
    const highAmmonia = farmThreshold?.high_ammonia_threshold ?? 0.5
    return rows.map((row) => {
      let excursion = false
      if (row.parameter_name === "dissolved_oxygen" && typeof row.parameter_value === "number") {
        excursion = row.parameter_value < lowDo
      }
      if (row.parameter_name === "ammonia_ammonium" && typeof row.parameter_value === "number") {
        excursion = row.parameter_value > highAmmonia
      }
      return { ...row, excursion }
    })
  }, [farmThreshold?.high_ammonia_threshold, farmThreshold?.low_do_threshold, rows])

  const excursionCount = useMemo(() => enrichedRows.filter((row) => row.excursion).length, [enrichedRows])

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Compliance Summary</CardTitle>
          <CardDescription>Regulatory water-quality reporting dataset with excursion flags.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="rounded-md border border-border/80 p-3">
              <p className="text-xs text-muted-foreground">Readings in period</p>
              <p className="text-xl font-semibold">{enrichedRows.length}</p>
            </div>
            <div className="rounded-md border border-border/80 p-3">
              <p className="text-xs text-muted-foreground">Excursions flagged</p>
              <p className="text-xl font-semibold">{excursionCount}</p>
            </div>
            <div className="rounded-md border border-border/80 p-3">
              <p className="text-xs text-muted-foreground">Low DO threshold</p>
              <p className="text-xl font-semibold">{farmThreshold?.low_do_threshold ?? "N/A"}</p>
            </div>
            <div className="rounded-md border border-border/80 p-3">
              <p className="text-xs text-muted-foreground">High ammonia threshold</p>
              <p className="text-xl font-semibold">{farmThreshold?.high_ammonia_threshold ?? "N/A"}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <div>
              <CardTitle>Water-Quality Compliance Records</CardTitle>
              <CardDescription>
                Source: api_water_quality_measurements. Includes parameter, reading, timestamp, system, and threshold flag.
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                className="px-3 py-2 rounded-md border border-input text-sm hover:bg-muted/40"
                onClick={() =>
                  downloadCsv({
                    filename: `water-quality-compliance-${dateRange?.from ?? "start"}-to-${dateRange?.to ?? "end"}.csv`,
                    headers: ["date", "time", "system_name", "parameter_name", "parameter_value", "unit", "water_depth", "created_at", "operator", "excursion"],
                    rows: enrichedRows.map((row) => [
                      row.date,
                      row.time,
                      row.system_name ?? row.system_id,
                      row.parameter_name,
                      row.parameter_value,
                      row.unit,
                      row.water_depth,
                      row.created_at,
                      "unknown",
                      row.excursion ? "YES" : "NO",
                    ]),
                  })
                }
              >
                Export CSV
              </button>
              <button
                type="button"
                className="px-3 py-2 rounded-md border border-input text-sm hover:bg-muted/40"
                onClick={() =>
                  printBrandedPdf({
                    title: "Water-Quality Compliance Report",
                    subtitle: "Regulatory compliance export with excursion flags",
                    farmName,
                    dateRange,
                    summaryLines: [
                      `Total readings: ${enrichedRows.length}`,
                      `Excursions: ${excursionCount}`,
                      `DO threshold: ${farmThreshold?.low_do_threshold ?? "N/A"}`,
                      `Ammonia threshold: ${farmThreshold?.high_ammonia_threshold ?? "N/A"}`,
                      "Certification: Generated from audited AquaSmart view datasets.",
                    ],
                    tableHeaders: ["Date", "Time", "System", "Parameter", "Reading", "Unit", "Excursion"],
                    tableRows: enrichedRows.map((row) => [
                      row.date,
                      row.time,
                      row.system_name ?? row.system_id,
                      row.parameter_name,
                      row.parameter_value,
                      row.unit ?? "-",
                      row.excursion ? "YES" : "NO",
                    ]),
                    commentary: "Operator field currently unavailable in api_water_quality_measurements and is marked as unknown.",
                  })
                }
              >
                Export PDF
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-md border border-border/80">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/60">
                  <th className="px-4 py-2 text-left font-semibold">Timestamp</th>
                  <th className="px-4 py-2 text-left font-semibold">System</th>
                  <th className="px-4 py-2 text-left font-semibold">Parameter</th>
                  <th className="px-4 py-2 text-left font-semibold">Reading</th>
                  <th className="px-4 py-2 text-left font-semibold">Unit</th>
                  <th className="px-4 py-2 text-left font-semibold">Excursion</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-4 text-center text-muted-foreground">Loading...</td>
                  </tr>
                ) : enrichedRows.length ? (
                  enrichedRows.map((row) => (
                    <tr key={row.id ?? `${row.system_id}-${row.date}-${row.time}-${row.parameter_name}`} className="border-b border-border/70 hover:bg-muted/35">
                      <td className="px-4 py-2">{row.date} {row.time ?? "00:00"}</td>
                      <td className="px-4 py-2">{row.system_name ?? row.system_id}</td>
                      <td className="px-4 py-2">{row.parameter_name}</td>
                      <td className="px-4 py-2">{row.parameter_value ?? "-"}</td>
                      <td className="px-4 py-2">{row.unit ?? "-"}</td>
                      <td className={`px-4 py-2 font-medium ${row.excursion ? "text-destructive" : "text-chart-2"}`}>{row.excursion ? "YES" : "NO"}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-4 py-4 text-center text-muted-foreground">No measurements found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
