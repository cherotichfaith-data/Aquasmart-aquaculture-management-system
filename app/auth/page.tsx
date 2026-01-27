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
          "Supabase not configured: ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set.",
        )
        return
      }

      const res = await supabase.auth.signInWithOtp({ email })
      const error = (res as any)?.error
      if (error) {
        setStatus(error.message || String(error))
      } else {
        setStatus("Check your email for a sign-in link.")
      }
    } catch (err: any) {
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
    <div className="flex min-h-screen w-full items-center justify-center bg-background px-4 py-8">
      <style>{`
        @keyframes swim {
          0%, 100% { transform: translateX(-5px) scaleY(1); }
          50% { transform: translateX(5px) scaleY(1.05); }
        }
        .fish-body { 
          animation: swim 2.5s ease-in-out infinite;
          transform-origin: center;
        }

        @keyframes draw-wave {
          to {
            stroke-dashoffset: 0;
          }
        }
        .wave {
          stroke-dasharray: 100;
          stroke-dashoffset: 200;
          animation: draw-wave 2s ease-in-out infinite;
        }
        .wave2 {
          animation-delay: -0.5s;
        }
      `}</style>
      <div className="flex w-full max-w-md flex-col items-center gap-6">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 100 100"
          aria-label="AquaSmart"
          className="h-16 w-16"
        >
          <g className="fish-body">
            <path
              d="M30 50 C 30 35, 60 35, 70 50 C 60 65, 30 65, 30 50 Z"
              stroke="hsl(var(--primary))"
              fill="hsl(var(--background))"
              strokeWidth="3"
              strokeLinejoin="round"
              strokeLinecap="round"
            ></path>
            <path
              d="M70 50 L 85 40 M70 50 L 85 60"
              stroke="hsl(var(--primary))"
              fill="none"
              strokeWidth="3"
              strokeLinejoin="round"
              strokeLinecap="round"
            ></path>
            <circle cx="40" cy="48" r="3" fill="hsl(var(--primary))"></circle>
          </g>
          <path
            className="wave"
            d="M 10,70 Q 30,60 50,70 T 90,70"
            stroke="hsl(var(--primary))"
            strokeWidth="3"
            strokeLinecap="round"
            fill="none"
          ></path>
          <path
            className="wave wave2"
            d="M 10,80 Q 30,90 50,80 T 90,80"
            stroke="hsl(var(--accent))"
            strokeWidth="3"
            strokeLinecap="round"
            fill="none"
          ></path>
        </svg>

        <Card className="w-full">
          <CardHeader>
            <CardTitle>Sign in to AquaSmart</CardTitle>
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
                {loading ? "Sending..." : "Send sign-in link"}
              </Button>

              {status && <p className="text-sm text-muted-foreground">{status}</p>}
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
