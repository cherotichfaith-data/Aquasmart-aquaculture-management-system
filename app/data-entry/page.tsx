import DataEntryPageClient from "@/app/data-entry/page.client"
import { Metadata } from "next"
import { requireUser } from "@/utils/supabase/require-user"

export const metadata: Metadata = {
    title: "Data Entry - AquaSmart",
    description: "Record daily farm events",
}

export default async function DataEntryPage() {
    await requireUser()

    return (
        <DataEntryPageClient />
    )
}
