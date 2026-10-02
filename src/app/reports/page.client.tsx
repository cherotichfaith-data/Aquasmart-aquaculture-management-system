"use client"

import { useCallback } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import DashboardLayout from "@/components/layout/dashboard-layout"
import TimePeriodSelector from "@/components/shared/time-period-selector"
import MonthlyReports from "@/features/reports/components/monthly-report-pack"
import { useAnalyticsPageBootstrap } from "@/lib/hooks/app/use-analytics-page-bootstrap"
import type { SharedFiltersState } from "@/lib/hooks/app/use-shared-filters"
import {
  formatCustomRangeLabel,
  parseCustomPeriodUrlValue,
  toCustomPeriodUrlValue,
  type CustomTimeRange,
} from "@/lib/time-period"

export default function ReportsPage({
  initialFarmId,
  initialFarmName,
  initialFarmRole,
  initialFilters,
}: {
  initialFarmId?: string | null
  initialFarmName?: string | null
  initialFarmRole?: string | null
  initialFilters?: Partial<SharedFiltersState>
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { farm, dateFrom, dateTo, timePeriod } = useAnalyticsPageBootstrap({
    initialFarmId,
    initialFarmName,
    initialFilters,
    useSystemBounds: false,
    boundsScope: "production",
  })
  const customRange = parseCustomPeriodUrlValue(searchParams.get("date"))

  const handleCustomRangeChange = useCallback(
    (range: CustomTimeRange) => {
      const params = new URLSearchParams(searchParams.toString())
      params.set("date", toCustomPeriodUrlValue(range))
      router.replace(`${pathname}?${params.toString()}`)
    },
    [pathname, router, searchParams],
  )

  return (
    <DashboardLayout initialFarmId={initialFarmId} initialFarmName={initialFarmName} headerDataOverrides={{ role: initialFarmRole ?? null }}>
      <div className="page-shell !space-y-3 md:-mt-2">
        <MonthlyReports
          farmName={farm?.name ?? initialFarmName ?? null}
          dateFrom={dateFrom ?? null}
          dateTo={dateTo ?? null}
          filterSlot={
            <div className="w-full sm:w-[240px]">
              <TimePeriodSelector
                calendarOnly
                selectedPeriod={timePeriod}
                onPeriodChange={() => {}}
                customRange={customRange}
                onCustomRangeChange={handleCustomRangeChange}
                calendarLabel={dateFrom && dateTo ? formatCustomRangeLabel({ start: dateFrom, end: dateTo }) : undefined}
                variant="compact"
              />
            </div>
          }
        />
      </div>
    </DashboardLayout>
  )
}
