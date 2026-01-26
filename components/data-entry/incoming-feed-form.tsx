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
    date: z.string().min(1, "Date is required"),
    feed_id: z.string().min(1, "Feed type is required"),
    quantity: z.coerce.number().min(0, "Quantity must be positive"),
})

interface IncomingFeedFormProps {
    feeds: Tables<"feed_type">[]
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
            feed_id: "",
        },
    })

    async function onSubmit(values: z.infer<typeof formSchema>) {
        try {
            const feedTypeId = Number(values.feed_id)

            const { error } = await supabase.from("feed_incoming").insert({
                date: values.date,
                feed_amount: values.quantity,
                feed_type_id: feedTypeId,
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
