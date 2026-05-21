"use client"

import Image from "next/image"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { type FormEvent, useMemo, useState } from "react"
import { ArrowLeft, Eye, EyeOff } from "lucide-react"
import { useAuth } from "@/components/providers/auth-provider"
import { login } from "@/lib/api"
import { ONBOARDING_PATH, WORKSPACE_SELECT_PATH } from "@/lib/app-entry"
import { buildCreateWorkspaceHref, buildWorkspaceSelectHref, buildWorkspaceSetupHref } from "@/lib/auth"

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
        setFormError("This email has a pending AquaSmart invite. Open the latest invite email instead of creating a new account.")
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

  const inputClassName = (field: FieldName) =>
    `form-input${fieldErrors[field] ? " form-input-invalid" : ""}${field === "password" ? " form-input-password" : ""}`

  return (
    <div className="auth-page">
      <div className="auth-back-link">
        <Link href="/" aria-label="Back to home">
          <ArrowLeft size={16} />
        </Link>
      </div>

      <style jsx global>{`
        .auth-page,
        .auth-page * {
          box-sizing: border-box;
        }

        .auth-page {
          --auth-accent: var(--color-primary);
          --auth-accent-hover: var(--color-primary-hover);
          --auth-accent-soft: color-mix(in srgb, var(--color-primary) 16%, transparent);
          min-height: 100vh;
          font-family: var(--font-sans);
          color: var(--foreground);
          overflow: hidden;
          position: relative;
          background:
            linear-gradient(
              135deg,
              var(--brand-hero-from),
              var(--brand-hero-mid),
              var(--brand-hero-to)
            ),
            url("/Multi-region-aquaculture-scaled.webp") center / cover no-repeat;
        }

        .auth-page::before {
          content: "";
          position: absolute;
          inset: 0;
          background: linear-gradient(
            135deg,
            color-mix(in srgb, var(--color-primary) 42%, black),
            color-mix(in srgb, var(--color-primary) 12%, transparent) 46%,
            transparent 100%
          );
          pointer-events: none;
        }

        .auth-back-link {
          position: fixed;
          z-index: 2;
        }

        .auth-back-link {
          top: 1rem;
          left: 1rem;
        }

        .auth-back-link a {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 2.5rem;
          height: 2.5rem;
          border-radius: 0.75rem;
          border: 1px solid color-mix(in srgb, var(--card) 30%, transparent);
          background: color-mix(in srgb, var(--card) 22%, transparent);
          color: var(--card-foreground);
          backdrop-filter: blur(14px);
          transition: background 0.2s ease, border-color 0.2s ease, transform 0.2s ease;
        }

        .auth-back-link a:hover {
          background: color-mix(in srgb, var(--color-primary) 18%, transparent);
          border-color: color-mix(in srgb, var(--color-primary) 38%, transparent);
          transform: translateY(-1px);
        }

        .auth-shell {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 5rem 1rem 1.5rem;
          position: relative;
          z-index: 1;
        }

        .login-card {
          width: 100%;
          max-width: 28rem;
          border-radius: 24px;
          border: 1px solid color-mix(in srgb, var(--card) 70%, transparent);
          background: linear-gradient(
            135deg,
            color-mix(in srgb, var(--card) 82%, transparent),
            color-mix(in srgb, var(--card) 68%, transparent)
          );
          padding: 2rem 1.5rem;
          backdrop-filter: blur(18px);
          box-shadow: 0 24px 70px color-mix(in srgb, var(--chart-5) 18%, transparent);
        }

        .logo-header {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 1.25rem;
        }

        .logo-text {
          font-size: 1.6rem;
          font-weight: 800;
          letter-spacing: -0.6px;
          font-family: var(--font-serif);
        }

        .logo-text-aqua {
          color: var(--auth-accent);
        }

        .logo-text-smart {
          color: var(--auth-accent);
        }

        .login-header h1 {
          font-size: 1.1rem;
          font-weight: 800;
          color: var(--card-foreground);
        }

        .login-header p {
          margin-top: 0.45rem;
          margin-bottom: 1.5rem;
          color: color-mix(in srgb, var(--card-foreground) 76%, transparent);
          font-size: 0.95rem;
          line-height: 1.55;
        }

        .form-group {
          margin-bottom: 1rem;
        }

        .form-label {
          display: block;
          margin-bottom: 0.45rem;
          color: var(--card-foreground);
          font-size: 0.9rem;
          font-weight: 700;
        }

        .input-shell {
          position: relative;
        }

        .form-input {
          width: 100%;
          border-radius: 14px;
          border: 1px solid color-mix(in srgb, var(--border) 92%, transparent);
          background: color-mix(in srgb, var(--card) 74%, transparent);
          color: var(--card-foreground);
          padding: 0.92rem 1rem;
          font: inherit;
          transition: border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
          backdrop-filter: blur(10px);
        }

        .form-input::placeholder {
          color: color-mix(in srgb, var(--card-foreground) 54%, transparent);
        }

        .form-input:hover:not(:focus) {
          border-color: var(--auth-accent);
        }

        .form-input:focus {
          outline: none;
          border-color: var(--auth-accent);
          box-shadow: 0 0 0 4px color-mix(in srgb, var(--color-primary) 18%, transparent);
          background: color-mix(in srgb, var(--card) 92%, transparent);
        }

        .form-input-invalid {
          border-color: color-mix(in srgb, var(--destructive) 74%, white);
          box-shadow: 0 0 0 1px color-mix(in srgb, var(--destructive) 30%, transparent);
        }

        .form-input-invalid:focus {
          border-color: color-mix(in srgb, var(--destructive) 74%, white);
          box-shadow: 0 0 0 4px color-mix(in srgb, var(--destructive) 18%, transparent);
        }

        .form-input-password {
          padding-right: 3rem;
        }

        .password-toggle {
          position: absolute;
          top: 50%;
          right: 0.75rem;
          transform: translateY(-50%);
          border: none;
          background: transparent;
          color: color-mix(in srgb, var(--card-foreground) 74%, transparent);
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 2rem;
          height: 2rem;
        }

        .field-error,
        .form-error,
        .form-notice {
          margin-top: 0.45rem;
          font-size: 0.82rem;
          line-height: 1.45;
          color: var(--destructive);
        }

        .field-hint {
          margin-top: 0.45rem;
          font-size: 0.82rem;
          color: color-mix(in srgb, var(--card-foreground) 72%, transparent);
        }

        .form-error {
          margin-bottom: 1rem;
          border: 1px solid color-mix(in srgb, var(--destructive) 26%, transparent);
          background: color-mix(in srgb, var(--destructive) 8%, transparent);
          border-radius: 12px;
          padding: 0.85rem 0.95rem;
        }

        .form-notice {
          margin-bottom: 1rem;
          border: 1px solid color-mix(in srgb, var(--color-primary) 26%, transparent);
          background: color-mix(in srgb, var(--color-primary) 8%, transparent);
          border-radius: 12px;
          padding: 0.85rem 0.95rem;
          color: var(--card-foreground);
        }

        .submit-button {
          width: 100%;
          min-height: 3.125rem;
          margin-top: 0.4rem;
          border: none;
          border-radius: 12px;
          background: var(--auth-accent);
          color: var(--color-on-primary);
          font-size: 1rem;
          font-weight: 800;
          cursor: pointer;
          transition: transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
          box-shadow: 0 12px 28px color-mix(in srgb, var(--color-primary) 36%, transparent);
        }

        .submit-button:hover:not(:disabled) {
          background: var(--auth-accent-hover);
          transform: translateY(-2px);
          box-shadow: 0 18px 36px color-mix(in srgb, var(--color-primary) 42%, transparent);
        }

        .submit-button:disabled {
          cursor: not-allowed;
          opacity: 0.78;
          transform: none;
        }

        .button-content {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.55rem;
        }

        .button-spinner {
          width: 1rem;
          height: 1rem;
          border-radius: 999px;
          border: 2px solid color-mix(in srgb, var(--background) 28%, transparent);
          border-top-color: color-mix(in srgb, var(--background) 92%, transparent);
          animation: auth-spin 0.7s linear infinite;
        }

        @keyframes auth-spin {
          to {
            transform: rotate(360deg);
          }
        }

        .helper-row {
          margin-top: 1rem;
          text-align: center;
          font-size: 0.92rem;
          color: color-mix(in srgb, var(--card-foreground) 88%, transparent);
        }

        .secondary-link-row {
          margin-top: -0.35rem;
          margin-bottom: 1rem;
          text-align: right;
        }

        .secondary-link {
          color: var(--auth-accent);
          font-size: 0.88rem;
          font-weight: 700;
          text-decoration: underline;
          text-underline-offset: 2px;
        }

        .link-btn {
          border: none;
          background: transparent;
          color: var(--auth-accent);
          font: inherit;
          font-weight: 700;
          cursor: pointer;
          text-decoration: underline;
          text-underline-offset: 2px;
        }

        @media (max-width: 640px) {
          .auth-shell {
            padding: 4.75rem 0.9rem 1rem;
          }

          .login-card {
            padding: 1.5rem 1rem;
            border-radius: 20px;
          }
        }
      `}</style>

      <main className="auth-shell">
        <section className="login-card">
          <div className="login-header">
            <div className="logo-header">
              <Image src="/use this.png" alt="AquaSmart fish logo" width={36} height={36} priority />
              <span className="logo-text">
                <span className="logo-text-aqua">Aqua</span>
                <span className="logo-text-smart">Smart</span>
              </span>
            </div>
            <h1>{authMode === "signin" ? "Sign in to your dashboard" : "Create your AquaSmart account"}</h1>
            {isInviteContinuation ? (
              <p>
                If you arrived from an invite, open the latest AquaSmart invite email. The invite link sets up your
                session before you choose a password.
              </p>
            ) : null}
          </div>

          <form onSubmit={(event) => void handlePasswordAuth(event)} noValidate>
            {authMode === "signup" ? (
              <div className="form-group">
                <label htmlFor="fullName" className="form-label">
                  Full name
                </label>
                <div className="input-shell">
                  <input
                    id="fullName"
                    type="text"
                    className={inputClassName("fullName")}
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
                </div>
                {fieldErrors.fullName ? (
                  <div id="fullName-error" className="field-error" role="alert">
                    {fieldErrors.fullName}
                  </div>
                ) : null}
              </div>
            ) : null}

            <div className="form-group">
              <label htmlFor="email" className="form-label">
                Email
              </label>
              <div className="input-shell">
                <input
                  id="email"
                  type="email"
                  className={inputClassName("email")}
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
              </div>
              {fieldErrors.email ? (
                <div id="email-error" className="field-error" role="alert">
                  {fieldErrors.email}
                </div>
              ) : null}
            </div>

            <div className="form-group">
              <label htmlFor="password" className="form-label">
                Password
              </label>
              <div className="input-shell">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  className={inputClassName("password")}
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
                  className="password-toggle"
                  onClick={() => setShowPassword((current) => !current)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {fieldErrors.password ? (
                <div id="password-error" className="field-error" role="alert">
                  {fieldErrors.password}
                </div>
              ) : authMode === "signup" ? (
                <div id="password-hint" className="field-hint">
                  Use at least 8 characters.
                </div>
              ) : null}
            </div>

            {authMode === "signin" ? (
              <div className="secondary-link-row">
                <Link href="/forgot-password" className="secondary-link">
                  Forgot password?
                </Link>
              </div>
            ) : null}

            {formError ? (
              <div className="form-error" role="alert">
                {formError}
              </div>
            ) : null}

            {formNotice ? (
              <div className="form-notice" role="status">
                {formNotice}
              </div>
            ) : null}

            <button type="submit" className="submit-button" disabled={isSubmitting}>
              <span className="button-content">
                {isSubmitting ? <span className="button-spinner" aria-hidden="true" /> : null}
                <span>
                  {isSubmitting
                    ? authMode === "signin"
                      ? "Signing in..."
                      : "Creating account..."
                    : authMode === "signin"
                      ? "Sign In"
                      : "Create Account"}
                </span>
              </span>
            </button>
          </form>

          <div className="helper-row">
            {isInviteContinuation ? (
              <span>Need a fresh invite link? Ask your farm admin to resend the invitation.</span>
            ) : authMode === "signin" ? (
              <>
                New to AquaSmart?{" "}
                <button
                  type="button"
                  className="link-btn"
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
                  className="link-btn"
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
        </section>
      </main>
    </div>
  )
}
