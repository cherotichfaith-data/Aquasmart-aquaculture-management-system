"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useAuth } from "@/components/auth-provider"
import {
  Activity,
  BarChart3,
  ClipboardList,
  Droplets,
  Fish,
  LayoutDashboard,
  LogOut,
  Settings,
  Skull,
  TestTube,
  Warehouse,
  X,
  PlusCircle,
} from "lucide-react"

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Data Entry", href: "/data-entry", icon: PlusCircle },
  { name: "Transactions", href: "/transactions", icon: ClipboardList },
  { name: "Inventory", href: "/inventory", icon: Warehouse },
  { name: "Water Quality", href: "/water-quality", icon: Droplets },
  { name: "Reports", href: "/reports", icon: Activity },
  { name: "Analytics", href: "/analytics", icon: BarChart3 },
  { name: "Sampling", href: "/sampling", icon: TestTube },
  { name: "Feed Management", href: "/feed", icon: Fish },
  { name: "Mortality", href: "/mortality", icon: Skull },
  { name: "Settings", href: "/settings", icon: Settings },
]

export default function Sidebar({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  const pathname = usePathname()
  const router = useRouter()
  const { signOut } = useAuth()

  return (
    <>
      {open && <div className="fixed inset-0 bg-black/50 md:hidden z-30" onClick={onToggle} />}

      <aside
        className={`fixed md:sticky top-0 left-0 h-screen w-64 bg-sidebar border-r border-sidebar-border shadow-lg transform transition-transform duration-300 z-40 flex flex-col ${open ? "translate-x-0" : "-translate-x-full md:translate-x-0"
          }`}
      >
        <div className="flex items-center justify-between p-4 border-b border-sidebar-border md:hidden">
          <h1 className="font-semibold text-lg text-sidebar-foreground">AQ</h1>
          <button onClick={onToggle} className="text-sidebar-foreground">
            <X size={20} />
          </button>
        </div>

        <div className="hidden md:flex items-center gap-3 p-4 border-b border-sidebar-border">
          <div className="w-9 h-9 rounded-sm bg-sidebar-primary flex items-center justify-center shadow-sm">
            <span className="text-sidebar-primary-foreground font-semibold">AQ</span>
          </div>
          <div>
            <p className="font-semibold text-sidebar-foreground leading-none">Aquasmart</p>
            <p className="text-xs text-sidebar-foreground/70">Overview</p>
          </div>
        </div>

        

        <nav className="p-4 space-y-2 flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']">
          {/* <p className="px-2 text-xs uppercase tracking-wide text-sidebar-foreground/60">Menu</p> */}
          {navigation.map((item) => {
            const isActive = pathname === item.href
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-sm transition-colors ${isActive
                  ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  }`}
              >
                <Icon className="h-4 w-4" />
                <span className="text-sm font-medium">{item.name}</span>
              </Link>
            )
          })}
        </nav>

        <div className="p-4 border-t border-sidebar-border">
          <button
            onClick={async () => {
              await signOut()
              router.push("/auth")
            }}
            className="flex items-center gap-3 px-3 py-2.5 w-full rounded-sm text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors cursor-pointer"
          >
            <LogOut className="h-4 w-4" />
            <span className="text-sm font-medium">Log out</span>
          </button>
        </div>
      </aside>
    </>
  )
}
