'use client'

import * as React from 'react'
import { Search, Loader2, CalendarCheck, Clock, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import type { AppointmentTracking, AppointmentStatus } from '@/lib/booking-types'
import { trackAppointment } from '@/app/actions'

const statusConfig: Record<
  AppointmentStatus,
  { label: string; className: string }
> = {
  PENDING: {
    label: 'Pending Review',
    className: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  APPROVED: {
    label: 'Approved',
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  REJECTED: {
    label: 'Declined',
    className: 'bg-red-50 text-red-700 border-red-200',
  },
}

export function TrackingCard() {
  const [trackingInput, setTrackingInput] = React.useState('')
  const [result, setResult] = React.useState<AppointmentTracking | null>(null)
  const [notFound, setNotFound] = React.useState(false)
  const [isSearching, setIsSearching] = React.useState(false)

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    const query = trackingInput.trim().toUpperCase()
    if (!query) return

    setIsSearching(true)
    setNotFound(false)
    setResult(null)

    // Server Action Call
    const { data: found, error } = await trackAppointment(query)

    if (found) {
      setResult(found)
    } else {
      setNotFound(true)
    }
    setIsSearching(false)
  }

  const config = result ? statusConfig[result.status] : null

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="flex-1">
          <Label htmlFor="tracking-id" className="sr-only">
            Tracking ID
          </Label>
          <Input
            id="tracking-id"
            placeholder="Enter your Tracking ID (e.g. A7F2X9)"
            value={trackingInput}
            onChange={(e) => {
              setTrackingInput(e.target.value.toUpperCase())
              setNotFound(false)
            }}
            className="font-mono uppercase tracking-wider"
          />
        </div>
        <Button
          type="submit"
          disabled={!trackingInput.trim() || isSearching}
          className="bg-primary text-primary-foreground hover:bg-primary/90"
        >
          {isSearching ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Search className="size-4" />
          )}
          <span className="sr-only sm:not-sr-only sm:ml-1">Track</span>
        </Button>
      </form>

      {/* Not Found */}
      {notFound && (
        <div className="flex items-center gap-3 rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3">
          <AlertCircle className="size-5 text-destructive shrink-0" />
          <div>
            <p className="text-sm font-medium text-foreground">
              No appointment found
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Please check your tracking ID and try again.
            </p>
          </div>
        </div>
      )}

      {/* Result Card */}
      {result && config && (
        <div className="rounded-xl border border-border bg-card p-4 flex flex-col gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="flex items-center justify-between">
            <span className="text-sm font-mono font-semibold text-primary tracking-wider">
              {result.trackingId}
            </span>
            <Badge variant="outline" className={config.className}>
              {config.label}
            </Badge>
          </div>

          <div className="flex flex-col gap-1.5">
            <p className="text-base font-semibold text-foreground">
              {result.visitorName}
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {result.reason}
            </p>
          </div>

          <div className="flex items-center gap-4 text-sm text-muted-foreground pt-1 border-t border-border">
            <div className="flex items-center gap-1.5">
              <CalendarCheck className="size-3.5" />
              <span>
                {new Date(result.appointmentDate).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="size-3.5" />
              <span>
                {result.startTime} - {result.endTime}
              </span>
            </div>
          </div>

          {result.status === 'APPROVED' && (
            <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2.5 text-xs text-emerald-700 leading-relaxed">
              Your appointment has been confirmed. A calendar invite has been sent to your email. Please arrive 5 minutes early.
            </div>
          )}

          {result.status === 'PENDING' && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2.5 text-xs text-amber-700 leading-relaxed">
              Your request is being reviewed by the administration. You will receive a notification once a decision is made.
            </div>
          )}

          {result.status === 'REJECTED' && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2.5 text-xs text-red-700 leading-relaxed">
              Unfortunately, your request could not be accommodated. Please feel free to submit a new request for a different date or time.
            </div>
          )}
        </div>
      )}
    </div>
  )
}
