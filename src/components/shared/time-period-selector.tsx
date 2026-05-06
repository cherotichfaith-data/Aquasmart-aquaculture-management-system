"use client"

import { FilterPopover } from "@/components/shared/filter-popover"
import { TIME_PERIOD_LABELS, TIME_PERIODS, type TimePeriod } from "@/lib/time-period"

export type { TimePeriod } from "@/lib/time-period"

interface TimePeriodSelectorProps {
  selectedPeriod: TimePeriod
  onPeriodChange: (period: TimePeriod) => void
  variant?: "default" | "compact"
  periods?: TimePeriod[]
  customLabels?: Partial<Record<TimePeriod, string>>
  disabled?: boolean
}

export default function TimePeriodSelector({
  selectedPeriod,
  onPeriodChange,
  variant = "default",
  periods = TIME_PERIODS,
  customLabels,
  disabled = false,
}: TimePeriodSelectorProps) {
  const options = periods.map((period) => ({
    value: period,
    label: customLabels?.[period] ?? TIME_PERIOD_LABELS[period],
  }))

  return (
    <FilterPopover
      label="Time Window"
      value={selectedPeriod}
      options={options}
      placeholder="Select period"
      onChange={(value) => onPeriodChange(value as TimePeriod)}
      disabled={disabled}
      searchable={false}
      triggerSx={{
        minWidth: {
          xs: "100%",
          sm: variant === "compact" ? 190 : 170,
        },
      }}
      contentSx={{ width: { xs: "min(24rem, calc(100vw - 24px))", sm: 352 } }}
    />
  )
}
