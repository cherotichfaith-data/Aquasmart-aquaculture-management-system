"use client"

import type { ReactNode } from "react"
import { CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

const REPORT_ACTION_BUTTON_CLASS = "px-3 py-2 rounded-xl bg-background/72 text-sm font-medium shadow-[0_14px_32px_-26px_rgba(15,23,32,0.36)] transition-colors hover:bg-muted/35"

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
    <div className="soft-panel-subtle p-4 text-sm text-muted-foreground">
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
    ? "h-10 w-full rounded-xl bg-background/72 px-3 text-sm font-medium shadow-[0_14px_32px_-26px_rgba(15,23,32,0.36)] transition-colors hover:bg-muted/35 sm:w-auto"
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
