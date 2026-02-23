'use client'

import * as React from 'react'
import { CalendarDays, Search, GraduationCap, Shield } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { BookingCalendar } from '@/components/booking-calendar'
import { BookingDialog } from '@/components/booking-dialog'
import { TrackingCard } from '@/components/tracking-card'
import type { TimeSlot, BookingResult } from '@/lib/booking-types'

export default function BookingPage() {
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [selectedDate, setSelectedDate] = React.useState<Date | null>(null)
  const [selectedSlot, setSelectedSlot] = React.useState<TimeSlot | null>(null)

  const handleSlotSelect = (date: Date, slot: TimeSlot) => {
    setSelectedDate(date)
    setSelectedSlot(slot)
    setDialogOpen(true)
  }

  const handleBookingComplete = (result: BookingResult) => {
    // In a real app, we would update the slot availability
    // via SWR mutation or revalidation
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="mx-auto max-w-3xl px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center size-9 rounded-lg bg-primary text-primary-foreground">
              <GraduationCap className="size-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold font-serif text-foreground leading-none">
                PASS
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                Appointment Scheduling
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Shield className="size-3.5" />
            <span>Secure Booking</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-3xl px-4 py-6 pb-24">
        {/* Hero Section */}
        <section className="mb-8">
          <h2 className="text-2xl font-bold font-serif text-foreground sm:text-3xl text-balance">
            Schedule Your Visit with the Principal
          </h2>
          <p className="text-muted-foreground mt-2 text-sm leading-relaxed max-w-lg">
            Book an appointment in seconds. No account required. Select a date, choose an available time, and fill out a quick form.
          </p>
        </section>

        {/* Tabs: Book / Track */}
        <Tabs defaultValue="book" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="book" className="gap-2">
              <CalendarDays className="size-4" />
              Book Appointment
            </TabsTrigger>
            <TabsTrigger value="track" className="gap-2">
              <Search className="size-4" />
              Track Status
            </TabsTrigger>
          </TabsList>

          <TabsContent value="book" className="mt-0">
            <Card className="border-border shadow-sm">
              <CardHeader>
                <CardTitle className="font-serif text-lg">
                  Pick a Date & Time
                </CardTitle>
                <CardDescription>
                  Available slots are shown for weekdays only. The office is closed on weekends.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <BookingCalendar onSlotSelect={handleSlotSelect} />
              </CardContent>
            </Card>

            {/* Info Cards */}
            <div className="grid grid-cols-1 gap-3 mt-6 sm:grid-cols-3">
              <div className="flex items-start gap-3 rounded-lg bg-card border border-border p-4">
                <div className="flex items-center justify-center size-8 rounded-md bg-primary/10 shrink-0">
                  <CalendarDays className="size-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    20-min slots
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Each appointment is 20 minutes with buffer time between.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-lg bg-card border border-border p-4">
                <div className="flex items-center justify-center size-8 rounded-md bg-accent/30 shrink-0">
                  <Shield className="size-4 text-accent-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    No sign-up
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    No account needed. Get a tracking ID instantly.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-lg bg-card border border-border p-4">
                <div className="flex items-center justify-center size-8 rounded-md bg-emerald-100 shrink-0">
                  <GraduationCap className="size-4 text-emerald-700" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Quick confirm
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Receive a calendar invite upon approval via email.
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="track" className="mt-0">
            <Card className="border-border shadow-sm">
              <CardHeader>
                <CardTitle className="font-serif text-lg">
                  Track Your Appointment
                </CardTitle>
                <CardDescription>
                  Enter the tracking ID you received after booking to check your appointment status.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <TrackingCard />
              </CardContent>
            </Card>


          </TabsContent>
        </Tabs>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-card/50 py-4">
        <div className="mx-auto max-w-3xl px-4 flex items-center justify-between text-xs text-muted-foreground">
          <span>PASS - Principal Appointment & Scheduling System</span>
          <span>Built for Educational Institutions</span>
        </div>
      </footer>

      {/* Booking Dialog */}
      <BookingDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        selectedDate={selectedDate}
        selectedSlot={selectedSlot}
        onBookingComplete={handleBookingComplete}
      />
    </div>
  )
}
