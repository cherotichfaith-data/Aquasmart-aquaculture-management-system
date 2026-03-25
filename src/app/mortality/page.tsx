import { Suspense } from "react"
import PageClient from "./page.client"
import { requireInitialFarmId } from "@/features/farm/queries.server"

export default async function Page() {
  await requireInitialFarmId()
  return (
    <Suspense fallback={null}>
      <PageClient />
    </Suspense>
  )
}
