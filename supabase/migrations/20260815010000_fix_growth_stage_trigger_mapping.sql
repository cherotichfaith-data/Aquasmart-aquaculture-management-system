-- Align the automatic post-sampling growth-stage update with the current
-- two-value `system_growth_stage` enum (`nursing` | `grow_out`).
-- The previous classifier still returned the legacy four-stage labels
-- (`fingerling`, `juvenile`, `sub_adult`, `broodstock`), which caused
-- sampling inserts to fail when the trigger cast those values back to the
-- enum on `public.system.growth_stage`.

CREATE OR REPLACE FUNCTION public.classify_growth_stage_tanganicae(p_abw_g numeric)
RETURNS public.system_growth_stage
LANGUAGE sql
IMMUTABLE
SET search_path TO 'pg_catalog', 'public'
AS $$
  SELECT CASE
    WHEN p_abw_g IS NULL THEN NULL
    WHEN p_abw_g < 20.0 THEN 'nursing'::public.system_growth_stage
    ELSE 'grow_out'::public.system_growth_stage
  END;
$$;

CREATE OR REPLACE FUNCTION public.trg_update_system_growth_stage()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $$
DECLARE
  v_abw_g numeric;
  v_new_stage public.system_growth_stage;
BEGIN
  v_abw_g := public.resolve_sampling_abw_g(
    NEW.abw::numeric,
    NEW.total_weight_sampling::numeric,
    NEW.number_of_fish_sampling::numeric
  );

  v_new_stage := public.classify_growth_stage_tanganicae(v_abw_g);

  IF v_new_stage IS NOT NULL THEN
    UPDATE public.system
    SET growth_stage = v_new_stage
    WHERE id = NEW.system_id;
  END IF;

  RETURN NEW;
END;
$$;
