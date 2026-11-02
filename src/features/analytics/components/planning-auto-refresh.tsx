"use client"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

export default function PlanningAutoRefresh({ farmId }: { farmId: string }) {
  const router = useRouter()
  const [updated, setUpdated] = useState(false)
  useEffect(() => {
    const refresh = () => { if (document.visibilityState === "visible") { router.refresh(); setUpdated(true) } }
    const records = (event: Event) => { const farm = (event as CustomEvent<{ farmId: string }>).detail?.farmId; if (!farm || farm === farmId) refresh() }
    const storage = (event: StorageEvent) => { if (event.key === `aquasmart:production-records:${farmId}`) refresh() }
    const timer = window.setInterval(refresh, 30000)
    window.addEventListener("focus", refresh); document.addEventListener("visibilitychange", refresh)
    window.addEventListener("aquasmart:production-records", records); window.addEventListener("storage", storage)
    return () => { window.clearInterval(timer); window.removeEventListener("focus", refresh); document.removeEventListener("visibilitychange", refresh); window.removeEventListener("aquasmart:production-records", records); window.removeEventListener("storage", storage) }
  }, [router, farmId])
  return <span className="text-xs text-muted-foreground" role="status">{updated ? "Checking for new records automatically" : "Live records · updates automatically"}</span>
}
