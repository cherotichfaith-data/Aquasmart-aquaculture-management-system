import { dehydrate } from "@tanstack/react-query"
import type { Metadata } from "next"
import OnboardingPageClient from "./page.client"
import { QueryHydration } from "@/components/providers/query-hydration"
import { getOnboardingPageInitialData } from "@/features/onboarding/queries.server"
import { queryKeys } from "@/lib/cache/query-keys"
import { createQueryClient } from "@/lib/react-query/query-client"
import { requireUser, requireUserContext } from "@/lib/supabase/require-user"

export const metadata: Metadata = {
  title: "Onboarding | SUSTAIN Aquasmart",
  description: "Complete your SUSTAIN Aquasmart onboarding, confirm your role, and create or join a farm workspace.",
}

type SearchParams = Record<string, string | string[] | undefined>

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>
}) {
  await requireUser("/onboarding")
  const { user } = await requireUserContext("/onboarding")
  const resolvedSearchParams = (await searchParams) ?? {}
  const linkedFarmId = typeof resolvedSearchParams.farmId === "string" ? resolvedSearchParams.farmId : null
  const initialData = await getOnboardingPageInitialData({ linkedFarmId })
  const queryClient = createQueryClient()

  queryClient.setQueryData(queryKeys.onboarding.state(user.id, linkedFarmId), initialData)

  return (
    <QueryHydration state={dehydrate(queryClient)}>
      <OnboardingPageClient />
    </QueryHydration>
  )
}
