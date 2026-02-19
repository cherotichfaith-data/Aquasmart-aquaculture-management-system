"use client"

import type React from "react"

import { useState } from "react"
import Header from "./header"
import Sidebar from "./sidebar"

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

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
    </div>
  )
}
