import type { Metadata } from "next"
import SetPasswordPageClient from "./page.client"

export const metadata: Metadata = {
  title: "Create Account | Samaki360",
  description: "Create your Samaki360 account from an invitation.",
}

export default function SetPasswordPage() {
  return <SetPasswordPageClient />
}
