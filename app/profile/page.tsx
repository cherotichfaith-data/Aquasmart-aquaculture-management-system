import PageClient from "./page.client"
import { requireUser } from "@/utils/supabase/require-user"

export default async function Page() {
  await requireUser()
  return <PageClient />
}
