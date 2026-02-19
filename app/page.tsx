import type { Metadata } from "next"
import RootPageClient from "./page.client"

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
  },
  twitter: {
    card: "summary_large_image",
    title: "AquaSmart | Aquaculture Management Software",
    description:
      "Aquaculture management software for KPI monitoring, feed tracking, water quality, inventory, and reporting.",
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function Page() {
  return <RootPageClient />
}
