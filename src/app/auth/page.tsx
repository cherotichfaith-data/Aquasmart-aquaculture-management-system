import type { Metadata } from "next"
import LoginForm from "@/components/LoginForm"

export const metadata: Metadata = {
  title: "Auth | SUSTAIN Aquasmart",
  description: "Sign in to SUSTAIN Aquasmart or create your account.",
}

export default function AuthPage() {
  return <LoginForm />
}
