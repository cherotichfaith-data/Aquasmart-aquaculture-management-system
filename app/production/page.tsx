"use client"

import { Suspense, useState, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import DashboardLayout from "@/components/layout/dashboard-layout"
import KPIOverview from "@/components/dashboard/kpi-overview"
import AnalysisOverview from "@/components/dashboard/analysis-overview"
import SystemsTable from "@/components/dashboard/systems-table"
import FarmSelector from "@/components/shared/farm-selector"
import TimePeriodSelector, { type TimePeriod } from "@/components/shared/time-period-selector"
import type { Enums } from "@/lib/types/database"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

function ProductionContent() {
    const searchParams = useSearchParams()
    const router = useRouter()

    const paramSystem = searchParams.get("system") ?? "all"
    const paramStage = searchParams.get("stage") as "all" | Enums<"system_growth_stage"> ?? "all"
    const paramPeriod = (searchParams.get("period") as TimePeriod) ?? "week"
    const paramBatch = searchParams.get("batch") ?? "all"

    // Sync state with URL params
    const [selectedSystem, setSelectedSystem] = useState<string>(paramSystem)
    const [selectedStage, setSelectedStage] = useState<"all" | Enums<"system_growth_stage">>(paramStage)
    const [timePeriod, setTimePeriod] = useState<TimePeriod>(paramPeriod)
    const [selectedBatch, setSelectedBatch] = useState<string>(paramBatch)

    // Update URL when state changes
    useEffect(() => {
        const params = new URLSearchParams()
        if (selectedSystem !== "all") params.set("system", selectedSystem)
        if (selectedStage !== "all") params.set("stage", selectedStage)
        params.set("period", timePeriod)
        if (selectedBatch !== "all") params.set("batch", selectedBatch)

        router.replace(`/production?${params.toString()}`)
    }, [selectedSystem, selectedStage, timePeriod, selectedBatch, router])

    return (
        <div className="space-y-8">
            <div className="flex flex-col gap-4">
                <div className="flex items-center gap-2">
                    <Link href="/">
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-3xl font-bold">Production Analytics</h1>
                        <p className="text-muted-foreground">
                            Detailed performance metrics and data analysis
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

            {/* <KPIOverview stage={selectedStage} timePeriod={timePeriod} batch={selectedBatch} system={selectedSystem} /> */}

            <AnalysisOverview
                stage={selectedStage === "all" ? null : selectedStage}
                system={selectedSystem}
                timePeriod={timePeriod}
            />

            <SystemsTable
                stage={selectedStage === "all" ? "grow_out" : selectedStage}
                batch={selectedBatch}
                system={selectedSystem}
                timePeriod={timePeriod}
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
