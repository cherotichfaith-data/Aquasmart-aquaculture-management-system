import { NextResponse, type NextRequest } from "next/server"
import { z } from "zod"
import { getWorkspaceCookieValues, setWorkspaceContextCookies } from "@/lib/context"
import { loadWorkspaceContextForUser } from "@/lib/server/workspace"
import { requireUserContext } from "@/lib/supabase/require-user"
import { createAccessTokenClient } from "@/lib/supabase/access-token-client"
import { isSbNetworkError, logSbError } from "@/lib/supabase/log"

const selectWorkspaceSchema = z.object({
  orgId: z.string().uuid(),
  farmId: z.string().uuid(),
})

export async function GET(request: NextRequest) {
  try {
    const { user, accessToken } = await requireUserContext(request.nextUrl.pathname)

    const cookies = getWorkspaceCookieValues(request.cookies)
    const context = await loadWorkspaceContextForUser({
      userId: user.id,
      accessToken,
      cookieOrganizationId: cookies.organizationId,
      cookieFarmId: cookies.farmId,
    })

    return NextResponse.json(context, {
      headers: {
        "Cache-Control": "no-store",
      },
    })
  } catch (error) {
    if (!isSbNetworkError(error)) {
      logSbError("api:context", error)
    }

    return NextResponse.json({ error: "Unable to load workspace context." }, { status: 503 })
  }
}

export async function POST(request: NextRequest) {
  let payload: z.infer<typeof selectWorkspaceSchema>

  try {
    payload = selectWorkspaceSchema.parse(await request.json())
  } catch {
    return NextResponse.json({ error: "Select an organization and farm." }, { status: 400 })
  }

  try {
    const { user, accessToken } = await requireUserContext(request.nextUrl.pathname)
    const supabase = createAccessTokenClient(accessToken)
    const [
      { data: membership, error: membershipError },
      { data: farm, error: farmError },
      { data: organization, error: organizationError },
    ] = await Promise.all([
      supabase.from("farm_user").select("role").eq("user_id", user.id).eq("farm_id", payload.farmId).maybeSingle(),
      supabase.from("farm").select("id, organization_id").eq("id", payload.farmId).maybeSingle(),
      supabase.from("organization").select("id, owner_id").eq("id", payload.orgId).maybeSingle(),
    ])

    if (membershipError || farmError || organizationError) {
      throw membershipError ?? farmError ?? organizationError
    }

    const ownerAllowsWorkspace = organization?.owner_id === user.id
    const hasAccess =
      farm?.organization_id === payload.orgId &&
      (Boolean(membership?.role) || ownerAllowsWorkspace)

    if (!hasAccess) {
      return NextResponse.json({ error: "You do not have access to that workspace." }, { status: 403 })
    }

    const response = NextResponse.json(
      {
        ok: true,
        organization: { id: payload.orgId },
        farm: { id: payload.farmId },
        role: membership?.role ?? null,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    )

    setWorkspaceContextCookies(response, {
      organizationId: payload.orgId,
      farmId: payload.farmId,
    })

    return response
  } catch (error) {
    if (!isSbNetworkError(error)) {
      logSbError("api:context:selectWorkspace", error)
    }

    return NextResponse.json({ error: "Unable to select workspace context." }, { status: 503 })
  }
}
