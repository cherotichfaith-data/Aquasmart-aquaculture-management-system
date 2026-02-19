"use client"

import { Suspense, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import DashboardLayout from "@/components/layout/dashboard-layout"
import SystemsTable from "@/components/dashboard/systems-table"
import KPIOverview from "@/components/dashboard/kpi-overview"
import FarmSelector from "@/components/shared/farm-selector"
import TimePeriodSelector, { type TimePeriod } from "@/components/shared/time-period-selector"
import type { Enums } from "@/lib/types/database"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { parseDateToTimePeriod } from "@/lib/utils"
import { useSharedFilters } from "@/hooks/use-shared-filters"

const parseStageParam = (value: string | null): "all" | Enums<"system_growth_stage"> => {
    if (value === "nursing" || value === "grow_out") return value
    return "all"
}

function ProductionContent() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const metricParam = searchParams.get("metric")
  const startDateParam = searchParams.get("startDate")
  const endDateParam = searchParams.get("endDate")
  const paramSystem = searchParams.get("system") ?? "all"
  const paramStage = parseStageParam(searchParams.get("stage"))
  const periodParam = searchParams.get("period")
  const parsedPeriod = parseDateToTimePeriod(periodParam)
  const paramPeriod: TimePeriod = parsedPeriod.kind === "preset" ? parsedPeriod.period : "2 weeks"
  const paramBatch = searchParams.get("batch") ?? "all"
  const hasUrlFilters = ["system", "stage", "period", "batch"].some((key) => searchParams.get(key) != null)

  const {
    selectedSystem,
    setSelectedSystem,
    selectedStage,
    setSelectedStage,
    timePeriod,
    setTimePeriod,
    selectedBatch,
    setSelectedBatch,
  } = useSharedFilters(paramPeriod)

  useEffect(() => {
    if (!hasUrlFilters) return
    setSelectedSystem(paramSystem)
    setSelectedStage(paramStage)
    setTimePeriod(paramPeriod)
    setSelectedBatch(paramBatch)
  }, [hasUrlFilters, paramBatch, paramPeriod, paramStage, paramSystem, setSelectedBatch, setSelectedStage, setSelectedSystem, setTimePeriod])

  useEffect(() => {
    const params = new URLSearchParams()
    if (selectedSystem !== "all") params.set("system", selectedSystem)
    if (selectedStage !== "all") params.set("stage", selectedStage)
    params.set("period", timePeriod)
    if (selectedBatch !== "all") params.set("batch", selectedBatch)
    if (metricParam) params.set("metric", metricParam)
    if (startDateParam) params.set("startDate", startDateParam)
    if (endDateParam) params.set("endDate", endDateParam)

    router.replace(`/production?${params.toString()}`)
  }, [selectedSystem, selectedStage, timePeriod, selectedBatch, router, metricParam, startDateParam, endDateParam])

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <Link href="/">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Production Drilldown</h1>
            <p className="text-muted-foreground">
              System-level detail view for KPI follow-up and exception handling.
            </p>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <FarmSelector
            selectedBatch={selectedBatch}
            selectedSystem={selectedSystem}
            selectedStage={selectedStage}
            onBatchChange={setSelectedBatch}
            onSystemChange={setSelectedSystem}
            onStageChange={setSelectedStage}
            showStage={true}
            variant="default"
          />
          <TimePeriodSelector selectedPeriod={timePeriod} onPeriodChange={setTimePeriod} />
        </div>
      </div>

      {(metricParam || (startDateParam && endDateParam)) ? (
        <div className="rounded-lg border border-border/80 bg-card p-4 text-sm">
          <p className="font-medium text-foreground">KPI Drilldown Context</p>
          <p className="mt-1 text-muted-foreground">
            {metricParam ? `Metric: ${metricParam}. ` : ""}
            {startDateParam && endDateParam ? `Window: ${startDateParam} to ${endDateParam}.` : "Using selected period filter."}
          </p>
        </div>
      ) : null}

      <div className="space-y-3">
        <h2 className="text-lg font-semibold">KPI Snapshot</h2>
        <KPIOverview
          stage={selectedStage}
          timePeriod={timePeriod}
          batch={selectedBatch}
          system={selectedSystem}
          periodParam={periodParam}
        />
      </div>

      <SystemsTable
        stage={selectedStage}
        batch={selectedBatch}
        system={selectedSystem}
        timePeriod={timePeriod}
        periodParam={periodParam}
      />
    </div>
  )
}

export default function ProductionPage() {
    return (
        <DashboardLayout>
            <Suspense fallback={<div>Loading...</div>}>
                <ProductionContent />
            </Suspense>
        </DashboardLayout>
    )
}

