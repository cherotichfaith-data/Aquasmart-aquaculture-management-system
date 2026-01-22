-- Fix system_id type mismatch in ALL event tables
-- The code expects TEXT ("Cage 101"), but DB likely has INTEGER.

BEGIN;

-- 1. Stocking Events
ALTER TABLE public.stocking_events DROP CONSTRAINT IF EXISTS stocking_events_system_id_fkey;
ALTER TABLE public.stocking_events ALTER COLUMN system_id TYPE TEXT USING system_id::text;
ALTER TABLE public.stocking_events ADD CONSTRAINT stocking_events_system_id_fkey FOREIGN KEY (system_id) REFERENCES public.systems(system_id);

-- 2. Mortality Events
ALTER TABLE public.mortality_events DROP CONSTRAINT IF EXISTS mortality_events_system_id_fkey;
ALTER TABLE public.mortality_events ALTER COLUMN system_id TYPE TEXT USING system_id::text;
ALTER TABLE public.mortality_events ADD CONSTRAINT mortality_events_system_id_fkey FOREIGN KEY (system_id) REFERENCES public.systems(system_id);

-- 3. Feeding Events
ALTER TABLE public.feeding_events DROP CONSTRAINT IF EXISTS feeding_events_system_id_fkey;
ALTER TABLE public.feeding_events ALTER COLUMN system_id TYPE TEXT USING system_id::text;
ALTER TABLE public.feeding_events ADD CONSTRAINT feeding_events_system_id_fkey FOREIGN KEY (system_id) REFERENCES public.systems(system_id);

-- 4. Harvest Events
ALTER TABLE public.harvest_events DROP CONSTRAINT IF EXISTS harvest_events_system_id_fkey;
ALTER TABLE public.harvest_events ALTER COLUMN system_id TYPE TEXT USING system_id::text;
ALTER TABLE public.harvest_events ADD CONSTRAINT harvest_events_system_id_fkey FOREIGN KEY (system_id) REFERENCES public.systems(system_id);

-- 5. Sampling Events
ALTER TABLE public.sampling_events DROP CONSTRAINT IF EXISTS sampling_events_system_id_fkey;
ALTER TABLE public.sampling_events ALTER COLUMN system_id TYPE TEXT USING system_id::text;
ALTER TABLE public.sampling_events ADD CONSTRAINT sampling_events_system_id_fkey FOREIGN KEY (system_id) REFERENCES public.systems(system_id);

-- 6. Water Quality Events
ALTER TABLE public.water_quality_events DROP CONSTRAINT IF EXISTS water_quality_events_system_id_fkey;
ALTER TABLE public.water_quality_events ALTER COLUMN system_id TYPE TEXT USING system_id::text;
ALTER TABLE public.water_quality_events ADD CONSTRAINT water_quality_events_system_id_fkey FOREIGN KEY (system_id) REFERENCES public.systems(system_id);

-- 7. Transfer Events (Origin and Target)
ALTER TABLE public.transfer_events DROP CONSTRAINT IF EXISTS transfer_events_origin_system_id_fkey;
ALTER TABLE public.transfer_events DROP CONSTRAINT IF EXISTS transfer_events_target_system_id_fkey;
ALTER TABLE public.transfer_events ALTER COLUMN origin_system_id TYPE TEXT USING origin_system_id::text;
ALTER TABLE public.transfer_events ALTER COLUMN target_system_id TYPE TEXT USING target_system_id::text;
ALTER TABLE public.transfer_events ADD CONSTRAINT transfer_events_origin_system_id_fkey FOREIGN KEY (origin_system_id) REFERENCES public.systems(system_id);
ALTER TABLE public.transfer_events ADD CONSTRAINT transfer_events_target_system_id_fkey FOREIGN KEY (target_system_id) REFERENCES public.systems(system_id);

COMMIT;
