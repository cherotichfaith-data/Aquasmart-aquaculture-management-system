"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Header from "./header"
import Sidebar from "./sidebar"
import { ShortcutsHelp } from "@/components/shared/shortcuts-help"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [commandOpen, setCommandOpen] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (target) {
        const tag = target.tagName
        if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target.isContentEditable) {
          return
        }
      }

      const isMeta = event.metaKey || event.ctrlKey
      if (!isMeta) return

      const key = event.key.toLowerCase()
      if (key === "k") {
        event.preventDefault()
        setCommandOpen(true)
        return
      }
      if (key === "n") {
        event.preventDefault()
        router.push("/data-entry")
        return
      }
      if (key === "f" && event.shiftKey) {
        event.preventDefault()
        router.push("/data-entry?type=feeding")
        return
      }
      if (key === "s" && event.shiftKey) {
        event.preventDefault()
        router.push("/data-entry?type=sampling")
      }
    }

    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [router])

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar
        open={sidebarOpen}
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        onCollapseToggle={() => setSidebarCollapsed((prev) => !prev)}
      />
      <div className="flex-1 flex flex-col">
        <Header
          onMenuClick={() => setSidebarOpen(!sidebarOpen)}
        />
        <main className="flex-1 p-6 md:p-8 animate-in fade-in-0 duration-300">{children}</main>
      </div>
      <ShortcutsHelp />
      <Dialog open={commandOpen} onOpenChange={setCommandOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Quick Actions</DialogTitle>
            <DialogDescription>Jump straight to common tasks.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Button variant="outline" onClick={() => { setCommandOpen(false); router.push("/"); }}>
              Go to Dashboard
            </Button>
            <Button variant="outline" onClick={() => { setCommandOpen(false); router.push("/data-entry"); }}>
              New Data Entry
            </Button>
            <Button variant="outline" onClick={() => { setCommandOpen(false); router.push("/data-entry?type=feeding"); }}>
              Record Feeding
            </Button>
            <Button variant="outline" onClick={() => { setCommandOpen(false); router.push("/data-entry?type=sampling"); }}>
              Record Sampling
            </Button>
            <Button variant="outline" onClick={() => { setCommandOpen(false); router.push("/water-quality"); }}>
              Water Quality Dashboard
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
