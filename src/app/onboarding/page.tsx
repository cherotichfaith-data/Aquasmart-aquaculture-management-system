import type { Metadata } from "next"
import { requireUser } from "@/lib/supabase/require-user"
import { redirectIfFarmExists } from "@/features/farm/queries.server"
import OnboardingEntryChoicePage from "./entry-choice.client"

export const metadata: Metadata = {
  title: "Get Started | AquaSmart",
  description: "Choose whether to create a new farm workspace or join an existing one.",
}

export default async function OnboardingPage() {
  await requireUser()
  await redirectIfFarmExists()

  return <OnboardingEntryChoicePage />
}
