# Product Requirements Document (PRD)

**Project Name:** Principal Appointment & Scheduling System (PASS)  
**Target Market:** Educational Institutions (B2B SaaS)  
**Tech Stack:** Next.js 14+ (App Router), React, Supabase (PostgreSQL), Tailwind CSS, shadcn/ui (via v0), Google Calendar API  

---

## 1. Executive Summary
The Principal Appointment & Scheduling System (PASS) is a premium digital gatekeeper designed to streamline administrative visits for educational institutions. It replaces manual walk-in queues and double-bookings with a frictionless, no-login portal for visitors, combined with an automated, conflict-free scheduling engine for the administration. 

---

## 2. Target Audience & Roles
1. **Visitor (Student / Parent):** Unauthenticated public user. Needs a lightning-fast, mobile-first UI to view available slots, submit a booking request without creating an account, and track their request status using a unique ID.
2. **Administrator (Principal / Office Assistant):** Authenticated user. Needs a secure, real-time dashboard to view daily schedules, approve/reject pending requests, and manage emergency block-outs.

---

## 3. System Architecture

The application is a modern Single Page Application (SPA) utilizing Next.js App Router. It uses Server Actions for seamless frontend-to-backend communication, Supabase for real-time database capabilities and high-concurrency handling, and the Google Calendar API for zero-cost automated notifications.

```mermaid
graph TD
    subgraph Frontend ["Client Layer (Next.js / React)"]
        UI_Home[Visitor Booking UI] -->|Next.js Server Action| Server_Logic
        UI_Dash[Admin Dashboard] -->|Next.js Server Action| Server_Logic
    end

    subgraph Backend ["Server Layer (Next.js API)"]
        Server_Logic[Buffer Math & Validator] -->|Supabase Client| DB[(Supabase PostgreSQL)]
    end

    subgraph Integrations ["External APIs"]
        Server_Logic -->|On 'APPROVED'| GCal[Google Calendar API]
        GCal -->|Auto-Invite| Email[Visitor Inbox]
    end

    4. Core Features & Business Logic
Feature 1: Dynamic Slot Generation & Buffer Math
Requirement: The system must generate available time slots dynamically based on the Principal's daily settings.

Logic: Next_Slot_Start = Previous_Slot_Start + Slot_Duration + Buffer_Time.

Example: Start is 10:00 AM, duration is 20m, buffer is 10m:

Slot 1: 10:00 AM - 10:20 AM

Buffer: 10:20 AM - 10:30 AM (Invisible to user)

Slot 2: 10:30 AM - 10:50 AM

Feature 2: Frictionless Visitor Booking (No-Login)
Requirement: Visitors do not create accounts or manage passwords.

Flow: Select Date -> Select Available Time -> Fill Form (Name, Mobile, Email, Reason) -> Submit.

Tracking ID: Upon submission, generate a unique 6-character alphanumeric string (e.g., SARHAD-A7F2) for status tracking.

Feature 3: Concurrency & Double-Booking Prevention
Requirement: Two users looking at the same time slot cannot both book it.

Logic: Supabase (PostgreSQL) must enforce a unique constraint on (appointment_date, start_time, status='APPROVED'). Next.js Server Actions will handle the database error gracefully and prompt the second user to pick another time.

Feature 4: Admin Dashboard, Time Blocking & Emergency Closure
Requirement: The Principal must be able to approve/reject meetings, block specific hours, and handle sudden full-day unavailability.

Approval Flow: Changing status from PENDING to APPROVED triggers the Google Calendar API.

Time Blocking (Specific Hours): Create a BusyBlock (e.g., 12:00 PM to 2:00 PM). The Server Action will filter out any generated slots falling in this window. Overlapping PENDING appointments are auto-rejected.

Emergency Closure (Full Day): A global override to close the office for the entire current day. Cancels the day, auto-rejects pending requests, and notifies affected visitors.

Feature 5: Google Calendar Notification Engine
Requirement: Zero-cost automated email and calendar invites.

Logic: When an appointment is marked APPROVED, a Next.js backend utility uses a Google Service Account (.json) and the googleapis npm package to create an event on the Principal's Google Calendar.

Key Payload: Add the visitor's email to the attendees array with sendUpdates='all' to force Google to dispatch the confirmation email.

5. Database Schema (Supabase / PostgreSQL)
Code snippet
erDiagram
    PRINCIPAL_SETTING ||--o{ APPOINTMENT : "governs daily rules"
    PRINCIPAL_SETTING {
        uuid id PK
        string day_of_week
        time start_time
        time end_time
        int slot_duration_mins
        int buffer_time_mins
    }
    
    BUSY_BLOCK {
        uuid id PK
        date block_date
        time start_time "Nullable if full day"
        time end_time "Nullable if full day"
        boolean is_full_day_emergency
        string reason
    }

    APPOINTMENT {
        uuid id PK
        string tracking_id "Unique 6-char"
        string visitor_name
        string visitor_email
        string visitor_mobile
        string reason
        date appointment_date
        time start_time
        time end_time
        string status "PENDING, APPROVED, REJECTED"
        timestamptz created_at
    }
Note for AI Developer: We are not storing physical Slot records to prevent database bloat. Slots are calculated on-the-fly in Next.js Server Actions by comparing the PRINCIPAL_SETTING against the APPOINTMENT and BUSY_BLOCK tables.

6. UI/UX Specifications
Design System: Tailwind CSS and shadcn/ui.

Styling Vibe: Premium SaaS, minimalist, highly responsive, institutional trust.

Color Palette: * Primary: Royal Blue (bg-blue-800)

Accent: Golden Yellow (bg-yellow-500)

Background: Off-White (bg-slate-50)

Key Components (to generate via v0):

BookingCalendar: Horizontal date picker with a responsive grid of "Time Chips".

BookingDialog: shadcn/ui Modal containing the form (Name, Email, Phone, Reason).

TrackingCard: UI for users to enter their ID and view a status badge.

AdminTimeline: Dashboard view showing a vertical timeline of the day's appointments and the Emergency Closure toggle.

7. Step-by-Step Implementation Plan (For AI)
Phase 1: Project Initialization & Supabase Setup

Run npx create-next-app@latest pass-system.

Install Supabase client: npm install @supabase/supabase-js.

Execute SQL in Supabase SQL Editor to create the tables (principal_setting, busy_block, appointment).

Phase 2: UI Generation (v0 & shadcn/ui)

Initialize shadcn/ui: npx shadcn-ui@latest init.

Build the frontend components (Calendar, Time Chips, Modals) using Tailwind CSS.

Phase 3: Core Logic (Next.js Server Actions)

Write actions.ts to include the getAvailableSlots(date) function.

Implement the Buffer Math logic, ensuring it subtracts times found in the APPOINTMENT and BUSY_BLOCK tables.

Phase 4: Integrations

Install googleapis: npm install googleapis.

Create a secure server utility to handle the Google Calendar event creation when an appointment is updated to APPROVED in the Supabase dashboard.