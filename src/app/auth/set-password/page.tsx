import type { Metadata } from "next"
import SetPasswordPageClient from "./page.client"

export const metadata: Metadata = {
  title: "Create Account | AquaSmart",
  description: "Create your AquaSmart account from an invitation.",
}

export default function SetPasswordPage() {
  return <SetPasswordPageClient />
}
