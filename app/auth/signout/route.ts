import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
    const supabase = await createClient()

    const { error } = await supabase.auth.signOut()

    if (error) {
        return NextResponse.redirect(new URL('/error', request.url))
    }

    revalidatePath('/', 'layout')
    return NextResponse.redirect(new URL('/admin/login', request.url), {
        status: 302,
    })
}
