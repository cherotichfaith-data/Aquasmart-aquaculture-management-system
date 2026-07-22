"use client"

import { useCallback } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Plus, X } from "lucide-react"
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

/**
 * "+ Compare KPI" control (design guide): inactive → dashed ghost button;
 * active → "Compare to" select (all metrics except the primary) + ✕ to clear.
 * Writes `?compare=` to the URL; never renders a disabled third select.
 */
export default function ProductionCompareFilter({
  primaryMetric,
  compareMetric,
}: {
  primaryMetric: ProductionMetric
  compareMetric: ProductionMetric | null
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
      router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname)
    },
    [pathname, router, searchParams],
  )

  const options = PRODUCTION_METRIC_OPTIONS.filter((option) => option.value !== primaryMetric)

  if (!compareMetric) {
    return (
      <Button
        type="button"
        variant="outline"
        className="h-10 border-dashed bg-transparent px-4 text-sm font-semibold text-primary hover:border-primary hover:bg-card"
        onClick={() => pushCompare(options[0]?.value ?? null)}
      >
        <Plus className="mr-1 h-4 w-4" />
        Compare KPI
      </Button>
    )
  }

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-semibold text-muted-foreground">Compare to</span>
      <div className="flex items-center gap-2">
        <Select value={compareMetric} onValueChange={(value) => pushCompare(value)}>
          {/* MUI Select is fullWidth; the wrapper fixes its width. */}
          <div className="w-[190px] shrink-0 md:w-[200px]">
            <SelectTrigger id="production-compare-filter" className="production-select">
              <SelectValue />
            </SelectTrigger>
          </div>
          <SelectContent>
            <SelectGroup>
              {options.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label="Clear comparison"
          className="h-10 w-10 text-muted-foreground hover:border-destructive hover:text-destructive"
          onClick={() => pushCompare(null)}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
