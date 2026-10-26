import { redirect } from "next/navigation"

// Retain old bookmarks while Analytics is the single analysis destination.
export default async function Page({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
 const params = await searchParams ?? {}
 const query = new URLSearchParams()
 for (const key of ["farmId", "report", "period", "month", "to"]) {
   if (typeof params[key] === "string") query.set(key, params[key])
 }
 redirect(`/analytics${query.size ? `?${query}` : ""}`)
}
