
import { createClient } from "@/utils/supabase/client"
import { logSbError } from "@/utils/supabase/log"
import { getSessionUser } from "@/utils/supabase/session"
import { Database, Tables, TablesInsert, TablesUpdate } from "@/lib/types/database"
import { PostgrestError } from "@supabase/supabase-js"

type TableName = keyof Database["public"]["Tables"]

export type MutationResult<T> =
    | { success: true; data: T; error: null }
    | { success: false; data: null; error: PostgrestError | Error }

/**
 * Generic helper to insert data into a Supabase table.
 * @param table The table name.
 * @param data The data to insert.
 * @returns The inserted data or an error.
 */
export async function insertData<T extends TableName>(
    table: T,
    data: TablesInsert<T> | TablesInsert<T>[]
): Promise<MutationResult<Tables<T>[]>> {
    const supabase = createClient()
    try {
        const sessionUser = await getSessionUser(supabase, `insertData:${String(table)}:getSession`)
        if (!sessionUser) {
            return { success: false, data: null, error: new Error("No active session") }
        }
        const { data: result, error } = await supabase
            .from(table)
            .insert(data as any) // Type assertion needed for array/single union sometimes, but standard insert handles object or array
            .select()

        if (error) {
            logSbError(`insertData:${String(table)}`, error)
            return { success: false, data: null, error }
        }

        return { success: true, data: result as Tables<T>[], error: null }
    } catch (err) {
        logSbError(`insertData:${String(table)}:catch`, err)
        return { success: false, data: null, error: err as Error }
    }
}

/**
 * Generic helper to update data in a Supabase table.
 * @param table The table name.
 * @param match An object of column-value pairs to match rows to update.
 * @param data The data to update.
 * @returns The updated data or an error.
 */
export async function updateData<T extends TableName>(
    table: T,
    match: Partial<Tables<T>>,
    data: TablesUpdate<T>
): Promise<MutationResult<Tables<T>[]>> {
    const supabase = createClient()
    try {
        const sessionUser = await getSessionUser(supabase, `updateData:${String(table)}:getSession`)
        if (!sessionUser) {
            return { success: false, data: null, error: new Error("No active session") }
        }
        const { data: result, error } = await supabase
            .from(table)
            .update(data as any)
            .match(match as any) // Match expects generic object
            .select()

        if (error) {
            logSbError(`updateData:${String(table)}`, error)
            return { success: false, data: null, error }
        }

        return { success: true, data: result as Tables<T>[], error: null }
    } catch (err) {
        logSbError(`updateData:${String(table)}:catch`, err)
        return { success: false, data: null, error: err as Error }
    }
}

/**
 * Generic helper to delete data from a Supabase table.
 * @param table The table name.
 * @param match An object of column-value pairs to match rows to delete.
 * @returns The deleted data (if selected) or an error.
 */
export async function deleteData<T extends TableName>(
    table: T,
    match: Partial<Tables<T>>
): Promise<MutationResult<Tables<T>[]>> {
    const supabase = createClient()
    try {
        const sessionUser = await getSessionUser(supabase, `deleteData:${String(table)}:getSession`)
        if (!sessionUser) {
            return { success: false, data: null, error: new Error("No active session") }
        }
        const { data: result, error } = await supabase
            .from(table)
            .delete()
            .match(match as any)
            .select()

        if (error) {
            logSbError(`deleteData:${String(table)}`, error)
            return { success: false, data: null, error }
        }

        return { success: true, data: result as Tables<T>[], error: null }
    } catch (err) {
        logSbError(`deleteData:${String(table)}:catch`, err)
        return { success: false, data: null, error: err as Error }
    }
}
