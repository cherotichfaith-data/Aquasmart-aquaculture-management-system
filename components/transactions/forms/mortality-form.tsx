"use client"

import type React from "react"

import { useState } from "react"

export default function MortalityForm({ onSubmit }: { onSubmit: () => void }) {
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split("T")[0],
    system: "Cage-1",
    fishDead: "",
    classification: "unknown",
    comment: "",
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

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

      <div>
        <label className="block text-sm font-medium mb-1">Number of Fish Dead</label>
        <input
          type="number"
          name="fishDead"
          placeholder="0"
          value={formData.fishDead}
          onChange={handleChange}
          className="w-full px-3 py-2 border border-input rounded-lg bg-background"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Classification</label>
        <select
          name="classification"
          value={formData.classification}
          onChange={handleChange}
          className="w-full px-3 py-2 border border-input rounded-lg bg-background"
        >
          <option value="unknown">Unknown</option>
          <option value="disease">Disease</option>
          <option value="handling">Handling</option>
          <option value="environmental">Environmental</option>
          <option value="predation">Predation</option>
          <option value="theft">Theft</option>
          <option value="uncounted">Uncounted (from bottom)</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Comments</label>
        <textarea
          name="comment"
          placeholder="Any symptoms or observations..."
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
          Log Mortality
        </button>
      </div>
    </form>
  )
}
