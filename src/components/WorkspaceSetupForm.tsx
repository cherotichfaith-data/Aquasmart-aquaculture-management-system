"use client"

import { type FormEvent, useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { OnboardingShell } from "@/components/onboarding/onboarding-shell"
import { useAuth } from "@/components/providers/auth-provider"
import { ONBOARDING_PATH, WORKSPACE_SELECT_PATH, sanitizeNextPath } from "@/lib/app-entry"
import { selectWorkspace } from "@/lib/api"
import { setBrowserWorkspaceContext } from "@/lib/context"
import { createWorkspaceClientSide, fetchOrganizationsForUser } from "@/lib/workspace-client"

const inputCls =
  "w-full rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground"

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

export default function WorkspaceSetupForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, refreshProfile } = useAuth()
  const nextPath = sanitizeNextPath(searchParams.get("next"), "/dashboard")
  const [organizationName, setOrganizationName] = useState("")
  const [farmName, setFarmName] = useState("")
  const [location, setLocation] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const fallbackOrganizationName = useMemo(() => {
    const metadata = user?.user_metadata ?? {}
    return (
      [metadata.organization_name, metadata.full_name, metadata.name, user?.email]
        .find((value): value is string => typeof value === "string" && value.trim().length > 0)
        ?.trim() ?? "AquaSmart Organization"
    )
  }, [user?.email, user?.user_metadata])

  useEffect(() => {
    setOrganizationName((current) => (current.trim().length > 0 ? current : fallbackOrganizationName))
  }, [fallbackOrganizationName])

  useEffect(() => {
    let active = true

    fetchOrganizationsForUser()
      .then((organizations) => {
        if (!active) return
        if (organizations.length > 0) {
          router.replace(`${WORKSPACE_SELECT_PATH}?next=${encodeURIComponent(nextPath)}`)
          return
        }
        setOrganizationName((current) => (current.trim().length > 0 ? current : fallbackOrganizationName))
      })
      .catch((error) => {
        if (!active) return
        const message = error instanceof Error ? error.message : "Unable to load workspace context."
        if (/unauthorized|not authenticated/i.test(message)) {
          router.replace(`/auth?next=${encodeURIComponent(ONBOARDING_PATH)}`)
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
  }, [fallbackOrganizationName, nextPath, router])

  const continueToWorkspace = (nextOrganizationId: string, nextFarmId: string) => {
    if (typeof window !== "undefined" && user?.id) {
      window.localStorage.setItem(getActiveFarmStorageKey(user.id), nextFarmId)
      setBrowserWorkspaceContext({ organizationId: nextOrganizationId, farmId: nextFarmId })
      window.dispatchEvent(new CustomEvent("farm-updated", { detail: { farmId: nextFarmId } }))
      window.dispatchEvent(new Event("farm-memberships-updated"))
    }

    router.replace(buildWorkspaceDestination(nextPath))
  }

  const handleCreateWorkspace = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (isSaving) return
    setErrorMessage(null)

    if (!organizationName.trim()) {
      setErrorMessage("Organization name is required.")
      return
    }

    if (!farmName.trim() || !location.trim()) {
      setErrorMessage("Farm name and location are required.")
      return
    }

    setIsSaving(true)

    try {
      const result = await createWorkspaceClientSide({
        organizationName: organizationName.trim(),
        farmName: farmName.trim(),
        location: location.trim(),
      })

      await selectWorkspace(result.organizationId, result.farmId)
      await refreshProfile()
      continueToWorkspace(result.organizationId, result.farmId)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to create workspace.")
      setIsSaving(false)
    }
  }

  return (
    <OnboardingShell
      title="Create your workspace"
      description="Set up a new organization and its first farm workspace to finish onboarding."
    >
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
        {errorMessage ? (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {errorMessage}
          </div>
        ) : null}

        <section className="rounded-2xl border border-border/80 bg-card p-4 shadow-sm">
          <form onSubmit={(event) => void handleCreateWorkspace(event)} className="space-y-3.5">
            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-foreground">Organization name</span>
              <input
                type="text"
                value={organizationName}
                onChange={(event) => setOrganizationName(event.target.value)}
                placeholder="Aqua"
                className={inputCls}
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-foreground">Farm name</span>
              <input
                type="text"
                value={farmName}
                onChange={(event) => setFarmName(event.target.value)}
                placeholder="A1"
                className={inputCls}
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-foreground">Location</span>
              <input
                type="text"
                value={location}
                onChange={(event) => setLocation(event.target.value)}
                placeholder="County, region, or site"
                className={inputCls}
              />
            </label>
            <button
              type="submit"
              disabled={isSaving || isLoading}
              className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
            >
              {isSaving ? "Creating workspace..." : "Create organization and continue"}
            </button>
          </form>
        </section>
      </div>
    </OnboardingShell>
  )
}
