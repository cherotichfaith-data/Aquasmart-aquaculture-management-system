"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
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
import { useRecordTransfer } from "@/lib/hooks/use-transfer"
import { logSbError } from "@/lib/supabase/log"
import { OfflineSaveBadge } from "@/components/offline/offline-save-badge"
import { DependencyBlocker } from "./dependency-blocker"
import { toIsoDate } from "./form-utils"
import { SelectedBatchSupplierInfo, SelectedSystemInfo } from "./selection-info"

const EXTERNAL_DESTINATION = "__external__"

const formSchema = z.object({
  origin_system_id: z.string().min(1, "Origin cage is required"),
  target_system_id: z.string().optional(),
  external_target_name: z.string().optional(),
  transfer_type: z.enum(["transfer", "grading", "density_thinning", "broodstock", "count_check", "external_out"]),
  batch_id: z.string().optional(),
  date: z.string().min(1, "Date is required"),
  number_of_fish: z.coerce.number().min(1, "Count must be positive"),
  total_weight_kg: z.coerce.number().min(0.01, "Weight must be positive"),
  notes: z.string().max(500, "Comments must be 500 characters or fewer").optional(),
}).superRefine((values, ctx) => {
  if (values.transfer_type === "external_out") {
    if (!values.external_target_name?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["external_target_name"],
        message: "External destination is required",
      })
    }
    return
  }

  if (!values.target_system_id) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["target_system_id"],
      message: "Destination cage is required",
    })
  }
})

const TRANSFER_TYPE_OPTIONS = [
  { value: "transfer", label: "Transfer" },
  { value: "grading", label: "Grading" },
  { value: "density_thinning", label: "Density thinning" },
  { value: "broodstock", label: "Broodstock" },
  { value: "count_check", label: "Count check" },
  { value: "external_out", label: "External out" },
] as const

interface TransferFormProps {
  systems: SystemOption[]
  batches: Database["public"]["Functions"]["api_fingerling_batch_options_rpc"]["Returns"][number][]
  defaultSystemId?: number | null
  defaultBatchId?: number | null
}

export function TransferForm({ systems, batches, defaultSystemId = null, defaultBatchId = null }: TransferFormProps) {
  const mutation = useRecordTransfer()
  const router = useRouter()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      date: toIsoDate(new Date()),
      number_of_fish: 0,
      total_weight_kg: 0,
      origin_system_id: defaultSystemId ? String(defaultSystemId) : "",
      target_system_id: "",
      external_target_name: "",
      transfer_type: "transfer",
      batch_id: defaultBatchId ? String(defaultBatchId) : "none",
      notes: "",
    },
  })

  const originSystemId = form.watch("origin_system_id")
  const targetSystemId = form.watch("target_system_id")
  const selectedBatchId = form.watch("batch_id")
  const transferType = form.watch("transfer_type")
  const numberOfFish = form.watch("number_of_fish")
  const totalWeightKg = form.watch("total_weight_kg")
  const externalTargetName = form.watch("external_target_name")
  const computedAbw = numberOfFish > 0 && totalWeightKg > 0 ? (totalWeightKg * 1000) / numberOfFish : null
  const isExternalOut = transferType === "external_out"

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      const isCountCheck = values.transfer_type === "count_check"
      const isExternalTransfer = values.transfer_type === "external_out"
      if (!isExternalTransfer && !isCountCheck && values.origin_system_id === values.target_system_id) {
        form.setError("target_system_id", { message: "Origin and destination cannot be the same" })
        return
      }

      const originId = Number(values.origin_system_id)
      const targetId =
        values.target_system_id && values.target_system_id !== EXTERNAL_DESTINATION
          ? Number(values.target_system_id)
          : null
      const batchId = values.batch_id && values.batch_id !== "none" ? Number(values.batch_id) : null
      const resolvedTransferType = isExternalTransfer ? "external_out" : values.transfer_type

      await mutation.mutateAsync({
        origin_system_id: originId,
        target_system_id: isCountCheck ? originId : targetId ?? originId,
        external_target_name:
          resolvedTransferType === "external_out" ? values.external_target_name?.trim() ?? null : null,
        transfer_type: resolvedTransferType,
        batch_id: Number.isFinite(batchId as number) ? batchId : null,
        date: values.date,
        number_of_fish_transfer: values.number_of_fish,
        total_weight_transfer: values.total_weight_kg,
        abw: values.number_of_fish > 0 ? (values.total_weight_kg * 1000) / values.number_of_fish : null,
        notes: values.notes?.trim() ? values.notes.trim() : null,
      })

      form.reset({
        date: toIsoDate(new Date()),
        number_of_fish: 0,
        total_weight_kg: 0,
        origin_system_id: values.origin_system_id,
        target_system_id: values.transfer_type === "count_check" ? values.origin_system_id : "",
        external_target_name: "",
        transfer_type: values.transfer_type,
        batch_id: values.batch_id,
        notes: "",
      })
    } catch (error) {
      logSbError("dataEntry:transfer:submit", error)
    }
  }

  if (systems.length < 2) {
    return (
      <DependencyBlocker
        title="Add another system to record transfers."
        actionLabel="Add system"
        onAction={() => router.push("/data-entry?type=system")}
      />
    )
  }

  return (
    <div className="max-w-6xl space-y-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Record Transfer</h2>
      </div>

      <OfflineSaveBadge result={mutation.data} />

      {isExternalOut ? (
        <div className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-800 dark:text-amber-200">
          Destination not in the system list. This transfer will be recorded as <span className="font-semibold">external_out</span>.
        </div>
      ) : null}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem className="max-w-sm">
                <FormLabel>Date</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="origin_system_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Origin Cage</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select origin" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {systems.map((system) => (
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

            {isExternalOut ? (
              <FormField
                control={form.control}
                name="external_target_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Destination Location</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g. KIMBWELA Pond 3" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : (
              <FormField
                control={form.control}
                name="target_system_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Destination Cage</FormLabel>
                    <Select
                      onValueChange={(value) => {
                        field.onChange(value)
                        if (value === EXTERNAL_DESTINATION) {
                          form.setValue("transfer_type", "external_out", { shouldValidate: true })
                        }
                      }}
                      value={field.value}
                      disabled={transferType === "count_check"}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select destination" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {systems.map((system) => (
                          <SelectItem key={system.id} value={String(system.id)}>
                            {system.label ?? `System ${system.id}`}
                          </SelectItem>
                        ))}
                        <SelectItem value={EXTERNAL_DESTINATION}>External location</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="transfer_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Transfer Type</FormLabel>
                  <Select
                    onValueChange={(value) => {
                      field.onChange(value)
                      if (value === "count_check") {
                        const origin = form.getValues("origin_system_id")
                        if (origin) form.setValue("target_system_id", origin, { shouldValidate: true })
                      }
                      if (value === "external_out") {
                        form.setValue("target_system_id", EXTERNAL_DESTINATION, { shouldValidate: false })
                      } else if (form.getValues("target_system_id") === EXTERNAL_DESTINATION) {
                        form.setValue("target_system_id", "", { shouldValidate: false })
                        form.setValue("external_target_name", "")
                      }
                    }}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select transfer type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {TRANSFER_TYPE_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
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
            <SelectedSystemInfo systems={systems} systemId={originSystemId} title="Origin System" />
            {isExternalOut ? (
              <div className="rounded-md border border-border/80 bg-muted/20 px-3 py-2 text-sm">
                <div className="font-medium">Destination</div>
                <div className="text-muted-foreground">{externalTargetName?.trim() || "External location"}</div>
              </div>
            ) : (
              <SelectedSystemInfo systems={systems} systemId={targetSystemId} title="Destination System" />
            )}
          </div>

          <SelectedBatchSupplierInfo batches={batches} batchId={selectedBatchId} />

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
            Computed ABW: {computedAbw != null ? `${computedAbw.toFixed(2)} g` : "Enter count and total weight"}
          </div>

          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Comment</FormLabel>
                <FormControl>
                  <textarea
                    {...field}
                    rows={3}
                    className="flex min-h-[88px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    placeholder="Reason for movement, handling detail, or receiving location note."
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
