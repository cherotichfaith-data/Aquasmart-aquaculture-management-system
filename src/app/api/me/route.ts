import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import {
  ACTIVE_FARM_COOKIE,
  clearWorkspaceContextCookies,
  normalizeContextValue,
} from "@/lib/context"
import { createClient } from "@/lib/supabase/server"
import { isSbInvalidRefreshToken, isSbNetworkError, logSbError } from "@/lib/supabase/log"
import { getSessionIdentity, isSessionTokenExpired } from "@/lib/supabase/session"

function clearSupabaseAuthCookies(response: NextResponse, cookieStore: Awaited<ReturnType<typeof cookies>>) {
  cookieStore
    .getAll()
    .filter(
      ({ name }) =>
        name.startsWith("sb-") &&
        (name.includes("-auth-token") || name.includes("-auth-token-code-verifier")),
    )
    .forEach(({ name }) => {
      response.cookies.set(name, "", { path: "/", maxAge: 0 })
    })

  return response
}

export async function GET() {
  const supabase = await createClient()

  try {
    let { data: sessionData, error: sessionError } = await supabase.auth.getSession()
    let accessToken = sessionData.session?.access_token ?? null

    if (accessToken && isSessionTokenExpired(accessToken)) {
      const refreshed = await supabase.auth.refreshSession()
      sessionData = refreshed.data
      sessionError = refreshed.error
      accessToken = refreshed.data.session?.access_token ?? null
    }

    const identity = getSessionIdentity(accessToken)

    if (sessionError || !accessToken || !identity) {
      const cookieStore = await cookies()
      const response = NextResponse.json({ error: "Session unavailable." }, { status: 401 })
      clearWorkspaceContextCookies(response)
      clearSupabaseAuthCookies(response, cookieStore)
      return response
    }

    const cookieStore = await cookies()
    const activeFarmId = normalizeContextValue(cookieStore.get(ACTIVE_FARM_COOKIE)?.value)
    const { data: membershipRows } = await supabase
      .from("farm_user")
      .select("farm_id, role, created_at")
      .eq("user_id", identity.userId)
      .order("created_at", { ascending: true })

    const memberships = (membershipRows ?? [])
      .map((membership) => ({
        farmId: normalizeContextValue(membership.farm_id),
        role: membership.role ?? null,
      }))
      .filter((membership) => Boolean(membership.farmId)) as Array<{ farmId: string; role: string | null }>
    const activeMembership =
      (activeFarmId ? memberships.find((membership) => membership.farmId === activeFarmId) : null) ?? memberships[0] ?? null
    const farmRole = activeMembership?.role ?? null
    const resolvedFarmId = activeMembership?.farmId ?? null

    return NextResponse.json(
      {
        token: accessToken,
        role: farmRole,
        activeFarmId: resolvedFarmId,
        memberships,
        user: {
          id: identity.userId,
          email: identity.email ?? undefined,
          user_metadata: {
            ...(identity.userMetadata ?? {}),
            farm_role: farmRole,
            farm_id: resolvedFarmId ?? identity.userMetadata?.farm_id,
          },
          app_metadata: identity.appMetadata,
          farm_role: farmRole,
        },
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    )
  } catch (error) {
    if (isSbInvalidRefreshToken(error)) {
      const cookieStore = await cookies()
      const response = NextResponse.json({ error: "Session unavailable." }, { status: 401 })
      clearWorkspaceContextCookies(response)
      clearSupabaseAuthCookies(response, cookieStore)
      return response
    }

    if (!isSbNetworkError(error)) {
      logSbError("api:me", error)
    }

    return NextResponse.json({ error: "Authentication service unavailable." }, { status: 503 })
  }
}
