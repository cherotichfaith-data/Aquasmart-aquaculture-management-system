"use client"

import Link from "next/link"
import Image from "next/image"
import { useRouter, useSearchParams } from "next/navigation"
import { Suspense, useRef, useState } from "react"
import { ThemeToggle } from "@/components/theme-toggle"
import { claimFarmMembershipsByEmail } from "@/lib/auth/claim-farm-memberships"
import { createClient } from "@/lib/supabase/client"

function AuthPageContent() {
  const supabase = createClient()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [authMode, setAuthMode] = useState<"signin" | "signup">(
    searchParams.get("mode") === "signup" ? "signup" : "signin"
  )
  const [loadingButton, setLoadingButton] = useState<"continue" | null>(null)
  const [toasts, setToasts] = useState<
    Array<{ id: number; title?: string; description?: string; variant?: "success" | "error" | "warning" }>
  >([])
  const isLoading = loadingButton !== null
  const toastId = useRef(0)

  const addToast = (toast: { title?: string; description?: string; variant?: "success" | "error" | "warning" }) => {
    toastId.current += 1
    const id = toastId.current
    setToasts((prev) => [...prev, { id, ...toast }])
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((item) => item.id !== id))
    }, 5000)
  }

  const validateEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
  const validateFullName = (value: string) => value.trim().length >= 2
  const validatePassword = (value: string) => value.length >= 8
  const withTimeout = async <T,>(promise: Promise<T>, ms = 15000): Promise<T> => {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        window.setTimeout(() => reject(new Error("Request timed out. Please try again.")), ms)
      }),
    ])
  }

  const handlePasswordAuth = async () => {
    if (isLoading) return
    const trimmedFullName = fullName.trim()
    const trimmedEmail = email.trim()
    const trimmedPassword = password.trim()

    if (authMode === "signup" && !validateFullName(trimmedFullName)) {
      addToast({ title: "Full name required", description: "Enter your full name to create your account.", variant: "warning" })
      return
    }

    if (!validateEmail(trimmedEmail)) {
      addToast({ title: "Invalid Email", description: "Please enter a valid email address.", variant: "error" })
      return
    }

    if (authMode === "signup" && !validatePassword(trimmedPassword)) {
      addToast({
        title: "Weak Password",
        description: "Password must be at least 8 characters.",
        variant: "warning",
      })
      return
    }

    setLoadingButton("continue")
    try {
      if (!navigator.onLine) {
        addToast({ title: "Offline", description: "Check your connection and try again.", variant: "warning" })
        return
      }

      if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        addToast({
          title: "Supabase not configured",
          description: "Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
          variant: "error",
        })
        return
      }

      if (authMode === "signin") {
        const { data, error } = await withTimeout(
          supabase.auth.signInWithPassword({
            email: trimmedEmail,
            password: trimmedPassword,
          }),
        )
        if (error) {
          addToast({ title: "Sign in failed", description: error.message, variant: "error" })
          return
        }

        if (data.session) {
          await claimFarmMembershipsByEmail(supabase)
        }

        addToast({ title: "Signed in", description: "Redirecting to your workspace.", variant: "success" })
        // Full reload so React Query cache re-initialises with the authenticated session
        window.location.assign("/")
        return
      }

      const baseUrl =
        process.env.NEXT_PUBLIC_SITE_URL ??
        process.env.NEXT_PUBLIC_APP_URL ??
        window.location.origin
      const redirectTo = `${baseUrl}/auth/callback?next=/`
      const { data, error } = await withTimeout(
        supabase.auth.signUp({
          email: trimmedEmail,
          password: trimmedPassword,
          options: {
            emailRedirectTo: redirectTo,
            data: {
              full_name: trimmedFullName,
              name: trimmedFullName,
            },
          },
        }),
      )
      if (error) {
        addToast({ title: "Sign up failed", description: error.message, variant: "error" })
        return
      }

      if (data.session) {
        await claimFarmMembershipsByEmail(supabase)
        addToast({
          title: "Account created",
          description: "You are signed in and will be redirected.",
          variant: "success",
        })
        window.location.assign("/")
        return
      }

      const identities = data.user?.identities ?? []
      if (identities.length === 0) {
        addToast({
          title: "Account already exists",
          description: "This email is already registered. Sign in instead.",
          variant: "warning",
        })
        setAuthMode("signin")
        return
      }

      addToast({
        title: "Confirm your email",
        description: "Check inbox/spam for the confirmation email.",
        variant: "success",
      })
      router.replace(`/auth/check-email?email=${encodeURIComponent(trimmedEmail)}`)
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Try again."
      addToast({ title: "Unexpected Error", description: errorMessage, variant: "error" })
    } finally {
      setLoadingButton(null)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-theme-toggle">
        <ThemeToggle />
      </div>
      <style jsx global>{`
        .auth-page,
        .auth-page * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }

        .auth-page {
          font-family: var(--font-sans);
          min-height: 100vh;
          overflow: hidden;
          background:
            linear-gradient(
              135deg,
              var(--brand-hero-from),
              var(--brand-hero-mid),
              var(--brand-hero-to)
            ),
            url("/Multi-region-aquaculture-scaled.webp") center / cover no-repeat;
          color: var(--foreground);
          position: relative;
        }

        .auth-page::before {
          content: "";
          position: absolute;
          inset: 0;
          background: linear-gradient(
            180deg,
            color-mix(in srgb, var(--background) 12%, transparent),
            color-mix(in srgb, var(--brand-panel-shell-from) 32%, transparent)
          );
          pointer-events: none;
        }

        @keyframes waterFlow {
          0%,
          100% {
            transform: scale(1) translateY(0);
            opacity: 1;
          }
          50% {
            transform: scale(1.05) translateY(-10px);
            opacity: 0.92;
          }
        }

        .auth-page .container {
          display: flex;
          min-height: 100vh;
          width: 100%;
        }

        .auth-theme-toggle {
          position: fixed;
          top: 1rem;
          right: 1rem;
          z-index: 1200;
        }

        .auth-theme-toggle .topbar-control {
          backdrop-filter: blur(14px);
          background: color-mix(in srgb, var(--card) 22%, transparent);
          border-color: color-mix(in srgb, var(--card) 30%, transparent);
          color: var(--card-foreground);
        }

        .auth-theme-toggle .topbar-control:hover {
          background: color-mix(in srgb, var(--accent) 32%, transparent);
        }

        .toast-container {
          position: fixed;
          top: 0;
          right: 0;
          z-index: 1000;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          padding: 1rem;
          max-width: 420px;
          width: 100%;
          pointer-events: none;
        }

        @media (max-width: 640px) {
          .toast-container {
            bottom: 0;
            top: auto;
          }
        }

        .toast {
          pointer-events: auto;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          width: 100%;
          overflow: hidden;
          border-radius: 0.75rem;
          border: 1px solid color-mix(in srgb, var(--primary) 40%, var(--card));
          background: color-mix(in srgb, var(--card) 68%, var(--primary));
          backdrop-filter: blur(12px);
          padding: 1rem 2rem 1rem 1rem;
          box-shadow: 0 10px 40px color-mix(in srgb, var(--foreground) 25%, transparent);
          animation: slideIn 0.3s ease-out;
          transition: all 0.3s;
        }

        .toast.success {
          border-color: color-mix(in srgb, var(--accent) 90%, transparent);
        }
        .toast.error {
          border-color: color-mix(in srgb, var(--destructive) 90%, transparent);
        }
        .toast.warning {
          border-color: color-mix(in srgb, var(--secondary) 90%, transparent);
        }

        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(100%);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        .toast-content {
          flex: 1;
        }
        .toast-title {
          font-size: 0.875rem;
          font-weight: 700;
          margin-bottom: 0.25rem;
          color: var(--card-foreground);
        }
        .toast-description {
          font-size: 0.875rem;
          opacity: 0.9;
          color: color-mix(in srgb, var(--card-foreground) 78%, transparent);
        }

        .toast-close {
          position: absolute;
          right: 0.5rem;
          top: 0.5rem;
          padding: 0.25rem;
          border: none;
          background: transparent;
          cursor: pointer;
          opacity: 0;
          transition: opacity 0.2s;
          font-size: 1.25rem;
          color: var(--card-foreground);
        }
        .toast:hover .toast-close {
          opacity: 0.7;
        }
        .toast-close:hover {
          opacity: 1 !important;
        }

        .login-section {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem;
          animation: slideInLeft 0.6s ease-out;
        }

        @keyframes slideInLeft {
          from {
            opacity: 0;
            transform: translateX(-30px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        .login-card {
          background: linear-gradient(
            135deg,
            color-mix(in srgb, var(--card) 82%, transparent),
            color-mix(in srgb, var(--card) 68%, transparent)
          );
          border-radius: 24px;
          padding: 3rem 2.5rem;
          box-shadow: 0 24px 70px color-mix(in srgb, var(--chart-5) 18%, transparent);
          border: 1px solid color-mix(in srgb, var(--card) 70%, transparent);
          backdrop-filter: blur(18px);
          max-width: 460px;
          width: 100%;
          animation: fadeIn 0.8s ease-out 0.2s backwards;
        }

        .dark .login-card {
          background: linear-gradient(
            135deg,
            color-mix(in srgb, var(--card) 24%, transparent),
            color-mix(in srgb, var(--card) 10%, transparent)
          );
          border: 1px solid color-mix(in srgb, var(--card) 24%, transparent);
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .logo-header {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 1.25rem;
        }
        .logo-icon {
          width: 36px;
          height: 36px;
          color: var(--primary);
        }
        .logo-text {
          font-size: 1.6rem;
          font-weight: 800;
          color: var(--primary);
          letter-spacing: -0.6px;
          font-family: var(--font-serif);
        }

        .login-header h2 {
          font-size: 1.1rem;
          font-weight: 800;
          margin-bottom: 0.5rem;
          color: var(--card-foreground);
        }
        .login-header p {
          color: color-mix(in srgb, var(--card-foreground) 76%, transparent);
          font-size: 0.95rem;
          margin-bottom: 1.8rem;
          line-height: 1.55;
        }

        .form-group {
          margin-bottom: 1.25rem;
        }
        .form-label {
          display: block;
          font-size: 0.9rem;
          font-weight: 700;
          color: var(--card-foreground);
          margin-bottom: 0.5rem;
        }

        .form-input {
          width: 100%;
          padding: 0.9rem 1rem;
          font-size: 0.95rem;
          color: var(--card-foreground);
          background: color-mix(in srgb, var(--card) 74%, transparent);
          border: 1px solid color-mix(in srgb, var(--border) 92%, transparent);
          border-radius: 14px;
          transition: all 0.25s;
          font-family: inherit;
          backdrop-filter: blur(10px);
        }

        .dark .form-input {
          background: color-mix(in srgb, var(--card) 18%, transparent);
          border: 1px solid color-mix(in srgb, var(--card) 20%, transparent);
        }
        .form-input::placeholder {
          color: color-mix(in srgb, var(--card-foreground) 56%, transparent);
        }
        .form-input:focus {
          outline: none;
          background: color-mix(in srgb, var(--card) 92%, transparent);
          border-color: color-mix(in srgb, var(--primary) 74%, white);
          box-shadow: 0 0 0 4px color-mix(in srgb, var(--primary) 18%, transparent);
        }

        .dark .form-input:focus {
          background: color-mix(in srgb, var(--card) 24%, transparent);
        }
        .form-input:hover:not(:focus) {
          border-color: color-mix(in srgb, var(--primary) 24%, var(--card));
        }

        .sign-in-btn {
          width: 100%;
          padding: 1rem;
          font-size: 1rem;
          font-weight: 800;
          color: var(--primary-foreground);
          background: var(--primary);
          border: none;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.25s;
          margin-top: 1.1rem;
          box-shadow: 0 12px 28px color-mix(in srgb, var(--primary) 40%, transparent);
        }
        .sign-in-btn:hover {
          background: color-mix(in srgb, var(--primary) 90%, transparent);
          transform: translateY(-2px);
          box-shadow: 0 18px 36px color-mix(in srgb, var(--primary) 45%, transparent);
        }
        .sign-in-btn:active {
          transform: translateY(0);
        }
        .sign-in-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
          transform: none;
        }

        .helper-row {
          margin-top: 1rem;
          text-align: center;
          font-size: 0.9rem;
          color: color-mix(in srgb, var(--card-foreground) 88%, transparent);
        }

        .link-btn {
          border: none;
          background: transparent;
          color: var(--primary);
          font: inherit;
          font-weight: 700;
          cursor: pointer;
          text-decoration: underline;
          text-underline-offset: 2px;
        }

        .btn-loading {
          position: relative;
          pointer-events: none;
          color: transparent !important;
        }
        .btn-loading::after {
          content: "";
          position: absolute;
          width: 16px;
          height: 16px;
          top: 50%;
          left: 50%;
          margin-left: -8px;
          margin-top: -8px;
          border: 2px solid color-mix(in srgb, var(--background) 25%, transparent);
          border-radius: 50%;
          border-top-color: color-mix(in srgb, var(--background) 90%, transparent);
          animation: spinner 0.6s linear infinite;
        }
        @keyframes spinner {
          to {
            transform: rotate(360deg);
          }
        }

        @media (max-width: 640px) {
          .login-card {
            padding: 2rem 1.5rem;
          }
          .login-section {
            padding: 1rem;
          }
        }
      `}</style>

      <div className="toast-container" id="toastContainer">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast ${toast.variant ?? ""}`}>
            <div className="toast-content">
              {toast.title && <div className="toast-title">{toast.title}</div>}
              {toast.description && <div className="toast-description">{toast.description}</div>}
            </div>
            <button
              type="button"
              className="toast-close"
              aria-label="Dismiss notification"
              onClick={() => setToasts((prev) => prev.filter((item) => item.id !== toast.id))}
            >
              x
            </button>
          </div>
        ))}
      </div>

      <div className="container">
        <div className="login-section">
          <div className="login-card">
            <div className="login-header">
              <div className="logo-header">
                <Image src="/use this.png" alt="AquaSmart fish logo" width={36} height={36} className="logo-icon" />
                <span className="logo-text">AquaSmart</span>
              </div>

              <h2>{authMode === "signin" ? "Sign in to your dashboard" : "Create your AquaSmart account"}</h2>
            </div>

            <form
              onSubmit={(event) => {
                event.preventDefault()
                void handlePasswordAuth()
              }}
            >
              {authMode === "signup" ? (
                <div className="form-group">
                  <label htmlFor="fullName" className="form-label">
                    Full Name
                  </label>
                  <input
                    type="text"
                    id="fullName"
                    className="form-input"
                    placeholder="Jane Otieno"
                    required
                    autoComplete="name"
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                  />
                </div>
              ) : null}

              <div className="form-group">
                <label htmlFor="email" className="form-label">
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  className="form-input"
                  placeholder="name@company.com"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
                <div style={{ marginTop: "0.5rem" }}>
                  <Link href="/" style={{ color: "var(--primary)", fontSize: "0.875rem", fontWeight: 700, textDecoration: "underline", textUnderlineOffset: "2px" }}>
                    Back to home
                  </Link>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="password" className="form-label">
                  Password
                </label>
                <input
                  type="password"
                  id="password"
                  className="form-input"
                  placeholder=""
                  required
                  autoComplete={authMode === "signin" ? "current-password" : "new-password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
                {authMode === "signup" && (
                  <div style={{ marginTop: "0.5rem", fontSize: "0.85rem", color: "color-mix(in srgb, var(--card-foreground) 72%, transparent)" }}>
                    Use at least 8 characters to create a secure password.
                  </div>
                )}
              </div>

              <button
                type="submit"
                className={`sign-in-btn ${loadingButton === "continue" ? "btn-loading" : ""}`}
                disabled={isLoading}
              >
                {authMode === "signin" ? "Sign In" : "Create Account"}
              </button>
            </form>
            <div className="helper-row">
              {authMode === "signin" ? (
                <>
                  New to AquaSmart?{" "}
                  <button type="button" className="link-btn" onClick={() => setAuthMode("signup")}>
                    Create your account
                  </button>
                </>
                ) : (
                  <>
                    Already have an account?{" "}
                  <button type="button" className="link-btn" onClick={() => setAuthMode("signin")}>
                    Sign in instead
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function AuthPage() {
  return (
    <Suspense fallback={null}>
      <AuthPageContent />
    </Suspense>
  )
}

