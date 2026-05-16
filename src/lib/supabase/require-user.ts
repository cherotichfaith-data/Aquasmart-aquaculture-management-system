import type { User } from "@supabase/supabase-js"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { sanitizeNextPath } from "@/lib/app-entry"
import { isSbInvalidRefreshToken, logSbError } from "@/lib/supabase/log"
import { getSessionIdentity, isSessionTokenExpired } from "@/lib/supabase/session"

function redirectToAuth(nextPath?: string | null): never {
  const safeNextPath = sanitizeNextPath(nextPath, "/dashboard")
  redirect(`/auth?next=${encodeURIComponent(safeNextPath)}`)
}

/**
 * Reads the auth session from the cookie WITHOUT making a network call to
 * Supabase's auth server. getSession() decodes the JWT locally; getUser()
 * (which we no longer use here) verifies it remotely — that fails on machines
 * where the server process can't reach Supabase's edge network.
 */
export async function requireUserContext(nextPath?: string | null) {
  const supabase = await createClient()
  let session = null
  let sessionError: unknown = null

  try {
    const result = await supabase.auth.getSession()
    session = result.data.session
    sessionError = result.error
  } catch (caught) {
    sessionError = caught
  }

  if (session?.access_token && isSessionTokenExpired(session.access_token)) {
    try {
      const refreshed = await supabase.auth.refreshSession()
      session = refreshed.data.session
      sessionError = refreshed.error
    } catch (caught) {
      sessionError = caught
    }
  }

  const identity = getSessionIdentity(session?.access_token)

  if (sessionError || !session?.access_token || !identity) {
    if (sessionError) {
      if (!isSbInvalidRefreshToken(sessionError)) {
        logSbError("requireUserContext:getSession", sessionError)
      }
    }
    redirectToAuth(nextPath)
  }

  const user: Pick<User, "id" | "email" | "user_metadata" | "app_metadata"> = {
    id: identity.userId,
    email: identity.email ?? undefined,
    user_metadata: identity.userMetadata,
    app_metadata: identity.appMetadata,
  }

  return { user, accessToken: session!.access_token }
}

export async function requireUser(nextPath?: string | null) {
  const { user } = await requireUserContext(nextPath)
  return user
}
