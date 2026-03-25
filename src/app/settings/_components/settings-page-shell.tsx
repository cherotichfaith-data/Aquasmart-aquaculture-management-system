"use client"

import { AlertCircle, Check } from "lucide-react"
import DashboardLayout from "@/components/layout/dashboard-layout"
import { DataErrorState } from "@/components/shared/data-states"
import { AlertThresholdsSection, FarmInformationSection, SaveSettingsButton } from "../settings-sections"
import type { SettingsFormState } from "../settings-utils"

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
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center p-8">
          <div className="text-muted-foreground">Loading settings...</div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground mt-1">Manage system configuration and preferences</p>
        </div>

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
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 flex items-center gap-3">
            <AlertCircle className="text-amber-700 dark:text-amber-300" size={20} />
            <p className="text-amber-800 dark:text-amber-200 font-medium">
              No farm workspace exists for this account yet. You should be redirected to the onboarding flow to create one.
            </p>
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
          <FarmInformationSection settings={settings} handleChange={onChange} />
          <AlertThresholdsSection settings={settings} handleChange={onChange} />
          <SaveSettingsButton isSaving={isSaving} disabled={missingFarmAssignment} onSave={onSave} />
        </div>
      </div>
    </DashboardLayout>
  )
}
