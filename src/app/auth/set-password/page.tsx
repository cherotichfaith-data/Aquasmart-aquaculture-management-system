import type { Metadata } from "next"
import SetPasswordPageClient from "./page.client"

export const metadata: Metadata = {
  title: "Set Password | AquaSmart",
  description: "Complete your AquaSmart invited account.",
}

export default function SetPasswordPage() {
  return <SetPasswordPageClient />
}
