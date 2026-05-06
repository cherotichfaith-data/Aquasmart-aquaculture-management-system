import { NextResponse } from "next/server"
import { loadWorkspaceOrganizationsForUser } from "@/lib/server/workspace"
import { createClient } from "@/lib/supabase/server"
import { isSbNetworkError, logSbError } from "@/lib/supabase/log"
import { getSessionIdentity } from "@/lib/supabase/session"

export async function GET() {
  const supabase = await createClient()

  try {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
    const session = sessionData.session
    const identity = getSessionIdentity(session?.access_token)

    if (sessionError || !identity) {
      return NextResponse.json({ error: "Session unavailable." }, { status: 401 })
    }

    const organizations = await loadWorkspaceOrganizationsForUser(identity.userId)

    return NextResponse.json(
      { organizations },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    )
  } catch (error) {
    if (!isSbNetworkError(error)) {
      logSbError("api:organizations", error)
    }

    return NextResponse.json({ error: "Unable to load organizations." }, { status: 503 })
  }
}
