"use client"

import { useMemo, useState } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { Loader2, ArrowLeft } from "lucide-react"
import { useAuth } from "@/components/providers/auth-provider"

const deriveOwnerName = (email?: string | null) => {
  const localPart = String(email ?? "").split("@")[0]?.trim()
  if (!localPart) return ""
  return localPart
    .split(/[._-]+/)
    .filter(Boolean)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(" ")
}

const inputCls =
  "w-full rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground"

export default function OnboardingPageClient() {
  const router = useRouter()
  const { user, signOut } = useAuth()

  const [farmName, setFarmName] = useState("")
  const [location, setLocation] = useState("")
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const ownerName = useMemo(() => deriveOwnerName(user?.email) || "there", [user?.email])
  const ownerEmail = user?.email ?? ""

  const handleSubmit = async () => {
    setErrorMsg(null)
    const name = farmName.trim()
    const loc  = location.trim()
    if (!name) { setErrorMsg("Farm name is required."); return }
    if (!loc)  { setErrorMsg("Location is required."); return }

    setIsSaving(true)
    try {
      const res = await fetch("/api/onboarding/bootstrap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          farmName: name,
          location: loc,
          owner: ownerName,
          email: ownerEmail,
        }),
      })
      const result = (await res.json()) as { error?: string; farmId?: string }
      if (!res.ok || !result.farmId) throw new Error(result.error || "Unable to create your farm workspace.")
      if (typeof window !== "undefined" && user?.id) {
        window.localStorage.setItem(`aquasmart:${user.id}:activeFarmId`, result.farmId)
        window.dispatchEvent(new CustomEvent("farm-updated", { detail: { farmId: result.farmId } }))
      }
      window.location.assign("/")
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong. Try again.")
      setIsSaving(false)
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(34,197,94,0.14),_transparent_40%)] px-4 py-10">
      {/* Header */}
      <div className="mb-8 flex w-full max-w-lg items-center justify-between">
        <button
          type="button"
          onClick={() => router.back()}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-border/70 bg-card/80">
            <Image src="/use this.png" alt="AquaSmart" width={18} height={18} />
          </div>
          <span className="text-sm font-semibold tracking-wide">AquaSmart</span>
        </div>
        <button
          type="button"
          onClick={async () => { await signOut(); router.replace("/auth") }}
          className="text-sm text-muted-foreground transition hover:text-foreground"
        >
          Sign out
        </button>
      </div>

      {/* Card */}
      <div className="w-full max-w-lg rounded-[1.75rem] border border-border/70 bg-card/95 p-8 shadow-[0_24px_60px_rgba(15,23,42,0.12)] backdrop-blur">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Create your farm</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Set up a new farm workspace. You will be assigned as admin and can invite your team after.
        </p>

        {errorMsg && (
          <div className="mt-5 rounded-xl border border-destructive/30 bg-destructive/8 px-4 py-3 text-sm font-medium text-destructive">
            {errorMsg}
          </div>
        )}

        <div className="mt-6 space-y-5">
          <label className="block space-y-2">
            <span className="text-sm font-medium text-foreground/90">Farm name <span className="text-destructive">*</span></span>
            <input
              type="text"
              value={farmName}
              onChange={(e) => setFarmName(e.target.value)}
              placeholder="e.g. Tanganyika Blue Farm"
              className={inputCls}
              autoFocus
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-foreground/90">Location <span className="text-destructive">*</span></span>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Kigoma, Tanzania"
              className={inputCls}
            />
          </label>

          {/* Read-only owner info */}
          <div className="rounded-xl border border-border/60 bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
            Signed in as <span className="font-medium text-foreground">{ownerEmail}</span> — you will be the farm admin.
          </div>
        </div>

        <button
          type="button"
          onClick={() => void handleSubmit()}
          disabled={isSaving}
          className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {isSaving ? "Creating farm..." : "Create Farm"}
        </button>
      </div>
    </main>
  )
}
