"use client"

import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { AlertCircle } from "lucide-react"
import { Suspense } from "react"

function AuthErrorContent() {
    const searchParams = useSearchParams()
    const error = searchParams.get("error")
    const errorCode = searchParams.get("error_code")
    const errorDescription = searchParams.get("error_description")

    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-muted/40">
            <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-lg dark:bg-zinc-950 border">
                <div className="flex flex-col items-center space-y-2 text-center">
                    <div className="p-3 rounded-full bg-red-100 dark:bg-red-900/20">
                        <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
                    </div>
                    <h1 className="text-2xl font-bold tracking-tight text-red-600 dark:text-red-400">
                        Authentication Error
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        {errorDescription || "An error occurred during authentication."}
                    </p>
                </div>

                <div className="p-4 text-sm text-center border rounded-md bg-muted/50">
                    <div className="font-mono text-xs text-muted-foreground">
                        <p>Error: {error}</p>
                        {errorCode && <p>Code: {errorCode}</p>}
                    </div>
                </div>

                <div className="flex flex-col gap-2">
                    <Button asChild className="w-full" variant="default">
                        <Link href="/auth?view=sign_up">Back to Register</Link>
                    </Button>
                    <Button asChild className="w-full" variant="outline">
                        <Link href="/auth">Back to Login</Link>
                    </Button>
                </div>
            </div>
        </div>
    )
}

export default function AuthErrorPage() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
            <AuthErrorContent />
        </Suspense>
    )
}
