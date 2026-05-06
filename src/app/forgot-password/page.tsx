import type { Metadata } from "next"
import ForgotPasswordPageClient from "./page.client"

export const metadata: Metadata = {
  title: "Forgot Password | AquaSmart",
  description: "Reset your AquaSmart password.",
}

export default function ForgotPasswordPage() {
  return <ForgotPasswordPageClient />
}
