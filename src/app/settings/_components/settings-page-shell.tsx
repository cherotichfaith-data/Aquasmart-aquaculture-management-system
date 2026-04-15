"use client"

import { AlertCircle, Check } from "lucide-react"
import Link from "next/link"
import DashboardLayout from "@/components/layout/dashboard-layout"
import { DataErrorState } from "@/components/shared/data-states"
import { Skeleton } from "@/components/ui/skeleton"
import { AlertThresholdsSection, FarmInformationSection, SaveSettingsButton } from "../settings-sections"
import type { SettingsFormState } from "../settings-utils"

function SettingsLoadingState() {
  return (
    <DashboardLayout hideHeader>
      <div className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-3 w-72" />
        </div>

        <div className="soft-panel p-5 sm:p-6">
          <Skeleton className="mb-5 h-7 w-44" />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-11 rounded-xl" />
              </div>
            ))}
          </div>
        </div>

        <div className="soft-panel p-5 sm:p-6">
          <div className="mb-4 flex items-center gap-2">
            <Skeleton className="h-5 w-5 rounded-full" />
            <Skeleton className="h-7 w-40" />
          </div>
          <Skeleton className="mb-5 h-4 w-60" />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="space-y-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-11 rounded-xl" />
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end">
          <Skeleton className="h-12 w-40 rounded-lg" />
        </div>
      </div>
    </DashboardLayout>
  )
}

export function SettingsPageShell({
  loading,
  saved,
  errorMsg,
  settingsLoadError,
  missingFarmAssignment,
  onRetryLoad,
  settings,
  onChange,
  isSaving,
  onSave,
}: {
  loading: boolean
  saved: boolean
  errorMsg: string | null
  settingsLoadError: string | null
  missingFarmAssignment: boolean
  onRetryLoad: () => void
  settings: SettingsFormState
  onChange: (field: string, value: string | number) => void
  isSaving: boolean
  onSave: () => void
}) {
  if (loading) {
    return <SettingsLoadingState />
  }

  return (
    <DashboardLayout hideHeader>
      <div className="space-y-6">
        {saved ? (
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4 flex items-center gap-3">
            <Check className="text-emerald-600 dark:text-emerald-300" size={20} />
            <p className="text-emerald-700 dark:text-emerald-300 font-medium">Settings saved successfully</p>
          </div>
        ) : null}
        {errorMsg ? (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 flex items-center gap-3">
            <AlertCircle className="text-red-600 dark:text-red-300" size={20} />
            <p className="text-red-700 dark:text-red-300 font-medium">{errorMsg}</p>
          </div>
        ) : null}
        {missingFarmAssignment ? (
          <div className="rounded-[1.5rem] border border-amber-500/30 bg-amber-500/10 p-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 text-amber-700 dark:text-amber-300" size={20} />
              <div className="space-y-4">
                <div>
                  <p className="font-medium text-amber-900 dark:text-amber-100">Set up or join a farm first</p>
                  <p className="mt-2 text-sm leading-6 text-amber-800/90 dark:text-amber-200">
                    AquaSmart settings are only available after you have farm access.
                  </p>
                </div>
                <Link
                  href="/onboarding"
                  className="inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
                >
                  Go to onboarding
                </Link>
              </div>
            </div>
          </div>
        ) : null}

        <div className="space-y-6">
          {settingsLoadError ? (
            <DataErrorState
              title="Unable to load settings"
              description={settingsLoadError}
              onRetry={onRetryLoad}
            />
          ) : null}
          {missingFarmAssignment ? null : (
            <>
              <FarmInformationSection settings={settings} handleChange={onChange} />
              <AlertThresholdsSection settings={settings} handleChange={onChange} />
              <SaveSettingsButton isSaving={isSaving} disabled={missingFarmAssignment} onSave={onSave} />
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
