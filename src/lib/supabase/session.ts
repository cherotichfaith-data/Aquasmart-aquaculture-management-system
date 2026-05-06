import type { SupabaseClient, User } from "@supabase/supabase-js"
import { isSbAuthMissing, isSbNetworkError, logSbError } from "./log"

export type SessionIdentity = {
  userId: string
  email: string | null
  userMetadata: User["user_metadata"]
  appMetadata: User["app_metadata"]
}

function parseAccessTokenPayload(accessToken: string | null | undefined) {
  if (!accessToken) return null

  const [, payload] = accessToken.split(".")
  if (!payload) return null

  try {
    return JSON.parse(decodeBase64Url(payload)) as Record<string, unknown>
  } catch {
    return null
  }
}

function decodeBase64Url(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/")
  const padding = normalized.length % 4
  const padded = padding === 0 ? normalized : `${normalized}${"=".repeat(4 - padding)}`

  if (typeof atob === "function") {
    const binary = atob(padded)
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
    return new TextDecoder().decode(bytes)
  }

  return Buffer.from(padded, "base64").toString("utf8")
}

export function getSessionIdentity(accessToken: string | null | undefined): SessionIdentity | null {
  const parsed = parseAccessTokenPayload(accessToken)
  if (!parsed) return null
  const userId = typeof parsed.sub === "string" ? parsed.sub : null

  if (!userId) return null

  return {
    userId,
    email: typeof parsed.email === "string" ? parsed.email : null,
    userMetadata:
      parsed.user_metadata && typeof parsed.user_metadata === "object"
        ? (parsed.user_metadata as User["user_metadata"])
        : {},
    appMetadata:
      parsed.app_metadata && typeof parsed.app_metadata === "object"
        ? (parsed.app_metadata as User["app_metadata"])
        : {},
  }
}

export function isSessionTokenExpired(accessToken: string | null | undefined, skewSeconds = 30) {
  const parsed = parseAccessTokenPayload(accessToken)
  if (!parsed) return true
  const exp = typeof parsed.exp === "number" ? parsed.exp : null
  if (!exp) return false
  const now = Math.floor(Date.now() / 1000)
  return exp <= now + skewSeconds
}

export async function getSessionUser(
  supabase: SupabaseClient,
  tag: string,
): Promise<User | null> {
  try {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
    const initialAccessToken = sessionData.session?.access_token ?? null
    const accessToken = isSessionTokenExpired(initialAccessToken)
      ? null
      : initialAccessToken
    const identity = getSessionIdentity(accessToken)

    if (sessionError) {
      if (!isSbAuthMissing(sessionError) && !isSbNetworkError(sessionError)) {
        logSbError(tag, sessionError)
      }
    }

    if (accessToken && identity) {
      return {
        id: identity.userId,
        email: identity.email ?? undefined,
        user_metadata: identity.userMetadata,
        app_metadata: identity.appMetadata,
      } as User
    }

    const { data, error } = await supabase.auth.getUser()
    if (error && !isSbAuthMissing(error) && !isSbNetworkError(error)) {
      logSbError(tag, error)
    }

    return data?.user ?? null
  } catch (error) {
    if (!isSbNetworkError(error)) {
      logSbError(tag, error)
    }
    return null
  }
}
