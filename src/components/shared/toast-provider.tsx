"use client"

import type React from "react"
import { Toaster } from "@/components/shared/toaster"

export function ToastProvider({ children }: { children: React.ReactNode }) {
    return (
        <>
            {children}
            <Toaster />
        </>
    )
}
