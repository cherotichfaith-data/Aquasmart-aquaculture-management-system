"use client"
import { useEffect, useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Check, CheckCircle2, Loader2, Pencil, X, XCircle } from "lucide-react"
import { approvalTypes, type ApprovalEntry } from "@/lib/approvals"

type ApprovalStatus = ApprovalEntry["status"]
type Counts = Record<ApprovalStatus, number>
type ApprovalsResponse = { entries: ApprovalEntry[]; total: number; counts: Counts }

const fieldLabel = (key: string) => key.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase())
const cap = (value: string) => value.charAt(0).toUpperCase() + value.slice(1)
const unit = (key: string) => (key.startsWith("total_weight") || key === "feeding_amount" || key === "bag_weight" ? " (kg)" : "")
const control = "rounded-md border border-border bg-background px-3 py-2 text-sm disabled:opacity-50"
// Structural fields the queue owns; everything else in the payload is operator-editable.
const lockedFields = ["local_id", "synced_at", "farm_id", "system_id"]
const hiddenInPreview = ["local_id", "synced_at", "farm_id", "system_id", "date", "inventory_date"]

export default function ApprovalsClient({ farmId, canReview, currentUserId, systems }: { farmId: string; canReview: boolean; currentUserId: string; systems: { id: number; name: string }[] }) {
  const [status, setStatus] = useState<ApprovalStatus>("pending")
  const [type, setType] = useState("")
  const [page, setPage] = useState(0)
  const [selected, setSelected] = useState<number[]>([])
  const [review, setReview] = useState<{ ids: number[]; decision: "approved" | "rejected" } | null>(null)
  const [reason, setReason] = useState("")
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null)
  const [editId, setEditId] = useState<number | null>(null)
  const [draft, setDraft] = useState<Record<string, unknown>>({})
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

  const entries = query.data?.entries ?? []
  const counts = query.data?.counts
  const total = query.data?.total ?? 0
  const bulkIds = entries.filter((entry) => entry.entry_type !== "feed_inventory").map((entry) => entry.id)
  const systemName = (id: number | null | undefined) => systems.find((system) => system.id === id)?.name

  function begin(ids: number[], decision: "approved" | "rejected") { setMessage(null); setReason(""); setReview({ ids, decision }) }
  function reset() { setPage(0); setSelected([]); setMessage(null); setEditId(null) }

  async function decide() {
    if (!review) return
    setBusy(true); setMessage(null)
    try {
      const response = await fetch("/api/approvals", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ farmId, ...review, reason }) })
      const body = await response.json()
      if (!response.ok) throw new Error(body.error ?? "Review failed")
      setMessage({ tone: "ok", text: `${review.ids.length} ${review.ids.length === 1 ? "entry" : "entries"} ${review.decision}.` })
      setReview(null); setSelected([])
      await cache.invalidateQueries()
    } catch (error) { setMessage({ tone: "error", text: error instanceof Error ? error.message : "Review failed" }) }
    finally { setBusy(false) }
  }

  const canEdit = (entry: ApprovalEntry) => entry.status === "pending" && (canReview || entry.submitted_by === currentUserId)
  const editableKeys = (payload: Record<string, unknown>) => Object.keys(payload).filter((key) => !lockedFields.includes(key))
  function beginEdit(entry: ApprovalEntry) { setMessage(null); setReview(null); setEditId(entry.id); setDraft({ ...entry.payload }) }
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

  return (
    <section className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-3" aria-label="Approval status summary">
        {(["pending", "approved", "rejected"] as const).map((value) => (
          <button
            key={value}
            type="button"
            disabled={!!review}
            aria-current={status === value ? "true" : undefined}
            onClick={() => { setStatus(value); reset() }}
            className={`rounded-xl border bg-card px-4 py-3 text-left shadow-sm transition-colors disabled:opacity-60 ${
              status === value ? "border-primary ring-1 ring-primary/15" : "border-border hover:border-primary/45"
            }`}
          >
            <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">{cap(value)}</span>
            <strong className="mt-1 block text-2xl font-bold tabular-nums text-primary">
              {(counts?.[value] ?? 0).toLocaleString("en-US")}
            </strong>
          </button>
        ))}
      </div>

      <section className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="flex min-h-14 flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
          <div>
            <h2 className="text-base font-bold text-primary">{cap(status)} entries</h2>
            <p className="text-xs text-muted-foreground">Validation is repeated immediately before every approval.</p>
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
            {canReview && status === "pending" && (
              <>
                <button
                  type="button"
                  onClick={() => begin(selected, "rejected")}
                  disabled={!selected.length || !!review}
                  className="inline-flex h-10 items-center gap-2 rounded-lg border border-destructive/40 bg-card px-4 text-sm font-bold text-destructive transition-colors hover:bg-destructive/5 disabled:cursor-not-allowed disabled:opacity-45"
                >
                  <XCircle className="h-4 w-4" /> Reject selected ({selected.length})
                </button>
                <button
                  type="button"
                  onClick={() => begin(selected, "approved")}
                  disabled={!selected.length || !!review}
                  className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-bold text-primary-foreground shadow-sm transition-opacity disabled:cursor-not-allowed disabled:opacity-45"
                >
                  <CheckCircle2 className="h-4 w-4" /> Approve selected ({selected.length})
                </button>
              </>
            )}
          </div>
        </div>

        {query.error && (
          <div className="mx-4 mt-4 rounded-lg border border-destructive/35 bg-destructive/10 px-3.5 py-3 text-sm font-medium text-destructive" role="alert">
            {(query.error as Error).message}
          </div>
        )}
        {message && (
          <div
            className={`mx-4 mt-4 rounded-lg border px-3.5 py-3 text-sm font-medium ${
              message.tone === "ok" ? "border-success/35 bg-success/10 text-success" : "border-destructive/35 bg-destructive/10 text-destructive"
            }`}
            role="status"
          >
            {message.text}
          </div>
        )}
        {review && (
          <div role="region" aria-label="Confirm review" className="mx-4 mt-4 space-y-3 rounded-lg border-2 border-primary bg-background p-4">
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
              <button type="button" className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-bold text-primary-foreground disabled:opacity-45" disabled={busy} onClick={() => void decide()}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Confirm decision
              </button>
              <button type="button" className={control} disabled={busy} onClick={() => setReview(null)}>Cancel</button>
            </div>
          </div>
        )}

        {canReview && status === "pending" && entries.length > 0 && (
          <div className="flex items-center gap-2 border-b border-border px-4 py-2 text-sm">
            <input
              type="checkbox"
              className="h-4 w-4 accent-primary"
              disabled={!!review || !bulkIds.length}
              checked={bulkIds.length > 0 && bulkIds.every((id) => selected.includes(id))}
              onChange={(event) => setSelected(event.target.checked ? bulkIds : [])}
            />
            Select all on this page (feed counts are reviewed individually)
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
          <ul className="divide-y divide-border">
            {entries.map((entry) => (
              <li key={entry.id} className="px-4 py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex gap-3">
                    {canReview && status === "pending" && entry.entry_type !== "feed_inventory" && (
                      <input
                        aria-label={`Select submission ${entry.id}`}
                        type="checkbox"
                        className="mt-1 h-4 w-4 accent-primary"
                        disabled={!!review}
                        checked={selected.includes(entry.id)}
                        onChange={(event) => setSelected((ids) => event.target.checked ? [...ids, entry.id] : ids.filter((id) => id !== entry.id))}
                      />
                    )}
                    <div>
                      <h3 className="font-semibold">{approvalTypes[entry.entry_type]} · {entry.event_date}</h3>
                      <p className="text-sm text-muted-foreground">
                        {systemName(entry.system_id) ?? "Farm inventory"} · Submission #{entry.id}
                        {entry.status !== "pending" ? ` · ${entry.status}` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {canEdit(entry) && editId !== entry.id && (
                      <button type="button" className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-xs font-bold disabled:opacity-45" disabled={!!review} onClick={() => beginEdit(entry)}>
                        <Pencil className="h-3.5 w-3.5" /> Edit
                      </button>
                    )}
                    {canReview && status === "pending" && (
                      <>
                        <button type="button" className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-bold text-primary-foreground disabled:opacity-45" disabled={!!review || editId === entry.id} onClick={() => begin([entry.id], "approved")}>
                          <Check className="h-3.5 w-3.5" /> Approve
                        </button>
                        <button type="button" className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-xs font-bold text-destructive hover:bg-destructive/5 disabled:opacity-45" disabled={!!review || editId === entry.id} onClick={() => begin([entry.id], "rejected")}>
                          <X className="h-3.5 w-3.5" /> Reject
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {editId === entry.id ? (
                  <div className="mt-3 space-y-3">
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
                                setDraft((current) => ({ ...current, [key]: raw === "" ? null : typeof original === "number" ? Number(raw) : raw }))
                              }}
                            />
                          </label>
                        )
                      })}
                    </div>
                    <div className="flex gap-2">
                      <button type="button" className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-bold text-primary-foreground disabled:opacity-45" disabled={savingEdit} onClick={() => void saveEdit()}>
                        {savingEdit ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Save changes
                      </button>
                      <button type="button" className={control} disabled={savingEdit} onClick={() => setEditId(null)}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <dl className="mt-3 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
                    {Object.entries(entry.payload)
                      .filter(([key, value]) => value != null && !hiddenInPreview.includes(key))
                      .map(([key, value]) => (
                        <div key={key}>
                          <dt className="text-muted-foreground">{fieldLabel(key)}{unit(key)}</dt>
                          <dd className="break-words font-medium">
                            {key === "target_system_id" || key === "origin_system_id" ? systemName(value as number) ?? String(value) : String(value)}
                          </dd>
                        </div>
                      ))}
                  </dl>
                )}

                <p className="mt-3 text-xs text-muted-foreground">Submitted {new Date(entry.submitted_at).toLocaleString()} · User {entry.submitted_by}</p>
                {entry.reviewed_at && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Reviewed {new Date(entry.reviewed_at).toLocaleString()} · User {entry.reviewed_by}
                    {entry.official_record_id ? ` · Official record #${entry.official_record_id}` : ""}
                  </p>
                )}
                {entry.review_reason && <p className="mt-2 text-sm">Review note: {entry.review_reason}</p>}
              </li>
            ))}
          </ul>
        )}

        {total > 50 && (
          <div className="flex items-center justify-between border-t border-border px-4 py-3 text-sm">
            <button type="button" className={control} disabled={page === 0 || busyAny || !!review} onClick={() => { setPage(page - 1); setSelected([]) }}>Previous</button>
            <span>Page {page + 1} · {total.toLocaleString("en-US")} entries</span>
            <button type="button" className={control} disabled={(page + 1) * 50 >= total || busyAny || !!review} onClick={() => { setPage(page + 1); setSelected([]) }}>Next</button>
          </div>
        )}
      </section>
    </section>
  )
}
