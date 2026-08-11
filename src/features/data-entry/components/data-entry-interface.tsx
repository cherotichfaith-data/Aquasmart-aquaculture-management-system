"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
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

type DataEntryTabId =
    | "feeding"
    | "mortality"
    | "sampling"
    | "water_quality"
    | "harvest"
    | "transfer"
    | "stocking"
    | "feed_inventory"
    | "system"

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
    { id: "feeding",       label: "Feeding" },
    { id: "feed_inventory", label: "Feed Inventory" },
    { id: "mortality",     label: "Mortality" },
    { id: "sampling",      label: "Sampling" },
    { id: "water_quality", label: "Water Quality" },
    { id: "transfer",      label: "Transfer" },
    { id: "harvest",       label: "Harvest" },
    { id: "stocking",      label: "Stocking" },
    { id: "system",        label: "System Setup" },
] as const

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
        () => sidebarItems.filter((item) => item.id !== "feed_inventory" || canAccessFeedInventory),
        [canAccessFeedInventory],
    )
    const requestedTab = tab ?? "feeding"
    const isRestrictedTab = requestedTab === "feed_inventory" && !canAccessFeedInventory
    const activeTab = useMemo(
        () =>
            visibleSidebarItems.some((item) => item.id === requestedTab)
                ? requestedTab
                : visibleSidebarItems[0]?.id ?? "feeding",
        [requestedTab, visibleSidebarItems],
    )

    // Tab links below carry the current cage forward so switching forms doesn't
    // lose the cage you're working on. `defaultSystemId` only reflects the URL
    // at the time this page loaded, so it goes stale the moment a form's own
    // cage picker changes -- track the live value here instead, and reset it
    // whenever a real navigation supplies a new `defaultSystemId`.
    const [liveSystemId, setLiveSystemId] = useState<number | null>(defaultSystemId)
    useEffect(() => {
        setLiveSystemId(defaultSystemId)
    }, [defaultSystemId])

    if (isRestrictedTab) {
        return (
            <div className="rounded-lg border border-border/80 bg-card p-6 shadow-sm">
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
                        onSystemChange={setLiveSystemId}
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
                        onSystemChange={setLiveSystemId}
                    />
                )
            case "sampling":
                return (
                    <SamplingForm
                        farmId={farmId}
                        systems={systems}
                        batches={batches}
                        defaultSystemId={defaultSystemId}
                        onSystemChange={setLiveSystemId}
                    />
                )
            case "transfer":
                return (
                    <TransferForm
                        farmId={farmId}
                        systems={systems}
                        batches={batches}
                        defaultSystemId={defaultSystemId}
                        onSystemChange={setLiveSystemId}
                    />
                )
            case "harvest":
                return (
                    <HarvestForm
                        farmId={farmId}
                        systems={systems}
                        batches={batches}
                        defaultSystemId={defaultSystemId}
                        onSystemChange={setLiveSystemId}
                    />
                )
            case "water_quality":
                return (
                    <WaterQualityForm
                        farmId={farmId}
                        systems={systems}
                        defaultSystemId={defaultSystemId}
                        onSystemChange={setLiveSystemId}
                    />
                )
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
                        onSystemChange={setLiveSystemId}
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
                    <h1 className="text-xl font-semibold leading-tight tracking-tight text-foreground">
                        Data Entry
                    </h1>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                        {activeItem?.label ?? "Farm"} records
                    </p>
                </div>
                <p className="data-entry-required-note">
                    Required fields must be completed before saving.
                </p>
            </div>

            <div className="data-entry-tabs-shell">
                <div className="relative overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    <div className="data-entry-tabs-list" role="tablist" aria-label="Data entry forms">
                        {visibleSidebarItems.map((item) => {
                            const isActive = activeTab === item.id
                            return (
                                <Link
                                    key={item.id}
                                    href={buildDataEntryTabHref(item.id, liveSystemId, defaultBatchId)}
                                    className={cn(
                                        "data-entry-tab",
                                        isActive
                                            ? "data-entry-tab-active"
                                            : "data-entry-tab-idle"
                                    )}
                                    aria-selected={isActive}
                                    role="tab"
                                >
                                    <span>{item.label}</span>
                                </Link>
                            )
                        })}
                    </div>
                    <div className="pointer-events-none absolute right-0 top-0 h-full w-10 bg-gradient-to-l from-muted/50 to-transparent" />
                </div>
            </div>

            <div className="data-entry-workspace">
                <main className="data-entry-canvas min-w-0">
                    {form}
                </main>
                <aside className="min-w-0">
                    <RecentEntriesList {...recentEntryProps} systems={systems} feeds={feeds} />
                </aside>
            </div>
        </div>
    )
}
