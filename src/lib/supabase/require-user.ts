import type { User } from "@supabase/supabase-js"
import { redirect } from "next/navigation"
import { sanitizeNextPath } from "@/lib/app-entry"
import { resolveServerUser } from "@/lib/server/auth"

function redirectToAuth(nextPath?: string | null): never {
  const safeNextPath = sanitizeNextPath(nextPath, "/dashboard")
  redirect(`/auth?next=${encodeURIComponent(safeNextPath)}`)
}

/**
 * Server Components / pages: resolves the current user via
 * resolveServerUser() (verified against Supabase's auth server) and redirects
 * to /auth if there isn't one. See src/lib/server/auth.ts for why this no
 * longer decodes the session cookie locally.
 */
export async function requireUserContext(nextPath?: string | null) {
  const result = await resolveServerUser("page:requireUserContext")

  if (!result.ok) {
    redirectToAuth(nextPath)
  }

  return { user: result.user, accessToken: result.accessToken }
}

export async function requireUser(nextPath?: string | null): Promise<User> {
  const { user } = await requireUserContext(nextPath)
  return user
}
