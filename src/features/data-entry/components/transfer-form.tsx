"use client"

import { useEffect, useMemo } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, useWatch } from "react-hook-form"
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
import { useTransferData } from "@/features/reports/hooks"
import { useRecordTransfer } from "@/lib/hooks/use-transfer"
import { logSbError } from "@/lib/supabase/log"
import { TRANSFER_TYPE_LABELS, UI_TRANSFER_TYPES } from "@/lib/transfer-types"
import { OfflineSaveBadge } from "@/components/offline/offline-save-badge"
import {
  parseRequiredNumericId,
  reportDataEntrySubmitError,
  requireActiveFarmId,
  toIsoDate,
} from "./form-utils"
import {
  LatestEntryGuard,
  pickLatestEntryByRecordDate,
  pickSameDayEntry,
  usePendingLatestEntries,
  type LatestEntrySummary,
} from "./latest-entry-guard"
import { SelectedBatchSupplierInfo, SelectedSystemInfo } from "./selection-info"

const EXTERNAL_DESTINATION = "__external__"

const formSchema = z.object({
  origin_system_id: z.string().min(1, "Origin cage is required"),
  target_system_id: z.string().optional(),
  external_target_name: z.string().optional(),
  transfer_type: z.enum(UI_TRANSFER_TYPES),
  date: z.string().min(1, "Date is required"),
  number_of_fish: z.coerce.number().int("Count must be a whole number").min(1, "Count must be positive"),
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

interface TransferFormProps {
  farmId: string | null
  systems: SystemOption[]
  batches: Database["public"]["Functions"]["api_fingerling_batch_options_rpc"]["Returns"][number][]
  defaultSystemId?: number | null
  defaultBatchId?: number | null
  onSystemChange?: (systemId: number | null) => void
}

export function TransferForm({ farmId, systems, batches, defaultSystemId = null, onSystemChange }: TransferFormProps) {
  const mutation = useRecordTransfer()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    mode: "onBlur",
    defaultValues: {
      date: toIsoDate(new Date()),
      number_of_fish: 0,
      total_weight_kg: 0,
      origin_system_id: defaultSystemId ? String(defaultSystemId) : "",
      target_system_id: "",
      external_target_name: "",
      transfer_type: "transfer",
      notes: "",
    },
  })

  const originSystemId = useWatch({ control: form.control, name: "origin_system_id" })
  const targetSystemId = useWatch({ control: form.control, name: "target_system_id" })
  const selectedDate = useWatch({ control: form.control, name: "date" })
  const transferType = useWatch({ control: form.control, name: "transfer_type" })
  const externalTargetName = useWatch({ control: form.control, name: "external_target_name" })
  const isExternalOut = transferType === "external_out"
  const resolvedOriginSystemId = Number(originSystemId)
  const hasValidOriginSystemId = Number.isFinite(resolvedOriginSystemId) && resolvedOriginSystemId > 0

  useEffect(() => {
    onSystemChange?.(hasValidOriginSystemId ? resolvedOriginSystemId : null)
  }, [hasValidOriginSystemId, onSystemChange, resolvedOriginSystemId])

  // A system can only host one active batch/production cycle at a time, so the
  // transferred batch is derived from the origin cage instead of asking the
  // user to pick one manually (see api_fingerling_batch_options_rpc's system_id column).
  const resolvedBatchId = useMemo(
    () => batches.find((batch) => batch.system_id === resolvedOriginSystemId)?.id ?? null,
    [batches, resolvedOriginSystemId],
  )
  const latestEntryQuery = useTransferData({
    farmId,
    systemId: hasValidOriginSystemId ? resolvedOriginSystemId : undefined,
    limit: 1,
    enabled: hasValidOriginSystemId,
  })
  const duplicateQuery = useTransferData({
    farmId,
    systemId: hasValidOriginSystemId ? resolvedOriginSystemId : undefined,
    dateFrom: selectedDate || undefined,
    dateTo: selectedDate || undefined,
    limit: 20,
    enabled: hasValidOriginSystemId && Boolean(selectedDate),
  })
  const pendingEntries = usePendingLatestEntries("transfer", hasValidOriginSystemId ? resolvedOriginSystemId : null)
  const latestServerEntries = (latestEntryQuery.data?.status === "success" ? latestEntryQuery.data.data : []).map<LatestEntrySummary>((row) => ({
    key: `transfer-${row.id ?? row.created_at ?? row.date ?? "latest"}`,
    date: row.date ?? "",
    createdAt: row.created_at ?? null,
    summary: `${row.number_of_fish_transfer ?? 0} fish transferred`,
    details: [
      {
        label: "Destination",
        value: row.external_target_name?.trim() || (row.target_system_id != null ? `Cage ${row.target_system_id}` : "Not recorded"),
      },
      { label: "Weight", value: row.total_weight_transfer != null ? `${row.total_weight_transfer} kg` : "Not recorded" },
    ],
  }))
  const duplicateServerEntries = (duplicateQuery.data?.status === "success" ? duplicateQuery.data.data : []).map<LatestEntrySummary>((row) => ({
    key: `transfer-duplicate-${row.id ?? row.created_at ?? row.date ?? "entry"}`,
    date: row.date ?? "",
    createdAt: row.created_at ?? null,
    summary: `${row.number_of_fish_transfer ?? 0} fish transferred`,
    details: [
      {
        label: "Destination",
        value: row.external_target_name?.trim() || (row.target_system_id != null ? `Cage ${row.target_system_id}` : "Not recorded"),
      },
      { label: "Weight", value: row.total_weight_transfer != null ? `${row.total_weight_transfer} kg` : "Not recorded" },
    ],
  }))
  const latestEntry = pickLatestEntryByRecordDate([...latestServerEntries, ...pendingEntries])
  const duplicateEntry = pickSameDayEntry([...duplicateServerEntries, ...pendingEntries], selectedDate)

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      if (duplicateEntry) {
        form.setError("date", { message: `A transfer entry already exists for ${values.date}.` })
        return
      }

      const resolvedFarmId = requireActiveFarmId(farmId)
      const isExternalTransfer = values.transfer_type === "external_out"
      if (!isExternalTransfer && values.origin_system_id === values.target_system_id) {
        form.setError("target_system_id", { message: "Origin and destination cannot be the same" })
        return
      }

      const originId = parseRequiredNumericId(values.origin_system_id, "Origin cage")
      const targetId =
        values.target_system_id && values.target_system_id !== EXTERNAL_DESTINATION
          ? parseRequiredNumericId(values.target_system_id, "Destination cage")
          : null
      const resolvedTransferType = isExternalTransfer ? "external_out" : values.transfer_type

      await mutation.mutateAsync({
        farm_id: resolvedFarmId,
        origin_system_id: originId,
        target_system_id: isExternalTransfer ? null : targetId,
        external_target_name:
          resolvedTransferType === "external_out" ? values.external_target_name?.trim() ?? null : null,
        transfer_type: resolvedTransferType,
        batch_id: resolvedBatchId,
        date: values.date,
        number_of_fish_transfer: values.number_of_fish,
        total_weight_transfer: values.total_weight_kg,
        notes: values.notes?.trim() ? values.notes.trim() : null,
      })

      form.reset({
        date: toIsoDate(new Date()),
        number_of_fish: 0,
        total_weight_kg: 0,
        origin_system_id: values.origin_system_id,
        target_system_id: "",
        external_target_name: "",
        transfer_type: values.transfer_type,
        notes: "",
      })
    } catch (error) {
      logSbError("dataEntry:transfer:submit", error)
      reportDataEntrySubmitError(error, "Failed to record transfer.")
    }
  }

  return (
    <div className="space-y-6">
      <div className="data-entry-form-intro">
        <h2 className="text-xl font-semibold tracking-tight">Record Transfer</h2>
      </div>

      <div className="data-entry-status">
        <OfflineSaveBadge result={mutation.data} />
      </div>

      <LatestEntryGuard latestEntry={latestEntry} duplicateEntry={duplicateEntry} itemLabel="transfer" />

        {isExternalOut ? (
          <div className="data-entry-callout-alert rounded-md border border-warning/40 bg-warning/10 text-warning">
            Fish will leave this farm system and no receiving cage will be tracked.
          </div>
        ) : null}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="max-w-2xl space-y-3.5">
          <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem className="max-w-sm">
                <FormLabel>Date</FormLabel>
                <FormControl>
                  <Input type="date" className="max-w-xs" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="data-entry-secondary-grid">
            <FormField
              control={form.control}
              name="origin_system_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Origin Cage</FormLabel>
                  <Select
                    onValueChange={(value) => {
                      field.onChange(value)
                    }}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger className="max-w-xs">
                        <SelectValue placeholder="Select origin" />
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

            {isExternalOut ? (
              <FormField
                control={form.control}
                name="external_target_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Destination Location</FormLabel>
                    <FormControl>
                      <Input {...field} className="max-w-sm" placeholder="e.g. KIMBWELA Pond 3" />
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
                    >
                      <FormControl>
                        <SelectTrigger className="max-w-xs">
                          <SelectValue placeholder="Select destination" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {systems.map((system) => (
                          <SelectItem key={system.id} value={String(system.id)}>
                            {formatCageLabel(system)}
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

          <div className="data-entry-secondary-grid">
            <FormField
              control={form.control}
              name="transfer_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Transfer Type</FormLabel>
                  <Select
                    onValueChange={(value) => {
                      field.onChange(value)
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
                      <SelectTrigger className="max-w-xs">
                        <SelectValue placeholder="Select transfer type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {UI_TRANSFER_TYPES.map((transferType) => (
                        <SelectItem key={transferType} value={transferType}>
                          {TRANSFER_TYPE_LABELS[transferType]}
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
              <div className="data-entry-note-card rounded-md border border-border/80 px-3 py-2 text-sm">
                <div className="font-medium">Destination</div>
                <div className="text-muted-foreground">{externalTargetName?.trim() || "External location"}</div>
              </div>
            ) : (
              <SelectedSystemInfo systems={systems} systemId={targetSystemId} title="Destination System" />
            )}
          </div>

          <SelectedBatchSupplierInfo batches={batches} batchId={resolvedBatchId} />

          <div className="data-entry-secondary-grid">
            <FormField
              control={form.control}
              name="number_of_fish"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Number of Fish</FormLabel>
                  <FormControl>
                    <Input type="number" step="1" className="max-w-xs" {...field} />
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
                    <Input type="number" step="0.01" className="max-w-xs" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
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
                    className="data-entry-textarea"
                    placeholder="Reason for movement, handling detail, or receiving location note."
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex justify-end pt-1">
            <Button type="submit" className="min-h-11 rounded-lg px-5" disabled={form.formState.isSubmitting || mutation.isPending || Boolean(duplicateEntry)}>
              {(form.formState.isSubmitting || mutation.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Record Transfer
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}

