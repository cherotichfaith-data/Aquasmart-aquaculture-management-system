"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Header from "./header"
import Sidebar from "./sidebar"
import { ShortcutsHelp } from "@/components/shared/shortcuts-help"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

export default function DashboardLayout({
  children,
  hideHeader = false,
  showHeaderToolbar = true,
}: {
  children: React.ReactNode
  hideHeader?: boolean
  showHeaderToolbar?: boolean
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [commandOpen, setCommandOpen] = useState(false)
  const router = useRouter()

  useEffect(() => {
    if (typeof window === "undefined") return

    const storedCollapsed = window.localStorage.getItem("dashboard:sidebar-collapsed")
    const applyResponsiveSidebarState = () => {
      const isDesktop = window.innerWidth >= 768
      setSidebarOpen(isDesktop)

      if (storedCollapsed == null) {
        setSidebarCollapsed(window.innerWidth < 1280)
      }
    }

    if (storedCollapsed === "true") setSidebarCollapsed(true)
    if (storedCollapsed === "false") setSidebarCollapsed(false)

    applyResponsiveSidebarState()
    window.addEventListener("resize", applyResponsiveSidebarState)

    return () => {
      window.removeEventListener("resize", applyResponsiveSidebarState)
    }
  }, [])

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
    <div className="relative flex min-h-screen bg-background">
      <Sidebar
        open={sidebarOpen}
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        onCollapseToggle={() =>
          setSidebarCollapsed((prev) => {
            const next = !prev
            if (typeof window !== "undefined") {
              window.localStorage.setItem("dashboard:sidebar-collapsed", String(next))
            }
            return next
          })
        }
      />
      <div className="relative flex min-w-0 flex-1 flex-col">
        {hideHeader ? null : (
          <Header
            onMenuClick={() => setSidebarOpen(!sidebarOpen)}
            showToolbar={showHeaderToolbar}
          />
        )}
        <main
          className={
            hideHeader
              ? "flex-1 overflow-x-hidden px-3 pb-8 pt-3 sm:px-4 md:px-6 md:pb-10 md:pt-4 lg:px-10 animate-in fade-in-0 duration-300"
              : showHeaderToolbar
                ? "flex-1 overflow-x-hidden px-3 pb-8 pt-4 sm:px-4 md:px-6 md:pb-10 md:pt-5 lg:px-10 animate-in fade-in-0 duration-300"
                : "flex-1 overflow-x-hidden px-3 pb-8 pt-0 sm:px-4 md:px-6 md:pb-10 md:pt-0 lg:px-10 animate-in fade-in-0 duration-300"
          }
        >
          <div className="mx-auto w-full max-w-[1720px]">{children}</div>
        </main>
      </div>
      <ShortcutsHelp />
      <Dialog open={commandOpen} onOpenChange={setCommandOpen}>
        <DialogContent className="rounded-[1.5rem] border-border/80 bg-card/95 backdrop-blur-xl">
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
