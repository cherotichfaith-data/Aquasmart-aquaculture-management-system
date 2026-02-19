"use client"

import { AlertCircle, Save } from "lucide-react"
import type { SettingsFormState } from "./settings-utils"

type ChangeFn = (field: string, value: string | number) => void

export function FarmInformationSection({
  settings,
  handleChange,
}: {
  settings: SettingsFormState
  handleChange: ChangeFn
}) {
  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <h2 className="text-xl font-semibold mb-4">Farm Information</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">Farm Name</label>
          <input
            type="text"
            value={settings.farmName}
            onChange={(e) => handleChange("farmName", e.target.value)}
            className="w-full px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Location</label>
          <input
            type="text"
            value={settings.location}
            onChange={(e) => handleChange("location", e.target.value)}
            className="w-full px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Owner Name</label>
          <input
            type="text"
            value={settings.owner}
            onChange={(e) => handleChange("owner", e.target.value)}
            className="w-full px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Email</label>
          <input
            type="email"
            value={settings.email}
            onChange={(e) => handleChange("email", e.target.value)}
            className="w-full px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Phone</label>
          <input
            type="tel"
            value={settings.phone}
            onChange={(e) => handleChange("phone", e.target.value)}
            className="w-full px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Role</label>
          <select
            value={settings.role}
            onChange={(e) => handleChange("role", e.target.value)}
            className="w-full px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="admin">Admin</option>
            <option value="farm_manager">Farm Manager</option>
            <option value="system_operator">System Operator</option>
            <option value="data_analyst">Data Analyst</option>
            <option value="viewer">Viewer</option>
          </select>
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
    <div className="bg-card border border-border rounded-lg p-6">
      <div className="flex items-center gap-2 mb-4">
        <AlertCircle size={20} className="text-primary" />
        <h2 className="text-xl font-semibold">Alert Thresholds</h2>
      </div>
      <p className="text-sm text-muted-foreground mb-4">Configure when alerts should trigger</p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">Low DO Alert (mg/L)</label>
          <input
            type="number"
            step="0.1"
            value={settings.lowDoThreshold ?? ""}
            onChange={(e) => handleChange("lowDoThreshold", e.target.value === "" ? "" : Number.parseFloat(e.target.value))}
            className="w-full px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">High Ammonia Alert (mg/L)</label>
          <input
            type="number"
            step="0.01"
            value={settings.highAmmoniaThreshold ?? ""}
            onChange={(e) => handleChange("highAmmoniaThreshold", e.target.value === "" ? "" : Number.parseFloat(e.target.value))}
            className="w-full px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">High Mortality Alert (%/day)</label>
          <input
            type="number"
            step="0.1"
            value={settings.highMortalityThreshold ?? ""}
            onChange={(e) => handleChange("highMortalityThreshold", e.target.value === "" ? "" : Number.parseFloat(e.target.value))}
            className="w-full px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>
    </div>
  )
}

export function SaveSettingsButton({
  isSaving,
  onSave,
}: {
  isSaving: boolean
  onSave: () => void
}) {
  return (
    <div className="flex justify-end">
      <button
        onClick={onSave}
        disabled={isSaving}
        className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-lg hover:opacity-90 transition-opacity font-semibold disabled:cursor-not-allowed disabled:opacity-70"
      >
        <Save size={18} />
        {isSaving ? "Saving..." : "Save Settings"}
      </button>
    </div>
  )
}
