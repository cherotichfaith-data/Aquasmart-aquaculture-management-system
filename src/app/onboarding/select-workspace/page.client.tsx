"use client"

import WorkspaceSelector from "@/components/WorkspaceSelector"
import type { OrganizationSummary } from "@/lib/context"

export default function SelectWorkspacePageClient({
  initialOrganizations,
  initialDisplayName,
  initialUserId,
}: {
  initialOrganizations: OrganizationSummary[]
  initialDisplayName: string | null
  initialUserId: string
}) {
  return (
    <WorkspaceSelector
      initialOrganizations={initialOrganizations}
      initialDisplayName={initialDisplayName}
      initialUserId={initialUserId}
    />
  )
}
