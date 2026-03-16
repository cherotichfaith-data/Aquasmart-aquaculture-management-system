import { Suspense } from "react"
import PageClient from "./page.client"

export default async function Page() {
  return (
    <Suspense fallback={null}>
      <PageClient />
    </Suspense>
  )
}
