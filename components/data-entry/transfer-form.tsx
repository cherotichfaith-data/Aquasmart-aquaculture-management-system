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
import { useRecordTransfer } from "@/lib/hooks/use-transfer"
import { logSbError } from "@/utils/supabase/log"
import { DependencyBlocker } from "./dependency-blocker"

const formSchema = z.object({
    origin_system_id: z.string().min(1, "Origin system is required"),
    target_system_id: z.string().min(1, "Destination system is required"),
    transfer_type: z.enum(["transfer", "grading", "density_thinning", "broodstock", "count_check"]),
    batch_id: z.string().optional(),
    date: z.string().min(1, "Date is required"),
    number_of_fish: z.coerce.number().min(1, "Count must be positive"),
    total_weight_kg: z.coerce.number().min(0, "Weight must be positive"),
    average_body_weight_g: z.coerce.number().min(0).optional(),
})

const TRANSFER_TYPE_OPTIONS = [
    { value: "transfer", label: "Transfer" },
    { value: "grading", label: "Grading" },
    { value: "density_thinning", label: "Density thinning" },
    { value: "broodstock", label: "Broodstock move" },
    { value: "count_check", label: "Count check" },
] as const

interface TransferFormProps {
    systems: Database["public"]["Functions"]["api_system_options_rpc"]["Returns"][number][]
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
            date: new Date().toISOString().split("T")[0],
            number_of_fish: 0,
            origin_system_id: defaultSystemId ? String(defaultSystemId) : "",
            target_system_id: "",
            transfer_type: "transfer",
            batch_id: defaultBatchId ? String(defaultBatchId) : "none",
        },
    })

    async function onSubmit(values: z.infer<typeof formSchema>) {
        try {
            const isCountCheck = values.transfer_type === "count_check"
            if (!isCountCheck && values.origin_system_id === values.target_system_id) {
                form.setError("target_system_id", { message: "Origin and destination cannot be the same" })
                return
            }

            const originId = Number(values.origin_system_id)
            const targetId = Number(values.target_system_id)
            const batchId = values.batch_id && values.batch_id !== "none" ? Number(values.batch_id) : null

            const payload = {
                origin_system_id: originId,
                target_system_id: targetId,
                transfer_type: values.transfer_type,
                batch_id: Number.isFinite(batchId as number) ? batchId : null,
                date: values.date,
                number_of_fish_transfer: values.number_of_fish,
                total_weight_transfer: values.total_weight_kg,
                abw: values.average_body_weight_g ?? null,
            }

            await mutation.mutateAsync(payload)
            form.reset({
                date: new Date().toISOString().split("T")[0],
                number_of_fish: 0,
                total_weight_kg: 0,
                average_body_weight_g: 0,
                origin_system_id: values.origin_system_id,
                target_system_id: values.transfer_type === "count_check" ? values.origin_system_id : "",
                transfer_type: values.transfer_type,
                batch_id: values.batch_id,
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
        <div className="max-w-2xl">
            <div className="mb-6">
                <h2 className="text-xl font-semibold tracking-tight">Record Transfer</h2>
                <p className="text-sm text-muted-foreground">Log fish movement between systems.</p>
            </div>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                            control={form.control}
                            name="origin_system_id"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Origin System</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select origin" />
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
                            name="transfer_type"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Transfer Type</FormLabel>
                                    <Select
                                        onValueChange={(value) => {
                                            field.onChange(value)
                                            if (value === "count_check") {
                                                const origin = form.getValues("origin_system_id")
                                                if (origin) {
                                                    form.setValue("target_system_id", origin, { shouldValidate: true })
                                                }
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
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                            control={form.control}
                            name="target_system_id"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Destination System</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select destination" />
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
                    </div>
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

                    <div className="grid grid-cols-3 gap-4">
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
                        <FormField
                            control={form.control}
                            name="average_body_weight_g"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>ABW (g) (Optional)</FormLabel>
                                    <FormControl>
                                        <Input type="number" step="0.01" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                    <Button type="submit" disabled={form.formState.isSubmitting || mutation.isPending}>
                        {(form.formState.isSubmitting || mutation.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Submit Entry
                    </Button>
                </form>
            </Form>
        </div>
    )
}

