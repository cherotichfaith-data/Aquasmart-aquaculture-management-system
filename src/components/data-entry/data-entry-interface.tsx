"use client"

import { useEffect, useMemo, useState } from "react"
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
    defaultTab?: (typeof sidebarItems)[number]["id"]
    defaultSystemId?: number | null
    defaultBatchId?: number | null
}

const sidebarItems = [
    { id: "system", label: "System Setup" },
    { id: "stocking", label: "Stocking" },
    { id: "feeding", label: "Feeding" },
    { id: "incoming_feed", label: "Feed Inventory" },
    { id: "sampling", label: "Sampling" },
    { id: "mortality", label: "Mortality" },
    { id: "transfer", label: "Transfer" },
    { id: "water_quality", label: "Water Quality" },
    { id: "harvest", label: "Harvest" },
] as const

export function DataEntryInterface({
    farmId,
    farmRole = null,
    systems,
    feeds,
    batches,
    recentEntries,
    defaultTab = "feeding",
    defaultSystemId = null,
    defaultBatchId = null,
}: DataEntryInterfaceProps) {
    const canAccessIncomingFeed =
        farmRole === "admin" || farmRole === "farm_manager" || farmRole === "inventory_storekeeper"
    const visibleSidebarItems = useMemo(
        () => sidebarItems.filter((item) => item.id !== "incoming_feed" || canAccessIncomingFeed),
        [canAccessIncomingFeed],
    )
    const resolvedDefaultTab = useMemo(
        () =>
            visibleSidebarItems.some((item) => item.id === defaultTab)
                ? defaultTab
                : visibleSidebarItems[0]?.id ?? "feeding",
        [defaultTab, visibleSidebarItems],
    )
    const [activeTab, setActiveTab] = useState<(typeof sidebarItems)[number]["id"]>(resolvedDefaultTab)

    useEffect(() => {
        setActiveTab(resolvedDefaultTab)
    }, [resolvedDefaultTab])

    return (
        <div className="space-y-3 sm:space-y-4 md:space-y-6">
            <div className="overflow-hidden rounded-lg border border-border/80 bg-card shadow-sm">
                <div className="overflow-x-auto">
                    <div className="flex min-w-max snap-x snap-mandatory gap-2 p-2">
                        {visibleSidebarItems.map((item) => (
                            <button
                                key={item.id}
                                onClick={() => setActiveTab(item.id)}
                                className={cn(
                                    "shrink-0 rounded-md px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors hover:bg-accent hover:text-accent-foreground cursor-pointer",
                                    activeTab === item.id
                                        ? "bg-primary text-primary-foreground shadow-sm"
                                        : "text-foreground/80 hover:text-foreground"
                                )}
                            >
                                {item.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <main className="min-w-0 rounded-lg border border-border/80 bg-card p-3 shadow-sm sm:p-4 md:p-6 xl:overflow-y-auto">
                {activeTab === "mortality" && (
                    <>
                        <MortalityForm
                            farmId={farmId}
                            systems={systems}
                            batches={batches}
                            defaultSystemId={defaultSystemId}
                            defaultBatchId={defaultBatchId}
                        />
                        <RecentEntriesList data={recentEntries.mortality} type="mortality" systems={systems} />
                    </>
                )}
                {activeTab === "feeding" && (
                    <>
                        <FeedingForm systems={systems} feeds={feeds} batches={batches} defaultSystemId={defaultSystemId} defaultBatchId={defaultBatchId} />
                        <RecentEntriesList data={recentEntries.feeding} type="feeding" systems={systems} />
                    </>
                )}
                {activeTab === "sampling" && (
                    <>
                        <SamplingForm systems={systems} batches={batches} defaultSystemId={defaultSystemId} defaultBatchId={defaultBatchId} />
                        <RecentEntriesList data={recentEntries.sampling} type="sampling" systems={systems} />
                    </>
                )}
                {activeTab === "transfer" && (
                    <>
                        <TransferForm systems={systems} batches={batches} defaultSystemId={defaultSystemId} defaultBatchId={defaultBatchId} />
                        <RecentEntriesList data={recentEntries.transfer} type="transfer" systems={systems} />
                    </>
                )}
                {activeTab === "harvest" && (
                    <>
                        <HarvestForm
                            farmId={farmId}
                            systems={systems}
                            batches={batches}
                            defaultSystemId={defaultSystemId}
                            defaultBatchId={defaultBatchId}
                        />
                        <RecentEntriesList data={recentEntries.harvest} type="harvest" systems={systems} />
                    </>
                )}
                {activeTab === "water_quality" && (
                    <>
                        <WaterQualityForm farmId={farmId} systems={systems} defaultSystemId={defaultSystemId} />
                        <RecentEntriesList data={recentEntries.water_quality} type="water_quality" systems={systems} />
                    </>
                )}
                {canAccessIncomingFeed && activeTab === "incoming_feed" && (
                    <>
                        <IncomingFeedForm feeds={feeds} farmId={farmId} />
                        <RecentEntriesList data={recentEntries.incoming_feed} type="incoming_feed" systems={systems} />
                    </>
                )}
                {activeTab === "stocking" && (
                    <>
                        <StockingForm systems={systems} batches={batches} defaultSystemId={defaultSystemId} defaultBatchId={defaultBatchId} />
                        <RecentEntriesList data={recentEntries.stocking} type="stocking" systems={systems} />
                    </>
                )}
                {activeTab === "system" && (
                    <>
                        <SystemForm />
                        <RecentEntriesList data={recentEntries.systems} type="system" systems={systems} />
                    </>
                )}
            </main>
        </div>
    )
}
