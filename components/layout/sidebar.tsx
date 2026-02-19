"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useState } from "react"
import { useAuth } from "@/components/providers/auth-provider"
import {
  Activity,
  ClipboardList,
  Droplets,
  Fish,
  LayoutDashboard,
  LogOut,
  Settings,
  TestTube,
  Warehouse,
  X,
  PlusCircle,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react"

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Data Entry", href: "/data-entry", icon: PlusCircle },
  { name: "Inventory (Fish and Feed)", href: "/inventory", icon: Warehouse },
  { name: "Feed Management", href: "/feed", icon: Fish },
  { name: "Sampling and Mortality", href: "/sampling", icon: TestTube },
  { name: "Water-Quality Monitoring", href: "/water-quality", icon: Droplets },
  { name: "Transactions and Activity Log", href: "/transactions", icon: ClipboardList },
  { name: "Reports and Analytics", href: "/reports", icon: Activity },
  { name: "Settings", href: "/settings", icon: Settings },
]

export default function Sidebar({
  open,
  collapsed,
  onToggle,
  onCollapseToggle,
}: {
  open: boolean
  collapsed: boolean
  onToggle: () => void
  onCollapseToggle: () => void
}) {
  const pathname = usePathname()
  const router = useRouter()
  const { signOut } = useAuth()
  const [signingOut, setSigningOut] = useState(false)

  return (
    <>
      {open && <div className="fixed inset-0 bg-black/50 md:hidden z-30" onClick={onToggle} />}

      <aside
        className={`fixed md:sticky top-0 left-0 h-screen bg-sidebar border-r border-sidebar-border shadow-lg transform transition-[width,transform] duration-300 z-40 flex flex-col ${collapsed ? "md:w-20" : "md:w-64"} w-64 ${open ? "translate-x-0" : "-translate-x-full md:translate-x-0"
          }`}
      >
        <div className="flex items-center justify-between p-4 border-b border-sidebar-border md:hidden">
          <h1 className="font-semibold text-lg text-sidebar-foreground">AQ</h1>
          <button onClick={onToggle} className="text-sidebar-foreground">
            <X size={20} />
          </button>
        </div>

        <div className="hidden md:flex items-center p-4 border-b border-sidebar-border">
          <div className="w-9 h-9 rounded-sm bg-sidebar-primary flex items-center justify-center shadow-sm shrink-0">
            <span className="text-sidebar-primary-foreground font-semibold">AQ</span>
          </div>
          {!collapsed && (
            <div className="ml-3">
              <p className="font-semibold text-sidebar-foreground leading-none">Aquasmart</p>
            </div>
          )}
          <button
            type="button"
            onClick={onCollapseToggle}
            className="ml-auto rounded-sm p-1 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />}
          </button>
        </div>
        <nav className="p-4 space-y-2 flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']">
          {navigation.map((item) => {
            const isActive = pathname === item.href
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center px-3 py-2.5 rounded-sm transition-colors ${collapsed ? "justify-center" : "gap-3"} ${isActive
                  ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  }`}
                title={collapsed ? item.name : undefined}
              >
                <Icon className="h-4 w-4" />
                {!collapsed && <span className="text-sm font-medium">{item.name}</span>}
              </Link>
            )
          })}
        </nav>

        <div className="p-4 border-t border-sidebar-border">
          <button
            onClick={async () => {
              if (signingOut) return
              setSigningOut(true)
              try {
                await signOut()
              } finally {
                router.push("/auth")
                setSigningOut(false)
              }
            }}
            className={`flex items-center px-3 py-2.5 w-full rounded-sm text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors cursor-pointer disabled:opacity-60 ${collapsed ? "justify-center" : "gap-3"}`}
            disabled={signingOut}
            title={collapsed ? "Log out" : undefined}
          >
            <LogOut className="h-4 w-4" />
            {!collapsed && <span className="text-sm font-medium">{signingOut ? "Logging out..." : "Log out"}</span>}
          </button>
        </div>
      </aside>
    </>
  )
}
