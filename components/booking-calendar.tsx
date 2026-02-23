'use client'

import * as React from 'react'
import {
  format,
  addDays,
  isSameDay,
  isWeekend,
  isBefore,
  startOfDay,
} from 'date-fns'
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Clock,
  Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import type { TimeSlot } from '@/lib/booking-types'
import { getAvailableSlots } from '@/app/actions'

interface BookingCalendarProps {
  onSlotSelect: (date: Date, slot: TimeSlot) => void
}

const DATE_RANGE_DAYS = 14

export function BookingCalendar({ onSlotSelect }: BookingCalendarProps) {
  const today = startOfDay(new Date())
  const [selectedDate, setSelectedDate] = React.useState<Date>(today)
  const [selectedSlot, setSelectedSlot] = React.useState<TimeSlot | null>(null)
  const [slots, setSlots] = React.useState<TimeSlot[]>([])
  const [isLoadingSlots, setIsLoadingSlots] = React.useState(false)
  const [dateOffset, setDateOffset] = React.useState(0)
  const scrollRef = React.useRef<HTMLDivElement>(null)

  const dates = React.useMemo(() => {
    return Array.from({ length: DATE_RANGE_DAYS }, (_, i) =>
      addDays(today, dateOffset + i)
    )
  }, [dateOffset, today])

  // Load slots when date changes
  React.useEffect(() => {
    setIsLoadingSlots(true)
    setSelectedSlot(null)

    // Fetch real slots from Supabase via Server Action
    let isMounted = true
    getAvailableSlots(selectedDate.toISOString()).then((fetchedSlots) => {
      if (!isMounted) return
      setSlots(fetchedSlots)
      setIsLoadingSlots(false)
    }).catch((err) => {
      console.error(err)
      if (isMounted) setIsLoadingSlots(false)
    })

    return () => {
      isMounted = false
    }
  }, [selectedDate])

  const handleSlotClick = (slot: TimeSlot) => {
    if (!slot.isAvailable) return
    setSelectedSlot(slot)
    onSlotSelect(selectedDate, slot)
  }

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date)
  }

  const handleScrollDates = (direction: 'prev' | 'next') => {
    setDateOffset((prev) =>
      direction === 'next'
        ? prev + 7
        : Math.max(0, prev - 7)
    )
  }

  const availableCount = slots.filter((s) => s.isAvailable).length

  return (
    <div className="flex flex-col gap-6">
      {/* Date Picker Section */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarDays className="size-5 text-primary" />
            <h3 className="text-base font-semibold font-serif text-foreground">
              Select a Date
            </h3>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => handleScrollDates('prev')}
              disabled={dateOffset === 0}
              aria-label="Previous dates"
            >
              <ChevronLeft className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => handleScrollDates('next')}
              disabled={dateOffset >= 60}
              aria-label="Next dates"
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>

        <ScrollArea className="w-full">
          <div ref={scrollRef} className="flex gap-2 pb-2">
            {dates.map((date) => {
              const isSelected = isSameDay(date, selectedDate)
              const isDisabled =
                isWeekend(date) || isBefore(date, today)
              const isCurrentDay = isSameDay(date, today)

              return (
                <button
                  key={date.toISOString()}
                  onClick={() => !isDisabled && handleDateSelect(date)}
                  disabled={isDisabled}
                  className={cn(
                    'flex flex-col items-center gap-1 rounded-xl px-3 py-3 min-w-[4.5rem] transition-all duration-200',
                    'border text-center select-none',
                    'focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                    isSelected
                      ? 'bg-primary text-primary-foreground border-primary shadow-md scale-[1.02]'
                      : isDisabled
                        ? 'bg-muted/50 text-muted-foreground/40 border-transparent cursor-not-allowed'
                        : 'bg-card text-card-foreground border-border hover:border-primary/40 hover:bg-primary/5 cursor-pointer',
                    isCurrentDay && !isSelected && 'ring-1 ring-accent'
                  )}
                  aria-label={`Select ${format(date, 'EEEE, MMMM d, yyyy')}`}
                  aria-pressed={isSelected}
                >
                  <span
                    className={cn(
                      'text-[0.65rem] uppercase font-medium tracking-wide',
                      isSelected
                        ? 'text-primary-foreground/80'
                        : 'text-muted-foreground'
                    )}
                  >
                    {format(date, 'EEE')}
                  </span>
                  <span
                    className={cn(
                      'text-xl font-bold font-serif leading-none',
                      isSelected
                        ? 'text-primary-foreground'
                        : 'text-foreground'
                    )}
                  >
                    {format(date, 'd')}
                  </span>
                  <span
                    className={cn(
                      'text-[0.65rem] font-medium',
                      isSelected
                        ? 'text-primary-foreground/80'
                        : 'text-muted-foreground'
                    )}
                  >
                    {format(date, 'MMM')}
                  </span>
                </button>
              )
            })}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>

      {/* Time Slots Section */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="size-5 text-primary" />
            <h3 className="text-base font-semibold font-serif text-foreground">
              Available Times
            </h3>
          </div>
          {!isLoadingSlots && slots.length > 0 && (
            <Badge
              variant="secondary"
              className="bg-primary/10 text-primary border-primary/20"
            >
              {availableCount} {availableCount === 1 ? 'slot' : 'slots'} open
            </Badge>
          )}
        </div>

        <p className="text-sm text-muted-foreground -mt-1">
          {format(selectedDate, 'EEEE, MMMM d, yyyy')}
        </p>

        {isLoadingSlots ? (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-16 rounded-lg" />
            ))}
          </div>
        ) : slots.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/30 py-12 px-4 text-center">
            <CalendarDays className="size-10 text-muted-foreground/50 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">
              No slots available for this date
            </p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              {isWeekend(selectedDate)
                ? 'The office is closed on weekends.'
                : 'Please try another date.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
            {slots.map((slot) => {
              const isChosen = selectedSlot?.id === slot.id

              return (
                <button
                  key={slot.id}
                  onClick={() => handleSlotClick(slot)}
                  disabled={!slot.isAvailable}
                  className={cn(
                    'group relative flex flex-col items-center justify-center rounded-lg px-3 py-3 transition-all duration-200',
                    'border text-center select-none',
                    'focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                    isChosen
                      ? 'bg-accent text-accent-foreground border-accent shadow-md ring-2 ring-accent/30'
                      : slot.isAvailable
                        ? 'bg-card text-card-foreground border-border hover:border-primary/40 hover:bg-primary/5 hover:shadow-sm cursor-pointer'
                        : 'bg-muted/30 text-muted-foreground/40 border-transparent cursor-not-allowed line-through'
                  )}
                  aria-label={`Book ${slot.startTime} to ${slot.endTime}`}
                  aria-pressed={isChosen}
                  aria-disabled={!slot.isAvailable}
                >
                  <span
                    className={cn(
                      'text-sm font-semibold',
                      isChosen ? 'text-accent-foreground' : ''
                    )}
                  >
                    {slot.startTime}
                  </span>
                  <span
                    className={cn(
                      'text-xs mt-0.5',
                      isChosen
                        ? 'text-accent-foreground/70'
                        : slot.isAvailable
                          ? 'text-muted-foreground'
                          : 'text-muted-foreground/40'
                    )}
                  >
                    {slot.endTime}
                  </span>
                  {isChosen && (
                    <span className="absolute -top-1 -right-1 size-3 rounded-full bg-primary ring-2 ring-card" />
                  )}
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
