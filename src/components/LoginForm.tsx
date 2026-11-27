"use client"

import Image from "next/image"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { type FormEvent, type KeyboardEvent, useEffect, useMemo, useRef, useState } from "react"
import { useAuth } from "@/components/providers/auth-provider"
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button"
import { login } from "@/lib/api"
import { ONBOARDING_PATH, WORKSPACE_SELECT_PATH } from "@/lib/app-entry"
import { buildCreateWorkspaceHref, buildWorkspaceSelectHref, buildWorkspaceSetupHref } from "@/lib/auth"
import { cn } from "@/lib/utils"

type AuthMode = "signin" | "signup"

type FieldName = "fullName" | "email" | "password"

type FieldErrors = Partial<Record<FieldName, string>>

function validateEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function validateForm(mode: AuthMode, fields: { fullName: string; email: string; password: string }) {
  const errors: FieldErrors = {}

  if (mode === "signup" && fields.fullName.trim().length < 2) {
    errors.fullName = "Full name is required."
  }

  if (!fields.email.trim()) {
    errors.email = "Email is required."
  } else if (!validateEmail(fields.email.trim())) {
    errors.email = "Invalid email format."
  }

  if (!fields.password.trim()) {
    errors.password = "Password required."
  } else if (mode === "signup" && fields.password.length < 8) {
    errors.password = "Password must be at least 8 characters."
  }

  return errors
}

export default function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { signUpWithPassword } = useAuth()
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const isInviteContinuation = searchParams.get("next") === ONBOARDING_PATH
  const [authMode, setAuthMode] = useState<AuthMode>(
    !isInviteContinuation && searchParams.get("mode") === "signup" ? "signup" : "signin",
  )
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [formNotice, setFormNotice] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [credentialsRejected, setCredentialsRejected] = useState(false)
  const [capsLockOn, setCapsLockOn] = useState(false)
  const [videoPaused, setVideoPaused] = useState(true)
  const videoRef = useRef<HTMLVideoElement>(null)

  // The farm video starts on its still frame and only plays when the device
  // has not asked for reduced motion. Button state follows the video's own
  // play/pause events.
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    void videoRef.current?.play().catch(() => undefined)
  }, [])

  const toggleVideo = () => {
    const video = videoRef.current
    if (!video) return
    if (video.paused) void video.play().catch(() => undefined)
    else video.pause()
  }

  const trackCapsLock = (event: KeyboardEvent<HTMLInputElement>) => {
    setCapsLockOn(event.getModifierState("CapsLock"))
  }

  const selectHref = useMemo(
    () => buildWorkspaceSelectHref(searchParams.get("next")),
    [searchParams],
  )
  const setupHref = useMemo(
    () => buildWorkspaceSetupHref(searchParams.get("next")),
    [searchParams],
  )
  const createWorkspaceHref = useMemo(
    () => buildCreateWorkspaceHref(searchParams.get("next")),
    [searchParams],
  )

  const clearFieldError = (field: FieldName) => {
    setFieldErrors((current) => {
      if (!current[field]) {
        return current
      }

      const next = { ...current }
      delete next[field]
      return next
    })
  }

  const handleBlur = (field: FieldName) => {
    const nextErrors = validateForm(authMode, { fullName, email, password })
    setFieldErrors((current) => ({
      ...current,
      [field]: nextErrors[field],
    }))
  }

  const resolveLoginRedirect = (redirectTo: string) => {
    if (redirectTo === WORKSPACE_SELECT_PATH) {
      return selectHref
    }

    if (redirectTo === ONBOARDING_PATH) {
      return setupHref
    }

    return redirectTo
  }

  const handlePasswordAuth = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (isSubmitting) return

    const nextErrors = validateForm(authMode, { fullName, email, password })
    setFieldErrors(nextErrors)
    setFormError(null)
    setFormNotice(null)
    setCredentialsRejected(false)

    if (Object.keys(nextErrors).length > 0) {
      return
    }

    setIsSubmitting(true)

    try {
      if (authMode === "signin") {
        const result = await login(email.trim(), password)
        router.replace(resolveLoginRedirect(result.redirectTo))
        return
      }

      if (isInviteContinuation) {
        setFormError("This email has a pending platform invite. Open the latest invite email instead of creating a new account.")
        setIsSubmitting(false)
        return
      }

      const [firstName = "", ...lastNameParts] = fullName.trim().split(/\s+/)
      const result = await signUpWithPassword({
        firstName,
        lastName: lastNameParts.join(" "),
        email: email.trim(),
        password,
      })

      if (!result.hasSession) {
        setFormNotice("Account created. Check the user's email to confirm the account before signing in.")
        setAuthMode("signin")
        setPassword("")
        setIsSubmitting(false)
        return
      }

      router.replace(createWorkspaceHref)
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to continue."
      const rejected = /invalid login credentials/i.test(message)
      setCredentialsRejected(rejected)
      setFormError(
        rejected
          ? "The email or password is not right. Check them and try again. If this account was just created, confirm the email first or use the invite setup link."
          : /already registered|already exists/i.test(message)
            ? "This email already has an account. Sign in, use Forgot password, or ask an admin for a fresh setup link."
            : message,
      )
      setIsSubmitting(false)
    }
  }

  const fieldHasError = (field: FieldName) =>
    Boolean(fieldErrors[field]) || (credentialsRejected && (field === "email" || field === "password"))

  const fieldInputClass = (field: FieldName) =>
    cn(
      "h-12 w-full min-w-0 rounded-[4px] border border-[#6b7c88] bg-card px-3.5 text-base text-foreground outline-none transition placeholder:text-muted-foreground focus-visible:outline-[3px] focus-visible:outline-offset-1 focus-visible:outline-primary",
      field === "password" && "rounded-r-none border-r-0",
      fieldHasError(field) && "border-2 border-destructive-strong",
    )

  // A red bar beside each field in error, as in the sign-in error state.
  const fieldGroupClass = (field: FieldName) =>
    cn("flex flex-col gap-1.5", fieldHasError(field) && "border-l-4 border-destructive-strong pl-3.5")

  const switchMode = (mode: AuthMode) => {
    setAuthMode(mode)
    setFieldErrors({})
    setFormError(null)
    setCredentialsRejected(false)
  }

  return (
    <div className="grid min-h-svh bg-card font-sans text-foreground lg:grid-cols-[5fr_7fr]">
      <div className="flex min-w-0 flex-col">
        {/* Phones get a still frame from the farm video instead of the video itself. */}
        <div className="relative h-[120px] shrink-0 bg-[#0b3a63] lg:hidden">
          <Image src="/Multi-region-aquaculture-scaled.webp" alt="" fill sizes="100vw" className="object-cover" priority />
        </div>

        <main className="flex flex-1 flex-col px-5 py-6 sm:px-10 lg:px-14 lg:py-8">
          <div className="flex items-center justify-between gap-4">
            <Link href="/" className="flex items-center" aria-label="SUSTAIN Aquasmart home">
              <Image
                src="/sustain-aquasmart-wordmark.png"
                alt="SUSTAIN Aquasmart"
                width={1200}
                height={131}
                className="h-7 w-auto"
                priority
              />
            </Link>
            <Link href="/" className="whitespace-nowrap text-sm text-primary underline underline-offset-4 hover:text-[#0b3a63] sm:text-[15px]">
              Back to website
            </Link>
          </div>

          <div className="mx-auto flex w-full max-w-[400px] flex-1 flex-col justify-center py-8 lg:py-12">
            <h1 className="mb-2 font-[family-name:var(--font-heading)] text-[26px] font-bold leading-tight tracking-tight sm:text-[32px]">
              {authMode === "signin" ? "Sign in to Aquasmart" : "Create your account"}
            </h1>
            <p className="mb-6 text-base text-muted-foreground sm:mb-8">
              {isInviteContinuation
                ? "If you arrived from an invite, continue with Google using the invited email address, or open the latest invite email to set a password. Either way your assigned role is applied on first sign-in."
                : authMode === "signin"
                  ? "Record, approve and plan for your farm."
                  : "Set up your account, then create or join your farm workspace."}
            </p>

            {formError ? (
              <div role="alert" className="mb-6 rounded-[4px] border-[3px] border-destructive-strong px-[18px] py-4">
                <p className="mb-1.5 text-[17px] font-bold">There is a problem</p>
                <a href="#email" className="text-[15px] font-semibold text-destructive-strong underline underline-offset-2">
                  {formError}
                </a>
              </div>
            ) : null}

            {formNotice ? (
              <div className="mb-6 rounded-lg bg-accent px-5 py-4 text-[15px]" role="status">
                {formNotice}
              </div>
            ) : null}

            <form onSubmit={(event) => void handlePasswordAuth(event)} noValidate className="flex flex-col gap-5">
              {authMode === "signup" ? (
                <div className={fieldGroupClass("fullName")}>
                  <label htmlFor="fullName" className="text-[15px] font-semibold">
                    Full name
                  </label>
                  {fieldErrors.fullName ? (
                    <p id="fullName-error" className="text-sm font-semibold text-destructive-strong">
                      {fieldErrors.fullName}
                    </p>
                  ) : null}
                  <input
                    id="fullName"
                    type="text"
                    className={fieldInputClass("fullName")}
                    autoComplete="name"
                    aria-invalid={fieldHasError("fullName")}
                    aria-describedby={fieldErrors.fullName ? "fullName-error" : undefined}
                    value={fullName}
                    onBlur={() => handleBlur("fullName")}
                    onChange={(event) => {
                      setFullName(event.target.value)
                      clearFieldError("fullName")
                    }}
                  />
                </div>
              ) : null}

              <div className={fieldGroupClass("email")}>
                <label htmlFor="email" className="text-[15px] font-semibold">
                  Email address
                </label>
                {fieldErrors.email ? (
                  <p id="email-error" className="text-sm font-semibold text-destructive-strong">
                    {fieldErrors.email}
                  </p>
                ) : null}
                <input
                  id="email"
                  type="email"
                  className={fieldInputClass("email")}
                  autoComplete="email"
                  inputMode="email"
                  spellCheck={false}
                  aria-invalid={fieldHasError("email")}
                  aria-describedby={fieldErrors.email ? "email-error" : undefined}
                  value={email}
                  onBlur={() => handleBlur("email")}
                  onChange={(event) => {
                    setEmail(event.target.value)
                    clearFieldError("email")
                  }}
                />
              </div>

              <div className={fieldGroupClass("password")}>
                <div className="flex items-baseline justify-between gap-3">
                  <label htmlFor="password" className="text-[15px] font-semibold">
                    Password
                  </label>
                  {authMode === "signin" ? (
                    <Link href="/forgot-password" className="text-sm text-primary underline underline-offset-4 hover:text-[#0b3a63]">
                      Forgot your password?
                    </Link>
                  ) : null}
                </div>
                {fieldErrors.password ? (
                  <p id="password-error" className="text-sm font-semibold text-destructive-strong">
                    {fieldErrors.password}
                  </p>
                ) : null}
                <div className="flex">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    className={fieldInputClass("password")}
                    autoComplete={authMode === "signin" ? "current-password" : "new-password"}
                    aria-invalid={fieldHasError("password")}
                    aria-describedby={
                      [
                        fieldErrors.password ? "password-error" : null,
                        authMode === "signup" ? "password-hint" : null,
                        capsLockOn ? "password-caps" : null,
                      ]
                        .filter(Boolean)
                        .join(" ") || undefined
                    }
                    value={password}
                    onKeyDown={trackCapsLock}
                    onKeyUp={trackCapsLock}
                    onBlur={() => {
                      setCapsLockOn(false)
                      handleBlur("password")
                    }}
                    onChange={(event) => {
                      setPassword(event.target.value)
                      clearFieldError("password")
                    }}
                  />
                  <button
                    type="button"
                    className={cn(
                      "h-12 shrink-0 rounded-r-[4px] border border-[#6b7c88] bg-[#f7f8fa] px-4 text-sm font-semibold text-primary transition hover:bg-accent",
                      fieldHasError("password") && "border-2 border-destructive-strong",
                    )}
                    onClick={() => setShowPassword((current) => !current)}
                    aria-controls="password"
                    aria-pressed={showPassword}
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
                {authMode === "signup" ? (
                  <p id="password-hint" className="text-sm text-muted-foreground">
                    Use at least 8 characters.
                  </p>
                ) : null}
                {capsLockOn ? (
                  <p id="password-caps" className="text-sm text-muted-foreground" aria-live="polite">
                    Caps Lock is on
                  </p>
                ) : null}
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-[4px] bg-primary px-4 text-base font-semibold text-primary-foreground transition hover:bg-[#0b3a63] disabled:opacity-70"
              >
                {isSubmitting ? (
                  <span
                    className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground"
                    aria-hidden="true"
                  />
                ) : null}
                {isSubmitting
                  ? authMode === "signin"
                    ? "Signing in..."
                    : "Creating account..."
                  : authMode === "signin"
                    ? "Sign in"
                    : "Create account"}
              </button>
            </form>

            <div className="my-6 flex items-center gap-3 text-[13px] text-muted-foreground">
              <span className="h-px flex-1 bg-border" />
              or
              <span className="h-px flex-1 bg-border" />
            </div>

            <GoogleSignInButton
              nextPath={isInviteContinuation ? ONBOARDING_PATH : null}
              label={authMode === "signup" ? "Sign up with Google" : "Continue with Google"}
              className="flex h-12 w-full items-center justify-center gap-2.5 rounded-[4px] border border-[#6b7c88] bg-card px-4 text-[15px] font-semibold text-foreground transition hover:bg-accent disabled:opacity-70"
            />

            <p className="mt-7 text-[15px] text-muted-foreground">
              {isInviteContinuation ? (
                "Need a fresh invite link? Ask your farm admin to resend the invitation."
              ) : authMode === "signin" ? (
                <>
                  New to Aquasmart?{" "}
                  <button type="button" className="text-primary underline underline-offset-4" onClick={() => switchMode("signup")}>
                    Create your account
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{" "}
                  <button type="button" className="text-primary underline underline-offset-4" onClick={() => switchMode("signin")}>
                    Sign in instead
                  </button>
                </>
              )}
            </p>
          </div>

          <p className="text-[13px] text-muted-foreground">
            © 2026 SUSTAIN Switzerland GmbH ·{" "}
            <a href="mailto:info@samaki.fish" className="text-primary underline underline-offset-4">
              Help
            </a>
          </p>
        </main>
      </div>

      <aside className="hidden min-w-0 flex-col gap-7 bg-primary p-12 text-primary-foreground lg:flex">
        <div className="relative min-h-[360px] flex-1 overflow-hidden rounded-lg bg-[#0b3a63]">
          <video
            ref={videoRef}
            className="absolute inset-0 h-full w-full object-cover"
            loop
            muted
            playsInline
            poster="/Multi-region-aquaculture-scaled.webp"
            aria-hidden="true"
            onPlay={() => setVideoPaused(false)}
            onPause={() => setVideoPaused(true)}
          >
            <source src="/login-hero.mp4" type="video/mp4" />
          </video>
          <button
            type="button"
            onClick={toggleVideo}
            aria-label={videoPaused ? "Play background video" : "Pause background video"}
            className="absolute bottom-4 right-4 h-11 rounded-[4px] bg-card px-4 text-sm font-semibold text-primary transition hover:bg-accent"
          >
            {videoPaused ? "Play video" : "Pause video"}
          </button>
        </div>
        <div>
          <p className="mb-2 font-[family-name:var(--font-heading)] text-[22px] font-bold leading-snug">
            Every fish, every feed, every decision, on record.
          </p>
          <p className="text-[15px] text-[#c9daea]">Used every day at Tanganyika Blue, Kigoma, Tanzania.</p>
        </div>
      </aside>
    </div>
  )
}
