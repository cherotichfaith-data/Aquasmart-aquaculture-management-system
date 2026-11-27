"use client"

import Link from "next/link"
import { useSearchParams } from "next/navigation"

export default function ProductionNavigation({ active }: { active: "overview" | "harvests" }) {
  const search = useSearchParams()
  const params = new URLSearchParams()
  for (const key of ["farmId", "month", "period"]) {
    const value = search.get(key)
    if (value) params.set(key, value)
  }
  const query = params.size ? `?${params}` : ""
  return <nav aria-label="Production sections" className="flex flex-wrap gap-2 border-b border-border pb-3">
    {([ ["overview", "/production", "Overview"], ["harvests", "/production/harvests", "Harvests"] ] as const).map(([key, href, label]) =>
      <Link key={key} href={`${href}${query}`} aria-current={active === key ? "page" : undefined}
        className={`rounded-full px-4 py-2 text-sm font-semibold ${active === key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}>{label}</Link>)}
  </nav>
}
