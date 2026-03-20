import type { Metadata } from "next"
import RootPageClient from "./page.client"
import { createClient } from "@/lib/supabase/server"
import { resolveInitialFarmId } from "@/features/farm/queries.server"
import { getDashboardPageInitialData, parseDashboardPageFilters } from "@/features/dashboard/queries.server"
import { isSbNetworkError, logSbError } from "@/lib/supabase/log"

export const metadata: Metadata = {
  title: "AquaSmart | Aquaculture Management Software",
  description:
    "AquaSmart is aquaculture management software for fish farms with KPI dashboards, feed tracking, mortality records, water quality monitoring, inventory control, and reporting.",
  keywords: [
    "aquaculture management software",
    "fish farm management",
    "aquaculture dashboard",
    "water quality monitoring",
    "feed management",
    "mortality tracking",
    "inventory management",
    "aquaculture reporting",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "AquaSmart | Aquaculture Management Software",
    description:
      "Manage aquaculture operations with real-time KPIs, feed control, mortality tracking, and water quality monitoring.",
    url: "/",
    siteName: "AquaSmart",
    type: "website",
    images: [
      {
        url: "/use this.png",
        width: 60,
        height: 60,
        alt: "AquaSmart logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "AquaSmart | Aquaculture Management Software",
    description:
      "Aquaculture management software for KPI monitoring, feed tracking, water quality, inventory, and reporting.",
    images: ["/use this.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
}

type SearchParams = Record<string, string | string[] | undefined>

export default async function Page({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>
}) {
  const supabase = await createClient()
  let user = null

  try {
    const result = await supabase.auth.getUser()
    user = result.data.user
  } catch (error) {
    if (!isSbNetworkError(error)) {
      logSbError("app:page:getUser", error)
    }
  }

  if (!user) {
    return <RootPageClient initialView="landing" />
  }

  const resolvedSearchParams = (await searchParams) ?? {}
  const searchFarmId = typeof resolvedSearchParams.farmId === "string" ? resolvedSearchParams.farmId : null
  const initialFilters = parseDashboardPageFilters(resolvedSearchParams)
  const { farmId } = await resolveInitialFarmId(searchFarmId)
  const initialData = await getDashboardPageInitialData({
    farmId,
    filters: initialFilters,
  })

  return (
    <RootPageClient
      initialView="dashboard"
      initialFarmId={farmId}
      initialFilters={initialFilters}
      initialData={initialData}
    />
  )
}
