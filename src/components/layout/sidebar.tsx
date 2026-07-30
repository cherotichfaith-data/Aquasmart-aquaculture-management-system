"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"
import { useEffect, useMemo, useRef, useState, type MouseEvent } from "react"
import { useAuth } from "@/components/providers/auth-provider"
import { useActiveFarm } from "@/lib/hooks/app/use-active-farm"
import { useActiveFarmRole } from "@/lib/hooks/use-active-farm-role"
import { DATA_ENTRY_PATH, stripDashboardPath, toDashboardPath } from "@/lib/app-entry"
import { Button } from "@/components/app-ui/button"
import { Collapsible } from "@/components/app-ui/collapsible"
import { Menu, MenuItem } from "@/components/app-ui/menu"
import { Sheet } from "@/components/app-ui/sheet"
import { Skeleton } from "@/components/app-ui/skeleton"
import { Tooltip } from "@/components/app-ui/tooltip"
import { cn } from "@/lib/utils"
import {
  Activity,
  BarChart3,
  ChevronDown,
  Droplets,
  Fish,
  LayoutDashboard,
  LogOut,
  Menu as MenuIcon,
  PlusCircle,
  Settings,
  TestTube,
  Users,
  X,
} from "lucide-react"

export const DASHBOARD_SIDEBAR_WIDTH = 248
export const DASHBOARD_SIDEBAR_COLLAPSED_WIDTH = 88

const ALL_NAV_SECTIONS = [
  {
    title: "Operate",
    items: [
      { name: "Dashboard", href: toDashboardPath("/"), icon: LayoutDashboard },
      { name: "Growth", href: toDashboardPath("/sampling"), icon: TestTube },
      { name: "Water Quality", href: toDashboardPath("/water-quality"), icon: Droplets },
    ],
  },
  {
    title: "Analyze",
    items: [
      { name: "Feed", href: toDashboardPath("/feed"), icon: Fish },
      { name: "Production", href: toDashboardPath("/production"), icon: BarChart3 },
      { name: "Reports", href: toDashboardPath("/reports"), icon: Activity },
    ],
  },
  {
    title: "Capture",
    items: [{ name: "Data Entry", href: DATA_ENTRY_PATH, icon: PlusCircle }],
  },
  {
    title: "Configure",
    items: [
      { name: "Settings", href: toDashboardPath("/settings"), icon: Settings },
      { name: "Users", href: "/users", icon: Users },
    ],
  },
] as const

const ROLE_ALLOWED_ROUTES: Record<string, Set<string>> = {
  admin: new Set([
    toDashboardPath("/"),
    toDashboardPath("/sampling"),
    toDashboardPath("/water-quality"),
    toDashboardPath("/feed"),
    toDashboardPath("/production"),
    toDashboardPath("/reports"),
    DATA_ENTRY_PATH,
    toDashboardPath("/settings"),
    "/users",
  ]),
  farm_manager: new Set([
    toDashboardPath("/"),
    toDashboardPath("/sampling"),
    toDashboardPath("/water-quality"),
    toDashboardPath("/feed"),
    toDashboardPath("/production"),
    toDashboardPath("/reports"),
    DATA_ENTRY_PATH,
    toDashboardPath("/settings"),
  ]),
  system_operator: new Set([
    DATA_ENTRY_PATH,
    toDashboardPath("/sampling"),
    toDashboardPath("/water-quality"),
  ]),
  data_analyst: new Set([toDashboardPath("/"), toDashboardPath("/feed"), toDashboardPath("/production"), toDashboardPath("/reports")]),
  viewer: new Set([toDashboardPath("/"), toDashboardPath("/feed"), toDashboardPath("/reports")]),
}

const ROLE_ITEM_LABELS: Record<string, Record<string, string>> = {
  system_operator: { [DATA_ENTRY_PATH]: "Data Entry" },
}

const ROLE_ITEM_HREFS: Record<string, Record<string, string>> = {
  system_operator: { [DATA_ENTRY_PATH]: `${DATA_ENTRY_PATH}?type=feeding` },
}

const waterQualityLinks = [
  { href: toDashboardPath("/water-quality"), label: "Overview", activeKey: "overview" },
  { href: `${toDashboardPath("/water-quality")}?tab=parameter`, label: "Parameter Analysis", activeKey: "parameter" },
  {
    href: `${toDashboardPath("/water-quality")}?tab=environment`,
    label: "Environmental Indicators",
    activeKey: "environment",
  },
  { href: `${toDashboardPath("/water-quality")}?tab=depth`, label: "Stratification Analysis", activeKey: "depth" },
  { href: `${toDashboardPath("/water-quality")}?tab=alerts`, label: "Alerts", activeKey: "alerts" },
  { href: `${toDashboardPath("/water-quality")}?tab=sensors`, label: "System Coverage", activeKey: "sensors" },
] as const

function getVisibleSections(role: string | null | undefined) {
  const allowed = role ? (ROLE_ALLOWED_ROUTES[role] ?? null) : null
  if (!allowed) return []
  return ALL_NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter((item) => allowed.has(item.href)),
  })).filter((section) => section.items.length > 0)
}

function resolveItemLabel(role: string | null | undefined, href: string, defaultName: string) {
  if (!role) return defaultName
  return ROLE_ITEM_LABELS[role]?.[href] ?? defaultName
}

function resolveItemHref(role: string | null | undefined, href: string) {
  if (!role) return href
  return ROLE_ITEM_HREFS[role]?.[href] ?? href
}

type SidebarContentProps = {
  collapsed: boolean
  onClose: () => void
  onCollapseToggle: () => void
  mobile: boolean
  initialFarmId?: string | null
  initialFarmName?: string | null
  roleOverride?: string | null
}

function LogoBlock({
  collapsed,
  mobile,
  onClose,
  onCollapseToggle,
}: {
  collapsed: boolean
  mobile: boolean
  onClose: () => void
  onCollapseToggle: () => void
}) {
  return (
    <div className={cn("flex min-h-[72px] items-center justify-between py-3", collapsed && !mobile ? "px-3" : "px-5")}>
      <div className="min-w-0 flex-1">
        <Link
          href={toDashboardPath("/")}
          className="flex min-w-0 items-center gap-3 transition-opacity hover:opacity-90"
          onClick={mobile ? onClose : undefined}
        >
          <Image src="/use this.png" alt="AquaSmart logo" width={36} height={36} className="h-9 w-9 shrink-0" priority />
          {!collapsed || mobile ? (
            <span className="text-[1.1rem] font-bold text-[color:var(--color-sidebar-foreground)]">AquaSmart</span>
          ) : null}
        </Link>
      </div>
      {mobile ? (
        <button
          type="button"
          onClick={onClose}
          aria-label="Close navigation"
          className="inline-flex size-9 items-center justify-center rounded-full text-[color:var(--color-sidebar-foreground)] transition-colors hover:bg-white/10"
        >
          <X size={18} />
        </button>
      ) : (
        <Tooltip content={collapsed ? "Expand sidebar" : "Collapse sidebar"}>
          <button
            type="button"
            onClick={onCollapseToggle}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="inline-flex size-9 items-center justify-center rounded-full text-[color:var(--color-sidebar-foreground)] transition-colors hover:bg-white/10"
          >
            <MenuIcon size={18} />
          </button>
        </Tooltip>
      )}
    </div>
  )
}

function SidebarContent({
  collapsed,
  onClose,
  onCollapseToggle,
  mobile,
  initialFarmId,
  initialFarmName,
  roleOverride,
}: SidebarContentProps) {
  const pathname = usePathname()
  const appPathname = stripDashboardPath(pathname)
  const searchParams = useSearchParams()
  const { signOut } = useAuth()
  const { farm, farmId } = useActiveFarm({ initialFarmId, initialFarmName })
  const farmRoleQuery = useActiveFarmRole(roleOverride ? null : farmId)
  const farmRole = roleOverride ?? farmRoleQuery.data ?? null
  const isRoleLoading = roleOverride == null && farmRoleQuery.isLoading
  const navigationSections = useMemo(() => getVisibleSections(farmRole), [farmRole])
  const [signingOut, setSigningOut] = useState(false)
  const [waterQualityOpen, setWaterQualityOpen] = useState(appPathname.startsWith("/water-quality"))
  const [waterQualityMenuAnchor, setWaterQualityMenuAnchor] = useState<HTMLElement | null>(null)
  const flyoutTriggerRef = useRef<HTMLButtonElement>(null)

  const farmName = farm?.name ?? initialFarmName ?? null
  const waterQualityActive = appPathname === "/water-quality"
  const tabParam = searchParams.get("tab")
  const activeWaterQualityKey = !tabParam || tabParam === "overview" ? "overview" : tabParam
  // Navigation should carry the user's working context between sections.
  // Without this, opening Production from another section removes `system`
  // and Production falls back to the lowest database ID (Cage 2B here).
  const withCurrentContext = (href: string) => {
    const [basePath, query = ""] = href.split("?", 2)
    const nextParams = new URLSearchParams(query)
    for (const key of ["farmId", "system", "cage", "date", "batch", "stage"]) {
      const value = searchParams.get(key)
      if (value != null && !nextParams.has(key)) nextParams.set(key, value)
    }
    const nextQuery = nextParams.toString()
    return nextQuery ? `${basePath}?${nextQuery}` : basePath
  }

  useEffect(() => {
    if (waterQualityActive) setWaterQualityOpen(true)
  }, [waterQualityActive])

  useEffect(() => {
    if (!collapsed) {
      setWaterQualityMenuAnchor(null)
    }
  }, [collapsed])

  const closeAfterNavigate = () => {
    setWaterQualityMenuAnchor(null)
    if (mobile) {
      onClose()
    }
  }

  const renderWaterQualityMenuItems = (dense = false) =>
    waterQualityLinks.map((link) => {
      const isActive = link.activeKey === activeWaterQualityKey
      return (
        <MenuItem
          key={link.href}
          href={withCurrentContext(link.href)}
          selected={isActive}
          onClick={closeAfterNavigate}
          dense={dense}
        >
          {link.label}
        </MenuItem>
      )
    })

  return (
    <div
      className="flex h-full w-full flex-col overflow-y-auto overflow-x-hidden border-r [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      style={{
        borderColor: "var(--color-sidebar-border)",
        backgroundColor: "var(--color-sidebar)",
        color: "var(--color-sidebar-foreground)",
      }}
    >
      <LogoBlock collapsed={collapsed} mobile={mobile} onClose={onClose} onCollapseToggle={onCollapseToggle} />
      {farmId && farmName && (!collapsed || mobile) ? (
        <div className="px-4 py-3">
          <div
            title={farmName}
            className="flex items-center gap-2 rounded-xl border px-3 py-2.5"
            style={{
              borderColor: "var(--color-sidebar-border)",
              backgroundColor: "color-mix(in srgb, var(--color-sidebar-accent) 82%, white 18%)",
            }}
          >
            <span aria-hidden className="size-2 shrink-0 rounded-full bg-primary" />
            <span className="text-sm font-semibold">Farm:</span>
            <span className="min-w-0 truncate text-sm">{farmName}</span>
          </div>
        </div>
      ) : null}
      <div className="flex-1 px-2.5 py-3">
        {isRoleLoading ? (
          <div className="grid gap-1.5 px-1">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-11 rounded-[1.25rem]" />
            ))}
          </div>
        ) : (
          navigationSections.map((section) => (
            <div key={section.title} className="mb-5">
              {!collapsed || mobile ? (
                <span className="block px-2.5 pb-1 font-mono text-[11px] uppercase tracking-[0.08em] opacity-80" style={{ color: "var(--color-sidebar-accent-foreground)" }}>
                  {section.title}
                </span>
              ) : null}
              <div className="grid gap-1">
                {section.items.map((item) => {
                  if (item.href === toDashboardPath("/water-quality")) {
                    const Icon = item.icon

                    if (collapsed && !mobile) {
                      return (
                        <div key={item.href}>
                          <Tooltip content="Water Quality" side="right" wrapperClassName="flex w-full [&>*]:w-full">
                            <button
                              ref={flyoutTriggerRef}
                              type="button"
                              onClick={(event: MouseEvent<HTMLElement>) => setWaterQualityMenuAnchor(event.currentTarget)}
                              className={cn(
                                "flex min-h-12 w-full items-center justify-center rounded-2xl px-3 transition-colors hover:bg-white/10",
                                waterQualityActive && "bg-white/15",
                              )}
                            >
                              <Icon size={18} />
                            </button>
                          </Tooltip>
                          <Menu
                            anchorEl={waterQualityMenuAnchor}
                            open={Boolean(waterQualityMenuAnchor)}
                            onClose={() => setWaterQualityMenuAnchor(null)}
                            side="right"
                            align="center"
                            dense
                          >
                            {renderWaterQualityMenuItems(true)}
                          </Menu>
                        </div>
                      )
                    }

                    return (
                      <div key={item.href}>
                        <div
                          className={cn(
                            "flex min-h-12 items-center rounded-2xl px-1.5 transition-colors",
                            waterQualityActive && "bg-white/15",
                          )}
                        >
                          <Link
                            href={withCurrentContext(item.href)}
                            onClick={closeAfterNavigate}
                            className="flex min-w-0 flex-1 items-center gap-3 px-2 py-2 text-current no-underline"
                          >
                            <Icon size={18} />
                            <span className="truncate text-sm font-semibold">{item.name}</span>
                          </Link>
                          <button
                            type="button"
                            onClick={(event) => {
                              event.preventDefault()
                              event.stopPropagation()
                              setWaterQualityOpen((prev) => !prev)
                            }}
                            aria-label={waterQualityOpen ? "Collapse water quality menu" : "Expand water quality menu"}
                            className="inline-flex size-8 shrink-0 items-center justify-center rounded-full text-current hover:bg-white/10"
                          >
                            <ChevronDown size={16} className={cn("transition-transform duration-200", waterQualityOpen && "rotate-180")} />
                          </button>
                        </div>
                        <Collapsible open={waterQualityOpen}>
                          <div className="ml-4 mt-1 grid gap-0.5">
                            {waterQualityLinks.map((link) => (
                              <Link
                                key={link.href}
                                href={withCurrentContext(link.href)}
                                onClick={closeAfterNavigate}
                                className={cn(
                                  "flex min-h-[38px] items-center rounded-xl px-3 text-[12px] font-semibold text-current no-underline transition-colors hover:bg-white/10",
                                  link.activeKey === activeWaterQualityKey && "bg-white/15",
                                )}
                              >
                                {link.label}
                              </Link>
                            ))}
                          </div>
                        </Collapsible>
                      </div>
                    )
                  }

                  const resolvedHref = resolveItemHref(farmRole, item.href)
                  const contextualHref = withCurrentContext(resolvedHref)
                  const resolvedLabel = resolveItemLabel(farmRole, item.href, item.name)
                  const itemBasePath = stripDashboardPath(item.href)
                  const resolvedBasePath = stripDashboardPath(resolvedHref.split("?")[0] ?? resolvedHref)
                  const isActive =
                    appPathname === itemBasePath ||
                    appPathname === resolvedBasePath ||
                    (itemBasePath !== "/" && appPathname.startsWith(`${itemBasePath}/`))
                  const Icon = item.icon

                  const link = (
                    <Link
                      href={contextualHref}
                      onClick={closeAfterNavigate}
                      className={cn(
                        "flex min-h-12 items-center gap-3 rounded-2xl text-current no-underline transition-colors hover:bg-white/10",
                        collapsed && !mobile ? "justify-center px-3" : "px-3.5",
                        isActive && "bg-white/15",
                      )}
                    >
                      <Icon size={18} />
                      {!collapsed || mobile ? <span className="truncate text-sm font-semibold">{resolvedLabel}</span> : null}
                    </Link>
                  )

                  return (
                    <Tooltip
                      key={item.href}
                      content={collapsed && !mobile ? resolvedLabel : undefined}
                      side="right"
                      disabled={!collapsed || mobile}
                      wrapperClassName="flex w-full [&>*]:w-full"
                    >
                      {link}
                    </Tooltip>
                  )
                })}
              </div>
            </div>
          ))
        )}
      </div>
      <div className="p-3">
        <Button
          variant="ghost"
          disabled={signingOut}
          onClick={async () => {
            if (signingOut) return
            setSigningOut(true)
            try {
              await signOut()
            } finally {
              setSigningOut(false)
            }
          }}
          className={cn(
            "min-h-12 w-full gap-3 rounded-2xl text-current hover:bg-white/10",
            collapsed && !mobile ? "justify-center px-3" : "justify-start px-3.5",
          )}
        >
          <LogOut size={16} />
          {!collapsed || mobile ? (signingOut ? "Logging out..." : "Log out") : null}
        </Button>
      </div>
    </div>
  )
}

export default function Sidebar({
  initialFarmId,
  initialFarmName,
  roleOverride,
  open,
  collapsed,
  onToggle,
  onCollapseToggle,
}: {
  initialFarmId?: string | null
  initialFarmName?: string | null
  roleOverride?: string | null
  open: boolean
  collapsed: boolean
  onToggle: () => void
  onCollapseToggle: () => void
}) {
  return (
    <>
      <Sheet
        open={open}
        onClose={onToggle}
        side="left"
        containerClassName="md:hidden"
        className="w-[min(248px,calc(100vw-48px))]"
      >
        <SidebarContent
          initialFarmId={initialFarmId}
          initialFarmName={initialFarmName}
          roleOverride={roleOverride}
          collapsed={false}
          onClose={onToggle}
          onCollapseToggle={onCollapseToggle}
          mobile
        />
      </Sheet>
      <div
        className="fixed left-0 top-0 z-40 hidden h-screen transition-[width] duration-300 md:block"
        style={{ width: collapsed ? DASHBOARD_SIDEBAR_COLLAPSED_WIDTH : DASHBOARD_SIDEBAR_WIDTH }}
      >
        <SidebarContent
          initialFarmId={initialFarmId}
          initialFarmName={initialFarmName}
          roleOverride={roleOverride}
          collapsed={collapsed}
          onClose={onToggle}
          onCollapseToggle={onCollapseToggle}
          mobile={false}
        />
      </div>
    </>
  )
}
