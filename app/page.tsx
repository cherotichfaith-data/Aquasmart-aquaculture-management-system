"use client"

import DashboardPage from "@/components/dashboard/dashboard-page"
import LandingPage from "@/components/marketing/landing-page"
import { useAuth } from "@/components/auth-provider"

export default function RootPage() {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return <div className="min-h-screen bg-background" />
  }

  if (!user) {
    return <LandingPage />
  }

  return <DashboardPage />
}
