import type React from "react"
import { Suspense } from "react"
import type { Metadata } from "next"
import { AuthProvider } from "@/components/providers"
import { SyncProvider } from "@/components/offline/sync-provider"
import { FarmOnboardingGate } from "@/components/providers/farm-onboarding-gate"
import { ToastProvider } from "@/components/shared/toast-provider"
import { NotificationsProvider } from "@/components/notifications/notifications-provider"
import { ReactQueryProvider } from "@/lib/react-query-provider"
import "./globals.css"

function resolveMetadataBase() {
  const configuredUrl = process.env.NEXT_PUBLIC_APP_URL?.trim()
  const fallback = "https://aquasmart.app"

  if (!configuredUrl) {
    return new URL(fallback)
  }

  const normalized = /^https?:\/\//i.test(configuredUrl)
    ? configuredUrl
    : `https://${configuredUrl}`

  try {
    return new URL(normalized)
  } catch {
    return new URL(fallback)
  }
}

export const metadata: Metadata = {
  title: "Samaki360 - Aquaculture Management Dashboard",
  description: "Real-time monitoring and management system for aquaculture farm operations",
  metadataBase: resolveMetadataBase(),
  openGraph: {
    title: "Samaki360 - Aquaculture Management Dashboard",
    description: "Real-time monitoring and management system for aquaculture farm operations",
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
    title: "Samaki360 - Aquaculture Management Dashboard",
    description: "Real-time monitoring and management system for aquaculture farm operations",
    images: ["/Bild.png"],
  },
  manifest: "/manifest.json",
  icons: {
    icon: "/Bild.png",
    apple: "/Bild.png",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head />
      <body className={`font-sans antialiased`}>
        <ReactQueryProvider>
          <AuthProvider>
            <SyncProvider>
              <ToastProvider>
                <NotificationsProvider>
                  <Suspense fallback={<div className="min-h-screen bg-background" />}>
                    <FarmOnboardingGate>{children}</FarmOnboardingGate>
                  </Suspense>
                </NotificationsProvider>
              </ToastProvider>
            </SyncProvider>
          </AuthProvider>
        </ReactQueryProvider>
      </body>
    </html>
  )
}
