"use client"

import { FilterPopover } from "@/components/shared/filter-popover"
import { TIME_PERIOD_LABELS, TIME_PERIODS, type TimePeriod } from "@/lib/time-period"

export type { TimePeriod } from "@/lib/time-period"

interface TimePeriodSelectorProps {
  selectedPeriod: TimePeriod
  onPeriodChange: (period: TimePeriod) => void
  variant?: "default" | "compact"
}

export default function TimePeriodSelector({
  selectedPeriod,
  onPeriodChange,
  variant = "default",
}: TimePeriodSelectorProps) {
  const options = TIME_PERIODS.map((period) => ({
    value: period,
    label: TIME_PERIOD_LABELS[period],
  }))

  return (
    <FilterPopover
      label="Time Window"
      value={selectedPeriod}
      options={options}
      placeholder="Select period"
      onChange={(value) => onPeriodChange(value as TimePeriod)}
      searchable={false}
      triggerClassName={
        variant === "compact"
          ? "sm:min-w-[190px]"
          : "sm:min-w-[170px]"
      }
      contentClassName="sm:w-[22rem]"
    />
  )
}
