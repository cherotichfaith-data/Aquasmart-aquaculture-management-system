import { NextResponse } from 'next/server'
import { claimFarmMembershipsByEmail } from '@/lib/auth/claim-farm-memberships'
import { createClient } from '@/lib/supabase/server'
import { logSbError } from '@/lib/supabase/log'

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url)
    const code = searchParams.get('code')
    const nextParam = searchParams.get('next')
    const next = nextParam && nextParam.startsWith('/') ? nextParam : '/'

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
            const { error: claimError } = await claimFarmMembershipsByEmail(supabase)
            if (claimError) {
                logSbError("authCallback:claimFarmMemberships", claimError)
            }
            return NextResponse.redirect(`${origin}${next}`)
        } else {
            return NextResponse.redirect(`${origin}/auth/auth-error?error=ExchangeError&error_description=${error.message}`)
        }
    }

    return NextResponse.redirect(`${origin}/auth/auth-error?error=NoCode&error_description=No+authorization+code+provided`)
}
