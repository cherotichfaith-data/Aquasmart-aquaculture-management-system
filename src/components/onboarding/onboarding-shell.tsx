"use client"

import Image from "next/image"

export function OnboardingShell({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,color-mix(in_srgb,var(--background)_78%,white),color-mix(in_srgb,var(--color-primary)_14%,white))] px-4 py-5 sm:px-5 lg:px-6">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-7">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Image
              src="/sustain-aquasmart-wordmark.png"
              alt="SUSTAIN Aquasmart"
              width={1200}
              height={131}
              className="h-8 w-auto"
              priority
            />
            <p className="border-l border-primary/20 pl-3 text-sm text-muted-foreground">Farm workspace setup</p>
          </div>
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
