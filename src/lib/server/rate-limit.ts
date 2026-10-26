import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { logSbError } from "@/lib/supabase/log"

type RateLimitRpcRow = {
  allowed: boolean
  remaining: number
  reset_at: string
}

export type ApiRateLimitPolicy = {
  scope: string
  limit: number
  windowSeconds: number
}

export const apiRateLimits = {
  onboardingBootstrap: {
    scope: "onboarding-bootstrap",
    limit: 5,
    windowSeconds: 60 * 10,
  },
  mutation: {
    scope: "write-mutation",
    limit: 60,
    windowSeconds: 60,
  },
  reportQuery: {
    scope: "report-query",
    limit: 180,
    windowSeconds: 60,
  },
} satisfies Record<string, ApiRateLimitPolicy>

export async function enforceUserRateLimit(params: {
  request: Request
  tag: string
  userId: string
  policy: ApiRateLimitPolicy
}): Promise<{ response?: NextResponse }> {
  const admin = createAdminClient()
  const forwardedFor = params.request.headers.get("x-forwarded-for")
  const ipAddress = forwardedFor?.split(",")[0]?.trim() || null

  const { data, error } = await admin.rpc("enforce_api_rate_limit", {
    p_scope: params.policy.scope,
    p_user_id: params.userId,
    p_limit: params.policy.limit,
    p_window_seconds: params.policy.windowSeconds,
    p_ip_address: ipAddress,
  })

  if (error) {
    const message = typeof error === "object" && error !== null && "message" in error ? String(error.message ?? "") : ""
    const code = typeof error === "object" && error !== null && "code" in error ? String(error.code ?? "") : ""
    if (
      code === "42883" ||
      code === "PGRST202" ||
      message.toLowerCase().includes("could not find the function") ||
      message.toLowerCase().includes("does not exist")
    ) {
      return {}
    }
    logSbError(`${params.tag}:rateLimit`, error)
    return {
      response: NextResponse.json(
        { error: "Unable to validate request rate." },
        { status: 503 },
      ),
    }
  }

  const row = ((data as unknown as RateLimitRpcRow[] | null) ?? [])[0]
  if (!row) {
    logSbError(`${params.tag}:rateLimit`, "Rate limit RPC returned no rows.")
    return {
      response: NextResponse.json(
        { error: "Unable to validate request rate." },
        { status: 503 },
      ),
    }
  }

  const resetAt = row.reset_at
  const resetEpochSeconds = Number.isFinite(Date.parse(resetAt))
    ? Math.max(Math.ceil(Date.parse(resetAt) / 1000), 0)
    : undefined
  const retryAfterSeconds =
    resetEpochSeconds != null
      ? Math.max(resetEpochSeconds - Math.floor(Date.now() / 1000), 1)
      : params.policy.windowSeconds

  if (!row.allowed) {
    return {
      response: NextResponse.json(
        { error: "Rate limited. Try again later." },
        {
          status: 429,
          headers: {
            "Retry-After": String(retryAfterSeconds),
            "X-RateLimit-Limit": String(params.policy.limit),
            "X-RateLimit-Remaining": String(Math.max(row.remaining, 0)),
            ...(resetEpochSeconds != null ? { "X-RateLimit-Reset": String(resetEpochSeconds) } : {}),
          },
        },
      ),
    }
  }

  return {}
}
