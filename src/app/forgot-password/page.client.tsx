"use client"

import Image from "next/image"
import Link from "next/link"
import { type FormEvent, useState } from "react"
import { useAuth } from "@/components/providers/auth-provider"

export default function ForgotPasswordPageClient() {
  const { resetPasswordForEmail } = useAuth()
  const [email, setEmail] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (isSubmitting) return
    if (!email.trim()) {
      setErrorMessage("Enter your registered email address.")
      return
    }

    setIsSubmitting(true)
    setErrorMessage(null)
    setNoticeMessage(null)

    try {
      await resetPasswordForEmail(email)
      setNoticeMessage("If that email exists, a password reset link has been sent.")
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to send reset instructions."
      setErrorMessage(/rate limit/i.test(message) ? "Too many email requests. Wait before requesting another link." : message)
    } finally {
      setIsSubmitting(false)
    }
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
      <div className="relative z-10 w-full max-w-md rounded-[24px] border border-[color:color-mix(in_srgb,var(--card)_70%,transparent)] bg-[linear-gradient(135deg,color-mix(in_srgb,var(--card)_82%,transparent),color-mix(in_srgb,var(--card)_68%,transparent))] p-6 shadow-[0_24px_70px_color-mix(in_srgb,var(--chart-5)_18%,transparent)] backdrop-blur-[18px]">
        <div className="flex items-center gap-3">
          <Image src="/use this.png" alt="AquaSmart logo" width={36} height={36} className="h-9 w-9" priority />
          <div>
            <div className="font-serif text-[1.45rem] font-extrabold tracking-[-0.04em]">
              <span className="text-[var(--secondary)]">Aqua</span>
              <span className="text-primary">Smart</span>
            </div>
            <h1 className="text-xl font-semibold tracking-tight text-card-foreground">Forgot your password?</h1>
          </div>
        </div>
        <p className="mt-3 text-sm text-[color:color-mix(in_srgb,var(--card-foreground)_76%,transparent)]">
          Enter your registered email and we will send password reset instructions.
        </p>

        <form onSubmit={(event) => void handleSubmit(event)} className="mt-5 space-y-4">
          <label className="block space-y-2">
            <span className="text-sm font-medium text-card-foreground">Email address</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              placeholder="you@example.com"
              className="w-full rounded-[14px] border border-[color:color-mix(in_srgb,var(--border)_92%,transparent)] bg-[color:color-mix(in_srgb,var(--card)_74%,transparent)] px-3 py-2 text-sm text-card-foreground outline-none backdrop-blur-[10px] transition placeholder:text-[color:color-mix(in_srgb,var(--card-foreground)_56%,transparent)] focus:border-primary focus:bg-[color:color-mix(in_srgb,var(--card)_92%,transparent)] focus:ring-2 focus:ring-primary/20"
            />
          </label>

          {errorMessage ? (
            <div className="rounded-[12px] border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {errorMessage}
            </div>
          ) : null}

          {noticeMessage ? (
            <div className="rounded-[12px] border border-[color:color-mix(in_srgb,var(--card)_70%,transparent)] bg-[color:color-mix(in_srgb,var(--card)_52%,transparent)] px-3 py-2 text-sm text-[color:color-mix(in_srgb,var(--card-foreground)_78%,transparent)]">
              {noticeMessage}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-[12px] bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-[0_12px_28px_color-mix(in_srgb,var(--primary)_40%,transparent)] transition hover:-translate-y-0.5 hover:bg-primary/90 hover:shadow-[0_18px_36px_color-mix(in_srgb,var(--primary)_45%,transparent)] disabled:opacity-70"
          >
            {isSubmitting ? "Sending..." : "Send reset link"}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-[color:color-mix(in_srgb,var(--card-foreground)_88%,transparent)]">
          <Link href="/auth" className="font-medium text-primary hover:underline">
            Back to Sign In
          </Link>
        </p>
      </div>
    </main>
  )
}
