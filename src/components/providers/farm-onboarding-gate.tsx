"use client"

import { useEffect } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useAuth } from "@/components/providers/auth-provider"
import { useFarmOptions } from "@/lib/hooks/use-options"
import { useActiveFarm } from "@/lib/hooks/app/use-active-farm"
import { useActiveFarmRole } from "@/lib/hooks/use-active-farm-role"
import {
  ONBOARDING_PATH,
  isOnboardingRoute,
  isWorkspaceSelectionRoute,
  sanitizeNextPath,
  WORKSPACE_SELECT_PATH,
} from "@/lib/app-entry"

function GateLoadingScreen() {
  return <div className="min-h-screen bg-background" />
}

export function FarmOnboardingGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, session, isLoading } = useAuth()
  const farmsQuery = useFarmOptions({ enabled: Boolean(session) })
  const { farmId, loading: activeFarmLoading } = useActiveFarm()
  const activeFarmRoleQuery = useActiveFarmRole(farmId)
  const farmsResult = farmsQuery.data

  const onboardingRoute = isOnboardingRoute(pathname)
  const workspaceSelectionRoute = isWorkspaceSelectionRoute(pathname)
  const search = searchParams.toString()
  const currentPath = sanitizeNextPath(`${pathname}${search ? `?${search}` : ""}`, "/dashboard")
  const membershipStatus = farmsResult?.status ?? null
  const membershipError = farmsResult?.status === "error" ? String(farmsResult.error ?? "") : ""
  const farms = farmsResult?.status === "success" ? farmsResult.data : []
  const hasFarmMembership = farms.length > 0
  const checkingMembership =
    Boolean(user) &&
    (farmsQuery.isLoading || farmsQuery.isFetching || membershipStatus !== "success")
  const checkingEntryPath =
    Boolean(user) &&
    hasFarmMembership &&
    (activeFarmLoading || activeFarmRoleQuery.isLoading || activeFarmRoleQuery.isFetching)

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
    if (!user) return
    if (checkingMembership || checkingEntryPath) return

    if (!hasFarmMembership) {
      if (!onboardingRoute && !workspaceSelectionRoute) {
        router.replace(`${ONBOARDING_PATH}?next=${encodeURIComponent(currentPath)}`)
      }
      return
    }

    if (onboardingRoute && !workspaceSelectionRoute) {
      router.replace(`${WORKSPACE_SELECT_PATH}?next=${encodeURIComponent(currentPath)}`)
    }
  }, [
    checkingEntryPath,
    checkingMembership,
    currentPath,
    hasFarmMembership,
    isLoading,
    onboardingRoute,
    router,
    user,
    workspaceSelectionRoute,
  ])

  if (isLoading) {
    return <>{children}</>
  }

  if (!user) {
    return <>{children}</>
  }

  if (checkingMembership || checkingEntryPath) {
    return <>{children}</>
  }

  if (!hasFarmMembership) {
    if (!onboardingRoute && !workspaceSelectionRoute) {
      return <GateLoadingScreen />
    }
    return <>{children}</>
  }

  if (onboardingRoute && !workspaceSelectionRoute) {
    return <GateLoadingScreen />
  }

  return <>{children}</>
}
