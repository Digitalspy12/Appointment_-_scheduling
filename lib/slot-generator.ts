import type { TimeSlot } from './booking-types'

interface SlotSettings {
  startTime: string // "10:00" (24h format)
  endTime: string // "16:00" (24h format)
  slotDurationMins: number
  bufferTimeMins: number
}

// Default principal settings (would normally come from DB)
const DEFAULT_SETTINGS: SlotSettings = {
  startTime: '10:00',
  endTime: '16:00',
  slotDurationMins: 20,
  bufferTimeMins: 10,
}

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

export function generateTimeSlots(
  date: Date,
  bookedSlots: string[] = [],
  busyBlocks: Array<{ startTime: string; endTime: string; isFullDay: boolean }> = [],
  settings: SlotSettings = DEFAULT_SETTINGS
): TimeSlot[] {
  const slots: TimeSlot[] = []
  const startMins = timeToMinutes(settings.startTime)
  const endMins = timeToMinutes(settings.endTime)
  const now = new Date()
  const isToday = date.toDateString() === now.toDateString()
  const currentMins = now.getHours() * 60 + now.getMinutes()

  // Check full day emergency block
  const isFullDayBlocked = busyBlocks.some((b) => b.isFullDay)
  if (isFullDayBlocked) return []

  let currentSlotStart = startMins
  let slotIndex = 0

  while (currentSlotStart + settings.slotDurationMins <= endMins) {
    const slotEnd = currentSlotStart + settings.slotDurationMins
    const startStr = minutesToTime(currentSlotStart)
    const endStr = minutesToTime(slotEnd)

    // Check if this slot overlaps a busy block
    const isBusy = busyBlocks.some((block) => {
      if (block.isFullDay) return true
      const blockStart = timeToMinutes(block.startTime)
      const blockEnd = timeToMinutes(block.endTime)
      return currentSlotStart < blockEnd && slotEnd > blockStart
    })

    // Check if this slot is already booked
    const isBooked = bookedSlots.includes(startStr)

    // Check if slot has already passed (for today)
    const isPast = isToday && currentSlotStart <= currentMins

    const isAvailable = !isBusy && !isBooked && !isPast

    slots.push({
      id: `slot-${slotIndex}`,
      startTime: formatTo12Hour(startStr),
      endTime: formatTo12Hour(endStr),
      isAvailable,
    })

    currentSlotStart = slotEnd + settings.bufferTimeMins
    slotIndex++
  }

  return slots
}

export function generateDemoSlots(date: Date): TimeSlot[] {
  // Simulate some booked slots for demo purposes
  const dayOfWeek = date.getDay()
  const dateNum = date.getDate()

  // Weekend has no slots
  if (dayOfWeek === 0 || dayOfWeek === 6) return []

  const bookedSlots: string[] = []

  // Simulate some bookings based on date
  if (dateNum % 3 === 0) bookedSlots.push('10:30')
  if (dateNum % 4 === 0) bookedSlots.push('11:30')
  if (dateNum % 5 === 0) bookedSlots.push('14:00')

  // Simulate a lunch block
  const busyBlocks = [
    { startTime: '12:30', endTime: '13:30', isFullDay: false },
  ]

  return generateTimeSlots(date, bookedSlots, busyBlocks)
}
