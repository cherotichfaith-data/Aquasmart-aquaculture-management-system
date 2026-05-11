"use client"

import Image from "next/image"
import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { LogOut } from "lucide-react"
import { useAuth } from "@/components/providers/auth-provider"
import {
  ONBOARDING_CREATE_WORKSPACE_PATH,
  WORKSPACE_SELECT_PATH,
  sanitizeNextPath,
} from "@/lib/app-entry"
import { getFarmsByOrganization, getOrganizations, selectWorkspace } from "@/lib/api"
import { setBrowserWorkspaceContext, type FarmSummary, type OrganizationSummary } from "@/lib/context"

const workspaceImages = [
  "/Multi-region-aquaculture-scaled.webp",
  "/tanga_tilapia4.jpg",
  "/cage mapping.png",
]

function getActiveFarmStorageKey(userId: string) {
  return `aquasmart:${userId}:activeFarmId`
}

function buildWorkspaceDestination(nextPath: string, farmId: string) {
  const [pathname, search = ""] = nextPath.split("?", 2)
  const params = new URLSearchParams(search)
  params.set("farmId", farmId)
  const query = params.toString()
  return query ? `${pathname}?${query}` : pathname
}

export default function WorkspaceSelector({
  initialOrganizations = [],
}: {
  initialOrganizations?: OrganizationSummary[]
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { profile, signOut, user } = useAuth()
  const nextPath = sanitizeNextPath(searchParams.get("next"), "/dashboard")
  const [organizations, setOrganizations] = useState<OrganizationSummary[]>(initialOrganizations)
  const [selectedOrganizationId, setSelectedOrganizationId] = useState<string | null>(null)
  const [selectedFarmId, setSelectedFarmId] = useState<string | null>(null)
  const [farms, setFarms] = useState<FarmSummary[]>([])
  const [isLoading, setIsLoading] = useState(initialOrganizations.length === 0)
  const [isLoadingFarms, setIsLoadingFarms] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const displayName =
    typeof profile?.full_name === "string" && profile.full_name.trim()
      ? profile.full_name.trim().split(/\s+/)[0]
      : typeof user?.user_metadata?.firstName === "string" && user.user_metadata.firstName.trim()
        ? user.user_metadata.firstName.trim()
        : typeof user?.email === "string"
          ? user.email.split("@")[0]
          : "there"

  const continueToWorkspace = (organizationId: string, farmId: string) => {
    if (typeof window !== "undefined" && user?.id) {
      window.localStorage.setItem(getActiveFarmStorageKey(user.id), farmId)
      setBrowserWorkspaceContext({ organizationId, farmId })
      window.dispatchEvent(new CustomEvent("farm-updated", { detail: { farmId } }))
      window.dispatchEvent(new Event("farm-memberships-updated"))
    }

    router.replace(buildWorkspaceDestination(nextPath, farmId))
  }

  useEffect(() => {
    if (initialOrganizations.length > 0) {
      setOrganizations(initialOrganizations)
      setIsLoading(false)
      return
    }

    let active = true

    getOrganizations()
      .then((nextOrganizations) => {
        if (!active) return
        if (nextOrganizations.length === 0) {
          router.replace(`${ONBOARDING_CREATE_WORKSPACE_PATH}?next=${encodeURIComponent(nextPath)}`)
          return
        }
        setOrganizations(nextOrganizations)
      })
      .catch((error) => {
        if (!active) return
        const message = error instanceof Error ? error.message : "Unable to load workspace context."
        if (/unauthorized|not authenticated/i.test(message)) {
          router.replace(`/auth?next=${encodeURIComponent(WORKSPACE_SELECT_PATH)}`)
          return
        }
        setErrorMessage(message)
      })
      .finally(() => {
        if (active) setIsLoading(false)
      })

    return () => {
      active = false
    }
  }, [initialOrganizations, nextPath, router])

  useEffect(() => {
    if (selectedOrganizationId || isLoading || organizations.length === 0) return
    void handleOrganizationSelect(organizations[0].id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, organizations, selectedOrganizationId])

  const handleOrganizationSelect = async (organizationId: string) => {
    setSelectedOrganizationId(organizationId)
    setSelectedFarmId(null)
    setErrorMessage(null)
    setIsLoadingFarms(true)

    try {
      const nextFarms = await getFarmsByOrganization(organizationId)
      setFarms(nextFarms)
    } catch (error) {
      setFarms([])
      setErrorMessage(error instanceof Error ? error.message : "Unable to load farms.")
    } finally {
      setIsLoadingFarms(false)
    }
  }

  const handleFarmOpen = async (farm: FarmSummary) => {
    const organizationId = farm.organizationId ?? selectedOrganizationId
    if (!organizationId) {
      setErrorMessage("Select an organization to continue.")
      return
    }
    setSelectedFarmId(farm.id)
    setSelectedOrganizationId(organizationId)
    setIsSaving(true)
    setErrorMessage(null)
    try {
      await selectWorkspace(organizationId, farm.id)
      continueToWorkspace(organizationId, farm.id)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to select workspace context.")
      setIsSaving(false)
    }
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,var(--color-accent)_0%,var(--color-background)_54%,color-mix(in_srgb,var(--color-primary)_13%,white)_100%)] px-4 py-6 text-foreground sm:px-6">
      <div className="mx-auto flex w-full max-w-6xl flex-col">
        <div className="flex items-center justify-end">
          <button
            type="button"
            onClick={async () => {
              await signOut()
            }}
            className="inline-flex items-center gap-2 rounded-xl border border-primary/20 bg-white/72 px-3 py-2 text-sm font-medium text-foreground shadow-sm transition hover:bg-primary/10"
          >
            <LogOut className="h-4 w-4" />
            Log out
          </button>
        </div>

        <header className="mx-auto mt-8 text-center sm:mt-12">
          <h1 className="font-serif text-4xl font-semibold tracking-[-0.03em] text-foreground sm:text-5xl md:text-6xl">
            Welcome Back, {displayName}!
          </h1>
          <p className="mt-4 text-2xl font-medium text-foreground sm:text-3xl">Select Your Workspace</p>
        </header>

        <div className="mx-auto mt-10 flex w-full max-w-5xl flex-col gap-6">
          {errorMessage ? (
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {errorMessage}
            </div>
          ) : null}

          {organizations.length > 1 ? (
            <div className="flex flex-wrap justify-center gap-2">
              {organizations.map((organization) => (
                <button
                  key={organization.id}
                  type="button"
                  onClick={() => void handleOrganizationSelect(organization.id)}
                  className={`rounded-full border px-4 py-2 text-sm font-semibold shadow-sm transition ${
                    selectedOrganizationId === organization.id
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-primary/20 bg-white/74 text-primary hover:bg-primary/10"
                  }`}
                >
                  {organization.name}
                </button>
              ))}
            </div>
          ) : null}

          {isLoading ? (
            <div className="rounded-2xl border border-primary/15 bg-white/78 px-5 py-8 text-center text-sm text-muted-foreground shadow-sm">
              Loading workspaces...
            </div>
          ) : organizations.length === 0 ? (
            <div className="mx-auto max-w-md rounded-2xl border border-primary/15 bg-white/78 px-5 py-8 text-center shadow-sm">
              <p className="text-sm text-muted-foreground">No organizations available for this account.</p>
              <button
                type="button"
                onClick={() => router.push(`${ONBOARDING_CREATE_WORKSPACE_PATH}?next=${encodeURIComponent(nextPath)}`)}
                className="mt-4 inline-flex rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-[var(--color-primary-hover)]"
              >
                Create workspace
              </button>
            </div>
          ) : !selectedOrganizationId ? (
            <div className="rounded-2xl border border-primary/15 bg-white/78 px-5 py-8 text-center text-sm text-muted-foreground shadow-sm">
              Select an organization to view its workspaces.
            </div>
          ) : isLoadingFarms ? (
            <div className="rounded-2xl border border-primary/15 bg-white/78 px-5 py-8 text-center text-sm text-muted-foreground shadow-sm">
              Loading workspaces...
            </div>
          ) : farms.length === 0 ? (
            <div className="mx-auto max-w-md rounded-2xl border border-primary/15 bg-white/78 px-5 py-8 text-center shadow-sm">
              <p className="text-sm text-muted-foreground">No farms found for the selected organization.</p>
              <button
                type="button"
                onClick={() => router.push(`${ONBOARDING_CREATE_WORKSPACE_PATH}?next=${encodeURIComponent(nextPath)}`)}
                className="mt-4 inline-flex rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-[var(--color-primary-hover)]"
              >
                Create workspace
              </button>
            </div>
          ) : (
            <section className="grid gap-6 md:grid-cols-2">
              {farms.map((farm, index) => (
                <button
                  key={farm.id}
                  type="button"
                  onClick={() => void handleFarmOpen(farm)}
                  disabled={isSaving}
                  className="group relative min-h-[180px] overflow-hidden rounded-xl border border-primary/15 bg-primary text-left shadow-[0_18px_42px_-28px_color-mix(in_srgb,var(--color-primary)_72%,transparent)] transition hover:-translate-y-0.5 hover:shadow-[0_24px_50px_-30px_color-mix(in_srgb,var(--color-primary)_84%,transparent)] disabled:pointer-events-none disabled:opacity-70 sm:min-h-[205px]"
                >
                  <Image
                    src={workspaceImages[index % workspaceImages.length]}
                    alt=""
                    fill
                    sizes="(min-width: 768px) 480px, 100vw"
                    className="object-cover transition duration-500 group-hover:scale-105"
                  />
                  <span className="absolute inset-0 bg-[linear-gradient(180deg,color-mix(in_srgb,var(--color-accent)_78%,transparent)_0%,color-mix(in_srgb,var(--color-accent)_26%,transparent)_42%,color-mix(in_srgb,var(--color-primary)_82%,transparent)_100%)]" />
                  <span className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.28)_0%,rgba(255,255,255,0)_54%)]" />
                  <span className="relative z-10 flex min-h-[180px] flex-col justify-between p-6 sm:min-h-[205px] sm:p-7">
                    <span className="block text-3xl font-extrabold tracking-[-0.04em] text-primary sm:text-4xl">
                      {farm.name}
                    </span>
                    <span className="block text-2xl font-bold tracking-[-0.03em] text-white sm:text-3xl">
                      {selectedFarmId === farm.id && isSaving ? "Opening..." : farm.location ?? "Open Workspace"}
                    </span>
                  </span>
                </button>
              ))}
            </section>
          )}
        </div>
      </div>
    </main>
  )
}
