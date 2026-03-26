/**
 * IST (Asia/Kolkata, UTC+5:30) timezone utilities.
 *
 * Purpose: Vercel servers run in UTC. Calling `new Date()` there gives UTC
 * time, which is 5 h 30 min behind IST. This causes two production bugs:
 *   1. `startOfDay(new Date())` resolves to the *previous* IST calendar day
 *      between 00:00–05:30 IST, so "today's" slots are hidden.
 *   2. `now.getHours()` / `now.getMinutes()` return UTC hours, marking IST
 *      slots as "past" up to 5.5 h earlier than they should be.
 *
 * Usage:
 *   import { nowInIST, todayStrIST, istHoursMinutes } from '@/lib/ist-date'
 */

const IST_TZ = 'Asia/Kolkata'

/**
 * Returns the current moment expressed as a plain JS Date whose local-time
 * methods (.getFullYear, .getMonth, .getDate, .getHours, .getMinutes …) all
 * reflect IST values — even when the JS runtime uses UTC as its system zone.
 *
 * Technique: Intl.DateTimeFormat gives us the IST wall-clock parts; we
 * reassemble them into a Date so every `.get*()` call works in IST.
 */
export function nowInIST(): Date {
    const now = new Date()
    // Get individual IST parts
    const fmt = new Intl.DateTimeFormat('en-CA', {
        timeZone: IST_TZ,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
    })
    const parts = fmt.formatToParts(now)
    const get = (type: string) => parts.find(p => p.type === type)?.value ?? '0'

    const year = parseInt(get('year'), 10)
    const month = parseInt(get('month'), 10) - 1  // JS months are 0-indexed
    const day = parseInt(get('day'), 10)
    let hour = parseInt(get('hour'), 10)
    const minute = parseInt(get('minute'), 10)
    const second = parseInt(get('second'), 10)

    // Intl hour12:false may return 24 for midnight; normalise to 0
    if (hour === 24) hour = 0

    // Construct a Date using UTC constructor so no host-TZ offset is applied,
    // but with the IST wall-clock values — making .get*() return IST values.
    return new Date(year, month, day, hour, minute, second)
}

/**
 * Returns today's date string in IST as 'yyyy-MM-dd'.
 * Safe to use on UTC servers.
 */
export function todayStrIST(): string {
    const now = new Date()
    return new Intl.DateTimeFormat('en-CA', {
        timeZone: IST_TZ,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).format(now) // en-CA locale gives 'yyyy-MM-dd' naturally
}

/**
 * Returns { hours, minutes } for the current IST wall-clock time.
 * Use instead of `now.getHours()` / `now.getMinutes()` on server.
 */
export function istHoursMinutes(): { hours: number; minutes: number } {
    const ist = nowInIST()
    return { hours: ist.getHours(), minutes: ist.getMinutes() }
}

/**
 * Returns the IST calendar date-string ('yyyy-MM-dd') for any Date object.
 * Useful when you have an arbitrary Date and need its IST date.
 */
export function toISTDateStr(date: Date): string {
    return new Intl.DateTimeFormat('en-CA', {
        timeZone: IST_TZ,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).format(date)
}
