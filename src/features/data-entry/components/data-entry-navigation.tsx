"use client"
import { useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { DATA_ENTRY_PATH } from "@/lib/app-entry"

export const entryNavigationItems = [
  ["feeding", "Feeding"], ["feed_inventory", "Feed Inventory"], ["mortality", "Mortality"],
  ["sampling", "Sampling"], ["water_quality", "Water Quality"], ["transfer", "Transfer"],
  ["harvest", "Harvest"], ["stocking", "Stocking"], ["system", "System Setup"],
] as const

export function DataEntryNavigation({ active, farmId, role, systemId, batchId }: {
  active: string; farmId: string | null; role?: string | null; systemId?: number | null; batchId?: number | null
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const reviewer = role === "admin" || role === "farm_manager"
  const items = [...entryNavigationItems.filter(([id]) => id !== "feed_inventory" || reviewer || role === "system_operator"), ["approvals", reviewer ? "Approvals" : "My submissions"]]
  function href(id: string) {
    const params = new URLSearchParams()
    if (farmId) params.set("farmId", farmId)
    if (systemId) params.set("system", String(systemId))
    if (batchId) params.set("batch", String(batchId))
    if (id !== "approvals") params.set("type", id)
    return `${id === "approvals" ? "/approvals" : DATA_ENTRY_PATH}?${params}`
  }
  return <nav className="data-entry-tabs-shell" aria-label="Data entry and approvals" aria-busy={pending}>
    <label className="sm:hidden block">
      <span className="sr-only">Select a form or approvals</span>
      <select className="data-entry-tab-select w-full" value={active} disabled={pending} onChange={(event) => { const next = href(event.target.value); startTransition(() => router.push(next)) }}>
        {items.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
      </select>
    </label>
    {pending && <p role="status" className="mt-2 text-sm text-muted-foreground">Opening selected page…</p>}
    <div className="hidden flex-wrap items-center gap-1.5 sm:flex">
      {items.map(([id, label]) => <Link key={id} href={href(id)} aria-current={active === id ? "page" : undefined} className={`data-entry-tab ${active === id ? "data-entry-tab-active" : "data-entry-tab-idle"}`}>{label}</Link>)}
    </div>
  </nav>
}
