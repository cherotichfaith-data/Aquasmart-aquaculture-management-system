"use client"
import { Fragment, useEffect, useMemo, useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Check, CheckCircle2, ChevronDown, ChevronRight, Loader2, Pencil, X, XCircle } from "lucide-react"
import { approvalTypes, type ApprovalEntry, type ApprovalType } from "@/lib/approvals"

type ApprovalStatus = ApprovalEntry["status"]
type Counts = Record<ApprovalStatus, number>
type ApprovalsResponse = { entries: ApprovalEntry[]; total: number; counts: Counts }
type NamedOption = { id: number; name: string }
type Member = { id: string; name: string }
type Payload = Record<string, unknown>
type Field = { label: string; value: (payload: Payload) => string }

const fieldLabel = (key: string) => key.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase())
const cap = (value: string) => value.charAt(0).toUpperCase() + value.slice(1)
const unit = (key: string) => (key.startsWith("total_weight") || key === "feeding_amount" || key === "bag_weight" ? " (kg)" : "")
const control = "rounded-md border border-border bg-background px-3 py-2 text-sm disabled:opacity-50"
// Structural fields the queue owns; everything else in the payload is operator-editable.
const lockedFields = ["local_id", "synced_at", "farm_id", "system_id"]

const text = (value: unknown) => (value == null || value === "" ? "—" : String(value))
const count = (value: unknown) => (value == null || value === "" ? "—" : Number(value).toLocaleString("en-US"))
const kg = (value: unknown) => (value == null || value === "" ? "—" : `${Number(value).toLocaleString("en-US", { maximumFractionDigits: 3 })} kg`)

export default function ApprovalsClient({
  farmId, canReview, currentUserId, systems, batches, feedTypes, members,
}: {
  farmId: string
  canReview: boolean
  currentUserId: string
  systems: NamedOption[]
  batches: NamedOption[]
  feedTypes: NamedOption[]
  members: Member[]
}) {
  const [status, setStatus] = useState<ApprovalStatus>("pending")
  const [type, setType] = useState("")
  const [page, setPage] = useState(0)
  const [selected, setSelected] = useState<number[]>([])
  const [openId, setOpenId] = useState<number | null>(null)
  const [review, setReview] = useState<{ ids: number[]; decision: "approved" | "rejected" } | null>(null)
  const [reason, setReason] = useState("")
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null)
  const [editId, setEditId] = useState<number | null>(null)
  const [draft, setDraft] = useState<Payload>({})
  const [savingEdit, setSavingEdit] = useState(false)
  const cache = useQueryClient()

  const query = useQuery<ApprovalsResponse>({
    queryKey: ["approvals", farmId, status, type, page],
    queryFn: async ({ signal }) => {
      const response = await fetch(`/api/approvals?${new URLSearchParams({ farmId, status, type, page: String(page) })}`, { signal, cache: "no-store" })
      const body = await response.json()
      if (!response.ok) throw new Error(body.error ?? "Unable to load submissions")
      return body
    },
    refetchInterval: review || editId != null ? false : 30000,
  })

  useEffect(() => {
    const refresh = () => { void cache.invalidateQueries({ queryKey: ["approvals", farmId] }) }
    window.addEventListener("offline-sync-complete", refresh)
    return () => window.removeEventListener("offline-sync-complete", refresh)
  }, [cache, farmId])

  const names = useMemo(() => {
    const sys = new Map(systems.map((row) => [row.id, row.name]))
    const batch = new Map(batches.map((row) => [row.id, row.name]))
    const feed = new Map(feedTypes.map((row) => [row.id, row.name]))
    const user = new Map(members.filter((row) => row.name).map((row) => [row.id, row.name]))
    return {
      system: (id: unknown) => (id == null || id === "" ? "—" : sys.get(Number(id)) ?? `Cage #${id}`),
      batch: (id: unknown) => (id == null || id === "" ? "—" : batch.get(Number(id)) ?? `Batch #${id}`),
      feed: (id: unknown) => (id == null || id === "" ? "—" : feed.get(Number(id)) ?? `Feed #${id}`),
      user: (id: string) => user.get(id) ?? "Unknown user",
    }
  }, [systems, batches, feedTypes, members])

  // Full field breakdown per type, shown when a row is opened.
  const fieldsByType = useMemo<Record<ApprovalType, Field[]>>(() => ({
    feeding: [
      { label: "Date", value: (p) => text(p.date) },
      { label: "Cage", value: (p) => names.system(p.system_id) },
      { label: "Batch", value: (p) => names.batch(p.batch_id) },
      { label: "Feeding amount", value: (p) => kg(p.feeding_amount) },
      { label: "Feed type", value: (p) => names.feed(p.feed_type_id) },
      { label: "Feeding response", value: (p) => text(p.feeding_response) },
      { label: "Notes", value: (p) => text(p.notes) },
    ],
    mortality: [
      { label: "Date", value: (p) => text(p.date) },
      { label: "Cage", value: (p) => names.system(p.system_id) },
      { label: "Batch", value: (p) => names.batch(p.batch_id) },
      { label: "Dead fish", value: (p) => count(p.number_of_fish_mortality) },
      { label: "Total weight", value: (p) => kg(p.total_weight_mortality) },
      { label: "Cause", value: (p) => text(p.cause) },
      { label: "Notes", value: (p) => text(p.notes) },
    ],
    sampling: [
      { label: "Date", value: (p) => text(p.date) },
      { label: "Cage", value: (p) => names.system(p.system_id) },
      { label: "Batch", value: (p) => names.batch(p.batch_id) },
      { label: "Fish sampled", value: (p) => count(p.number_of_fish_sampling) },
      { label: "Total weight", value: (p) => kg(p.total_weight_sampling) },
      { label: "Notes", value: (p) => text(p.notes) },
    ],
    stocking: [
      { label: "Date", value: (p) => text(p.date) },
      { label: "Cage", value: (p) => names.system(p.system_id) },
      { label: "Batch", value: (p) => names.batch(p.batch_id) },
      { label: "Fish stocked", value: (p) => count(p.number_of_fish_stocking) },
      { label: "Total weight", value: (p) => kg(p.total_weight_stocking) },
      { label: "Stocking type", value: (p) => text(p.type_of_stocking) },
      { label: "Notes", value: (p) => text(p.notes) },
    ],
    transfer: [
      { label: "Date", value: (p) => text(p.date) },
      { label: "From cage", value: (p) => names.system(p.origin_system_id) },
      { label: "To", value: (p) => (p.transfer_type === "external_out" ? text(p.external_target_name) : names.system(p.target_system_id)) },
      { label: "Batch", value: (p) => names.batch(p.batch_id) },
      { label: "Fish transferred", value: (p) => count(p.number_of_fish_transfer) },
      { label: "Total weight", value: (p) => kg(p.total_weight_transfer) },
      { label: "Transfer type", value: (p) => text(p.transfer_type) },
      { label: "Notes", value: (p) => text(p.notes) },
    ],
    harvest: [
      { label: "Date", value: (p) => text(p.date) },
      { label: "Cage", value: (p) => names.system(p.system_id) },
      { label: "Batch", value: (p) => names.batch(p.batch_id) },
      { label: "Fish harvested", value: (p) => count(p.number_of_fish_harvest) },
      { label: "Total weight", value: (p) => kg(p.total_weight_harvest) },
      { label: "Harvest type", value: (p) => text(p.type_of_harvest) },
    ],
    water_quality: [
      { label: "Date", value: (p) => text(p.date) },
      { label: "Cage", value: (p) => names.system(p.system_id) },
      { label: "Time", value: (p) => text(p.time) },
      { label: "Water depth", value: (p) => (p.water_depth == null ? "—" : `${p.water_depth} m`) },
      { label: "Parameter", value: (p) => text(String(p.parameter_name ?? "").replaceAll("_", " ") || "—") },
      { label: "Value", value: (p) => text(p.parameter_value) },
      { label: "Location", value: (p) => text(p.location_reference) },
    ],
    feed_inventory: [
      { label: "Date", value: (p) => text(p.inventory_date) },
      { label: "Time", value: (p) => text(p.inventory_time) },
      { label: "Feed type", value: (p) => names.feed(p.feed_type_id) },
      { label: "Bag weight", value: (p) => kg(p.bag_weight) },
      { label: "Bags counted", value: (p) => count(p.amount_of_bags) },
      { label: "Opened bags", value: (p) => text(p.opened_bags) },
      { label: "Comments", value: (p) => text(p.comments) },
    ],
  }), [names])

  // Compact one-line summary shown on the table row.
  const summarize = (entry: ApprovalEntry): string => {
    const p = entry.payload
    switch (entry.entry_type) {
      case "feeding":
        return Number(p.feeding_amount) > 0 ? `${kg(p.feeding_amount)} · ${names.feed(p.feed_type_id)}` : "Feeding not done"
      case "mortality":
        return `${count(p.number_of_fish_mortality)} fish · ${text(p.cause)}`
      case "sampling":
        return `${count(p.number_of_fish_sampling)} fish · ${kg(p.total_weight_sampling)}`
      case "stocking":
        return `${count(p.number_of_fish_stocking)} fish · ${kg(p.total_weight_stocking)}`
      case "transfer":
        return `${count(p.number_of_fish_transfer)} fish → ${p.transfer_type === "external_out" ? text(p.external_target_name) : names.system(p.target_system_id)}`
      case "harvest":
        return `${count(p.number_of_fish_harvest)} fish · ${kg(p.total_weight_harvest)}`
      case "water_quality":
        return `${text(String(p.parameter_name ?? "").replaceAll("_", " "))} ${text(p.parameter_value)}`
      case "feed_inventory":
        return `${count(p.amount_of_bags)} bags · ${names.feed(p.feed_type_id)}`
      default:
        return "—"
    }
  }
  const rowCage = (entry: ApprovalEntry) =>
    entry.entry_type === "feed_inventory"
      ? "Farm inventory"
      : names.system(entry.entry_type === "transfer" ? entry.payload.origin_system_id : entry.system_id)

  const entries = useMemo(() => query.data?.entries ?? [], [query.data?.entries])
  const counts = query.data?.counts
  const total = query.data?.total ?? 0
  const bulkIds = entries.filter((entry) => entry.entry_type !== "feed_inventory").map((entry) => entry.id)
  const showChecks = canReview && status === "pending"

  function begin(ids: number[], decision: "approved" | "rejected") { setMessage(null); setReason(""); setReview({ ids, decision }) }
  function reset() { setPage(0); setSelected([]); setMessage(null); setEditId(null); setOpenId(null) }

  async function decide() {
    if (!review) return
    setBusy(true); setMessage(null)
    try {
      const response = await fetch("/api/approvals", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ farmId, ...review, reason }) })
      const body = await response.json()
      if (!response.ok) throw new Error(body.error ?? "Review failed")
      setMessage({ tone: "ok", text: `${review.ids.length} ${review.ids.length === 1 ? "entry" : "entries"} ${review.decision}.` })
      setReview(null); setSelected([]); setOpenId(null)
      await cache.invalidateQueries()
    } catch (error) { setMessage({ tone: "error", text: error instanceof Error ? error.message : "Review failed" }) }
    finally { setBusy(false) }
  }

  const canEdit = (entry: ApprovalEntry) => entry.status === "pending" && (canReview || entry.submitted_by === currentUserId)
  const editableKeys = (payload: Payload) => Object.keys(payload).filter((key) => !lockedFields.includes(key))
  function beginEdit(entry: ApprovalEntry) { setMessage(null); setReview(null); setOpenId(entry.id); setEditId(entry.id); setDraft({ ...entry.payload }) }
  async function saveEdit() {
    if (editId == null) return
    setSavingEdit(true); setMessage(null)
    try {
      const response = await fetch(`/api/approvals/${editId}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ payload: draft }),
      })
      const body = await response.json()
      if (!response.ok) throw new Error(body.error ?? "Could not save the change")
      setMessage({ tone: "ok", text: "Entry updated." })
      setEditId(null)
      await cache.invalidateQueries({ queryKey: ["approvals", farmId] })
    } catch (error) { setMessage({ tone: "error", text: error instanceof Error ? error.message : "Could not save the change" }) }
    finally { setSavingEdit(false) }
  }

  const busyAny = busy || savingEdit
  const columnCount = (showChecks ? 1 : 0) + (status === "pending" ? 5 : 6) + 1

  return (
    <section className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3" aria-label="Approval status summary">
        {(["pending", "approved", "rejected"] as const).map((value) => (
          <button
            key={value}
            type="button"
            disabled={!!review}
            aria-current={status === value ? "true" : undefined}
            onClick={() => { setStatus(value); reset() }}
            className={`rounded-2xl border bg-card px-5 py-4 text-left shadow-sm transition-colors disabled:opacity-60 ${
              status === value ? "border-primary ring-1 ring-primary/15" : "border-border hover:border-primary/45"
            }`}
          >
            <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">{cap(value)}</span>
            <strong className="mt-1.5 block text-3xl font-bold tabular-nums text-primary">
              {(counts?.[value] ?? 0).toLocaleString("en-US")}
            </strong>
          </button>
        ))}
      </div>

      <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div>
            <h2 className="text-lg font-bold text-primary">{cap(status)} entries</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {status === "pending" ? "Open a row to see the full record, then approve, reject or edit it." : "Open a row to see the full record."}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              aria-label="Entry type"
              className={control}
              disabled={!!review}
              value={type}
              onChange={(event) => { setType(event.target.value); reset() }}
            >
              <option value="">All entry types</option>
              {Object.entries(approvalTypes).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
            <button type="button" className={control} disabled={query.isFetching || !!review} onClick={() => { setSelected([]); void query.refetch() }}>
              Refresh
            </button>
            {showChecks && (
              <>
                <button
                  type="button"
                  onClick={() => begin(selected, "rejected")}
                  disabled={!selected.length || !!review}
                  className="inline-flex h-10 items-center gap-2 rounded-full border border-destructive/40 bg-card px-4 text-sm font-bold text-destructive transition-colors hover:bg-destructive/5 disabled:cursor-not-allowed disabled:opacity-45"
                >
                  <XCircle className="h-4 w-4" /> Reject selected ({selected.length})
                </button>
                <button
                  type="button"
                  onClick={() => begin(selected, "approved")}
                  disabled={!selected.length || !!review}
                  className="inline-flex h-10 items-center gap-2 rounded-full bg-primary px-4 text-sm font-bold text-primary-foreground shadow-sm transition-opacity disabled:cursor-not-allowed disabled:opacity-45"
                >
                  <CheckCircle2 className="h-4 w-4" /> Approve selected ({selected.length})
                </button>
              </>
            )}
          </div>
        </div>

        {query.error && (
          <div className="mx-5 mt-4 rounded-lg border border-destructive/35 bg-destructive/10 px-3.5 py-3 text-sm font-medium text-destructive" role="alert">
            {(query.error as Error).message}
          </div>
        )}
        {message && (
          <div
            className={`mx-5 mt-4 rounded-lg border px-3.5 py-3 text-sm font-medium ${
              message.tone === "ok" ? "border-success/35 bg-success/10 text-success" : "border-destructive/35 bg-destructive/10 text-destructive"
            }`}
            role="status"
          >
            {message.text}
          </div>
        )}
        {review && (
          <div role="region" aria-label="Confirm review" className="mx-5 mt-4 space-y-3 rounded-lg border-2 border-primary bg-background p-4">
            <h3 className="font-semibold">{review.decision === "approved" ? "Approve" : "Reject"} {review.ids.length} {review.ids.length === 1 ? "entry" : "entries"}?</h3>
            <p className="text-sm">
              {review.decision === "approved"
                ? "Approval writes the records and their inventory effects together. If validation fails, none of this selection is approved."
                : "Rejected entries remain in history and do not change production or inventory."}
            </p>
            <label className="block text-sm">Review note (optional)
              <textarea autoFocus disabled={busy} maxLength={1000} className={`${control} mt-1 block w-full`} value={reason} onChange={(event) => setReason(event.target.value)} />
            </label>
            <div className="flex gap-2">
              <button type="button" className="inline-flex h-10 items-center gap-2 rounded-full bg-primary px-4 text-sm font-bold text-primary-foreground disabled:opacity-45" disabled={busy} onClick={() => void decide()}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Confirm decision
              </button>
              <button type="button" className={control} disabled={busy} onClick={() => setReview(null)}>Cancel</button>
            </div>
          </div>
        )}

        {query.isPending ? (
          <div className="grid min-h-52 place-items-center px-6 py-12 text-sm text-muted-foreground">Loading submissions…</div>
        ) : !query.error && entries.length === 0 ? (
          <div className="grid min-h-52 place-items-center px-6 py-12 text-center">
            <div>
              <CheckCircle2 className="mx-auto h-8 w-8 text-success" />
              <p className="mt-3 text-sm font-bold text-foreground">No {status} entries</p>
              <p className="mt-1 text-xs text-muted-foreground">There is nothing to review in this view.</p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
                <tr className="border-b border-border">
                  {showChecks && (
                    <th className="w-10 py-3 pl-5">
                      <input
                        type="checkbox"
                        aria-label="Select all on this page"
                        className="h-4 w-4 accent-primary"
                        disabled={!!review || !bulkIds.length}
                        checked={bulkIds.length > 0 && bulkIds.every((id) => selected.includes(id))}
                        onChange={(event) => setSelected(event.target.checked ? bulkIds : [])}
                      />
                    </th>
                  )}
                  <th className={`py-3 ${showChecks ? "" : "pl-5"}`}>Date</th>
                  <th className="py-3 pl-4">Type</th>
                  <th className="py-3 pl-4">Cage</th>
                  <th className="py-3 pl-4">Summary</th>
                  <th className="py-3 pl-4">Submitted by</th>
                  {status !== "pending" && <th className="py-3 pl-4">Status</th>}
                  <th className="py-3 pl-4 pr-5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {entries.map((entry) => {
                  const open = openId === entry.id
                  return (
                    <Fragment key={entry.id}>
                      <tr
                        className="cursor-pointer align-middle transition-colors hover:bg-muted/40"
                        onClick={() => { setOpenId(open ? null : entry.id); if (open) setEditId(null) }}
                      >
                        {showChecks && (
                          <td className="py-3.5 pl-5" onClick={(event) => event.stopPropagation()}>
                            {entry.entry_type !== "feed_inventory" && (
                              <input
                                aria-label={`Select submission ${entry.id}`}
                                type="checkbox"
                                className="h-4 w-4 accent-primary"
                                disabled={!!review}
                                checked={selected.includes(entry.id)}
                                onChange={(event) => setSelected((ids) => event.target.checked ? [...ids, entry.id] : ids.filter((id) => id !== entry.id))}
                              />
                            )}
                          </td>
                        )}
                        <td className={`py-3.5 font-semibold tabular-nums text-foreground ${showChecks ? "" : "pl-5"}`}>{entry.event_date}</td>
                        <td className="py-3.5 pl-4">
                          <span className="inline-flex rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold text-foreground">
                            {approvalTypes[entry.entry_type]}
                          </span>
                        </td>
                        <td className="py-3.5 pl-4 text-muted-foreground">{rowCage(entry)}</td>
                        <td className="max-w-[280px] truncate py-3.5 pl-4">{summarize(entry)}</td>
                        <td className="py-3.5 pl-4 text-muted-foreground">{names.user(entry.submitted_by)}</td>
                        {status !== "pending" && (
                          <td className="py-3.5 pl-4">
                            <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold ${
                              entry.status === "approved" ? "bg-success/12 text-success" : "bg-destructive/12 text-destructive"
                            }`}>
                              {cap(entry.status)}
                            </span>
                          </td>
                        )}
                        <td className="py-3.5 pl-4 pr-5 text-right">
                          <span className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1 text-xs font-bold">
                            {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                            {open ? "Close" : "Open"}
                          </span>
                        </td>
                      </tr>

                      {open && (
                        <tr>
                          <td colSpan={columnCount} className="bg-muted/25 px-5 py-4">
                            {editId === entry.id ? (
                              <div className="space-y-3">
                                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                  {editableKeys(entry.payload).map((key) => {
                                    const original = entry.payload[key]
                                    return (
                                      <label key={key} className="block text-sm">
                                        <span className="text-muted-foreground">{fieldLabel(key)}{unit(key)}</span>
                                        <input
                                          className={`${control} mt-1 block w-full`}
                                          disabled={savingEdit}
                                          type={typeof original === "number" ? "number" : "text"}
                                          value={draft[key] == null ? "" : String(draft[key])}
                                          onChange={(event) => {
                                            const raw = event.target.value
                                            setDraft((currentDraft) => ({ ...currentDraft, [key]: raw === "" ? null : typeof original === "number" ? Number(raw) : raw }))
                                          }}
                                        />
                                      </label>
                                    )
                                  })}
                                </div>
                                <div className="flex gap-2">
                                  <button type="button" className="inline-flex h-10 items-center gap-2 rounded-full bg-primary px-4 text-sm font-bold text-primary-foreground disabled:opacity-45" disabled={savingEdit} onClick={() => void saveEdit()}>
                                    {savingEdit ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Save changes
                                  </button>
                                  <button type="button" className={control} disabled={savingEdit} onClick={() => setEditId(null)}>Cancel</button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <dl className="grid gap-x-8 gap-y-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
                                  {(fieldsByType[entry.entry_type] ?? []).map((field) => (
                                    <div key={field.label}>
                                      <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{field.label}</dt>
                                      <dd className="mt-0.5 break-words font-medium text-foreground">{field.value(entry.payload)}</dd>
                                    </div>
                                  ))}
                                </dl>
                                <p className="mt-4 text-xs text-muted-foreground">
                                  Submitted by {names.user(entry.submitted_by)} · {new Date(entry.submitted_at).toLocaleString()}
                                  {entry.reviewed_at ? ` · Reviewed by ${names.user(entry.reviewed_by ?? "")} · ${new Date(entry.reviewed_at).toLocaleString()}` : ""}
                                  {entry.official_record_id ? ` · Official record #${entry.official_record_id}` : ""}
                                </p>
                                {entry.review_reason && <p className="mt-1 text-sm text-foreground">Review note: {entry.review_reason}</p>}
                                {entry.status === "pending" && (canEdit(entry) || canReview) && (
                                  <div className="mt-4 flex flex-wrap gap-2">
                                    {canEdit(entry) && (
                                      <button type="button" className="inline-flex h-10 items-center gap-1.5 rounded-full border border-border bg-card px-4 text-sm font-bold disabled:opacity-45" disabled={!!review} onClick={() => beginEdit(entry)}>
                                        <Pencil className="h-4 w-4" /> Edit
                                      </button>
                                    )}
                                    {canReview && (
                                      <>
                                        <button type="button" className="inline-flex h-10 items-center gap-1.5 rounded-full bg-primary px-4 text-sm font-bold text-primary-foreground disabled:opacity-45" disabled={!!review} onClick={() => begin([entry.id], "approved")}>
                                          <Check className="h-4 w-4" /> Approve
                                        </button>
                                        <button type="button" className="inline-flex h-10 items-center gap-1.5 rounded-full border border-destructive/40 bg-card px-4 text-sm font-bold text-destructive hover:bg-destructive/5 disabled:opacity-45" disabled={!!review} onClick={() => begin([entry.id], "rejected")}>
                                          <X className="h-4 w-4" /> Reject
                                        </button>
                                      </>
                                    )}
                                  </div>
                                )}
                              </>
                            )}
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {total > 50 && (
          <div className="flex items-center justify-between border-t border-border px-5 py-3 text-sm">
            <button type="button" className={control} disabled={page === 0 || busyAny || !!review} onClick={() => { setPage(page - 1); reset() }}>Previous</button>
            <span>Page {page + 1} · {total.toLocaleString("en-US")} entries</span>
            <button type="button" className={control} disabled={(page + 1) * 50 >= total || busyAny || !!review} onClick={() => { setPage(page + 1); reset() }}>Next</button>
          </div>
        )}
      </section>
    </section>
  )
}
