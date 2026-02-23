export interface TimeSlot {
  id: string
  startTime: string // "10:00 AM"
  endTime: string // "10:20 AM"
  isAvailable: boolean
}

export interface BookingFormData {
  visitorName: string
  visitorEmail: string
  visitorMobile: string
  reason: string
}

export interface BookingRequest extends BookingFormData {
  appointmentDate: string // ISO date string
  startTime: string
  endTime: string
}

export interface BookingResult {
  success: boolean
  trackingId?: string
  error?: string
}

export type AppointmentStatus = 'PENDING' | 'APPROVED' | 'REJECTED'

export interface AppointmentTracking {
  trackingId: string
  visitorName: string
  appointmentDate: string
  startTime: string
  endTime: string
  status: AppointmentStatus
  reason: string
  createdAt: string
}
