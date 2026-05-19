import { NextResponse } from "next/server"
import type { EmailOtpType } from "@supabase/supabase-js"
import { ONBOARDING_PATH, sanitizeNextPath } from "@/lib/app-entry"
import { isSbFlowStateNotFound, logSbError } from "@/lib/supabase/log"
import { createClient } from "@/lib/supabase/server"

function buildAccountSetupUrl(origin: string, next: string) {
  const setupUrl = new URL("/auth/set-password", origin)
  setupUrl.searchParams.set("next", next)
  return setupUrl
}

function buildAuthErrorUrl(origin: string, error: string, description: string, errorCode?: string | null) {
  const authErrorUrl = new URL("/auth/auth-error", origin)
  authErrorUrl.searchParams.set("error", error)
  authErrorUrl.searchParams.set("error_description", description)
  if (errorCode) authErrorUrl.searchParams.set("error_code", errorCode)
  return authErrorUrl
}

function shouldCompleteInvitedAccountSetup(
  user: { user_metadata?: Record<string, unknown> | null } | null,
  next: string,
) {
  const metadata = user?.user_metadata ?? {}
  return next === ONBOARDING_PATH && metadata.password_configured !== true
}

function normalizeOtpType(value: string | null): EmailOtpType | null {
  if (
    value === "signup" ||
    value === "invite" ||
    value === "magiclink" ||
    value === "recovery" ||
    value === "email_change" ||
    value === "email"
  ) {
    return value
  }

  return null
}

export async function completeSupabaseAuthLink(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const tokenHash = searchParams.get("token_hash")
  const otpType = normalizeOtpType(searchParams.get("type"))
  const next = sanitizeNextPath(searchParams.get("next"), ONBOARDING_PATH)

  const error = searchParams.get("error")
  const errorCode = searchParams.get("error_code")
  const errorDescription = searchParams.get("error_description")

  if (error) {
    return NextResponse.redirect(
      buildAuthErrorUrl(origin, error, errorDescription ?? "The authentication link could not be used.", errorCode),
    )
  }

  if (!code && (!tokenHash || !otpType)) {
    return NextResponse.redirect(
      buildAuthErrorUrl(
        origin,
        "InvalidInviteLink",
        "This invite link is missing its Supabase auth token. Open the latest invite email, or ask an admin to resend it.",
      ),
    )
  }

  const supabase = await createClient()

  if (tokenHash && otpType) {
    const { error: verifyError } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: otpType,
    })

    if (verifyError) {
      logSbError("authLink:verifyOtp", verifyError)
      return NextResponse.redirect(
        buildAuthErrorUrl(origin, "VerifyError", verifyError.message),
      )
    }
  } else if (code) {
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

    if (exchangeError) {
      if (isSbFlowStateNotFound(exchangeError)) {
        try {
          const { data } = await supabase.auth.getUser()
          if (data.user) {
            if (shouldCompleteInvitedAccountSetup(data.user, next)) {
              return NextResponse.redirect(buildAccountSetupUrl(origin, next))
            }
            return NextResponse.redirect(new URL(next, origin))
          }
        } catch {
        }
      }

      logSbError("authLink:exchangeCodeForSession", exchangeError)
      return NextResponse.redirect(
        buildAuthErrorUrl(origin, "ExchangeError", exchangeError.message),
      )
    }
  }

  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError) {
    logSbError("authLink:getUser", userError)
  }

  if (shouldCompleteInvitedAccountSetup(userData.user ?? null, next)) {
    return NextResponse.redirect(buildAccountSetupUrl(origin, next))
  }

  return NextResponse.redirect(new URL(next, origin))
}
