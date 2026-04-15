"use client"

import Link from "next/link"
import { useState } from "react"
import { MailCheck } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

export default function CheckEmailPageClient({ email }: { email: string }) {
  const supabase = createClient()
  const [sending, setSending] = useState(false)
  const [status, setStatus] = useState<string | null>(null)

  const resend = async () => {
    if (!email || sending) return

    setSending(true)
    setStatus(null)
    try {
      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? window.location.origin
      const redirectTo = `${baseUrl}/auth/callback?next=/`
      const { error } = await supabase.auth.resend({
        type: "signup",
        email,
        options: {
          emailRedirectTo: redirectTo,
        },
      })
      if (error) {
        setStatus(error.message)
      } else {
        setStatus("Verification email sent again.")
      }
    } finally {
      setSending(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-8">
      <div className="w-full max-w-md rounded-[1.75rem] border border-border/70 bg-card/95 p-8 shadow-[0_30px_80px_rgba(15,23,42,0.12)]">
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <MailCheck className="h-7 w-7" />
        </div>
        <h1 className="mt-6 text-3xl font-semibold tracking-tight text-foreground">Verify your email</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          We sent a confirmation link to your inbox{email ? ` at ${email}` : ""}. Open it to continue into AquaSmart.
        </p>

        {status ? (
          <div className="mt-5 rounded-xl border border-border/70 bg-background/70 px-4 py-3 text-sm text-muted-foreground">
            {status}
          </div>
        ) : null}

        <div className="mt-8 flex flex-col gap-3">
          <button
            type="button"
            onClick={() => void resend()}
            disabled={!email || sending}
            className="inline-flex items-center justify-center rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {sending ? "Sending..." : "Resend email"}
          </button>
          <Link
            href="/auth"
            className="inline-flex items-center justify-center rounded-xl border border-border/70 bg-card px-4 py-3 text-sm font-semibold text-foreground transition hover:bg-accent hover:text-accent-foreground"
          >
            Back to sign in
          </Link>
        </div>
      </div>
    </main>
  )
}
