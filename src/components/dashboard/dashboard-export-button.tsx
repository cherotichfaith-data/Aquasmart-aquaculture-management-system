"use client"

import { Download } from "lucide-react"
import { Button } from "@/components/ui/button"

export function DashboardExportButton({
  onClick,
}: {
  onClick: () => void
}) {
  return (
    <Button
      size="sm"
      onClick={onClick}
      className="mt-1 h-9 gap-2 rounded-md px-4 text-xs font-semibold cursor-pointer bg-sidebar-primary hover:bg-sidebar-primary/85"
    >
      <Download className="h-4 w-4" />
      Export
    </Button>
  )
}
