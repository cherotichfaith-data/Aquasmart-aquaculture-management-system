import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import {
  ACTIVE_FARM_COOKIE,
  clearWorkspaceContextCookies,
  normalizeContextValue,
} from "@/lib/context"
import { resolveServerUser } from "@/lib/server/auth"
import { isSbNetworkError, logSbError } from "@/lib/supabase/log"

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
  const result = await resolveServerUser("api:me")

  if (!result.ok) {
    if (result.reason === "network") {
      return NextResponse.json({ error: "Authentication service unavailable." }, { status: 503 })
    }
    const cookieStore = await cookies()
    const response = NextResponse.json({ error: "Session unavailable." }, { status: 401 })
    clearWorkspaceContextCookies(response)
    clearSupabaseAuthCookies(response, cookieStore)
    return response
  }

  const { user, accessToken, supabase } = result

  try {
    const cookieStore = await cookies()
    const activeFarmId = normalizeContextValue(cookieStore.get(ACTIVE_FARM_COOKIE)?.value)
    const { data: membershipRows } = await supabase
      .from("farm_user")
      .select("farm_id, role, created_at")
      .eq("user_id", user.id)
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
          id: user.id,
          email: user.email ?? undefined,
          user_metadata: {
            ...(user.user_metadata ?? {}),
            farm_role: farmRole,
            farm_id: resolvedFarmId ?? user.user_metadata?.farm_id,
          },
          app_metadata: user.app_metadata,
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
    if (!isSbNetworkError(error)) {
      logSbError("api:me", error)
    }

    return NextResponse.json({ error: "Authentication service unavailable." }, { status: 503 })
  }
}
