import { NextResponse, type NextRequest } from "next/server"
import { z } from "zod"
import { requireApiUser } from "@/lib/server/auth"
import { loadWorkspaceFarmsForUser } from "@/lib/server/workspace"
import { isSbNetworkError, logSbError } from "@/lib/supabase/log"

const farmsQuerySchema = z.object({
  orgId: z.string().uuid(),
})

async function loadFarmsForOrganization(orgId: string) {
  const parseResult = farmsQuerySchema.safeParse({ orgId })

  if (!parseResult.success) {
    return NextResponse.json({ error: "Organization is required." }, { status: 400 })
  }

  const auth = await requireApiUser("api:farms")
  if ("response" in auth) return auth.response

  try {
    const farms = await loadWorkspaceFarmsForUser(auth.user.id, parseResult.data.orgId, auth.accessToken)

    return NextResponse.json(farms, {
      headers: {
        "Cache-Control": "no-store",
      },
    })
  } catch (error) {
    if (!isSbNetworkError(error)) {
      logSbError("api:farms", error)
    }

    return NextResponse.json({ error: "Unable to load farms." }, { status: 503 })
  }
}

export async function GET(request: NextRequest) {
  return loadFarmsForOrganization(request.nextUrl.searchParams.get("orgId") ?? "")
}

export async function POST(request: NextRequest) {
  const payload = (await request.json().catch(() => null)) as { orgId?: unknown } | null
  return loadFarmsForOrganization(typeof payload?.orgId === "string" ? payload.orgId : "")
}
