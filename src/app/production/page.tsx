import PageClient from "./page.client"
import { requireInitialFarmId } from "@/features/farm/queries.server"

export default async function Page() {
  await requireInitialFarmId()
  return <PageClient />
}
