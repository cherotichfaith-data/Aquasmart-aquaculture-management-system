"use client"

import { useEffect, useMemo, useState } from "react"
import { Download, TriangleAlert } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useActiveFarm } from "@/hooks/use-active-farm"
import { useDailyFishInventory } from "@/lib/hooks/use-inventory"
import { useBatchSystemIds } from "@/lib/hooks/use-reports"
import { useSystemOptions } from "@/lib/hooks/use-options"
import { DataErrorState, DataFetchingBadge, DataUpdatedAt } from "@/components/shared/data-states"
import { getErrorMessage, getQueryResultError } from "@/lib/utils/query-result"

export default function ReconciliationReport({
  selectedBatch,
  selectedSystem,
  selectedStage,
}: {
  selectedBatch: string
  selectedSystem: string
  selectedStage: "all" | "nursing" | "grow_out"
}) {
  const { farmId } = useActiveFarm()
  const systemId = selectedSystem !== "all" ? Number(selectedSystem) : undefined
  const batchId = selectedBatch !== "all" ? Number(selectedBatch) : undefined
  const [reconDate, setReconDate] = useState(new Date().toISOString().slice(0, 10))
  const [countedBySystem, setCountedBySystem] = useState<Record<number, number>>({})

  const inventoryQuery = useDailyFishInventory({
    farmId,
    systemId: Number.isFinite(systemId) ? systemId : undefined,
    limit: 5000,
    orderAsc: true,
  })
  const systemsQuery = useSystemOptions({
    farmId,
    stage: selectedStage,
    activeOnly: true,
  })
  const batchSystemIdsQuery = useBatchSystemIds({
    batchId: Number.isFinite(batchId) ? batchId : undefined,
  })

  const storageKey = farmId ? `aqua_inventory_recon_${farmId}_${reconDate}` : `aqua_inventory_recon_${reconDate}`

  useEffect(() => {
    if (typeof window === "undefined") return
    const raw = window.localStorage.getItem(storageKey)
    if (!raw) {
      setCountedBySystem({})
      return
    }
    try {
      const parsed = JSON.parse(raw) as Record<number, number>
      setCountedBySystem(parsed ?? {})
    } catch {
      setCountedBySystem({})
    }
  }, [storageKey])

  useEffect(() => {
    if (typeof window === "undefined") return
    window.localStorage.setItem(storageKey, JSON.stringify(countedBySystem))
  }, [countedBySystem, storageKey])

  const scopedSystemIds = useMemo(() => {
    const stageIds =
      systemsQuery.data?.status === "success"
        ? systemsQuery.data.data.map((row) => row.id).filter((id): id is number => typeof id === "number")
        : []
    const stageSet = new Set(stageIds)
    if (selectedBatch === "all") return stageSet
    const batchIds =
      batchSystemIdsQuery.data?.status === "success"
        ? batchSystemIdsQuery.data.data.map((row) => row.system_id)
        : []
    return new Set(batchIds.filter((id) => stageSet.has(id)))
  }, [batchSystemIdsQuery.data, selectedBatch, systemsQuery.data])

  const rows = inventoryQuery.data?.status === "success" ? inventoryQuery.data.data : []
  const loading = inventoryQuery.isLoading || systemsQuery.isLoading || batchSystemIdsQuery.isLoading
  const errorMessages = [
    getErrorMessage(inventoryQuery.error),
    getQueryResultError(inventoryQuery.data),
    getErrorMessage(systemsQuery.error),
    getQueryResultError(systemsQuery.data),
    getErrorMessage(batchSystemIdsQuery.error),
    getQueryResultError(batchSystemIdsQuery.data),
  ].filter(Boolean) as string[]
  const latestUpdatedAt = Math.max(
    inventoryQuery.dataUpdatedAt ?? 0,
    systemsQuery.dataUpdatedAt ?? 0,
    batchSystemIdsQuery.dataUpdatedAt ?? 0,
  )

  const latestBySystem = useMemo(() => {
    const map = new Map<number, (typeof rows)[number]>()
    rows.forEach((row) => {
      if (row.system_id == null || !row.inventory_date) return
      if (!scopedSystemIds.has(row.system_id)) return
      const existing = map.get(row.system_id)
      if (!existing || String(row.inventory_date) > String(existing.inventory_date ?? "")) {
        map.set(row.system_id, row)
      }
    })
    return Array.from(map.values()).sort((a, b) => (a.system_id ?? 0) - (b.system_id ?? 0))
  }, [rows, scopedSystemIds])

  const reconciledRows = latestBySystem.map((row) => {
    const recorded = row.number_of_fish ?? 0
    const counted = countedBySystem[row.system_id ?? 0]
    const variance = typeof counted === "number" ? counted - recorded : null
    const variancePct = recorded > 0 && variance != null ? (variance / recorded) * 100 : null
    const flagged = variancePct != null && Math.abs(variancePct) >= 5
    return {
      systemId: row.system_id ?? 0,
      date: row.inventory_date ?? "",
      recorded,
      counted,
      variance,
      variancePct,
      flagged,
    }
  })

  const flaggedCount = reconciledRows.filter((row) => row.flagged).length
  const exportCsv = () => {
    if (!reconciledRows.length) return
    const header = ["date", "system_id", "recorded_count", "counted_count", "variance", "variance_percent", "flagged"]
    const data = reconciledRows.map((row) =>
      [
        row.date,
        row.systemId,
        row.recorded,
        row.counted ?? "",
        row.variance ?? "",
        row.variancePct == null ? "" : row.variancePct.toFixed(2),
        row.flagged ? "yes" : "no",
      ].join(","),
    )
    const csv = [header.join(","), ...data].join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `inventory_reconciliation_${reconDate}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  if (errorMessages.length > 0) {
    return (
      <DataErrorState
        title="Unable to load reconciliation data"
        description={errorMessages[0]}
        onRetry={() => {
          inventoryQuery.refetch()
          systemsQuery.refetch()
          batchSystemIdsQuery.refetch()
        }}
      />
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <DataUpdatedAt updatedAt={latestUpdatedAt} />
        <DataFetchingBadge isFetching={inventoryQuery.isFetching} isLoading={loading} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-sm text-muted-foreground mb-1">Systems Reconciled</p>
          <p className="text-3xl font-bold">{reconciledRows.length}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-sm text-muted-foreground mb-1">Flagged Variances (&gt;=5%)</p>
          <p className="text-3xl font-bold text-destructive">{flaggedCount}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-sm text-muted-foreground mb-1">Reconciliation Date</p>
          <input
            type="date"
            value={reconDate}
            onChange={(event) => setReconDate(event.target.value)}
            className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
          />
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="font-semibold">Inventory Reconciliation</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Compare recorded stock with physical counts and flag variances at or above 5%.
              </p>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={exportCsv} disabled={!reconciledRows.length}>
              <Download className="h-4 w-4 mr-1" />
              Export Report
            </Button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 border-b border-border">
                <th className="px-4 py-3 text-left font-semibold">Date</th>
                <th className="px-4 py-3 text-left font-semibold">System</th>
                <th className="px-4 py-3 text-left font-semibold">Recorded Count</th>
                <th className="px-4 py-3 text-left font-semibold">Physical Count</th>
                <th className="px-4 py-3 text-left font-semibold">Variance</th>
                <th className="px-4 py-3 text-left font-semibold">Variance %</th>
                <th className="px-4 py-3 text-left font-semibold">Flag</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-muted-foreground">
                    Loading...
                  </td>
                </tr>
              ) : reconciledRows.length > 0 ? (
                reconciledRows.map((row) => (
                  <tr key={`${row.systemId}-${row.date}`} className="border-b border-border hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">{row.date}</td>
                    <td className="px-4 py-3">{row.systemId}</td>
                    <td className="px-4 py-3">{row.recorded.toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        min={0}
                        value={row.counted ?? ""}
                        onChange={(event) => {
                          const raw = event.target.value
                          setCountedBySystem((prev) => {
                            const next = { ...prev }
                            if (raw === "") {
                              delete next[row.systemId]
                              return next
                            }
                            next[row.systemId] = Number(raw)
                            return next
                          })
                        }}
                        className="h-8 w-28 rounded-md border border-input bg-background px-2"
                      />
                    </td>
                    <td className="px-4 py-3">{row.variance == null ? "-" : row.variance.toLocaleString()}</td>
                    <td className="px-4 py-3">
                      {row.variancePct == null ? "-" : `${row.variancePct.toLocaleString(undefined, { maximumFractionDigits: 2 })}%`}
                    </td>
                    <td className="px-4 py-3">
                      {row.flagged ? (
                        <span className="inline-flex items-center gap-1 text-destructive">
                          <TriangleAlert className="h-4 w-4" />
                          Flagged
                        </span>
                      ) : (
                        <span className="text-muted-foreground">OK</span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-muted-foreground">
                    No reconciliation data found
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
