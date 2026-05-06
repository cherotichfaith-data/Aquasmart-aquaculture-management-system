import type { Metadata } from "next"
import CreateWorkspacePageClient from "./page.client"

export const metadata: Metadata = {
  title: "Create Workspace | AquaSmart",
  description: "Create an AquaSmart organization and farm workspace.",
}

export default function CreateWorkspacePage() {
  return <CreateWorkspacePageClient />
}
