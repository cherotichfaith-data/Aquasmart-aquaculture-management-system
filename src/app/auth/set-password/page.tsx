import type { Metadata } from "next"
import SetPasswordPageClient from "./page.client"

export const metadata: Metadata = {
  title: "Create Account | SUSTAIN Aquasmart",
  description: "Create your SUSTAIN Aquasmart account from an invitation.",
}

export default function SetPasswordPage() {
  return <SetPasswordPageClient />
}
