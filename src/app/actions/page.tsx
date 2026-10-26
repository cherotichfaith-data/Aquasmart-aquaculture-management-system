import { redirect } from "next/navigation"
import PageClient from "./page.client"
import { resolveInitialFarmId } from "@/features/farm/queries.server"
import { WORKSPACE_SELECT_PATH } from "@/lib/app-entry"
import { requireUserContext } from "@/lib/supabase/require-user"

type SearchParams = Record<string, string | string[] | undefined>

export default async function Page({ searchParams }: { searchParams?: Promise<SearchParams> }) {
  const resolvedSearchParams = (await searchParams) ?? {}
  await requireUserContext("/actions")
  const searchFarmId = typeof resolvedSearchParams.farmId === "string" ? resolvedSearchParams.farmId : null
  const { farmId, farmName } = await resolveInitialFarmId(searchFarmId)

  if (!farmId) {
    redirect(`${WORKSPACE_SELECT_PATH}?next=${encodeURIComponent("/actions")}`)
  }

  return <PageClient initialFarmId={farmId} initialFarmName={farmName} />
}
