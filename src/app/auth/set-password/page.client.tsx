"use client"

import Image from "next/image"
import Link from "next/link"
import { type FormEvent, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Eye, EyeOff } from "lucide-react"
import { sanitizeNextPath } from "@/lib/app-entry"
import { supabaseBrowser } from "@/lib/supabase/client"
import { completeAccountSetupAction } from "./actions.server"

const inputClass =
  "w-full rounded-[14px] border border-[color:color-mix(in_srgb,var(--border)_92%,transparent)] bg-[color:color-mix(in_srgb,var(--card)_74%,transparent)] px-3 py-3 text-sm text-card-foreground outline-none backdrop-blur-[10px] transition placeholder:text-[color:color-mix(in_srgb,var(--card-foreground)_56%,transparent)] focus:border-primary focus:bg-[color:color-mix(in_srgb,var(--card)_92%,transparent)] focus:ring-2 focus:ring-primary/20"

export default function SetPasswordPageClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = supabaseBrowser()
  const nextPath = sanitizeNextPath(searchParams.get("next"), "/onboarding")
  const [email, setEmail] = useState("")
  const [fullName, setFullName] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const loadUser = async () => {
      const hashParams = typeof window !== "undefined" ? new URLSearchParams(window.location.hash.replace(/^#/, "")) : null
      const accessToken = hashParams?.get("access_token")
      const refreshToken = hashParams?.get("refresh_token")

      if (accessToken && refreshToken) {
        await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        })
        window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`)
      }

      let { data, error } = await supabase.auth.getUser()
      if (!data.user) {
        await new Promise((resolve) => window.setTimeout(resolve, 300))
        const retry = await supabase.auth.getUser()
        data = retry.data
        error = retry.error
      }
      if (cancelled) return

      if (error || !data.user) {
        setErrorMessage("Open the latest invitation email again. The invite session was not available in this browser.")
        setIsLoading(false)
        return
      }

      const metadata = data.user.user_metadata ?? {}
      const existingName =
        typeof metadata.full_name === "string"
          ? metadata.full_name
          : typeof metadata.name === "string"
            ? metadata.name
            : ""

      setEmail(data.user.email ?? "")
      setFullName(existingName)
      setIsLoading(false)
    }

    void loadUser()

    return () => {
      cancelled = true
    }
  }, [supabase])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (isSubmitting) return

    const trimmedName = fullName.trim()
    if (trimmedName.length < 2) {
      setErrorMessage("Enter the user's full name.")
      return
    }

    if (password.length < 8) {
      setErrorMessage("Password must be at least 8 characters.")
      return
    }

    setIsSubmitting(true)
    setErrorMessage(null)

    const { error } = await supabase.auth.updateUser({
      password,
      data: {
        full_name: trimmedName,
        name: trimmedName,
        password_configured: true,
      },
    })

    if (error) {
      setErrorMessage(error.message)
      setIsSubmitting(false)
      return
    }

    const { data: sessionData } = await supabase.auth.getSession()

    try {
      await completeAccountSetupAction({
        fullName: trimmedName,
        accessToken: sessionData.session?.access_token,
      })
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to save the user's profile.")
      setIsSubmitting(false)
      return
    }

    router.replace(nextPath)
  }

  return (
    <main
      className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10"
      style={{
        backgroundImage:
          'linear-gradient(135deg, var(--brand-hero-from), var(--brand-hero-mid), var(--brand-hero-to)), url("/Multi-region-aquaculture-scaled.webp")',
        backgroundPosition: "center",
        backgroundSize: "cover",
      }}
    >
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,color-mix(in_srgb,var(--background)_12%,transparent),color-mix(in_srgb,var(--brand-panel-shell-from)_32%,transparent))]" />
      <section className="relative z-10 w-full max-w-md rounded-[24px] border border-[color:color-mix(in_srgb,var(--card)_70%,transparent)] bg-[linear-gradient(135deg,color-mix(in_srgb,var(--card)_82%,transparent),color-mix(in_srgb,var(--card)_68%,transparent))] p-6 shadow-[0_24px_70px_color-mix(in_srgb,var(--chart-5)_18%,transparent)] backdrop-blur-[18px]">
        <div className="flex items-center gap-3">
          <Image src="/use this.png" alt="AquaSmart logo" width={36} height={36} className="h-9 w-9" priority />
          <div>
            <div className="font-serif text-[1.45rem] font-extrabold tracking-[-0.04em]">
              <span className="text-[var(--secondary)]">Aqua</span>
              <span className="text-primary">Smart</span>
            </div>
            <h1 className="text-xl font-semibold tracking-tight text-card-foreground">Complete account setup</h1>
          </div>
        </div>

        <p className="mt-3 text-sm text-[color:color-mix(in_srgb,var(--card-foreground)_76%,transparent)]">
          {email ? `Signed in as ${email}.` : "Confirm your name and set a password for future sign-ins."}
        </p>

        {isLoading ? (
          <div className="mt-5 rounded-[12px] border border-[color:color-mix(in_srgb,var(--card)_70%,transparent)] bg-[color:color-mix(in_srgb,var(--card)_52%,transparent)] px-3 py-2 text-sm text-[color:color-mix(in_srgb,var(--card-foreground)_78%,transparent)]">
            Loading account...
          </div>
        ) : (
          <form onSubmit={(event) => void handleSubmit(event)} className="mt-5 space-y-4">
            <label className="block space-y-2">
              <span className="text-sm font-medium text-card-foreground">Full name</span>
              <input
                type="text"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                autoComplete="name"
                placeholder="Jane Otieno"
                className={inputClass}
              />
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-medium text-card-foreground">Password</span>
              <span className="relative block">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="new-password"
                  className={`${inputClass} pr-11`}
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center text-muted-foreground"
                  onClick={() => setShowPassword((current) => !current)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </span>
            </label>

            {errorMessage ? (
              <div className="rounded-[12px] border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {errorMessage}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-[12px] bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-[0_12px_28px_color-mix(in_srgb,var(--primary)_40%,transparent)] transition hover:-translate-y-0.5 hover:bg-primary/90 hover:shadow-[0_18px_36px_color-mix(in_srgb,var(--primary)_45%,transparent)] disabled:opacity-70"
            >
              {isSubmitting ? "Saving..." : "Save and continue"}
            </button>
          </form>
        )}

        <p className="mt-5 text-center text-sm text-[color:color-mix(in_srgb,var(--card-foreground)_88%,transparent)]">
          <Link href="/auth" className="font-medium text-primary hover:underline">
            Back to Sign In
          </Link>
        </p>
      </section>
    </main>
  )
}
