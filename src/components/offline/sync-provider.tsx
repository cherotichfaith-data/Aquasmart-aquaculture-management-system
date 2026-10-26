"use client"

import { useEffect } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { useSyncController } from "@/lib/offline/use-sync"

export function SyncProvider({ children }: { children: React.ReactNode }) {
  useSyncController()

  const queryClient = useQueryClient()

  useEffect(() => {
    const handleSyncComplete = () => {
      void queryClient.invalidateQueries()
    }

    window.addEventListener("offline-sync-complete", handleSyncComplete)
    return () => window.removeEventListener("offline-sync-complete", handleSyncComplete)
  }, [queryClient])

  return <>{children}</>
}
