"use client"

import { useEffect, useMemo, useState } from "react"
import { AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useFeedIncoming, useFeedTypes } from "@/lib/hooks/use-reports"
import { useDailyFishInventory } from "@/lib/hooks/use-inventory"
import { useActiveFarm } from "@/hooks/use-active-farm"
import { useBatchSystemIds } from "@/lib/hooks/use-reports"
import { useSystemOptions } from "@/lib/hooks/use-options"

type PurchaseOrderStatus = "Pending" | "Received" | "Confirmed"
type PurchaseOrder = {
  id: string
  createdAt: string
  quantityKg: number
  status: PurchaseOrderStatus
}

export default function FeedInventory({
  selectedBatch,
  selectedSystem,
  selectedStage,
}: {
  selectedBatch: string
  selectedSystem: string
  selectedStage: "all" | "nursing" | "grow_out"
}) {
  const { farmId } = useActiveFarm()
  const feedIncomingQuery = useFeedIncoming()
  const feedTypesQuery = useFeedTypes()
  const inventoryQuery = useDailyFishInventory({ farmId, limit: 5000, orderAsc: true })
  const systemsQuery = useSystemOptions({ farmId, stage: selectedStage, activeOnly: true })
  const batchId = selectedBatch !== "all" ? Number(selectedBatch) : undefined
  const batchSystemIdsQuery = useBatchSystemIds({ batchId: Number.isFinite(batchId) ? batchId : undefined })

  const feedData = feedIncomingQuery.data?.status === "success" ? feedIncomingQuery.data.data : []
  const inventoryRows = inventoryQuery.data?.status === "success" ? inventoryQuery.data.data : []
  const feedTypes = feedTypesQuery.data?.status === "success" ? feedTypesQuery.data.data : []
  const loading =
    feedIncomingQuery.isLoading || feedTypesQuery.isLoading || inventoryQuery.isLoading || systemsQuery.isLoading

  const stageSystemIds = useMemo(
    () =>
      systemsQuery.data?.status === "success"
        ? systemsQuery.data.data.map((row) => row.id).filter((id): id is number => typeof id === "number")
        : [],
    [systemsQuery.data],
  )

  const scopedSystemIds = useMemo(() => {
    const set = new Set(stageSystemIds)
    let scoped = set
    if (selectedBatch !== "all") {
      const batchIds =
        batchSystemIdsQuery.data?.status === "success"
          ? batchSystemIdsQuery.data.data.map((row) => row.system_id)
          : []
      scoped = new Set(batchIds.filter((id) => set.has(id)))
    }
    if (selectedSystem !== "all") {
      const parsed = Number(selectedSystem)
      if (Number.isFinite(parsed)) {
        return new Set(Array.from(scoped).filter((id) => id === parsed))
      }
      return new Set<number>()
    }
    return scoped
  }, [batchSystemIdsQuery.data, selectedBatch, selectedSystem, stageSystemIds])

  const [reorderThresholdDays, setReorderThresholdDays] = useState(7)
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([])
  const [poQuantity, setPoQuantity] = useState("")
  const poStorageKey = farmId ? `aqua_feed_purchase_orders_${farmId}` : "aqua_feed_purchase_orders"

  useEffect(() => {
    if (typeof window === "undefined") return
    const raw = window.localStorage.getItem(poStorageKey)
    if (!raw) return
    try {
      const parsed = JSON.parse(raw) as PurchaseOrder[]
      if (Array.isArray(parsed)) setPurchaseOrders(parsed)
    } catch {
      // Ignore malformed saved value.
    }
  }, [poStorageKey])

  useEffect(() => {
    if (typeof window === "undefined") return
    window.localStorage.setItem(poStorageKey, JSON.stringify(purchaseOrders))
  }, [poStorageKey, purchaseOrders])

  const filteredInventoryRows = useMemo(
    () => inventoryRows.filter((row) => row.system_id != null && scopedSystemIds.has(row.system_id)),
    [inventoryRows, scopedSystemIds],
  )

  const totalIncomingKg = feedData.reduce((sum, row) => sum + (row.feed_amount ?? 0), 0)
  const totalConsumptionKg = filteredInventoryRows.reduce((sum, row) => sum + (row.feeding_amount ?? 0), 0)
  const onHandKg = Math.max(0, totalIncomingKg - totalConsumptionKg)

  const consumptionByDate = useMemo(() => {
    const map = new Map<string, number>()
    filteredInventoryRows.forEach((row) => {
      if (!row.inventory_date) return
      map.set(row.inventory_date, (map.get(row.inventory_date) ?? 0) + (row.feeding_amount ?? 0))
    })
    return Array.from(map.entries()).sort(([a], [b]) => b.localeCompare(a))
  }, [filteredInventoryRows])

  const recent14 = consumptionByDate.slice(0, 14)
  const avgDailyConsumptionKg =
    recent14.length > 0 ? recent14.reduce((sum, [, value]) => sum + value, 0) / recent14.length : 0
  const daysSupplyRemaining = avgDailyConsumptionKg > 0 ? onHandKg / avgDailyConsumptionKg : null
  const needsReorder = daysSupplyRemaining !== null && daysSupplyRemaining <= reorderThresholdDays
  const recommendedOrderKg =
    avgDailyConsumptionKg > 0 ? Math.max(0, Math.ceil(avgDailyConsumptionKg * reorderThresholdDays - onHandKg)) : 0

  const addPurchaseOrder = () => {
    const qty = Number(poQuantity)
    if (!Number.isFinite(qty) || qty <= 0) return
    const next: PurchaseOrder = {
      id: `${Date.now()}`,
      createdAt: new Date().toISOString(),
      quantityKg: qty,
      status: "Pending",
    }
    setPurchaseOrders((prev) => [next, ...prev])
    setPoQuantity("")
  }

  const updatePurchaseOrderStatus = (id: string, status: PurchaseOrderStatus) => {
    setPurchaseOrders((prev) => prev.map((po) => (po.id === id ? { ...po, status } : po)))
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-sm text-muted-foreground mb-1">Feed Types</p>
          <p className="text-3xl font-bold">{feedTypes.length}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-sm text-muted-foreground mb-1">Current Feed On Hand</p>
          <p className="text-3xl font-bold">{onHandKg.toLocaleString(undefined, { maximumFractionDigits: 1 })} kg</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-sm text-muted-foreground mb-1">Avg Daily Consumption</p>
          <p className="text-3xl font-bold">{avgDailyConsumptionKg.toLocaleString(undefined, { maximumFractionDigits: 1 })} kg</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-sm text-muted-foreground mb-1">Days Supply Remaining</p>
          <p className="text-3xl font-bold">
            {daysSupplyRemaining == null ? "--" : daysSupplyRemaining.toLocaleString(undefined, { maximumFractionDigits: 1 })}
          </p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-sm text-muted-foreground mb-1">Reorder Recommendation</p>
          <p className="text-3xl font-bold">{recommendedOrderKg.toLocaleString()} kg</p>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold">Feed Reorder Management</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Auto-calculate reorder quantity using recent consumption trends.
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <label htmlFor="reorder-threshold-days" className="text-muted-foreground">Reorder threshold (days)</label>
            <input
              id="reorder-threshold-days"
              type="number"
              min={1}
              value={reorderThresholdDays}
              onChange={(event) => setReorderThresholdDays(Math.max(1, Number(event.target.value) || 1))}
              className="h-9 w-20 rounded-md border border-input bg-background px-2"
            />
          </div>
        </div>
        {needsReorder ? (
          <div className="mt-3 inline-flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            <AlertTriangle className="h-4 w-4" />
            Stock is below reorder threshold. Recommended reorder: {recommendedOrderKg.toLocaleString()} kg.
          </div>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">Stock level is within target days-supply threshold.</p>
        )}

        <div className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-[160px_160px_1fr]">
          <input
            type="number"
            min={1}
            placeholder="PO quantity (kg)"
            value={poQuantity}
            onChange={(event) => setPoQuantity(event.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          />
          <Button type="button" onClick={addPurchaseOrder} className="h-9 text-sm">
            Add Purchase Order
          </Button>
        </div>

        <div className="mt-4 overflow-x-auto rounded-md border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/40 border-b border-border">
                <th className="px-4 py-2 text-left font-semibold">Created</th>
                <th className="px-4 py-2 text-left font-semibold">Quantity (kg)</th>
                <th className="px-4 py-2 text-left font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {purchaseOrders.length > 0 ? (
                purchaseOrders.map((po) => (
                  <tr key={po.id} className="border-b border-border">
                    <td className="px-4 py-2">{new Date(po.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-2">{po.quantityKg.toLocaleString()}</td>
                    <td className="px-4 py-2">
                      <select
                        value={po.status}
                        onChange={(event) => updatePurchaseOrderStatus(po.id, event.target.value as PurchaseOrderStatus)}
                        className="h-8 rounded-md border border-input bg-background px-2 text-sm"
                      >
                        <option>Pending</option>
                        <option>Received</option>
                        <option>Confirmed</option>
                      </select>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3} className="px-4 py-4 text-center text-muted-foreground">
                    No purchase orders tracked yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="p-4 border-b border-border">
          <h3 className="font-semibold">Incoming Feed Shipments</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 border-b border-border">
                <th className="px-4 py-3 text-left font-semibold">Feed Type</th>
                <th className="px-4 py-3 text-left font-semibold">Category</th>
                <th className="px-4 py-3 text-left font-semibold">Protein %</th>
                <th className="px-4 py-3 text-left font-semibold">Pellet Size</th>
                <th className="px-4 py-3 text-left font-semibold">Amount (kg)</th>
                <th className="px-4 py-3 text-left font-semibold">Date</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">
                    Loading...
                  </td>
                </tr>
              ) : feedData.length > 0 ? (
                feedData.map((row) => (
                  <tr key={row.id} className="border-b border-border hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">
                      {row.feed_type?.feed_line ?? `Feed ${row.feed_type_id ?? "N/A"}`}
                    </td>
                    <td className="px-4 py-3">{row.feed_type?.feed_category ?? "-"}</td>
                    <td className="px-4 py-3">{row.feed_type?.crude_protein_percentage ?? "-"}</td>
                    <td className="px-4 py-3">{row.feed_type?.feed_pellet_size ?? "-"}</td>
                    <td className="px-4 py-3">{row.feed_amount}</td>
                    <td className="px-4 py-3">{row.date}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">
                    No feed shipments found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
