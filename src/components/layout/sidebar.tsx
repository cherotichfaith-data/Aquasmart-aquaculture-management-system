"use client"

import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import { useAuth } from "@/components/providers/auth-provider"
import { useActiveFarm } from "@/lib/hooks/app/use-active-farm"
import { useActiveFarmRole } from "@/lib/hooks/use-active-farm-role"
import {
  Activity,
  AlertTriangle,
  BarChart3,
  ChevronDown,
  Droplets,
  Fish,
  LayoutDashboard,
  LogOut,
  Settings,
  TestTube,
  Users,
  X,
  PlusCircle,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react"

// All possible nav items with section grouping
const ALL_NAV_SECTIONS = [
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
    items: [
      { name: "Production", href: "/production", icon: BarChart3 },
      { name: "Reports", href: "/reports", icon: Activity },
    ],
  },
  {
    title: "Capture",
    items: [{ name: "Data Entry", href: "/data-entry", icon: PlusCircle }],
  },
  {
    title: "Configure",
    items: [
      { name: "Settings", href: "/settings", icon: Settings },
      { name: "Users", href: "/settings/users", icon: Users },
    ],
  },
]

// Routes visible per role. null/undefined = show all (admin/farm_manager default)
const ROLE_ALLOWED_ROUTES: Record<string, Set<string>> = {
  admin:                 new Set(["/"   , "/feed", "/sampling", "/mortality", "/water-quality", "/production", "/reports", "/data-entry", "/settings", "/settings/users"]),
  farm_manager:          new Set(["/"   , "/feed", "/sampling", "/mortality", "/water-quality", "/production", "/reports", "/data-entry", "/settings"]),
  farm_technician:       new Set(["/data-entry", "/feed", "/sampling", "/mortality", "/water-quality"]),
  inventory_storekeeper: new Set(["/data-entry"]),
  analyst_planner:       new Set(["/"   , "/production", "/reports"]),
  viewer_auditor:        new Set(["/"   , "/reports"]),
}

const ROLE_ITEM_LABELS: Record<string, Record<string, string>> = {
  inventory_storekeeper: { "/data-entry": "Inventory Entry" },
}

// For farm_technician the workboard link gets the feed type pre-selected
const ROLE_ITEM_HREFS: Record<string, Record<string, string>> = {
  farm_technician:       { "/data-entry": "/data-entry?type=feeding" },
  inventory_storekeeper: { "/data-entry": "/data-entry?type=incoming_feed" },
}

function getVisibleSections(role: string | null | undefined) {
  const allowed = role ? (ROLE_ALLOWED_ROUTES[role] ?? null) : null
  if (!allowed) return []
  return ALL_NAV_SECTIONS
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => allowed.has(item.href)),
    }))
    .filter((section) => section.items.length > 0)
}

function resolveItemLabel(role: string | null | undefined, href: string, defaultName: string) {
  if (!role) return defaultName
  return ROLE_ITEM_LABELS[role]?.[href] ?? defaultName
}

function resolveItemHref(role: string | null | undefined, href: string) {
  if (!role) return href
  return ROLE_ITEM_HREFS[role]?.[href] ?? href
}

const waterQualityLinks = [
  { href: "/water-quality", label: "Overview", activeKey: "overview" },
  { href: "/water-quality?tab=parameter", label: "Parameter Analysis", activeKey: "parameter" },
  { href: "/water-quality?tab=environment", label: "Environmental Indicators", activeKey: "environment" },
  { href: "/water-quality?tab=depth", label: "Stratification Analysis", activeKey: "depth" },
  { href: "/water-quality?tab=alerts", label: "Alerts", activeKey: "alerts" },
  { href: "/water-quality?tab=sensors", label: "System Coverage", activeKey: "sensors" },
] as const

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
  const { farm, farmId } = useActiveFarm()
  const farmRoleQuery = useActiveFarmRole(farmId)
  const farmRole = farmRoleQuery.data ?? null
  const navigationSections = useMemo(() => getVisibleSections(farmRole), [farmRole])
  const [signingOut, setSigningOut] = useState(false)
  const [waterQualityOpen, setWaterQualityOpen] = useState(pathname.startsWith("/water-quality"))
  const [collapsedWaterQualityFlyoutOpen, setCollapsedWaterQualityFlyoutOpen] = useState(false)

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

  useEffect(() => {
    if (!collapsed) {
      setCollapsedWaterQualityFlyoutOpen(false)
    }
  }, [collapsed, pathname])

  const handleMobileNavigate = () => {
    if (typeof window !== "undefined" && window.innerWidth < 768 && open) {
      onToggle()
    }
  }

  const desktopWidthClass = collapsed ? "md:w-[4.75rem]" : "md:w-[14.5rem] xl:w-[15.5rem]"
  const navItemClass = (active: boolean, compact = false) =>
    `flex items-center rounded-2xl transition-colors ${
      compact ? "gap-3 px-3 py-2.5 md:justify-center md:gap-0 md:px-2.5" : "gap-3 px-3 py-2.5"
    } ${
      active
        ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
        : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
    }`

  const waterQualityLinkClass = (active: boolean) =>
    `block rounded-xl px-3 py-2 text-xs font-medium transition-colors ${
      active
        ? "bg-sidebar-accent text-sidebar-accent-foreground"
        : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
    }`

  return (
    <>
      {open && <div className="fixed inset-0 bg-black/50 md:hidden z-30" onClick={onToggle} />}

      <aside
        className={`fixed md:sticky top-0 left-0 h-screen bg-sidebar shadow-[0_24px_54px_-40px_rgba(15,23,32,0.52)] transform transition-[width,transform] duration-300 z-40 flex flex-col ${desktopWidthClass} w-[min(82vw,17rem)] ${open ? "translate-x-0" : "-translate-x-full md:translate-x-0"
          }`}
        style={{
          backgroundImage:
            "linear-gradient(180deg, var(--sidebar-sheen), transparent 18%), radial-gradient(circle at top right, var(--sidebar-glow), transparent 28%)",
        }}
      >
        <div className="flex items-center justify-between px-4 py-3.5 md:hidden">
          <div>
            <h1 className="font-semibold text-base text-sidebar-foreground">AQ</h1>
            <p className="max-w-[12rem] truncate text-[11px] text-sidebar-foreground/65">
              {farm?.name ?? "Aquasmart"}
            </p>
          </div>
          <button onClick={onToggle} className="rounded-xl p-2 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
            <X size={20} />
          </button>
        </div>

        <div className="hidden px-3 py-4 md:flex md:flex-col md:items-stretch md:gap-3">
          <div className="flex items-center">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-sidebar-primary shadow-sm">
            <span className="text-sm font-semibold text-sidebar-primary-foreground">AQ</span>
            </div>
            {!collapsed && (
              <div className="ml-3">
                <p className="font-semibold leading-none text-sidebar-foreground">Aquasmart</p>
                <p className="mt-1 truncate text-[11px] text-sidebar-foreground/60">
                  {farm?.name ?? "No farm selected"}
                </p>
              </div>
            )}
            <button
              type="button"
              onClick={onCollapseToggle}
              className="ml-auto rounded-xl p-2 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {collapsed ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />}
            </button>
          </div>
        </div>
        <nav className="flex-1 space-y-4 overflow-y-auto px-2.5 py-3 md:px-3 md:py-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']">
          {navigationSections.map((section) => (
            <div key={section.title} className="space-y-1.5">
              <p
                className={`px-3 text-[9px] font-semibold uppercase tracking-[0.22em] text-sidebar-foreground/45 ${
                  collapsed ? "md:hidden" : ""
                }`}
              >
                {section.title}
              </p>
              <div className="space-y-1.5">
                {section.items.map((item) => {
            if (item.href === "/water-quality") {
              const Icon = item.icon
              if (collapsed) {
                return (
                  <div key={item.href}>
                    <div
                      className="relative hidden md:block"
                      onMouseEnter={() => setCollapsedWaterQualityFlyoutOpen(true)}
                      onMouseLeave={() => setCollapsedWaterQualityFlyoutOpen(false)}
                    >
                      <button
                        type="button"
                        onClick={() => setCollapsedWaterQualityFlyoutOpen((prev) => !prev)}
                        className={navItemClass(waterQualityActive || collapsedWaterQualityFlyoutOpen, true)}
                        title={item.name}
                        aria-label="Open water quality navigation"
                        aria-expanded={collapsedWaterQualityFlyoutOpen}
                      >
                        <Icon className="h-4 w-4" />
                      </button>
                      {collapsedWaterQualityFlyoutOpen ? (
                        <div className="absolute left-[calc(100%+0.65rem)] top-1/2 z-50 hidden w-56 -translate-y-1/2 rounded-[1.15rem] border border-sidebar-border bg-sidebar/95 p-2 shadow-[0_24px_54px_-28px_rgba(15,23,32,0.42)] backdrop-blur-xl md:block">
                          <div className="px-2 pb-2 pt-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-sidebar-foreground/55">
                            Water Quality
                          </div>
                          <div className="space-y-1">
                            {waterQualityLinks.map((link) => {
                              const isActive =
                                (link.activeKey === "overview" && overviewActive) ||
                                (link.activeKey === "parameter" && parameterActive) ||
                                (link.activeKey === "environment" && environmentActive) ||
                                (link.activeKey === "depth" && depthProfileActive) ||
                                (link.activeKey === "alerts" && alertsActive) ||
                                (link.activeKey === "sensors" && sensorsActive)

                              return (
                                <Link
                                  key={link.href}
                                  href={link.href}
                                  className={waterQualityLinkClass(isActive)}
                                  onClick={() => {
                                    setCollapsedWaterQualityFlyoutOpen(false)
                                    handleMobileNavigate()
                                  }}
                                >
                                  {link.label}
                                </Link>
                              )
                            })}
                          </div>
                        </div>
                      ) : null}
                    </div>
                    <div className="md:hidden">
                      <div className={navItemClass(waterQualityActive)}>
                        <Link href={item.href} onClick={handleMobileNavigate} className="flex items-center gap-3 flex-1">
                          <Icon className="h-4 w-4" />
                          <span className="min-w-0 truncate text-sm font-medium">{item.name}</span>
                        </Link>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.preventDefault()
                            event.stopPropagation()
                            setWaterQualityOpen((prev) => !prev)
                          }}
                          className="rounded-xl p-1 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                          aria-label={waterQualityOpen ? "Collapse water quality menu" : "Expand water quality menu"}
                        >
                          <ChevronDown className={`h-4 w-4 transition-transform ${waterQualityOpen ? "rotate-180" : ""}`} />
                        </button>
                      </div>
                      {waterQualityOpen && (
                        <div className="ml-5 mt-1.5 space-y-1">
                          {waterQualityLinks.map((link) => {
                            const isActive =
                              (link.activeKey === "overview" && overviewActive) ||
                              (link.activeKey === "parameter" && parameterActive) ||
                              (link.activeKey === "environment" && environmentActive) ||
                              (link.activeKey === "depth" && depthProfileActive) ||
                              (link.activeKey === "alerts" && alertsActive) ||
                              (link.activeKey === "sensors" && sensorsActive)

                            return (
                              <Link
                                key={link.href}
                                href={link.href}
                                onClick={handleMobileNavigate}
                                className={waterQualityLinkClass(isActive)}
                              >
                                {link.label}
                              </Link>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )
              }

              return (
                <div key={item.href}>
                  <div
                    className={navItemClass(waterQualityActive)}
                  >
                    <Link href={item.href} onClick={handleMobileNavigate} className="flex items-center gap-3 flex-1">
                      <Icon className="h-4 w-4" />
                      <span className="min-w-0 truncate text-sm font-medium">{item.name}</span>
                    </Link>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.preventDefault()
                        event.stopPropagation()
                        setWaterQualityOpen((prev) => !prev)
                      }}
                      className="rounded-xl p-1 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                      aria-label={waterQualityOpen ? "Collapse water quality menu" : "Expand water quality menu"}
                    >
                      <ChevronDown className={`h-4 w-4 transition-transform ${waterQualityOpen ? "rotate-180" : ""}`} />
                    </button>
                  </div>
                  {waterQualityOpen && (
                    <div className="ml-5 mt-1.5 space-y-1">
                      {waterQualityLinks.map((link) => {
                        const isActive =
                          (link.activeKey === "overview" && overviewActive) ||
                          (link.activeKey === "parameter" && parameterActive) ||
                          (link.activeKey === "environment" && environmentActive) ||
                          (link.activeKey === "depth" && depthProfileActive) ||
                          (link.activeKey === "alerts" && alertsActive) ||
                          (link.activeKey === "sensors" && sensorsActive)

                        return (
                          <Link
                            key={link.href}
                            href={link.href}
                            onClick={handleMobileNavigate}
                            className={waterQualityLinkClass(isActive)}
                          >
                            {link.label}
                          </Link>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            }

            const resolvedHref = resolveItemHref(farmRole, item.href)
            const resolvedLabel = resolveItemLabel(farmRole, item.href, item.name)
            const isActive = pathname === item.href ||
              pathname === resolvedHref.split("?")[0] ||
              (item.href !== "/" && pathname.startsWith(item.href + "/"))
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={resolvedHref}
                onClick={handleMobileNavigate}
                className={navItemClass(isActive, collapsed)}
                title={collapsed ? resolvedLabel : undefined}
              >
                <Icon className="h-4 w-4" />
                <span className={`min-w-0 truncate text-sm font-medium ${collapsed ? "md:hidden" : ""}`}>{resolvedLabel}</span>
              </Link>
            )
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="p-3 md:p-3.5">
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
            className={`flex w-full items-center rounded-2xl px-3 py-2.5 text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground disabled:opacity-60 ${collapsed ? "justify-center" : "gap-3"}`}
            disabled={signingOut}
            title={collapsed ? "Log out" : undefined}
          >
            <LogOut className="h-4 w-4" />
            <span className={`text-sm font-medium ${collapsed ? "md:hidden" : ""}`}>
              {signingOut ? "Logging out..." : "Log out"}
            </span>
          </button>
        </div>
      </aside>
    </>
  )
}
