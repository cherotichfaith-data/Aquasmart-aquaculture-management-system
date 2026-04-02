"use client"

import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"
import { useActiveFarm } from "@/lib/hooks/app/use-active-farm"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useFingerlingSupplierOptions } from "@/lib/hooks/use-options"
import { useCreateFingerlingBatch, useCreateFingerlingSupplier } from "@/lib/hooks/use-reference-data"

interface BatchQuickCreateProps {
  onCreated?: () => void
}

export function BatchQuickCreate({ onCreated }: BatchQuickCreateProps) {
  const { farmId } = useActiveFarm()
  const suppliersQuery = useFingerlingSupplierOptions()
  const createSupplier = useCreateFingerlingSupplier()
  const createBatch = useCreateFingerlingBatch()

  const suppliers = suppliersQuery.data?.status === "success" ? suppliersQuery.data.data : []

  const [batchName, setBatchName] = useState("")
  const [dateOfDelivery, setDateOfDelivery] = useState(new Date().toISOString().split("T")[0])
  const [supplierId, setSupplierId] = useState("")
  const [numberOfFish, setNumberOfFish] = useState("")
  const [abw, setAbw] = useState("")
  const [showSupplierForm, setShowSupplierForm] = useState(false)
  const [supplierName, setSupplierName] = useState("")
  const [supplierCountry, setSupplierCountry] = useState("")
  const [supplierCity, setSupplierCity] = useState("")
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!supplierId && suppliers.length > 0) {
      setSupplierId(String(suppliers[0]?.id ?? ""))
    }
  }, [supplierId, suppliers])

  async function handleCreateSupplier() {
    if (!supplierName.trim() || !supplierCountry.trim()) {
      setError("Supplier name and country are required.")
      return
    }

    setError(null)
    const created = await createSupplier.mutateAsync({
      company_name: supplierName.trim(),
      location_country: supplierCountry.trim(),
      location_city: supplierCity.trim() || null,
    })
    const nextSupplierId = created.data?.id
    if (nextSupplierId != null) {
      setSupplierId(String(nextSupplierId))
    }
    setSupplierName("")
    setSupplierCountry("")
    setSupplierCity("")
    setShowSupplierForm(false)
  }

  async function handleCreateBatch() {
    if (!farmId) {
      setError("Select a farm before creating a batch.")
      return
    }
    if (!batchName.trim() || !dateOfDelivery || !supplierId) {
      setError("Batch name, delivery date, and supplier are required.")
      return
    }

    const numberOfFishValue = numberOfFish.trim() ? Number(numberOfFish) : null
    if (numberOfFish.trim() && (!Number.isFinite(numberOfFishValue) || numberOfFishValue == null || numberOfFishValue < 0)) {
      setError("Number of fish must be 0 or greater.")
      return
    }

    const abwValue = abw.trim() ? Number(abw) : null
    if (abw.trim() && (!Number.isFinite(abwValue) || abwValue == null || abwValue < 0)) {
      setError("ABW must be 0 or greater.")
      return
    }

    setError(null)
    await createBatch.mutateAsync({
      farm_id: farmId,
      name: batchName.trim(),
      date_of_delivery: dateOfDelivery,
      supplier_id: Number(supplierId),
      number_of_fish: numberOfFishValue,
      abw: abwValue,
    })

    setBatchName("")
    setDateOfDelivery(new Date().toISOString().split("T")[0])
    setNumberOfFish("")
    setAbw("")
    onCreated?.()
  }

  return (
    <div className="space-y-4 rounded-lg border border-border/80 bg-background p-4">
      <div className="space-y-1">
        <h3 className="font-medium">Create Batch</h3>
        <p className="text-sm text-muted-foreground">Set up the batch you need, then continue stocking.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="batch-name">Batch Name</Label>
          <Input id="batch-name" value={batchName} onChange={(event) => setBatchName(event.target.value)} placeholder="e.g. March Fry Delivery" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="batch-date">Date of Delivery</Label>
          <Input id="batch-date" type="date" value={dateOfDelivery} onChange={(event) => setDateOfDelivery(event.target.value)} />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <Label>Supplier</Label>
            <Button type="button" variant="ghost" size="sm" onClick={() => setShowSupplierForm((current) => !current)}>
              {showSupplierForm || suppliers.length === 0 ? "Hide supplier form" : "New supplier"}
            </Button>
          </div>
          <Select value={supplierId} onValueChange={setSupplierId} disabled={suppliersQuery.isLoading || suppliers.length === 0}>
            <SelectTrigger>
              <SelectValue placeholder={suppliersQuery.isLoading ? "Loading suppliers..." : "Select supplier"} />
            </SelectTrigger>
            <SelectContent>
              {suppliers.map((supplier) => (
                <SelectItem key={supplier.id} value={String(supplier.id)}>
                  {supplier.company_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="batch-fish-count">Number of Fish (Optional)</Label>
          <Input id="batch-fish-count" type="number" value={numberOfFish} onChange={(event) => setNumberOfFish(event.target.value)} />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="batch-abw">ABW (g) (Optional)</Label>
          <Input id="batch-abw" type="number" step="0.01" value={abw} onChange={(event) => setAbw(event.target.value)} />
        </div>
      </div>

      {(showSupplierForm || suppliers.length === 0) ? (
        <div className="space-y-4 rounded-lg border border-dashed border-border/80 bg-muted/20 p-4">
          <div className="space-y-1">
            <h4 className="font-medium">Add Supplier</h4>
            <p className="text-sm text-muted-foreground">Create a fingerling supplier if none exist yet.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="batch-supplier-name">Company Name</Label>
              <Input
                id="batch-supplier-name"
                value={supplierName}
                onChange={(event) => setSupplierName(event.target.value)}
                placeholder="e.g. Lake Hatchery"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="batch-supplier-country">Country</Label>
              <Input
                id="batch-supplier-country"
                value={supplierCountry}
                onChange={(event) => setSupplierCountry(event.target.value)}
                placeholder="e.g. Kenya"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="batch-supplier-city">City (Optional)</Label>
              <Input
                id="batch-supplier-city"
                value={supplierCity}
                onChange={(event) => setSupplierCity(event.target.value)}
                placeholder="e.g. Kisumu"
              />
            </div>
          </div>
          <Button type="button" variant="outline" onClick={handleCreateSupplier} disabled={createSupplier.isPending}>
            {createSupplier.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Save supplier
          </Button>
        </div>
      ) : null}

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <Button type="button" onClick={handleCreateBatch} disabled={createBatch.isPending}>
        {createBatch.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        Create batch
      </Button>
    </div>
  )
}
