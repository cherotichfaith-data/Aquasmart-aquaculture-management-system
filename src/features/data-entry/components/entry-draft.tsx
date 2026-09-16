"use client"

import { useEffect, useRef, useState } from "react"
import { useFormContext } from "react-hook-form"
import { useAuth } from "@/components/providers/auth-provider"
import { Button } from "@/components/app-ui/button"

/** Drafts are isolated by account, farm and form; successful saves clear them. */
export function EntryDraft({ farmId, kind, savedResult }: { farmId: string | null; kind: string; savedResult: unknown }) {
  const { user } = useAuth()
  const { watch, reset, getValues, setFocus, formState: { errors } } = useFormContext()
  const defaults = useRef(getValues())
  const [status, setStatus] = useState("")
  const dateKey = user?.id && farmId ? `aquasmart:entry-date:${user.id}:${farmId}` : null
  const key = user?.id && farmId ? `aquasmart:entry-draft:v1:${user.id}:${farmId}:${kind}` : null

  // Browser draft restoration synchronizes an external store after hydration.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!key) return
    try {
      const raw = localStorage.getItem(key)
      if (!raw && dateKey && kind !== "system") {
        const date = sessionStorage.getItem(dateKey)
        const field = kind === "stocking" ? "stocking_date" : kind === "feed_inventory" ? "inventory_date" : "date"
        if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) { reset({ ...defaults.current, [field]: date }, { keepDefaultValues: true }) }
      }
      if (raw) {
        const draft = JSON.parse(raw)
        if (draft && typeof draft.values === "object" && draft.values !== null && Date.now() - draft.savedAt < 7 * 86400000) {
          const values = Object.fromEntries(Object.keys(getValues()).map((name) => [name, draft.values[name] ?? defaults.current[name]]))
          reset(values, { keepDefaultValues: true })
          setStatus("Unsaved draft restored from this device.")
        } else localStorage.removeItem(key)
      }
    } catch { setStatus("Draft storage is unavailable. Keep this page open until you save.") }
    const subscription = watch((values, event) => {
      // reset() notifications have no field name; never turn a successful reset into a new draft.
      if (!event.name) return
      try {
        if (dateKey && ["date", "stocking_date", "inventory_date"].includes(event.name)) sessionStorage.setItem(dateKey, String(values[event.name]))
        localStorage.setItem(key, JSON.stringify({ values, savedAt: Date.now() }))
        setStatus("Draft saved on this device. It has not been submitted.")
      } catch { setStatus("Draft storage is unavailable. Keep this page open until you save.") }
    })
    return () => subscription.unsubscribe()
  }, [key, dateKey, kind, reset, watch, getValues])

  useEffect(() => {
    if (!key || !savedResult) return
    try { localStorage.removeItem(key); setStatus("") } catch { /* Submission still succeeded. */ }
  }, [key, savedResult])

  /* eslint-enable react-hooks/set-state-in-effect */
  const messages = Object.entries(errors).filter(([, error]) => typeof error?.message === "string")
  return <>
    {status && <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3 text-sm" role="status">
      <span>{status}</span>
      <Button type="button" variant="ghost" size="sm" onClick={() => {
        try { if (key) localStorage.removeItem(key) } catch { /* Reset remains available without storage. */ }
        reset(defaults.current); setStatus("")
      }}>Discard draft</Button>
    </div>}
    {messages.length > 0 && <div role="alert" className="rounded-md border border-destructive/40 p-3 text-sm text-destructive-strong">
      <p className="font-medium">Check {messages.length} {messages.length === 1 ? "field" : "fields"} before saving:</p>
      <ul className="mt-1 space-y-1">{messages.map(([name, error]) => <li key={name}>
        <button type="button" className="text-left underline" onClick={() => setFocus(name)}>{String(error?.message)}</button>
      </li>)}</ul>
    </div>}
  </>
}

export function ExistingEntryNotice({ message, farmId }: { message?: string | null; farmId: string | null }) {
  if (!message) return null
  return <div className="rounded-md border border-warning/40 bg-warning/10 p-3 text-sm" role="status">
    <p>{message}</p><a className="mt-1 inline-block underline" href={`/approvals?farmId=${encodeURIComponent(farmId ?? "")}`}>View submissions and review status</a>
  </div>
}
