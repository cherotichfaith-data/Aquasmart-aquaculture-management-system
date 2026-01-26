"use client"

import { useCallback, useEffect, useState } from "react"
import { useAuth } from "@/components/auth-provider"
import { createClient } from "@/utils/supabase/client"

export function useProfile() {
  const { user } = useAuth()
  const supabase = createClient()
  const [profile, setProfile] = useState<Record<string, any> | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const fetchProfile = useCallback(async () => {
    if (!user?.id) {
      setProfile(null)
      return
    }

    setLoading(true)
    setError(null)
    try {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", user.id).single()
      if (error) throw error
      setProfile(data ?? null)
    } catch (err: any) {
      setError(err)
    } finally {
      setLoading(false)
    }
  }, [supabase, user?.id])

  useEffect(() => {
    void fetchProfile()
  }, [fetchProfile])

  const updateProfile = useCallback(
    async (updates: Record<string, any>) => {
      if (!user?.id) throw new Error("Not authenticated")
      setLoading(true)
      setError(null)
      try {
        const payload = { id: user.id, ...updates }
        const { data, error } = await supabase.from("profiles").upsert(payload).select().single()
        if (error) throw error
        setProfile(data ?? null)
        if (typeof window !== "undefined") {
          try {
            const evt = new CustomEvent("profile-updated", { detail: data })
            window.dispatchEvent(evt)
          } catch (e) {
            // ignore
          }
        }
        return { status: "success", data }
      } catch (err: any) {
        setError(err)
        return { status: "error", error: err }
      } finally {
        setLoading(false)
      }
    },
    [supabase, user?.id]
  )

  return { profile, loading, error, fetchProfile, updateProfile }
}
