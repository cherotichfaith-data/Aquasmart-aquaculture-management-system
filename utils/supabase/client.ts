import { createBrowserClient } from "@supabase/ssr";

function getProjectRef(url: string | undefined) {
    if (!url) return null;
    return url.replace(/^https?:\/\//, "").split(".")[0] ?? null;
}

export function createClient() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const projectRef = getProjectRef(supabaseUrl);
    const cookieName = projectRef ? `sb-${projectRef}-auth-token` : undefined;

    return createBrowserClient(supabaseUrl, supabaseKey, {
        cookieOptions: cookieName ? { name: cookieName } : undefined,
        cookieEncoding: "base64url",
        isSingleton: true,
    });
}
