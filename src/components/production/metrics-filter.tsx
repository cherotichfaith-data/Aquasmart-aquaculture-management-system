"use client"

import { useCallback } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/app-ui/select"
import { PRODUCTION_METRIC_OPTIONS, parseProductionMetric } from "@/components/production/metrics"
import { cn } from "@/lib/utils"

export default function ProductionMetricFilter({ className }: { className?: string }) {
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
    <Select
      value={selected}
      onValueChange={handleSelectChange}
    >
      <SelectTrigger
        id="production-metric-filter"
        className={cn("w-full max-w-[260px]", className)}
      >
        <SelectValue placeholder="eFCR periodic" />
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
