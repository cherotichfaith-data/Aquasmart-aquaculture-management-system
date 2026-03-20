"use client"

import type { ReactNode } from "react"
import { CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

const REPORT_ACTION_BUTTON_CLASS = "px-3 py-2 rounded-md border border-input text-sm hover:bg-muted/40"

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
      <div className="flex items-center justify-between gap-2">
        <div>
          <CardTitle>{title}</CardTitle>
          {description ? <CardDescription>{description}</CardDescription> : null}
        </div>
        {actions}
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
    <div className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">
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

export function ReportLimitSelect({
  value,
  onChange,
  ariaLabel = "Rows to display",
  className = "px-3 py-2 rounded-md border border-input text-sm",
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
    ? "h-10 rounded-xl border border-input px-3 text-sm hover:bg-muted/40"
    : REPORT_ACTION_BUTTON_CLASS
  const selectClass = compact
    ? "h-10 rounded-xl border border-input bg-background px-3 text-sm font-medium"
    : "px-3 py-2 rounded-md border border-input text-sm"

  return (
    <div className="flex flex-wrap gap-2">
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
