import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { startOfDay, format } from 'date-fns'
import { getAdminAppointments } from './actions'
import { Shield, Settings, Users, AlertTriangle } from 'lucide-react'
import AdminDashboardClient from './components/admin-dashboard-client'

export const metadata = {
    title: 'Admin Dashboard | PASS',
}

export default async function AdminDashboardPage() {
    const supabase = await createClient()

    // 1. Verify Authentication
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/admin/login')
    }

    // 2. Fetch initial data for today
    const today = format(startOfDay(new Date()), 'yyyy-MM-dd')
    const appointments = await getAdminAppointments(today)

    // 3. Fetch full day emergencies for today to provide initial state
    const { data: blocks } = await supabase
        .from('busy_block')
        .select('id')
        .eq('block_date', today)
        .eq('is_full_day_emergency', true)

    const isEmergencyClosedToday = (blocks && blocks.length > 0)

    return (
        <div className="min-h-screen bg-muted/10">
            {/* Header */}
            <header className="sticky top-0 z-40 border-b border-border bg-card/80 backdrop-blur-sm">
                <div className="mx-auto max-w-5xl px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center size-9 rounded-lg bg-emerald-600 text-white">
                            <Shield className="size-5" />
                        </div>
                        <div>
                            <h1 className="text-lg font-bold font-serif text-foreground leading-none">
                                Admin Dashboard
                            </h1>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                {user.email}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <form action="/auth/signout" method="post">
                            <button className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                                Sign out
                            </button>
                        </form>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="mx-auto max-w-5xl px-4 py-8">
                <AdminDashboardClient
                    initialAppointments={appointments || []}
                    initialDate={today}
                    initialEmergencyClosed={isEmergencyClosedToday ?? false}
                />
            </main>
        </div>
    )
}
