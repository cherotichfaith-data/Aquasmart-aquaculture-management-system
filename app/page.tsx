"use client"

import DashboardPage from "@/components/dashboard/dashboard-page"
import { useAuth } from "@/components/providers/auth-provider"

export default function RootPage() {
  const { isLoading } = useAuth()

  if (isLoading) {
    return <div className="min-h-screen bg-background" />
  }

  return <DashboardPage />
}
