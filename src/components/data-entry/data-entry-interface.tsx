"use client"

import Link from "next/link"
import { useMemo } from "react"
import { cn } from "@/lib/utils"
import { MortalityForm } from "./mortality-form"
import { FeedingForm } from "./feeding-form"
import { SamplingForm } from "./sampling-form"
import { TransferForm } from "./transfer-form"
import { HarvestForm } from "./harvest-form"
import { WaterQualityForm } from "./water-quality-form"
import { IncomingFeedForm } from "./incoming-feed-form"
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
    | "incoming_feed"
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
        incoming_feed: Tables<"feed_incoming">[]
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
    { id: "mortality",     label: "Mortality" },
    { id: "sampling",      label: "Sampling" },
    { id: "water_quality", label: "Water Quality" },
    { id: "harvest",       label: "Harvest" },
    { id: "transfer",      label: "Transfer" },
    { id: "stocking",      label: "Stocking" },
    { id: "incoming_feed", label: "Feed Inventory" },
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
        case "incoming_feed":
            return { type: "incoming_feed" as const, data: recentEntries.incoming_feed }
        case "stocking":
            return { type: "stocking" as const, data: recentEntries.stocking }
        case "system":
            return { type: "system" as const, data: recentEntries.systems }
    }
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
    const canAccessIncomingFeed =
        farmRole === "admin" || farmRole === "farm_manager" || farmRole === "system_operator"
    const visibleSidebarItems = useMemo(
        () => sidebarItems.filter((item) => item.id !== "incoming_feed" || canAccessIncomingFeed),
        [canAccessIncomingFeed],
    )
    const requestedTab = tab ?? "feeding"
    const isRestrictedTab = requestedTab === "incoming_feed" && !canAccessIncomingFeed
    const activeTab = useMemo(
        () =>
            visibleSidebarItems.some((item) => item.id === requestedTab)
                ? requestedTab
                : visibleSidebarItems[0]?.id ?? "feeding",
        [requestedTab, visibleSidebarItems],
    )

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
            case "incoming_feed":
                return <IncomingFeedForm feeds={feeds} farmId={farmId} />
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
                return <SystemForm />
        }
    })()

    return (
        <div className="data-entry-layout data-entry-board">
            <div className="data-entry-tabs-shell">
                <div className="relative overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    <div className="flex min-w-max gap-0 px-1.5 pt-1.5">
                        {visibleSidebarItems.map((item) => {
                            const isActive = activeTab === item.id
                            return (
                                <Link
                                    key={item.id}
                                    href={`${DATA_ENTRY_PATH}?type=${item.id}`}
                                    className={cn(
                                        "flex shrink-0 items-center border border-b-0 border-transparent px-3.5 py-2 text-sm font-medium whitespace-nowrap transition-colors cursor-pointer",
                                        isActive
                                            ? "rounded-t-md border-border/80 bg-background text-foreground"
                                            : "text-foreground/70 hover:text-foreground"
                                    )}
                                    aria-selected={isActive}
                                    role="tab"
                                >
                                    <span>{item.label}</span>
                                </Link>
                            )
                        })}
                    </div>
                    {/* Fade-out scroll hint on the right */}
                    <div className="pointer-events-none absolute right-0 top-0 h-full w-10 bg-gradient-to-l from-card to-transparent" />
                </div>
            </div>

            <div className="data-entry-workspace">
                <main className="data-entry-canvas min-w-0">
                    {form}
                </main>
                <aside className="min-w-0">
                    <RecentEntriesList {...recentEntryProps} systems={systems} />
                </aside>
            </div>
        </div>
    )
}
