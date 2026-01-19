"use client"

import type React from "react"

import { useState } from "react"

export default function FeedingForm({ onSubmit }: { onSubmit: () => void }) {
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split("T")[0],
    system: "Cage-1",
    feedAmount: "",
    feedType: "grow-out",
    feedResponse: "good",
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

      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Feed Amount (kg)</label>
          <input
            type="number"
            name="feedAmount"
            placeholder="0.00"
            step="0.1"
            value={formData.feedAmount}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-input rounded-lg bg-background"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Feed Type</label>
          <select
            name="feedType"
            value={formData.feedType}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-input rounded-lg bg-background"
          >
            <option value="starter">Starter (45% protein)</option>
            <option value="pregrower">Pre-grower (38% protein)</option>
            <option value="grow-out">Grow-out (32% protein)</option>
          </select>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Feeding Response</label>
          <select
            name="feedResponse"
            value={formData.feedResponse}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-input rounded-lg bg-background"
          >
            <option value="good">Good</option>
            <option value="moderate">Moderate</option>
            <option value="poor">Poor</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Comments</label>
        <textarea
          name="comment"
          placeholder="Any additional notes..."
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
          Record Feeding
        </button>
      </div>
    </form>
  )
}
