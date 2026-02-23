-- Create appointments table
CREATE TABLE IF NOT EXISTS public.appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tracking_id TEXT UNIQUE NOT NULL,
  visitor_name TEXT NOT NULL,
  visitor_email TEXT NOT NULL,
  visitor_mobile TEXT NOT NULL,
  reason TEXT NOT NULL,
  appointment_date DATE NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
  admin_notes TEXT,
  google_event_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create slot_settings table
CREATE TABLE IF NOT EXISTS public.slot_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  start_time TEXT NOT NULL DEFAULT '10:00',
  end_time TEXT NOT NULL DEFAULT '16:00',
  slot_duration_mins INTEGER NOT NULL DEFAULT 20,
  buffer_time_mins INTEGER NOT NULL DEFAULT 10,
  blocked_days INTEGER[] NOT NULL DEFAULT '{0,6}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create busy_blocks table
CREATE TABLE IF NOT EXISTS public.busy_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  block_date DATE,
  start_time TEXT,
  end_time TEXT,
  is_full_day BOOLEAN NOT NULL DEFAULT false,
  is_recurring BOOLEAN NOT NULL DEFAULT false,
  recurrence_days INTEGER[],
  label TEXT NOT NULL DEFAULT 'Busy',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
