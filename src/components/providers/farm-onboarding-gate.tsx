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
  const farmsResult = farmsQuery.data

  const authRoute = isAuthRoute(pathname)
  const onboardingRoute = isOnboardingRoute(pathname)
  const publicRoute = isPublicRoute(pathname)
  const membershipStatus = farmsResult?.status ?? null
  const membershipError =
    farmsResult?.status === "error" ? String(farmsResult.error ?? "") : ""
  const farms = farmsResult?.status === "success" ? farmsResult.data : []
  const hasFarmMembership = farms.length > 0
  const checkingMembership =
    Boolean(user) &&
    (farmsQuery.isLoading || farmsQuery.isFetching || membershipStatus !== "success")
  const checkingEntryPath =
    Boolean(user) &&
    hasFarmMembership &&
    (activeFarmLoading || activeFarmRoleQuery.isLoading || activeFarmRoleQuery.isFetching)
  const entryPath = resolveAppEntryPath(
    (activeFarmRoleQuery.data ?? role ?? null) as Parameters<typeof resolveAppEntryPath>[0],
  )

  useEffect(() => {
    const handleMembershipSync = () => {
      void farmsQuery.refetch()
    }

    if (typeof window !== "undefined") {
      window.addEventListener("farm-memberships-updated", handleMembershipSync)
      return () => window.removeEventListener("farm-memberships-updated", handleMembershipSync)
    }
  }, [farmsQuery.refetch])

  useEffect(() => {
    if (!user || !session) return
    if (membershipStatus !== "error") return
    if (!/no active session/i.test(membershipError)) return

    void farmsQuery.refetch()
  }, [farmsQuery.refetch, membershipError, membershipStatus, session, user])

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

  // While auth is loading: always show children (SSR has already rendered the right content)
  if (isLoading) {
    return <>{children}</>
  }

  // Not authenticated: show children on public/auth routes, blank shield on protected ones
  if (!user) {
    if (!publicRoute && !authRoute) {
      return <GateLoadingScreen />
    }
    return <>{children}</>
  }

  // Authenticated but still checking membership or role — show children while async resolves.
  // This prevents blank flash: SSR already rendered the right page, don't hide it.
  if (checkingMembership || checkingEntryPath) {
    return <>{children}</>
  }

  // No farm membership — hide content while redirecting to onboarding
  if (!hasFarmMembership) {
    if (!onboardingRoute) {
      return <GateLoadingScreen />
    }
    return <>{children}</>
  }

  // On auth/onboarding routes while already having farm → redirect happening
  if (authRoute || onboardingRoute) {
    return <GateLoadingScreen />
  }

  // On root "/" but role-based entry is a different path → redirect happening
  if (pathname === "/" && entryPath !== "/") {
    return <GateLoadingScreen />
  }

  return <>{children}</>
}
