"use server"

import { z } from "zod"
import { cacheTags, feedInventoryWriteTags } from "@/lib/cache/tags"
import { revalidateWriteTags } from "@/lib/server/write-through"
import { requireMutationActionUser } from "@/lib/server/mutation-actions"
import { isSbPermissionDenied, logSbError } from "@/lib/supabase/log"
import type { Database } from "@/lib/types/database"

type Row<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Row"]
type Insert<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Insert"]

export type FeedSupplierInput = Insert<"feed_supplier">
export type FeedTypeInput = Insert<"feed_type">
export type FeedInventorySnapshotInput = Insert<"feed_incoming">

const feedSupplierSchema = z.object({
  company_name: z.string().trim().min(1).max(255),
  location_country: z.string().trim().min(1).max(255),
  location_city: z.string().trim().max(255).nullable().optional(),
})

const feedTypeSchema = z.object({
  feed_line: z.string().trim().max(255).nullable().optional(),
  feed_category: z.enum(["pre-starter", "starter", "pre-grower", "grower", "finisher", "broodstock"]),
  feed_pellet_size: z.enum(["mash_powder", "<0.49mm", "0.5-0.99mm", "1.0-1.5mm", "1.5-1.99mm", "2mm", "2.5mm", "3mm"]),
  crude_protein_percentage: z.number().finite().positive(),
  crude_fat_percentage: z.number().finite().min(0).nullable().optional(),
  feed_supplier: z.number().int().positive(),
})

const FEED_INVENTORY_ALLOWED_ROLES = new Set(["admin", "farm_manager", "system_operator"])

const feedInventorySchema = z.object({
  farm_id: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  feed_type_id: z.number().int().positive(),
  feed_amount: z.number().finite().positive(),
})

export async function createFeedSupplierAction(payload: FeedSupplierInput): Promise<{ data: Row<"feed_supplier"> }> {
  const { supabase } = await requireMutationActionUser("feed-supplier:create")

  let parsedPayload: z.infer<typeof feedSupplierSchema>
  try {
    parsedPayload = feedSupplierSchema.parse(payload)
  } catch (error) {
    throw new Error(
      error instanceof z.ZodError ? error.issues[0]?.message ?? "Invalid feed supplier payload." : "Invalid request body.",
    )
  }

  const { data, error } = await supabase
    .from("feed_supplier")
    .insert({
      company_name: parsedPayload.company_name,
      location_country: parsedPayload.location_country,
      location_city: parsedPayload.location_city?.trim() ? parsedPayload.location_city.trim() : null,
    })
    .select()
    .single()

  if (error || !data) {
    logSbError("feed-supplier:create:insert", error)
    if (isSbPermissionDenied(error)) {
      throw new Error("Unable to create feed supplier.")
    }
    throw new Error("Unable to create feed supplier.")
  }

  revalidateWriteTags([cacheTags.feedSuppliers()])

  return { data }
}

export async function createFeedTypeAction(payload: FeedTypeInput): Promise<{ data: Row<"feed_type"> }> {
  const { supabase } = await requireMutationActionUser("feed-type:create")

  let parsedPayload: z.infer<typeof feedTypeSchema>
  try {
    parsedPayload = feedTypeSchema.parse(payload)
  } catch (error) {
    throw new Error(
      error instanceof z.ZodError ? error.issues[0]?.message ?? "Invalid feed type payload." : "Invalid request body.",
    )
  }

  const { data, error } = await supabase
    .from("feed_type")
    .insert({
      feed_line: parsedPayload.feed_line?.trim() ? parsedPayload.feed_line.trim() : null,
      feed_category: parsedPayload.feed_category,
      feed_pellet_size: parsedPayload.feed_pellet_size,
      crude_protein_percentage: parsedPayload.crude_protein_percentage,
      crude_fat_percentage: parsedPayload.crude_fat_percentage ?? null,
      feed_supplier: parsedPayload.feed_supplier,
    })
    .select()
    .single()

  if (error || !data) {
    logSbError("feed-type:create:insert", error)
    if (isSbPermissionDenied(error)) {
      throw new Error("Unable to create feed type.")
    }
    throw new Error("Unable to create feed type.")
  }

  revalidateWriteTags([cacheTags.feedTypes()])

  return { data }
}

export async function recordFeedInventorySnapshotAction(
  payload: FeedInventorySnapshotInput,
): Promise<{ data: Row<"feed_incoming">; meta: { farmId: string; date: string } }> {
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

  const { data, error } = await supabase
    .from("feed_incoming")
    .insert({
      farm_id: parsedPayload.farm_id,
      date: parsedPayload.date,
      feed_type_id: parsedPayload.feed_type_id,
      feed_amount: parsedPayload.feed_amount,
    })
    .select()
    .single()

  if (error || !data) {
    logSbError("feed-inventory:record:insert", error)
    if (isSbPermissionDenied(error)) {
      throw new Error("Unable to record feed delivery.")
    }
    throw new Error("Unable to record feed delivery.")
  }

  revalidateWriteTags(feedInventoryWriteTags({ farmId: parsedPayload.farm_id }))

  return {
    data,
    meta: {
      farmId: parsedPayload.farm_id,
      date: parsedPayload.date,
    },
  }
}
