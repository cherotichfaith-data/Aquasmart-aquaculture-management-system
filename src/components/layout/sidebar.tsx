"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"
import { useMemo, useState } from "react"
import { useAuth } from "@/components/providers/auth-provider"
import { useActiveFarm } from "@/lib/hooks/app/use-active-farm"
import { useActiveFarmRole } from "@/lib/hooks/use-active-farm-role"
import { DATA_ENTRY_PATH, stripDashboardPath, toDashboardPath, withCurrentSearchContext } from "@/lib/app-entry"
import { Button } from "@/components/app-ui/button"
import { Sheet } from "@/components/app-ui/sheet"
import { Skeleton } from "@/components/app-ui/skeleton"
import { Tooltip } from "@/components/app-ui/tooltip"
import { cn } from "@/lib/utils"
import {
  Activity,
  BarChart3,
  Fish,
  LayoutDashboard,
  LogOut,
  Menu as MenuIcon,
  PlusCircle,
  Settings,
  Rows3,
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
      { name: "Cages", href: toDashboardPath("/systems"), icon: Rows3 },
      { name: "Batches", href: toDashboardPath("/batches"), icon: Fish },
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
    toDashboardPath("/systems"),
    toDashboardPath("/batches"),
    toDashboardPath("/feed"),
    toDashboardPath("/production"),
    toDashboardPath("/reports"),
    DATA_ENTRY_PATH,
    toDashboardPath("/settings"),
    "/users",
  ]),
  farm_manager: new Set([
    toDashboardPath("/"),
    toDashboardPath("/systems"),
    toDashboardPath("/batches"),
    toDashboardPath("/feed"),
    toDashboardPath("/production"),
    toDashboardPath("/reports"),
    DATA_ENTRY_PATH,
    toDashboardPath("/settings"),
  ]),
  system_operator: new Set([
    DATA_ENTRY_PATH,
    toDashboardPath("/systems"),
  ]),
  data_analyst: new Set([
    toDashboardPath("/"),
    toDashboardPath("/systems"),
    toDashboardPath("/batches"),
    toDashboardPath("/feed"),
    toDashboardPath("/production"),
    toDashboardPath("/reports"),
  ]),
  viewer: new Set([
    toDashboardPath("/"),
    toDashboardPath("/systems"),
    toDashboardPath("/batches"),
    toDashboardPath("/feed"),
    toDashboardPath("/reports"),
  ]),
}

const ROLE_ITEM_LABELS: Record<string, Record<string, string>> = {
  system_operator: { [DATA_ENTRY_PATH]: "Data Entry" },
}

const ROLE_ITEM_HREFS: Record<string, Record<string, string>> = {
  system_operator: { [DATA_ENTRY_PATH]: `${DATA_ENTRY_PATH}?type=feeding` },
}

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
            <span className="text-lg font-bold text-[color:var(--color-sidebar-foreground)]">AquaSmart</span>
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

  const farmName = farm?.name ?? initialFarmName ?? null
  // Navigation should carry the user's working context between sections.
  // Without this, opening Production from another section removes `system`
  // and Production falls back to the lowest database ID (Cage 2B here).
  const withCurrentContext = (href: string) => withCurrentSearchContext(href, searchParams)

  const closeAfterNavigate = () => {
    if (mobile) {
      onClose()
    }
  }

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
              <Skeleton key={i} className="h-11 rounded-2xl" />
            ))}
          </div>
        ) : (
          navigationSections.map((section) => (
            <div key={section.title} className="mb-5">
              {!collapsed || mobile ? (
                <span className="block px-2.5 pb-1 font-mono text-tag uppercase tracking-[0.08em] opacity-80" style={{ color: "var(--color-sidebar-accent-foreground)" }}>
                  {section.title}
                </span>
              ) : null}
              <div className="grid gap-1">
                {section.items.map((item) => {
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
