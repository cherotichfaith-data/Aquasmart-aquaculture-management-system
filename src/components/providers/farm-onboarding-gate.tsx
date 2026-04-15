"use client"

import { useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"
import { useAuth } from "@/components/providers/auth-provider"
import { useFarmOptions } from "@/lib/hooks/use-options"
import { useActiveFarm } from "@/lib/hooks/app/use-active-farm"
import { useActiveFarmRole } from "@/lib/hooks/use-active-farm-role"
import { isAuthRoute, isOnboardingRoute, isPublicRoute, resolveAppEntryPath } from "@/lib/app-entry"

function GateLoadingScreen() {
  return <div className="min-h-screen bg-background" />
}

export function FarmOnboardingGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, role, session, isLoading } = useAuth()
  const farmsQuery = useFarmOptions({ enabled: Boolean(session) })
  const { farmId, loading: activeFarmLoading } = useActiveFarm()
  const activeFarmRoleQuery = useActiveFarmRole(farmId)

  const authRoute = isAuthRoute(pathname)
  const onboardingRoute = isOnboardingRoute(pathname)
  const publicRoute = isPublicRoute(pathname)
  const farms = farmsQuery.data?.status === "success" ? farmsQuery.data.data : []
  const hasFarmMembership = farms.length > 0
  const checkingMembership = Boolean(user) && (farmsQuery.isLoading || farmsQuery.isFetching)
  const checkingEntryPath =
    Boolean(user) &&
    hasFarmMembership &&
    (activeFarmLoading || activeFarmRoleQuery.isLoading || activeFarmRoleQuery.isFetching)
  const entryPath = resolveAppEntryPath(
    (activeFarmRoleQuery.data ?? role ?? null) as Parameters<typeof resolveAppEntryPath>[0],
  )

  useEffect(() => {
    if (isLoading) return

    if (!user) {
      if (!publicRoute && !onboardingRoute) {
        router.replace("/auth")
      } else if (onboardingRoute) {
        router.replace("/auth")
      }
      return
    }

    if (checkingMembership || checkingEntryPath) return

    if (!hasFarmMembership) {
      if (!onboardingRoute) {
        router.replace("/onboarding")
      }
      return
    }

    if ((authRoute || onboardingRoute) || (pathname === "/" && entryPath !== "/")) {
      router.replace(entryPath)
    }
  }, [
    authRoute,
    checkingEntryPath,
    checkingMembership,
    entryPath,
    hasFarmMembership,
    isLoading,
    onboardingRoute,
    pathname,
    publicRoute,
    role,
    router,
    user,
  ])

  if (isLoading) {
    if (pathname === "/") {
      return <GateLoadingScreen />
    }
    return <>{children}</>
  }

  if (!user) {
    if (!publicRoute && !authRoute) {
      return <GateLoadingScreen />
    }
    return <>{children}</>
  }

  if (checkingMembership) {
    return <GateLoadingScreen />
  }

  if (checkingEntryPath) {
    return <GateLoadingScreen />
  }

  if (!hasFarmMembership) {
    if (!onboardingRoute) {
      return <GateLoadingScreen />
    }
    return <>{children}</>
  }

  if (authRoute || onboardingRoute) {
    return <GateLoadingScreen />
  }

  if (pathname === "/" && entryPath !== "/") {
    return <GateLoadingScreen />
  }

  return <>{children}</>
}
