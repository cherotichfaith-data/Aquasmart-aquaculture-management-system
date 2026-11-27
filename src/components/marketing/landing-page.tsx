"use client"

import Image from "next/image"
import Link from "next/link"
import { useState, type FormEvent } from "react"
import { Menu, X } from "lucide-react"
import { NotePencilIcon } from "@phosphor-icons/react/dist/icons/NotePencil"
import { GaugeIcon } from "@phosphor-icons/react/dist/icons/Gauge"
import { FishSimpleIcon } from "@phosphor-icons/react/dist/icons/FishSimple"
import { ChartLineIcon } from "@phosphor-icons/react/dist/icons/ChartLine"
import { CalendarDotsIcon } from "@phosphor-icons/react/dist/icons/CalendarDots"
import { GrainsIcon } from "@phosphor-icons/react/dist/icons/Grains"
import { ScalesIcon } from "@phosphor-icons/react/dist/icons/Scales"
import { FileArrowDownIcon } from "@phosphor-icons/react/dist/icons/FileArrowDown"
import "./homepage.css"

const nav = [["Product", "how"], ["Features", "features"], ["For farms", "farms"], ["About", "about"], ["Contact", "contact"]]
const modules = [
  [NotePencilIcon, "Data entry", "Record feeding, mortality, sampling and stock movements for review."],
  [GaugeIcon, "Dashboard", "Review fish count, biomass, mortality and feed use across cages, ponds and tanks."],
  [FishSimpleIcon, "Production", "Follow each system and batch through stocking, transfers and harvests."],
  [ChartLineIcon, "Growth models", "Compare sampled weights with projected growth curves."],
  [CalendarDotsIcon, "Planning", "Explore harvest scenarios and future biomass."],
  [GrainsIcon, "Feed", "Plan by pellet size and compare feed requirements with stock."],
  [ScalesIcon, "Economics", "Review feed costs, fish valuation and supplier prices."],
  [FileArrowDownIcon, "Reports and exports", "Bring production and feed records together for month-end review."],
] as const
const steps = [
  ["Record", "Staff log feeding, mortality, sampling, transfers, harvests and feed stock."],
  ["Approve", "A manager reviews each entry before it becomes an official farm record."],
  ["Calculate", "Approved records inform fish counts, biomass, feeding rates and feed conversion."],
  ["Decide", "Use dashboards, feed plans and forecasts to prepare for the next feeding round."],
]
const trust = [
  ["Run it your way", "Choose a farm-local or cloud-hosted setup."],
  ["Review history", "See who submitted and reviewed an operational record."],
  ["Month-end reporting", "Bring feed usage and production economics into the monthly review."],
  ["Trace corrections", "Follow a corrected submission back to its earlier record."],
]
const faqs = [
  ["Do we need sensors or a constant internet connection?", "No. Your team can record observations by hand. Open the app online first. Supported field forms then save entries offline and sync when the connection returns."],
  ["Which species and systems does Aquasmart support?", "Aquasmart supports cages, ponds and tanks. You can add species to your farm’s register."],
  ["Who enters the data?", "Farm operators enter daily records. Farm managers or administrators review and approve them."],
  ["Can Aquasmart handle more than one farm?", "Yes. Your organization can manage multiple farms in Aquasmart. Each farm has its own workspace, so its records stay separate. Team members can switch between the farms they have access to."],
  ["Who can see our farm’s records?", "People with access to your farm workspace can see its records. Their assigned role determines what they can enter, review or approve."],
  ["Can we export our data?", "Yes. You can export production and feed reports for your farm."],
]
const fields = ["Name", "Email", "Farm name and country", "Species and number of cages, ponds or tanks", "How do you keep records today?"]
const contact = "severin@sustain-aquaculture.com"

export default function LandingPage() {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState(false)
  function prepareRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const body = fields.map(label => label + ": " + data.get(label)).join("\n")
    window.location.href = "mailto:" + contact + "?subject=SUSTAIN%20Aquasmart%20demo%20request&body=" + encodeURIComponent(body)
    setDraft(true)
  }

  return <div className="aqua-home">
    <header className="aq-header"><div className="aq-wrap aq-bar">
      <a href="#product" aria-label="SUSTAIN Aquasmart home"><Image src="/sustain-aquasmart-wordmark.png" width={206} height={30} alt="SUSTAIN Aquasmart" /></a>
      <button type="button" className="aq-menu" aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} aria-controls="aq-nav" onClick={() => setOpen(!open)}>{open ? <X /> : <Menu />}</button>
      <nav id="aq-nav" className={open ? "is-open" : ""} aria-label="Main navigation">
        {nav.map(([label,id]) => <a key={id} href={"#"+id} onClick={() => setOpen(false)}>{label}</a>)}
        <Link className="aq-signin" href="/auth">Sign in</Link><a className="aq-button" href="#demo" onClick={() => setOpen(false)}>Request a demo</a>
      </nav>
    </div></header>
    <main>
      <section id="product" className="aq-wrap aq-hero">
        <div><h1>Every fish, every feed, every decision, on record.</h1>
        <p>Farm teams record feeding, stock movements and fish weights. Managers review the entries. Aquasmart uses those approved records to plan feed, forecast growth and track costs across cages, ponds and tanks.</p>
        <div className="aq-actions"><a className="aq-button" href="#demo">Request a demo</a><a className="aq-button secondary" href="#how">See how it works</a></div>
        </div>
        <div className="aq-device-scene">
          <Image priority src="/aquasmart-dashboard-drone.webp" width={1909} height={824} sizes="(max-width:700px) 100vw, 55vw" alt="Aquasmart dashboard on a laptop beside the mobile view, overlooking lake cages" />
          <svg viewBox="0 0 1909 824" aria-hidden="true" focusable="false">
            <defs>
              <image id="aq-desktop-screen" href="/aquasmart-dashboard-screen.png" width="1" height="1" preserveAspectRatio="none" />
              <clipPath id="aq-screen-upper"><path d="M0 0H1V1Z" /></clipPath>
              <clipPath id="aq-screen-lower"><path d="M0 0L1 1H0Z" /></clipPath>
            </defs>
            {/* Two triangles fit the screenshot to the four corners of the photographed display. */}
            <g transform="matrix(874 1 66 500 333 99)" clipPath="url(#aq-screen-upper)"><use href="#aq-desktop-screen" /></g>
            <g transform="matrix(891 -22 49 523 333 99)" clipPath="url(#aq-screen-lower)"><use href="#aq-desktop-screen" /></g>
            {/* The phone follows the same snapshot as the laptop, in its stacked card layout. */}
            <g transform="translate(93 309) matrix(1 -.025 .044 1 0 0)">
              <rect x="-4" width="217" height="319" fill="#e8eef5" />
              {[
                ["# FISH", "524,975"],
                ["BIOMASS", "29,933.6 kg"],
                ["PRODUCTION EFCR", "1.57"],
                ["FEED STOCK", "14,540 kg"],
              ].map(([label, value], index) => (
                <g key={label} transform={`translate(0 ${index * 80 + 4})`}>
                  <rect width="209" height="68" rx="7" fill="#f8fafc" stroke="#cbd5df" />
                  <text x="12" y="23" fontFamily="Arial, sans-serif" fontSize="10" fontWeight="700" fill="#293e54">{label}</text>
                  <text x="12" y="51" fontFamily="Arial, sans-serif" fontSize="20" fontWeight="700" fill="#123957">{value}</text>
                </g>
              ))}
            </g>
          </svg>
        </div>
      </section>
      <section className="aq-tint"><div className="aq-wrap aq-section">
        <h2>Feed is your biggest cost. Your records decide how well you spend it.</h2>
        <p>When feeding goes unrecorded or stock counts drift, it becomes difficult to explain a farm’s costs. Aquasmart connects feeding, mortality, sampling and inventory through reviewed records so teams can track feed conversion and cost per kilo of gain.</p>
        <div className="aq-grid aq-industry">{[["40–60%", "of production costs go on feed in intensive systems (FAO)."], ["455%", "growth in African aquaculture since 2000 (FAO, 2024)."]].map(([n,t]) => <article key={n}><strong className="aq-stat">{n}</strong><p>{t}</p></article>)}</div>
      </div></section>
      <section id="farms" className="aq-wrap aq-section">
        <h2>Find your way in</h2>
        <div className="aq-grid three">
          {[
            ["Lake cage farms", "Track rectangular and circular cages from nursery to harvest.", "#feeding", "For cage farms", "/aquasmart-farm.webp", "Floating cages viewed from above"],
            ["Pond and tank farms", "Manage depth, volume and feed requirements for each system.", "#feeding", "For pond and tank farms", "/aquasmart-pond-nets.webp", "A net being gathered in a lined pond"],
            ["Investors and partners", "See how production records are reviewed and traced through month-end reporting.", "#data", "For investors and partners", "/aquasmart-production.webp", "Production reporting in Aquasmart"],
          ].map(([title, description, href, label, image, alt]) => <article className="aq-card aq-path" key={title}>
            <Image src={image} width={640} height={360} sizes="(max-width:700px) 90vw, 30vw" alt={alt}/>
            <h3>{title}</h3><p>{description}</p><a href={href}>{label}</a>
          </article>)}
        </div>
      </section>
      <section id="how" className="aq-wrap aq-section"><h2>From the farm to the decision in four steps</h2><div className="aq-grid">{steps.map(([title,desc],i) => <article key={title}><small>Step {i+1}</small><h3>{title}</h3><p>{desc}</p></article>)}</div></section>
      <section id="features" className="aq-tint"><div className="aq-wrap aq-section"><h2>Everything a fish farm runs on, in one place</h2><div className="aq-grid">{modules.map(([Icon,title,desc]) => <article className="aq-card" key={title}><Icon size={28} weight="fill" aria-hidden="true"/><h3>{title}</h3><p>{desc}</p></article>)}</div></div></section>
      <section id="feeding" className="aq-wrap aq-section aq-split">
        <div className="aq-feed-scroll" tabIndex={0} role="region" aria-label="Monthly feed plan"><Image src="/aquasmart-feed-plan.webp" width={1280} height={720} alt="Monthly feed plan broken down by production system" /></div><div><h2>Plan feed for each cage, pond or tank</h2><p>Match pellet size to fish weight and compare monthly requirements with stock and confirmed deliveries.</p><ul><li>Daily and weekly feed amounts</li><li>Projected purchasing shortfalls</li><li>Plan versus actual, system by system</li></ul></div></section>
      <section id="ai" className="aq-operator"><div className="aq-wrap aq-section aq-split"><div><h2>Ask your farm a question. Get an answer from your own records.</h2><p>Use the AI Operator to explore questions about feed requirements and production plans using farm-scoped records. Forecasts are identified as projections.</p></div><Image src="/aquasmart-operator.webp" width={1280} height={702} alt="SUSTAIN AI Operator workspace"/></div></section>
      <section id="data" className="aq-tint"><div className="aq-wrap aq-section"><h2>Your data, your farm</h2><div className="aq-grid">{trust.map(([title,desc]) => <article key={title}><h3>{title}</h3><p>{desc}</p></article>)}</div></div></section>
      <section id="field" className="aq-wrap aq-section aq-split">
        <div className="aq-field-intro"><h2>In the field at Tanganyika Blue</h2><p>In Kigoma, Tanzania, Tanganyika Blue uses Aquasmart to record feeding and track its native tilapia on Lake Tanganyika.</p></div>
        <div className="aq-field-photos">
          <Image className="aq-weighing" src="/aquasmart-weighing.webp" alt="Farm crew weighing fish in a suspended net basket beside a cage" width={1204} height={1600} sizes="(max-width: 700px) 100vw, 46vw" />
          
        </div>
        <div><strong className="aq-stat">97.8%</strong><p>of batch-days had feeding recorded in the first 90 days for 2026 batches, up from 56.7% for 2024 batches kept in farm books.</p></div>
      </section>
      <section id="about" className="aq-wrap aq-section aq-split">
        <Image src="/aquasmart-floating-cage.webp" width={1204} height={1600} alt="Farm team tending a floating cage" /><div><h2>Built by people who farm</h2><p>SUSTAIN Switzerland develops Aquasmart with farm teams. The production-management application connects observations made at the water’s edge with the records managers use to plan and report.</p></div>
      </section>
      <section id="checklist" className="aq-tint"><div className="aq-wrap aq-section aq-split">
        <div><h2>Start with your daily records</h2><p>A printable checklist for cage, pond and tank farms. Use it to record feed, reconcile stock movements and review the day’s entries.</p></div>
        <div><a className="aq-button" href="/aquasmart-daily-records.pdf" download>Download the checklist (PDF)</a></div>
      </div></section>
      <section id="demo" className="aq-tint"><div className="aq-wrap aq-section aq-split"><div><h2>See Aquasmart on your farm’s numbers</h2><p>Tell us about your species, number of cages, ponds or tanks, and how you keep records so we can tailor your demo.</p>
      <h3 className="aq-faq-heading">Frequently asked questions</h3>{faqs.map(([q,a]) => <details key={q}><summary>{q}</summary><p>{a}</p></details>)}</div>
      <form id="contact" onSubmit={prepareRequest}><h3>Request a demo</h3><p>Contact us directly at <a className="aq-email" href={"mailto:"+contact}>{contact}</a>.</p>{fields.map((label,i) => <label key={label}>{label}<input required={i<3} name={label} type={i===1 ? "email" : "text"} maxLength={300} autoComplete={i===0 ? "name" : i===1 ? "email" : undefined}/></label>)}<button className="aq-button">Prepare email request</button><small>Review and send your request in your email app.</small>{draft && <p role="status">If your email app didn’t open, contact {contact}.</p>}</form></div></section>
    </main>
    <footer><div className="aq-wrap aq-section aq-foot"><div><strong>SUSTAIN Aquasmart</strong><p>Record-based management for farms with cages, ponds and tanks.<br/>Part of the SUSTAIN Platform.</p></div><div><a href="#features">Features</a><a href="#ai">AI Operator</a><a href="#demo">Request a demo</a></div><div><a href="#about">About us</a><a href="#field">In the field</a><a href={"mailto:"+contact}>Contact the team</a><small>© 2026 SUSTAIN Switzerland GmbH</small></div></div></footer>
  </div>
}
