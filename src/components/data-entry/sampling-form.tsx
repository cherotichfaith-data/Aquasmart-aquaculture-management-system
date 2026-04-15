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
import { useActiveFarm } from "@/lib/hooks/app/use-active-farm"
import { useRecordSampling } from "@/lib/hooks/use-sampling"
import { useSamplingData } from "@/lib/hooks/use-reports"
import { diffDateDays } from "@/lib/time-series"
import { logSbError } from "@/lib/supabase/log"
import { OfflineSaveBadge } from "@/components/offline/offline-save-badge"
import {
  InfoPanel,
  InfoStat,
  findUnitForSystem,
  formatRelativeDays,
  getSystemUnits,
  getSystemsForUnit,
} from "./form-support"
import { toIsoDate } from "./form-utils"
import { SelectedBatchSupplierInfo, SelectedSystemInfo } from "./selection-info"

const formSchema = z.object({
  unit: z.string().min(1, "Cage unit is required"),
  system_id: z.string().min(1, "Cage number is required"),
  batch_id: z.string().optional(),
  date: z.string().min(1, "Date is required"),
  number_of_fish: z.coerce.number().min(1, "Sample count must be at least 1"),
  total_weight_kg: z.coerce.number().min(0.001, "Weight must be positive"),
  notes: z.string().max(500, "Comments must be 500 characters or fewer").optional(),
})

interface SamplingFormProps {
  systems: SystemOption[]
  batches: Database["public"]["Functions"]["api_fingerling_batch_options_rpc"]["Returns"][number][]
  defaultSystemId?: number | null
  defaultBatchId?: number | null
}

const projectAbwFromHistory = (
  latestAbw: number | null | undefined,
  latestDate: string | null | undefined,
  priorAbw: number | null | undefined,
  priorDate: string | null | undefined,
  targetDate: string | null | undefined,
) => {
  if (!latestAbw || !latestDate || !targetDate) return null
  if (!priorAbw || !priorDate) return latestAbw
  const intervalDays = diffDateDays(priorDate, latestDate)
  const projectionDays = diffDateDays(latestDate, targetDate)
  if (!intervalDays || projectionDays == null) return latestAbw
  const sgrPerDay = Math.log(latestAbw / priorAbw) / intervalDays
  return latestAbw * Math.exp(sgrPerDay * projectionDays)
}

export function SamplingForm({ systems, batches, defaultSystemId = null, defaultBatchId = null }: SamplingFormProps) {
  const { farmId } = useActiveFarm()
  const mutation = useRecordSampling()



  const units = useMemo(() => getSystemUnits(systems), [systems])
  const defaultUnit = findUnitForSystem(systems, defaultSystemId)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      date: toIsoDate(new Date()),
      unit: defaultUnit,
      number_of_fish: 50,
      total_weight_kg: 0,
      system_id: defaultSystemId ? String(defaultSystemId) : "",
      batch_id: defaultBatchId ? String(defaultBatchId) : "none",
      notes: "",
    },
  })

  const selectedUnit = form.watch("unit")
  const selectedSystemId = Number(form.watch("system_id"))
  const selectedBatchIdValue = form.watch("batch_id")
  const selectedBatchId =
    selectedBatchIdValue && selectedBatchIdValue !== "none" ? Number(selectedBatchIdValue) : null
  const selectedDate = form.watch("date")
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

  const samplingHistoryQuery = useSamplingData({
    systemId: Number.isFinite(selectedSystemId) ? selectedSystemId : undefined,
    limit: 10,
    enabled: Number.isFinite(selectedSystemId),
  })

  const samplingHistory = useMemo(() => {
    const rows = samplingHistoryQuery.data?.status === "success" ? samplingHistoryQuery.data.data : []
    return rows
      .filter((row) => !selectedDate || row.date <= selectedDate)
      .sort((a, b) => `${b.date}`.localeCompare(`${a.date}`))
  }, [samplingHistoryQuery.data, selectedDate])
  const previousSample = samplingHistory[0] ?? null
  const priorSample = samplingHistory[1] ?? null
  const projectedAbw = projectAbwFromHistory(
    previousSample?.abw,
    previousSample?.date,
    priorSample?.abw,
    priorSample?.date,
    selectedDate,
  )
  const daysSinceLastSample = diffDateDays(previousSample?.date, selectedDate)
  const abwDeltaPct =
    projectedAbw && computedAbw ? Math.abs((computedAbw - projectedAbw) / projectedAbw) * 100 : null
  const isProjectedOutlier = abwDeltaPct != null && abwDeltaPct > 30

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      const systemId = Number(values.system_id)
      const batchId = values.batch_id && values.batch_id !== "none" ? Number(values.batch_id) : null
      const abw = values.number_of_fish > 0 ? (values.total_weight_kg * 1000) / values.number_of_fish : 0

      await mutation.mutateAsync({
        system_id: systemId,
        batch_id: Number.isFinite(batchId as number) ? batchId : null,
        date: values.date,
        number_of_fish_sampling: values.number_of_fish,
        total_weight_sampling: values.total_weight_kg,
        abw,
        notes: values.notes?.trim() ? values.notes.trim() : null,
      })

      form.reset({
        date: toIsoDate(new Date()),
        unit: values.unit,
        number_of_fish: 50,
        total_weight_kg: 0,
        system_id: values.system_id,
        batch_id: values.batch_id,
        notes: "",
      })
    } catch (error) {
      logSbError("dataEntry:sampling:submit", error)
    }
  }

  return (
    <div className="max-w-7xl">
      <div className="mb-6">
        <h2 className="text-xl font-semibold tracking-tight">Record Sampling</h2>
        <p className="text-sm text-muted-foreground">Capture total sampled weight in kilograms and flag unrealistic ABW shifts before save.</p>
      </div>

      <div className="mb-4">
        <OfflineSaveBadge result={mutation.data} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(320px,1fr)]">
        <div className="space-y-6">
          {isProjectedOutlier ? (
            <div className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-800 dark:text-red-200">
              ABW is {abwDeltaPct?.toFixed(0)}% away from the projected value for this cage. Recheck the sample before saving.
            </div>
          ) : null}

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="date"
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

                <FormField
                  control={form.control}
                  name="batch_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Batch (Optional)</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select batch" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">No batch</SelectItem>
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

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <SelectedSystemInfo systems={systems} systemId={selectedSystemId} />
                <SelectedBatchSupplierInfo batches={batches} batchId={selectedBatchIdValue} />
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="number_of_fish"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Number of Fish Sampled</FormLabel>
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
                Computed ABW: {computedAbw != null ? `${computedAbw.toFixed(2)} g` : "Enter sample count and total weight (kg)"}
              </div>

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
                        placeholder="Net size, fish condition, uneven sample, or any reason the reading may be atypical."
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

        <div className="space-y-4">
          <InfoPanel title="Sampling Checks">
            <InfoStat
              label="Previous ABW"
              value={previousSample?.abw != null ? `${previousSample.abw.toFixed(2)} g` : "No prior sample"}
            />
            <InfoStat
              label="Days Since Last Sample"
              value={daysSinceLastSample != null ? formatRelativeDays(daysSinceLastSample) : "No prior sample"}
            />
            <InfoStat
              label="Expected ABW Today"
              value={projectedAbw != null ? `${projectedAbw.toFixed(2)} g` : "Projection unavailable"}
            />
            <InfoStat
              label="Projection Delta"
              tone={isProjectedOutlier ? "critical" : "default"}
              value={abwDeltaPct != null ? `${abwDeltaPct.toFixed(1)}%` : "No comparison"}
            />
            <InfoStat label="Sampling Target" value="50 fish per sample" />
          </InfoPanel>
        </div>
      </div>

    </div>
  )
}
