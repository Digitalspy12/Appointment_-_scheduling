'use server'

import { createClient } from '@/lib/supabase/server'

import { nowInIST, todayStrIST, toISTDateStr } from '@/lib/ist-date'
import type { TimeSlot, BookingRequest, BookingResult, AppointmentTracking } from '@/lib/booking-types'

function timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number)
    return hours * 60 + minutes
}

function minutesToTime(minutes: number): string {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`
}

function formatTo12Hour(time24: string): string {
    const [hours, minutes] = time24.split(':').map(Number)
    const period = hours >= 12 ? 'PM' : 'AM'
    const displayHours = hours % 12 || 12
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`
}

// Ensure 24hr format is "HH:mm"
function formatTo24Hour(time12: string): string {
    const [time, modifier] = time12.split(' ');
    let [hours, minutes] = time.split(':');
    if (hours === '12') {
        hours = '00';
    }
    if (modifier === 'PM') {
        hours = (parseInt(hours, 10) + 12).toString();
    }
    return `${hours.padStart(2, '0')}:${minutes}`;
}

export async function getAvailableSlots(dateStr: string): Promise<TimeSlot[]> {
    const supabase = await createClient()

    // -------------------------------------------------------------------
    // IST-aware "today" and "now".
    // On Vercel (UTC), `new Date()` would be 5 h 30 min behind IST.
    // `todayStrIST()` uses Intl.DateTimeFormat with 'Asia/Kolkata' to get
    // the correct IST calendar date regardless of server timezone.
    // -------------------------------------------------------------------
    const todayStr = todayStrIST()           // e.g. "2026-03-26"
    const istNow   = nowInIST()              // fake-local Date with IST values

    // dateStr comes from the client in 'yyyy-MM-dd' format.
    // Comparing as strings is safe and avoids any UTC/local ambiguity.
    if (dateStr < todayStr) return []

    // day-of-week: parse the date parts directly to avoid UTC midnight shift
    const [year, month, day] = dateStr.split('-').map(Number)
    const dateForParsing = new Date(year, month - 1, day)   // local-time, no TZ shift
    const dayOfWeek = dateForParsing.getDay()

    // 1. Get settings for this day
    const { data: settings, error: settingsError } = await supabase
        .from('principal_setting')
        .select('*')
        .eq('day_of_week', dayOfWeek)
        .single()

    if (settingsError || !settings) return []

    // 2. Get busy blocks for this date
    const { data: blocks } = await supabase
        .from('busy_block')
        .select('*')
        .eq('block_date', dateStr)

    // If there is a full day emergency, return empty slots
    const isFullDayEmergency = blocks?.some(b => b.is_full_day_emergency)
    if (isFullDayEmergency) return []

    // 3. Get approved appointments for this date
    const { data: appointments } = await supabase
        .from('appointment')
        .select('start_time, end_time')
        .eq('appointment_date', dateStr)
        .eq('status', 'APPROVED')

    const slots: TimeSlot[] = []
    const startMins = timeToMinutes(settings.start_time)
    const endMins   = timeToMinutes(settings.end_time)

    // IST current minutes — replaces UTC `now.getHours() * 60 + now.getMinutes()`
    const isToday     = dateStr === todayStr
    const currentMins = istNow.getHours() * 60 + istNow.getMinutes()

    let currentSlotStart = startMins
    let slotIndex = 0

    while (currentSlotStart + settings.slot_duration_mins <= endMins) {
        const slotEnd  = currentSlotStart + settings.slot_duration_mins
        const startStr = minutesToTime(currentSlotStart)
        const endStr   = minutesToTime(slotEnd)

        // Check busy blocks
        const isBusy = blocks?.some(block => {
            if (!block.start_time || !block.end_time) return false
            const blockStart = timeToMinutes(block.start_time)
            const blockEnd   = timeToMinutes(block.end_time)
            return currentSlotStart < blockEnd && slotEnd > blockStart
        })

        // Check approved appointments (treated like busy blocks)
        const isBooked = appointments?.some(app => {
            const appStart = timeToMinutes(app.start_time)
            const appEnd   = timeToMinutes(app.end_time)
            return currentSlotStart < appEnd && slotEnd > appStart
        })

        // Mark slot as past only when the date is today in IST
        const isPast = isToday && currentSlotStart <= currentMins

        const isAvailable = !isBusy && !isBooked && !isPast

        slots.push({
            id: `slot-${slotIndex}`,
            startTime: formatTo12Hour(startStr),
            endTime:   formatTo12Hour(endStr),
            isAvailable,
        })

        currentSlotStart = slotEnd + settings.buffer_time_mins
        slotIndex++
    }

    return slots
}

function generateTrackingId(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    let result = ''
    for (let i = 0; i < 6; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return result
}

export async function createBooking(request: BookingRequest): Promise<BookingResult> {
    const supabase = await createClient()
    const trackingId = generateTrackingId()

    // Parse the date parts directly to avoid any UTC-midnight shift when
    // `new Date(dateStr)` is called on a UTC server.
    const [y, m, d] = request.appointmentDate.split('-').map(Number)
    const appointmentDate = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`

    const { error } = await supabase.from('appointment').insert({
        tracking_id:    trackingId,
        visitor_name:   request.visitorName,
        visitor_email:  request.visitorEmail,
        visitor_mobile: request.visitorMobile,
        reason:         request.reason,
        appointment_date: appointmentDate,
        start_time:     formatTo24Hour(request.startTime),
        end_time:       formatTo24Hour(request.endTime),
        status:         'PENDING'
    })

    if (error) {
        console.error('Failed to create appointment:', error)
        return { success: false, error: 'Failed to create appointment. Please try again.' }
    }

    return { success: true, trackingId }
}

export async function trackAppointment(trackingId: string): Promise<{ data: AppointmentTracking | null; error: string | null }> {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('appointment')
        .select('tracking_id, visitor_name, appointment_date, start_time, end_time, status, reason, created_at')
        .eq('tracking_id', trackingId.toUpperCase())
        .single()

    if (error || !data) {
        return { data: null, error: 'Tracking ID not found' }
    }

    return {
        data: {
            trackingId:      data.tracking_id,
            visitorName:     data.visitor_name,
            appointmentDate: data.appointment_date,
            startTime: formatTo12Hour(data.start_time.substring(0, 5)), // "10:00:00" -> "10:00" -> "10:00 AM"
            endTime:   formatTo12Hour(data.end_time.substring(0, 5)),
            status:          data.status,
            reason:          data.reason,
            createdAt:       data.created_at
        },
        error: null
    }
}
