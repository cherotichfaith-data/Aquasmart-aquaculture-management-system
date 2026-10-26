"use client"

import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/app-ui/card"
import { AlertCircle } from "lucide-react"

export default function AuthErrorPage() {
  const searchParams = useSearchParams()
  const description =
    searchParams.get("error_description") ??
    "The authentication link could not be used. Open the latest email link, or ask an admin to send a fresh invitation."

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-destructive" />
            <CardTitle>Invite Link Not Available</CardTitle>
          </div>
          <CardDescription>We could not complete the invite sign-in.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {description}
          </p>
          <Link
            href="/auth"
            className="mt-5 inline-flex rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
          >
            Back to sign in
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}


