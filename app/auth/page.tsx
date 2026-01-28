"use client"

import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { createClient } from "@/utils/supabase/client"

export default function AuthPage() {
  const supabase = createClient()
  const [email, setEmail] = useState("")
  const [loadingButton, setLoadingButton] = useState<"send" | "continue" | null>(null)
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

  const sendMagicLink = async (button: "send" | "continue") => {
    if (isLoading) return
    const trimmedEmail = email.trim()

    if (!validateEmail(trimmedEmail)) {
      addToast({ title: "Invalid Email", description: "Please enter a valid email address.", variant: "error" })
      return
    }

    setLoadingButton(button)
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

      const redirectTo = `${window.location.origin}/auth/callback?next=/`
      const { error } = await supabase.auth.signInWithOtp({
        email: trimmedEmail,
        options: {
          emailRedirectTo: redirectTo,
          shouldCreateUser: true,
        },
      })

      if (error) {
        addToast({ title: "Error", description: error.message || "Could not send link.", variant: "error" })
        return
      }

      addToast({
        title: "Magic Link Sent",
        description: `Check ${trimmedEmail} to continue signing in.`,
        variant: "success",
      })
    } catch (err: any) {
      if (err instanceof TypeError && /failed to fetch/i.test(String(err.message))) {
        addToast({
          title: "Network Error",
          description: "Request failed: check CORS, network, or Supabase URL.",
          variant: "error",
        })
      } else {
        addToast({ title: "Unexpected Error", description: err?.message ?? "Try again.", variant: "error" })
      }
    } finally {
      setLoadingButton(null)
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      addToast({
        title: "Welcome to AquaSmart",
        description: "Enter your email to receive a secure sign-in link.",
        variant: "success",
      })
    }, 450)
    return () => window.clearTimeout(timer)
  }, [])

  return (
    <div className="auth-page">
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
          background: #0a1628;
          color: #f8fafc;
          position: relative;
        }

        .auth-page::before {
          content: "";
          position: fixed;
          inset: 0;
          background:
            radial-gradient(ellipse at 20% 30%, rgba(45, 212, 191, 0.15) 0%, transparent 50%),
            radial-gradient(ellipse at 80% 70%, rgba(14, 165, 233, 0.12) 0%, transparent 50%),
            radial-gradient(circle at 50% 50%, rgba(26, 58, 82, 0.75) 0%, #0a1628 100%);
          z-index: -1;
          animation: waterFlow 18s ease-in-out infinite;
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
          border: 1px solid rgba(45, 212, 191, 0.25);
          background: rgba(10, 22, 40, 0.75);
          backdrop-filter: blur(12px);
          padding: 1rem 2rem 1rem 1rem;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.35);
          animation: slideIn 0.3s ease-out;
          transition: all 0.3s;
        }

        .toast.success {
          border-color: rgba(110, 231, 183, 0.9);
        }
        .toast.error {
          border-color: rgba(249, 115, 22, 0.9);
        }
        .toast.warning {
          border-color: rgba(254, 243, 199, 0.9);
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
          color: #f8fafc;
        }
        .toast-description {
          font-size: 0.875rem;
          opacity: 0.9;
          color: rgba(248, 250, 252, 0.78);
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
          color: #f8fafc;
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
          background: rgba(26, 58, 82, 0.55);
          border-radius: 18px;
          padding: 3rem 2.5rem;
          box-shadow: 0 18px 60px rgba(0, 0, 0, 0.35);
          border: 1px solid rgba(45, 212, 191, 0.25);
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
          color: #2dd4bf;
        }
        .logo-text {
          font-size: 1.6rem;
          font-weight: 800;
          color: #2dd4bf;
          letter-spacing: -0.6px;
        }

        .pill {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.35rem 0.65rem;
          border-radius: 999px;
          font-size: 0.8rem;
          font-weight: 700;
          color: rgba(248, 250, 252, 0.9);
          border: 1px solid rgba(14, 165, 233, 0.25);
          background: rgba(14, 165, 233, 0.1);
          margin-bottom: 1.25rem;
        }
        .pill-dot {
          width: 8px;
          height: 8px;
          border-radius: 999px;
          background: #6ee7b7;
          box-shadow: 0 0 0 4px rgba(110, 231, 183, 0.14);
        }

        .login-header h2 {
          font-size: 1.1rem;
          font-weight: 800;
          margin-bottom: 0.5rem;
          color: #f8fafc;
        }
        .login-header p {
          color: rgba(248, 250, 252, 0.78);
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
          color: rgba(248, 250, 252, 0.9);
          margin-bottom: 0.5rem;
        }

        .form-input {
          width: 100%;
          padding: 0.9rem 1rem;
          font-size: 0.95rem;
          color: #f8fafc;
          background: rgba(10, 22, 40, 0.55);
          border: 1px solid rgba(248, 250, 252, 0.1);
          border-radius: 10px;
          transition: all 0.25s;
          font-family: inherit;
        }
        .form-input::placeholder {
          color: rgba(248, 250, 252, 0.45);
        }
        .form-input:focus {
          outline: none;
          background: rgba(10, 22, 40, 0.75);
          border-color: rgba(45, 212, 191, 0.65);
          box-shadow: 0 0 0 4px rgba(45, 212, 191, 0.12);
        }
        .form-input:hover:not(:focus) {
          border-color: rgba(14, 165, 233, 0.55);
        }

        .hint-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-top: 0.5rem;
          gap: 0.75rem;
          flex-wrap: wrap;
        }
        .hint {
          font-size: 0.85rem;
          color: rgba(248, 250, 252, 0.68);
        }

        .link {
          color: #2dd4bf;
          text-decoration: none;
          font-size: 0.875rem;
          font-weight: 700;
          transition: opacity 0.2s;
        }
        .link:hover {
          opacity: 0.85;
          text-decoration: underline;
        }

        .sign-in-btn {
          width: 100%;
          padding: 1rem;
          font-size: 1rem;
          font-weight: 800;
          color: #0a1628;
          background: linear-gradient(135deg, #2dd4bf, #0ea5e9);
          border: none;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.25s;
          margin-top: 1.1rem;
          box-shadow: 0 12px 28px rgba(45, 212, 191, 0.22);
        }
        .sign-in-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 18px 36px rgba(14, 165, 233, 0.22);
        }
        .sign-in-btn:active {
          transform: translateY(0);
        }
        .sign-in-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
          transform: none;
        }

        .alt-btn {
          width: 100%;
          padding: 0.95rem 1rem;
          font-size: 0.95rem;
          font-weight: 800;
          color: rgba(248, 250, 252, 0.92);
          background: rgba(14, 165, 233, 0.12);
          border: 1px solid rgba(14, 165, 233, 0.25);
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .alt-btn:hover {
          background: rgba(14, 165, 233, 0.18);
        }

        .divider {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin: 1.1rem 0 0.9rem;
          color: rgba(248, 250, 252, 0.55);
          font-size: 0.85rem;
        }
        .divider::before,
        .divider::after {
          content: "";
          flex: 1;
          height: 1px;
          background: rgba(248, 250, 252, 0.12);
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
          border: 2px solid rgba(10, 22, 40, 0.25);
          border-radius: 50%;
          border-top-color: rgba(10, 22, 40, 0.9);
          animation: spinner 0.6s linear infinite;
        }
        @keyframes spinner {
          to {
            transform: rotate(360deg);
          }
        }

        .signup-link {
          text-align: center;
          margin-top: 1.25rem;
          font-size: 0.9rem;
          color: rgba(248, 250, 252, 0.72);
        }
        .signup-link a {
          color: #2dd4bf;
          text-decoration: none;
          font-weight: 800;
        }
        .signup-link a:hover {
          opacity: 0.9;
          text-decoration: underline;
        }

        .hero-section {
          flex: 1;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, rgba(26, 58, 82, 0.92), rgba(10, 22, 40, 0.92));
          overflow: hidden;
          animation: slideInRight 0.6s ease-out;
          border-left: 1px solid rgba(45, 212, 191, 0.15);
        }

        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateX(30px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        .hero-section::before {
          content: "";
          position: absolute;
          inset: 0;
          background-image:
            radial-gradient(circle at 20% 30%, rgba(255, 255, 255, 0.05) 0%, transparent 50%),
            radial-gradient(circle at 80% 70%, rgba(14, 165, 233, 0.12) 0%, transparent 50%);
          opacity: 0.9;
        }
        .hero-section::after {
          content: "";
          position: absolute;
          inset: 0;
          background-image: url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220' opacity='0.05'><path d='M20 80 C 20 55, 70 55, 90 80 C 70 105, 20 105, 20 80 Z' fill='white'/><path d='M90 80 L 120 62 M90 80 L 120 98' stroke='white' stroke-width='4' fill='none'/><circle cx='42' cy='76' r='5' fill='white'/><path d='M0 170 C 40 150, 80 190, 120 170 S 200 190, 240 170' stroke='white' stroke-width='5' fill='none' stroke-linecap='round'/></svg>");
          background-size: 220px 220px;
          animation: pattern 55s linear infinite;
        }
        @keyframes pattern {
          0% {
            background-position: 0 0;
          }
          100% {
            background-position: 220px 220px;
          }
        }

        .hero-content {
          position: relative;
          z-index: 10;
          text-align: left;
          padding: 3.25rem;
          max-width: 620px;
          animation: fadeInUp 0.8s ease-out 0.3s backwards;
        }
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(40px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .hero-content h1 {
          font-size: clamp(2rem, 4vw, 3.1rem);
          font-weight: 900;
          margin-bottom: 1.25rem;
          line-height: 1.15;
          background: linear-gradient(135deg, #2dd4bf, #6ee7b7, #0ea5e9);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          letter-spacing: -0.5px;
        }
        .hero-content p {
          font-size: clamp(1rem, 2vw, 1.15rem);
          color: rgba(248, 250, 252, 0.88);
          line-height: 1.7;
          font-weight: 500;
        }

        .hero-list {
          margin-top: 1.35rem;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.8rem;
        }
        .hero-item {
          background: rgba(248, 250, 252, 0.06);
          border: 1px solid rgba(248, 250, 252, 0.1);
          border-radius: 14px;
          padding: 0.85rem 0.9rem;
          backdrop-filter: blur(8px);
        }
        .hero-item b {
          display: block;
          font-size: 0.92rem;
          margin-bottom: 0.2rem;
        }
        .hero-item span {
          font-size: 0.85rem;
          color: rgba(248, 250, 252, 0.82);
        }

        @media (max-width: 1024px) {
          .hero-section {
            display: none;
          }
          .login-section {
            flex: 1;
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
              ×
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

              <div className="pill">
                <span className="pill-dot"></span>
                <span>Real-time Farm Intelligence</span>
              </div>

              <h2>Sign in to your dashboard</h2>
              <p>
                AquaSmart uses secure email login links. Enter your email and we&apos;ll send a magic link to continue.
              </p>
            </div>

            <form
              onSubmit={(event) => {
                event.preventDefault()
                void sendMagicLink("continue")
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
                <div className="hint-row">
                  <span className="hint">We&apos;ll send a sign-in link to your inbox.</span>
                  <Link className="link" href="/">
                    Back to home
                  </Link>
                </div>
              </div>

              <div className="divider">or</div>

              <button
                type="button"
                className={`alt-btn ${loadingButton === "send" ? "btn-loading" : ""}`}
                disabled={isLoading}
                onClick={() => void sendMagicLink("send")}
              >
                Send Magic Link
              </button>

              <button
                type="submit"
                className={`sign-in-btn ${loadingButton === "continue" ? "btn-loading" : ""}`}
                disabled={isLoading}
              >
                Continue
              </button>
            </form>

            <div className="signup-link">
              New to AquaSmart? <a href="#signup">Create your account with the same email link.</a>
            </div>
          </div>
        </div>

        <div className="hero-section">
          <div className="hero-content">
            <h1>Operate with clarity.</h1>
            <p>
              Track daily operations and monitor the KPIs that matter: eFCR, biomass density, ABW, feeding rate,
              mortality, and water quality across cages, ponds, or tanks.
            </p>

            <div className="hero-list">
              <div className="hero-item">
                <b>KPI Dashboard</b>
                <span>System-level + farm-level snapshots.</span>
              </div>
              <div className="hero-item">
                <b>Data Entry</b>
                <span>Feeding, sampling, harvest, WQ.</span>
              </div>
              <div className="hero-item">
                <b>Alerts</b>
                <span>Threshold-based health flags.</span>
              </div>
              <div className="hero-item">
                <b>Audit Trail</b>
                <span>Change log for traceability.</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
