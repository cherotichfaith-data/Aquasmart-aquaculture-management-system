"use client"

import { AlertCircle, CheckCircle2, Info, Save } from "lucide-react"
import { formatRoleLabel } from "@/lib/app-entry"
import type { SettingsFormState } from "./settings-utils"

type ChangeFn = (field: string, value: string | number) => void

const inputClassName =
  "soft-input-surface w-full px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/45"

export function FarmInformationSection({
  settings,
  handleChange,
}: {
  settings: SettingsFormState
  handleChange: ChangeFn
}) {
  return (
    <div className="soft-panel p-5 sm:p-6">
      <h2 className="mb-4 text-lg font-semibold leading-tight sm:text-xl">Farm Information</h2>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-medium text-foreground/90">Farm Name</label>
          <input
            type="text"
            value={settings.farmName}
            onChange={(e) => handleChange("farmName", e.target.value)}
            className={inputClassName}
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-foreground/90">Location</label>
          <input
            type="text"
            value={settings.location}
            onChange={(e) => handleChange("location", e.target.value)}
            className={inputClassName}
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-foreground/90">Owner Name</label>
          <input
            type="text"
            value={settings.owner}
            onChange={(e) => handleChange("owner", e.target.value)}
            className={inputClassName}
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-foreground/90">Email</label>
          <input
            type="email"
            value={settings.email}
            onChange={(e) => handleChange("email", e.target.value)}
            className={inputClassName}
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-foreground/90">Phone</label>
          <input
            type="tel"
            value={settings.phone}
            onChange={(e) => handleChange("phone", e.target.value)}
            className={inputClassName}
          />
        </div>
        <div>
          <p className="mb-2 text-sm font-medium text-foreground/90">Role</p>
          <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-muted/30 px-3 py-2.5">
            <span className="text-sm text-foreground">{formatRoleLabel(settings.role)}</span>
            <span className="ml-auto text-xs text-muted-foreground">Managed by admin</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export function AlertThresholdsSection({
  settings,
  handleChange,
}: {
  settings: SettingsFormState
  handleChange: ChangeFn
}) {
  const thresholds = [
    {
      field: "lowDoThreshold",
      label: "Low Dissolved Oxygen",
      unit: "mg/L",
      step: "0.1",
      min: 0,
      max: 20,
      placeholder: "e.g. 4.0",
      hint: "Alert fires when DO drops below this value. Tilapia: 4.0 mg/L recommended.",
      value: settings.lowDoThreshold,
    },
    {
      field: "highAmmoniaThreshold",
      label: "High Total Ammonia (TAN)",
      unit: "mg/L",
      step: "0.01",
      min: 0,
      max: 10,
      placeholder: "e.g. 1.0",
      hint: "Alert fires when TAN exceeds this value. Safe limit: < 0.5 mg/L; danger: > 1.0 mg/L.",
      value: settings.highAmmoniaThreshold,
    },
    {
      field: "highMortalityThreshold",
      label: "High Mortality Rate",
      unit: "% / day",
      step: "0.01",
      min: 0,
      max: 100,
      placeholder: "e.g. 0.5",
      hint: "Alert fires when daily mortality rate exceeds this percentage. Healthy: < 0.1% / day.",
      value: settings.highMortalityThreshold,
    },
  ] as const

  return (
    <div className="soft-panel p-5 sm:p-6">
      <div className="mb-1 flex items-center gap-2">
        <AlertCircle size={20} className="text-primary" />
        <h2 className="text-lg font-semibold leading-tight sm:text-xl">Alert Thresholds</h2>
      </div>
      <p className="mb-5 text-sm leading-6 text-muted-foreground">
        These values determine when the system fires alerts. Changes take effect immediately for new data entries.
      </p>
      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        {thresholds.map((t) => (
          <div key={t.field}>
            <div className="mb-1.5 flex items-baseline justify-between gap-2">
              <label className="text-sm font-medium text-foreground/90">{t.label}</label>
              <span className="text-[11px] font-semibold text-muted-foreground">{t.unit}</span>
            </div>
            <div className="relative">
              <input
                type="number"
                step={t.step}
                min={t.min}
                max={t.max}
                placeholder={t.placeholder}
                value={t.value ?? ""}
                onChange={(e) =>
                  handleChange(t.field, e.target.value === "" ? "" : Number.parseFloat(e.target.value))
                }
                className={`${inputClassName} pr-14`}
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground">
                {t.unit}
              </span>
            </div>
            <p className="mt-1.5 flex items-start gap-1.5 text-[11px] leading-relaxed text-muted-foreground">
              <Info size={11} className="mt-0.5 shrink-0 opacity-60" />
              {t.hint}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}

export function SaveSettingsButton({
  isSaving,
  saved = false,
  disabled = false,
  onSave,
}: {
  isSaving: boolean
  saved?: boolean
  disabled?: boolean
  onSave: () => void
}) {
  return (
    <div className="flex items-center justify-end gap-4">
      {saved && (
        <span className="flex items-center gap-1.5 text-sm font-medium text-success">
          <CheckCircle2 size={16} className="shrink-0" />
          Settings saved
        </span>
      )}
      <button
        onClick={onSave}
        disabled={isSaving || disabled}
        className="flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
      >
        <Save size={18} />
        {isSaving ? "Saving..." : "Save Settings"}
      </button>
    </div>
  )
}
