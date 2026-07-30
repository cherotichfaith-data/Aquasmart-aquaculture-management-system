import type { User } from "@supabase/supabase-js"
import { requireActionUser } from "@/lib/server/auth"
import type { createClient } from "@/lib/supabase/server"

type MutationActionContext = {
  supabase: Awaited<ReturnType<typeof createClient>>
  user: User
}

/**
 * Server Actions: authenticate via the consolidated resolveServerUser()
 * (verified against Supabase's auth server). Throws "Unauthorized." if
 * there's no valid session -- see src/lib/server/auth.ts for why local,
 * unverified JWT decoding is not used anywhere in this app.
 */
export async function requireMutationActionUser(tag: string): Promise<MutationActionContext> {
  const { user, supabase } = await requireActionUser(tag)
  return { supabase, user }
}
