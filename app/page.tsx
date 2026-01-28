"use client"

import DashboardPage from "@/components/dashboard/dashboard-page"
import LandingPage from "@/components/marketing/landing-page"
import OnboardingScreen from "@/components/onboarding/onboarding-screen"
import { useAuth } from "@/components/auth-provider"

export default function RootPage() {
  const { user, profile, isLoading } = useAuth()

  if (isLoading) {
    return <div className="min-h-screen bg-background" />
  }

  if (!user) {
    return <LandingPage />
  }

  if (!profile) {
    return <OnboardingScreen />
  }

  return <DashboardPage />
}
