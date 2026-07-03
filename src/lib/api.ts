import type { OrganizationSummary } from "@/lib/context"
import type { FarmSummary } from "@/lib/context"
import { supabaseBrowser } from "@/lib/supabase/client"
import { ONBOARDING_PATH, WORKSPACE_SELECT_PATH } from "@/lib/app-entry"

type ApiError = {
  error?: string
  redirectTo?: string
}

async function parseResponse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get("content-type") ?? ""
  const body =
    contentType.includes("application/json") ? ((await response.json()) as T & ApiError) : ({} as T & ApiError)

  if (!response.ok) {
    throw new Error(body?.error ?? "Request failed.")
  }

  return body
}
export async function login(email: string, password: string): Promise<{ ok: true; redirectTo: string }> {
  // Auth runs in the browser so the fetch goes directly to Supabase,
  // bypassing the Next.js server which may not have outbound HTTPS access.
  const supabase = supabaseBrowser()
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    throw new Error(error.message)
  }

  if (!data.user || !data.session) {
    throw new Error("Session unavailable.")
  }

  await supabase.rpc("claim_my_farm_user_invitations")

  // Determine post-login redirect from authoritative workspace membership.
  const { data: memberships } = await supabase.from("farm_user").select("farm_id").eq("user_id", data.user.id)

  const membershipFarmIds = (memberships ?? [])
    .map((row) => (typeof row.farm_id === "string" && row.farm_id.trim() ? row.farm_id : null))
    .filter((v): v is string => Boolean(v))

  const hasWorkspace = membershipFarmIds.length > 0
  const redirectTo =
    hasWorkspace
      ? WORKSPACE_SELECT_PATH
      : ONBOARDING_PATH

  return { ok: true, redirectTo }
}

export async function logout() {
  const response = await fetch("/api/auth/sign-out", {
    method: "POST",
    credentials: "include",
  })

  return parseResponse<{ ok: true }>(response)
}

export async function getMe() {
  const response = await fetch("/api/me", {
    credentials: "include",
    cache: "no-store",
  })

  return parseResponse<{ token: string; user: Record<string, unknown> }>(response)
}

export async function getOrganizations() {
  const response = await fetch("/api/organizations", {
    credentials: "include",
    cache: "no-store",
  })

  const body = await parseResponse<{ organizations: OrganizationSummary[] }>(response)
  return body.organizations
}

export async function getFarmsByOrganization(orgId: string) {
  const response = await fetch("/api/farms", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    cache: "no-store",
    body: JSON.stringify({ orgId }),
  })

  return parseResponse<FarmSummary[]>(response)
}

export async function createWorkspace(params: {
  organizationName: string
  farmName: string
  location: string
  organizationId?: string | null
}): Promise<{ organizationId: string; farmId: string }> {
  const response = await fetch("/api/workspaces", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(params),
  })

  return parseResponse<{ organizationId: string; farmId: string }>(response)
}

export async function selectWorkspace(orgId: string, farmId: string) {
  const response = await fetch("/api/context", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify({ orgId, farmId }),
  })

  return parseResponse<{
    ok: true
    organization: { id: string }
    farm: { id: string }
    role: string | null
  }>(response)
}
