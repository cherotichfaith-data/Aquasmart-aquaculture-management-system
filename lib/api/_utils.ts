import type { QueryResult } from "@/lib/supabase-client"
import { createClient } from "@/utils/supabase/client"
import { isSbPermissionDenied, logSbError } from "@/utils/supabase/log"
import { getSessionUser } from "@/utils/supabase/session"

type SupabaseClient = ReturnType<typeof createClient>

export async function getClientOrError(
  tag: string,
  options?: { requireSession?: boolean },
): Promise<
  | { supabase: SupabaseClient }
  | { error: QueryResult<never> }
> {
  const supabase = createClient()
  const requireSession = options?.requireSession ?? false
  if (requireSession) {
    const sessionUser = await getSessionUser(supabase, `api:${tag}:getSession`)
    if (!sessionUser) {
      return { error: { status: "error", data: null, error: "No active session" } }
    }
  }
  return { supabase }
}

export function toQueryError<T>(tag: string, err: unknown): QueryResult<T> {
  if (!isSbPermissionDenied(err)) {
    logSbError(tag, err)
  }
  const message = err instanceof Error
    ? err.message
    : String((typeof err === "object" && err !== null && "message" in err && typeof err.message === "string")
      ? err.message
      : err ?? "Unknown error")
  return { status: "error", data: null, error: message }
}

export function toQuerySuccess<T>(data: T[] | null | undefined): QueryResult<T> {
  return { status: "success", data: (data ?? []) as T[] }
}
