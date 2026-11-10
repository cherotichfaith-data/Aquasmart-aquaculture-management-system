-- Use the Tailscale Tanganyika v2 main Richards curve and daily survival model.
-- The recorded series retains its existing weights, class boundaries, and counts.
do $migration$
declare
  definition text := pg_get_functiondef(
    'public.api_analytics_outlook(uuid,date,date,double precision,double precision,text,double precision,integer,integer,integer,text[])'::regprocedure
  );
begin
  if strpos(definition, 'ideal_monthly_stocking') > 0 then
    return;
  end if;
  if strpos(definition, $before$mort_pts as (select b.end_abw_g, b.expected_cum_mortality_pct as cum_pct from public.growth_cycle_benchmark b, params p where b.scenario = case when exists (select 1 from public.growth_cycle_benchmark configured where configured.scenario = p.scen) then p.scen else 'main' end),
surv as (
  select c.k,
         case when c.upper_g is null then 0::double precision else
           (1 - coalesce((select mp.cum_pct from mort_pts mp where mp.end_abw_g >= (select cv.abw from curve cv where cv.day = c.k * 30 + 15) order by mp.end_abw_g limit 1), (select max(mp.cum_pct) from mort_pts mp)) / 100.0)
           / nullif(1 - coalesce((select mp.cum_pct from mort_pts mp where mp.end_abw_g >= (select pabw from params) order by mp.end_abw_g limit 1), (select max(mp.cum_pct) from mort_pts mp)) / 100.0, 0)
         end as s
  from classes c
),
$before$) = 0 then
    raise exception 'Expected Stock Profile ideal model definition was not found';
  end if;
  definition := replace(definition, $before$mort_pts as (select b.end_abw_g, b.expected_cum_mortality_pct as cum_pct from public.growth_cycle_benchmark b, params p where b.scenario = case when exists (select 1 from public.growth_cycle_benchmark configured where configured.scenario = p.scen) then p.scen else 'main' end),
surv as (
  select c.k,
         case when c.upper_g is null then 0::double precision else
           (1 - coalesce((select mp.cum_pct from mort_pts mp where mp.end_abw_g >= (select cv.abw from curve cv where cv.day = c.k * 30 + 15) order by mp.end_abw_g limit 1), (select max(mp.cum_pct) from mort_pts mp)) / 100.0)
           / nullif(1 - coalesce((select mp.cum_pct from mort_pts mp where mp.end_abw_g >= (select pabw from params) order by mp.end_abw_g limit 1), (select max(mp.cum_pct) from mort_pts mp)) / 100.0, 0)
         end as s
  from classes c
),
$before$, $after$ideal_model as (
  select 125000::integer as monthly_stocking,
    array[0,5.9,14.8,31.5,59.1,99.1,152,215,286,361,436,509]::double precision[] as class_edges
),
weights as (
  select day, 988.6976065205532::double precision /
    power(1 + (power(988.6976065205532::double precision / 2, 0.0332827666481544) - 1)
      * exp(-0.0070570370267344::double precision * day), 1 / 0.0332827666481544::double precision) as abw
  from generate_series(0, 1094) day
), survivors as (
  select abw, (model.monthly_stocking / (365.25 / 12)) * exp(coalesce(sum(ln(case when abw < 30 then 0.998 else 0.999 end))
    over (order by day rows between unbounded preceding and 1 preceding), 0)) as fish
  from weights cross join ideal_model model where abw < 400
),
ideal_classes as (
  -- Use Tailscale's exact cutoffs when the displayed classes match. Custom
  -- class layouts use their own edges for both series.
  select c.k,
    case when layout.matches then model.class_edges[c.k + 1] else c.lower_g end as lower_g,
    case when layout.matches then model.class_edges[c.k + 2] else c.upper_g end as upper_g
  from classes c cross join ideal_model model
  cross join lateral (
    select array_agg(round(x.lower_g::numeric, case when x.lower_g >= 100 then 0 else 1 end)::double precision order by x.k)
      = model.class_edges as matches
    from classes x
  ) layout
),
ideal_counts as (
  select c.k, coalesce(sum(s.fish), 0)::double precision as fish
  from ideal_classes c left join survivors s on s.abw >= c.lower_g and (c.upper_g is null or s.abw < c.upper_g)
  group by c.k
),
$after$);
  if strpos(definition, $before$((select pfish from params) * coalesce(sv.s, 0))::double precision,$before$) = 0 then
    raise exception 'Expected Stock Profile ideal model definition was not found';
  end if;
  definition := replace(definition, $before$((select pfish from params) * coalesce(sv.s, 0))::double precision,$before$, $after$ideal.fish,$after$);
  if strpos(definition, $before$as cage_names
from classes c join surv sv on sv.k = c.k$before$) = 0 then
    raise exception 'Expected Stock Profile ideal model definition was not found';
  end if;
  definition := replace(definition, $before$as cage_names
from classes c join surv sv on sv.k = c.k$before$, $after$as cage_names,
       (select monthly_stocking from ideal_model) as ideal_monthly_stocking
from classes c join ideal_counts ideal on ideal.k = c.k$after$);
  if strpos(definition, $before$as x(class_no, abw_from_g, abw_to_g, ideal_fish, recorded_fish, recorded_cages, cage_names)$before$) = 0 then
    raise exception 'Expected Stock Profile ideal model definition was not found';
  end if;
  definition := replace(definition, $before$as x(class_no, abw_from_g, abw_to_g, ideal_fish, recorded_fish, recorded_cages, cage_names)$before$, $after$as x(class_no, abw_from_g, abw_to_g, ideal_fish, recorded_fish, recorded_cages, cage_names, ideal_monthly_stocking)$after$);
  execute definition;
end;
$migration$;
