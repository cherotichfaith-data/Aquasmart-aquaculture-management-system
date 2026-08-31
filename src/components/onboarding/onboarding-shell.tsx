"use client"

import Image from "next/image"
import { LogOut } from "lucide-react"
import { useAuth } from "@/components/providers/auth-provider"

export function OnboardingShell({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: React.ReactNode
}) {
  const { signOut } = useAuth()

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,color-mix(in_srgb,var(--background)_78%,white),color-mix(in_srgb,var(--color-primary)_14%,white))] px-4 py-5 sm:px-5 lg:px-6">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-7">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Image src="/Bild.png" alt="SUSTAIN Aquasmart logo" width={3284} height={528} className="h-auto w-[150px]" />
            <span className="text-sm text-muted-foreground">Farm workspace setup</span>
          </div>
          <button
            type="button"
            onClick={async () => {
              await signOut()
            }}
            className="inline-flex items-center gap-2 rounded-xl border border-primary/20 bg-white/78 px-3 py-2 text-sm font-medium text-foreground transition hover:bg-primary/10"
          >
            <LogOut className="h-4 w-4" />
            Log out
          </button>
        </div>

        <div className="max-w-2xl">
          <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">{title}</h1>
          <p className="mt-3 max-w-xl text-base leading-6 text-muted-foreground">{description}</p>
        </div>

        {children}
      </div>
    </main>
  )
}
