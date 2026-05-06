"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { OnboardingShell } from "@/components/onboarding/onboarding-shell"
import { useAuth } from "@/components/providers/auth-provider"
import {
  ONBOARDING_CREATE_WORKSPACE_PATH,
  WORKSPACE_SELECT_PATH,
  sanitizeNextPath,
} from "@/lib/app-entry"
import { getFarmsByOrganization, getOrganizations, selectWorkspace } from "@/lib/api"
import { setBrowserWorkspaceContext, type FarmSummary, type OrganizationSummary } from "@/lib/context"

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
  const { user } = useAuth()
  const nextPath = sanitizeNextPath(searchParams.get("next"), "/dashboard")
  const [organizations, setOrganizations] = useState<OrganizationSummary[]>(initialOrganizations)
  const [selectedOrganizationId, setSelectedOrganizationId] = useState<string | null>(null)
  const [selectedFarmId, setSelectedFarmId] = useState<string | null>(null)
  const [farms, setFarms] = useState<FarmSummary[]>([])
  const [isLoading, setIsLoading] = useState(initialOrganizations.length === 0)
  const [isLoadingFarms, setIsLoadingFarms] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

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

  const handleContinue = async () => {
    if (!selectedOrganizationId || !selectedFarmId) {
      setErrorMessage("Select an organization and farm to continue.")
      return
    }
    setIsSaving(true)
    setErrorMessage(null)
    try {
      await selectWorkspace(selectedOrganizationId, selectedFarmId)
      continueToWorkspace(selectedOrganizationId, selectedFarmId)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to select workspace context.")
      setIsSaving(false)
    }
  }

  return (
    <OnboardingShell
      title="Select your workspace"
      description="Choose the organization and farm you want to work in for this session."
    >
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-5">
        {errorMessage ? (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {errorMessage}
          </div>
        ) : null}

        <section className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">1. Organization</p>
            <div className="mt-3 space-y-2.5">
              {isLoading ? (
                <div className="rounded-xl border border-border/70 bg-background px-4 py-4 text-sm text-muted-foreground">
                  Loading organizations...
                </div>
              ) : organizations.length > 0 ? (
                organizations.map((organization) => (
                  <button
                    key={organization.id}
                    type="button"
                    onClick={() => void handleOrganizationSelect(organization.id)}
                    className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition ${
                      selectedOrganizationId === organization.id
                        ? "border-primary bg-primary/5"
                        : "border-border/70 bg-background hover:bg-accent/60"
                    }`}
                  >
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                      {organization.name.charAt(0).toUpperCase()}
                    </span>
                    <span>
                      <span className="block font-semibold text-foreground">{organization.name}</span>
                      <span className="block text-sm text-muted-foreground">Organization</span>
                    </span>
                  </button>
                ))
              ) : (
                <div className="rounded-xl border border-border/70 bg-background px-4 py-4">
                  <p className="text-sm text-muted-foreground">No organizations available for this account.</p>
                  <button
                    type="button"
                    onClick={() => router.push(`${ONBOARDING_CREATE_WORKSPACE_PATH}?next=${encodeURIComponent(nextPath)}`)}
                    className="mt-3 inline-flex rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
                  >
                    Create workspace
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">2. Farm</p>
            <div className="mt-3 space-y-2.5">
              {!selectedOrganizationId ? (
                <div className="rounded-xl border border-border/70 bg-background px-4 py-4 text-sm text-muted-foreground">
                  Select an organization to view its farms.
                </div>
              ) : isLoadingFarms ? (
                <div className="rounded-xl border border-border/70 bg-background px-4 py-4 text-sm text-muted-foreground">
                  Loading farms...
                </div>
              ) : farms.length === 0 ? (
                <div className="rounded-xl border border-border/70 bg-background px-4 py-4">
                  <p className="text-sm text-muted-foreground">No farms found for the selected organization.</p>
                  <button
                    type="button"
                    onClick={() => router.push(`${ONBOARDING_CREATE_WORKSPACE_PATH}?next=${encodeURIComponent(nextPath)}`)}
                    className="mt-3 inline-flex rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
                  >
                    Create workspace
                  </button>
                </div>
              ) : (
                farms.map((farm) => (
                  <button
                    key={farm.id}
                    type="button"
                    onClick={() => setSelectedFarmId(farm.id)}
                    className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition ${
                      selectedFarmId === farm.id
                        ? "border-primary bg-primary/5"
                        : "border-border/70 bg-background hover:bg-accent/60"
                    }`}
                  >
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-sm font-semibold text-foreground">
                      {farm.name.charAt(0).toUpperCase()}
                    </span>
                    <span>
                      <span className="block font-semibold text-foreground">{farm.name}</span>
                      <span className="block text-sm text-muted-foreground">{farm.location ?? "No location set"}</span>
                    </span>
                  </button>
                ))
              )}
            </div>

            <button
              type="button"
              onClick={() => void handleContinue()}
              disabled={!selectedOrganizationId || !selectedFarmId || isLoading || isLoadingFarms || isSaving}
              className="mt-4 w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSaving ? "Saving..." : "Continue"}
            </button>
          </div>
        </section>
      </div>
    </OnboardingShell>
  )
}
