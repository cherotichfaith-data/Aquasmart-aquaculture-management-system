import type { Metadata } from "next"
import LoginForm from "@/components/LoginForm"

export const metadata: Metadata = {
  title: "Auth | Samaki360",
  description: "Sign in to Samaki360 or create your account.",
}

export default function AuthPage() {
  return <LoginForm />
}
