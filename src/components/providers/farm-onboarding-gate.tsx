"use client"

import { useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"
import { useAuth } from "@/components/providers/auth-provider"
import { useFarmOptions } from "@/lib/hooks/use-options"

const isAuthPath = (pathname: string | null) => Boolean(pathname && pathname.startsWith("/auth"))
const isOnboardingPath = (pathname: string | null) => pathname === "/onboarding"

export function FarmOnboardingGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { session, isLoading } = useAuth()
  const farmsQuery = useFarmOptions({ enabled: Boolean(session) && !isLoading })
  const farms = farmsQuery.data?.status === "success" ? farmsQuery.data.data : []
  const hasFarm = farms.length > 0
  const waitingForFarmResolution = Boolean(session) && !isLoading && (farmsQuery.isLoading || !farmsQuery.isFetched)
  const onAuthPath = isAuthPath(pathname)
  const onOnboardingPath = isOnboardingPath(pathname)

  useEffect(() => {
    if (!session || isLoading || waitingForFarmResolution) return

    if (onAuthPath) {
      router.replace(hasFarm ? "/" : "/onboarding")
      return
    }

    if (onOnboardingPath) {
      if (hasFarm) {
        router.replace("/")
      }
      return
    }

    if (!hasFarm) {
      router.replace("/onboarding")
    }
  }, [hasFarm, isLoading, onAuthPath, onOnboardingPath, router, session, waitingForFarmResolution])

  if (waitingForFarmResolution) {
    return <div className="min-h-screen bg-background" />
  }

  if (session && !isLoading) {
    if (onAuthPath) {
      return <div className="min-h-screen bg-background" />
    }

    if (onOnboardingPath && hasFarm) {
      return <div className="min-h-screen bg-background" />
    }

    if (!onOnboardingPath && !hasFarm) {
      return <div className="min-h-screen bg-background" />
    }
  }

  return <>{children}</>
}
