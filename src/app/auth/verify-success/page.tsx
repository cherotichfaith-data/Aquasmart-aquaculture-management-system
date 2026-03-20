"use client"

import Link from "next/link"
import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { CheckCircle2 } from "lucide-react"

export default function VerifySuccessPage() {
    const router = useRouter()

    useEffect(() => {
        const timer = window.setTimeout(() => {
            router.replace("/")
        }, 2500)

        return () => window.clearTimeout(timer)
    }, [router])

    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-muted/40">
            <div className="w-full max-w-md p-8 space-y-6 bg-card text-card-foreground rounded-lg shadow-lg border border-border">
                <div className="flex flex-col items-center space-y-2 text-center">
                    <div className="p-3 rounded-full bg-primary/10">
                        <CheckCircle2 className="w-8 h-8 text-primary" />
                    </div>
                    <h1 className="text-2xl font-bold tracking-tight text-primary">
                        Email Verified
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        You're signed in. Redirecting you to the dashboard...
                    </p>
                </div>

                <div className="flex flex-col gap-2 pt-4">
                    <Button asChild className="w-full" variant="default">
                        <Link href="/">Go to Dashboard</Link>
                    </Button>
                </div>
            </div>
        </div>
    )
}

