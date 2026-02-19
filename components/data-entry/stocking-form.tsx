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
import { Tables } from "@/lib/types/database"
import { refreshMaterializedViews } from "@/lib/api/admin"
import { useRecordStocking } from "@/lib/hooks/use-stocking"
import { logSbError } from "@/utils/supabase/log"

const formSchema = z.object({
    system_id: z.string().min(1, "System is required"),
    batch_id: z.string().min(1, "Batch is required"),
    stocking_date: z.string().min(1, "Date is required"),
    number_of_fish: z.coerce.number().min(1, "Quantity must be positive"),
    total_weight_kg: z.coerce.number().min(0, "Weight must be positive"),
    average_body_weight_g: z.coerce.number().min(0).optional(),
    type_of_stocking: z.enum(["empty", "already_stocked"]),
})

interface StockingFormProps {
    systems: Tables<"api_system_options">[]
    batches: Tables<"api_fingerling_batch_options">[]
}

export function StockingForm({ systems, batches }: StockingFormProps) {
    const mutation = useRecordStocking()

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            stocking_date: new Date().toISOString().split("T")[0],
            number_of_fish: 0,
            total_weight_kg: 0,
            average_body_weight_g: 0,
            system_id: "",
            batch_id: "",
            type_of_stocking: "empty",
        },
    })


    async function onSubmit(values: z.infer<typeof formSchema>) {
        try {
            const abw = values.average_body_weight_g ?? 0

            const systemId = Number(values.system_id)
            const batchId = Number(values.batch_id)

            await mutation.mutateAsync({
                system_id: systemId,
                batch_id: batchId,
                date: values.stocking_date,
                number_of_fish_stocking: values.number_of_fish,
                total_weight_stocking: values.total_weight_kg,
                abw,
                type_of_stocking: values.type_of_stocking,
            })

            const refreshResult = await refreshMaterializedViews()
            if (refreshResult.status === "error") {
                console.warn("[stocking] MV refresh failed:", refreshResult.error)
            }

            form.reset({
                stocking_date: new Date().toISOString().split("T")[0],
                number_of_fish: 0,
                total_weight_kg: 0,
                average_body_weight_g: 0,
                system_id: values.system_id,
                batch_id: values.batch_id,
                type_of_stocking: values.type_of_stocking,
            })
        } catch (error) {
            logSbError("dataEntry:stocking:submit", error)
        }
    }

    return (
        <div className="max-w-2xl">
            <div className="mb-6">
                <h2 className="text-xl font-semibold tracking-tight">Record Stocking</h2>
                <p className="text-sm text-muted-foreground">Log new fish stocking into a system.</p>
            </div>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
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
                                    <FormLabel>Batch</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select batch" />
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
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <FormField
                            control={form.control}
                            name="number_of_fish"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Quantity (pcs)</FormLabel>
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
                                    <FormLabel>ABW (g) (Auto)</FormLabel>
                                    <FormControl>
                                        <Input type="number" step="0.01" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>

                    <FormField
                        control={form.control}
                        name="type_of_stocking"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Stocking Type</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select type" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="empty">Empty system</SelectItem>
                                        <SelectItem value="already_stocked">Already stocked</SelectItem>
                                    </SelectContent>
                                </Select>
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
