import {
    fetchSuppliers,
    fetchFeeds,
    fetchRecentMortalityEvents,
    fetchRecentFeedingEvents,
    fetchRecentSamplingEvents,
    fetchRecentTransferEvents,
    fetchRecentHarvestEvents,
    fetchRecentWaterQualityEvents,
    fetchRecentIncomingFeedEvents,
    fetchRecentStockingEvents,
    fetchRecentSystems
} from "@/lib/supabase-queries"
import { fetchSystemsEntryList } from "@/lib/supabase-queries-server"
import { DataEntryInterface } from "@/components/data-entry/data-entry-interface"
import DashboardLayout from "@/components/layout/dashboard-layout"
import { Metadata } from "next"

export const metadata: Metadata = {
    title: "Data Entry - AquaSmart",
    description: "Record daily farm events",
}

export default async function DataEntryPage() {
    const [
        systemsResult,
        suppliersResult,
        feedsResult,
        recentMortality,
        recentFeeding,
        recentSampling,
        recentTransfer,
        recentHarvest,
        recentWaterQuality,
        recentIncomingFeed,
        recentStocking,
        recentSystems
    ] = await Promise.all([
        fetchSystemsEntryList(),
        fetchSuppliers(),
        fetchFeeds(),
        fetchRecentMortalityEvents(),
        fetchRecentFeedingEvents(),
        fetchRecentSamplingEvents(),
        fetchRecentTransferEvents(),
        fetchRecentHarvestEvents(),
        fetchRecentWaterQualityEvents(),
        fetchRecentIncomingFeedEvents(),
        fetchRecentStockingEvents(),
        fetchRecentSystems()
    ])

    const systems = systemsResult.data || []
    const suppliers = suppliersResult.data || []
    const feeds = feedsResult.data || []

    const recentEntries = {
        mortality: recentMortality.data || [],
        feeding: recentFeeding.data || [],
        sampling: recentSampling.data || [],
        transfer: recentTransfer.data || [],
        harvest: recentHarvest.data || [],
        water_quality: recentWaterQuality.data || [],
        incoming_feed: recentIncomingFeed.data || [],
        stocking: recentStocking.data || [],
        systems: recentSystems.data || [],
    }

    return (
        <DashboardLayout>
            <div className="container mx-auto py-8">
                <div className="flex flex-col gap-2 mb-6">
                    <h1 className="text-3xl font-bold tracking-tight">Data Entry</h1>
                    <p className="text-muted-foreground">
                        Record farm activities and measurements.
                    </p>
                </div>
                <DataEntryInterface
                    systems={systems}
                    suppliers={suppliers}
                    feeds={feeds}
                    recentEntries={recentEntries}
                />
            </div>
        </DashboardLayout>
    )
}
