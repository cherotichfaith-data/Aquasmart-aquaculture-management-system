"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/app-ui/select"
import { PRODUCTION_METRIC_OPTIONS, parseProductionCompareMetric, parseProductionMetric } from "@/features/production/components/metrics"
import { cn } from "@/lib/utils"

export default function ProductionMetricFilter({
  className,
  startTransition,
}: {
  className?: string
  /**
   * Wraps the URL update in a React transition so the page can show a
   * pending state (e.g. the chart's loading skeleton) while the server
   * re-renders with the new filter, instead of the UI just sitting there
   * with no feedback until the new data streams in.
   */
  startTransition?: (callback: () => void) => void
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const selected = parseProductionMetric(searchParams.get("filter"))

  const handleSelectChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set("filter", value)
    // If the newly selected primary metric matches the active compare metric,
    // the comparison is no longer meaningful — clear it (mirrors the design's onKpi behavior).
    const nextMetric = parseProductionMetric(value)
    const activeCompare = parseProductionCompareMetric(searchParams.get("compare"), selected)
    if (activeCompare === nextMetric) params.delete("compare")

    const nextQuery = params.toString()
    const currentQuery = searchParams.toString()
    if (nextQuery === currentQuery) return
    const navigate = () => router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname)
    if (startTransition) startTransition(navigate)
    else navigate()
  }

  return (
    <Select
      value={selected}
      onValueChange={handleSelectChange}
    >
      <SelectTrigger
        id="production-metric-filter"
        className={cn("w-full max-w-[260px]", className)}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {PRODUCTION_METRIC_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  )
}
