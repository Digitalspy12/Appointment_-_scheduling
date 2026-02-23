'use client'

import * as React from 'react'
import { format, addDays, isBefore, startOfDay, parseISO } from 'date-fns'
import {
    CalendarDays,
    Clock,
    CheckCircle2,
    XCircle,
    AlertTriangle,
    ChevronLeft,
    ChevronRight,
    Shield,
    Loader2
} from 'lucide-react'
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { toast } from 'sonner'
import { getAdminAppointments, updateAppointmentStatus, createFullDayEmergencyBlock } from '../actions'

interface AdminDashboardClientProps {
    initialAppointments: any[]
    initialDate: string // YYYY-MM-DD
    initialEmergencyClosed: boolean
}

export default function AdminDashboardClient({
    initialAppointments,
    initialDate,
    initialEmergencyClosed
}: AdminDashboardClientProps) {
    const [selectedDate, setSelectedDate] = React.useState<string>(initialDate)
    const [appointments, setAppointments] = React.useState(initialAppointments)
    const [isEmergencyClosed, setIsEmergencyClosed] = React.useState(initialEmergencyClosed)
    const [loading, setLoading] = React.useState(false)

    // Fetch appointments when date changes
    React.useEffect(() => {
        let mounted = true
        if (selectedDate !== initialDate) {
            setLoading(true)
            getAdminAppointments(selectedDate).then((data) => {
                if (mounted) {
                    setAppointments(data)
                    // Also ideally need to refetch emergency status if dynamic per date
                    setLoading(false)
                }
            })
        }
        return () => { mounted = false }
    }, [selectedDate, initialDate])

    const handleDateScroll = (days: number) => {
        const newDate = addDays(parseISO(selectedDate), days)
        setSelectedDate(format(newDate, 'yyyy-MM-dd'))
    }

    const handleUpdateStatus = async (id: string, newStatus: 'APPROVED' | 'REJECTED') => {
        const toastId = toast.loading(`Marking appointment as ${newStatus.toLowerCase()}...`)

        // Optimistic UI update
        setAppointments(prev => prev.map(app =>
            app.id === id ? { ...app, status: newStatus } : app
        ))

        const result = await updateAppointmentStatus(id, newStatus)

        if (!result.success) {
            toast.error(result.error || 'Failed to update status', { id: toastId })
            // Revert optimistic update
            const freshData = await getAdminAppointments(selectedDate)
            setAppointments(freshData)
        } else {
            toast.success(`Appointment ${newStatus.toLowerCase()}`, { id: toastId })
        }
    }

    const handleApplyEmergencyBlock = async () => {
        const toastId = toast.loading('Applying emergency block...')
        const result = await createFullDayEmergencyBlock(selectedDate, 'Emergency Override by Admin')

        if (result.success) {
            setIsEmergencyClosed(true)
            toast.success('Office closed for the day. All pending appointments rejected.', { id: toastId })

            // Refetch appointments to show rejected statuses
            const freshData = await getAdminAppointments(selectedDate)
            setAppointments(freshData)
        } else {
            toast.error(result.error || 'Failed to close office', { id: toastId })
        }
    }

    const pendingAppointments = appointments.filter(a => a.status === 'PENDING')
    const approvedAppointments = appointments.filter(a => a.status === 'APPROVED')
    const rejectedAppointments = appointments.filter(a => a.status === 'REJECTED')

    const dateObject = parseISO(selectedDate)
    const displayDate = format(dateObject, 'EEEE, MMMM d, yyyy')
    const isPast = isBefore(startOfDay(dateObject), startOfDay(new Date()))

    return (
        <div className="grid gap-6 md:grid-cols-[1fr_300px]">
            <div className="flex flex-col gap-6">
                {/* Date Selector Header */}
                <div className="flex items-center justify-between p-4 bg-card rounded-xl border shadow-sm">
                    <div className="flex items-center gap-2">
                        <CalendarDays className="size-5 text-primary" />
                        <span className="font-semibold text-foreground text-lg">{displayDate}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="icon" onClick={() => handleDateScroll(-1)}>
                            <ChevronLeft className="size-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => setSelectedDate(format(startOfDay(new Date()), 'yyyy-MM-dd'))}>
                            Today
                        </Button>
                        <Button variant="outline" size="icon" onClick={() => handleDateScroll(1)}>
                            <ChevronRight className="size-4" />
                        </Button>
                    </div>
                </div>

                {/* Timeline View */}
                <Card className="border-border shadow-sm">
                    <CardHeader>
                        <CardTitle className="font-serif">Daily Schedule</CardTitle>
                        <CardDescription>Review and manage requested appointments for the day.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="flex justify-center p-8">
                                <Loader2 className="size-8 animate-spin text-primary" />
                            </div>
                        ) : appointments.length === 0 ? (
                            <div className="flex flex-col items-center justify-center p-12 text-center rounded-lg border border-dashed bg-muted/20">
                                <Clock className="size-10 text-muted-foreground/50 mb-3" />
                                <p className="font-medium text-foreground">No appointments</p>
                                <p className="text-sm text-muted-foreground mt-1">There are no bookings for this date yet.</p>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-4">
                                {appointments.map((app) => (
                                    <div key={app.id} className={`flex flex-col sm:flex-row gap-4 p-4 rounded-xl border \${app.status === 'PENDING' ? 'border-amber-200 bg-amber-50/30' : 'border-border bg-card'}`}>
                                        <div className="flex flex-col w-full sm:w-1/3 border-b sm:border-b-0 sm:border-r pb-3 sm:pb-0 sm:pr-4">
                                            <div className="flex items-center gap-2 font-mono text-sm font-semibold text-primary mb-1">
                                                <Clock className="size-4" />
                                                {app.start_time.substring(0, 5)} - {app.end_time.substring(0, 5)}
                                            </div>
                                            <Badge variant="outline" className={`w-fit mt-1 \${
                        app.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                        app.status === 'REJECTED' ? 'bg-red-50 text-red-700 border-red-200' :
                        'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                                                {app.status}
                                            </Badge>
                                            <span className="text-xs text-muted-foreground font-mono mt-2">ID: {app.tracking_id}</span>
                                        </div>

                                        <div className="flex flex-col flex-1 gap-2">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <p className="font-semibold text-foreground text-base tracking-tight">{app.visitor_name}</p>
                                                    <p className="text-sm text-muted-foreground break-all">{app.visitor_email} • {app.visitor_mobile}</p>
                                                </div>
                                            </div>
                                            <p className="text-sm text-foreground bg-muted/40 p-2 rounded-md border border-border mt-1">{app.reason}</p>

                                            {/* Action Buttons for Pending */}
                                            {app.status === 'PENDING' && !isPast && (
                                                <div className="flex items-center gap-2 mt-2 self-end">
                                                    <Button size="sm" variant="outline" className="border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800" onClick={() => handleUpdateStatus(app.id, 'REJECTED')}>
                                                        <XCircle className="size-4 mr-1.5" /> Reject
                                                    </Button>
                                                    <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => handleUpdateStatus(app.id, 'APPROVED')}>
                                                        <CheckCircle2 className="size-4 mr-1.5" /> Approve & Invite
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            <div className="flex flex-col gap-6">
                {/* Day Summary */}
                <Card className="border-border shadow-sm">
                    <CardHeader className="pb-4">
                        <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground">Snapshot</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="flex flex-col">
                                <span className="text-2xl font-bold font-serif text-foreground">{approvedAppointments.length}</span>
                                <span className="text-xs text-muted-foreground">Approved</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-2xl font-bold font-serif text-amber-600">{pendingAppointments.length}</span>
                                <span className="text-xs text-muted-foreground">Pending</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-2xl font-bold font-serif text-red-600">{rejectedAppointments.length}</span>
                                <span className="text-xs text-muted-foreground">Declined</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Global Actions */}
                <Card className="border-destructive/30 bg-destructive/5 shadow-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-destructive font-serif">
                            <AlertTriangle className="size-5" /> OVERRIDE
                        </CardTitle>
                        <CardDescription className="text-destructive/80">Manage sudden unavailability.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {isEmergencyClosed ? (
                            <div className="text-sm font-medium text-destructive bg-destructive/10 p-3 rounded-lg flex items-start gap-2 border border-destructive/20">
                                <Shield className="size-4 mt-0.5 shrink-0" />
                                Office is closed for this day. Visitors cannot book new slots.
                            </div>
                        ) : (
                            <Dialog>
                                <DialogTrigger asChild>
                                    <Button variant="destructive" className="w-full" disabled={isPast}>
                                        Close Office for the Day
                                    </Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>Emergency Closure</DialogTitle>
                                        <DialogDescription>
                                            Are you sure you want to close the office for {displayDate}? This will:
                                            <ul className="list-disc ml-5 mt-2 flex flex-col gap-1 text-sm text-muted-foreground">
                                                <li>Remove all available slots from the visitor calendar.</li>
                                                <li>Automatically reject all currently PENDING appointments.</li>
                                                <li><strong className="text-foreground">Note:</strong> You must manually cancel any APPROVED appointments via Google Calendar.</li>
                                            </ul>
                                        </DialogDescription>
                                    </DialogHeader>
                                    <DialogFooter className="mt-4">
                                        <Button variant="destructive" onClick={handleApplyEmergencyBlock}>
                                            Confirm Closure
                                        </Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                        )}
                    </CardContent>
                </Card>

            </div>
        </div>
    )
}
