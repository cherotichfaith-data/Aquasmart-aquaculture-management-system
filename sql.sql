-- Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'farm_manager', 'system_operator', 'data_analyst', 'viewer')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create policies (Profiles)
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Trigger to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (
    new.id, 
    new.email, 
    COALESCE(new.raw_user_meta_data->>'role', 'viewer')
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();


-- STOCKING EVENTS TABLE
CREATE TABLE IF NOT EXISTS public.stocking_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  system_id TEXT NOT NULL REFERENCES public.systems(system_id),
  stocking_date DATE NOT NULL,
  number_of_fish INTEGER NOT NULL,
  total_weight_kg NUMERIC NOT NULL,
  average_body_weight_g NUMERIC NOT NULL,
  source TEXT,
  created_by UUID DEFAULT auth.uid() REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS for Stocking Events
ALTER TABLE public.stocking_events ENABLE ROW LEVEL SECURITY;

-- Policies for Stocking Events
DROP POLICY IF EXISTS "Allow authenticated read access" ON public.stocking_events;
CREATE POLICY "Allow authenticated read access" ON public.stocking_events
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow staff to insert stocking events" ON public.stocking_events;
CREATE POLICY "Allow staff to insert stocking events" ON public.stocking_events
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'farm_manager', 'system_operator')
    )
  );

-- SEED MOCK DATA (Auth & Profiles)
-- ... (Previous Mock Data Block) ...

-- SYSTEMS TABLE
CREATE TABLE IF NOT EXISTS public.systems (
  system_id TEXT PRIMARY KEY,
  system_type public.system_type,
  growth_stage public.system_growth_stage,
  volume NUMERIC,
  width NUMERIC,
  length NUMERIC,
  depth NUMERIC,
  diameter NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.systems ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated read systems" ON public.systems FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow staff insert systems" ON public.systems FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'farm_manager')));

-- SUPPLIERS TABLE
CREATE TABLE IF NOT EXISTS public.suppliers (
  supplier_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  contact_info TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated read suppliers" ON public.suppliers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow staff insert suppliers" ON public.suppliers FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'farm_manager')));

-- FEEDS METADATA TABLE
CREATE TABLE IF NOT EXISTS public.feeds_metadata (
  feed_id TEXT PRIMARY KEY,
  brand TEXT,
  feed_name TEXT,
  pellet_size TEXT,
  manufacturing_location TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.feeds_metadata ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated read feeds_meta" ON public.feeds_metadata FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow staff insert feeds_meta" ON public.feeds_metadata FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'farm_manager')));

-- FINGERLINGS METADATA TABLE
CREATE TABLE IF NOT EXISTS public.fingerlings_metadata (
  fingerling_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  supplier_id UUID REFERENCES public.suppliers(supplier_id),
  brand TEXT,
  fingerling_name TEXT,
  manufacturing_location TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.fingerlings_metadata ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated read fingerlings" ON public.fingerlings_metadata FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow staff insert fingerlings" ON public.fingerlings_metadata FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'farm_manager')));


-- ==========================================
-- EVENT TABLES
-- ==========================================

-- MORTALITY EVENTS
CREATE TABLE IF NOT EXISTS public.mortality_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  system_id TEXT REFERENCES public.systems(system_id),
  date DATE NOT NULL,
  number_of_fish INTEGER,
  total_weight NUMERIC,
  average_body_weight NUMERIC,
  created_by UUID DEFAULT auth.uid() REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.mortality_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated read mortality" ON public.mortality_events FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow staff insert mortality" ON public.mortality_events FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'farm_manager', 'system_operator')));

-- FEEDING EVENTS
CREATE TABLE IF NOT EXISTS public.feeding_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  system_id TEXT REFERENCES public.systems(system_id),
  date DATE NOT NULL,
  amount NUMERIC,
  feed_id TEXT REFERENCES public.feeds_metadata(feed_id),
  feeding_response TEXT,
  created_by UUID DEFAULT auth.uid() REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.feeding_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated read feeding" ON public.feeding_events FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow staff insert feeding" ON public.feeding_events FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'farm_manager', 'system_operator')));

-- SAMPLING EVENTS
CREATE TABLE IF NOT EXISTS public.sampling_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  system_id TEXT REFERENCES public.systems(system_id),
  date DATE NOT NULL,
  number_of_samples INTEGER,
  total_weight NUMERIC,
  average_body_weight NUMERIC,
  created_by UUID DEFAULT auth.uid() REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.sampling_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated read sampling" ON public.sampling_events FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow staff insert sampling" ON public.sampling_events FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'farm_manager', 'system_operator', 'data_analyst')));

-- TRANSFER EVENTS
CREATE TABLE IF NOT EXISTS public.transfer_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  origin_system_id TEXT REFERENCES public.systems(system_id),
  target_system_id TEXT REFERENCES public.systems(system_id),
  date DATE NOT NULL,
  number_of_fish INTEGER,
  total_weight NUMERIC,
  average_body_weight NUMERIC,
  created_by UUID DEFAULT auth.uid() REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.transfer_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated read transfer" ON public.transfer_events FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow staff insert transfer" ON public.transfer_events FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'farm_manager', 'system_operator')));

-- HARVEST EVENTS
CREATE TABLE IF NOT EXISTS public.harvest_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  system_id TEXT REFERENCES public.systems(system_id),
  date DATE NOT NULL,
  number_of_fish INTEGER,
  total_weight NUMERIC,
  created_by UUID DEFAULT auth.uid() REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.harvest_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated read harvest" ON public.harvest_events FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow staff insert harvest" ON public.harvest_events FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'farm_manager', 'system_operator')));

-- WATER QUALITY EVENTS
CREATE TABLE IF NOT EXISTS public.water_quality_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  system_id TEXT REFERENCES public.systems(system_id),
  date DATE NOT NULL,
  dissolved_oxygen NUMERIC, -- Dissolved Oxygen
  total_ammonia NUMERIC,
  no2 NUMERIC,
  temperature NUMERIC,
  ph NUMERIC,
  no3 NUMERIC,
  secchi_disk NUMERIC,
  salinity NUMERIC,
  created_by UUID DEFAULT auth.uid() REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.water_quality_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated read water_quality" ON public.water_quality_events FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow staff insert water_quality" ON public.water_quality_events FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'farm_manager', 'system_operator', 'data_analyst')));

-- INCOMING FEED EVENTS
CREATE TABLE IF NOT EXISTS public.incoming_feed_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  feed_id TEXT REFERENCES public.feeds_metadata(feed_id),
  date_of_arrival DATE NOT NULL,
  amount NUMERIC,
  created_by UUID DEFAULT auth.uid() REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.incoming_feed_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated read incoming_feed" ON public.incoming_feed_events FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow staff insert incoming_feed" ON public.incoming_feed_events FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'farm_manager')));

-- Update system_type enum to support new specific types
ALTER TYPE public.system_type ADD VALUE IF NOT EXISTS 'rectangular_cage';
ALTER TYPE public.system_type ADD VALUE IF NOT EXISTS 'circular_cage';
ALTER TYPE public.system_type ADD VALUE IF NOT EXISTS 'pond';
ALTER TYPE public.system_type ADD VALUE IF NOT EXISTS 'tank';

