import type { Metadata } from "next"
import { requireUser } from "@/lib/supabase/require-user"
import { redirectIfFarmExists } from "@/features/farm/queries.server"
import JoinFarmPageClient from "./page.client"

export const metadata: Metadata = {
  title: "Join Farm Workspace | AquaSmart",
  description: "Join an existing AquaSmart farm workspace using an invite or access code.",
}

export default async function JoinFarmPage() {
  await requireUser()
  await redirectIfFarmExists()

  return <JoinFarmPageClient />
}
