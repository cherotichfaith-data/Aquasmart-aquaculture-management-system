import { redirect } from "next/navigation"

// Retain old bookmarks while Analytics is the single analysis destination.
export default async function Page({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
 const params = await searchParams ?? {}
 const farmId = typeof params.farmId === "string" ? params.farmId : null
 redirect(`/analytics${farmId ? `?farmId=${encodeURIComponent(farmId)}` : ""}`)
}
