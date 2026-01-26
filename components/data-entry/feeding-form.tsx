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
import { createClient } from "@/utils/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { Tables } from "@/lib/types/database"

const formSchema = z.object({
    system_id: z.string().min(1, "System is required"),
    batch_id: z.string().optional(),
    date: z.string().min(1, "Date is required"),
    feed_id: z.string().min(1, "Feed type is required"),
    amount_kg: z.coerce.number().min(0, "Amount must be positive"),
    feeding_response: z.enum(["very_good", "good", "bad"]),
})

interface FeedingFormProps {
    systems: Tables<"system">[]
    feeds: Tables<"feed_type">[]
    batches: Tables<"fingerling_batch">[]
}

export function FeedingForm({ systems, feeds, batches }: FeedingFormProps) {
    const { toast } = useToast()
    const supabase = createClient()

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            date: new Date().toISOString().split("T")[0],
            amount_kg: 0,
            system_id: "",
            feed_id: "",
            feeding_response: "good",
            batch_id: "none",
        },
    })

    async function onSubmit(values: z.infer<typeof formSchema>) {
        try {
            const systemId = Number(values.system_id)
            const feedTypeId = Number(values.feed_id)
            const batchId = values.batch_id && values.batch_id !== "none" ? Number(values.batch_id) : null

            const { error } = await supabase.from("feeding_record").insert({
                system_id: systemId,
                batch_id: Number.isFinite(batchId as number) ? batchId : null,
                date: values.date,
                feed_type_id: feedTypeId,
                feeding_amount: values.amount_kg,
                feeding_response: values.feeding_response,
            })

            if (error) throw error

            toast({
                title: "Success",
                description: "Feeding event recorded.",
            })
            form.reset({
                date: new Date().toISOString().split("T")[0],
                amount_kg: 0,
                system_id: values.system_id,
                feed_id: values.feed_id,
                batch_id: values.batch_id,
                feeding_response: values.feeding_response,
            })
        } catch (error) {
            console.error(error)
            toast({
                variant: "destructive",
                title: "Error",
                description: "Failed to record feeding event.",
            })
        }
    }

    return (
        <div className="max-w-2xl">
            <div className="mb-6">
                <h2 className="text-xl font-semibold tracking-tight">Record Feeding</h2>
                <p className="text-sm text-muted-foreground">Log daily feeding for a system.</p>
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
                                                    {s.name ?? `System ${s.id}`}
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
                                                    {batch.name || `Batch ${batch.id}`}
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
                        name="feed_id"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Feed Type</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select feed" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {feeds.map((f) => (
                                            <SelectItem key={f.id} value={String(f.id)}>
                                                {f.feed_line ?? `Feed ${f.id}`}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <div className="grid grid-cols-2 gap-4">
                        <FormField
                            control={form.control}
                            name="amount_kg"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Amount (kg)</FormLabel>
                                    <FormControl>
                                        <Input type="number" step="0.01" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="feeding_response"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Response</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select response" />
                                    </SelectTrigger>
                                </FormControl>
                                        <SelectContent>
                                            <SelectItem value="very_good">Very Good</SelectItem>
                                            <SelectItem value="good">Good</SelectItem>
                                            <SelectItem value="bad">Bad</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                    <Button type="submit" disabled={form.formState.isSubmitting}>
                        {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Submit Entry
                    </Button>
                </form>
            </Form>
        </div>
    )
}
