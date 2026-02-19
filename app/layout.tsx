import type React from "react"
import type { Metadata } from "next"
import { AuthProvider, ThemeProvider, QueryProvider } from "@/components/providers"
import { ToastProvider } from "@/components/shared/toast-provider"
import { InitialSplash } from "@/components/InitialSplash"
import { NotificationsProvider } from "@/components/notifications/notifications-provider"
import "./globals.css"

export const metadata: Metadata = {
  title: "Aquasmart - Aquaculture Management Dashboard",
  description: "Real-time monitoring and management system for aquaculture farm operations",
  icons: {
    icon: [
      {
        url: "/icon-light-32x32.png",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/icon-dark-32x32.png",
        media: "(prefers-color-scheme: dark)",
      },
      {
        url: "/icon.svg",
        type: "image/svg+xml",
      },
    ],
    apple: "/apple-icon.png",
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
        <InitialSplash />
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
