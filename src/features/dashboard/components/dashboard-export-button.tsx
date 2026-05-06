"use client"

import { Download } from "lucide-react"
import { Button } from "@/components/app-ui/button"

export function DashboardExportButton({
  onClick,
}: {
  onClick: () => void
}) {
  return (
    <Button
      variant="default"
      size="sm"
      onClick={onClick}
      sx={{ mt: "4px", width: { xs: "100%", sm: "auto" } }}
    >
      <Download style={{ width: 16, height: 16 }} />
      Export
    </Button>
  )
}
