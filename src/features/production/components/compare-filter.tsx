"use client"

import { useCallback } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Plus } from "lucide-react"
import { Button } from "@/components/app-ui/button"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/app-ui/select"
import {
  PRODUCTION_METRIC_OPTIONS,
  type ProductionMetric,
} from "@/features/production/components/metrics"

const NO_COMPARE_VALUE = "__none__"

/**
 * "+ Compare KPI" control (design guide): inactive → dashed ghost button;
 * active → "Compare to" select (all metrics except the primary) + ✕ to clear.
 * Writes `?compare=` to the URL; never renders a disabled third select.
 */
export default function ProductionCompareFilter({
  primaryMetric,
  compareMetric,
  startTransition,
}: {
  primaryMetric: ProductionMetric
  compareMetric: ProductionMetric | null
  /** See ProductionMetricFilter's `startTransition` prop for why this exists. */
  startTransition?: (callback: () => void) => void
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const pushCompare = useCallback(
    (value: string | null) => {
      const params = new URLSearchParams(searchParams.toString())
      if (value) params.set("compare", value)
      else params.delete("compare")
      const nextQuery = params.toString()
      if (nextQuery === searchParams.toString()) return
      const navigate = () => router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname)
      startTransition ? startTransition(navigate) : navigate()
    },
    [pathname, router, searchParams, startTransition],
  )

  const options = PRODUCTION_METRIC_OPTIONS.filter((option) => option.value !== primaryMetric)

  if (!compareMetric) {
    return (
      <Button
        type="button"
        variant="outline"
        className="h-10 w-[180px] rounded-xl border-dashed bg-transparent px-4 text-sm font-semibold text-primary hover:border-primary hover:bg-card md:w-[190px]"
        onClick={() => pushCompare(options[0]?.value ?? null)}
      >
        <Plus className="mr-1 h-4 w-4" />
        Compare KPI
      </Button>
    )
  }

  return (
    <div className="w-[180px] shrink-0 md:w-[190px]">
      <Select
        value={compareMetric}
        onValueChange={(value) => pushCompare(value === NO_COMPARE_VALUE ? null : value)}
      >
        <div className="w-[180px] shrink-0 md:w-[190px]">
          <SelectTrigger id="production-compare-filter" className="production-select">
            <SelectValue />
          </SelectTrigger>
        </div>
        <SelectContent>
          <SelectGroup>
            <SelectItem value={NO_COMPARE_VALUE}>No comparison</SelectItem>
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  )
}
