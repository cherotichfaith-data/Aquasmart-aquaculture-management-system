import { Suspense } from "react"
import PageClient from "./page.client"
import { requireUser } from "@/lib/supabase/require-user"
import { requireInitialFarmId } from "@/features/farm/queries.server"

export default async function Page() {
  await requireUser()
  await requireInitialFarmId()
  return (
    <Suspense fallback={null}>
      <PageClient />
    </Suspense>
  )
}
