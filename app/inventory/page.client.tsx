"use client"

import { useState } from "react"
import DashboardLayout from "@/components/layout/dashboard-layout"
import FarmSelector from "@/components/shared/farm-selector"
import { useSharedFilters } from "@/hooks/use-shared-filters"
import FeedInventory from "@/components/inventory/feed-inventory"
import FishInventory from "@/components/inventory/fish-inventory"
import ReconciliationReport from "@/components/inventory/reconciliation-report"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function InventoryPage() {
  const [activeTab, setActiveTab] = useState("fish")
  const {
    selectedBatch,
    setSelectedBatch,
    selectedSystem,
    setSelectedSystem,
    selectedStage,
    setSelectedStage,
  } = useSharedFilters()

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4">
          <div>
            <h1 className="text-3xl font-bold">Inventory Management</h1>
            <p className="text-muted-foreground mt-1">Track feed stock and fish inventory</p>
          </div>

          <FarmSelector
            selectedBatch={selectedBatch}
            selectedSystem={selectedSystem}
            selectedStage={selectedStage}
            onBatchChange={setSelectedBatch}
            onSystemChange={setSelectedSystem}
            onStageChange={setSelectedStage}
          />
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
            />
          </TabsContent>

          <TabsContent value="feed" className="mt-6">
            <FeedInventory
              selectedBatch={selectedBatch}
              selectedSystem={selectedSystem}
              selectedStage={selectedStage}
            />
          </TabsContent>

          <TabsContent value="reconciliation" className="mt-6">
            <ReconciliationReport
              selectedBatch={selectedBatch}
              selectedSystem={selectedSystem}
              selectedStage={selectedStage}
            />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  )
}

