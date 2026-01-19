"use client"

import type React from "react"

import { useEffect, useState } from "react"
import type { Enums } from "@/lib/types/database"
import { fetchSystemsList, insertWaterQualityMeasurement } from "@/lib/supabase-queries"

type Parameter = Enums<"water_quality_parameters">

const parameters: Parameter[] = [
  "pH",
  "temperature",
  "dissolved_oxygen",
  "secchi_disk_depth",
  "nitrite",
  "nitrate",
  "ammonia_ammonium",
  "salinity",
]

export default function WaterQualityForm({ onClose }: { onClose: () => void }) {
  const [systems, setSystems] = useState<Array<{ id: number; name: string }>>([])
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split("T")[0],
    time: new Date().toISOString().split("T")[1].slice(0, 5),
    systemId: "",
    parameter: "pH" as Parameter,
    value: "",
    depth: "",
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadSystems = async () => {
      const result = await fetchSystemsList()
      if (result.status === "success") {
        setSystems(result.data)
        if (!formData.systemId && result.data.length > 0) {
          setFormData((prev) => ({ ...prev, systemId: String(result.data[0].id) }))
        }
      }
    }
    loadSystems()
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    const systemId = Number(formData.systemId)
    const value = Number(formData.value)

    if (!Number.isFinite(systemId)) {
      setError("Select a system.")
      setSaving(false)
      return
    }
    if (!Number.isFinite(value)) {
      setError("Enter a valid measurement value.")
      setSaving(false)
      return
    }

    const result = await insertWaterQualityMeasurement({
      date: formData.date,
      time: formData.time,
      system_id: systemId,
      parameter_name: formData.parameter,
      parameter_value: value,
      water_depth: formData.depth ? Number(formData.depth) : null,
    })

    if (result.status === "error") {
      setError(result.error)
      setSaving(false)
      return
    }

    setSaving(false)
    onClose()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Date</label>
          <input
            type="date"
            name="date"
            value={formData.date}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-input rounded-lg bg-background"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Time</label>
          <input
            type="time"
            name="time"
            value={formData.time}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-input rounded-lg bg-background"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">System</label>
          <select
            name="systemId"
            value={formData.systemId}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-input rounded-lg bg-background"
          >
            {systems.map((system) => (
              <option key={system.id} value={String(system.id)}>
                {system.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Parameter</label>
          <select
            name="parameter"
            value={formData.parameter}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-input rounded-lg bg-background"
          >
            {parameters.map((parameter) => (
              <option key={parameter} value={parameter}>
                {parameter}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Value</label>
          <input
            type="number"
            name="value"
            placeholder="0"
            step="0.01"
            value={formData.value}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-input rounded-lg bg-background"
            required
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Water Depth (m)</label>
        <input
          type="number"
          name="depth"
          placeholder="0.0"
          step="0.1"
          value={formData.depth}
          onChange={handleChange}
          className="w-full px-3 py-2 border border-input rounded-lg bg-background"
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex gap-2 pt-4">
        <button
          type="submit"
          disabled={saving}
          className="flex-1 bg-primary text-primary-foreground py-2 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {saving ? "Saving..." : "Record Measurement"}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="flex-1 bg-muted text-foreground py-2 rounded-lg hover:bg-muted/80"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}
