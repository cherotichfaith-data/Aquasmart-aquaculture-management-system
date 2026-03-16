"use client"

import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"
import { useAuth } from "@/components/providers/auth-provider"
import {
  Activity,
  AlertTriangle,
  Droplets,
  Fish,
  LayoutDashboard,
  LogOut,
  Settings,
  TestTube,
  X,
  PlusCircle,
  ChevronsLeft,
  ChevronsRight,
  ChevronDown,
} from "lucide-react"

const navigationSections = [
  {
    title: "Operate",
    items: [
      { name: "Dashboard", href: "/", icon: LayoutDashboard },
      { name: "Feed", href: "/feed", icon: Fish },
      { name: "Growth", href: "/sampling", icon: TestTube },
      { name: "Mortality", href: "/mortality", icon: AlertTriangle },
      { name: "Water Quality", href: "/water-quality", icon: Droplets },
    ],
  },
  {
    title: "Analyze",
    items: [{ name: "Reports", href: "/reports", icon: Activity }],
  },
  {
    title: "Capture",
    items: [{ name: "Data Capture", href: "/data-entry", icon: PlusCircle }],
  },
  {
    title: "Configure",
    items: [{ name: "Settings", href: "/settings", icon: Settings }],
  },
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
  const searchParams = useSearchParams()
  const router = useRouter()
  const { signOut } = useAuth()
  const [signingOut, setSigningOut] = useState(false)
  const [waterQualityOpen, setWaterQualityOpen] = useState(pathname.startsWith("/water-quality"))

  const waterQualityActive = pathname === "/water-quality"
  const tabParam = searchParams.get("tab")
  const overviewActive = waterQualityActive && (!tabParam || tabParam === "overview")
  const parameterActive = waterQualityActive && tabParam === "parameter"
  const alertsActive = waterQualityActive && tabParam === "alerts"
  const sensorsActive = waterQualityActive && tabParam === "sensors"
  const environmentActive = waterQualityActive && tabParam === "environment"
  const depthProfileActive = waterQualityActive && tabParam === "depth"

  useEffect(() => {
    if (waterQualityActive) setWaterQualityOpen(true)
  }, [waterQualityActive])

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
        <nav className="p-4 space-y-5 flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']">
          {navigationSections.map((section) => (
            <div key={section.title} className="space-y-2">
              {!collapsed ? (
                <p className="px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-sidebar-foreground/55">
                  {section.title}
                </p>
              ) : null}
              <div className="space-y-2">
                {section.items.map((item) => {
            if (item.href === "/water-quality") {
              const Icon = item.icon
              if (collapsed) {
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center px-3 py-2.5 rounded-sm transition-colors justify-center ${waterQualityActive
                      ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                      }`}
                    title={item.name}
                  >
                    <Icon className="h-4 w-4" />
                  </Link>
                )
              }

              return (
                <div key={item.href}>
                  <div
                    className={`flex items-center px-3 py-2.5 rounded-sm transition-colors gap-3 ${waterQualityActive
                      ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                      }`}
                  >
                    <Link href={item.href} className="flex items-center gap-3 flex-1">
                      <Icon className="h-4 w-4" />
                      <span className="text-sm font-medium">{item.name}</span>
                    </Link>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.preventDefault()
                        event.stopPropagation()
                        setWaterQualityOpen((prev) => !prev)
                      }}
                      className="rounded-sm p-1 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                      aria-label={waterQualityOpen ? "Collapse water quality menu" : "Expand water quality menu"}
                    >
                      <ChevronDown className={`h-4 w-4 transition-transform ${waterQualityOpen ? "rotate-180" : ""}`} />
                    </button>
                  </div>
                  {waterQualityOpen && (
                    <div className="ml-7 mt-1 space-y-1">
                      <Link
                        href="/water-quality"
                        className={`block rounded-sm px-3 py-2 text-xs font-medium transition-colors ${overviewActive
                          ? "bg-sidebar-accent text-sidebar-accent-foreground"
                          : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                          }`}
                      >
                        Overview
                      </Link>
                      <Link
                        href="/water-quality?tab=parameter"
                        className={`block rounded-sm px-3 py-2 text-xs font-medium transition-colors ${parameterActive
                          ? "bg-sidebar-accent text-sidebar-accent-foreground"
                          : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                          }`}
                      >
                        Parameter Analysis
                      </Link>
                      <Link
                        href="/water-quality?tab=environment"
                        className={`block rounded-sm px-3 py-2 text-xs font-medium transition-colors ${environmentActive
                          ? "bg-sidebar-accent text-sidebar-accent-foreground"
                          : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                          }`}
                      >
                        Environmental Indicators
                      </Link>
                      <Link
                        href="/water-quality?tab=depth"
                        className={`block rounded-sm px-3 py-2 text-xs font-medium transition-colors ${depthProfileActive
                          ? "bg-sidebar-accent text-sidebar-accent-foreground"
                          : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                          }`}
                      >
                        Stratification Analysis
                      </Link>
                      <Link
                        href="/water-quality?tab=alerts"
                        className={`block rounded-sm px-3 py-2 text-xs font-medium transition-colors ${alertsActive
                          ? "bg-sidebar-accent text-sidebar-accent-foreground"
                          : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                          }`}
                      >
                        Alerts
                      </Link>
                      <Link
                        href="/water-quality?tab=sensors"
                        className={`block rounded-sm px-3 py-2 text-xs font-medium transition-colors ${sensorsActive
                          ? "bg-sidebar-accent text-sidebar-accent-foreground"
                          : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                          }`}
                      >
                        Sensor Activity
                      </Link>
                    </div>
                  )}
                </div>
              )
            }

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
              </div>
            </div>
          ))}
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
