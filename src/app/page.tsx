import { redirect } from "next/navigation"
import type { Metadata } from "next"
import LandingPage from "@/components/marketing/landing-page"
import { WORKSPACE_SELECT_PATH } from "@/lib/app-entry"

export const metadata: Metadata = {
  title: "SUSTAIN Aquasmart | Fish farm management software",
  description:
    "Record-based management for cages, ponds and tanks. Plan feed by pellet size, track fish growth and review production costs.",
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
    title: "SUSTAIN Aquasmart | Fish farm management software",
    description:
      "Record-based management for cages, ponds and tanks. Plan feed by pellet size, track fish growth and review production costs.",
    url: "/",
    siteName: "SUSTAIN Aquasmart",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "SUSTAIN Aquasmart",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "SUSTAIN Aquasmart | Fish farm management software",
    description:
      "Record-based management for cages, ponds and tanks. Plan feed by pellet size, track fish growth and review production costs.",
    images: ["/og-image.png"],
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
