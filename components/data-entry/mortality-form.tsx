"use client"

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
import { useRecordMortality } from "@/lib/hooks/use-mortality"
import { MORTALITY_CAUSES, type MortalityCause } from "@/lib/types/mortality"
import { logSbError } from "@/utils/supabase/log"

// Schema
const formSchema = z.object({
    system_id: z.string().min(1, "System is required"),
    batch_id: z.string().optional(),
    date: z.string().min(1, "Date is required"),
    number_of_fish: z.coerce.number().min(0, "Must be positive"),
    avg_dead_wt_g: z.preprocess((value) => (value === "" || value == null ? undefined : Number(value)), z.number().min(0).optional()),
    cause: z.enum(MORTALITY_CAUSES).default("unknown"),
    notes: z.string().max(500, "Notes must be 500 characters or fewer").optional(),
})

interface MortalityFormProps {
    farmId: string | null
    systems: Database["public"]["Functions"]["api_system_options_rpc"]["Returns"][number][]
    batches: Database["public"]["Functions"]["api_fingerling_batch_options_rpc"]["Returns"][number][]
    defaultSystemId?: number | null
    defaultBatchId?: number | null
}

const CAUSE_LABELS: Record<MortalityCause, string> = {
    unknown: "Unknown",
    hypoxia: "Low DO / Hypoxia",
    disease: "Disease",
    injury: "Injury",
    handling: "Handling stress",
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
            avg_dead_wt_g: undefined,
            cause: "unknown",
            notes: "",
        },
    })

    async function onSubmit(values: z.infer<typeof formSchema>) {
        try {
            if (!farmId) {
                throw new Error("No active farm selected.")
            }
            const systemId = Number(values.system_id)
            const batchId = values.batch_id && values.batch_id !== "none" ? Number(values.batch_id) : null

            await mutation.mutateAsync({
                farm_id: farmId,
                system_id: systemId,
                batch_id: Number.isFinite(batchId as number) ? batchId : null,
                event_date: values.date,
                dead_count: values.number_of_fish,
                avg_dead_wt_g: values.avg_dead_wt_g ?? null,
                cause: values.cause,
                notes: values.notes?.trim() ? values.notes.trim() : null,
            })
            form.reset({
                date: new Date().toISOString().split("T")[0],
                number_of_fish: 0,
                system_id: values.system_id, // Keep system selected
                batch_id: values.batch_id,
                avg_dead_wt_g: undefined,
                cause: values.cause,
                notes: "",
            })
        } catch (error) {
            logSbError("dataEntry:mortality:submit", error)
        }
    }

    return (
        <div className="max-w-2xl">
            <div className="mb-6">
                <h2 className="text-xl font-semibold tracking-tight">Record Mortality</h2>
                <p className="text-sm text-muted-foreground">Log daily fish mortality for a system.</p>
            </div>

            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                            control={form.control}
                            name="system_id"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>System</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select system" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {systems.map((s) => (
                                                <SelectItem key={s.id} value={String(s.id)}>
                                                    {s.label ?? `System ${s.id}`}
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
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                    </div>

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

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                            control={form.control}
                            name="avg_dead_wt_g"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Average Dead Weight (g)</FormLabel>
                                    <FormControl>
                                        <Input type="number" step="0.1" {...field} value={field.value ?? ""} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="cause"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Likely Cause</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                    </div>

                    <FormField
                        control={form.control}
                        name="notes"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Notes (Optional)</FormLabel>
                                <FormControl>
                                    <textarea
                                        {...field}
                                        rows={3}
                                        className="flex min-h-[88px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                        placeholder="Observed stress signs, handling issue, predator trace, or follow-up action."
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

