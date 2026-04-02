import { NextResponse } from "next/server"

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
  void params
  return {}
}
