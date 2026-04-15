"use client"

import Image from "next/image"
import { useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Droplets,
  Fish,
  FlaskConical,
  Waves,
} from "lucide-react"

import { Button } from "@/components/ui/button"

const navItems = [
  { label: "Platform", href: "#platform" },
  { label: "Modules", href: "#modules" },
]

const capabilities = [
  {
    title: "Water Quality Monitoring",
    description: "Track dissolved oxygen, pH, temperature, ammonia, and depth from one daily workspace.",
    icon: Droplets,
  },
  {
    title: "Feed and Inventory Control",
    description: "Manage stock movement, feed balance, and issue history without spreadsheet sprawl.",
    icon: Fish,
  },
  {
    title: "Production Visibility",
    description: "Monitor biomass, growth, mortality, and system performance in a manager-friendly dashboard.",
    icon: BarChart3,
  },
  {
    title: "Sampling and Health Logs",
    description: "Capture interventions, mortality causes, and growth checks with reliable historical traceability.",
    icon: FlaskConical,
  },
]

const modules = [
  {
    category: "LIVE PARAMETERS",
    title: "Water Quality Intelligence",
    description:
      "Watch pond and tank conditions in real time and surface threshold breaches before they become production losses.",
    metric: "92%",
    metricLabel: "systems within target range",
    imageSrc: "/Multi-region-aquaculture-scaled.webp",
  },
  {
    category: "FEED CONTROL",
    title: "Feeding Operations",
    description:
      "Connect feed plans, actual issue records, and performance outcomes so operators can act before waste compounds.",
    metric: "1.42",
    metricLabel: "rolling eFCR",
    imageSrc: "/tanga_tilapia4.jpg",
  },
  {
    category: "STOCK HEALTH",
    title: "Health and Mortality Logs",
    description:
      "Record abnormal events, suspected causes, and interventions in one structured timeline instead of scattered notes.",
    metric: "14d",
    metricLabel: "trend window",
    imageSrc: "/cage mapping.png",
  },
  {
    category: "MANAGEMENT VIEW",
    title: "Farm Performance Dashboard",
    description:
      "Give managers a clear view of biomass, survival, feed efficiency, and operational pressure across the farm.",
    metric: "24/7",
    metricLabel: "operational visibility",
    imageSrc: "/Multi-region-aquaculture-scaled.webp",
  },
]

function scrollToId(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" })
}

export default function LandingPage() {
  const router = useRouter()
  const carouselRef = useRef<HTMLDivElement>(null)
  const isCarouselPausedRef = useRef(false)

  const scrollCards = (direction: "left" | "right") => {
    if (!carouselRef.current) return

    carouselRef.current.scrollBy({
      left: direction === "left" ? -420 : 420,
      behavior: "smooth",
    })
  }

  useEffect(() => {
    const carousel = carouselRef.current
    if (!carousel) return

    const interval = window.setInterval(() => {
      if (!carouselRef.current || isCarouselPausedRef.current) return

      const node = carouselRef.current
      const maxScrollLeft = node.scrollWidth - node.clientWidth
      const nextScrollLeft = node.scrollLeft + 420

      node.scrollTo({
        left: nextScrollLeft >= maxScrollLeft - 8 ? 0 : nextScrollLeft,
        behavior: "smooth",
      })
    }, 3200)

    return () => {
      window.clearInterval(interval)
    }
  }, [])

  return (
    <main className="bg-background text-foreground">
      <section className="relative min-h-screen overflow-hidden">
        <div className="absolute inset-0">
          <Image
            src="/tanga_tilapia4.jpg"
            alt="Tilapia fish underwater"
            fill
            priority
            className="object-cover"
          />
          <div className="absolute inset-0 bg-[linear-gradient(135deg,var(--brand-hero-from)_0%,var(--brand-hero-mid)_42%,var(--brand-hero-to)_100%)]" />
        </div>

        <header className="absolute inset-x-0 top-0 z-20 px-4 pt-5 md:px-6">
          <div className="container mx-auto flex flex-wrap items-center justify-between gap-3 py-2 text-white">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm">
                <Waves className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-primary">AquaSmart</p>
                <p className="text-xs text-white/70">Aquaculture management software</p>
              </div>
            </div>

            <nav className="hidden items-center gap-8 text-sm font-medium tracking-[0.08em] text-white/82 md:flex">
              {navItems.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => scrollToId(item.href.slice(1))}
                  className="transition-colors hover:text-white"
                >
                  {item.label}
                </button>
              ))}
            </nav>

            <Button
              variant="ghost"
              className="ml-auto h-9 rounded-full bg-white/10 px-4 text-sm text-white hover:bg-white/18 hover:text-white sm:px-5 md:ml-0 md:h-10 md:px-6"
              onClick={() => router.push("/auth")}
            >
              Sign In
            </Button>

          </div>
        </header>

        <div className="relative z-10 flex min-h-[calc(100svh-84px)] items-center px-4 py-20 md:min-h-[calc(100vh-84px)] md:px-6 md:py-24">
          <div className="container mx-auto">
            <div className="flex flex-col items-center justify-between gap-12 md:flex-row md:gap-16">
              <div className="max-w-2xl text-center text-white md:text-left">
                <div className="mb-8 inline-flex rounded-full border border-primary/50 bg-white/10 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.24em] text-white/92">
                  SMART FARM MANAGEMENT MADE PRACTICAL
                </div>

                <h1 className="max-w-3xl text-balance font-serif text-4xl font-semibold leading-[1.02] tracking-[-0.04em] sm:text-5xl md:text-6xl lg:text-[4.5rem]">
                  Making aquaculture operations smarter
                  <span className="block md:inline"> with </span>
                  <span className="text-primary">AquaSmart</span>
                </h1>

                <p className="mt-7 max-w-2xl text-sm leading-7 text-white/84 sm:text-base sm:leading-8 md:text-[1.05rem]">
                  Monitor water quality, feeding, biomass, health, and reporting from one modern platform designed for
                  real fish farm workflows.
                </p>

                <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:justify-center md:justify-start">
                  <Button
                    className="w-full rounded-full px-8 text-base sm:w-auto"
                    size="lg"
                    onClick={() => router.push("/auth?mode=signup")}
                  >
                    Get started
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="lg"
                    className="w-full rounded-full border-white/35 bg-transparent px-8 text-base text-white hover:bg-white/10 hover:text-white sm:w-auto"
                    onClick={() => router.push("/auth")}
                  >
                    Sign in
                  </Button>
                </div>
              </div>

              <div className="hidden w-[220px] md:flex lg:mr-20 lg:w-[270px]">
                <div className="relative w-full rounded-[28px] border border-white/12 bg-[linear-gradient(180deg,var(--brand-panel-from),var(--brand-panel-to))] p-3 shadow-[0_28px_80px_-28px_rgba(0,0,0,0.7)]">
                  <div className="overflow-hidden rounded-[22px] bg-[linear-gradient(180deg,var(--brand-panel-shell-from),var(--brand-panel-shell-to))]">
                    <div className="flex items-center justify-between bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground">
                      <span>AquaSmart Live</span>
                      <span>Online</span>
                    </div>

                    <div className="space-y-3 p-3">
                      <div className="rounded-2xl bg-white/6 p-3 text-white">
                        <p className="text-[11px] uppercase tracking-[0.18em] text-white/55">Water quality</p>
                        <p className="mt-2 text-xl font-semibold">Stable</p>
                        <p className="mt-1 text-xs text-white/72">DO, pH, and temperature inside target bands</p>
                      </div>

                      <div className="rounded-2xl bg-white/6 p-3 text-white">
                        <p className="text-[11px] uppercase tracking-[0.18em] text-white/55">Performance</p>
                        <div className="mt-3 flex h-20 items-end gap-2">
                          {[34, 48, 42, 62, 70, 78].map((height) => (
                            <div
                              key={height}
                              className="w-full rounded-t-full bg-gradient-to-t from-chart-3 to-chart-2"
                              style={{ height: `${height}px` }}
                            />
                          ))}
                        </div>
                      </div>

                      <div className="rounded-2xl bg-white/6 p-3 text-sm text-white/84">
                        3 alerts reviewed. No abnormal mortality spike detected.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        id="platform"
        className="bg-[linear-gradient(180deg,color-mix(in_srgb,var(--background)_74%,white),color-mix(in_srgb,var(--secondary)_68%,white))] py-20 md:py-28"
      >
        <div className="container mx-auto px-4 md:px-6">
          <div className="mx-auto mb-5 w-fit rounded-full bg-card px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground shadow-sm">
            Built for Daily Farm Operations
          </div>
          <h2 className="text-center font-serif text-3xl font-semibold tracking-[-0.03em] md:text-5xl">
            Choose what matters most
            <br />
            for your farm
          </h2>

          <div className="mt-16 flex flex-col items-center justify-center gap-14 md:flex-row md:gap-16">
            <div className="w-full space-y-6">
              {capabilities.slice(0, 2).map((item) => {
                const Icon = item.icon
                return (
                  <div key={item.title} className="flex max-w-md items-start gap-4">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm">
                      <Icon className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold tracking-tight text-foreground">{item.title}</h3>
                      <p className="mt-2 text-sm leading-7 text-muted-foreground">{item.description}</p>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="w-full max-w-[320px] self-center">
              <div className="overflow-hidden rounded-[30px] border border-border/80 bg-card shadow-[0_22px_55px_-36px_rgba(15,23,32,0.45)]">
                <div className="relative aspect-[4/5] overflow-hidden">
                  <video
                    className="h-full w-full object-cover"
                    autoPlay
                    muted
                    loop
                    playsInline
                    preload="metadata"
                    poster="/cage mapping.png"
                  >
                    <source src="/fish video.mp4" type="video/mp4" />
                  </video>
                  <div className="absolute inset-0 bg-[linear-gradient(180deg,var(--brand-media-overlay-from),var(--brand-media-overlay-to))]" />
                </div>
              </div>
            </div>

            <div className="w-full space-y-6">
              {capabilities.slice(2).map((item) => {
                const Icon = item.icon
                return (
                  <div key={item.title} className="flex max-w-md items-start gap-4">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm">
                      <Icon className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold tracking-tight text-foreground">{item.title}</h3>
                      <p className="mt-2 text-sm leading-7 text-muted-foreground">{item.description}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </section>

      <section
        id="modules"
        className="relative overflow-hidden bg-[linear-gradient(180deg,var(--brand-section-from)_0%,var(--brand-section-to)_100%)] py-20 md:py-28"
      >
        <div className="container mx-auto px-4 md:px-6">
          <div className="space-y-8">
            <div className="space-y-4">
              <div className="inline-block rounded-full bg-white/10 px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-white/86">
                Core Modules
              </div>
              <h2 className="max-w-3xl font-serif text-3xl font-semibold tracking-[-0.03em] text-white md:text-5xl">
                Operate every farm day from one system
              </h2>
            </div>

            <div className="relative">
              <div
                ref={carouselRef}
                className="flex snap-x snap-mandatory gap-5 overflow-x-auto pb-4 scroll-smooth md:gap-8 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                onMouseEnter={() => {
                  isCarouselPausedRef.current = true
                }}
                onMouseLeave={() => {
                  isCarouselPausedRef.current = false
                }}
              >
                {modules.map((module) => (
                  <article
                    key={module.title}
                    className="min-w-[min(100%,18.5rem)] snap-start rounded-[30px] bg-card p-5 shadow-[0_18px_48px_-30px_rgba(0,0,0,0.45)] sm:min-w-[320px] sm:p-6 md:min-w-[390px]"
                  >
                    <div className="relative h-52 overflow-hidden rounded-[24px]">
                      <Image src={module.imageSrc} alt={module.title} fill className="object-cover" />
                      <div className="absolute inset-0 bg-[linear-gradient(180deg,var(--brand-card-image-overlay-from),var(--brand-card-image-overlay-to))]" />
                      <div className="absolute inset-x-4 bottom-4 rounded-2xl bg-card/90 p-4 backdrop-blur-sm">
                        <span className="text-xs font-semibold tracking-[0.18em] text-muted-foreground">
                          {module.category}
                        </span>
                        <div className="mt-2 flex items-end justify-between gap-4">
                          <div>
                            <p className="text-3xl font-bold text-foreground">{module.metric}</p>
                            <p className="text-sm text-muted-foreground">{module.metricLabel}</p>
                          </div>
                          <ArrowUpRight className="h-5 w-5 text-primary" />
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 space-y-2">
                      <h3 className="text-2xl font-semibold tracking-tight text-foreground">{module.title}</h3>
                      <p className="text-sm leading-7 text-muted-foreground">{module.description}</p>
                    </div>
                  </article>
                ))}
              </div>

              <button
                type="button"
                onClick={() => scrollCards("left")}
                className="absolute left-4 top-1/2 hidden -translate-y-1/2 rounded-full border border-border/80 bg-card/95 p-2 text-card-foreground shadow-lg md:block"
                aria-label="Scroll modules left"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={() => scrollCards("right")}
                className="absolute right-4 top-1/2 hidden -translate-y-1/2 rounded-full border border-border/80 bg-card/95 p-2 text-card-foreground shadow-lg md:block"
                aria-label="Scroll modules right"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </section>

      <footer className="bg-[linear-gradient(180deg,var(--brand-footer-from)_0%,var(--brand-footer-to)_100%)] px-4 py-16 text-sm text-white/60 md:px-6 md:py-18">
        <div className="container mx-auto flex flex-col gap-4 border-t border-white/10 pt-6 md:flex-row md:items-center md:justify-between">
          <p>&copy; 2026 AquaSmart. Aquaculture operations and analytics platform.</p>
          <div className="flex flex-wrap gap-4 self-start md:self-auto">
            {navItems.map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => scrollToId(item.href.slice(1))}
                className="transition-colors hover:text-white"
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </footer>
    </main>
  )
}
