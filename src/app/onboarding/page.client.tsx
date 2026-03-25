"use client"

import { useEffect, useMemo, useState } from "react"
import { Loader2 } from "lucide-react"
import { useAuth } from "@/components/providers/auth-provider"
import { DEFAULT_SETTINGS, formatError, type SettingsFormState } from "@/app/settings/settings-utils"

const deriveOwnerName = (email?: string | null) => {
  const localPart = String(email ?? "").split("@")[0]?.trim()
  if (!localPart) return ""

  return localPart
    .split(/[._-]+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ")
}

const buildInitialSettings = (email?: string | null): SettingsFormState => ({
  ...DEFAULT_SETTINGS,
  farmName: "",
  location: "",
  owner: deriveOwnerName(email) || "",
  email: email ?? "",
  phone: "",
  role: "admin",
})

export default function OnboardingPageClient() {
  const { user } = useAuth()
  const [settings, setSettings] = useState<SettingsFormState>(() => buildInitialSettings())
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const welcomeName = useMemo(() => deriveOwnerName(user?.email) || "there", [user?.email])

  useEffect(() => {
    setSettings((prev) => ({
      ...prev,
      owner: prev.owner.trim() ? prev.owner : deriveOwnerName(user?.email),
      email: prev.email.trim() ? prev.email : (user?.email ?? ""),
    }))
  }, [user?.email])

  const handleChange = (field: keyof SettingsFormState, value: string | number) => {
    setSettings((prev) => ({ ...prev, [field]: value as never }))
  }

  const handleSubmit = async () => {
    setIsSaving(true)
    setErrorMsg(null)

    try {
      const response = await fetch("/api/onboarding/bootstrap", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          farmName: settings.farmName,
          location: settings.location,
          owner: settings.owner,
          email: settings.email,
          phone: settings.phone,
          lowDoThreshold: settings.lowDoThreshold,
          highAmmoniaThreshold: settings.highAmmoniaThreshold,
          highMortalityThreshold: settings.highMortalityThreshold,
          lowFeedingRateThreshold: settings.lowFeedingRateThreshold,
          highFeedingRateThreshold: settings.highFeedingRateThreshold,
        }),
      })

      const result = (await response.json()) as {
        error?: string
        farmId?: string
      }

      if (!response.ok || !result.farmId) {
        throw new Error(result.error || "Unable to create your farm workspace.")
      }

      if (typeof window !== "undefined" && user?.id) {
        window.localStorage.setItem(`aquasmart:${user.id}:activeFarmId`, result.farmId)
        window.dispatchEvent(new CustomEvent("farm-updated", { detail: { farmId: result.farmId } }))
      }

      window.location.assign("/")
    } catch (error) {
      setErrorMsg(formatError(error))
      setIsSaving(false)
      return
    }
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(34,197,94,0.18),_transparent_35%),linear-gradient(180deg,_hsl(var(--background)),_color-mix(in_srgb,_hsl(var(--background))_88%,_white))] px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 lg:flex-row">
        <section className="lg:w-[38%]">
          <div className="rounded-[2rem] border border-border/70 bg-card/85 p-8 shadow-[0_30px_80px_rgba(15,23,42,0.12)] backdrop-blur">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primary/80">Workspace Setup</p>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-foreground">
              Build your first farm workspace
            </h1>
            <p className="mt-4 text-base leading-7 text-muted-foreground">
              {welcomeName}, this creates your tenant, assigns you as the first admin, and applies the default alert thresholds so the operational screens are usable immediately.
            </p>

            <div className="mt-8 space-y-4 rounded-[1.5rem] border border-border/60 bg-background/70 p-5">
              <div>
                <p className="text-sm font-semibold text-foreground">What happens next</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  After setup you can add systems, batches, feed references, and start capturing live farm data.
                </p>
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Account role</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  The first user becomes the farm admin automatically. Team invites can be added later.
                </p>
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Baseline thresholds</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  These defaults seed water-quality, feeding-rate, and mortality alerts. You can refine them in Settings after onboarding.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="lg:flex-1">
          <div className="rounded-[2rem] border border-border/70 bg-card/92 p-6 shadow-[0_30px_80px_rgba(15,23,42,0.12)] backdrop-blur sm:p-8">
            <div className="mb-8">
              <h2 className="text-2xl font-semibold tracking-tight text-foreground">Farm details</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Enter the minimum information required to provision a clean, isolated farm workspace.
              </p>
            </div>

            {errorMsg ? (
              <div className="mb-6 rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
                {errorMsg}
              </div>
            ) : null}

            <div className="grid gap-5 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm font-medium text-foreground/90">Farm name</span>
                <input
                  type="text"
                  value={settings.farmName}
                  onChange={(event) => handleChange("farmName", event.target.value)}
                  placeholder="e.g. Lake Harvest Farm"
                  className="w-full rounded-xl border border-input bg-background px-4 py-3 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-foreground/90">Location</span>
                <input
                  type="text"
                  value={settings.location}
                  onChange={(event) => handleChange("location", event.target.value)}
                  placeholder="e.g. Kisumu, Kenya"
                  className="w-full rounded-xl border border-input bg-background px-4 py-3 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-foreground/90">Owner name</span>
                <input
                  type="text"
                  value={settings.owner}
                  onChange={(event) => handleChange("owner", event.target.value)}
                  placeholder="e.g. Jane Otieno"
                  className="w-full rounded-xl border border-input bg-background px-4 py-3 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-foreground/90">Contact email</span>
                <input
                  type="email"
                  value={settings.email}
                  onChange={(event) => handleChange("email", event.target.value)}
                  placeholder="e.g. ops@farm.com"
                  className="w-full rounded-xl border border-input bg-background px-4 py-3 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </label>

              <label className="space-y-2 md:col-span-2">
                <span className="text-sm font-medium text-foreground/90">Phone</span>
                <input
                  type="tel"
                  value={settings.phone}
                  onChange={(event) => handleChange("phone", event.target.value)}
                  placeholder="Optional"
                  className="w-full rounded-xl border border-input bg-background px-4 py-3 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </label>
            </div>

            <div className="mt-10">
              <h3 className="text-lg font-semibold text-foreground">Default alerts</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                These become the first farm-level thresholds and can be tuned later from Settings.
              </p>
            </div>

            <div className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              <label className="space-y-2">
                <span className="text-sm font-medium text-foreground/90">Low DO alert (mg/L)</span>
                <input
                  type="number"
                  step="0.1"
                  value={settings.lowDoThreshold}
                  onChange={(event) => handleChange("lowDoThreshold", Number.parseFloat(event.target.value || "0"))}
                  className="w-full rounded-xl border border-input bg-background px-4 py-3 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-foreground/90">High ammonia alert (mg/L)</span>
                <input
                  type="number"
                  step="0.01"
                  value={settings.highAmmoniaThreshold}
                  onChange={(event) => handleChange("highAmmoniaThreshold", Number.parseFloat(event.target.value || "0"))}
                  className="w-full rounded-xl border border-input bg-background px-4 py-3 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-foreground/90">High mortality alert (%/day)</span>
                <input
                  type="number"
                  step="0.1"
                  value={settings.highMortalityThreshold}
                  onChange={(event) => handleChange("highMortalityThreshold", Number.parseFloat(event.target.value || "0"))}
                  className="w-full rounded-xl border border-input bg-background px-4 py-3 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-foreground/90">Low feeding-rate alert (kg/t)</span>
                <input
                  type="number"
                  step="0.1"
                  value={settings.lowFeedingRateThreshold}
                  onChange={(event) => handleChange("lowFeedingRateThreshold", Number.parseFloat(event.target.value || "0"))}
                  className="w-full rounded-xl border border-input bg-background px-4 py-3 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-foreground/90">High feeding-rate alert (kg/t)</span>
                <input
                  type="number"
                  step="0.1"
                  value={settings.highFeedingRateThreshold}
                  onChange={(event) => handleChange("highFeedingRateThreshold", Number.parseFloat(event.target.value || "0"))}
                  className="w-full rounded-xl border border-input bg-background px-4 py-3 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </label>
            </div>

            <div className="mt-10 flex flex-col gap-3 border-t border-border/70 pt-6 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">
                This action creates your farm workspace and assigns this account as the first admin.
              </p>
              <button
                type="button"
                onClick={() => void handleSubmit()}
                disabled={isSaving}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {isSaving ? "Creating workspace..." : "Create Farm Workspace"}
              </button>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
