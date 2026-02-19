"use client"

import type { Enums } from "@/lib/types/database"

import { ChevronDown } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

export type TimePeriod = Enums<"time_period">

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
  const periods: TimePeriod[] = ["day", "week", "2 weeks", "month", "quarter", "6 months", "year"]
  const periodLabels: Record<TimePeriod, string> = {
    day: "Today",
    week: "Week",
    "2 weeks": "2 Weeks",
    month: "Month",
    quarter: "Quarter",
    "6 months": "6 Months",
    year: "Year",
  }
  const triggerClass =
    variant === "compact"
      ? "h-9 min-w-[140px] rounded-md border border-input bg-background px-3 text-sm font-medium text-foreground inline-flex items-center justify-between gap-2"
      : "h-9 min-w-[120px] rounded-full border border-border bg-card/80 px-4 text-xs font-semibold text-foreground shadow-sm inline-flex items-center justify-between gap-2"

  return (
    <div className="flex items-center">
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={triggerClass}
            aria-label="Select time period"
          >
            <span>{periodLabels[selectedPeriod]}</span>
            <ChevronDown size={14} className="text-muted-foreground" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-3">
          <div className="space-y-2">
            {periods.map((period) => (
              <button
                key={period}
                onClick={() => onPeriodChange(period)}
                className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${
                  selectedPeriod === period ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                }`}
              >
                {periodLabels[period]}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
