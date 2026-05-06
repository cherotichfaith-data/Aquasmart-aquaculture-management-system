import { NextResponse } from "next/server"
import { ONBOARDING_PATH, sanitizeNextPath } from "@/lib/app-entry"
import { isSbFlowStateNotFound, logSbError } from "@/lib/supabase/log"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const next = sanitizeNextPath(searchParams.get("next"), ONBOARDING_PATH)

  const error = searchParams.get("error")
  const errorCode = searchParams.get("error_code")
  const errorDescription = searchParams.get("error_description")

  if (error) {
    const authErrorUrl = new URL("/auth/auth-error", origin)
    authErrorUrl.searchParams.set("error", error)
    if (errorCode) authErrorUrl.searchParams.set("error_code", errorCode)
    if (errorDescription) authErrorUrl.searchParams.set("error_description", errorDescription)
    return NextResponse.redirect(authErrorUrl)
  }

  if (!code) {
    const authErrorUrl = new URL("/auth/auth-error", origin)
    authErrorUrl.searchParams.set("error", "NoCode")
    authErrorUrl.searchParams.set("error_description", "No authorization code provided")
    return NextResponse.redirect(authErrorUrl)
  }

  const supabase = await createClient()
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

  if (exchangeError) {
    if (isSbFlowStateNotFound(exchangeError)) {
      try {
        const { data } = await supabase.auth.getUser()
        if (data.user) {
          return NextResponse.redirect(new URL(next, origin))
        }
      } catch {
      }
    }

    logSbError("authCallback:exchangeCodeForSession", exchangeError)
    const authErrorUrl = new URL("/auth/auth-error", origin)
    authErrorUrl.searchParams.set("error", "ExchangeError")
    authErrorUrl.searchParams.set("error_description", exchangeError.message)
    return NextResponse.redirect(authErrorUrl)
  }

  return NextResponse.redirect(new URL(next, origin))
}
