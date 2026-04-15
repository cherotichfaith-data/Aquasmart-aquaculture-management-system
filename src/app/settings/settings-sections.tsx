"use client"

import { AlertCircle, Save } from "lucide-react"
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
            <span className="text-sm text-foreground">
              {settings.role === "admin" ? "Admin"
                : settings.role === "farm_manager" ? "Farm Manager"
                : settings.role === "farm_technician" ? "Farm Technician"
                : settings.role === "inventory_storekeeper" ? "Inventory Storekeeper"
                : settings.role === "analyst_planner" ? "Analyst / Planner"
                : settings.role === "viewer_auditor" ? "Viewer / Auditor"
                : settings.role || "—"}
            </span>
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
  return (
    <div className="soft-panel p-5 sm:p-6">
      <div className="mb-4 flex items-center gap-2">
        <AlertCircle size={20} className="text-primary" />
        <h2 className="text-lg font-semibold leading-tight sm:text-xl">Alert Thresholds</h2>
      </div>
      <p className="mb-4 text-sm leading-6 text-muted-foreground">Configure when alerts should trigger</p>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div>
          <label className="mb-2 block text-sm font-medium text-foreground/90">Low DO Alert (mg/L)</label>
          <input
            type="number"
            step="0.1"
            value={settings.lowDoThreshold ?? ""}
            onChange={(e) =>
              handleChange("lowDoThreshold", e.target.value === "" ? "" : Number.parseFloat(e.target.value))
            }
            className={inputClassName}
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-foreground/90">High Ammonia Alert (mg/L)</label>
          <input
            type="number"
            step="0.01"
            value={settings.highAmmoniaThreshold ?? ""}
            onChange={(e) =>
              handleChange("highAmmoniaThreshold", e.target.value === "" ? "" : Number.parseFloat(e.target.value))
            }
            className={inputClassName}
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-foreground/90">
            High mortality alert threshold (%/day)
          </label>
          <input
            type="number"
            step="0.1"
            value={settings.highMortalityThreshold ?? ""}
            onChange={(e) =>
              handleChange("highMortalityThreshold", e.target.value === "" ? "" : Number.parseFloat(e.target.value))
            }
            className={inputClassName}
          />
        </div>
      </div>
    </div>
  )
}

export function SaveSettingsButton({
  isSaving,
  disabled = false,
  onSave,
}: {
  isSaving: boolean
  disabled?: boolean
  onSave: () => void
}) {
  return (
    <div className="flex justify-end">
      <button
        onClick={onSave}
        disabled={isSaving || disabled}
        className="flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
      >
        <Save size={18} />
        {isSaving ? "Saving..." : "Save Settings"}
      </button>
    </div>
  )
}
