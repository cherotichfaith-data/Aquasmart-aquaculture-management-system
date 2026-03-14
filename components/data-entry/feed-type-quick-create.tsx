"use client"

import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useFeedSupplierOptions } from "@/lib/hooks/use-options"
import { useCreateFeedSupplier, useCreateFeedType } from "@/lib/hooks/use-reference-data"
import type { Enums } from "@/lib/types/database"

const FEED_CATEGORIES: Enums<"feed_category">[] = [
  "pre-starter",
  "starter",
  "pre-grower",
  "grower",
  "finisher",
  "broodstock",
]

const FEED_PELLET_SIZES: Enums<"feed_pellet_size">[] = [
  "mash_powder",
  "<0.49mm",
  "0.5-0.99mm",
  "1.0-1.5mm",
  "1.5-1.99mm",
  "2mm",
  "2.5mm",
  "3mm",
]

interface FeedTypeQuickCreateProps {
  onCreated?: () => void
}

export function FeedTypeQuickCreate({ onCreated }: FeedTypeQuickCreateProps) {
  const suppliersQuery = useFeedSupplierOptions()
  const createSupplier = useCreateFeedSupplier()
  const createFeedType = useCreateFeedType()

  const suppliers = suppliersQuery.data?.status === "success" ? suppliersQuery.data.data : []

  const [feedLine, setFeedLine] = useState("")
  const [feedCategory, setFeedCategory] = useState<Enums<"feed_category">>("starter")
  const [pelletSize, setPelletSize] = useState<Enums<"feed_pellet_size">>("2mm")
  const [protein, setProtein] = useState("")
  const [fat, setFat] = useState("")
  const [supplierId, setSupplierId] = useState("")
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
    const nextSupplierId = created[0]?.id
    if (nextSupplierId != null) {
      setSupplierId(String(nextSupplierId))
    }
    setSupplierName("")
    setSupplierCountry("")
    setSupplierCity("")
    setShowSupplierForm(false)
  }

  async function handleCreateFeedType() {
    if (!supplierId) {
      setError("Select a supplier before creating a feed type.")
      return
    }

    const proteinValue = Number(protein)
    if (!Number.isFinite(proteinValue) || proteinValue <= 0) {
      setError("Protein percentage must be greater than 0.")
      return
    }

    const fatValue = fat.trim() ? Number(fat) : null
    if (fat.trim() && (!Number.isFinite(fatValue) || fatValue == null || fatValue < 0)) {
      setError("Fat percentage must be 0 or greater.")
      return
    }

    setError(null)
    await createFeedType.mutateAsync({
      feed_line: feedLine.trim() || null,
      feed_category: feedCategory,
      feed_pellet_size: pelletSize,
      crude_protein_percentage: proteinValue,
      crude_fat_percentage: fatValue,
      feed_supplier: Number(supplierId),
    })

    setFeedLine("")
    setProtein("")
    setFat("")
    onCreated?.()
  }

  return (
    <div className="space-y-4 rounded-lg border border-border/80 bg-background p-4">
      <div className="space-y-1">
        <h3 className="font-medium">Add Feed Type</h3>
        <p className="text-sm text-muted-foreground">Create the missing feed type without leaving data entry.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="feed-line">Feed Line</Label>
          <Input id="feed-line" value={feedLine} onChange={(event) => setFeedLine(event.target.value)} placeholder="e.g. Grower 2mm" />
        </div>
        <div className="space-y-2">
          <Label>Feed Category</Label>
          <Select value={feedCategory} onValueChange={(value) => setFeedCategory(value as Enums<"feed_category">)}>
            <SelectTrigger>
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {FEED_CATEGORIES.map((item) => (
                <SelectItem key={item} value={item}>
                  {item}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Pellet Size</Label>
          <Select value={pelletSize} onValueChange={(value) => setPelletSize(value as Enums<"feed_pellet_size">)}>
            <SelectTrigger>
              <SelectValue placeholder="Select pellet size" />
            </SelectTrigger>
            <SelectContent>
              {FEED_PELLET_SIZES.map((item) => (
                <SelectItem key={item} value={item}>
                  {item}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="protein">Protein %</Label>
          <Input id="protein" type="number" step="0.1" value={protein} onChange={(event) => setProtein(event.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="fat">Fat % (Optional)</Label>
          <Input id="fat" type="number" step="0.1" value={fat} onChange={(event) => setFat(event.target.value)} />
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
      </div>

      {(showSupplierForm || suppliers.length === 0) ? (
        <div className="space-y-4 rounded-lg border border-dashed border-border/80 bg-muted/20 p-4">
          <div className="space-y-1">
            <h4 className="font-medium">Add Supplier</h4>
            <p className="text-sm text-muted-foreground">Create a supplier first if none exist.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="feed-supplier-name">Company Name</Label>
              <Input
                id="feed-supplier-name"
                value={supplierName}
                onChange={(event) => setSupplierName(event.target.value)}
                placeholder="e.g. Aqua Feeds Ltd"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="feed-supplier-country">Country</Label>
              <Input
                id="feed-supplier-country"
                value={supplierCountry}
                onChange={(event) => setSupplierCountry(event.target.value)}
                placeholder="e.g. Kenya"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="feed-supplier-city">City (Optional)</Label>
              <Input
                id="feed-supplier-city"
                value={supplierCity}
                onChange={(event) => setSupplierCity(event.target.value)}
                placeholder="e.g. Nairobi"
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

      <Button type="button" onClick={handleCreateFeedType} disabled={createFeedType.isPending}>
        {createFeedType.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        Add feed type
      </Button>
    </div>
  )
}
