"use client"

import Image from "next/image"
import { useRouter } from "next/navigation"
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
  const router = useRouter()
  const { signOut } = useAuth()

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.18),_transparent_34%),linear-gradient(180deg,_hsl(var(--background)),_color-mix(in_srgb,_hsl(var(--background))_88%,_white))] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-border/70 bg-card/80 shadow-sm">
              <Image src="/use this.png" alt="AquaSmart logo" width={28} height={28} />
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-primary/80">AquaSmart</p>
              <p className="text-sm text-muted-foreground">Farm workspace setup</p>
            </div>
          </div>
          <button
            type="button"
            onClick={async () => {
              await signOut()
              router.replace("/auth")
            }}
            className="inline-flex items-center gap-2 rounded-xl border border-border/70 bg-card/80 px-3 py-2 text-sm font-medium text-foreground transition hover:bg-accent hover:text-accent-foreground"
          >
            <LogOut className="h-4 w-4" />
            Log out
          </button>
        </div>

        <div className="max-w-2xl">
          <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">{title}</h1>
          <p className="mt-4 max-w-xl text-base leading-7 text-muted-foreground">{description}</p>
        </div>

        {children}
      </div>
    </main>
  )
}
