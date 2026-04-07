"use client"

import { useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"
import { useAuth } from "@/components/providers/auth-provider"
import { Skeleton } from "@/components/ui/skeleton"
import { useFarmOptions } from "@/lib/hooks/use-options"

const isAuthPath = (pathname: string | null) => Boolean(pathname && pathname.startsWith("/auth"))
const isOnboardingPath = (pathname: string | null) => pathname === "/onboarding"

function WorkspaceLoadingShell({
  title = "Preparing your workspace",
  description = "Loading farms, permissions, and dashboard context.",
}: {
  title?: string
  description?: string
}) {
  return (
    <div className="min-h-screen bg-background px-3 pb-8 pt-4 sm:px-4 md:px-6 md:pb-10 md:pt-5 lg:px-10">
      <div className="mx-auto w-full max-w-[1720px] space-y-6">
        <section className="page-hero overflow-hidden">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-2xl" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-3 w-40" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Skeleton className="h-10 w-10 rounded-2xl" />
                <Skeleton className="h-10 w-10 rounded-2xl" />
                <Skeleton className="h-10 w-10 rounded-2xl" />
              </div>
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-[1.85rem]">{title}</h1>
              <p className="max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <Skeleton className="h-11 rounded-xl" />
              <Skeleton className="h-11 rounded-xl" />
              <Skeleton className="h-11 rounded-xl" />
              <Skeleton className="h-11 rounded-xl" />
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Skeleton className="h-28 rounded-[1.25rem]" />
          <Skeleton className="h-28 rounded-[1.25rem]" />
          <Skeleton className="h-28 rounded-[1.25rem]" />
          <Skeleton className="h-28 rounded-[1.25rem]" />
        </section>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          <Skeleton className="h-[340px] rounded-[1.5rem]" />
          <Skeleton className="h-[340px] rounded-[1.5rem]" />
        </section>
      </div>
    </div>
  )
}

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
    return <WorkspaceLoadingShell />
  }

  if (session && !isLoading) {
    if (onAuthPath) {
      return (
        <WorkspaceLoadingShell
          title={hasFarm ? "Opening your dashboard" : "Preparing onboarding"}
          description={hasFarm ? "Restoring your farm workspace and recent dashboard state." : "Creating the workspace flow for this account."}
        />
      )
    }

    if (onOnboardingPath && hasFarm) {
      return (
        <WorkspaceLoadingShell
          title="Returning to your dashboard"
          description="A farm workspace already exists for this account."
        />
      )
    }

    if (!onOnboardingPath && !hasFarm) {
      return (
        <WorkspaceLoadingShell
          title="Redirecting to onboarding"
          description="No farm workspace is assigned yet, so the setup flow is loading."
        />
      )
    }
  }

  return <>{children}</>
}
