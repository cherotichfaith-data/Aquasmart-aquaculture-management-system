"use client"

import WorkspaceSelector from "@/components/WorkspaceSelector"
import type { OrganizationSummary } from "@/lib/context"

export default function SelectWorkspacePageClient({
  initialOrganizations,
}: {
  initialOrganizations: OrganizationSummary[]
}) {
  return <WorkspaceSelector initialOrganizations={initialOrganizations} />
}
