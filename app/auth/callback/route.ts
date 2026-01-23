import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url)
    const code = searchParams.get('code')
    // if "next" is in param, use it as the redirect URL
    const next = searchParams.get('next') ?? '/dashboard'

    // Check for errors first
    const error = searchParams.get('error')
    const errorCode = searchParams.get('error_code')
    const errorDescription = searchParams.get('error_description')

    if (error) {
        return NextResponse.redirect(`${origin}/auth/auth-error?error=${error}&error_code=${errorCode}&error_description=${errorDescription}`)
    }

    if (code) {
        const supabase = await createClient()
        const { error } = await supabase.auth.exchangeCodeForSession(code)

        if (!error) {
            // If verification successful, maybe go to a success page briefly?
            // Or just go to dashboard if logged in.
            // User requested a "Verify Success" page with links to login.
            // If this was email verification, we might want to show that.
            // Usually PKCE exchange logs you in immediately.
            // Let's redirect to verify-success if the type is email verification related, or just dashboard.
            // Typically, for email confirmation, the user is redirected here.

            // NOTE: If the user is already logged in after exchange, verify-success might feel weird if they expect dashboard.
            // BUT the user asked for "successful verification page that will be having links to the login page".
            // This implies they might NOT be auto-redirected to dashboard, or they want a confirmation screen.
            // Let's redirect to verify-success for clarity, then they can click "Login" (or "Dashboard" if session works).

            return NextResponse.redirect(`${origin}/auth/verify-success`)
        } else {
            return NextResponse.redirect(`${origin}/auth/auth-error?error=ExchangeError&error_description=${error.message}`)
        }
    }

    // Return the user to an error page with instructions
    return NextResponse.redirect(`${origin}/auth/auth-error?error=NoCode&error_description=No+authorization+code+provided`)
}
