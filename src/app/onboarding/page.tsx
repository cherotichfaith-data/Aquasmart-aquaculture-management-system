import type { Metadata } from "next"
import { requireUser } from "@/lib/supabase/require-user"
import { redirectIfFarmExists } from "@/features/farm/queries.server"
import OnboardingPageClient from "./page.client"

export const metadata: Metadata = {
  title: "Create Your Farm Workspace | AquaSmart",
  description: "Set up your first farm, default thresholds, and admin workspace.",
}

export default async function OnboardingPage() {
  await requireUser()
  await redirectIfFarmExists()

  return <OnboardingPageClient />
}
