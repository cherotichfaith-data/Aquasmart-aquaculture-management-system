import { redirect } from "next/navigation"
export default async function WorkbookPage({searchParams}:{searchParams?:Promise<Record<string,string|string[]|undefined>>}) {
 const params=await searchParams??{}
 redirect(`/analytics/inputs/feed-planning${typeof params.farmId==="string"?`?farmId=${encodeURIComponent(params.farmId)}`:""}`)
}
