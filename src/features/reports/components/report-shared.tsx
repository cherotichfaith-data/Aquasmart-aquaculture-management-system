"use client"

import type { ReactNode } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/app-ui/card"

const REPORT_ACTION_BUTTON_CLASS =
  "min-h-10 rounded-xl border border-border bg-background px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted/35"
export const REPORT_SURFACE_CARD_CLASS =
  "rounded-3xl border-border/70 shadow-none hover:-translate-y-0"
export const REPORT_CHART_SHELL_CLASS =
  "h-full overflow-hidden rounded-2xl border border-border/60 bg-background p-3 md:p-4"
export const REPORT_TABLE_SHELL_CLASS =
  "overflow-x-auto rounded-2xl border border-border/60 bg-background"

export function ReportSectionHeader({
  title,
  description,
  actions,
}: {
  title: string
  description?: string
  actions?: ReactNode
}) {
  return (
    <CardHeader>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <CardTitle className="leading-tight tracking-[-0.02em]">{title}</CardTitle>
          {description ? <CardDescription className="mt-1.5 max-w-3xl">{description}</CardDescription> : null}
        </div>
        {actions ? <div className="w-full sm:w-auto">{actions}</div> : null}
      </div>
    </CardHeader>
  )
}

export function ReportRecordsHiddenState({
  label,
}: {
  label: string
}) {
  return (
    <div className="rounded-2xl bg-muted/20 p-4 text-sm text-muted-foreground">
      Detailed records hidden. Click <span className="font-medium text-foreground">View details</span> to show {label}.
    </div>
  )
}

export function ReportActionButton({
  onClick,
  children,
  className = REPORT_ACTION_BUTTON_CLASS,
}: {
  onClick: () => void
  children: ReactNode
  className?: string
}) {
  return (
    <button type="button" className={className} onClick={onClick}>
      {children}
    </button>
  )
}

export function ReportMetricCard({
  title,
  value,
  meta,
}: {
  title: string
  value: ReactNode
  meta?: ReactNode
}) {
  return (
    <Card className="kpi-card min-h-[156px] rounded-2xl overflow-hidden hover:-translate-y-0">
      <CardHeader className="kpi-card-header pb-1">
        <CardTitle className="kpi-card-title">{title}</CardTitle>
      </CardHeader>
      <CardContent className="kpi-card-content justify-between gap-3">
        <div className="min-h-0">
          <div className="kpi-card-value break-words text-xl sm:text-2xl">
            {value}
          </div>
        </div>
        {meta ? <p className="kpi-card-meta text-xs leading-5">{meta}</p> : null}
      </CardContent>
    </Card>
  )
}

export function ReportLimitSelect({
  value,
  onChange,
  ariaLabel = "Rows to display",
  className = "soft-input-surface px-3 py-2 text-sm",
}: {
  value: string
  onChange: (value: string) => void
  ariaLabel?: string
  className?: string
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className={className}
      aria-label={ariaLabel}
    >
      <option value="50">50 rows</option>
      <option value="100">100 rows</option>
      <option value="250">250 rows</option>
    </select>
  )
}

export function ReportRecordsToolbar({
  tableLimit,
  onTableLimitChange,
  showRecords,
  onToggleRecords,
  onExportCsv,
  onExportPdf,
  compact = false,
}: {
  tableLimit?: string
  onTableLimitChange?: (value: string) => void
  showRecords?: boolean
  onToggleRecords?: () => void
  onExportCsv: () => void
  onExportPdf: () => void
  compact?: boolean
}) {
  const buttonClass = compact
    ? "h-10 w-full rounded-xl border border-border bg-background px-3 text-sm font-medium text-foreground transition-colors hover:bg-muted/35 sm:w-auto"
    : REPORT_ACTION_BUTTON_CLASS
  const selectClass = compact
    ? "soft-input-surface h-10 w-full px-3 text-sm font-medium sm:w-auto"
    : "soft-input-surface px-3 py-2 text-sm"

  return (
    <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap">
      {tableLimit != null && onTableLimitChange ? (
        <ReportLimitSelect value={tableLimit} onChange={onTableLimitChange} className={selectClass} />
      ) : null}
      {showRecords != null && onToggleRecords ? (
        <ReportActionButton onClick={onToggleRecords} className={buttonClass}>
          {showRecords ? "Hide details" : "View details"}
        </ReportActionButton>
      ) : null}
      <ReportActionButton onClick={onExportCsv} className={buttonClass}>
        Export CSV
      </ReportActionButton>
      <ReportActionButton onClick={onExportPdf} className={buttonClass}>
        Export PDF
      </ReportActionButton>
    </div>
  )
}

