"use client"

import { useState } from "react"
import { useSearchParams } from "next/navigation"
import { useAuth } from "@/components/providers/auth-provider"

function GoogleGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.997 8.997 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.167 6.656 3.58 9 3.58z"
      />
    </svg>
  )
}

type Props = {
  /** Where to land after auth; falls back to the URL's `next`, then `/dashboard`. */
  nextPath?: string | null
  label?: string
  className?: string
}

/**
 * "Continue with Google" button. Kicks off the Supabase OAuth redirect; on
 * failure it surfaces the message inline and re-enables itself.
 */
export function GoogleSignInButton({ nextPath, label = "Continue with Google", className }: Props) {
  const { signInWithGoogle } = useAuth()
  const searchParams = useSearchParams()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleClick = async () => {
    if (isLoading) return
    setError(null)
    setIsLoading(true)
    try {
      await signInWithGoogle(nextPath ?? searchParams.get("next"))
      // Browser is now redirecting to Google.
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to continue with Google.")
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => void handleClick()}
        disabled={isLoading}
        className={
          className ??
          "flex w-full items-center justify-center gap-2.5 rounded-[12px] border border-[color:color-mix(in_srgb,var(--border)_92%,transparent)] bg-[color:color-mix(in_srgb,var(--card)_88%,white_6%)] px-4 py-3 text-sm font-semibold text-card-foreground transition hover:bg-[color:color-mix(in_srgb,var(--card)_96%,white_10%)] disabled:opacity-70"
        }
      >
        <GoogleGlyph />
        {isLoading ? "Redirecting to Google..." : label}
      </button>
      {error ? (
        <div className="rounded-[12px] border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
          {error}
        </div>
      ) : null}
    </div>
  )
}
