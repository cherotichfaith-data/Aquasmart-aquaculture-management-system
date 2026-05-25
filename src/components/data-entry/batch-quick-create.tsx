"use client"

import { useEffect, useMemo, useState } from "react"
import { Loader2 } from "lucide-react"
import { useActiveFarm } from "@/lib/hooks/app/use-active-farm"
import { Button } from "@/components/app-ui/button"
import { Input } from "@/components/app-ui/input"
import { Label } from "@/components/app-ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/app-ui/select"
import { useFingerlingSupplierOptions } from "@/lib/hooks/use-options"
import { useCreateFingerlingBatch } from "@/lib/hooks/use-reference-data"
import { formatCageLabel, type SystemOption } from "@/lib/system-options"
import type { Database } from "@/lib/types/database"

interface BatchQuickCreateProps {
  defaultSystemId?: number | null
  onCreated?: (batch: Database["public"]["Tables"]["fingerling_batch"]["Row"]) => void
  systems: SystemOption[]
}

export function BatchQuickCreate({ defaultSystemId = null, onCreated, systems }: BatchQuickCreateProps) {
  const { farmId } = useActiveFarm()
  const suppliersQuery = useFingerlingSupplierOptions()
  const createBatch = useCreateFingerlingBatch()

  const suppliers = suppliersQuery.data?.status === "success" ? suppliersQuery.data.data : []
  const activeSystems = useMemo(() => systems.filter((system) => system.is_active !== false), [systems])

  const [batchName, setBatchName] = useState("")
  const [dateOfDelivery, setDateOfDelivery] = useState(new Date().toISOString().split("T")[0])
  const [systemId, setSystemId] = useState(defaultSystemId ? String(defaultSystemId) : "")
  const [supplierId, setSupplierId] = useState("")
  const [numberOfFish, setNumberOfFish] = useState("")
  const [abw, setAbw] = useState("")
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (supplierId && suppliers.some((supplier) => String(supplier.id) === supplierId)) return
    if (suppliers.length > 0) {
      setSupplierId(String(suppliers[0]?.id ?? ""))
    } else if (supplierId) {
      setSupplierId("")
    }
  }, [supplierId, suppliers])

  useEffect(() => {
    if (systemId && activeSystems.some((system) => String(system.id) === systemId)) return
    if (defaultSystemId && activeSystems.some((system) => system.id === defaultSystemId)) {
      setSystemId(String(defaultSystemId))
    } else if (systemId) {
      setSystemId("")
    }
  }, [activeSystems, defaultSystemId, systemId])

  async function handleCreateBatch() {
    if (!farmId) {
      setError("Select a farm before creating a batch.")
      return
    }
    if (!batchName.trim() || !dateOfDelivery || !supplierId) {
      setError("Batch name, delivery date, and supplier are required.")
      return
    }

    if (!systemId) {
      setError("Select a cage before creating a batch.")
      return
    }

    if (!numberOfFish.trim()) {
      setError("Number of fish is required.")
      return
    }

    const numberOfFishValue = Number(numberOfFish)
    if (!Number.isFinite(numberOfFishValue) || numberOfFishValue <= 0) {
      setError("Number of fish must be greater than 0.")
      return
    }

    if (!abw.trim()) {
      setError("ABW is required.")
      return
    }

    const abwValue = Number(abw)
    if (!Number.isFinite(abwValue) || abwValue <= 0) {
      setError("ABW must be greater than 0.")
      return
    }

    setError(null)

    try {
      const created = await createBatch.mutateAsync({
        farm_id: farmId,
        name: batchName.trim(),
        date_of_delivery: dateOfDelivery,
        supplier_id: Number(supplierId),
        system_id: Number(systemId),
        number_of_fish: numberOfFishValue,
        abw: abwValue,
      })

      setBatchName("")
      setDateOfDelivery(new Date().toISOString().split("T")[0])
      setNumberOfFish("")
      setAbw("")
      onCreated?.(created.data)
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unable to create fingerling batch.")
    }
  }

  return (
    <div className="space-y-4 rounded-lg border border-border/80 bg-background p-4">
      <div className="space-y-1">
        <h3 className="font-medium">Create Batch</h3>
        <p className="text-sm text-muted-foreground">Set up the batch you need, then continue stocking.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="batch-name">Batch Number / Name</Label>
          <Input id="batch-name" value={batchName} onChange={(event) => setBatchName(event.target.value)} placeholder="e.g. Batch 2026-05-A" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="batch-date">Date of Delivery</Label>
          <Input id="batch-date" type="date" value={dateOfDelivery} onChange={(event) => setDateOfDelivery(event.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Supplier</Label>
          <Select value={supplierId} onValueChange={setSupplierId} disabled={suppliersQuery.isLoading || suppliers.length === 0}>
            <SelectTrigger>
              <SelectValue
                placeholder={
                  suppliersQuery.isLoading
                    ? "Loading suppliers..."
                    : suppliers.length === 0
                      ? "No suppliers found"
                      : "Select supplier"
                }
              />
            </SelectTrigger>
            <SelectContent>
              {suppliers.map((supplier) => (
                <SelectItem key={supplier.id} value={String(supplier.id)}>
                  {supplier.company_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {suppliersQuery.data?.status === "error" ? (
            <p className="text-xs text-destructive">{suppliersQuery.data.error}</p>
          ) : null}
          {!suppliersQuery.isLoading && suppliers.length === 0 ? (
            <p className="text-xs text-muted-foreground">Add fingerling suppliers in the supplier form first.</p>
          ) : null}
        </div>
        <div className="space-y-2">
          <Label>Cage</Label>
          <Select value={systemId} onValueChange={setSystemId} disabled={activeSystems.length === 0}>
            <SelectTrigger>
              <SelectValue placeholder={activeSystems.length === 0 ? "No active cages found" : "Select cage"} />
            </SelectTrigger>
            <SelectContent>
              {activeSystems.map((system) => (
                <SelectItem key={system.id} value={String(system.id)}>
                  {formatCageLabel(system)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="batch-fish-count">Number of Fish</Label>
          <Input id="batch-fish-count" type="number" value={numberOfFish} onChange={(event) => setNumberOfFish(event.target.value)} />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="batch-abw">ABW (g)</Label>
          <Input id="batch-abw" type="number" step="0.01" value={abw} onChange={(event) => setAbw(event.target.value)} />
        </div>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <Button type="button" onClick={handleCreateBatch} disabled={createBatch.isPending || suppliers.length === 0 || activeSystems.length === 0}>
        {createBatch.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        Create batch
      </Button>
    </div>
  )
}

