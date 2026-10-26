import { NextResponse, type NextRequest } from "next/server"
import { clearWorkspaceContextCookies } from "@/lib/context"
import { createClient } from "@/lib/supabase/server"

function isSupabaseAuthCookie(name: string) {
  return name.startsWith("sb-") && (name.includes("-auth-token") || name.includes("-auth-token-code-verifier"))
}

function clearSupabaseAuthCookies(response: NextResponse, request: NextRequest) {
  request.cookies
    .getAll()
    .filter(({ name }) => isSupabaseAuthCookie(name))
    .forEach(({ name }) => {
      response.cookies.set(name, "", {
        path: "/",
        maxAge: 0,
      })
    })

  return response
}

export async function buildLogoutResponse(request: NextRequest) {
  try {
    const supabase = await createClient()
    await supabase.auth.signOut({ scope: "local" })
  } catch {
    // Cookie cleanup below still completes logout from the browser's perspective.
  }

  const response = NextResponse.json(
    { ok: true },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  )

  clearWorkspaceContextCookies(response)
  return clearSupabaseAuthCookies(response, request)
}
