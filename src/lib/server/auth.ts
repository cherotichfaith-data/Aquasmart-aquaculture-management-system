import { NextResponse } from "next/server"
import type { User } from "@supabase/supabase-js"
import { createClient } from "@/lib/supabase/server"
import { isSbAuthMissing, isSbInvalidRefreshToken, isSbNetworkError, logSbError } from "@/lib/supabase/log"
import { isSessionTokenExpired } from "@/lib/supabase/session"
import { enforceUserRateLimit, type ApiRateLimitPolicy } from "@/lib/server/rate-limit"

/**
 * Single source of truth for "who is making this request", server-side.
 *
 * This app used to have four independent implementations of this question
 * (api-session.ts, require-user.ts, mutation-actions.ts, write-through.ts),
 * three of which decoded the session JWT's payload locally
 * (base64-decode + JSON.parse) and trusted the result WITHOUT verifying the
 * token's signature in-process -- relying on the assumption that some later
 * network call using the same cookie would independently reject a forged
 * token before anything privileged happened. That assumption held almost
 * everywhere it was checked, except one place it didn't: an account-setup
 * action that took a client-supplied "accessToken" string, decoded it
 * locally, and used the decoded (never verified) user id to drive
 * service-role writes with no subsequent verified call in between.
 *
 * Decision: local-decode-and-trust is not an acceptable pattern anywhere in
 * this app, full stop. Every server-side caller that needs to know the
 * current user goes through resolveServerUser(), which always calls
 * supabase.auth.getUser() -- a real round trip to Supabase's auth server
 * that verifies the JWT signature. A genuine network outage is reported as
 * exactly that (503, "Authentication service unavailable"), not silently
 * downgraded to trusting unverified data. This mirrors the pattern
 * write-through.ts's requireRouteUser already used for every write endpoint
 * (feeding/mortality/sampling/stocking/transfer/water-quality/harvest
 * record routes) without incident, so this is not a new, unproven approach --
 * it's making the one correct pattern the only pattern.
 */

export type ResolvedServerUser = {
  user: User
  accessToken: string
  supabase: Awaited<ReturnType<typeof createClient>>
}

type ResolveFailure = { ok: false; reason: "unauthenticated" | "network" }
type ResolveSuccess = { ok: true } & ResolvedServerUser

export async function resolveServerUser(tag: string): Promise<ResolveSuccess | ResolveFailure> {
  const supabase = await createClient()

  try {
    // @supabase/ssr's server client deliberately ships with autoRefreshToken
    // disabled -- proxy.ts's middleware is meant to be the thing that keeps
    // the session cookie fresh instead, refreshing it on page navigation.
    // But the middleware's matcher excludes /api/* (see proxy.ts's `config`),
    // and this function is the one funnel every API route authenticates
    // through. A session left open on one page past its access-token TTL,
    // with no intervening full navigation, never gets refreshed before
    // landing here -- every subsequent fetch (including the ones every
    // shared filter depends on) starts failing with no path back to a
    // working session short of a full sign-out/sign-in, and shows up as
    // filters and other data quietly going empty rather than an actual
    // error. Proactively refreshing here, the same way the middleware
    // already does for pages, closes that gap for API routes too.
    const { data: initialSessionData } = await supabase.auth.getSession()
    if (initialSessionData.session?.access_token && isSessionTokenExpired(initialSessionData.session.access_token)) {
      const { error: refreshError } = await supabase.auth.refreshSession()
      if (refreshError && !isSbInvalidRefreshToken(refreshError) && !isSbNetworkError(refreshError)) {
        logSbError(`${tag}:refreshSession`, refreshError)
      }
    }

    const { data: userData, error: userError } = await supabase.auth.getUser()

    if (userError || !userData.user) {
      if (userError) {
        if (isSbNetworkError(userError)) return { ok: false, reason: "network" }
        if (!isSbAuthMissing(userError)) logSbError(`${tag}:getUser`, userError)
      }
      return { ok: false, reason: "unauthenticated" }
    }

    const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
    const accessToken = sessionData.session?.access_token ?? null

    if (!accessToken) {
      if (sessionError && !isSbNetworkError(sessionError)) {
        logSbError(`${tag}:getSession`, sessionError)
      }
      return { ok: false, reason: "unauthenticated" }
    }

    return { ok: true, user: userData.user, accessToken, supabase }
  } catch (error) {
    if (isSbNetworkError(error)) return { ok: false, reason: "network" }
    logSbError(`${tag}:resolveServerUser`, error)
    return { ok: false, reason: "unauthenticated" }
  }
}

function unauthorizedResponse(reason: "unauthenticated" | "network") {
  return reason === "network"
    ? NextResponse.json({ error: "Authentication service unavailable." }, { status: 503 })
    : NextResponse.json({ error: "Unauthorized." }, { status: 401 })
}

/** Route Handlers: use this to authenticate an API route. */
export async function requireApiUser(tag: string): Promise<ResolvedServerUser | { response: NextResponse }> {
  const result = await resolveServerUser(tag)
  if (!result.ok) return { response: unauthorizedResponse(result.reason) }
  return { user: result.user, accessToken: result.accessToken, supabase: result.supabase }
}

/** Route Handlers for writes: authenticate + apply a rate-limit policy. */
export async function requireRateLimitedApiUser(
  request: Request,
  tag: string,
  policy: ApiRateLimitPolicy,
): Promise<ResolvedServerUser | { response: NextResponse }> {
  const auth = await requireApiUser(tag)
  if ("response" in auth) return auth

  const rateLimit = await enforceUserRateLimit({ request, tag, userId: auth.user.id, policy })
  if (rateLimit.response) return { response: rateLimit.response }

  return auth
}

/** Server Actions: can't return a NextResponse, so this throws instead. */
export async function requireActionUser(tag: string): Promise<ResolvedServerUser> {
  const result = await resolveServerUser(tag)
  if (!result.ok) {
    throw new Error(result.reason === "network" ? "Authentication service unavailable." : "Unauthorized.")
  }
  return { user: result.user, accessToken: result.accessToken, supabase: result.supabase }
}
