"use client"

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
import { useRecordMortality } from "@/lib/hooks/use-mortality"
import { MORTALITY_CAUSES, type MortalityCause } from "@/lib/mortality"
import { logSbError } from "@/lib/supabase/log"
import { OfflineSaveBadge } from "@/components/offline/offline-save-badge"
import { SelectedBatchSupplierInfo, SelectedSystemInfo } from "./selection-info"
import { parseOptionalNumericId, parseRequiredNumericId, reportDataEntrySubmitError, requireActiveFarmId } from "./form-utils"

const formSchema = z.object({
  system_id: z.string().min(1, "Cage number is required"),
  batch_id: z.string().optional(),
  date: z.string().min(1, "Date is required"),
  number_of_fish: z.coerce.number().min(1, "Must be positive"),
  cause: z.enum(MORTALITY_CAUSES, { errorMap: () => ({ message: "Cause is required" }) }),
  total_weight_mortality: z.preprocess((value) => (value === "" ? undefined : value), z.coerce.number().min(0).optional()),
  notes: z.string().max(500, "Notes must be 500 characters or fewer").optional(),
}).superRefine((values, ctx) => {
  if (values.number_of_fish >= 100 && values.total_weight_mortality == null) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["total_weight_mortality"],
      message: "Total dead weight is required for 100 or more dead fish.",
    })
  }
})

interface MortalityFormProps {
  farmId: string | null
  systems: SystemOption[]
  batches: Database["public"]["Functions"]["api_fingerling_batch_options_rpc"]["Returns"][number][]
  defaultSystemId?: number | null
  defaultBatchId?: number | null
}

const CAUSE_LABELS: Record<MortalityCause, string> = {
  unknown: "Unknown",
  hypoxia: "Low DO / Hypoxia",
  disease: "Disease",
  injury: "Injury",
  handling: "Handling",
  predator: "Predator",
  starvation: "Starvation",
  temperature: "Temperature",
  other: "Other",
}

export function MortalityForm({ farmId, systems, batches, defaultSystemId = null, defaultBatchId = null }: MortalityFormProps) {
  const mutation = useRecordMortality()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      date: new Date().toISOString().split("T")[0],
      number_of_fish: 0,
      system_id: defaultSystemId ? String(defaultSystemId) : "",
      batch_id: defaultBatchId ? String(defaultBatchId) : "none",
      total_weight_mortality: undefined,
      notes: "",
    },
  })

  const selectedSystemId = form.watch("system_id")
  const selectedBatchId = form.watch("batch_id")
  const mortalityCount = form.watch("number_of_fish")

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      const resolvedFarmId = requireActiveFarmId(farmId)
      const systemId = parseRequiredNumericId(values.system_id, "Cage number")
      const batchId = parseOptionalNumericId(values.batch_id)

      await mutation.mutateAsync({
        farm_id: resolvedFarmId,
        system_id: systemId,
        batch_id: batchId,
        date: values.date,
        number_of_fish_mortality: values.number_of_fish,
        total_weight_mortality: values.total_weight_mortality ?? null,
        cause: values.cause,
        is_mass_mortality: values.number_of_fish >= 100,
        notes: values.notes?.trim() ? values.notes.trim() : null,
      })

      form.reset({
        date: new Date().toISOString().split("T")[0],
        number_of_fish: 0,
        system_id: values.system_id,
        batch_id: values.batch_id,
        total_weight_mortality: undefined,
        notes: "",
      })
    } catch (error) {
      logSbError("dataEntry:mortality:submit", error)
      reportDataEntrySubmitError(error, "Failed to record mortality.")
    }
  }

  return (
    <div className="space-y-6">
      <div className="data-entry-form-intro">
        <h2 className="text-xl font-semibold tracking-tight">Record Mortality</h2>
      </div>

      <div className="data-entry-status">
        <OfflineSaveBadge result={mutation.data} />
      </div>

        {mortalityCount >= 100 ? (
        <div className="data-entry-callout-alert rounded-md border border-destructive/40 bg-destructive/10 text-destructive">
            Mass mortality threshold exceeded. Weigh the dead fish and record the total dead weight, then complete a DO and water-quality check for this cage.
          </div>
        ) : null}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="data-entry-secondary-grid">
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
              name="system_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cage Number</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select cage" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {systems.map((system) => (
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

            <FormField
              control={form.control}
              name="number_of_fish"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Number of Dead Fish</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="data-entry-secondary-grid">
            <SelectedSystemInfo systems={systems} systemId={selectedSystemId} />
            <SelectedBatchSupplierInfo batches={batches} batchId={selectedBatchId} />
          </div>

          <FormField
            control={form.control}
            name="cause"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cause</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select cause" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {MORTALITY_CAUSES.map((cause) => (
                      <SelectItem key={cause} value={cause}>
                        {CAUSE_LABELS[cause]}
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
            name="total_weight_mortality"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Total Dead Weight (kg){mortalityCount >= 100 ? " *" : ""}</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" {...field} value={field.value ?? ""} />
                </FormControl>
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
                    placeholder="Observed signs, handling issue, water condition, or follow-up action."
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" className="data-entry-action" disabled={form.formState.isSubmitting || mutation.isPending}>
            {(form.formState.isSubmitting || mutation.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Record Mortality
          </Button>
        </form>
      </Form>
    </div>
  )
}

