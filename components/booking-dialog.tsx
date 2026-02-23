'use client'

import * as React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { format } from 'date-fns'
import {
  User,
  Mail,
  Phone,
  MessageSquare,
  CalendarCheck,
  Clock,
  Loader2,
  CheckCircle2,
  Copy,
  ArrowLeft,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { TimeSlot, BookingResult } from '@/lib/booking-types'
import { createBooking } from '@/app/actions'

// Zod schema for form validation
const bookingSchema = z.object({
  visitorName: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name cannot exceed 100 characters')
    .regex(/^[a-zA-Z\s.'-]+$/, 'Name contains invalid characters'),
  visitorEmail: z
    .string()
    .email('Please enter a valid email address'),
  visitorMobile: z
    .string()
    .min(10, 'Phone number must be at least 10 digits')
    .max(15, 'Phone number cannot exceed 15 digits')
    .regex(/^[+]?[\d\s()-]+$/, 'Please enter a valid phone number'),
  reason: z
    .string()
    .min(10, 'Please describe the reason in at least 10 characters')
    .max(500, 'Reason cannot exceed 500 characters'),
})

type BookingFormValues = z.infer<typeof bookingSchema>

interface BookingDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedDate: Date | null
  selectedSlot: TimeSlot | null
  onBookingComplete: (result: BookingResult) => void
}



type DialogView = 'form' | 'submitting' | 'success'

export function BookingDialog({
  open,
  onOpenChange,
  selectedDate,
  selectedSlot,
  onBookingComplete,
}: BookingDialogProps) {
  const [view, setView] = React.useState<DialogView>('form')
  const [trackingId, setTrackingId] = React.useState('')

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    reset,
  } = useForm<BookingFormValues>({
    resolver: zodResolver(bookingSchema),
    mode: 'onChange',
    defaultValues: {
      visitorName: '',
      visitorEmail: '',
      visitorMobile: '',
      reason: '',
    },
  })

  // Reset state when dialog opens/closes
  React.useEffect(() => {
    if (!open) {
      // Delay reset to prevent flicker during close animation
      const timer = setTimeout(() => {
        setView('form')
        reset()
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [open, reset])

  const onSubmit = async (data: BookingFormValues) => {
    setView('submitting')

    // Call Server Action
    const result = await createBooking({
      visitorName: data.visitorName,
      visitorEmail: data.visitorEmail,
      visitorMobile: data.visitorMobile,
      reason: data.reason,
      appointmentDate: selectedDate!.toISOString(),
      startTime: selectedSlot!.startTime,
      endTime: selectedSlot!.endTime
    })

    if (result.success && result.trackingId) {
      setTrackingId(result.trackingId)
      setView('success')
    } else {
      toast.error(result.error || 'Failed to submit request')
      setView('form') // go back so they can try again
    }

    onBookingComplete(result)
  }

  const handleCopyTrackingId = () => {
    navigator.clipboard.writeText(trackingId).then(() => {
      toast.success('Tracking ID copied to clipboard')
    }).catch(() => {
      toast.error('Failed to copy. Please note it down manually.')
    })
  }

  if (!selectedDate || !selectedSlot) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        {/* Form View */}
        {view === 'form' && (
          <>
            <DialogHeader>
              <DialogTitle className="font-serif text-xl">
                Book Your Appointment
              </DialogTitle>
              <DialogDescription>
                Complete the form below to request your meeting.
              </DialogDescription>
            </DialogHeader>

            {/* Date & Time Summary */}
            <div className="flex items-center gap-3 rounded-lg bg-primary/5 border border-primary/10 px-4 py-3">
              <div className="flex items-center gap-2 text-sm">
                <CalendarCheck className="size-4 text-primary" />
                <span className="font-medium text-foreground">
                  {format(selectedDate, 'MMM d, yyyy')}
                </span>
              </div>
              <span className="text-border">|</span>
              <div className="flex items-center gap-2 text-sm">
                <Clock className="size-4 text-primary" />
                <span className="font-medium text-foreground">
                  {selectedSlot.startTime} - {selectedSlot.endTime}
                </span>
              </div>
            </div>

            <form
              onSubmit={handleSubmit(onSubmit)}
              className="flex flex-col gap-4"
              noValidate
            >
              {/* Name Field */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="visitorName" className="text-sm font-medium">
                  <User className="size-3.5" />
                  Full Name
                </Label>
                <Input
                  id="visitorName"
                  placeholder="John Doe"
                  aria-invalid={!!errors.visitorName}
                  {...register('visitorName')}
                />
                {errors.visitorName && (
                  <p className="text-xs text-destructive" role="alert">
                    {errors.visitorName.message}
                  </p>
                )}
              </div>

              {/* Email Field */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="visitorEmail" className="text-sm font-medium">
                  <Mail className="size-3.5" />
                  Email Address
                </Label>
                <Input
                  id="visitorEmail"
                  type="email"
                  placeholder="john@example.com"
                  aria-invalid={!!errors.visitorEmail}
                  {...register('visitorEmail')}
                />
                {errors.visitorEmail && (
                  <p className="text-xs text-destructive" role="alert">
                    {errors.visitorEmail.message}
                  </p>
                )}
              </div>

              {/* Phone Field */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="visitorMobile" className="text-sm font-medium">
                  <Phone className="size-3.5" />
                  Mobile Number
                </Label>
                <Input
                  id="visitorMobile"
                  type="tel"
                  placeholder="+1 (555) 000-0000"
                  aria-invalid={!!errors.visitorMobile}
                  {...register('visitorMobile')}
                />
                {errors.visitorMobile && (
                  <p className="text-xs text-destructive" role="alert">
                    {errors.visitorMobile.message}
                  </p>
                )}
              </div>

              {/* Reason Field */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="reason" className="text-sm font-medium">
                  <MessageSquare className="size-3.5" />
                  Reason for Visit
                </Label>
                <Textarea
                  id="reason"
                  placeholder="Briefly describe the purpose of your visit..."
                  className="min-h-20 resize-none"
                  aria-invalid={!!errors.reason}
                  {...register('reason')}
                />
                {errors.reason && (
                  <p className="text-xs text-destructive" role="alert">
                    {errors.reason.message}
                  </p>
                )}
              </div>

              <DialogFooter className="mt-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => onOpenChange(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  Submit Request
                </Button>
              </DialogFooter>
            </form>
          </>
        )}

        {/* Submitting View */}
        {view === 'submitting' && (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <div className="relative">
              <div className="size-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Loader2 className="size-8 text-primary animate-spin" />
              </div>
            </div>
            <div className="text-center">
              <h3 className="text-lg font-semibold font-serif text-foreground">
                Submitting your request...
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Please wait while we process your booking.
              </p>
            </div>
          </div>
        )}

        {/* Success View */}
        {view === 'success' && (
          <div className="flex flex-col items-center justify-center py-8 gap-5">
            <div className="size-16 rounded-full bg-emerald-50 flex items-center justify-center">
              <CheckCircle2 className="size-9 text-emerald-600" />
            </div>

            <div className="text-center">
              <h3 className="text-xl font-bold font-serif text-foreground">
                Request Submitted!
              </h3>
              <p className="text-sm text-muted-foreground mt-1.5 max-w-xs leading-relaxed">
                Your appointment request has been sent. Use the tracking ID below to check your status.
              </p>
            </div>

            {/* Tracking ID Card */}
            <div className="w-full rounded-xl bg-primary/5 border border-primary/15 p-4 flex flex-col items-center gap-3">
              <span className="text-xs uppercase tracking-wider font-medium text-muted-foreground">
                Your Tracking ID
              </span>
              <div className="flex items-center gap-3">
                <span className="text-2xl font-bold font-mono tracking-widest text-primary">
                  {trackingId}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={handleCopyTrackingId}
                  aria-label="Copy tracking ID"
                  className="text-primary hover:bg-primary/10"
                >
                  <Copy className="size-4" />
                </Button>
              </div>

              {/* Appointment Summary */}
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <CalendarCheck className="size-3.5" />
                  <span>{format(selectedDate, 'MMM d')}</span>
                </div>
                <span className="text-border">|</span>
                <div className="flex items-center gap-1.5">
                  <Clock className="size-3.5" />
                  <span>{selectedSlot.startTime}</span>
                </div>
                <Badge
                  variant="secondary"
                  className="bg-amber-50 text-amber-700 border-amber-200"
                >
                  Pending
                </Badge>
              </div>
            </div>

            <DialogFooter className="w-full">
              <Button
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                onClick={() => onOpenChange(false)}
              >
                Done
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
