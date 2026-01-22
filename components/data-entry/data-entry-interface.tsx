"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { ScrollArea } from "@/components/ui/scroll-area"
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
import type { Tables } from "@/lib/types/database"

interface DataEntryInterfaceProps {
    systems: Tables<"systems">[]
    suppliers: Tables<"suppliers">[]
    feeds: Tables<"feeds_metadata">[]
    recentEntries: {
        mortality: any[]
        feeding: any[]
        sampling: any[]
        transfer: any[]
        harvest: any[]
        water_quality: any[]
        incoming_feed: any[]
        stocking: any[]
        systems: any[]
    }
}

const sidebarItems = [
    { id: "system", label: "System" },
    { id: "stocking", label: "Stocking" },
    { id: "mortality", label: "Mortality" },
    { id: "feeding", label: "Feeding" },
    { id: "sampling", label: "Sampling" },
    { id: "transfer", label: "Transfer" },
    { id: "harvest", label: "Harvest" },
    { id: "water_quality", label: "Water Quality" },
    { id: "incoming_feed", label: "Incoming Feed" },
]

export function DataEntryInterface({ systems, suppliers, feeds, recentEntries }: DataEntryInterfaceProps) {
    const [activeTab, setActiveTab] = useState("stocking")

    return (
        <div className="flex flex-col md:flex-row h-[calc(100vh-100px)] gap-6">
            <aside className="w-full md:w-64 bg-card border rounded-lg overflow-hidden shrink-0 h-fit md:h-auto">
                <div className="p-4 font-semibold border-b bg-muted/40">Data Entry</div>
                <ScrollArea className="h-[200px] md:h-full">
                    <div className="flex flex-col p-2 gap-1">
                        {sidebarItems.map((item) => (
                            <button
                                key={item.id}
                                onClick={() => setActiveTab(item.id)}
                                className={cn(
                                    "text-left px-4 py-2 rounded-md text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground cursor-pointer",
                                    activeTab === item.id ? "bg-accent text-accent-foreground" : "text-muted-foreground"
                                )}
                            >
                                {item.label}
                            </button>
                        ))}
                    </div>
                </ScrollArea>
            </aside>

            <main className="flex-1 bg-card border rounded-lg p-6 overflow-y-auto shadow-sm">
                {activeTab === "mortality" && (
                    <>
                        <MortalityForm systems={systems} />
                        <RecentEntriesList data={recentEntries.mortality} type="mortality" />
                    </>
                )}
                {activeTab === "feeding" && (
                    <>
                        <FeedingForm systems={systems} feeds={feeds} />
                        <RecentEntriesList data={recentEntries.feeding} type="feeding" />
                    </>
                )}
                {activeTab === "sampling" && (
                    <>
                        <SamplingForm systems={systems} />
                        <RecentEntriesList data={recentEntries.sampling} type="sampling" />
                    </>
                )}
                {activeTab === "transfer" && (
                    <>
                        <TransferForm systems={systems} />
                        <RecentEntriesList data={recentEntries.transfer} type="transfer" />
                    </>
                )}
                {activeTab === "harvest" && (
                    <>
                        <HarvestForm systems={systems} />
                        <RecentEntriesList data={recentEntries.harvest} type="harvest" />
                    </>
                )}
                {activeTab === "water_quality" && (
                    <>
                        <WaterQualityForm systems={systems} />
                        <RecentEntriesList data={recentEntries.water_quality} type="water_quality" />
                    </>
                )}
                {activeTab === "incoming_feed" && (
                    <>
                        <IncomingFeedForm feeds={feeds} suppliers={suppliers} />
                        <RecentEntriesList data={recentEntries.incoming_feed} type="incoming_feed" />
                    </>
                )}
                {activeTab === "stocking" && (
                    <>
                        <StockingForm systems={systems} />
                        <RecentEntriesList data={recentEntries.stocking} type="stocking" />
                    </>
                )}
                {activeTab === "system" && (
                    <>
                        <SystemForm />
                        <RecentEntriesList data={recentEntries.systems} type="system" />
                    </>
                )}
            </main>
        </div>
    )
}
