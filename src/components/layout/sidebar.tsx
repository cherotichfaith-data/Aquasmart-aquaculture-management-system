"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useEffect, useMemo, useState, type MouseEvent } from "react"
import Box from "@mui/material/Box"
import Button from "@mui/material/Button"
import Collapse from "@mui/material/Collapse"
import Divider from "@mui/material/Divider"
import Drawer from "@mui/material/Drawer"
import IconButton from "@mui/material/IconButton"
import List from "@mui/material/List"
import ListItemButton from "@mui/material/ListItemButton"
import ListItemIcon from "@mui/material/ListItemIcon"
import ListItemText from "@mui/material/ListItemText"
import Menu from "@mui/material/Menu"
import MenuItem from "@mui/material/MenuItem"
import Paper from "@mui/material/Paper"
import Skeleton from "@mui/material/Skeleton"
import Tooltip from "@mui/material/Tooltip"
import Typography from "@mui/material/Typography"
import { alpha } from "@mui/material/styles"
import { useAuth } from "@/components/providers/auth-provider"
import { useActiveFarm } from "@/lib/hooks/app/use-active-farm"
import { useActiveFarmRole } from "@/lib/hooks/use-active-farm-role"
import { DATA_ENTRY_PATH, stripDashboardPath, toDashboardPath } from "@/lib/app-entry"
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
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        minHeight: 72,
        px: collapsed && !mobile ? 1.5 : 2.5,
        py: 1.5,
      }}
    >
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Link
          href={toDashboardPath("/")}
          className="flex min-w-0 items-center gap-3 transition-opacity hover:opacity-90"
          onClick={mobile ? onClose : undefined}
        >
          <Image src="/use this.png" alt="AquaSmart logo" width={36} height={36} className="h-9 w-9 shrink-0" priority />
          {!collapsed || mobile ? (
            <Typography variant="h6" sx={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--color-sidebar-foreground)" }}>
              AquaSmart
            </Typography>
          ) : null}
        </Link>
      </Box>
      {mobile ? (
        <IconButton
          onClick={onClose}
          aria-label="Close navigation"
          sx={{
            color: "var(--color-sidebar-foreground)",
            bgcolor: "transparent",
          }}
        >
          <X size={18} />
        </IconButton>
      ) : (
        <Tooltip title={collapsed ? "Expand sidebar" : "Collapse sidebar"}>
          <IconButton
            onClick={onCollapseToggle}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            sx={{
              color: "var(--color-sidebar-foreground)",
              bgcolor: "transparent",
            }}
          >
            <MenuIcon size={18} />
          </IconButton>
        </Tooltip>
      )}
    </Box>
  )
}

function SidebarContent({ collapsed, onClose, onCollapseToggle, mobile, initialFarmId, initialFarmName }: SidebarContentProps) {
  const pathname = usePathname()
  const appPathname = stripDashboardPath(pathname)
  const searchParams = useSearchParams()
  const router = useRouter()
  const { signOut } = useAuth()
  const { farm, farmId } = useActiveFarm({ initialFarmId, initialFarmName })
  const farmRoleQuery = useActiveFarmRole(farmId)
  const farmRole = farmRoleQuery.data ?? null
  const isRoleLoading = farmRoleQuery.isLoading
  const navigationSections = useMemo(() => getVisibleSections(farmRole), [farmRole])
  const [signingOut, setSigningOut] = useState(false)
  const [waterQualityOpen, setWaterQualityOpen] = useState(appPathname.startsWith("/water-quality"))
  const [waterQualityMenuAnchor, setWaterQualityMenuAnchor] = useState<HTMLElement | null>(null)

  const farmName = farm?.name ?? initialFarmName ?? null
  const waterQualityActive = appPathname === "/water-quality"
  const tabParam = searchParams.get("tab")
  const activeWaterQualityKey = !tabParam || tabParam === "overview" ? "overview" : tabParam

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
          component={Link}
          href={link.href}
          selected={isActive}
          onClick={closeAfterNavigate}
          dense={dense}
          sx={{
            borderRadius: 2,
            mx: 1,
            my: 0.25,
            fontSize: dense ? "0.75rem" : "0.8125rem",
            whiteSpace: "normal",
          }}
        >
          {link.label}
        </MenuItem>
      )
    })

  return (
    <Paper
      square
      elevation={0}
      sx={{
        display: "flex",
        height: "100%",
        width: "100%",
        flexDirection: "column",
        borderRadius: 0,
        borderRight: "1px solid var(--color-sidebar-border)",
        backgroundColor: "var(--color-sidebar)",
        backgroundImage: "none",
        boxShadow: "none",
        color: "var(--color-sidebar-foreground)",
        overflowY: "auto",
        overflowX: "hidden",
        scrollbarWidth: "none",
        msOverflowStyle: "none",
        "&::-webkit-scrollbar": {
          display: "none",
        },
      }}
    >
      <LogoBlock collapsed={collapsed} mobile={mobile} onClose={onClose} onCollapseToggle={onCollapseToggle} />
      {farmId && farmName && (!collapsed || mobile) ? (
        <>
          <Box sx={{ px: 2, py: 1.5 }}>
            <Box
              title={farmName}
              sx={{
                display: "flex",
                gap: 1,
                alignItems: "center",
                border: "1px solid var(--color-sidebar-border)",
                borderRadius: 2.5,
                px: 1.5,
                py: 1.25,
                bgcolor: "color-mix(in srgb, var(--color-sidebar-accent) 82%, white 18%)",
              }}
            >
              <Box
                aria-hidden
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  bgcolor: "primary.main",
                  flexShrink: 0,
                }}
              />
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                Farm:
              </Typography>
              <Typography variant="body2" sx={{ minWidth: 0 }} noWrap>
                {farmName}
              </Typography>
            </Box>
          </Box>
        </>
      ) : null}
      <Box sx={{ flex: 1, px: 1.25, py: 1.5 }}>
        {isRoleLoading ? (
          <Box sx={{ display: "grid", gap: 0.5, px: 0.5 }}>
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} variant="rounded" height={44} sx={{ borderRadius: 2.5 }} />
            ))}
          </Box>
        ) : navigationSections.map((section) => (
          <Box key={section.title} sx={{ mb: 2.5 }}>
            {!collapsed || mobile ? (
              <Typography
                variant="overline"
                sx={{
                  display: "block",
                  px: 1.5,
                  pb: 0.5,
                  color: "var(--color-sidebar-accent-foreground)",
                  opacity: 0.8,
                }}
              >
                {section.title}
              </Typography>
            ) : null}
            <List disablePadding sx={{ display: "grid", gap: 0.5 }}>
              {section.items.map((item) => {
                if (item.href === toDashboardPath("/water-quality")) {
                  const Icon = item.icon

                  if (collapsed && !mobile) {
                    return (
                      <Box key={item.href}>
                        <Tooltip title="Water Quality" placement="right">
                          <ListItemButton
                            onClick={(event: MouseEvent<HTMLElement>) => setWaterQualityMenuAnchor(event.currentTarget)}
                            selected={waterQualityActive}
                            sx={{
                              minHeight: 48,
                              justifyContent: "center",
                              borderRadius: 2.5,
                              px: 1.5,
                            }}
                          >
                            <ListItemIcon sx={{ minWidth: 0, color: "inherit" }}>
                              <Icon size={18} />
                            </ListItemIcon>
                          </ListItemButton>
                        </Tooltip>
                        <Menu
                          anchorEl={waterQualityMenuAnchor}
                          open={Boolean(waterQualityMenuAnchor)}
                          onClose={() => setWaterQualityMenuAnchor(null)}
                          anchorOrigin={{ vertical: "center", horizontal: "right" }}
                          transformOrigin={{ vertical: "center", horizontal: "left" }}
                          slotProps={{ list: { dense: true } }}
                        >
                          {renderWaterQualityMenuItems(true)}
                        </Menu>
                      </Box>
                    )
                  }

                  return (
                    <Box key={item.href}>
                      <ListItemButton
                        selected={waterQualityActive}
                        sx={{
                          minHeight: 48,
                          borderRadius: 2.5,
                          px: 1.5,
                        }}
                      >
                        <Box
                          component={Link}
                          href={item.href}
                          onClick={closeAfterNavigate}
                          sx={{
                            display: "flex",
                            minWidth: 0,
                            flex: 1,
                            alignItems: "center",
                            gap: 1.5,
                            color: "inherit",
                            textDecoration: "none",
                          }}
                        >
                          <Icon size={18} />
                          <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
                            {item.name}
                          </Typography>
                        </Box>
                        <IconButton
                          size="small"
                          onClick={(event) => {
                            event.preventDefault()
                            event.stopPropagation()
                            setWaterQualityOpen((prev) => !prev)
                          }}
                          aria-label={waterQualityOpen ? "Collapse water quality menu" : "Expand water quality menu"}
                          sx={{ color: "inherit" }}
                        >
                          <ChevronDown
                            size={16}
                            style={{
                              transform: waterQualityOpen ? "rotate(180deg)" : "rotate(0deg)",
                              transition: "transform 0.2s ease",
                            }}
                          />
                        </IconButton>
                      </ListItemButton>
                      <Collapse in={waterQualityOpen} timeout="auto" unmountOnExit>
                        <List disablePadding sx={{ mt: 0.5, ml: 2, display: "grid", gap: 0.25 }}>
                          {waterQualityLinks.map((link) => (
                            <ListItemButton
                              key={link.href}
                              component={Link}
                              href={link.href}
                              selected={link.activeKey === activeWaterQualityKey}
                              onClick={closeAfterNavigate}
                              sx={{
                                minHeight: 38,
                                borderRadius: 2,
                                px: 1.5,
                              }}
                            >
                              <ListItemText
                                primary={<Typography variant="caption" sx={{ fontWeight: 600 }}>{link.label}</Typography>}
                              />
                            </ListItemButton>
                          ))}
                        </List>
                      </Collapse>
                    </Box>
                  )
                }

                const resolvedHref = resolveItemHref(farmRole, item.href)
                const resolvedLabel = resolveItemLabel(farmRole, item.href, item.name)
                const itemBasePath = stripDashboardPath(item.href)
                const resolvedBasePath = stripDashboardPath(resolvedHref.split("?")[0] ?? resolvedHref)
                const isActive =
                  appPathname === itemBasePath ||
                  appPathname === resolvedBasePath ||
                  (itemBasePath !== "/" && appPathname.startsWith(`${itemBasePath}/`))
                const Icon = item.icon

                return (
                  <Tooltip
                    key={item.href}
                    title={collapsed && !mobile ? resolvedLabel : ""}
                    placement="right"
                    disableHoverListener={!collapsed || mobile}
                  >
                    <ListItemButton
                      component={Link}
                      href={resolvedHref}
                      selected={isActive}
                      onClick={closeAfterNavigate}
                      sx={{
                        minHeight: 48,
                        justifyContent: collapsed && !mobile ? "center" : "flex-start",
                        borderRadius: 2.5,
                        px: collapsed && !mobile ? 1.5 : 1.75,
                      }}
                    >
                      <ListItemIcon
                        sx={{
                          minWidth: collapsed && !mobile ? 0 : 34,
                          color: "inherit",
                          justifyContent: "center",
                        }}
                      >
                        <Icon size={18} />
                      </ListItemIcon>
                      {!collapsed || mobile ? (
                        <ListItemText
                          primary={
                            <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
                              {resolvedLabel}
                            </Typography>
                          }
                        />
                      ) : null}
                    </ListItemButton>
                  </Tooltip>
                )
              })}
            </List>
          </Box>
        ))}
      </Box>
      <Box sx={{ p: 1.5 }}>
        <Button
          fullWidth
          color="inherit"
          variant="text"
          startIcon={<LogOut size={16} />}
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
          sx={{
            justifyContent: collapsed && !mobile ? "center" : "flex-start",
            minHeight: 48,
            borderRadius: 2.5,
            px: collapsed && !mobile ? 1.5 : 1.75,
          }}
        >
          {!collapsed || mobile ? (signingOut ? "Logging out..." : "Log out") : null}
        </Button>
      </Box>
    </Paper>
  )
}

export default function Sidebar({
  initialFarmId,
  initialFarmName,
  open,
  collapsed,
  onToggle,
  onCollapseToggle,
}: {
  initialFarmId?: string | null
  initialFarmName?: string | null
  open: boolean
  collapsed: boolean
  onToggle: () => void
  onCollapseToggle: () => void
}) {
  return (
    <>
      <Drawer
        open={open}
        onClose={onToggle}
        variant="temporary"
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: "block", md: "none" },
          "& .MuiDrawer-paper": {
            width: `min(${DASHBOARD_SIDEBAR_WIDTH}px, calc(100vw - 48px))`,
            boxSizing: "border-box",
          },
        }}
      >
        <SidebarContent
          initialFarmId={initialFarmId}
          initialFarmName={initialFarmName}
          collapsed={false}
          onClose={onToggle}
          onCollapseToggle={onCollapseToggle}
          mobile
        />
      </Drawer>
      <Box
        sx={{
          display: { xs: "none", md: "block" },
          position: "fixed",
          top: 0,
          left: 0,
          zIndex: (theme) => theme.zIndex.drawer,
          width: collapsed ? DASHBOARD_SIDEBAR_COLLAPSED_WIDTH : DASHBOARD_SIDEBAR_WIDTH,
          height: "100vh",
          transition: (theme) =>
            theme.transitions.create("width", {
              duration: theme.transitions.duration.standard,
            }),
        }}
      >
        <SidebarContent
          initialFarmId={initialFarmId}
          initialFarmName={initialFarmName}
          collapsed={collapsed}
          onClose={onToggle}
          onCollapseToggle={onCollapseToggle}
          mobile={false}
        />
      </Box>
    </>
  )
}
