import type React from "react"
import type { Metadata } from "next"
import { AuthProvider, ThemeProvider, QueryProvider } from "@/components/providers"
import { ToastProvider } from "@/components/shared/toast-provider"
import { NotificationsProvider } from "@/components/notifications/notifications-provider"
import "./globals.css"

export const metadata: Metadata = {
  title: "Aquasmart - Aquaculture Management Dashboard",
  description: "Real-time monitoring and management system for aquaculture farm operations",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "https://aquasmart.app"),
  openGraph: {
    title: "Aquasmart - Aquaculture Management Dashboard",
    description: "Real-time monitoring and management system for aquaculture farm operations",
    type: "website",
    images: [
      {
        url: "/aquasmart-share.png",
        width: 2000,
        height: 2000,
        alt: "AquaSmart logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Aquasmart - Aquaculture Management Dashboard",
    description: "Real-time monitoring and management system for aquaculture farm operations",
    images: ["/aquasmart-share.png"],
  },
  icons: {
    icon: "/icon-192x192.png",
    apple: "/icon-192x192.png",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className={`font-sans antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <AuthProvider>
            <QueryProvider>
              <ToastProvider>
                <NotificationsProvider>
                  {children}
                </NotificationsProvider>
              </ToastProvider>
            </QueryProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
