import { z } from "zod"
import type { SupabaseClient } from "@supabase/supabase-js"
import { createAdminClient } from "@/lib/supabase/admin"
import type { Database } from "@/lib/types/database"
import type {
  PlannedActivity,
  PlannedActivityInput,
  PlannedActivityStatus,
  PlannedActivityWindow,
} from "@/features/dashboard/planned-activities"
import { isSbPermissionDenied, logSbError } from "@/lib/supabase/log"

const plannedActivityInputSchema = z.object({
  farmId: z.string().uuid("Invalid farm ID."),
  title: z.string().trim().min(1, "Task is required.").max(120, "Task must be 120 characters or fewer."),
  notes: z.string().max(1000, "Notes must be 1000 characters or fewer."),
  scheduledDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date."),
  planningWindow: z.enum(["tomorrow", "this_week"]),
})

const plannedActivityStatusSchema = z.enum(["planned", "done"])

type PlannedActivityRow = Database["public"]["Tables"]["activity_planner"]["Row"]
type PlannedActivityInsert = Database["public"]["Tables"]["activity_planner"]["Insert"]
type PlannedActivityUpdate = Database["public"]["Tables"]["activity_planner"]["Update"]
type ReminderDeliveryRow = Database["public"]["Tables"]["activity_planner_reminder_delivery"]["Row"]
type ReminderDeliveryInsert = Database["public"]["Tables"]["activity_planner_reminder_delivery"]["Insert"]

/**
 * Any client whose queries should be scoped by RLS -- the caller's own
 * session for the four user-request functions below, or the service role
 * for the cron-only functions at the bottom of this file that have no
 * user session to scope to at all.
 */
type AppSupabaseClient = SupabaseClient<Database>

function getPlannedActivitiesTable(client: AppSupabaseClient) {
  return client.from("activity_planner")
}

function getReminderDeliveryTable(client: AppSupabaseClient) {
  return client.from("activity_planner_reminder_delivery")
}

function mapPlannedActivityRow(row: PlannedActivityRow): PlannedActivity {
  return {
    id: row.id,
    farm_id: row.farm_id,
    created_by: row.created_by,
    title: row.title,
    notes: row.notes,
    scheduled_date: row.scheduled_date,
    planning_window: row.planning_window as PlannedActivityWindow,
    status: row.status as PlannedActivityStatus,
    completed_at: row.completed_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

/**
 * `supabase` is the caller's own session-scoped client for all four
 * functions below (see their callers under app/api/planned-activities/,
 * each already resolved via requireApiUser()). There's no
 * assertFarmReadAccess/assertFarmWriteAccess pre-check anymore -- the
 * 20260817090000 migration's four activity_planner policies
 * (select/insert/update/delete) already say exactly the same thing
 * ("is_farm_member" for reads, "has_farm_role(admin/farm_manager/
 * system_operator)" for writes), so re-deriving it here would just be the
 * same drift risk already fixed for settings and feed inventory.
 */
export async function listPlannedActivitiesForFarm(farmId: string, supabase: AppSupabaseClient): Promise<PlannedActivity[]> {
  const { data, error } = await getPlannedActivitiesTable(supabase)
    .select("*")
    .eq("farm_id", farmId)
    .order("scheduled_date", { ascending: true })
    .order("created_at", { ascending: true })

  if (error) {
    logSbError("plannedActivities:list", error)
    throw new Error("Unable to load planned activities.")
  }

  return ((data ?? []) as PlannedActivityRow[]).map(mapPlannedActivityRow)
}

export async function createPlannedActivity(
  input: PlannedActivityInput,
  userId: string,
  supabase: AppSupabaseClient,
): Promise<PlannedActivity> {
  const payload = plannedActivityInputSchema.parse(input)

  const { data, error } = await getPlannedActivitiesTable(supabase)
    .insert({
      farm_id: payload.farmId,
      created_by: userId,
      title: payload.title,
      notes: payload.notes,
      scheduled_date: payload.scheduledDate,
      planning_window: payload.planningWindow,
      status: "planned",
      completed_at: null,
    } satisfies PlannedActivityInsert)
    .select("*")
    .maybeSingle()

  if (error || !data) {
    logSbError("plannedActivities:create", error)
    if (isSbPermissionDenied(error)) {
      throw new Error("You do not have permission to create planned activities for this farm.")
    }
    throw new Error("Unable to create planned activity.")
  }

  return mapPlannedActivityRow(data as unknown as PlannedActivityRow)
}

export async function updatePlannedActivityStatus(params: {
  activityId: string
  farmId: string
  status: PlannedActivityStatus
  supabase: AppSupabaseClient
}): Promise<PlannedActivity> {
  const activityId = z.string().uuid("Invalid activity ID.").parse(params.activityId)
  const farmId = z.string().uuid("Invalid farm ID.").parse(params.farmId)
  const status = plannedActivityStatusSchema.parse(params.status)

  const { data, error } = await getPlannedActivitiesTable(params.supabase)
    .update({
      status,
      completed_at: status === "done" ? new Date().toISOString() : null,
    } satisfies PlannedActivityUpdate)
    .eq("id", activityId)
    .eq("farm_id", farmId)
    .select("*")
    .maybeSingle()

  if (error || !data) {
    logSbError("plannedActivities:updateStatus", error)
    if (isSbPermissionDenied(error)) {
      throw new Error("You do not have permission to update planned activities for this farm.")
    }
    // No row back and no error is also what a plain "wrong/missing id"
    // looks like -- the RLS policy's USING clause filters rather than
    // errors, so this can't be split further from here without leaking
    // whether a row the caller can't see exists at all.
    throw new Error("Unable to update planned activity.")
  }

  return mapPlannedActivityRow(data as unknown as PlannedActivityRow)
}

export async function deletePlannedActivity(params: {
  activityId: string
  farmId: string
  supabase: AppSupabaseClient
}): Promise<void> {
  const activityId = z.string().uuid("Invalid activity ID.").parse(params.activityId)
  const farmId = z.string().uuid("Invalid farm ID.").parse(params.farmId)

  // .select() here isn't just for consistency with update -- a plain
  // .delete() with no matching (or RLS-visible) row succeeds silently
  // with zero rows affected and no error, which previously never mattered
  // because assertFarmWriteAccess had already rejected an unauthorized
  // caller before reaching this query. Without that pre-check, skipping
  // the .select() would mean an unauthorized delete request comes back
  // as 204 success having deleted nothing.
  const { data, error } = await getPlannedActivitiesTable(params.supabase)
    .delete()
    .eq("id", activityId)
    .eq("farm_id", farmId)
    .select("id")
    .maybeSingle()

  if (error || !data) {
    logSbError("plannedActivities:delete", error)
    if (isSbPermissionDenied(error)) {
      throw new Error("You do not have permission to delete planned activities for this farm.")
    }
    throw new Error("Unable to delete planned activity.")
  }
}

/**
 * The three functions below back the reminder cron
 * (app/api/planned-activities/reminders/send/route.ts), which runs on a
 * cron secret with no user session at all and needs every due activity
 * across every farm, not one caller's own. The service role is the
 * correct, deliberate choice here -- unlike the four functions above, there
 * is no session to scope these to.
 */

export async function listReminderDeliveriesForDate(reminderDate: string) {
  const admin = createAdminClient()
  const { data, error } = await getReminderDeliveryTable(admin)
    .select("activity_planner_id, recipient_email, reminder_date")
    .eq("reminder_date", reminderDate)

  if (error) {
    logSbError("plannedActivities:listReminderDeliveriesForDate", error)
    throw new Error("Unable to load reminder delivery history.")
  }

  return (data ?? []) as Pick<ReminderDeliveryRow, "activity_planner_id" | "recipient_email" | "reminder_date">[]
}

export async function listPlannedActivitiesForScheduledDate(scheduledDate: string) {
  const admin = createAdminClient()
  const { data, error } = await getPlannedActivitiesTable(admin)
    .select("*")
    .eq("scheduled_date", scheduledDate)
    .eq("status", "planned")
    .order("farm_id", { ascending: true })
    .order("created_at", { ascending: true })

  if (error) {
    logSbError("plannedActivities:listPlannedActivitiesForScheduledDate", error)
    throw new Error("Unable to load due planned activities.")
  }

  return ((data ?? []) as PlannedActivityRow[]).map(mapPlannedActivityRow)
}

export async function recordReminderDeliveries(rows: Array<{
  plannedActivityId: string
  recipientEmail: string
  reminderDate: string
  providerMessageId?: string | null
}>) {
  if (!rows.length) return

  const admin = createAdminClient()
  const { error } = await getReminderDeliveryTable(admin).insert(
    rows.map((row) => ({
      activity_planner_id: row.plannedActivityId,
      recipient_email: row.recipientEmail,
      reminder_date: row.reminderDate,
      provider_message_id: row.providerMessageId ?? null,
    }) satisfies ReminderDeliveryInsert),
  )

  if (error) {
    logSbError("plannedActivities:recordReminderDeliveries", error)
    throw new Error("Unable to record reminder deliveries.")
  }
}
