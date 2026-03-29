"use client"

import { useEffect, useMemo, useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { Database } from "@/lib/types/database"
import type { SystemOption } from "@/lib/system-options"
import { useRecordStocking } from "@/lib/hooks/use-stocking"
import { logSbError } from "@/lib/supabase/log"
import { BatchQuickCreate } from "./batch-quick-create"
import { DependencyBlocker } from "./dependency-blocker"
import {
  findUnitForSystem,
  getSystemUnits,
  getSystemsForUnit,
} from "./form-support"
import { toIsoDate } from "./form-utils"
import { SelectedBatchSupplierInfo, SelectedSystemInfo } from "./selection-info"

type StockingInsertWithNotes = Database["public"]["Tables"]["fish_stocking"]["Insert"] & {
  notes?: string | null
}

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
  systems: SystemOption[]
  batches: Database["public"]["Functions"]["api_fingerling_batch_options_rpc"]["Returns"][number][]
  defaultSystemId?: number | null
  defaultBatchId?: number | null
}

export function StockingForm({ systems, batches, defaultSystemId = null, defaultBatchId = null }: StockingFormProps) {
  const mutation = useRecordStocking()
  const [showBatchCreate, setShowBatchCreate] = useState(false)

  const units = useMemo(() => getSystemUnits(systems), [systems])
  const defaultUnit = findUnitForSystem(systems, defaultSystemId)

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
  const computedAbw = numberOfFish > 0 && totalWeightKg > 0 ? (totalWeightKg * 1000) / numberOfFish : null
  const systemsForUnit = useMemo(() => getSystemsForUnit(systems, selectedUnit), [selectedUnit, systems])

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
      const systemId = Number(values.system_id)
      const batchId = Number(values.batch_id)
      const abw = values.number_of_fish > 0 ? (values.total_weight_kg * 1000) / values.number_of_fish : 0

      const payload: StockingInsertWithNotes = {
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
    }
  }

  if (batches.length === 0) {
    return (
      <DependencyBlocker
        title="No batches found."
        description="Create a batch to continue stocking."
        actionLabel={showBatchCreate ? "Hide batch form" : "Create batch"}
        onAction={() => setShowBatchCreate((current) => !current)}
      >
        {showBatchCreate ? <BatchQuickCreate onCreated={() => setShowBatchCreate(false)} /> : null}
      </DependencyBlocker>
    )
  }

  return (
    <div className="max-w-6xl space-y-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Record Stocking</h2>
      </div>

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
                          {system.label ?? `System ${system.id}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-foreground">Batch Number</div>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={() => setShowBatchCreate((current) => !current)}>
                  {showBatchCreate ? "Hide batch form" : "Create new batch"}
                </Button>
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
                          {batches.map((batch) => (
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

          {showBatchCreate ? <BatchQuickCreate onCreated={() => setShowBatchCreate(false)} /> : null}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <SelectedSystemInfo systems={systems} systemId={selectedSystemId} />
            <SelectedBatchSupplierInfo batches={batches} batchId={selectedBatchId} />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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

          <div className="rounded-md border border-border/80 bg-muted/20 px-3 py-2 text-sm text-muted-foreground">
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
                    className="flex min-h-[88px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    placeholder="Source condition, acclimation detail, or any exception."
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" disabled={form.formState.isSubmitting || mutation.isPending}>
            {(form.formState.isSubmitting || mutation.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Submit Entry
          </Button>
        </form>
      </Form>
    </div>
  )
}
