import { redirect } from "next/navigation"

export default async function InputsPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
 const params = await searchParams ?? {}
 const farmParam = typeof params.farmId === "string" ? params.farmId : null
 redirect(`/analytics/inputs/feed-planning${farmParam ? `?farmId=${encodeURIComponent(farmParam)}` : ""}`)
}
