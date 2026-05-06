"use client"

import { AlertCircle, Check } from "lucide-react"
import Link from "next/link"
import DashboardLayout from "@/components/layout/dashboard-layout"
import { DataErrorState } from "@/components/shared/data-states"
import { Skeleton } from "@/components/app-ui/skeleton"
import { AlertThresholdsSection, FarmInformationSection, SaveSettingsButton } from "../settings-sections"
import type { SettingsFormState } from "../settings-utils"

function SettingsLoadingState({
  initialFarmId,
  initialFarmName,
}: {
  initialFarmId?: string | null
  initialFarmName?: string | null
}) {
  return (
    <DashboardLayout hideHeader showHeaderToolbar={false} initialFarmId={initialFarmId} initialFarmName={initialFarmName}>
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
  initialFarmId,
  initialFarmName,
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
  initialFarmId?: string | null
  initialFarmName?: string | null
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
    return <SettingsLoadingState initialFarmId={initialFarmId} initialFarmName={initialFarmName} />
  }

  return (
    <DashboardLayout hideHeader showHeaderToolbar={false} initialFarmId={initialFarmId} initialFarmName={initialFarmName}>
      <div className="space-y-6">
        {saved ? (
          <div className="flex items-center gap-3 rounded-xl border border-success/30 bg-success/10 px-4 py-3">
            <Check className="shrink-0 text-success" size={18} />
            <p className="text-sm font-medium text-success">Settings saved — changes are now active.</p>
          </div>
        ) : null}
        {errorMsg ? (
          <div className="flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-4">
            <AlertCircle className="text-destructive" size={20} />
            <p className="font-medium text-destructive">{errorMsg}</p>
          </div>
        ) : null}
        {missingFarmAssignment ? (
          <div className="rounded-[1.5rem] border border-warning/30 bg-warning/10 p-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 text-warning" size={20} />
              <div className="space-y-4">
                <div>
                  <p className="font-medium text-warning">Set up or join a farm first</p>
                  <p className="mt-2 text-sm leading-6 text-warning/90">
                    AquaSmart settings are only available after you have farm access.
                  </p>
                </div>
                <Link
                  href="/onboarding"
                  className="inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
                >
                  Go to setup
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
              <SaveSettingsButton isSaving={isSaving} saved={saved} disabled={missingFarmAssignment} onSave={onSave} />
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}

