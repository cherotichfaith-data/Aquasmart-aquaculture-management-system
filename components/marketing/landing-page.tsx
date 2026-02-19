"use client"

import { Suspense, lazy, useState } from "react"
import { ArrowRight, Droplets, Fish, FlaskConical, LineChart, ShieldCheck, Waves } from "lucide-react"
import { useRouter } from "next/navigation"

const Dithering = lazy(() =>
  import("@paper-design/shaders-react").then((mod) => ({ default: mod.Dithering })),
)

const features = [
  {
    title: "Dashboard and Core KPIs",
    description: "Real-time ABW, eFCR, biomass density, feeding rate, and mortality for every system.",
    icon: LineChart,
  },
  {
    title: "Inventory and Feed Control",
    description: "Track stock movements, feed balances, and consumption with audit-ready traceability.",
    icon: Fish,
  },
  {
    title: "Water Quality Monitoring",
    description: "Capture DO, pH, ammonia, depth, and temperature with threshold-based status flags.",
    icon: Droplets,
  },
  {
    title: "Sampling and Health",
    description: "Record growth samples and mortality causes with trend visibility and fast drilldown.",
    icon: FlaskConical,
  },
  {
    title: "Compliance and Reporting",
    description: "Export CSV and PDF reports with consistent farm-level records and timeline history.",
    icon: ShieldCheck,
  },
  {
    title: "Operations Intelligence",
    description: "Combine system performance and actions in one workspace for daily decision-making.",
    icon: Waves,
  },
]

export default function LandingPage() {
  const [isHovered, setIsHovered] = useState(false)
  const router = useRouter()

  const handlePrimaryAction = () => {
    router.push("/auth")
  }

  return (
    <main className="min-h-screen bg-background px-4 py-6 md:px-6 md:py-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <section className="relative overflow-hidden rounded-[36px] border border-border bg-card shadow-sm">
          <div
            className="absolute inset-0 z-0"
            style={{
              background:
                "radial-gradient(circle at 20% 20%, color-mix(in srgb, var(--primary) 30%, transparent) 0%, transparent 38%), radial-gradient(circle at 80% 30%, color-mix(in srgb, var(--chart-2) 24%, transparent) 0%, transparent 42%), linear-gradient(165deg, color-mix(in srgb, var(--background) 72%, var(--primary)) 0%, color-mix(in srgb, var(--background) 74%, var(--secondary)) 46%, color-mix(in srgb, var(--background) 78%, var(--chart-3)) 100%)",
            }}
          />
          <div className="absolute inset-0 z-0 bg-[repeating-linear-gradient(12deg,color-mix(in_srgb,var(--foreground)_6%,transparent)_0,color-mix(in_srgb,var(--foreground)_6%,transparent)_2px,transparent_2px,transparent_16px)]" />
          <Suspense fallback={<div className="absolute inset-0 bg-muted/20" />}>
            <div className="pointer-events-none absolute inset-0 z-0 opacity-45 mix-blend-screen">
              <Dithering
                colorBack="#00000000"
                colorFront="#22C55E"
                shape="warp"
                type="4x4"
                speed={isHovered ? 0.6 : 0.2}
                className="size-full"
                minPixelRatio={1}
              />
            </div>
          </Suspense>
          <div className="absolute inset-0 z-0 bg-background/35" />

          <div
            className="relative z-10 px-6 py-16 md:px-10 md:py-24"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            <div className="mx-auto max-w-4xl rounded-3xl border border-border bg-card/70 p-6 text-center shadow-2xl backdrop-blur-md md:p-10">
              <h1 className="mx-auto max-w-4xl text-balance text-4xl font-semibold tracking-tight text-foreground md:text-6xl">
                Aquaculture management software
              </h1>
              <p className="mx-auto mt-6 max-w-2xl text-sm leading-6 text-muted-foreground md:text-base">
                Monitor fish performance, feeding, mortality, and water quality in one place. AquaSmart helps farm
                teams make faster, evidence-based daily decisions.
              </p>
              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={handlePrimaryAction}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
                >
                  Sign In
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </section>

        <section id="modules" className="space-y-4">
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold text-foreground md:text-3xl">Core Modules</h2>
            <p className="text-sm text-muted-foreground">
              Built for daily farm operations: data capture, performance monitoring, and actionable insights.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {features.map((feature) => {
              const Icon = feature.icon
              return (
                <article key={feature.title} className="rounded-xl border border-border bg-card p-4 shadow-sm">
                  <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <Icon className="h-4 w-4" />
                  </div>
                  <h3 className="text-sm font-semibold text-foreground">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{feature.description}</p>
                </article>
              )
            })}
          </div>
        </section>

        <footer className="rounded-xl border border-border bg-card px-4 py-4 text-xs text-muted-foreground shadow-sm md:px-5">
          <p>&copy; 2026 AquaSmart. Aquaculture operations and analytics platform.</p>
        </footer>
      </div>
    </main>
  )
}
