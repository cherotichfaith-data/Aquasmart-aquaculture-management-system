"use client"

import Link from "next/link"
import { useMemo } from "react"
import {
    AlertTriangle,
    ArrowLeftRight,
    Droplets,
    Fish,
    Layers,
    Package,
    Settings as SettingsIcon,
    TestTube,
    Utensils,
    type LucideIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { MortalityForm } from "./mortality-form"
import { FeedingForm } from "./feeding-form"
import { SamplingForm } from "./sampling-form"
import { TransferForm } from "./transfer-form"
import { HarvestForm } from "./harvest-form"
import { WaterQualityForm } from "./water-quality-form"
import { FeedInventoryForm } from "./feed-inventory-form"
import { StockingForm } from "./stocking-form"
import { SystemForm } from "./system-form"
import { RecentEntriesList } from "./recent-entries-list"
import type { Database, Tables } from "@/lib/types/database"
import type { SystemOption } from "@/lib/system-options"
import { DATA_ENTRY_PATH } from "@/lib/app-entry"

export type DataEntryTabId =
    | "feeding"
    | "mortality"
    | "sampling"
    | "water_quality"
    | "harvest"
    | "transfer"
    | "stocking"
    | "feed_inventory"
    | "system"

type DataEntryFarmRole = Database["public"]["Tables"]["farm_user"]["Row"]["role"] | null | undefined

interface DataEntryInterfaceProps {
    farmId: string | null
    farmRole?: Database["public"]["Tables"]["farm_user"]["Row"]["role"] | null
    systems: SystemOption[]
    feeds: Database["public"]["Functions"]["api_feed_type_options_rpc"]["Returns"][number][]
    batches: Database["public"]["Functions"]["api_fingerling_batch_options_rpc"]["Returns"][number][]
    recentEntries: {
        mortality: Tables<"fish_mortality">[]
        feeding: Tables<"feeding_record">[]
        sampling: Tables<"fish_sampling_weight">[]
        transfer: Tables<"fish_transfer">[]
        harvest: Tables<"fish_harvest">[]
        water_quality: Tables<"water_quality_measurement">[]
        feed_inventory: Tables<"feed_inventory">[]
        stocking: Tables<"fish_stocking">[]
        systems: Tables<"system">[]
    }
    tab?: DataEntryTabId
    defaultSystemId?: number | null
    defaultBatchId?: number | null
}

type RecentEntriesByTab = DataEntryInterfaceProps["recentEntries"]

const sidebarItems = [
    {
        id: "feeding",
        label: "Feeding",
        shortLabel: "Feeding",
        icon: Utensils,
        title: "Record Feeding",
        description: "Fast cage-first feeding entry for daily farm operations.",
    },
    {
        id: "feed_inventory",
        label: "Feed Inventory",
        shortLabel: "Feed",
        icon: Package,
        title: "Feed Inventory",
        description: "Record current feed stock by feed type, including bagged and open-bag quantities.",
    },
    {
        id: "mortality",
        label: "Mortality",
        shortLabel: "Mortality",
        icon: AlertTriangle,
        title: "Record Mortality",
        description: null,
    },
    {
        id: "sampling",
        label: "Sampling",
        shortLabel: "Sampling",
        icon: TestTube,
        title: "Record Sampling",
        description: "Capture the monthly sampled fish count and total sample weight in kilograms for this batch.",
    },
    {
        id: "water_quality",
        label: "Water Quality",
        shortLabel: "Water",
        icon: Droplets,
        title: "Record Water Quality",
        description: "Multi-parameter entry with a live dissolved oxygen classification preview.",
    },
    {
        id: "transfer",
        label: "Transfer",
        shortLabel: "Transfer",
        icon: ArrowLeftRight,
        title: "Record Transfer",
        description: null,
    },
    {
        id: "harvest",
        label: "Harvest",
        shortLabel: "Harvest",
        icon: Fish,
        title: "Record Harvest",
        description: null,
    },
    {
        id: "stocking",
        label: "Stocking",
        shortLabel: "Stocking",
        icon: Layers,
        title: "Record Stocking",
        description: null,
    },
    {
        id: "system",
        label: "System Setup",
        shortLabel: "Systems",
        icon: SettingsIcon,
        title: "Add New System",
        description: "Register a new cage, pond, or tank.",
    },
] as const satisfies ReadonlyArray<{
    id: DataEntryTabId
    label: string
    shortLabel: string
    icon: LucideIcon
    title: string
    description: string | null
}>

function getRecentEntriesForTab(recentEntries: RecentEntriesByTab, tab: DataEntryTabId) {
    switch (tab) {
        case "mortality":
            return { type: "mortality" as const, data: recentEntries.mortality }
        case "feeding":
            return { type: "feeding" as const, data: recentEntries.feeding }
        case "sampling":
            return { type: "sampling" as const, data: recentEntries.sampling }
        case "transfer":
            return { type: "transfer" as const, data: recentEntries.transfer }
        case "harvest":
            return { type: "harvest" as const, data: recentEntries.harvest }
        case "water_quality":
            return { type: "water_quality" as const, data: recentEntries.water_quality }
        case "feed_inventory":
            return { type: "feed_inventory" as const, data: recentEntries.feed_inventory }
        case "stocking":
            return { type: "stocking" as const, data: recentEntries.stocking }
        case "system":
            return { type: "system" as const, data: recentEntries.systems }
    }
}

function buildDataEntryTabHref(tabId: DataEntryTabId, defaultSystemId?: number | null, defaultBatchId?: number | null) {
    const params = new URLSearchParams({ type: tabId })
    if (defaultSystemId) params.set("system", String(defaultSystemId))
    if (defaultBatchId) params.set("batch", String(defaultBatchId))
    return `${DATA_ENTRY_PATH}?${params.toString()}`
}

function getVisibleDataEntrySidebarItems(farmRole: DataEntryFarmRole): (typeof sidebarItems)[number][] {
    const canAccessFeedInventory =
        farmRole === "admin" || farmRole === "farm_manager" || farmRole === "system_operator"
    return sidebarItems.filter((item) => item.id !== "feed_inventory" || canAccessFeedInventory)
}

function resolveActiveDataEntryTab(
    tab: DataEntryTabId | undefined,
    visibleItems: ReturnType<typeof getVisibleDataEntrySidebarItems>,
) {
    const requestedTab = tab ?? "feeding"
    return visibleItems.some((item) => item.id === requestedTab) ? requestedTab : visibleItems[0]?.id ?? "feeding"
}

/**
 * Desktop tab strip, meant to be rendered inside the sticky top navbar
 * (DataEntryAppShell) rather than inside the data-entry board itself -- this
 * keeps navigation persistently visible instead of scrolling away with the
 * form content. Mobile keeps its own bottom nav, rendered by
 * DataEntryInterface below.
 */
export function DataEntryTabStrip({
    farmRole,
    tab,
    defaultSystemId = null,
    defaultBatchId = null,
}: {
    farmRole?: DataEntryFarmRole
    tab?: DataEntryTabId
    defaultSystemId?: number | null
    defaultBatchId?: number | null
}) {
    const visibleSidebarItems = useMemo(() => getVisibleDataEntrySidebarItems(farmRole), [farmRole])
    const activeTab = useMemo(
        () => resolveActiveDataEntryTab(tab, visibleSidebarItems),
        [tab, visibleSidebarItems],
    )

    return (
        <div className="data-entry-tabs-shell hidden md:block">
            <div className="relative overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <div className="data-entry-tabs-list" role="tablist" aria-label="Data entry forms">
                    {visibleSidebarItems.map((item) => {
                        const isActive = activeTab === item.id
                        const Icon = item.icon
                        return (
                            <Link
                                key={item.id}
                                href={buildDataEntryTabHref(item.id, defaultSystemId, defaultBatchId)}
                                className={cn(
                                    "data-entry-tab",
                                    isActive
                                        ? "data-entry-tab-active"
                                        : "data-entry-tab-idle"
                                )}
                                aria-selected={isActive}
                                role="tab"
                            >
                                <Icon size={15} strokeWidth={isActive ? 2.4 : 2} />
                                <span>{item.label}</span>
                            </Link>
                        )
                    })}
                </div>
                <div className="pointer-events-none absolute right-0 top-0 h-full w-10 bg-gradient-to-l from-muted/50 to-transparent" />
            </div>
        </div>
    )
}

export function DataEntryInterface({
    farmId,
    farmRole = null,
    systems,
    feeds,
    batches,
    recentEntries,
    tab,
    defaultSystemId = null,
    defaultBatchId = null,
}: DataEntryInterfaceProps) {
    const canAccessFeedInventory =
        farmRole === "admin" || farmRole === "farm_manager" || farmRole === "system_operator"
    const visibleSidebarItems = useMemo(
        () => getVisibleDataEntrySidebarItems(farmRole),
        [farmRole],
    )
    const requestedTab = tab ?? "feeding"
    const isRestrictedTab = requestedTab === "feed_inventory" && !canAccessFeedInventory
    const activeTab = useMemo(
        () => resolveActiveDataEntryTab(tab, visibleSidebarItems),
        [tab, visibleSidebarItems],
    )

    if (isRestrictedTab) {
        return (
            <div className="rounded-xl border border-border/80 bg-card p-6">
                <h2 className="text-xl font-semibold tracking-tight">Unauthorized</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                    Your current farm role does not have access to feed inventory entry.
                </p>
            </div>
        )
    }

    const recentEntryProps = getRecentEntriesForTab(recentEntries, activeTab)
    const activeItem = visibleSidebarItems.find((item) => item.id === activeTab) ?? visibleSidebarItems[0]
    const form = (() => {
        switch (activeTab) {
            case "mortality":
                return (
                    <MortalityForm
                        farmId={farmId}
                        systems={systems}
                        batches={batches}
                        defaultSystemId={defaultSystemId}
                        defaultBatchId={defaultBatchId}
                    />
                )
            case "feeding":
                return (
                    <FeedingForm
                        farmId={farmId}
                        systems={systems}
                        feeds={feeds}
                        batches={batches}
                        defaultSystemId={defaultSystemId}
                        defaultBatchId={defaultBatchId}
                    />
                )
            case "sampling":
                return (
                    <SamplingForm
                        farmId={farmId}
                        systems={systems}
                        batches={batches}
                        defaultSystemId={defaultSystemId}
                        defaultBatchId={defaultBatchId}
                    />
                )
            case "transfer":
                return (
                    <TransferForm
                        farmId={farmId}
                        systems={systems}
                        batches={batches}
                        defaultSystemId={defaultSystemId}
                        defaultBatchId={defaultBatchId}
                    />
                )
            case "harvest":
                return (
                    <HarvestForm
                        farmId={farmId}
                        systems={systems}
                        batches={batches}
                        defaultSystemId={defaultSystemId}
                        defaultBatchId={defaultBatchId}
                    />
                )
            case "water_quality":
                return <WaterQualityForm farmId={farmId} systems={systems} defaultSystemId={defaultSystemId} />
            case "feed_inventory":
                return <FeedInventoryForm feeds={feeds} farmId={farmId} />
            case "stocking":
                return (
                    <StockingForm
                        farmId={farmId}
                        systems={systems}
                        batches={batches}
                        defaultSystemId={defaultSystemId}
                        defaultBatchId={defaultBatchId}
                    />
                )
            case "system":
                return <SystemForm farmId={farmId} />
        }
    })()

    return (
        <div className="data-entry-layout data-entry-board">
            <div className="data-entry-header">
                <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-primary">
                        Data Entry
                    </p>
                    <h1 className="mt-0.5 text-xl font-semibold leading-tight tracking-tight text-foreground sm:text-[1.375rem]">
                        {activeItem.title}
                    </h1>
                    {activeItem?.description ? (
                        <p className="mt-1 text-sm text-muted-foreground">{activeItem.description}</p>
                    ) : null}
                </div>
                <p className="data-entry-required-note">
                    Required fields must be completed before saving.
                </p>
            </div>

            <div className="data-entry-workspace">
                <main className="data-entry-canvas min-w-0">
                    {form}
                </main>
                <aside className="min-w-0">
                    <RecentEntriesList {...recentEntryProps} systems={systems} feeds={feeds} />
                </aside>
            </div>

            <nav className="data-entry-bottom-nav md:hidden" aria-label="Data entry forms">
                <div className="data-entry-bottom-nav-list" role="tablist">
                    {visibleSidebarItems.map((item) => {
                        const isActive = activeTab === item.id
                        const Icon = item.icon
                        return (
                            <Link
                                key={item.id}
                                href={buildDataEntryTabHref(item.id, defaultSystemId, defaultBatchId)}
                                className={cn(
                                    "data-entry-bottom-nav-item",
                                    isActive
                                        ? "data-entry-bottom-nav-item-active"
                                        : "data-entry-bottom-nav-item-idle"
                                )}
                                aria-selected={isActive}
                                role="tab"
                            >
                                <Icon size={19} strokeWidth={isActive ? 2.4 : 2} />
                                <span>{item.shortLabel}</span>
                            </Link>
                        )
                    })}
                </div>
            </nav>
        </div>
    )
}
