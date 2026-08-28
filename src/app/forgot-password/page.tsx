import type { Metadata } from "next"
import ForgotPasswordPageClient from "./page.client"

export const metadata: Metadata = {
  title: "Forgot Password | Samaki360",
  description: "Reset your Samaki360 password.",
}

export default function ForgotPasswordPage() {
  return <ForgotPasswordPageClient />
}
