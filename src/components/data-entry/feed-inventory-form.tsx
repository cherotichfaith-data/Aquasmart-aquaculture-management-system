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
import { useRecordFeedInventorySnapshot } from "@/lib/hooks/use-feed-inventory"
import { logSbError } from "@/lib/supabase/log"
import { OfflineSaveBadge } from "@/components/offline/offline-save-badge"
import { InfoPanel, InfoStat } from "./form-support"
import { parseRequiredNumericId, reportDataEntrySubmitError, requireActiveFarmId } from "./form-utils"

const formSchema = z.object({
  inventory_date: z.string().min(1, "Date is required"),
  inventory_time: z.string().min(1, "Time is required"),
  feed_id: z.string().min(1, "Feed type is required"),
  bag_weight_kg: z.coerce.number().min(0.01, "Bag weight must be positive"),
  number_of_bags: z.coerce.number().int().min(0, "Amount of bags cannot be negative"),
  opened_bags: z.coerce.number().int().min(0, "Open feed cannot be negative"),
  comments: z.string().max(500, "Comments must be 500 characters or fewer").optional(),
})

interface FeedInventoryFormProps {
  feeds: Database["public"]["Functions"]["api_feed_type_options_rpc"]["Returns"][number][]
  farmId: string | null
}

export function FeedInventoryForm({ feeds, farmId }: FeedInventoryFormProps) {
  const mutation = useRecordFeedInventorySnapshot()
  const feedInventoryFeeds = feeds

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      inventory_date: new Date().toISOString().split("T")[0],
      inventory_time: "16:00",
      feed_id: "",
      bag_weight_kg: 25,
      number_of_bags: 0,
      opened_bags: 0,
      comments: "",
    },
  })

  const selectedFeedId = form.watch("feed_id")
  const bagWeightKg = form.watch("bag_weight_kg")
  const numberOfBags = form.watch("number_of_bags")
  const openedBags = form.watch("opened_bags")
  const selectedFeed = feedInventoryFeeds.find((feed) => String(feed.id) === selectedFeedId) ?? null
  const selectedFeedLabel = selectedFeed?.label ?? selectedFeed?.feed_line ?? (selectedFeed ? `Feed ${selectedFeed.id}` : "")

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      const resolvedFarmId = requireActiveFarmId(farmId)
      const feedTypeId = parseRequiredNumericId(values.feed_id, "Feed type")

      await mutation.mutateAsync({
        farm_id: resolvedFarmId,
        inventory_date: values.inventory_date,
        inventory_time: values.inventory_time,
        feed_type_id: feedTypeId,
        feed_type_label: selectedFeedLabel,
        bag_weight: values.bag_weight_kg,
        amount_of_bags: values.number_of_bags,
        opened_bags: values.opened_bags,
        comments: values.comments?.trim() ? values.comments.trim() : null,
      })

      form.reset({
        inventory_date: new Date().toISOString().split("T")[0],
        inventory_time: values.inventory_time,
        feed_id: values.feed_id,
        bag_weight_kg: values.bag_weight_kg,
        number_of_bags: 0,
        opened_bags: 0,
        comments: "",
      })
    } catch (error) {
      logSbError("dataEntry:feedInventory:submit", error)
      reportDataEntrySubmitError(error, "Failed to record feed inventory.")
    }
  }

  if (feedInventoryFeeds.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border/80 bg-muted/20 px-4 py-6 text-sm text-muted-foreground">
        No feed types are available for this farm yet.
      </div>
    )
  }

  return (
    <div>
      <div className="data-entry-form-intro">
        <h2 className="text-xl font-semibold tracking-tight">Feed Inventory</h2>
        <p className="text-sm text-muted-foreground">Record current feed stock by feed type, including bagged and open-bag quantities.</p>
      </div>

      <div className="data-entry-status">
        <OfflineSaveBadge result={mutation.data} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(300px,1fr)]">
        <div className="space-y-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <FormField
                  control={form.control}
                  name="inventory_date"
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
                  name="inventory_time"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Time</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} />
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
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="w-full sm:flex-1">
                            <SelectValue placeholder="Select feed" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {feedInventoryFeeds.map((feed) => (
                            <SelectItem key={feed.id} value={String(feed.id)}>
                              {feed.label ?? feed.feed_line ?? `Feed ${feed.id}`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="data-entry-compact-grid md:grid-cols-3">
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
                  name="opened_bags"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Open Feed (g)</FormLabel>
                      <FormControl>
                        <Input type="number" step="1" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="comments"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Comments</FormLabel>
                    <FormControl>
                      <textarea
                        {...field}
                        rows={3}
                        className="data-entry-textarea"
                        placeholder="Stock count note, adjustment reason, or storage observation."
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="data-entry-action" disabled={form.formState.isSubmitting || mutation.isPending}>
                {(form.formState.isSubmitting || mutation.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Record Feed Inventory
              </Button>
            </form>
          </Form>
        </div>

        <InfoPanel title="Snapshot Totals">
          <InfoStat label="Bag Weight" value={`${Number.isFinite(bagWeightKg) ? bagWeightKg : 0} kg`} />
          <InfoStat label="Closed Bags" value={`${Number.isFinite(numberOfBags) ? numberOfBags : 0}`} />
          <InfoStat label="Open Feed" tone="success" value={`${Number.isFinite(openedBags) ? openedBags : 0} g`} />
        </InfoPanel>
      </div>
    </div>
  )
}

