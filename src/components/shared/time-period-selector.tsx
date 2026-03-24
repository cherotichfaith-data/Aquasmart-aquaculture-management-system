"use client"

import { ChevronDown } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
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
  const triggerClass =
    variant === "compact"
      ? "inline-flex h-10 w-full items-center justify-between gap-2 rounded-xl border border-input bg-background/90 px-3 text-sm font-medium text-foreground shadow-sm sm:w-auto sm:min-w-[140px]"
      : "h-9 min-w-[120px] rounded-full border border-border bg-card/80 px-4 text-xs font-semibold text-foreground shadow-sm inline-flex items-center justify-between gap-2"

  return (
    <div className="flex w-full items-center sm:w-auto">
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={triggerClass}
            aria-label="Select time period"
          >
            <span>{TIME_PERIOD_LABELS[selectedPeriod]}</span>
            <ChevronDown size={14} className="text-muted-foreground" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-3">
          <div className="space-y-2">
            {TIME_PERIODS.map((period) => (
              <button
                key={period}
                onClick={() => onPeriodChange(period)}
                className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${
                  selectedPeriod === period ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                }`}
              >
                {TIME_PERIOD_LABELS[period]}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
