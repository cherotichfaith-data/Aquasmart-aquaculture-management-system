"use client"

import type React from "react"

import { useState } from "react"

export default function HarvestForm({ onSubmit }: { onSubmit: () => void }) {
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split("T")[0],
    system: "Cage-1",
    fishCount: "",
    totalWeight: "",
    harvestType: "partial",
    comment: "",
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  const abw = "--"

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit()
      }}
    >
      <div className="grid md:grid-cols-2 gap-4">
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
          <label className="block text-sm font-medium mb-1">System/Cage</label>
          <select
            name="system"
            value={formData.system}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-input rounded-lg bg-background"
          >
            <option>Cage-1</option>
            <option>Cage-2</option>
            <option>Cage-3</option>
            <option>Pond-1</option>
          </select>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Number of Fish</label>
          <input
            type="number"
            name="fishCount"
            placeholder="0"
            value={formData.fishCount}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-input rounded-lg bg-background"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Total Weight (kg)</label>
          <input
            type="number"
            name="totalWeight"
            placeholder="0.00"
            step="0.1"
            value={formData.totalWeight}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-input rounded-lg bg-background"
            required
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Harvest Type</label>
        <select
          name="harvestType"
          value={formData.harvestType}
          onChange={handleChange}
          className="w-full px-3 py-2 border border-input rounded-lg bg-background"
        >
          <option value="partial">Partial Harvest</option>
          <option value="final">Final/Full Harvest</option>
        </select>
      </div>

      <div className="bg-accent/10 p-3 rounded-lg">
        <p className="text-sm text-muted-foreground">Average Body Weight (ABW)</p>
        <p className="text-2xl font-bold">{abw} g</p>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Comments</label>
        <textarea
          name="comment"
          placeholder="Harvest notes..."
          value={formData.comment}
          onChange={handleChange}
          className="w-full px-3 py-2 border border-input rounded-lg bg-background h-20 resize-none"
        />
      </div>

      <div className="flex gap-2 pt-4">
        <button
          type="submit"
          className="flex-1 bg-primary text-primary-foreground py-2 rounded-lg hover:opacity-90 transition-opacity"
        >
          Record Harvest
        </button>
      </div>
    </form>
  )
}
