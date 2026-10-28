"use client"

import { useState } from "react"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/app-ui/button"
import { Input } from "@/components/app-ui/input"
import { Label } from "@/components/app-ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/app-ui/select"
import { useFeedSupplierOptions } from "@/lib/hooks/use-options"
import { useCreateFeedType } from "@/lib/hooks/use-reference-data"
import { Constants, type Database } from "@/lib/types/database"

type FeedTypeOption = Database["public"]["Functions"]["api_feed_type_options_rpc"]["Returns"][number]

interface FeedTypeQuickCreateProps {
  farmId: string | null
  onCreated?: (feed: FeedTypeOption) => void
}

/** Adds a feed type for this farm (e.g. a new pellet size) so it can be picked in the feeding and inventory forms. */
export function FeedTypeQuickCreate({ farmId, onCreated }: FeedTypeQuickCreateProps) {
  const suppliersQuery = useFeedSupplierOptions()
  const createFeedType = useCreateFeedType()
  const suppliers = suppliersQuery.data?.status === "success" ? suppliersQuery.data.data : []

  const [feedLine, setFeedLine] = useState("")
  const [supplierId, setSupplierId] = useState("")
  const [pelletSize, setPelletSize] = useState("")
  const [category, setCategory] = useState<string>("grower")
  const [protein, setProtein] = useState("")
  const [fat, setFat] = useState("")
  const [error, setError] = useState<string | null>(null)

  async function handleCreate() {
    if (!farmId) {
      setError("Select a farm before adding a feed type.")
      return
    }
    if (!feedLine.trim() || !supplierId || !pelletSize) {
      setError("Feed name, supplier and pellet size are required.")
      return
    }
    const proteinValue = protein.trim() ? Number(protein) : null
    const fatValue = fat.trim() ? Number(fat) : null
    if ((proteinValue != null && !Number.isFinite(proteinValue)) || (fatValue != null && !Number.isFinite(fatValue))) {
      setError("Protein and fat must be numbers.")
      return
    }

    setError(null)
    try {
      const created = await createFeedType.mutateAsync({
        farm_id: farmId,
        feed_line: feedLine.trim(),
        feed_supplier_id: Number(supplierId),
        feed_pellet_size: pelletSize as Database["public"]["Enums"]["feed_pellet_size"],
        feed_category: category as Database["public"]["Enums"]["feed_category"],
        crude_protein_percentage: proteinValue,
        crude_fat_percentage: fatValue,
      })
      setFeedLine("")
      setPelletSize("")
      setProtein("")
      setFat("")
      onCreated?.(created.data)
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unable to create feed type.")
    }
  }

  return (
    <div className="space-y-4 rounded-lg border border-border/80 bg-background p-4">
      <div className="space-y-1">
        <h3 className="font-medium">Add feed type</h3>
        <p className="text-sm text-muted-foreground">
          Name it as it appears on the bag, for example &quot;6mm Koudijs 32%&quot;. It is added to this farm only. Farm managers and admins can add feed types.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="feed-type-name">Feed name</Label>
          <Input id="feed-type-name" value={feedLine} onChange={(event) => setFeedLine(event.target.value)} placeholder="6mm Koudijs 32%" />
        </div>
        <div className="space-y-2">
          <Label>Supplier</Label>
          <Select value={supplierId} onValueChange={setSupplierId} disabled={suppliersQuery.isLoading || suppliers.length === 0}>
            <SelectTrigger>
              <SelectValue placeholder={suppliersQuery.isLoading ? "Loading suppliers..." : suppliers.length === 0 ? "No suppliers found" : "Select supplier"} />
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
          <Label>Pellet size</Label>
          <Select value={pelletSize} onValueChange={setPelletSize}>
            <SelectTrigger>
              <SelectValue placeholder="Select pellet size" />
            </SelectTrigger>
            <SelectContent>
              {Constants.public.Enums.feed_pellet_size.map((size) => (
                <SelectItem key={size} value={size}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Category</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger>
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {Constants.public.Enums.feed_category.map((item) => (
                <SelectItem key={item} value={item}>
                  {item}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="feed-type-protein">Protein (%)</Label>
            <Input id="feed-type-protein" type="number" step="0.1" value={protein} onChange={(event) => setProtein(event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="feed-type-fat">Fat (%)</Label>
            <Input id="feed-type-fat" type="number" step="0.1" value={fat} onChange={(event) => setFat(event.target.value)} />
          </div>
        </div>
      </div>

      {error ? <p className="text-sm text-destructive-strong">{error}</p> : null}

      <Button type="button" onClick={handleCreate} disabled={createFeedType.isPending}>
        {createFeedType.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        Add feed type
      </Button>
    </div>
  )
}
