"use client"

import { useCallback } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { PRODUCTION_METRIC_OPTIONS, parseProductionMetric } from "@/components/production/metrics"

export default function ProductionMetricFilter() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const selected = parseProductionMetric(searchParams.get("filter"))

  const createQueryString = useCallback(
    (name: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString())
      params.set(name, value)
      return params.toString()
    },
    [searchParams],
  )

  const handleSelectChange = (value: string) => {
    const nextQuery = createQueryString("filter", value)
    const currentQuery = searchParams.toString()
    if (nextQuery === currentQuery) return
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname)
  }

  return (
    <select
      id="production-metric-filter"
      value={selected}
      onChange={(event) => handleSelectChange(event.target.value)}
      className="soft-input-surface h-11 w-full max-w-[260px] rounded-xl px-3 text-sm font-medium text-foreground"
    >
      {PRODUCTION_METRIC_OPTIONS.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  )
}
