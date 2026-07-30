import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"
import {
  DASHBOARD_ROOT,
  ONBOARDING_PATH,
  WORKSPACE_SELECT_PATH,
  isAuthRoute,
  isOnboardingRoute,
  isPublicRoute,
  resolveAppEntryPath,
  isWorkspaceSelectionRoute,
  mapDashboardPathToStandalone,
  sanitizeNextPath,
} from "@/lib/app-entry"
import {
  parseCustomPeriodUrlValue,
  parseTimePeriodUrlValue,
  toCustomPeriodUrlValue,
  toTimePeriodUrlValue,
} from "@/lib/time-period"
import {
  ACTIVE_FARM_COOKIE,
  ACTIVE_ORGANIZATION_COOKIE,
  clearWorkspaceContextCookies,
  normalizeContextValue,
} from "@/lib/context"
import { isSbInvalidRefreshToken } from "@/lib/supabase/log"
import { getSessionIdentity, isSessionTokenExpired } from "@/lib/supabase/session"

const AUTH_CALLBACK_PATH = "/auth/callback"
const AUTH_SET_PASSWORD_PATH = "/auth/set-password"

const AUTH_CALLBACK_QUERY_KEYS = [
  "code",
  "access_token",
  "refresh_token",
  "expires_in",
  "expires_at",
  "token_type",
  "provider_token",
  "provider_refresh_token",
  "authuser",
  "prompt",
  "scope",
  "state",
  "error",
  "error_code",
  "error_description",
] as const

const AUTH_CALLBACK_PAYLOAD_QUERY_KEYS = [
  "code",
  "access_token",
  "refresh_token",
  "error",
  "error_code",
  "error_description",
] as const

function createPassthroughResponse(request: NextRequest) {
  return NextResponse.next({
    request: {
      headers: request.headers,
    },
  })
}

function withSupabaseCookies(target: NextResponse, source: NextResponse) {
  source.cookies.getAll().forEach(({ name, value, ...rest }) => {
    target.cookies.set(name, value, rest)
  })
  return target
}

function clearSupabaseAuthCookies(target: NextResponse, request: NextRequest) {
  request.cookies
    .getAll()
    .filter(
      ({ name }) =>
        name.startsWith("sb-") &&
        (name.includes("-auth-token") || name.includes("-auth-token-code-verifier")),
    )
    .forEach(({ name }) => {
      target.cookies.set(name, "", { path: "/", maxAge: 0 })
    })
  return target
}

function clearSessionState(target: NextResponse, request: NextRequest) {
  clearWorkspaceContextCookies(target)
  return clearSupabaseAuthCookies(target, request)
}

function buildCallbackNextPath(request: NextRequest) {
  const params = new URLSearchParams(request.nextUrl.searchParams)
  AUTH_CALLBACK_QUERY_KEYS.forEach((key) => params.delete(key))
  params.delete("next")

  const fallbackPath =
    request.nextUrl.pathname === "/" || isAuthRoute(request.nextUrl.pathname)
      ? DASHBOARD_ROOT
      : request.nextUrl.pathname

  const search = params.toString()
  return sanitizeNextPath(search ? `${fallbackPath}?${search}` : fallbackPath, DASHBOARD_ROOT)
}

function buildRequestedNextPath(request: NextRequest) {
  const pathWithSearch = `${request.nextUrl.pathname}${request.nextUrl.search}`
  return sanitizeNextPath(pathWithSearch, DASHBOARD_ROOT)
}

function buildPathRedirect(request: NextRequest, pathname: string, nextPath?: string) {
  const redirectUrl = new URL(pathname, request.url)
  if (nextPath) redirectUrl.searchParams.set("next", nextPath)
  return NextResponse.redirect(redirectUrl)
}

function buildLoginRedirect(request: NextRequest, nextPath: string) {
  return buildPathRedirect(request, "/auth", nextPath)
}

function isAuthCallbackRequest(request: NextRequest) {
  return AUTH_CALLBACK_PAYLOAD_QUERY_KEYS.some((key) => request.nextUrl.searchParams.has(key))
}

function buildAuthCallbackRedirect(request: NextRequest) {
  const redirectUrl = new URL(AUTH_CALLBACK_PATH, request.url)
  request.nextUrl.searchParams.forEach((value, key) => {
    redirectUrl.searchParams.append(key, value)
  })
  if (!redirectUrl.searchParams.has("next")) {
    redirectUrl.searchParams.set("next", buildCallbackNextPath(request))
  }
  return NextResponse.redirect(redirectUrl)
}

/**
 * Canonical time-period URL param is `date` (aligned with the aquasmart-main URL/UI
 * contract). `period` is the pre-alignment key — redirect any link still using it to
 * the `date` form so old bookmarks/shared links keep working.
 */
function buildLegacyTimePeriodRedirect(request: NextRequest) {
  const legacyPeriod = request.nextUrl.searchParams.get("period")
  if (!legacyPeriod) return null

  const redirectUrl = request.nextUrl.clone()
  const normalizedCustomRange = parseCustomPeriodUrlValue(legacyPeriod)
  const normalizedPeriod = parseTimePeriodUrlValue(legacyPeriod)

  if (!redirectUrl.searchParams.has("date")) {
    if (normalizedCustomRange) {
      redirectUrl.searchParams.set("date", toCustomPeriodUrlValue(normalizedCustomRange))
    } else if (normalizedPeriod) {
      redirectUrl.searchParams.set("date", toTimePeriodUrlValue(normalizedPeriod))
    }
  }

  redirectUrl.searchParams.delete("period")

  if (redirectUrl.toString() === request.nextUrl.toString()) return null
  return NextResponse.redirect(redirectUrl)
}

async function resolveFarmMembership(
  supabase: ReturnType<typeof createServerClient>,
  userId: string,
) {
  try {
    const { data: memberships } = await supabase
      .from("farm_user")
      .select("farm_id, role, farm ( organization_id )")
      .eq("user_id", userId)
      .order("created_at", { ascending: true })
      .limit(2)

    const firstMembership = memberships?.[0] ?? null
    const joinedOrganizationId = Array.isArray(firstMembership?.farm)
      ? firstMembership?.farm[0]?.organization_id ?? null
      : firstMembership?.farm?.organization_id ?? null

    return {
      membershipCount: memberships?.length ?? 0,
      organizationId: joinedOrganizationId ?? null,
      farmId: firstMembership?.farm_id ?? null,
      role: firstMembership?.role ?? null,
    }
  } catch {
    return {
      membershipCount: 0,
      organizationId: null,
      farmId: null,
      role: null,
    }
  }
}

async function resolveEntryPathForActiveFarm(params: {
  supabase: ReturnType<typeof createServerClient>
  userId: string
  farmId: string | null
}) {
  if (!params.farmId) return DASHBOARD_ROOT

  try {
    const { data: membership } = await params.supabase
      .from("farm_user")
      .select("role")
      .eq("user_id", params.userId)
      .eq("farm_id", params.farmId)
      .maybeSingle()

    if (!membership?.role) return DASHBOARD_ROOT
    return resolveAppEntryPath(membership.role as Parameters<typeof resolveAppEntryPath>[0])
  } catch {
    return DASHBOARD_ROOT
  }
}

export async function proxy(request: NextRequest) {
  const legacyTimePeriodRedirect = buildLegacyTimePeriodRedirect(request)
  if (legacyTimePeriodRedirect) {
    return legacyTimePeriodRedirect
  }

  const standaloneFeaturePath = mapDashboardPathToStandalone(request.nextUrl.pathname)
  if (standaloneFeaturePath) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = standaloneFeaturePath
    return NextResponse.redirect(redirectUrl)
  }

  if (isAuthCallbackRequest(request)) {
    if (request.nextUrl.pathname !== AUTH_CALLBACK_PATH) {
      return buildAuthCallbackRedirect(request)
    }
    return createPassthroughResponse(request)
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    return createPassthroughResponse(request)
  }

  let response = createPassthroughResponse(request)
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        response = createPassthroughResponse(request)
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options)
        })
      },
    },
  })

  let session = null

  try {
    const result = await supabase.auth.getSession()

    if (result.error && isSbInvalidRefreshToken(result.error)) {
      const nextPath = buildRequestedNextPath(request)
      const redirectResponse = clearSessionState(buildLoginRedirect(request, nextPath), request)
      return withSupabaseCookies(redirectResponse, response)
    }

    session = result.data.session
  } catch (error) {
    if (isSbInvalidRefreshToken(error)) {
      const nextPath = buildRequestedNextPath(request)
      const redirectResponse = clearSessionState(buildLoginRedirect(request, nextPath), request)
      return withSupabaseCookies(redirectResponse, response)
    }
    return response
  }

  if (session?.access_token && isSessionTokenExpired(session.access_token)) {
    try {
      const refreshed = await supabase.auth.refreshSession()
      session = refreshed.data.session

      if (refreshed.error || !session?.access_token || isSessionTokenExpired(session.access_token)) {
        const nextPath = buildRequestedNextPath(request)
        if (isPublicRoute(request.nextUrl.pathname)) {
          return withSupabaseCookies(clearSessionState(createPassthroughResponse(request), request), response)
        }
        return withSupabaseCookies(clearSessionState(buildLoginRedirect(request, nextPath), request), response)
      }
    } catch {
      const nextPath = buildRequestedNextPath(request)
      if (isPublicRoute(request.nextUrl.pathname)) {
        return withSupabaseCookies(clearSessionState(createPassthroughResponse(request), request), response)
      }
      return withSupabaseCookies(clearSessionState(buildLoginRedirect(request, nextPath), request), response)
    }
  }

  const sessionIdentity = getSessionIdentity(session?.access_token)
  const userId = sessionIdentity?.userId ?? null

  if (!userId && !isPublicRoute(request.nextUrl.pathname)) {
    const redirectResponse = clearSessionState(
      buildLoginRedirect(request, buildRequestedNextPath(request)),
      request,
    )
    return withSupabaseCookies(redirectResponse, response)
  }

  if (userId) {
    const pathname = request.nextUrl.pathname
    const nextPath = buildRequestedNextPath(request)
    const activeOrganizationId = normalizeContextValue(request.cookies.get(ACTIVE_ORGANIZATION_COOKIE)?.value)
    const activeFarmId = normalizeContextValue(request.cookies.get(ACTIVE_FARM_COOKIE)?.value)
    const hasActiveWorkspaceContext = Boolean(activeOrganizationId && activeFarmId)
    const isAccountSetupRoute = pathname === AUTH_SET_PASSWORD_PATH || pathname.startsWith(`${AUTH_SET_PASSWORD_PATH}/`)

    if (isAuthRoute(pathname) && !isAccountSetupRoute) {
      if (hasActiveWorkspaceContext) {
        const redirectPath = await resolveEntryPathForActiveFarm({ supabase, userId, farmId: activeFarmId })
        return withSupabaseCookies(
          NextResponse.redirect(new URL(redirectPath, request.url)),
          response,
        )
      }
    }

    const membership = await resolveFarmMembership(supabase, userId)

    if (isAccountSetupRoute) {
      return response
    }

    if (isAuthRoute(pathname)) {
      const redirectPath = membership.membershipCount > 0 ? WORKSPACE_SELECT_PATH : ONBOARDING_PATH
      return withSupabaseCookies(buildPathRedirect(request, redirectPath, nextPath), response)
    }

    if (hasActiveWorkspaceContext) {
      if (isOnboardingRoute(pathname) || isWorkspaceSelectionRoute(pathname)) {
        const redirectPath = await resolveEntryPathForActiveFarm({ supabase, userId, farmId: activeFarmId })
        return withSupabaseCookies(
          NextResponse.redirect(new URL(redirectPath, request.url)),
          response,
        )
      }
      return response
    }

    if (membership.membershipCount === 0) {
      if (!isOnboardingRoute(pathname) && !isWorkspaceSelectionRoute(pathname)) {
        return withSupabaseCookies(buildPathRedirect(request, ONBOARDING_PATH, nextPath), response)
      }
      return response
    }

    if (!membership.role || !membership.farmId || !membership.organizationId) {
      if (!isOnboardingRoute(pathname) && !isWorkspaceSelectionRoute(pathname)) {
        return withSupabaseCookies(buildPathRedirect(request, ONBOARDING_PATH, nextPath), response)
      }
      return response
    }

    if (!isWorkspaceSelectionRoute(pathname) && !isOnboardingRoute(pathname)) {
      return withSupabaseCookies(buildPathRedirect(request, WORKSPACE_SELECT_PATH, nextPath), response)
    }
  }

  return response
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|manifest.json|sw.js|workbox-.*|.*\\.(?:svg|png|jpg|jpeg|gif|webp|mp4)$).*)",
  ],
}
