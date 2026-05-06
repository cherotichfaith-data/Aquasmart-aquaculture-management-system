import type { User } from "@supabase/supabase-js"
import { logSbError } from "@/lib/supabase/log"
import { createClient } from "@/lib/supabase/server"
import { getSessionIdentity } from "@/lib/supabase/session"

type MutationActionContext = {
  supabase: Awaited<ReturnType<typeof createClient>>
  user: User
}

/**
 * Reads the session from cookie (no network call) to authenticate server
 * actions. Throws "Unauthorized." if the session cookie is absent.
 */
export async function requireMutationActionUser(tag: string): Promise<MutationActionContext> {
  const supabase = await createClient()
  let session = null
  let error: unknown = null

  try {
    const result = await supabase.auth.getSession()
    session = result.data.session
    error = result.error
  } catch (caught) {
    error = caught
  }

  const identity = getSessionIdentity(session?.access_token)

  if (error || !session?.access_token || !identity) {
    if (error) {
      logSbError(`${tag}:getSession`, error)
    }
    throw new Error("Unauthorized.")
  }

  const user: Pick<User, "id" | "email" | "user_metadata" | "app_metadata"> = {
    id: identity.userId,
    email: identity.email ?? undefined,
    user_metadata: identity.userMetadata,
    app_metadata: identity.appMetadata,
  }

  return { supabase, user: user as User }
}
