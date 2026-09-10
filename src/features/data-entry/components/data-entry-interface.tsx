"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import { ChevronDown } from "lucide-react"
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
import type { BatchOptionItem } from "@/features/shared/batch-options"

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
    batches: BatchOptionItem[]
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

    const router = useRouter()
    const [asideOpen, setAsideOpen] = useState(false)
    const isReviewer = farmRole === "admin" || farmRole === "farm_manager"
    const approvalHref = `/approvals?farmId=${encodeURIComponent(farmId ?? "")}`
    const approvalLabel = isReviewer ? "Approval" : "My submissions"

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
                <h1 className="text-base font-semibold tracking-tight text-foreground sm:text-lg">
                    Data Entry
                </h1>
                <p className="data-entry-required-note ml-auto hidden md:block">
                    Required fields must be completed before saving.
                </p>
            </div>

            <div className="data-entry-tabs-shell">
                {/* Phone: one-line jump-to-form picker instead of a wrapping / scrolling strip */}
                <div className="flex items-center gap-2 sm:hidden">
                    <label className="sr-only" htmlFor="data-entry-tab-select">Choose a form</label>
                    <select
                        id="data-entry-tab-select"
                        className="data-entry-tab-select"
                        value={activeTab}
                        onChange={(event) =>
                            router.push(buildDataEntryTabHref(event.target.value as DataEntryTabId, liveSystemId, defaultBatchId))
                        }
                    >
                        {visibleSidebarItems.map((item) => (
                            <option key={item.id} value={item.id}>{item.label}</option>
                        ))}
                    </select>
                    <Link href={approvalHref} className="data-entry-tab data-entry-tab-idle shrink-0">
                        {approvalLabel}
                    </Link>
                </div>

                {/* Tablet and up: one wrapping row of pills */}
                <div className="hidden flex-wrap items-center gap-1.5 sm:flex" role="tablist" aria-label="Data entry forms">
                    {visibleSidebarItems.map((item) => {
                        const isActive = activeTab === item.id
                        return (
                            <Link
                                key={item.id}
                                href={buildDataEntryTabHref(item.id, liveSystemId, defaultBatchId)}
                                className={cn("data-entry-tab", isActive ? "data-entry-tab-active" : "data-entry-tab-idle")}
                                aria-selected={isActive}
                                role="tab"
                            >
                                <span>{item.label}</span>
                            </Link>
                        )
                    })}
                    <span className="mx-1 self-stretch border-l border-border" aria-hidden />
                    <Link href={approvalHref} className="data-entry-tab data-entry-tab-idle">
                        {approvalLabel}
                    </Link>
                </div>
            </div>

            <div className="data-entry-workspace">
                <main className="data-entry-canvas min-w-0">
                    {form}
                </main>
                <aside className="data-entry-aside min-w-0">
                    <button
                        type="button"
                        className="data-entry-aside-toggle xl:hidden"
                        onClick={() => setAsideOpen((open) => !open)}
                        aria-expanded={asideOpen}
                    >
                        <span>Recent {(activeItem?.label ?? "").toLowerCase()} entries</span>
                        <ChevronDown className={cn("h-4 w-4 transition-transform", asideOpen && "rotate-180")} />
                    </button>
                    <div className={cn("data-entry-aside-body", !asideOpen && "hidden xl:block")}>
                        <RecentEntriesList {...recentEntryProps} systems={systems} feeds={feeds} />
                    </div>
                </aside>
            </div>
        </div>
    )
}
