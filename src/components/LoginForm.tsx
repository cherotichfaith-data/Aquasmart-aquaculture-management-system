"use client"

import Image from "next/image"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { type FormEvent, useMemo, useState } from "react"
import { Eye, EyeOff } from "lucide-react"
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
      setFormError(
        /invalid login credentials/i.test(message)
          ? "Invalid email or password. If this account was just created, confirm the email first or use the invite setup link."
          : /already registered|already exists/i.test(message)
            ? "This email already has an account. Sign in, use Forgot password, or ask an admin for a fresh setup link."
            : message,
      )
      setIsSubmitting(false)
    }
  }

  const fieldInputClass = (field: FieldName) =>
    cn(
      "w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20",
      field === "password" && "pr-10",
      fieldErrors[field] && "border-destructive focus:border-destructive focus:ring-destructive/20",
    )

  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex justify-center gap-2 md:justify-start">
          <Link href="/" className="flex items-center gap-2 font-medium" aria-label="SUSTAIN Aquasmart home">
            <Image
              src="/sustain-aquasmart-wordmark.png"
              alt="SUSTAIN Aquasmart"
              width={1200}
              height={131}
              className="h-7 w-auto"
              priority
            />
          </Link>
        </div>

        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-sm">
            <form onSubmit={(event) => void handlePasswordAuth(event)} noValidate className="flex flex-col gap-6">
              <div className="flex flex-col items-center gap-1 text-center">
                <h1 className="text-2xl font-bold text-foreground">
                  {authMode === "signin" ? "Sign in to your dashboard" : "Create your account"}
                </h1>
                {isInviteContinuation ? (
                  <p className="text-sm text-balance text-muted-foreground">
                    If you arrived from an invite, continue with Google using the invited email address, or open
                    the latest invite email to set a password. Either way your assigned role is applied on first
                    sign-in.
                  </p>
                ) : null}
              </div>

              {authMode === "signup" ? (
                <div className="flex flex-col gap-2">
                  <label htmlFor="fullName" className="text-sm font-medium text-foreground">
                    Full name
                  </label>
                  <input
                    id="fullName"
                    type="text"
                    className={fieldInputClass("fullName")}
                    placeholder="Jane Otieno"
                    autoComplete="name"
                    aria-invalid={Boolean(fieldErrors.fullName)}
                    aria-describedby={fieldErrors.fullName ? "fullName-error" : undefined}
                    value={fullName}
                    onBlur={() => handleBlur("fullName")}
                    onChange={(event) => {
                      setFullName(event.target.value)
                      clearFieldError("fullName")
                    }}
                  />
                  {fieldErrors.fullName ? (
                    <p id="fullName-error" className="text-sm text-destructive" role="alert">
                      {fieldErrors.fullName}
                    </p>
                  ) : null}
                </div>
              ) : null}

              <div className="flex flex-col gap-2">
                <label htmlFor="email" className="text-sm font-medium text-foreground">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  className={fieldInputClass("email")}
                  placeholder="name@company.com"
                  autoComplete="email"
                  inputMode="email"
                  aria-invalid={Boolean(fieldErrors.email)}
                  aria-describedby={fieldErrors.email ? "email-error" : undefined}
                  value={email}
                  onBlur={() => handleBlur("email")}
                  onChange={(event) => {
                    setEmail(event.target.value)
                    clearFieldError("email")
                  }}
                />
                {fieldErrors.email ? (
                  <p id="email-error" className="text-sm text-destructive" role="alert">
                    {fieldErrors.email}
                  </p>
                ) : null}
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex items-center">
                  <label htmlFor="password" className="text-sm font-medium text-foreground">
                    Password
                  </label>
                  {authMode === "signin" ? (
                    <Link
                      href="/forgot-password"
                      className="ml-auto text-sm text-primary underline-offset-4 hover:underline"
                    >
                      Forgot password?
                    </Link>
                  ) : null}
                </div>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    className={fieldInputClass("password")}
                    autoComplete="off"
                    aria-invalid={Boolean(fieldErrors.password)}
                    aria-describedby={fieldErrors.password ? "password-error" : authMode === "signup" ? "password-hint" : undefined}
                    value={password}
                    onBlur={() => handleBlur("password")}
                    onChange={(event) => {
                      setPassword(event.target.value)
                      clearFieldError("password")
                    }}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground transition hover:text-foreground"
                    onClick={() => setShowPassword((current) => !current)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    title={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {fieldErrors.password ? (
                  <p id="password-error" className="text-sm text-destructive" role="alert">
                    {fieldErrors.password}
                  </p>
                ) : authMode === "signup" ? (
                  <p id="password-hint" className="text-sm text-muted-foreground">
                    Use at least 8 characters.
                  </p>
                ) : null}
              </div>

              {formError ? (
                <div
                  className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
                  role="alert"
                >
                  {formError}
                </div>
              ) : null}

              {formNotice ? (
                <div
                  className="rounded-md border border-primary/30 bg-primary/10 px-3 py-2 text-sm text-foreground"
                  role="status"
                >
                  {formNotice}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-70"
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
                    ? "Sign In"
                    : "Create Account"}
              </button>

              <div className="flex items-center gap-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <span className="h-px flex-1 bg-border" />
                or
                <span className="h-px flex-1 bg-border" />
              </div>

              <GoogleSignInButton
                nextPath={isInviteContinuation ? ONBOARDING_PATH : null}
                label={authMode === "signup" ? "Sign up with Google" : "Continue with Google"}
                className="flex w-full items-center justify-center gap-2.5 rounded-md border border-input bg-background px-4 py-2.5 text-sm font-medium text-foreground transition hover:bg-accent disabled:opacity-70"
              />

              <div className="text-center text-sm text-muted-foreground">
                {isInviteContinuation ? (
                  <span>Need a fresh invite link? Ask your farm admin to resend the invitation.</span>
                ) : authMode === "signin" ? (
                  <>
                    New here?{" "}
                    <button
                      type="button"
                      className="font-medium text-primary underline underline-offset-4"
                      onClick={() => {
                        setAuthMode("signup")
                        setFieldErrors({})
                        setFormError(null)
                      }}
                    >
                      Create your account
                    </button>
                  </>
                ) : (
                  <>
                    Already have an account?{" "}
                    <button
                      type="button"
                      className="font-medium text-primary underline underline-offset-4"
                      onClick={() => {
                        setAuthMode("signin")
                        setFieldErrors({})
                        setFormError(null)
                      }}
                    >
                      Sign in instead
                    </button>
                  </>
                )}
              </div>
            </form>
          </div>
        </div>
      </div>

      <div className="relative hidden bg-muted lg:block">
        <video
          className="absolute inset-0 h-full w-full object-cover"
          autoPlay
          loop
          muted
          playsInline
          poster="/Multi-region-aquaculture-scaled.webp"
        >
          <source src="/login-hero.mp4" type="video/mp4" />
        </video>
      </div>
    </div>
  )
}
