import { NextResponse, type NextRequest } from "next/server"
import { z } from "zod"
import { loadWorkspaceFarmsForUser } from "@/lib/server/workspace"
import { createClient } from "@/lib/supabase/server"
import { isSbNetworkError, logSbError } from "@/lib/supabase/log"
import { getSessionIdentity } from "@/lib/supabase/session"

const farmsQuerySchema = z.object({
  orgId: z.string().uuid(),
})

async function loadFarmsForOrganization(orgId: string) {
  const parseResult = farmsQuerySchema.safeParse({ orgId })

  if (!parseResult.success) {
    return NextResponse.json({ error: "Organization is required." }, { status: 400 })
  }

  const supabase = await createClient()

  try {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
    const session = sessionData.session
    const identity = getSessionIdentity(session?.access_token)

    if (sessionError || !identity) {
      return NextResponse.json({ error: "Session unavailable." }, { status: 401 })
    }

    const farms = await loadWorkspaceFarmsForUser(identity.userId, parseResult.data.orgId, session?.access_token)

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
