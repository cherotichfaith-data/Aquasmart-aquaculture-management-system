"use client"

import { useState, useEffect } from "react"
import DashboardLayout from "@/components/layout/dashboard-layout"
import { Save, AlertCircle, Check } from "lucide-react"

export default function SettingsPage() {
  const [settings, setSettings] = useState({
    farmName: "AquaSmart Farm 1",
    location: "Lake Zone - Kimbwela",
    owner: "John Doe",
    email: "john@aquafarm.com",
    phone: "+255 123 456 789",
    lowDoThreshold: 4.0,
    highAmmoniaThreshold: 0.05,
    highMortalityThreshold: 2.0,
    dataBackupFrequency: "daily",
    theme: "light",
  })

  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const savedSettings = localStorage.getItem("aqua_settings")
    if (savedSettings) {
      try {
        setSettings(JSON.parse(savedSettings))
      } catch (err) {
        console.error("[v0] Error loading settings:", err)
      }
    }
    setLoading(false)
  }, [])

  const handleChange = (field: string, value: string | number) => {
    setSettings((prev) => ({ ...prev, [field]: value }))
    setSaved(false)
  }

  const handleSave = () => {
    localStorage.setItem("aqua_settings", JSON.stringify(settings))
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

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

        {/* Notification */}
        {saved && (
          <div className="bg-green-500/10 border border-green-500 rounded-lg p-4 flex items-center gap-3">
            <Check className="text-green-600" size={20} />
            <p className="text-green-700 font-medium">Settings saved successfully</p>
          </div>
        )}

        <div className="space-y-6">
          {/* Farm Information */}
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
            </div>
          </div>

          {/* Alert Thresholds */}
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
                  value={settings.lowDoThreshold}
                  onChange={(e) => handleChange("lowDoThreshold", Number.parseFloat(e.target.value))}
                  className="w-full px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">High Ammonia Alert (mg/L)</label>
                <input
                  type="number"
                  step="0.01"
                  value={settings.highAmmoniaThreshold}
                  onChange={(e) => handleChange("highAmmoniaThreshold", Number.parseFloat(e.target.value))}
                  className="w-full px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">High Mortality Alert (%/day)</label>
                <input
                  type="number"
                  step="0.1"
                  value={settings.highMortalityThreshold}
                  onChange={(e) => handleChange("highMortalityThreshold", Number.parseFloat(e.target.value))}
                  className="w-full px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
          </div>

          {/* System Preferences */}
          <div className="bg-card border border-border rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">System Preferences</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Data Backup Frequency</label>
                <select
                  value={settings.dataBackupFrequency}
                  onChange={(e) => handleChange("dataBackupFrequency", e.target.value)}
                  className="w-full px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Theme</label>
                <select
                  value={settings.theme}
                  onChange={(e) => handleChange("theme", e.target.value)}
                  className="w-full px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                  <option value="auto">Auto</option>
                </select>
              </div>
            </div>
          </div>

          {/* Data Management */}
          <div className="bg-card border border-border rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Data Management</h2>
            <div className="space-y-3">
              <button className="w-full md:w-auto px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity font-medium">
                Export All Data (CSV)
              </button>
              <button className="w-full md:w-auto px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors font-medium">
                Backup Supabase
              </button>
              <button className="w-full md:w-auto px-4 py-2 border border-destructive text-destructive rounded-lg hover:bg-destructive/10 transition-colors font-medium">
                Clear Local Cache
              </button>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end">
            <button
              onClick={handleSave}
              className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-lg hover:opacity-90 transition-opacity font-semibold"
            >
              <Save size={18} />
              Save Settings
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
