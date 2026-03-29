"use client"

import { useState } from "react"
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
import { useRecordFeedInventorySnapshot } from "@/lib/hooks/use-incoming-feed"
import { logSbError } from "@/lib/supabase/log"
import { DependencyBlocker } from "./dependency-blocker"
import { FeedTypeQuickCreate } from "./feed-type-quick-create"
import { InfoPanel, InfoStat } from "./form-support"

const SNAPSHOT_TIMES = [
  { value: "08:00", label: "8:00 AM" },
  { value: "16:00", label: "4:00 PM" },
] as const

const formSchema = z.object({
  date: z.string().min(1, "Date is required"),
  snapshot_time: z.enum(["08:00", "16:00"]),
  feed_id: z.string().min(1, "Feed type is required"),
  bag_weight_kg: z.coerce.number().min(0.01, "Bag weight must be positive"),
  number_of_bags: z.coerce.number().int().min(0, "Amount of bags cannot be negative"),
  open_bags_kg: z.coerce.number().min(0, "Open bag weight cannot be negative"),
  notes: z.string().max(500, "Comments must be 500 characters or fewer").optional(),
})

interface IncomingFeedFormProps {
  feeds: Database["public"]["Functions"]["api_feed_type_options_rpc"]["Returns"][number][]
  farmId: string | null
}

export function IncomingFeedForm({ feeds, farmId }: IncomingFeedFormProps) {
  const mutation = useRecordFeedInventorySnapshot()
  const [showQuickCreate, setShowQuickCreate] = useState(false)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      date: new Date().toISOString().split("T")[0],
      snapshot_time: "08:00",
      feed_id: "",
      bag_weight_kg: 25,
      number_of_bags: 0,
      open_bags_kg: 0,
      notes: "",
    },
  })

  const bagWeightKg = form.watch("bag_weight_kg")
  const numberOfBags = form.watch("number_of_bags")
  const openBagsKg = form.watch("open_bags_kg")
  const totalStockKg = (bagWeightKg || 0) * (numberOfBags || 0) + (openBagsKg || 0)

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      if (!farmId) {
        throw new Error("No active farm selected")
      }

      await mutation.mutateAsync({
        farm_id: farmId,
        date: values.date,
        snapshot_time: values.snapshot_time,
        feed_type_id: Number(values.feed_id),
        bag_weight_kg: values.bag_weight_kg,
        number_of_bags: values.number_of_bags,
        open_bags_kg: values.open_bags_kg,
        notes: values.notes?.trim() ? values.notes.trim() : null,
      })

      form.reset({
        date: new Date().toISOString().split("T")[0],
        snapshot_time: values.snapshot_time,
        feed_id: values.feed_id,
        bag_weight_kg: values.bag_weight_kg,
        number_of_bags: 0,
        open_bags_kg: 0,
        notes: "",
      })
    } catch (error) {
      logSbError("dataEntry:feedInventory:submit", error)
    }
  }

  if (feeds.length === 0) {
    return (
      <DependencyBlocker
        title="No feed types found."
        description="Add a feed type to continue."
        actionLabel={showQuickCreate ? "Hide feed type form" : "Add feed type"}
        onAction={() => setShowQuickCreate((current) => !current)}
      >
        {showQuickCreate ? <FeedTypeQuickCreate onCreated={() => setShowQuickCreate(false)} /> : null}
      </DependencyBlocker>
    )
  }

  return (
    <div className="max-w-6xl">
      <div className="mb-6">
        <h2 className="text-xl font-semibold tracking-tight">Feed Inventory Snapshot</h2>
        <p className="text-sm text-muted-foreground">Capture the 8 AM and 4 PM physical stock count, separate from deliveries.</p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(300px,1fr)]">
        <div className="space-y-6">
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
                  name="snapshot_time"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Time</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select time" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {SNAPSHOT_TIMES.map((option) => (
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

                <FormField
                  control={form.control}
                  name="feed_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Feed Type</FormLabel>
                      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="w-full sm:flex-1">
                            <SelectValue placeholder="Select feed" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {feeds.map((feed) => (
                            <SelectItem key={feed.id} value={String(feed.id)}>
                              {feed.label ?? feed.feed_line ?? `Feed ${feed.id}`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                        <Button
                          type="button"
                          variant={showQuickCreate ? "secondary" : "outline"}
                          size="sm"
                          className="w-full sm:w-auto"
                          onClick={() => setShowQuickCreate((current) => !current)}
                        >
                          {showQuickCreate ? "Hide new feed type" : "Add new feed type"}
                      </Button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {showQuickCreate ? <FeedTypeQuickCreate onCreated={() => setShowQuickCreate(false)} /> : null}

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <FormField
                  control={form.control}
                  name="bag_weight_kg"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bag Weight (kg)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="number_of_bags"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Amount of Bags</FormLabel>
                      <FormControl>
                        <Input type="number" step="1" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="open_bags_kg"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Open Bags (kg)</FormLabel>
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
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Comments</FormLabel>
                    <FormControl>
                      <textarea
                        {...field}
                        rows={3}
                        className="flex min-h-[88px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        placeholder="Bag damage, expected delivery, reconciliation issue, or store note."
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

        <InfoPanel title="Snapshot Totals">
          <InfoStat label="Bagged Stock" value={`${((bagWeightKg || 0) * (numberOfBags || 0)).toFixed(2)} kg`} />
          <InfoStat label="Open Bags" value={`${(openBagsKg || 0).toFixed(2)} kg`} />
          <InfoStat label="Total Stock" tone="success" value={`${totalStockKg.toFixed(2)} kg`} />
        </InfoPanel>
      </div>
    </div>
  )
}
