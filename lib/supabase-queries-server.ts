
import { createClient } from "@/utils/supabase/server"
import { QueryResult } from "./supabase-client"
import { Tables } from "./types/database"

type SystemsRow = Tables<"systems">

export async function fetchSystemsEntryList(): Promise<QueryResult<SystemsRow>> {
    const supabase = await createClient()
    const { data, error } = await supabase.from("systems").select("*").order("system_id", { ascending: true })

    if (error) {
        return { status: "error", data: null, error: error.message }
    }

    return { status: "success", data: data || [] }
}
