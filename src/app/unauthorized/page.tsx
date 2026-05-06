import Link from "next/link"
import { DASHBOARD_ROOT } from "@/lib/app-entry"

export default function UnauthorizedPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md rounded-lg border border-border/80 bg-card p-6 shadow-sm">
        <h1 className="text-xl font-semibold tracking-tight">Unauthorized</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          You do not have access to this page.
        </p>
        <Link
          href={DASHBOARD_ROOT}
          className="mt-5 inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Back to dashboard
        </Link>
      </div>
    </main>
  )
}
