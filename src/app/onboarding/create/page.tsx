import type { Metadata } from "next"
import { requireUser } from "@/lib/supabase/require-user"
import { redirectIfFarmExists } from "@/features/farm/queries.server"
import CreateFarmWorkspacePage from "../page.client"

export const metadata: Metadata = {
  title: "Create Farm Workspace | AquaSmart",
  description: "Create a new AquaSmart farm workspace and become its first admin.",
}

export default async function CreateFarmPage() {
  await requireUser()
  await redirectIfFarmExists()

  return <CreateFarmWorkspacePage />
}
