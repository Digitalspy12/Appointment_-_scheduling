'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { format } from 'date-fns'
import type { AppointmentStatus } from '@/lib/booking-types'

export async function getAdminAppointments(dateStr: string) {
    const supabase = await createClient()

    // We want to fetch all appointments for the current date, ordered by time.
    const { data, error } = await supabase
        .from('appointment')
        .select('*')
        .eq('appointment_date', dateStr)
        .order('start_time', { ascending: true })

    if (error) {
        console.error('Error fetching admin appointments:', error)
        return []
    }

    return data
}

export async function updateAppointmentStatus(id: string, status: AppointmentStatus) {
    const supabase = await createClient()

    // First verify session if needed (assuming RLS protects it, but we can also check user)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return { success: false, error: 'Unauthorized' }
    }

    const { error } = await supabase
        .from('appointment')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id)

    if (error) {
        // Check if it's a unique constraint violation (double booking)
        if (error.code === '23505') {
            return { success: false, error: 'Slot has already been approved for another appointment.' }
        }
        console.error('Error updating status:', error)
        return { success: false, error: 'Failed to update status.' }
    }

    revalidatePath('/admin')
    revalidatePath('/')

    if (status === 'APPROVED') {
        const { data: appointment } = await supabase
            .from('appointment')
            .select('*')
            .eq('id', id)
            .single()

        if (appointment) {
            const { createGoogleCalendarEvent } = await import('@/lib/google-calendar')

            const appData = {
                trackingId: appointment.tracking_id,
                visitorName: appointment.visitor_name,
                appointmentDate: appointment.appointment_date,
                startTime: appointment.start_time,
                endTime: appointment.end_time,
                reason: appointment.reason,
                visitorEmail: appointment.visitor_email,
                visitorMobile: appointment.visitor_mobile
            }

            await createGoogleCalendarEvent(appData as any)
        }
    }

    return { success: true }
}

export async function createFullDayEmergencyBlock(dateStr: string, reason: string) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Unauthorized' }

    // Insert full day block
    const { error: blockError } = await supabase.from('busy_block').insert({
        block_date: dateStr,
        is_full_day_emergency: true,
        reason: reason
    })

    if (blockError) return { success: false, error: 'Failed to create block' }

    // Auto-reject any pending appointments for that day
    const { error: updateError } = await supabase
        .from('appointment')
        .update({ status: 'REJECTED', updated_at: new Date().toISOString() })
        .eq('appointment_date', dateStr)
        .eq('status', 'PENDING')

    if (updateError) console.error('Failed to auto-reject appointments:', updateError)

    revalidatePath('/admin')
    revalidatePath('/')

    return { success: true }
}
