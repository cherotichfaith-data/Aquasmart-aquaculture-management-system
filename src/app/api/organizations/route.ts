import { NextResponse } from "next/server"
import { requireApiUser } from "@/lib/server/auth"
import { loadWorkspaceOrganizationsForUser } from "@/lib/server/workspace"
import { isSbNetworkError, logSbError } from "@/lib/supabase/log"

export async function GET() {
  const auth = await requireApiUser("api:organizations")
  if ("response" in auth) return auth.response

  try {
    const organizations = await loadWorkspaceOrganizationsForUser(auth.user.id, auth.accessToken)

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
