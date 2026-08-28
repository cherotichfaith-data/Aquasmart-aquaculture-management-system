import type { Metadata } from "next"
import CreateWorkspacePageClient from "./page.client"

export const metadata: Metadata = {
  title: "Create Workspace | Samaki360",
  description: "Create a Samaki360 organization and farm workspace.",
}

export default function CreateWorkspacePage() {
  return <CreateWorkspacePageClient />
}
