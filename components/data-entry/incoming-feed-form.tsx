"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Button } from "@/components/ui/button"
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
    date: z.string().min(1, "Date is required"),
    feed_id: z.string().min(1, "Feed type is required"),
    quantity: z.coerce.number().min(0, "Quantity must be positive"),
    cost_per_unit: z.coerce.number().min(0).optional(),
    supplier_id: z.string().optional(),
})

interface IncomingFeedFormProps {
    feeds: Tables<"feeds_metadata">[]
    suppliers: Tables<"suppliers">[]
}

export function IncomingFeedForm({ feeds, suppliers }: IncomingFeedFormProps) {
    const { toast } = useToast()
    const supabase = createClient()

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            date: new Date().toISOString().split("T")[0],
            quantity: 0,
            cost_per_unit: 0,
            feed_id: "",
            supplier_id: "none",
        },
    })

    async function onSubmit(values: z.infer<typeof formSchema>) {
        try {
            const { error } = await supabase.from("incoming_feed_events").insert({
                date: values.date,
                feed_id: values.feed_id,
                quantity: values.quantity,
                cost_per_unit: values.cost_per_unit || 0,
                supplier_id: values.supplier_id === "none" ? null : values.supplier_id,
            })

            if (error) throw error

            toast({
                title: "Success",
                description: "Incoming feed recorded.",
            })
            form.reset({
                date: new Date().toISOString().split("T")[0],
                quantity: 0,
                feed_id: values.feed_id,
                supplier_id: values.supplier_id,
            })
        } catch (error) {
            console.error(error)
            toast({
                variant: "destructive",
                title: "Error",
                description: "Failed to record incoming feed.",
            })
        }
    }

    return (
        <div className="max-w-2xl">
            <div className="mb-6">
                <h2 className="text-xl font-semibold tracking-tight">Incoming Feed</h2>
                <p className="text-sm text-muted-foreground">Log new feed deliveries.</p>
            </div>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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

                    <div className="grid grid-cols-2 gap-4">
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
                                                <SelectItem key={f.feed_id} value={f.feed_id}>
                                                    {f.feed_name} ({f.brand})
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
                            name="supplier_id"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Supplier (Optional)</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select supplier" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="none">None</SelectItem>
                                            {suppliers.map((s) => (
                                                <SelectItem key={s.supplier_id} value={s.supplier_id}>
                                                    {s.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <FormField
                            control={form.control}
                            name="quantity"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Quantity (kg)</FormLabel>
                                    <FormControl>
                                        <Input type="number" step="0.01" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="cost_per_unit"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Cost per Unit (Optional)</FormLabel>
                                    <FormControl>
                                        <Input type="number" step="0.01" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>

                    <Button type="submit">Submit Entry</Button>
                </form>
            </Form>
        </div>
    )
}
