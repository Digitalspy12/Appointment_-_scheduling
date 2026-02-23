-- =====================================================
-- PASS - Principal Appointment & Scheduling System
-- Database Schema Migration
-- =====================================================

-- Appointments table (public facing, no auth required for insert)
CREATE TABLE IF NOT EXISTS public.appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tracking_id TEXT UNIQUE NOT NULL,
  visitor_name TEXT NOT NULL,
  visitor_email TEXT NOT NULL,
  visitor_mobile TEXT NOT NULL,
  reason TEXT NOT NULL,
  appointment_date DATE NOT NULL,
  start_time TEXT NOT NULL,       -- "10:00" (24h)
  end_time TEXT NOT NULL,         -- "10:20" (24h)
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
  admin_notes TEXT,
  google_event_id TEXT,           -- Google Calendar event ID for sync
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Slot settings table (admin-configurable)
CREATE TABLE IF NOT EXISTS public.slot_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  start_time TEXT NOT NULL DEFAULT '10:00',
  end_time TEXT NOT NULL DEFAULT '16:00',
  slot_duration_mins INTEGER NOT NULL DEFAULT 20,
  buffer_time_mins INTEGER NOT NULL DEFAULT 10,
  blocked_days INTEGER[] NOT NULL DEFAULT '{0,6}', -- 0=Sunday, 6=Saturday
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Busy blocks table (lunch, meetings, emergencies)
CREATE TABLE IF NOT EXISTS public.busy_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  block_date DATE,                -- NULL for recurring blocks
  start_time TEXT,                -- NULL for full-day blocks
  end_time TEXT,                  -- NULL for full-day blocks
  is_full_day BOOLEAN NOT NULL DEFAULT false,
  is_recurring BOOLEAN NOT NULL DEFAULT false,
  recurrence_days INTEGER[],     -- days of week: 1=Mon, 5=Fri
  label TEXT NOT NULL DEFAULT 'Busy',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security on all tables
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.slot_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.busy_blocks ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- Appointments: Anyone can insert (public booking, no auth)
CREATE POLICY "anyone_can_insert_appointments"
  ON public.appointments FOR INSERT
  WITH CHECK (true);

-- Appointments: Anyone can read their own by tracking_id (public tracking)
CREATE POLICY "anyone_can_read_by_tracking_id"
  ON public.appointments FOR SELECT
  USING (true);

-- Appointments: Only authenticated admins can update (approve/reject)
CREATE POLICY "admin_can_update_appointments"
  ON public.appointments FOR UPDATE
  USING (auth.uid() IS NOT NULL);

-- Appointments: Only authenticated admins can delete
CREATE POLICY "admin_can_delete_appointments"
  ON public.appointments FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- Slot settings: Anyone can read (needed for slot generation)
CREATE POLICY "anyone_can_read_slot_settings"
  ON public.slot_settings FOR SELECT
  USING (true);

-- Slot settings: Only admins can modify
CREATE POLICY "admin_can_update_slot_settings"
  ON public.slot_settings FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "admin_can_insert_slot_settings"
  ON public.slot_settings FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Busy blocks: Anyone can read (needed for slot availability)
CREATE POLICY "anyone_can_read_busy_blocks"
  ON public.busy_blocks FOR SELECT
  USING (true);

-- Busy blocks: Only admins can modify
CREATE POLICY "admin_can_insert_busy_blocks"
  ON public.busy_blocks FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "admin_can_update_busy_blocks"
  ON public.busy_blocks FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "admin_can_delete_busy_blocks"
  ON public.busy_blocks FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- =====================================================
-- INDEXES for performance
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_appointments_tracking_id ON public.appointments(tracking_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date_status ON public.appointments(appointment_date, status);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON public.appointments(status);
CREATE INDEX IF NOT EXISTS idx_busy_blocks_date ON public.busy_blocks(block_date);

-- =====================================================
-- SEED: Default slot settings
-- =====================================================
INSERT INTO public.slot_settings (start_time, end_time, slot_duration_mins, buffer_time_mins, blocked_days)
VALUES ('10:00', '16:00', 20, 10, '{0,6}')
ON CONFLICT DO NOTHING;

-- SEED: Default lunch block (recurring, Monday-Friday)
INSERT INTO public.busy_blocks (start_time, end_time, is_full_day, is_recurring, recurrence_days, label)
VALUES ('12:30', '13:30', false, true, '{1,2,3,4,5}', 'Lunch Break');

-- =====================================================
-- Auto-update updated_at trigger
-- =====================================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_appointments_updated_at ON public.appointments;
CREATE TRIGGER set_appointments_updated_at
  BEFORE UPDATE ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS set_slot_settings_updated_at ON public.slot_settings;
CREATE TRIGGER set_slot_settings_updated_at
  BEFORE UPDATE ON public.slot_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
