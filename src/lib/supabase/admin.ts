import { createClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/types/database"

/**
 * Bypasses every RLS policy in the project, unconditionally. Reach for this
 * only when one of these is actually true -- not as the default for a new
 * `*.server.ts` file:
 *
 *  1. There is no user session to scope the query to at all -- a cron or
 *     webhook route authenticated by a shared secret, not a signed-in user
 *     (see the reminder-sending cron in
 *     app/api/planned-activities/reminders/send/route.ts, and the
 *     cron-only functions at the bottom of planned-activities.server.ts).
 *  2. The call is to Supabase's Auth admin API (`auth.admin.*` --
 *     listUsers, inviteUserByEmail, resetPasswordForEmail for someone
 *     else, ...). That's a separate system from Postgres RLS; there is no
 *     policy-based equivalent to ask for instead (see
 *     features/settings/users.server.ts, mutations.server.ts).
 *  3. The row being written is itself what would let RLS answer the
 *     question -- creating a farm's first membership row during
 *     onboarding, or resolving a pending invitation before the invitee is
 *     a member of anything yet. Genuine bootstrap cases, not routine
 *     reads/writes on an already-established farm.
 *
 * For everything else -- an authenticated user reading or writing data
 * their own session already has a real policy for -- use the client
 * `resolveServerUser()` / `requireApiUser()` already hands you (see
 * lib/server/auth.ts) and let the database enforce the rule directly,
 * the same way write-through.ts and every data-entry form already do.
 * A hand-rolled `farm_user` role check next to an admin-client query is
 * usually a sign a matching RLS policy already exists and got bypassed
 * instead of used -- settings, feed inventory, and the activity planner
 * all had exactly this shape until it was fixed.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Missing Supabase env vars: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY",
    )
  }

  return createClient<Database>(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
