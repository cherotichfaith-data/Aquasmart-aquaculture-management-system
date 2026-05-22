import type { Metadata } from "next"
import { redirect } from "next/navigation"
import {
  ONBOARDING_CREATE_WORKSPACE_PATH,
  sanitizeNextPath,
  WORKSPACE_SELECT_PATH,
} from "@/lib/app-entry"
import { loadWorkspaceOrganizationsForUser } from "@/lib/server/workspace"
import { createAccessTokenClient } from "@/lib/supabase/server"
import { requireUserContext } from "@/lib/supabase/require-user"
import SelectWorkspacePageClient from "./page.client"

export const metadata: Metadata = {
  title: "Select Workspace | AquaSmart",
  description: "Choose your AquaSmart organization and farm workspace.",
}

type SearchParams = Record<string, string | string[] | undefined>

export default async function SelectWorkspacePage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>
}) {
  const resolvedSearchParams = (await searchParams) ?? {}
  const rawNextPath = typeof resolvedSearchParams.next === "string" ? resolvedSearchParams.next : null
  const nextPath = sanitizeNextPath(rawNextPath, "/dashboard")

  if (rawNextPath && rawNextPath !== nextPath) {
    redirect(`${WORKSPACE_SELECT_PATH}?next=${encodeURIComponent(nextPath)}`)
  }

  const { user, accessToken } = await requireUserContext(`${WORKSPACE_SELECT_PATH}?next=${encodeURIComponent(nextPath)}`)
  const initialOrganizations = await loadWorkspaceOrganizationsForUser(user.id, accessToken)

  if (initialOrganizations.length === 0) {
    redirect(`${ONBOARDING_CREATE_WORKSPACE_PATH}?next=${encodeURIComponent(nextPath)}`)
  }

  const supabase = createAccessTokenClient(accessToken)
  const { data: profile } = await supabase
    .from("user_profile")
    .select("full_name")
    .eq("user_id", user.id)
    .maybeSingle()
  const initialDisplayName =
    typeof profile?.full_name === "string" && profile.full_name.trim()
      ? profile.full_name.trim()
      : typeof user.user_metadata?.full_name === "string" && user.user_metadata.full_name.trim()
        ? user.user_metadata.full_name.trim()
        : typeof user.user_metadata?.name === "string" && user.user_metadata.name.trim()
          ? user.user_metadata.name.trim()
          : user.email ?? null

  return (
    <SelectWorkspacePageClient
      initialOrganizations={initialOrganizations}
      initialDisplayName={initialDisplayName}
      initialUserId={user.id}
    />
  )
}
