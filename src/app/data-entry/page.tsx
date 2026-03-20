import { Suspense } from "react"
import DataEntryPageClient from "@/app/data-entry/page.client"
import { Metadata } from "next"
import { requireUser } from "@/lib/supabase/require-user"

export const metadata: Metadata = {
    title: "Data Capture - AquaSmart",
    description: "Record daily farm events",
}

export default async function DataEntryPage() {
    await requireUser()

    return (
        <Suspense fallback={null}>
            <DataEntryPageClient />
        </Suspense>
    )
}
