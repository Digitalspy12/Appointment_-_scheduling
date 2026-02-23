import { google } from 'googleapis'
import type { AppointmentTracking } from '@/lib/booking-types'

export async function createGoogleCalendarEvent(appointment: AppointmentTracking) {
    try {
        const clientId = process.env.GOOGLE_CLIENT_ID
        const clientSecret = process.env.GOOGLE_CLIENT_SECRET
        const refreshToken = process.env.GOOGLE_REFRESH_TOKEN

        // We still use this to know which calendar to put it on, or default to 'primary'
        const calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary'

        if (!clientId || !clientSecret || !refreshToken) {
            console.warn('Google OAuth credentials not fully set, skipping calendar invite.')
            return { success: false, error: 'Calendar Credentials not configured' }
        }

        const auth = new google.auth.OAuth2(
            clientId,
            clientSecret
        )

        auth.setCredentials({
            refresh_token: refreshToken
        })

        const calendar = google.calendar({ version: 'v3', auth })

        // Build ISO Date Strings (appointmentDate is 'YYYY-MM-DD', startTime is '10:00 AM' - wait, in DB it's 24h, 
        // but the Tracking type uses 12h format? We need to use raw values or convert properly.)

        // We expect the appointment object coming directly from the DB here, which means:
        // appointmentDate = '2026-02-24', startTime = '14:00:00' (24hr), endTime = '14:20:00'
        const startDateTimeStr = `${appointment.appointmentDate}T${appointment.startTime}`
        const endDateTimeStr = `${appointment.appointmentDate}T${appointment.endTime}`

        // Validate Date parsing
        const startDateTime = new Date(startDateTimeStr).toISOString()
        const endDateTime = new Date(endDateTimeStr).toISOString()

        const event = {
            summary: `Appointment with ${appointment.visitorName}`,
            description: `Reason for visit: ${appointment.reason}\n\nEmail: ${(appointment as any).visitorEmail}\nPhone: ${(appointment as any).visitorMobile || 'N/A'}\n\nTracking ID: ${appointment.trackingId}`,
            start: {
                dateTime: startDateTime,
                timeZone: 'Asia/Kolkata', // Defaulting to IST, adjust if needed based on server
            },
            end: {
                dateTime: endDateTime,
                timeZone: 'Asia/Kolkata',
            },
            attendees: [
                { email: (appointment as any).visitorEmail },
            ],
            // Allows the principal to update it and send emails
            guestsCanModify: false,
            reminders: {
                useDefault: true,
            },
        }

        const res = await calendar.events.insert({
            calendarId: calendarId,
            requestBody: event,
            sendUpdates: 'all', // Forces Google to dispatch confirmation email
        })

        return { success: true, eventId: res.data.id }
    } catch (error) {
        console.error('Failed to create GCal event:', error)
        return { success: false, error: 'Failed to integrate with Google Calendar.' }
    }
}
