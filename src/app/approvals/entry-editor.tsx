"use client"
import type { ApprovalType } from "@/lib/approvals"
import { MORTALITY_CAUSES } from "@/lib/mortality"
import { FEEDING_RESPONSE_LEVELS } from "@/lib/feeding-response"

type Option = { id: number; name: string }
type Payload = Record<string, unknown>
const keys: Record<ApprovalType, string[]> = {
  feeding: ["date", "feed_type_id", "feeding_amount", "feeding_response", "notes"],
  mortality: ["date", "number_of_fish_mortality", "total_weight_mortality", "cause", "notes"],
  sampling: ["date", "number_of_fish_sampling", "total_weight_sampling", "notes"],
  stocking: ["date", "batch_id", "type_of_stocking", "number_of_fish_stocking", "total_weight_stocking", "notes"],
  harvest: ["date", "type_of_harvest", "number_of_fish_harvest", "total_weight_harvest"],
  transfer: ["date", "transfer_type", "target_system_id", "external_target_name", "number_of_fish_transfer", "total_weight_transfer", "notes"],
  water_quality: ["date", "time", "water_depth", "parameter_name", "parameter_value", "location_reference"],
  feed_inventory: ["inventory_date", "inventory_time", "feed_type_id", "bag_weight", "amount_of_bags", "opened_bags", "comments"],
}
const enums: Record<string, readonly string[]> = {
  cause: MORTALITY_CAUSES,
  type_of_harvest: ["partial", "final"], type_of_stocking: ["empty", "already_stocked"],
  transfer_type: ["transfer", "grading", "density_thinning", "broodstock", "count_check", "lab_sample", "training", "external_out"],
  parameter_name: ["temperature", "dissolved_oxygen", "pH", "ammonia", "nitrite", "nitrate"],
}
const labels: Record<string, string> = {
  feeding_amount: "Feed given (kg)", feeding_response: "Feeding response", feed_type_id: "Feed type", batch_id: "Batch",
  target_system_id: "Destination cage", external_target_name: "External destination", water_depth: "Depth (m)",
  bag_weight: "Weight per bag (kg)", amount_of_bags: "Unopened whole bags", opened_bags: "Loose feed (g)",
}
const humanize = (key: string) => key.replaceAll("_", " ").replace(/^./, (char) => char.toUpperCase())
export function waterQualityUnit(parameter: unknown) { return parameter === "temperature" ? "°C" : parameter === "pH" ? "pH" : "mg/L" }

export function EntryEditor({ type, draft, onChange, disabled, systems, batches, feeds }: {
  type: ApprovalType; draft: Payload; onChange: (draft: Payload) => void; disabled: boolean;
  systems: Option[]; batches: Option[]; feeds: Option[]
}) {
  return <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{keys[type].filter((key) =>
    !(key === "target_system_id" && draft.transfer_type === "external_out") &&
    !(key === "external_target_name" && draft.transfer_type !== "external_out")
  ).map((key) => {
    const options = key === "feed_type_id" ? feeds : key === "target_system_id" ? systems.filter((s) => s.id !== Number(draft.origin_system_id)) : key === "batch_id" ? batches : null
    const numeric = !!options || key === "feeding_response" || key.startsWith("number_of_") || key.startsWith("total_weight_") || ["feeding_amount", "water_depth", "parameter_value", "bag_weight", "amount_of_bags", "opened_bags"].includes(key)
    const conditionallyRequired = (type === "feeding" && key === "notes" && Number(draft.feeding_amount) === 0) || (type === "mortality" && key === "total_weight_mortality" && Number(draft.number_of_fish_mortality) >= 100)
    const optional = !conditionallyRequired && (["notes", "comments", "location_reference", "total_weight_mortality"].includes(key) || (type === "feeding" && Number(draft.feeding_amount) === 0 && ["feeding_response", "feed_type_id"].includes(key)))
    const label = labels[key] ?? (key.startsWith("total_weight_") ? "Total weight (kg)" : key === "parameter_value" ? `Reading (${waterQualityUnit(draft.parameter_name)})` : humanize(key))
    const change = (raw: string) => {
      const next = { ...draft, [key]: raw === "" ? null : numeric ? Number(raw) : raw }
      if (key === "transfer_type") {
        next.target_system_id = null; next.external_target_name = null
      }
      if (type === "water_quality" && (key === "date" || key === "time")) next.measured_at = `${next.date}T${String(next.time).slice(0, 5)}:00`
      if (key === "feed_type_id" && type === "feed_inventory") next.feed_type_label = feeds.find((feed) => feed.id === Number(raw))?.name ?? null
      onChange(next)
    }
    const choices = options?.map((o) => [String(o.id), o.name]) ?? (key === "feeding_response" ? FEEDING_RESPONSE_LEVELS.map((o) => [String(o.level), `Level ${o.level} – ${o.label}`]) : enums[key]?.map((v) => [v, humanize(v)]))
    const className = "mt-1 block w-full rounded-md border border-border bg-background px-3 py-2 text-sm disabled:opacity-50"
    return <label key={key} className="block text-sm"><span>{label}{optional ? " (optional)" : " *"}</span>
      {choices ? <select className={className} disabled={disabled} required={!optional} value={String(draft[key] ?? "")} onChange={(event) => change(event.target.value)}>
        <option value="">Select…</option>{choices.map(([value, text]) => <option key={value} value={value}>{text}</option>)}
      </select> : <input className={className} disabled={disabled} required={!optional} aria-required={!optional}
        type={key.includes("date") ? "date" : key === "time" || key === "inventory_time" ? "time" : numeric ? "number" : "text"}
        min={numeric ? (key === "parameter_value" && draft.parameter_name === "temperature" ? undefined : 0) : undefined}
        max={key === "parameter_value" && draft.parameter_name === "pH" ? 14 : undefined}
        step={key.startsWith("number_of_") || ["amount_of_bags", "opened_bags"].includes(key) ? "1" : "any"}
        value={String(draft[key] ?? "")} onChange={(event) => change(event.target.value)} />}
    </label>
  })}</div>
}
