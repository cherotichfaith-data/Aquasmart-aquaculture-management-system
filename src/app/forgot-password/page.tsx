import type { Metadata } from "next"
import ForgotPasswordPageClient from "./page.client"

export const metadata: Metadata = {
  title: "Forgot Password | SUSTAIN Aquasmart",
  description: "Reset your SUSTAIN Aquasmart password.",
}

export default function ForgotPasswordPage() {
  return <ForgotPasswordPageClient />
}
