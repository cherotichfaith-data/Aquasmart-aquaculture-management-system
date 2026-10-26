"use client"

import { useState } from "react"
import { CalendarDays } from "lucide-react"
import { FilterPopover } from "@/components/shared/filter-popover"
import { Button } from "@/components/app-ui/button"
import { Dialog } from "@/components/app-ui/dialog"
import { cn } from "@/lib/utils"
import {
  TIME_PERIOD_LABELS,
  TIME_PERIODS,
  formatCustomRangeLabel,
  type CustomTimeRange,
  type TimePeriod,
} from "@/lib/time-period"

export type { TimePeriod } from "@/lib/time-period"

const CUSTOM_OPTION_VALUE = "__custom__"

interface TimePeriodSelectorProps {
  selectedPeriod: TimePeriod
  onPeriodChange: (period: TimePeriod) => void
  label?: string | null
  /** aquasmart-main / v2-design custom range: enabled when the handler is provided. */
  customRange?: CustomTimeRange | null
  onCustomRangeChange?: (range: CustomTimeRange) => void
  variant?: "default" | "compact"
  periods?: TimePeriod[]
  customLabels?: Partial<Record<TimePeriod, string>>
  disabled?: boolean
  /** One calendar control, no preset periods: a single button that opens the From/To date picker. */
  calendarOnly?: boolean
  /** Text on the calendar button while no custom range is chosen (e.g. the resolved window). */
  calendarLabel?: string
}

export default function TimePeriodSelector({
  selectedPeriod,
  onPeriodChange,
  label = null,
  customRange,
  onCustomRangeChange,
  variant = "default",
  periods = TIME_PERIODS,
  customLabels,
  disabled = false,
  calendarOnly = false,
  calendarLabel,
}: TimePeriodSelectorProps) {
  const allowCustom = Boolean(onCustomRangeChange) || calendarOnly
  const [dialogOpen, setDialogOpen] = useState(false)
  const [draftStart, setDraftStart] = useState(customRange?.start ?? "")
  const [draftEnd, setDraftEnd] = useState(customRange?.end ?? "")

  const options = [
    ...periods.map((period) => ({
      value: period as string,
      label: customLabels?.[period] ?? TIME_PERIOD_LABELS[period],
    })),
    ...(allowCustom
      ? [
          {
            value: CUSTOM_OPTION_VALUE,
            label: customRange ? `Custom: ${formatCustomRangeLabel(customRange)}` : "Custom range…",
          },
        ]
      : []),
  ]

  const handleChange = (value: string) => {
    if (value === CUSTOM_OPTION_VALUE) {
      setDraftStart(customRange?.start ?? "")
      setDraftEnd(customRange?.end ?? "")
      setDialogOpen(true)
      return
    }
    onPeriodChange(value as TimePeriod)
  }

  const openCalendar = () => {
    setDraftStart(customRange?.start ?? "")
    setDraftEnd(customRange?.end ?? "")
    setDialogOpen(true)
  }

  const handleApplyCustomRange = () => {
    if (!draftStart || !draftEnd || !onCustomRangeChange) return
    const [start, end] = draftStart <= draftEnd ? [draftStart, draftEnd] : [draftEnd, draftStart]
    onCustomRangeChange({ start, end })
    setDialogOpen(false)
  }

  return (
    <>
      {calendarOnly ? (
        <Button
          type="button"
          variant="outline"
          onClick={openCalendar}
          disabled={disabled}
          aria-label="Choose dates"
          className="h-10 w-full justify-start gap-2 rounded-lg px-3 font-medium"
        >
          <CalendarDays size={16} aria-hidden />
          <span className="truncate">
            {customRange ? formatCustomRangeLabel(customRange) : (calendarLabel ?? "Select dates")}
          </span>
        </Button>
      ) : (
        <FilterPopover
          label={label ?? undefined}
          value={customRange ? CUSTOM_OPTION_VALUE : selectedPeriod}
          options={options}
          placeholder="Select date type"
          onChange={handleChange}
          disabled={disabled}
          searchable={false}
          className={cn("w-full", variant === "compact" ? "sm:min-w-0" : "sm:min-w-[170px]")}
          contentClassName="sm:w-[352px]"
        />
      )}

      {allowCustom ? (
        <Dialog
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          title="Custom date range"
          maxWidth="xs"
          actions={
            <>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="button" onClick={handleApplyCustomRange} disabled={!draftStart || !draftEnd}>
                Apply range
              </Button>
            </>
          }
        >
          <div className="flex flex-col gap-3 py-1">
            <label className="flex flex-col gap-1.5 text-xs font-semibold text-muted-foreground">
              From
              <input
                type="date"
                value={draftStart}
                max={draftEnd || undefined}
                onChange={(event) => setDraftStart(event.target.value)}
                className="h-10 rounded-lg border border-border bg-card px-3 text-sm font-medium text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-xs font-semibold text-muted-foreground">
              To
              <input
                type="date"
                value={draftEnd}
                min={draftStart || undefined}
                onChange={(event) => setDraftEnd(event.target.value)}
                className="h-10 rounded-lg border border-border bg-card px-3 text-sm font-medium text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </label>
          </div>
        </Dialog>
      ) : null}
    </>
  )
}
