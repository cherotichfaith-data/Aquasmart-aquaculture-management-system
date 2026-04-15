import { Suspense } from "react"
import { redirect } from "next/navigation"
import DataEntryPageClient from "@/app/data-entry/page.client"
import { Metadata } from "next"
import { requireUser, requireUserContext } from "@/lib/supabase/require-user"
import { resolveInitialFarmId } from "@/features/farm/queries.server"
import { createAccessTokenClient } from "@/lib/supabase/server"
import { canAccessDataEntry, resolveAppEntryPath } from "@/lib/app-entry"
import { logSbError } from "@/lib/supabase/log"

export const metadata: Metadata = {
    title: "Data Capture - AquaSmart",
    description: "Record daily farm events",
}

type SearchParams = Record<string, string | string[] | undefined>

export default async function DataEntryPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>
}) {
  await requireUser()
  const { user, accessToken } = await requireUserContext()
  const resolvedSearchParams = (await searchParams) ?? {}
  const searchFarmId = typeof resolvedSearchParams.farmId === "string" ? resolvedSearchParams.farmId : null
  const { farmId } = await resolveInitialFarmId(searchFarmId)

  if (farmId) {
    const supabase = createAccessTokenClient(accessToken)
    const { data: membership, error } = await supabase
      .from("farm_user")
      .select("role")
      .eq("farm_id", farmId)
      .eq("user_id", user.id)
      .maybeSingle()

    if (error) {
      logSbError("data-entry:page:getFarmRole", error)
    }

    const role = (membership?.role ?? null) as Parameters<typeof canAccessDataEntry>[0]
    if (!canAccessDataEntry(role)) {
      redirect(resolveAppEntryPath(role))
    }
  }

  return (
    <Suspense fallback={null}>
      <DataEntryPageClient />
        </Suspense>
    )
}
