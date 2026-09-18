"use client"

import Image from "next/image"
import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ArrowLeft, Loader2, Plus, X } from "lucide-react"
import { useAuth } from "@/components/providers/auth-provider"
import {
  ONBOARDING_CREATE_WORKSPACE_PATH,
  WORKSPACE_SELECT_PATH,
  sanitizeNextPath,
} from "@/lib/app-entry"
import { createWorkspace, getFarmsByOrganization, getOrganizations, selectWorkspace } from "@/lib/api"
import { setBrowserWorkspaceContext, type FarmSummary, type OrganizationSummary } from "@/lib/context"

const workspaceImages = [
  "/Multi-region-aquaculture-scaled.webp",
  "/tanga_tilapia4.jpg",
  "/cage mapping.png",
]

function getActiveFarmStorageKey(userId: string) {
  return `aquasmart:${userId}:activeFarmId`
}

function buildWorkspaceDestination(nextPath: string) {
  const [pathname, search = ""] = nextPath.split("?", 2)
  const params = new URLSearchParams(search)
  params.delete("farmId")
  const query = params.toString()
  return query ? `${pathname}?${query}` : pathname
}

export default function WorkspaceSelector({
  initialOrganizations = [],
  initialDisplayName,
  initialUserId,
}: {
  initialOrganizations?: OrganizationSummary[]
  initialDisplayName?: string | null
  initialUserId?: string | null
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { profile, user } = useAuth()
  const nextPath = sanitizeNextPath(searchParams.get("next"), "/dashboard")
  const [organizations, setOrganizations] = useState<OrganizationSummary[]>(initialOrganizations)
  const [selectedOrganizationId, setSelectedOrganizationId] = useState<string | null>(null)
  const [selectedFarmId, setSelectedFarmId] = useState<string | null>(null)
  const [farms, setFarms] = useState<FarmSummary[]>([])
  const [isLoading, setIsLoading] = useState(initialOrganizations.length === 0)
  const [isLoadingFarms, setIsLoadingFarms] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const farmRequestOrganizationIdRef = useRef<string | null>(null)

  // Inline "add farm" state
  const [isCreatingFarm, setIsCreatingFarm] = useState(false)
  const [newFarmName, setNewFarmName] = useState("")
  const [newFarmLocation, setNewFarmLocation] = useState("")
  const [isSubmittingFarm, setIsSubmittingFarm] = useState(false)
  const [createFarmError, setCreateFarmError] = useState<string | null>(null)

  const canUseClientAuthName = Boolean(user?.id && (!initialUserId || user.id === initialUserId))
  const clientDisplayName =
    canUseClientAuthName && typeof profile?.full_name === "string" && profile.full_name.trim()
      ? profile.full_name.trim()
      : canUseClientAuthName && typeof user?.user_metadata?.firstName === "string" && user.user_metadata.firstName.trim()
        ? user.user_metadata.firstName.trim()
        : canUseClientAuthName && typeof user?.email === "string"
          ? user.email.split("@")[0]
          : null
  const displayName = (clientDisplayName ?? initialDisplayName ?? "there").split(/\s+/)[0] ?? "there"

  const continueToWorkspace = (organizationId: string, farmId: string) => {
    if (typeof window !== "undefined" && user?.id) {
      window.localStorage.setItem(getActiveFarmStorageKey(user.id), farmId)
      setBrowserWorkspaceContext({ organizationId, farmId })
      window.dispatchEvent(new CustomEvent("farm-updated", { detail: { farmId } }))
    }

    router.replace(buildWorkspaceDestination(nextPath))
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

  const handleOrganizationSelect = useCallback(async (organizationId: string) => {
    if (farmRequestOrganizationIdRef.current === organizationId) {
      return
    }

    farmRequestOrganizationIdRef.current = organizationId
    setSelectedOrganizationId(organizationId)
    setSelectedFarmId(null)
    setErrorMessage(null)
    setIsLoadingFarms(true)

    try {
      const nextFarms = await getFarmsByOrganization(organizationId)
      setFarms(nextFarms)
    } catch (error) {
      setFarms([])
      farmRequestOrganizationIdRef.current = null
      setErrorMessage(error instanceof Error ? error.message : "Unable to load farms.")
    } finally {
      setIsLoadingFarms(false)
    }
  }, [])

  const handleBackToOrganizations = () => {
    setSelectedOrganizationId(null)
    setSelectedFarmId(null)
    setFarms([])
    farmRequestOrganizationIdRef.current = null
    setIsCreatingFarm(false)
    setErrorMessage(null)
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

  const selectedOrganization = organizations.find((organization) => organization.id === selectedOrganizationId) ?? null

  const openCreateFarm = () => {
    setNewFarmName("")
    setNewFarmLocation("")
    setCreateFarmError(null)
    setIsCreatingFarm(true)
  }

  const closeCreateFarm = () => {
    if (isSubmittingFarm) return
    setIsCreatingFarm(false)
    setCreateFarmError(null)
  }

  const handleCreateFarm = async () => {
    if (isSubmittingFarm) return
    if (!selectedOrganization) {
      setCreateFarmError("Select an organization first.")
      return
    }
    if (newFarmName.trim().length < 2) {
      setCreateFarmError("Farm name is required.")
      return
    }
    if (newFarmLocation.trim().length < 2) {
      setCreateFarmError("Location is required.")
      return
    }

    setIsSubmittingFarm(true)
    setCreateFarmError(null)

    try {
      await createWorkspace({
        organizationName: selectedOrganization.name,
        organizationId: selectedOrganization.id,
        farmName: newFarmName.trim(),
        location: newFarmLocation.trim(),
      })

      // Refresh the org's farms so the new one shows up in the grid.
      const nextFarms = await getFarmsByOrganization(selectedOrganization.id)
      setFarms(nextFarms)
      setIsCreatingFarm(false)
      setNewFarmName("")
      setNewFarmLocation("")

      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("farm-memberships-updated"))
      }
    } catch (error) {
      setCreateFarmError(error instanceof Error ? error.message : "Unable to create farm.")
    } finally {
      setIsSubmittingFarm(false)
    }
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,var(--color-accent)_0%,var(--color-background)_54%,color-mix(in_srgb,var(--color-primary)_13%,white)_100%)] px-4 py-6 text-foreground sm:px-6">
      <div className="mx-auto flex w-full max-w-6xl flex-col">
        <header className="mx-auto mt-8 text-center sm:mt-10">
          <h1 className="font-serif text-2xl font-semibold tracking-[-0.02em] text-foreground sm:text-3xl">
            Hey, {displayName},
          </h1>
          <p className="mt-1.5 text-sm font-medium text-muted-foreground sm:text-base">
            welcome back to your farm
          </p>
        </header>

        <div className="mx-auto mt-10 flex w-full max-w-5xl flex-col gap-6">
          {errorMessage ? (
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive-strong">
              {errorMessage}
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
            <section className="grid gap-6 md:grid-cols-2">
              {organizations.map((organization, index) => (
                <button
                  key={organization.id}
                  type="button"
                  onClick={() => void handleOrganizationSelect(organization.id)}
                  className="group relative min-h-[180px] overflow-hidden rounded-xl border border-primary/15 bg-primary text-left shadow-[0_18px_42px_-28px_color-mix(in_srgb,var(--color-primary)_72%,transparent)] transition hover:-translate-y-0.5 hover:shadow-[0_24px_50px_-30px_color-mix(in_srgb,var(--color-primary)_84%,transparent)] sm:min-h-[205px]"
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
                    <span className="block text-lg font-bold tracking-[-0.02em] text-primary sm:text-xl">
                      {organization.name}
                    </span>
                    <span className="block text-sm font-semibold tracking-[-0.01em] text-white sm:text-base">
                      {organization.isOwner ? "Owner · View farms" : "View farms"}
                    </span>
                  </span>
                </button>
              ))}
            </section>
          ) : (
            <div className="flex flex-col gap-5">
              <button
                type="button"
                onClick={handleBackToOrganizations}
                className="inline-flex w-fit items-center gap-1.5 rounded-lg px-2 py-1 text-sm font-medium text-primary transition hover:bg-primary/10"
              >
                <ArrowLeft className="h-4 w-4" />
                {selectedOrganization?.name ?? "All organizations"}
              </button>

              {isLoadingFarms ? (
                <div className="rounded-2xl border border-primary/15 bg-white/78 px-5 py-8 text-center text-sm text-muted-foreground shadow-sm">
                  Loading farms...
                </div>
              ) : farms.length === 0 ? (
                <div className="mx-auto max-w-md rounded-2xl border border-primary/15 bg-white/78 px-5 py-8 text-center shadow-sm">
                  <p className="text-sm text-muted-foreground">No farms yet in this organization.</p>
                  <p className="mt-1 text-sm text-muted-foreground">Create your first farm to continue.</p>
                  <button
                    type="button"
                    onClick={openCreateFarm}
                    className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-[var(--color-primary-hover)]"
                  >
                    <Plus className="h-4 w-4" />
                    Create a farm
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
                        <span className="block text-lg font-bold tracking-[-0.02em] text-primary sm:text-xl">
                          {farm.name}
                        </span>
                        <span className="block text-sm font-semibold tracking-[-0.01em] text-white sm:text-base">
                          {selectedFarmId === farm.id && isSaving ? "Opening..." : farm.location ?? "Open Workspace"}
                        </span>
                      </span>
                    </button>
                  ))}

                  <button
                    type="button"
                    onClick={openCreateFarm}
                    disabled={isSaving}
                    className="group flex min-h-[180px] flex-col items-center justify-center gap-3 rounded-xl text-center transition disabled:pointer-events-none disabled:opacity-70 sm:min-h-[205px]"
                  >
                    <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary transition group-hover:bg-primary/15">
                      <Plus className="h-6 w-6" />
                    </span>
                    <span className="text-base font-semibold text-primary">New farm</span>
                  </button>
                </section>
              )}
            </div>
          )}
        </div>
      </div>

      {isCreatingFarm ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6"
          role="dialog"
          aria-modal="true"
          aria-label="Create a farm"
          onClick={closeCreateFarm}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-border/70 bg-card p-6 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-foreground">New farm</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {selectedOrganization ? `Added to ${selectedOrganization.name}` : "Select an organization first."}
                </p>
              </div>
              <button
                type="button"
                onClick={closeCreateFarm}
                disabled={isSubmittingFarm}
                className="rounded-lg p-1 text-muted-foreground transition hover:bg-accent disabled:opacity-60"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form
              className="mt-4 space-y-3.5"
              onSubmit={(event) => {
                event.preventDefault()
                void handleCreateFarm()
              }}
            >
              {createFarmError ? (
                <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive-strong">
                  {createFarmError}
                </div>
              ) : null}
              <label className="block space-y-1.5">
                <span className="text-sm font-medium text-foreground">Farm name</span>
                <input
                  type="text"
                  value={newFarmName}
                  onChange={(event) => setNewFarmName(event.target.value)}
                  placeholder="e.g. Model Farm"
                  autoFocus
                  className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </label>
              <label className="block space-y-1.5">
                <span className="text-sm font-medium text-foreground">Location</span>
                <input
                  type="text"
                  value={newFarmLocation}
                  onChange={(event) => setNewFarmLocation(event.target.value)}
                  placeholder="County, region, or site"
                  className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </label>
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="submit"
                  disabled={isSubmittingFarm}
                  className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-[var(--color-primary-hover)] disabled:opacity-60"
                >
                  {isSubmittingFarm ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {isSubmittingFarm ? "Creating..." : "Create farm"}
                </button>
                <button
                  type="button"
                  onClick={closeCreateFarm}
                  disabled={isSubmittingFarm}
                  className="rounded-xl border border-border/70 px-4 py-3 text-sm font-medium text-foreground transition hover:bg-accent disabled:opacity-60"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </main>
  )
}
