"use client"

import Link from "next/link"
import { useEffect, useMemo, useRef, useState } from "react"
import type { MouseEvent } from "react"
import { Orbitron, Montserrat } from "next/font/google"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import styles from "@/components/marketing/landing-page.module.css"

const orbitron = Orbitron({ subsets: ["latin"], weight: ["400", "600", "700", "900"] })
const montserrat = Montserrat({ subsets: ["latin"], weight: ["300", "400", "500", "600"] })

const featureCards = [
  {
    title: "Dashboard & Core KPIs",
    description:
      "Real-time ABW, eFCR, biomass density, mortality, feeding rate, and water quality across systems and stages.",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        d="M3 3v18h18M7 15v-5M12 15V7M17 15v-3"
      />
    ),
  },
  {
    title: "Inventory Management",
    description:
      "Track fish stock, feed balances, and transactions with mortality-adjusted population visibility.",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        d="M4 7h16M4 12h16M4 17h16M7 7v10M17 7v10"
      />
    ),
  },
  {
    title: "Feed Management",
    description:
      "Daily feeding logs with operator attribution and eFCR insight tied to feed types.",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        d="M12 3v4m0 10v4m7-9h-4m-6 0H5m10.95-4.95-2.83 2.83m-4.24 4.24-2.83 2.83m0-9.9 2.83 2.83m4.24 4.24 2.83 2.83"
      />
    ),
  },
  {
    title: "Sampling & Mortality",
    description:
      "ABW sampling statistics, growth projections, and root-cause mortality tracking.",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        d="M3 12h4l3 7 4-14 3 7h4"
      />
    ),
  },
  {
    title: "Water Quality",
    description:
      "Manual logging of DO, pH, temperature, ammonia, and depth with threshold status.",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        d="M12 2C8 7 6 10 6 13a6 6 0 0012 0c0-3-2-6-6-11z"
      />
    ),
  },
  {
    title: "Reporting & Compliance",
    description:
      "One-click CSV/PDF exports with audit trails and compliance-ready water quality history.",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        d="M7 3h7l5 5v13a1 1 0 01-1 1H7a1 1 0 01-1-1V4a1 1 0 011-1zM14 3v5h5"
      />
    ),
  },
]

export default function LandingPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [menuOpen, setMenuOpen] = useState(false)
  const [hideHeader, setHideHeader] = useState(false)
  const rootRef = useRef<HTMLDivElement | null>(null)
  const lastScroll = useRef(0)

  const navLinksClass = useMemo(
    () => (menuOpen ? `${styles.navLinks} ${styles.navLinksActive}` : styles.navLinks),
    [menuOpen],
  )

  const handleNavClick = (event: MouseEvent<HTMLUListElement>) => {
    if ((event.target as HTMLElement).closest("a")) {
      setMenuOpen(false)
    }
  }

  const handleAnchorClick = (event: MouseEvent<HTMLElement>) => {
    const anchor = (event.target as HTMLElement).closest("a")
    if (!anchor) return
    const href = anchor.getAttribute("href")
    if (!href || !href.startsWith("#")) return
    const target = document.querySelector(href)
    if (!target) return
    event.preventDefault()
    target.scrollIntoView({ behavior: "smooth", block: "start" })
    setMenuOpen(false)
  }

  useEffect(() => {
    const root = rootRef.current
    if (!root) return

    const revealElements = Array.from(root.querySelectorAll<HTMLElement>("[data-reveal]"))
    if (!revealElements.length) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add(styles.revealActive)
          }
        })
      },
      { threshold: 0.2 },
    )

    revealElements.forEach((element) => observer.observe(element))
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const handleScroll = () => {
      const current = window.scrollY
      if (current <= 100) {
        setHideHeader(false)
      } else if (current > lastScroll.current) {
        setHideHeader(true)
      } else {
        setHideHeader(false)
      }
      lastScroll.current = current
    }

    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const handlePrimaryAction = () => {
    toast({
      title: "Redirecting to sign in",
      description: "Access your farm dashboard in AquaSmart.",
    })
    router.push("/auth")
  }

  return (
    <div ref={rootRef} className={`${styles.page} ${montserrat.className}`}>
      <div className={styles.bubbles} aria-hidden="true">
        {Array.from({ length: 5 }).map((_, index) => (
          <span key={index} className={styles.bubble} />
        ))}
      </div>

      <div className={styles.content} onClick={handleAnchorClick}>
        <header className={`${styles.header} ${hideHeader ? styles.headerHidden : ""}`}>
          <nav className={styles.nav}>
            <Link href="/" className={`${styles.logo} ${orbitron.className}`} aria-label="AquaSmart Home">
              <svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <path
                  d="M22 64 C 22 44, 56 44, 70 64 C 56 84, 22 84, 22 64 Z"
                  stroke="currentColor"
                  fill="none"
                  strokeWidth="5"
                  strokeLinejoin="round"
                />
                <path
                  d="M70 64 L 94 48 M70 64 L 94 80"
                  stroke="currentColor"
                  fill="none"
                  strokeWidth="5"
                  strokeLinejoin="round"
                />
                <circle cx="38" cy="60" r="5" fill="currentColor" />
                <path
                  d="M18 96 C 36 86, 54 106, 72 96 S 102 106, 120 96"
                  stroke="currentColor"
                  fill="none"
                  strokeWidth="5"
                  strokeLinecap="round"
                  opacity="0.8"
                />
              </svg>
              AQUASMART
            </Link>

            <ul className={navLinksClass} onClick={handleNavClick}>
              <li>
                <a href="#modules">Modules</a>
              </li>
              <li>
                <a href="#vision">Vision</a>
              </li>
              <li>
                <a href="#plans">Plans</a>
              </li>
              <li>
                <a href="#about">About</a>
              </li>
              <li>
                <Link href="/auth" className={styles.ctaButton}>
                  Sign In
                </Link>
              </li>
            </ul>

            <button
              type="button"
              className={styles.mobileMenuBtn}
              onClick={() => setMenuOpen((open) => !open)}
              aria-label="Open menu"
            >
              ☰
            </button>
          </nav>
        </header>

        <section className={styles.hero} id="top">
          <div className={styles.heroContent}>
            <h1 className={`${styles.heroTitle} ${orbitron.className}`}>REAL-TIME AQUACULTURE INTELLIGENCE</h1>
            <p className={styles.heroText}>
              AquaSmart gives Farm Managers a single source of truth for KPIs, inventory, feeding, sampling, mortality,
              and water quality. Every action is traceable, every metric refreshes in minutes.
            </p>
            <div className={styles.heroButtons}>
              <button className={styles.primaryBtn} onClick={handlePrimaryAction}>
                Open Dashboard
              </button>
              <a href="#modules" className={styles.secondaryBtn}>
                Explore Modules
              </a>
            </div>
          </div>
        </section>

        <section className={styles.features} id="modules">
          <div className={`${styles.sectionTitle} ${styles.reveal}`} data-reveal>
            <h2 className={orbitron.className}>CORE MODULES</h2>
            <p>Phase 1 focuses on the Farm Manager workflow with daily operational control.</p>
          </div>

          <div className={styles.featuresGrid}>
            {featureCards.map((feature) => (
              <article key={feature.title} className={`${styles.featureCard} ${styles.reveal}`} data-reveal>
                <div className={styles.featureIcon} aria-hidden="true">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {feature.icon}
                  </svg>
                </div>
                <h3 className={orbitron.className}>{feature.title}</h3>
                <p>{feature.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className={`${styles.stats} ${styles.reveal}`} id="vision" data-reveal>
          <div className={styles.statsGrid}>
            <div className={styles.statItem}>
              <h3 className={orbitron.className}>&lt;= 5 min</h3>
              <p>KPI refresh target</p>
            </div>
            <div className={styles.statItem}>
              <h3 className={orbitron.className}>RLS</h3>
              <p>Row-level security by farm</p>
            </div>
            <div className={styles.statItem}>
              <h3 className={orbitron.className}>24/7</h3>
              <p>Operational traceability</p>
            </div>
            <div className={styles.statItem}>
              <h3 className={orbitron.className}>CSV / PDF</h3>
              <p>Compliance-ready exports</p>
            </div>
          </div>
        </section>

        <section className={styles.ctaSection} id="plans">
          <h2 className={`${orbitron.className} ${styles.reveal}`} data-reveal>
            RUN YOUR FARM LIKE AN ENGINEERING SYSTEM
          </h2>
          <p className={styles.reveal} data-reveal>
            AquaSmart v1 is built for Farm Managers: KPIs, inventory, feeding, sampling, mortality, and water quality in
            a single secure dashboard. Scale to multi-farm operations as your team grows.
          </p>
          <div className={`${styles.heroButtons} ${styles.reveal}`} data-reveal>
            <button className={styles.primaryBtn} onClick={handlePrimaryAction}>
              Sign In
            </button>
            <a href="#about" className={styles.secondaryBtn}>
              Learn More
            </a>
          </div>
        </section>

        <footer className={styles.footer} id="about">
          <div className={styles.footerContent}>
            <div className={styles.footerSection}>
              <h4 className={orbitron.className}>AQUASMART</h4>
              <p>
                Aquaculture farm intelligence with real-time KPIs, traceable data entry, and compliance-ready reporting.
              </p>
            </div>

            <div className={styles.footerSection}>
              <h4 className={orbitron.className}>Product</h4>
              <a href="#modules">Modules</a>
              <Link href="/reports">Reports</Link>
              <Link href="/water-quality">Water Quality</Link>
              <Link href="/inventory">Inventory</Link>
            </div>

            <div className={styles.footerSection}>
              <h4 className={orbitron.className}>Company</h4>
              <a href="#about">About</a>
              <a href="#vision">Vision</a>
              <Link href="/auth">Sign In</Link>
            </div>

            <div className={styles.footerSection}>
              <h4 className={orbitron.className}>Support</h4>
              <Link href="/settings">Account</Link>
              <a href="#top">Contact</a>
              <a href="#plans">Roadmap</a>
            </div>
          </div>

          <div className={styles.footerBottom}>
            <p>&copy; 2026 AquaSmart. All rights reserved.</p>
          </div>
        </footer>
      </div>
    </div>
  )
}
