import type { Metadata } from "next"
import LoginForm from "@/components/LoginForm"

export const metadata: Metadata = {
  title: "Auth | AquaSmart",
  description: "Sign in to AquaSmart or create your account.",
}

export default function AuthPage() {
  return <LoginForm />
}
