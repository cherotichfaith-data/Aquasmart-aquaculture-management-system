"use client"

import { useEffect } from "react"
import { AlertTriangle } from "lucide-react"
import { Button } from "@/components/app-ui/button"
import { logSbError } from "@/lib/supabase/log"

export default function PageError({
  error,
  reset,
}: {
  error: Error
  reset: () => void
}) {
  useEffect(() => {
    logSbError("settings:pageError", error)
  }, [error])

  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center">
      <AlertTriangle className="mb-4 h-12 w-12 text-destructive" />
      <h2 className="mb-2 text-xl font-bold">Something went wrong</h2>
      <p className="mb-4 text-muted-foreground">{error.message}</p>
      <Button onClick={reset}>Try again</Button>
    </div>
  )
}

