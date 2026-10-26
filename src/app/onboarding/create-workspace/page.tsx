import type { Metadata } from "next"
import CreateWorkspacePageClient from "./page.client"

export const metadata: Metadata = {
  title: "Create Workspace | SUSTAIN Aquasmart",
  description: "Create a SUSTAIN Aquasmart organization and farm workspace.",
}

export default function CreateWorkspacePage() {
  return <CreateWorkspacePageClient />
}
