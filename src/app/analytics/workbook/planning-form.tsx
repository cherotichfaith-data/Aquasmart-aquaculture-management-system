"use client"

import { useState } from "react"
import { savePlanningSettings } from "./actions"

export default function PlanningForm({ farmId, fish, abw, scenario }: { farmId: string; fish: number; abw: number; scenario: string }) {
  const [message, setMessage] = useState("")
  const [saving, setSaving] = useState(false)
  return <form className="flex flex-wrap items-end gap-4" onSubmit={async event => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setSaving(true)
    try { const result = await savePlanningSettings(form); setMessage(result.error ?? "Saved. Analytics will use these defaults.") }
    catch { setMessage("Could not save. Please try again.") }
    finally { setSaving(false) }
  }}>
    <input type="hidden" name="farm_id" value={farmId} />
    <label>Monthly stocking (fish)<input className="block rounded border p-2" name="planned_fish" type="number" min="0" max="10000000" step="1" required defaultValue={fish} /></label>
    <label>Stocking ABW (g)<input className="block rounded border p-2" name="planned_abw_g" type="number" min="0.1" max="100" step="any" required defaultValue={abw} /></label>
    <label>Growth scenario<select className="block rounded border p-2" name="scenario" defaultValue={scenario}><option value="main">Main</option><option value="slow">Slow</option><option value="potential">Potential</option></select></label>
    <button className="rounded border px-4 py-2" disabled={saving}>{saving ? "Saving…" : "Save farm defaults"}</button>
    <p role="status" className="w-full text-sm">{message}</p>
  </form>
}
