import { redirect } from "next/navigation"
import type { Metadata } from "next"
import LandingPage from "@/components/marketing/landing-page"
import { WORKSPACE_SELECT_PATH } from "@/lib/app-entry"

export const metadata: Metadata = {
  title: "Samaki360 | Aquaculture Management Software",
  description:
    "Samaki360 is aquaculture management software for fish farms with KPI dashboards, feed tracking, mortality records, water quality monitoring, inventory control, and reporting.",
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
    title: "Samaki360 | Aquaculture Management Software",
    description:
      "Manage aquaculture operations with real-time KPIs, feed control, mortality tracking, and water quality monitoring.",
    url: "/",
    siteName: "Samaki360",
    type: "website",
    images: [
      {
        url: "/Bild.png",
        width: 3284,
        height: 528,
        alt: "Samaki360 logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Samaki360 | Aquaculture Management Software",
    description:
      "Aquaculture management software for KPI monitoring, feed tracking, water quality, inventory, and reporting.",
    images: ["/Bild.png"],
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
  const resolvedSearchParams = (await searchParams) ?? {}
  const callbackParams = new URLSearchParams()

  Object.entries(resolvedSearchParams).forEach(([key, value]) => {
    if (typeof value === "string") {
      callbackParams.set(key, value)
    }
  })

  if (
    callbackParams.has("code") ||
    callbackParams.has("access_token") ||
    callbackParams.has("refresh_token") ||
    callbackParams.has("error")
  ) {
    if (!callbackParams.has("next")) {
      callbackParams.set("next", WORKSPACE_SELECT_PATH)
    }
    redirect(`/auth/callback?${callbackParams.toString()}`)
  }

  return <LandingPage />
}
