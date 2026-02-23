-- Create custom types for status
CREATE TYPE appointment_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- Table: principal_setting (controls available hours)
CREATE TABLE IF NOT EXISTS public.principal_setting (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sun, 1=Mon...
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    slot_duration_mins INT NOT NULL DEFAULT 20,
    buffer_time_mins INT NOT NULL DEFAULT 10,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(day_of_week)
);

-- Table: busy_block (for custom blocks and full day emergencies)
CREATE TABLE IF NOT EXISTS public.busy_block (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    block_date DATE NOT NULL,
    start_time TIME, -- Nullable if full day
    end_time TIME, -- Nullable if full day
    is_full_day_emergency BOOLEAN NOT NULL DEFAULT FALSE,
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: appointment
CREATE TABLE IF NOT EXISTS public.appointment (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tracking_id VARCHAR(6) UNIQUE NOT NULL,
    visitor_name VARCHAR(100) NOT NULL,
    visitor_email VARCHAR(255) NOT NULL,
    visitor_mobile VARCHAR(20) NOT NULL,
    reason TEXT NOT NULL,
    appointment_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    status appointment_status DEFAULT 'PENDING',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Prevent double bookings for approved appointments using a unique constraint
CREATE UNIQUE INDEX idx_appointment_approved_slot 
ON public.appointment (appointment_date, start_time) 
WHERE status = 'APPROVED';

-- RLS (Row Level Security) Setup
ALTER TABLE public.principal_setting ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.busy_block ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointment ENABLE ROW LEVEL SECURITY;

-- Allow public read access to settings and blocks so Next.js can calculate slots
CREATE POLICY "Public read access to principal_setting" ON public.principal_setting FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public read access to busy_block" ON public.busy_block FOR SELECT TO anon, authenticated USING (true);

-- Allow public insert to appointments and read by tracking_id
CREATE POLICY "Public insert access to appointment" ON public.appointment FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Public read access by tracking_id" ON public.appointment FOR SELECT TO anon, authenticated USING (true); -- Client should ideally only filter by id, but server will enforce it.

-- Admins (authenticated users) can do everything
CREATE POLICY "Admin full access setting" ON public.principal_setting FOR ALL TO authenticated USING (true);
CREATE POLICY "Admin full access block" ON public.busy_block FOR ALL TO authenticated USING (true);
CREATE POLICY "Admin full access appointment" ON public.appointment FOR ALL TO authenticated USING (true);

-- Insert default dummy week settings for Mon-Fri 10AM to 4PM
INSERT INTO public.principal_setting (day_of_week, start_time, end_time, slot_duration_mins, buffer_time_mins) VALUES
(1, '10:00:00', '16:00:00', 20, 10),
(2, '10:00:00', '16:00:00', 20, 10),
(3, '10:00:00', '16:00:00', 20, 10),
(4, '10:00:00', '16:00:00', 20, 10),
(5, '10:00:00', '16:00:00', 20, 10)
ON CONFLICT (day_of_week) DO NOTHING;
