import type React from "react"
import { Suspense } from "react"
import type { Metadata } from "next"
import { AuthProvider, ThemeProvider, MuiProvider } from "@/components/providers"
import { SyncProvider } from "@/components/offline/sync-provider"
import { FarmOnboardingGate } from "@/components/providers/farm-onboarding-gate"
import { ToastProvider } from "@/components/shared/toast-provider"
import { NotificationsProvider } from "@/components/notifications/notifications-provider"
import { ReactQueryProvider } from "@/lib/react-query-provider"
import "./globals.css"

export const metadata: Metadata = {
  title: "AquaSmart - Aquaculture Management Dashboard",
  description: "Real-time monitoring and management system for aquaculture farm operations",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "https://aquasmart.app"),
  openGraph: {
    title: "AquaSmart - Aquaculture Management Dashboard",
    description: "Real-time monitoring and management system for aquaculture farm operations",
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
    title: "AquaSmart - Aquaculture Management Dashboard",
    description: "Real-time monitoring and management system for aquaculture farm operations",
    images: ["/use this.png"],
  },
  manifest: "/manifest.json",
  icons: {
    icon: "/use this.png",
    apple: "/use this.png",
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
        <ThemeProvider>
          <MuiProvider>
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
          </MuiProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
