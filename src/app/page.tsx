import { redirect } from "next/navigation"
import type { Metadata } from "next"
import LandingPage from "@/components/marketing/landing-page"
import { WORKSPACE_SELECT_PATH } from "@/lib/app-entry"

export const metadata: Metadata = {
  title: "SUSTAIN Aquasmart | Aquaculture Management Software",
  description:
    "SUSTAIN Aquasmart is aquaculture management software for fish farms with KPI dashboards, feed tracking, mortality records, water quality monitoring, inventory control, and reporting.",
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
    title: "SUSTAIN Aquasmart | Aquaculture Management Software",
    description:
      "Manage aquaculture operations with real-time KPIs, feed control, mortality tracking, and water quality monitoring.",
    url: "/",
    siteName: "SUSTAIN Aquasmart",
    type: "website",
    images: [
      {
        url: "/use this.png",
        width: 60,
        height: 60,
        alt: "SUSTAIN Aquasmart logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "SUSTAIN Aquasmart | Aquaculture Management Software",
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
