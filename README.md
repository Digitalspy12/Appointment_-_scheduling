# PASS - Principal Appointment & Scheduling System

PASS is a digital gatekeeper designed to streamline administrative visits for educational institutions. It replaces manual walk-in queues and double-bookings with a frictionless, no-login portal for visitors, combined with an automated, conflict-free scheduling engine for the administration.

## Tech Stack
- **Framework:** Next.js 14+ (App Router)
- **UI:** React, Tailwind CSS, shadcn/ui
- **Database:** Supabase (PostgreSQL)
- **Integrations:** Google Calendar API

## Environment Variables
To run this project locally, you must create a `.env.local` file in the root directory and add the following keys. 

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Google Calendar Integration (Optional for local UI testing, required for full flow)
# The Service Account JSON is located in /crendential/agent-467403-58f8f124809b.json
GOOGLE_CALENDAR_ID=your_principal_google_calendar_id
```

## First Time Setup

1. **Install Dependencies:**
   ```bash
   npm install
   ```

2. **Supabase Database Setup:**
   Copy the contents of `supabase/schema.sql` and run them in your Supabase project's SQL Editor to create the necessary tables and RLS policies.

3. **Run the Development Server:**
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000` to view the visitor UI and `http://localhost:3000/admin` for the admin portal.
