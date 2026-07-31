"use server"

import { z } from "zod"
import { feedInventoryWriteTags } from "@/lib/cache/tags"
import { revalidateWriteTags } from "@/lib/server/write-through"
import { requireMutationActionUser } from "@/lib/server/mutation-actions"
import { createAdminClient } from "@/lib/supabase/admin"
import { isSbPermissionDenied, logSbError } from "@/lib/supabase/log"
import type { Database } from "@/lib/types/database"

type Row<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Row"]
type Insert<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Insert"]

export type FeedInventorySnapshotInput = Insert<"feed_inventory"> & { feed_type_label?: string }

const FEED_INVENTORY_ALLOWED_ROLES = new Set(["admin", "farm_manager", "system_operator"])

const feedInventorySchema = z.object({
  farm_id: z.string().uuid(),
  inventory_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  inventory_time: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
  feed_type_id: z.number().int().positive(),
  bag_weight: z.number().finite().positive(),
  amount_of_bags: z.number().finite().min(0),
  opened_bags: z.number().int().min(0).nullable().optional(),
  comments: z.string().trim().max(500).nullable().optional(),
})

export async function recordFeedInventorySnapshotAction(
  payload: FeedInventorySnapshotInput,
): Promise<{ data: Row<"feed_inventory">; meta: { farmId: string; date: string } }> {
  const { supabase, user } = await requireMutationActionUser("feed-inventory:record")

  let parsedPayload: z.infer<typeof feedInventorySchema>
  try {
    parsedPayload = feedInventorySchema.parse(payload)
  } catch (error) {
    throw new Error(
      error instanceof z.ZodError ? error.issues[0]?.message ?? "Invalid feed inventory payload." : "Invalid request body.",
    )
  }

  const { data: membership, error: membershipError } = await supabase
    .from("farm_user")
    .select("role")
    .eq("farm_id", parsedPayload.farm_id)
    .eq("user_id", user.id)
    .maybeSingle()

  if (membershipError) {
    logSbError("feed-inventory:record:membership", membershipError)
    throw new Error("Unable to verify feed inventory permissions.")
  }

  if (!membership?.role || !FEED_INVENTORY_ALLOWED_ROLES.has(membership.role)) {
    throw new Error("You do not have permission to record feed inventory.")
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from("feed_inventory")
    .insert({
      farm_id: parsedPayload.farm_id,
      inventory_date: parsedPayload.inventory_date,
      inventory_time: parsedPayload.inventory_time ?? null,
      feed_type_id: parsedPayload.feed_type_id,
      bag_weight: parsedPayload.bag_weight,
      amount_of_bags: parsedPayload.amount_of_bags,
      opened_bags: parsedPayload.opened_bags ?? null,
      comments: parsedPayload.comments?.trim() ? parsedPayload.comments.trim() : null,
    })
    .select()
    .single()

  if (error || !data) {
    logSbError("feed-inventory:record:insert", error)
    if (isSbPermissionDenied(error)) {
      throw new Error("Unable to record feed inventory.")
    }
    throw new Error("Unable to record feed inventory.")
  }

  revalidateWriteTags(feedInventoryWriteTags({ farmId: parsedPayload.farm_id }))

  return {
    data,
    meta: {
      farmId: parsedPayload.farm_id,
      date: parsedPayload.inventory_date,
    },
  }
}
