"use client"

import Link from "next/link"
import { ArrowRight, Building2, UserPlus } from "lucide-react"
import { OnboardingShell } from "@/components/onboarding/onboarding-shell"

function ChoiceCard({
  icon,
  title,
  description,
  href,
  cta,
}: {
  icon: React.ReactNode
  title: string
  description: string
  href: string
  cta: string
}) {
  return (
    <Link
      href={href}
      className="group flex h-full flex-col rounded-[1.75rem] border border-border/70 bg-card/92 p-6 shadow-[0_30px_80px_rgba(15,23,42,0.10)] transition hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-[0_34px_90px_rgba(15,23,42,0.16)]"
    >
      <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        {icon}
      </div>
      <h2 className="mt-5 text-2xl font-semibold tracking-tight text-foreground">{title}</h2>
      <p className="mt-3 flex-1 text-sm leading-6 text-muted-foreground">{description}</p>
      <div className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-primary">
        {cta}
        <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
      </div>
    </Link>
  )
}

export default function OnboardingEntryChoicePage() {
  return (
    <OnboardingShell
      title="Welcome to AquaSmart"
      description="Create a new farm workspace as the founder, or join an existing farm if your team has already invited you."
    >
      <div className="grid gap-5 lg:grid-cols-2">
        <ChoiceCard
          icon={<Building2 className="h-6 w-6" />}
          title="Create a Farm"
          description="Start a new farm workspace, become the first admin, and set up your base operating environment."
          href="/onboarding/create"
          cta="Create Farm"
        />
        <ChoiceCard
          icon={<UserPlus className="h-6 w-6" />}
          title="Join a Farm"
          description="Use an invite or access code from your farm manager to join an existing AquaSmart workspace."
          href="/onboarding/join"
          cta="Join Farm"
        />
      </div>
    </OnboardingShell>
  )
}
