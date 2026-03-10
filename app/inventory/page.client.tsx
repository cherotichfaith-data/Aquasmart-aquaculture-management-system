"use client"

import { useState } from "react"
import DashboardLayout from "@/components/layout/dashboard-layout"
import { useSharedFilters } from "@/hooks/use-shared-filters"
import { useActiveFarm } from "@/hooks/use-active-farm"
import { useTimePeriodBounds } from "@/hooks/use-time-period-bounds"
import FeedInventory from "@/components/inventory/feed-inventory"
import FishInventory from "@/components/inventory/fish-inventory"
import ReconciliationReport from "@/components/inventory/reconciliation-report"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function InventoryPage() {
  const [activeTab, setActiveTab] = useState("fish")
  const { farmId } = useActiveFarm()
  const {
    selectedBatch,
    selectedSystem,
    selectedStage,
    timePeriod,
  } = useSharedFilters()
  const boundsQuery = useTimePeriodBounds({ farmId, timePeriod })
  const dateFrom = boundsQuery.start ?? undefined
  const dateTo = boundsQuery.end ?? undefined
  const boundsReady = boundsQuery.hasBounds

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4">
          <div>
            <h1 className="text-3xl font-bold">Inventory Management</h1>
            <p className="text-muted-foreground mt-1">Track feed stock and fish inventory</p>
          </div>

        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full max-w-2xl grid-cols-3">
            <TabsTrigger value="fish">Fish Inventory</TabsTrigger>
            <TabsTrigger value="feed">Feed Stock</TabsTrigger>
            <TabsTrigger value="reconciliation">Reconciliation</TabsTrigger>
          </TabsList>

          <TabsContent value="fish" className="mt-6">
            <FishInventory
              selectedBatch={selectedBatch}
              selectedSystem={selectedSystem}
              selectedStage={selectedStage}
              dateFrom={dateFrom}
              dateTo={dateTo}
              boundsReady={boundsReady}
            />
          </TabsContent>

          <TabsContent value="feed" className="mt-6">
            <FeedInventory
              selectedBatch={selectedBatch}
              selectedSystem={selectedSystem}
              selectedStage={selectedStage}
              dateFrom={dateFrom}
              dateTo={dateTo}
              boundsReady={boundsReady}
            />
          </TabsContent>

          <TabsContent value="reconciliation" className="mt-6">
            <ReconciliationReport
              selectedBatch={selectedBatch}
              selectedSystem={selectedSystem}
              selectedStage={selectedStage}
              dateFrom={dateFrom}
              dateTo={dateTo}
              boundsReady={boundsReady}
            />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  )
}

