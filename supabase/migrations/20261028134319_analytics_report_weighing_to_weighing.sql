-- Analytics report: measure growth and eFCR from weighing to weighing, and include combined cohorts.
--
-- 1. analytics.production_summary has an estimated 'current' row per cage (today's weight extended from the last
--    two readings). Right after fish are added to a cage that trend can run downward (G1E: 49.6 g on 23 Oct ->
--    36.7 g on 27 Oct), which turned the May cohort's eFCR from 1.80 into 2.59. The report now reads the last
--    real weighing on or before the period end (and before the period start for the opening value), so growth and
--    feed always cover the same weighings. The dashboard is unchanged.
-- 2. A combined cohort (is_mixed batch, e.g. 05.26aK) is one continuous cohort from its first stocking, so its
--    growth and eFCR are no longer blanked.
--
-- Patches the current api_analytics_performance definition in place; each replacement is asserted so the migration
-- fails loudly if the function has changed shape.
do $mig$
declare
  def text;
  new text;
  step text;
begin
  select pg_get_functiondef(p.oid) into def
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = 'api_analytics_performance';
  if def is null then raise exception 'api_analytics_performance not found'; end if;
  new := def;

  step := new;
  new := replace(new, 'where x.date <= bd.e order by x.cycle_id, x.date desc) e', 'where x.date <= bd.e and x.activity <> ''current'' order by x.cycle_id, x.date desc) e');
  if new = step then raise exception 'anchor not found: ps end snapshot'; end if;

  step := new;
  new := replace(new, 'where x.date < bd.s order by x.cycle_id, x.date desc) s on s.cycle_id = e.cycle_id', 'where x.date < bd.s and x.activity <> ''current'' order by x.cycle_id, x.date desc) s on s.cycle_id = e.cycle_id');
  if new = step then raise exception 'anchor not found: ps start snapshot'; end if;

  step := new;
  new := replace(new, 'where pc.batch_id = b.batch_id and x.date <= (select e from pb) order by x.cycle_id, x.date desc) l)', 'where pc.batch_id = b.batch_id and x.date <= (select e from pb) and x.activity <> ''current'' order by x.cycle_id, x.date desc) l)');
  if new = step then raise exception 'anchor not found: growth chart snapshot'; end if;

  step := new;
  new := regexp_replace(new, 'case when exists\(select 1 from public\.fingerling_batch fb where fb\.id=base\.batch_id and fb\.is_mixed and exists\(select 1 from public\.fish_stocking fs where fs\.batch_id=fb\.id\)\) then null::double precision else (base\.[a-z_]+) end', '\1', 'g');
  if new = step then raise exception 'anchor not found: mixed-batch blanking'; end if;
  if new like '%base.batch_id and fb.is_mixed%' then raise exception 'mixed-batch blanking left behind'; end if;

  execute new;
end
$mig$;
