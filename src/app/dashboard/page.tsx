import { redirect } from "next/navigation"
import type { Metadata } from "next"
import { cookies } from "next/headers"
import DashboardPageClient from "./page.client"
import DashboardLayout from "@/components/layout/dashboard-layout"
import { WORKSPACE_SELECT_PATH, resolveAppEntryPath, sanitizeNextPath } from "@/lib/app-entry"
import { getDashboardPageInitialData, parseDashboardPageFilters } from "@/features/dashboard/queries.server"
import { cleanScopedFilterState } from "@/features/shared/scoped-analytics.server"
import { loadWorkspaceContextForUser } from "@/lib/server/workspace"
import { requireUserContext } from "@/lib/supabase/require-user"
import { createAccessTokenClient } from "@/lib/supabase/server"
import { ACTIVE_FARM_COOKIE, ACTIVE_ORGANIZATION_COOKIE, normalizeContextValue } from "@/lib/context"

export const metadata: Metadata = {
  title: "Dashboard | Samaki360",
  description: "Farm operations dashboard for Samaki360.",
}

type SearchParams = Record<string, string | string[] | undefined>

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>
}) {
  const resolvedSearchParams = (await searchParams) ?? {}
  const routeSearchParams = new URLSearchParams()

  Object.entries(resolvedSearchParams).forEach(([key, value]) => {
    if (typeof value === "string") {
      routeSearchParams.set(key, value)
    }
  })

  const currentPath = sanitizeNextPath(
    `/dashboard${routeSearchParams.size > 0 ? `?${routeSearchParams.toString()}` : ""}`,
    "/dashboard",
  )

  const { user: contextUser, accessToken } = await requireUserContext(currentPath)
  const analyticsSupabase = createAccessTokenClient(accessToken)
  const searchFarmId = typeof resolvedSearchParams.farmId === "string" ? resolvedSearchParams.farmId : null
  const initialFilters = parseDashboardPageFilters(resolvedSearchParams)
  const cookieStore = await cookies()
  const cookieOrganizationId = normalizeContextValue(cookieStore.get(ACTIVE_ORGANIZATION_COOKIE)?.value)
  const cookieFarmId = normalizeContextValue(cookieStore.get(ACTIVE_FARM_COOKIE)?.value)
  const requestedFarmId = normalizeContextValue(searchFarmId) ?? cookieFarmId

  const workspaceContext = await loadWorkspaceContextForUser({
    userId: contextUser.id,
    accessToken,
    requestedFarmId,
    cookieOrganizationId,
    cookieFarmId,
  })

  const farmId = workspaceContext.farm?.id ?? null

  if (!farmId) {
    redirect(`${WORKSPACE_SELECT_PATH}?next=${encodeURIComponent(currentPath)}`)
  }

  if (!workspaceContext.role) {
    redirect("/unauthorized")
  }

  const entryPath = resolveAppEntryPath(workspaceContext.role as Parameters<typeof resolveAppEntryPath>[0])
  if (entryPath !== "/dashboard") {
    redirect(entryPath)
  }

  const initialData = await getDashboardPageInitialData({
    farmId,
    filters: initialFilters,
    accessToken,
  })
  const effectiveFilters =
    initialData.systemOptions.status === "success"
      ? cleanScopedFilterState(initialFilters, initialData.systemOptions.data)
      : initialFilters
  const { data: farmRow } = await analyticsSupabase.from("farm").select("name").eq("id", farmId).maybeSingle()
  const initialFarmName = farmRow?.name ?? null
  return (
    <DashboardLayout
      initialFarmId={farmId}
      initialFarmName={initialFarmName}
      headerDataOverrides={{
        role: workspaceContext.role,
        timeBounds: initialData.bounds,
      }}
    >
      <DashboardPageClient
        initialFarmId={farmId}
        initialFilters={effectiveFilters}
        initialData={initialData}
      />
    </DashboardLayout>
  )
}
