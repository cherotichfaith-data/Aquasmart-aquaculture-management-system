import { notFound } from "next/navigation"
import PageClient from "./page.client"
import { resolveInitialFarmId } from "@/features/farm/queries.server"

type SearchParams = Record<string, string | string[] | undefined>

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ systemId: string }>
  searchParams?: Promise<SearchParams>
}) {
  const resolvedParams = await params
  const resolvedSearchParams = (await searchParams) ?? {}
  const parsedSystemId = Number(resolvedParams.systemId)

  if (!Number.isFinite(parsedSystemId) || parsedSystemId <= 0) {
    notFound()
  }

  const searchFarmId = typeof resolvedSearchParams.farmId === "string" ? resolvedSearchParams.farmId : null
  const { farmId, farmName } = await resolveInitialFarmId(searchFarmId)

  return (
    <PageClient
      initialFarmId={farmId}
      initialFarmName={farmName}
      systemId={parsedSystemId}
    />
  )
}
