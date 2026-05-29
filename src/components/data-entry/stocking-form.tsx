"use client"

import { useEffect, useMemo, useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Button } from "@/components/app-ui/button"
import { Loader2 } from "lucide-react"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/app-ui/form"
import { Input } from "@/components/app-ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/app-ui/select"
import type { Database } from "@/lib/types/database"
import { formatCageLabel, type SystemOption } from "@/lib/system-options"
import { useRecordStocking } from "@/lib/hooks/use-stocking"
import { logSbError } from "@/lib/supabase/log"
import { OfflineSaveBadge } from "@/components/offline/offline-save-badge"
import { BatchQuickCreate } from "./batch-quick-create"
import { DependencyBlocker } from "./dependency-blocker"
import {
  findUnitForSystem,
  getSystemUnits,
  getSystemsForUnit,
} from "./form-support"
import {
  calculateAbw,
  calculateAbwOrZero,
  parseRequiredNumericId,
  reportDataEntrySubmitError,
  requireActiveFarmId,
  toIsoDate,
} from "./form-utils"
import { SelectedBatchSupplierInfo, SelectedSystemInfo } from "./selection-info"

type StockingInsert = Database["public"]["Tables"]["fish_stocking"]["Insert"]
type StockingInsertWithNotes = Omit<StockingInsert, "cycle_id"> & {
  cycle_id?: StockingInsert["cycle_id"]
  farm_id?: string | null
  notes?: string | null
}
type BatchOption = Database["public"]["Functions"]["api_fingerling_batch_options_rpc"]["Returns"][number]
type FingerlingBatchRow = Database["public"]["Tables"]["fingerling_batch"]["Row"]

const formSchema = z.object({
  unit: z.string().min(1, "Cage unit is required"),
  system_id: z.string().min(1, "Cage number is required"),
  batch_id: z.string().min(1, "Batch is required"),
  stocking_date: z.string().min(1, "Date is required"),
  number_of_fish: z.coerce.number().min(1, "Quantity must be positive"),
  total_weight_kg: z.coerce.number().min(0.01, "Weight must be positive"),
  notes: z.string().max(500, "Notes must be 500 characters or fewer").optional(),
  type_of_stocking: z.enum(["empty", "already_stocked"]),
})

interface StockingFormProps {
  farmId: string | null
  systems: SystemOption[]
  batches: Database["public"]["Functions"]["api_fingerling_batch_options_rpc"]["Returns"][number][]
  defaultSystemId?: number | null
  defaultBatchId?: number | null
}

export function StockingForm({ farmId, systems, batches, defaultSystemId = null, defaultBatchId = null }: StockingFormProps) {
  const mutation = useRecordStocking()
  const [showBatchCreate, setShowBatchCreate] = useState(false)
  const [createdBatches, setCreatedBatches] = useState<BatchOption[]>([])

  const units = useMemo(() => getSystemUnits(systems), [systems])
  const defaultUnit = findUnitForSystem(systems, defaultSystemId)
  const batchOptions = useMemo(() => {
    const existingIds = new Set(batches.map((batch) => batch.id))
    return [
      ...createdBatches.filter((batch) => !existingIds.has(batch.id)),
      ...batches,
    ]
  }, [batches, createdBatches])

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      stocking_date: toIsoDate(new Date()),
      unit: defaultUnit,
      number_of_fish: 0,
      total_weight_kg: 0,
      notes: "",
      system_id: defaultSystemId ? String(defaultSystemId) : "",
      batch_id: defaultBatchId ? String(defaultBatchId) : "",
      type_of_stocking: "empty",
    },
  })

  const selectedUnit = form.watch("unit")
  const selectedSystemId = form.watch("system_id")
  const selectedBatchId = form.watch("batch_id")
  const numberOfFish = form.watch("number_of_fish")
  const totalWeightKg = form.watch("total_weight_kg")
  const computedAbw = calculateAbw(totalWeightKg, numberOfFish)
  const systemsForUnit = useMemo(() => getSystemsForUnit(systems, selectedUnit), [selectedUnit, systems])

  function handleBatchCreated(batch: FingerlingBatchRow) {
    const option: BatchOption = {
      id: batch.id,
      farm_id: batch.farm_id ?? farmId ?? "",
      system_id: batch.system_id ?? null,
      supplier_id: batch.supplier_id,
      date_of_delivery: batch.date_of_delivery,
      number_of_fish: batch.number_of_fish ?? 0,
      abw: batch.abw ?? 0,
      label: batch.name,
    }

    setCreatedBatches((current) => [option, ...current.filter((item) => item.id !== option.id)])
    form.setValue("batch_id", String(option.id), { shouldValidate: true })
    setShowBatchCreate(false)
  }

  useEffect(() => {
    if (!selectedUnit) return
    const currentValue = form.getValues("system_id")
    if (!currentValue) return
    const existsInUnit = systemsForUnit.some((system) => String(system.id) === currentValue)
    if (!existsInUnit) {
      form.setValue("system_id", "", { shouldValidate: true })
    }
  }, [form, selectedUnit, systemsForUnit])

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      const resolvedFarmId = requireActiveFarmId(farmId)
      const systemId = parseRequiredNumericId(values.system_id, "Cage number")
      const batchId = parseRequiredNumericId(values.batch_id, "Batch")
      const abw = calculateAbwOrZero(values.total_weight_kg, values.number_of_fish)

      const payload: StockingInsertWithNotes = {
        farm_id: resolvedFarmId,
        system_id: systemId,
        batch_id: batchId,
        date: values.stocking_date,
        number_of_fish_stocking: values.number_of_fish,
        total_weight_stocking: values.total_weight_kg,
        abw,
        notes: values.notes?.trim() ? values.notes.trim() : null,
        type_of_stocking: values.type_of_stocking,
      }

      await mutation.mutateAsync(payload)

      form.reset({
        stocking_date: toIsoDate(new Date()),
        unit: values.unit,
        number_of_fish: 0,
        total_weight_kg: 0,
        notes: "",
        system_id: values.system_id,
        batch_id: values.batch_id,
        type_of_stocking: values.type_of_stocking,
      })
    } catch (error) {
      logSbError("dataEntry:stocking:submit", error)
      reportDataEntrySubmitError(error, "Failed to record stocking.")
    }
  }

  if (batchOptions.length === 0) {
    return (
      <DependencyBlocker
        title="No batches found."
        description="Create a batch to continue stocking."
        actionLabel={showBatchCreate ? "Hide batch form" : "Create batch"}
        onAction={() => setShowBatchCreate((current) => !current)}
      >
        {showBatchCreate ? <BatchQuickCreate farmId={farmId} onCreated={handleBatchCreated} /> : null}
      </DependencyBlocker>
    )
  }

  return (
    <div className="space-y-6">
      <div className="data-entry-form-intro">
        <h2 className="text-xl font-semibold tracking-tight">Record Stocking</h2>
      </div>

      <div className="data-entry-status">
        <OfflineSaveBadge result={mutation.data} />
      </div>

      <div className="flex justify-end">
        <Button type="button" variant="outline" onClick={() => setShowBatchCreate((current) => !current)}>
          {showBatchCreate ? "Hide batch form" : "Add New Batch"}
        </Button>
      </div>

      {showBatchCreate ? <BatchQuickCreate farmId={farmId} onCreated={handleBatchCreated} /> : null}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="stocking_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="unit"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cage Unit</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select unit" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {units.map((unit) => (
                        <SelectItem key={unit} value={unit}>
                          {unit}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="system_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cage Number</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={!selectedUnit}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={selectedUnit ? "Select cage" : "Select unit first"} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {systemsForUnit.map((system) => (
                        <SelectItem key={system.id} value={String(system.id)}>
                          {formatCageLabel(system)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
              <div>
                <div className="text-sm font-semibold text-foreground">Batch Number</div>
              </div>
              <div className="mt-3">
                <FormField
                  control={form.control}
                  name="batch_id"
                  render={({ field }) => (
                    <FormItem>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select batch number" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {batchOptions.map((batch) => (
                            <SelectItem key={batch.id} value={String(batch.id)}>
                              {batch.label || `Batch ${batch.id}`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </div>

          <div className="data-entry-secondary-grid">
            <SelectedSystemInfo systems={systems} systemId={selectedSystemId} />
            <SelectedBatchSupplierInfo batches={batchOptions} batchId={selectedBatchId} />
          </div>

          <div className="data-entry-secondary-grid">
            <FormField
              control={form.control}
              name="number_of_fish"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Number of Fish</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="total_weight_kg"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Total Weight (kg)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="data-entry-note-card rounded-md border border-border/80 px-3 py-2 text-sm text-muted-foreground">
            Computed ABW: {computedAbw != null ? `${computedAbw.toFixed(2)} g` : "Enter quantity and total weight"}
          </div>

          <FormField
            control={form.control}
            name="type_of_stocking"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Stocking Type</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="empty">Empty cage</SelectItem>
                    <SelectItem value="already_stocked">Already stocked</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Comments</FormLabel>
                <FormControl>
                  <textarea
                    {...field}
                    rows={3}
                    className="data-entry-textarea"
                    placeholder="Source condition, acclimation detail, or any exception."
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" className="data-entry-action" disabled={form.formState.isSubmitting || mutation.isPending}>
            {(form.formState.isSubmitting || mutation.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Record Stocking
          </Button>
        </form>
      </Form>
    </div>
  )
}

