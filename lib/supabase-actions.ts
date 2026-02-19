
import { createClient } from "@/utils/supabase/client"
import { logSbError } from "@/utils/supabase/log"
import { getSessionUser } from "@/utils/supabase/session"
import { Database } from "@/lib/types/database"
import { PostgrestError } from "@supabase/supabase-js"

type TableName = keyof Database["public"]["Tables"]
type TableRow<T extends TableName> = Database["public"]["Tables"][T]["Row"]
type TableInsert<T extends TableName> = Database["public"]["Tables"][T]["Insert"]

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
    data: TableInsert<T> | TableInsert<T>[]
): Promise<MutationResult<TableRow<T>[]>> {
    const supabase = createClient()
    try {
        const sessionUser = await getSessionUser(supabase, `insertData:${String(table)}:getSession`)
        if (!sessionUser) {
            return { success: false, data: null, error: new Error("No active session") }
        }
        const { data: result, error } = await supabase
            .from(table)
            .insert(data as never)
            .select()

        if (error) {
            logSbError(`insertData:${String(table)}`, error)
            return { success: false, data: null, error }
        }

        return { success: true, data: (result ?? []) as unknown as TableRow<T>[], error: null }
    } catch (err) {
        logSbError(`insertData:${String(table)}:catch`, err)
        return { success: false, data: null, error: err as Error }
    }
}
