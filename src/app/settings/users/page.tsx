import { requireUser } from "@/lib/supabase/require-user"
import UsersPageClient from "./page.client"

export const metadata = { title: "Users | AquaSmart" }

export default async function UsersPage() {
  await requireUser()
  return <UsersPageClient />
}
