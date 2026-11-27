"use client"

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
    <main className="flex min-h-svh justify-center bg-card px-5 py-10 font-sans text-foreground sm:items-center sm:px-10">
      <div className="w-full max-w-[400px]">
        <Link href="/auth" className="mb-7 inline-block text-[15px] text-primary underline underline-offset-4 hover:text-[#0b3a63]">
          <span aria-hidden="true">&larr; </span>Back to sign in
        </Link>
        <h1 className="mb-3 font-[family-name:var(--font-heading)] text-[30px] font-bold leading-tight tracking-tight">
          Reset your password
        </h1>
        <p className="mb-7 text-base text-muted-foreground">
          Enter the email you sign in with. We&apos;ll send you a link to choose a new password.
        </p>

        {errorMessage ? (
          <div role="alert" className="mb-6 rounded-[4px] border-[3px] border-destructive-strong px-[18px] py-4">
            <p className="mb-1.5 text-[17px] font-bold">There is a problem</p>
            <a href="#reset-email" className="text-[15px] font-semibold text-destructive-strong underline underline-offset-2">
              {errorMessage}
            </a>
          </div>
        ) : null}

        {noticeMessage ? (
          <div role="status" className="mb-6 rounded-lg bg-accent px-5 py-4 text-[15px]">
            {noticeMessage}
          </div>
        ) : null}

        <form onSubmit={(event) => void handleSubmit(event)} noValidate className="flex flex-col gap-5">
          <div className={errorMessage ? "flex flex-col gap-1.5 border-l-4 border-destructive-strong pl-3.5" : "flex flex-col gap-1.5"}>
            <label htmlFor="reset-email" className="text-[15px] font-semibold">
              Email address
            </label>
            <input
              id="reset-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              spellCheck={false}
              aria-invalid={Boolean(errorMessage)}
              className={
                "h-12 w-full rounded-[4px] border bg-card px-3.5 text-base text-foreground outline-none focus-visible:outline-[3px] focus-visible:outline-offset-1 focus-visible:outline-primary " +
                (errorMessage ? "border-2 border-destructive-strong" : "border-[#6b7c88]")
              }
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="h-12 w-full rounded-[4px] bg-primary px-4 text-base font-semibold text-primary-foreground transition hover:bg-[#0b3a63] disabled:opacity-70"
          >
            {isSubmitting ? "Sending..." : "Send reset link"}
          </button>
        </form>

        <div className="mt-7 rounded-lg bg-accent px-5 py-[18px]">
          <p className="mb-1 text-[15px] font-semibold">No email arrived?</p>
          <p className="text-sm text-[#4b5d69]">
            Check your spam folder, or ask your farm administrator to reset your password. Signed up with Google?
            You have no password to reset: sign in with Google instead.
          </p>
        </div>
      </div>
    </main>
  )
}
