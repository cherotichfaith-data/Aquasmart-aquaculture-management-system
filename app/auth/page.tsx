"use client"

import { useState } from "react"
import { createClient } from "@/utils/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export default function AuthPage() {
  const supabase = createClient()
  const [email, setEmail] = useState("")
  const [status, setStatus] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setStatus(null)
    try {
      if (!navigator.onLine) {
        setStatus("Offline: please check your network connection and try again.")
        return
      }

      if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        setStatus(
          "Supabase not configured: ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set."
        )
        return
      }

      const res = await supabase.auth.signInWithOtp({ email })
      // API may return an error object or throw; handle both
      const error = (res as any)?.error
      if (error) {
        setStatus(error.message || String(error))
      } else {
        setStatus("Check your email for a sign-in link.")
      }
    } catch (err: any) {
      // Common client-side network failure
      if (err instanceof TypeError && /failed to fetch/i.test(String(err.message))) {
        setStatus("Network request failed: check CORS, network, or Supabase URL.")
      } else {
        setStatus(err?.message ?? "Unexpected error")
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-muted/40">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Sign in to Aquasmart</CardTitle>
          <CardDescription>Enter your email to receive a magic sign-in link.</CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              type="email"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Sending…" : "Send sign-in link"}
            </Button>

            {status && <p className="text-sm text-muted-foreground">{status}</p>}
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

