"use client"

import Image from "next/image"
import { useEffect, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ArrowRight, Plus, X } from "lucide-react"
import { useAuth } from "@/components/providers/auth-provider"
import { sanitizeNextPath } from "@/lib/app-entry"
import { createWorkspace, getFarmsByOrganization, selectWorkspace } from "@/lib/api"
import { setBrowserWorkspaceContext, type FarmSummary, type OrganizationSummary } from "@/lib/context"
import "./workspace-selector.css"

const help = "mailto:severin@sustain-aquaculture.com"
const environments = [["lake", "On a lake · cages"], ["land", "On land · ponds or tanks"], ["both", "Both"]] as const

export default function WorkspaceSelector({initialOrganizations = [], initialDisplayName, initialUserId}: {
  initialOrganizations?: OrganizationSummary[]
  initialDisplayName?: string | null
  initialUserId?: string | null
}) {
  const { user, profile, signOut } = useAuth()
  const router = useRouter()
  const next = sanitizeNextPath(useSearchParams().get("next"), "/dashboard")
  const [organizations, setOrganizations] = useState(initialOrganizations)
  const [orgId, setOrgId] = useState(initialOrganizations[0]?.id ?? "")
  const org = organizations.find(o => o.id === orgId)
  const [farms, setFarms] = useState<FarmSummary[]>([])
  const [loading, setLoading] = useState(Boolean(orgId))
  const [error, setError] = useState("")
  const [opening, setOpening] = useState("")
  const [request, setRequest] = useState(0)
  const [query, setQuery] = useState("")
  const [lastFarm, setLastFarm] = useState("")
  const [greeting, setGreeting] = useState("Welcome")
  const [saving, setSaving] = useState(false)
  const [dialogError, setDialogError] = useState("")
  const dialog = useRef<HTMLDialogElement>(null)
  const name = initialDisplayName || (typeof profile?.full_name === "string" && profile.full_name) || user?.email || ""
  const firstName = name.split(/[@\s]+/)[0]
  const storageKey = `aquasmart:${initialUserId || user?.id}:activeFarmId`
  const recent = farms.find(f => f.id === lastFarm)
  const featured = recent || farms[0]
  const empty = !loading && !error && !farms.length
  const visible = farms.filter(f => (f.name + " " + (f.location || "")).toLowerCase().includes(query.trim().toLowerCase()))

  useEffect(() => {
    const hour = new Date().getHours()
    setGreeting(hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening")
    setLastFarm(localStorage.getItem(storageKey) || "")
  }, [storageKey])

  useEffect(() => {
    if (!orgId) return
    let current = true
    setLoading(true)
    setError("")
    getFarmsByOrganization(orgId, true).then(rows => { if (current) setFarms(rows) })
      .catch(() => { if (current) setError("Unable to load farms.") })
      .finally(() => { if (current) setLoading(false) })
    return () => { current = false }
  }, [orgId, request])

  async function openFarm(farm: FarmSummary) {
    if (opening) return
    setOpening(farm.id)
    try {
      await selectWorkspace(orgId, farm.id)
      localStorage.setItem(storageKey, farm.id)
      setBrowserWorkspaceContext({organizationId: orgId, farmId: farm.id})
      window.dispatchEvent(new CustomEvent("farm-updated", {detail: {farmId: farm.id}}))
      const destination = new URL(next, window.location.origin)
      destination.searchParams.delete("farmId")
      router.replace(destination.pathname + destination.search + destination.hash)
    } catch {
      setOpening("")
      setError("Unable to open this farm.")
    }
  }

  function showDialog() {
    setDialogError("")
    dialog.current?.querySelector("form")?.reset()
    dialog.current?.showModal()
  }

  async function addFarm(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (saving) return
    const data = new FormData(event.currentTarget)
    const farmName = String(data.get("name")).trim()
    const location = String(data.get("location")).trim()
    const organizationName = org?.name || farmName
    setSaving(true)
    setDialogError("")
    try {
      const result = await createWorkspace({ organizationId: org?.id, organizationName, farmName, location,
        environment: data.get("environment") as "lake" | "land" | "both",
        mainSpecies: String(data.get("species")).trim() })
      if (!org) {
        setOrganizations([...organizations, {id: result.organizationId, name: organizationName, slug: null, isOwner: true}])
        setOrgId(result.organizationId)
      }
      setLoading(true)
      setQuery("")
      setRequest(n => n + 1)
      window.dispatchEvent(new Event("farm-memberships-updated"))
      dialog.current?.close()
    } catch (e) {
      setDialogError(e instanceof Error ? e.message : "Unable to add farm.")
    } finally { setSaving(false) }
  }

  const picker = <select aria-label="Workspace" disabled={!!opening} value={orgId} onChange={e => {
    setLoading(true); setFarms([]); setQuery(""); setError(""); setOrgId(e.target.value)
  }}>{organizations.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}</select>
  const signOutAction = async () => { await signOut(); router.push("/auth") }
  return <div className="ws">
    <header><div className="ws-bar"><a href="/" aria-label="Aquasmart home"><Image src="/sustain-aquasmart-wordmark.png" alt="SUSTAIN Aquasmart" width={204} height={30}/></a>
      {org && <label className="ws-desktop-picker">Workspace {picker}</label>}
      <details className="ws-account"><summary aria-label="Account menu"><b>{name.split(/\s+/).slice(0,2).map(w => w[0]).join("").toUpperCase() || "A"}</b><span>{name}</span></summary><button onClick={signOutAction}>Sign out</button></details>
    </div></header>
    <main className={empty ? "ws-empty" : ""}>
      <h1>{empty ? "Welcome" : greeting}{firstName && ", " + firstName}</h1>
      <p>{empty ? "Your account is ready, but you haven’t been added to a farm in this workspace yet." : "Choose a farm to open its dashboard."}</p>
      {org && <label className="ws-mobile-picker">Workspace {picker}</label>}
      {loading ? <p role="status">Loading farms…</p> : error ? <p role="alert">{error} <button onClick={() => setRequest(n => n+1)}>Try again</button></p> : empty ?
        <><section className="ws-panel"><h2>What to do next</h2><ol><li>If your farm already uses Aquasmart, ask its administrator to add you.</li><li>If you’re setting up a new farm, create it and add your cages, ponds or tanks.</li></ol><div className="ws-actions"><button className="ws-primary" onClick={showDialog}>Set up a new farm</button><a href={help}>Get help</a></div></section><p>{user?.email && "Signed in as " + user.email + " · "}<button onClick={signOutAction}>Sign out</button></p></> :
        <><section className="ws-feature"><Image src="/aquasmart-farm.webp" alt="" width={160} height={105}/><div><small>{recent ? "Continue where you left off" : "Your workspace"}</small><h2>{featured.name}</h2><p>{featured.location}{featured.systems != null && ` · ${featured.systems} systems`}</p></div><button className="ws-primary" disabled={!!opening} onClick={() => openFarm(featured)}>Open dashboard</button></section>
        <section><div className="ws-tools"><h2>Your farms{org && " in " + org.name} <span>({farms.length})</span></h2><input aria-label="Find a farm" placeholder="Find a farm" value={query} onChange={e => setQuery(e.target.value)}/><button className="ws-add" onClick={showDialog}><Plus size={16}/>Add a farm</button></div>
        <table><thead><tr>{["Farm","Location","Systems","Your role","Latest record","Waiting for approval","Action"].map(s => <th key={s}>{s}</th>)}</tr></thead><tbody>{visible.map(f => <tr key={f.id}>
          <th scope="row">{f.name}</th><td>{f.location || "—"}</td><td>{f.systems ?? "—"}</td><td>{f.role?.replaceAll("_"," ") || "—"}</td><td>{f.latestRecord || "—"}</td><td>{f.pending == null ? "—" : f.pending || "None"}</td><td><button disabled={!!opening} onClick={() => openFarm(f)}>{opening === f.id ? "Opening…" : "Open"}</button></td></tr>)}</tbody></table>
        <div className="ws-mobile-list">{visible.map(f => <button key={f.id} disabled={!!opening} onClick={() => openFarm(f)}><span><strong>{f.name}</strong><small>{[f.location, f.pending ? f.pending+" waiting for approval" : f.latestRecord && "Latest record "+f.latestRecord].filter(Boolean).join(" · ")}</small></span><ArrowRight size={18}/></button>)}</div>
        {!visible.length && <p role="status">No farms match your search.</p>}<button className="ws-mobile-add" onClick={showDialog}>Add a farm</button></section>
        <footer>Can’t see a farm? Ask its administrator to add you. · <a href={help}>Help</a></footer></>}
    </main>
    <dialog ref={dialog} aria-labelledby="ws-add-title" onCancel={e => { if(saving) e.preventDefault() }}>
      <button className="ws-close" aria-label="Close dialog" disabled={saving} onClick={() => dialog.current?.close()}><X size={21}/></button>
      <h2 id="ws-add-title">Add a farm</h2><p>{org ? `It will be added to the ${org.name} workspace.` : "Your farm name will also name your new workspace."} You can add systems after.</p>
      <form onSubmit={addFarm}><label>Farm name<input name="name" required minLength={2} maxLength={120} autoFocus/></label>
        <label>Location<small>Region, district or site, for example Kigoma, Kimbwela</small><input name="location" required minLength={2} maxLength={255}/></label>
        <fieldset><legend>Where do you farm?</legend>{environments.map(([value,label]) => <label key={value}><input type="radio" name="environment" value={value} required/>{label}</label>)}</fieldset>
        <label>Main species<input name="species" placeholder="e.g. Tanganyika tilapia" required maxLength={120}/></label>
        {dialogError && <p role="alert">{dialogError}</p>}
        <div className="ws-actions"><button className="ws-primary" disabled={saving}>{saving ? "Adding…" : "Add farm"}</button><button type="button" disabled={saving} onClick={() => dialog.current?.close()}>Cancel</button></div>
      </form>
    </dialog>
  </div>
}
