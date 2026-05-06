import type { Metadata } from "next"
import { redirect } from "next/navigation"
import {
  ONBOARDING_CREATE_WORKSPACE_PATH,
  sanitizeNextPath,
  WORKSPACE_SELECT_PATH,
} from "@/lib/app-entry"
import { loadWorkspaceOrganizationsForUser } from "@/lib/server/workspace"
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

  const { user } = await requireUserContext(`${WORKSPACE_SELECT_PATH}?next=${encodeURIComponent(nextPath)}`)
  const initialOrganizations = await loadWorkspaceOrganizationsForUser(user.id)

  if (initialOrganizations.length === 0) {
    redirect(`${ONBOARDING_CREATE_WORKSPACE_PATH}?next=${encodeURIComponent(nextPath)}`)
  }

  return <SelectWorkspacePageClient initialOrganizations={initialOrganizations} />
}
