import { Suspense } from "react"
import PageClient from "./page.client"
import { requireUser } from "@/lib/supabase/require-user"

export default async function Page() {
  await requireUser()
  return (
    <Suspense fallback={null}>
      <PageClient />
    </Suspense>
  )
}
