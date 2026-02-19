"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { Suspense, lazy, useEffect, useRef, useState } from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { createClient } from "@/utils/supabase/client"

const Dithering = lazy(() =>
  import("@paper-design/shaders-react").then((mod) => ({ default: mod.Dithering })),
)

export default function AuthPage() {
  const supabase = createClient()
  const router = useRouter()
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin")
  const [loadingButton, setLoadingButton] = useState<"continue" | null>(null)
  const [toasts, setToasts] = useState<
    Array<{ id: number; title?: string; description?: string; variant?: "success" | "error" | "warning" }>
  >([])
  const isLoading = loadingButton !== null
  const toastId = useRef(0)
  const isDark = mounted && resolvedTheme === "dark"

  const addToast = (toast: { title?: string; description?: string; variant?: "success" | "error" | "warning" }) => {
    toastId.current += 1
    const id = toastId.current
    setToasts((prev) => [...prev, { id, ...toast }])
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((item) => item.id !== id))
    }, 5000)
  }

  const validateEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
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
    const trimmedEmail = email.trim()
    const trimmedPassword = password.trim()

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
        const { error } = await withTimeout(
          supabase.auth.signInWithPassword({
            email: trimmedEmail,
            password: trimmedPassword,
          }),
        )
        if (error) {
          addToast({ title: "Sign in failed", description: error.message, variant: "error" })
          return
        }

        addToast({ title: "Signed in", description: "Redirecting to your dashboard.", variant: "success" })
        router.replace("/")
        return
      }

      const baseUrl =
        process.env.NEXT_PUBLIC_SITE_URL ??
        process.env.NEXT_PUBLIC_APP_URL ??
        window.location.origin
      const redirectTo = `${baseUrl}/auth/callback?next=/auth/verify-success`
      const { data, error } = await withTimeout(
        supabase.auth.signUp({
          email: trimmedEmail,
          password: trimmedPassword,
          options: { emailRedirectTo: redirectTo },
        }),
      )
      if (error) {
        addToast({ title: "Sign up failed", description: error.message, variant: "error" })
        return
      }

      if (data.session) {
        addToast({
          title: "Account created",
          description: "You are signed in and will be redirected.",
          variant: "success",
        })
        router.replace("/")
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
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Try again."
      addToast({ title: "Unexpected Error", description: errorMessage, variant: "error" })
    } finally {
      setLoadingButton(null)
    }
  }

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <div className="auth-page" onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}>
      <button
        type="button"
        className="theme-toggle-btn"
        onClick={() => setTheme(isDark ? "light" : "dark")}
        aria-label={mounted ? (isDark ? "Switch to light mode" : "Switch to dark mode") : "Toggle theme"}
      >
        {isDark ? <Sun size={18} /> : <Moon size={18} />}
      </button>
      <Suspense fallback={<div className="absolute inset-0 bg-muted/20 pointer-events-none" />}>
        <div className="absolute inset-0 z-0 pointer-events-none opacity-35 dark:opacity-30 mix-blend-multiply dark:mix-blend-screen">
          <Dithering
            colorBack="#00000000"
            colorFront={isDark ? "#34D399" : "#22C55E"}
            shape="warp"
            type="4x4"
            speed={isHovered ? 0.6 : 0.2}
            className="size-full"
            minPixelRatio={1}
          />
        </div>
      </Suspense>
      <style jsx global>{`
        @import url("https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap");

        .auth-page,
        .auth-page * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }

        .auth-page {
          font-family: "Inter", sans-serif;
          min-height: 100vh;
          overflow: hidden;
          background: var(--background);
          color: var(--foreground);
          position: relative;
        }

        .auth-page::before {
          display: none;
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

        .theme-toggle-btn {
          position: fixed;
          top: 1rem;
          right: 1rem;
          z-index: 1200;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 2.25rem;
          height: 2.25rem;
          border-radius: 999px;
          border: 1px solid var(--border);
          background: color-mix(in srgb, var(--card) 92%, transparent);
          color: var(--foreground);
          cursor: pointer;
          backdrop-filter: blur(8px);
          transition: all 0.2s ease;
        }

        .theme-toggle-btn:hover {
          background: var(--accent);
          color: var(--accent-foreground);
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
          border: 1px solid color-mix(in srgb, var(--primary) 55%, transparent);
          background: color-mix(in srgb, var(--primary) 72%, transparent);
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
          color: var(--foreground);
        }
        .toast-description {
          font-size: 0.875rem;
          opacity: 0.9;
          color: color-mix(in srgb, var(--foreground) 78%, transparent);
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
          color: var(--foreground);
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
          background: color-mix(in srgb, var(--card) 55%, transparent);
          border-radius: 18px;
          padding: 3rem 2.5rem;
          box-shadow: 0 18px 60px color-mix(in srgb, var(--foreground) 25%, transparent);
          border: 1px solid color-mix(in srgb, var(--primary) 70%, transparent);
          backdrop-filter: blur(12px);
          max-width: 460px;
          width: 100%;
          animation: fadeIn 0.8s ease-out 0.2s backwards;
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
        }

        .login-header h2 {
          font-size: 1.1rem;
          font-weight: 800;
          margin-bottom: 0.5rem;
          color: var(--foreground);
        }
        .login-header p {
          color: color-mix(in srgb, var(--foreground) 78%, transparent);
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
          color: color-mix(in srgb, var(--foreground) 90%, transparent);
          margin-bottom: 0.5rem;
        }

        .form-input {
          width: 100%;
          padding: 0.9rem 1rem;
          font-size: 0.95rem;
          color: var(--foreground);
          background: color-mix(in srgb, var(--background) 55%, transparent);
          border: 1px solid color-mix(in srgb, var(--foreground) 10%, transparent);
          border-radius: 10px;
          transition: all 0.25s;
          font-family: inherit;
        }
        .form-input::placeholder {
          color: color-mix(in srgb, var(--foreground) 45%, transparent);
        }
        .form-input:focus {
          outline: none;
          background: color-mix(in srgb, var(--background) 75%, transparent);
          border-color: color-mix(in srgb, var(--primary) 90%, transparent);
          box-shadow: 0 0 0 4px color-mix(in srgb, var(--primary) 25%, transparent);
        }
        .form-input:hover:not(:focus) {
          border-color: color-mix(in srgb, var(--primary) 65%, transparent);
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
          color: color-mix(in srgb, var(--foreground) 72%, transparent);
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
                <svg className="logo-icon" viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                  <path
                    d="M22 64 C 22 44, 56 44, 70 64 C 56 84, 22 84, 22 64 Z"
                    stroke="currentColor"
                    fill="none"
                    strokeWidth="6"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M70 64 L 94 48 M70 64 L 94 80"
                    stroke="currentColor"
                    fill="none"
                    strokeWidth="6"
                    strokeLinejoin="round"
                  />
                  <circle cx="38" cy="60" r="5" fill="currentColor" />
                  <path
                    d="M18 96 C 36 86, 54 106, 72 96 S 102 106, 120 96"
                    stroke="currentColor"
                    fill="none"
                    strokeWidth="6"
                    strokeLinecap="round"
                    opacity="0.75"
                  />
                </svg>
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
                  <div style={{ marginTop: "0.5rem", fontSize: "0.85rem", color: "color-mix(in srgb, var(--foreground) 68%, transparent)" }}>
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

