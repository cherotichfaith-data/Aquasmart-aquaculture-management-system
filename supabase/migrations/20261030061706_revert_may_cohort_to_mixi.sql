-- Revert the 2026-10-26 "continuous May cohort" consolidation. 3A, 3B and 2B keep their own batches, suppliers and
-- history; batch 67 becomes the mix 05.26mixi, starting 2026-10-15 when fish from a second batch first reach G1E.
-- Mixing is a movement of existing fish: each join is a pair of fish_inventory_reconciliation rows in G1E (minus on the
-- source batch, plus on the mix), so the cage total does not change. Before-state is saved in private.mixed_batch_change_audit.
create or replace function pg_temp.bb(p_batch bigint, p_system bigint, p_date date) returns bigint language sql stable as $f$
  select (
    coalesce((select sum(number_of_fish_stocking) from public.fish_stocking where batch_id = p_batch and system_id = p_system and date <= p_date), 0)
    + coalesce((select sum(number_of_fish_transfer) from public.fish_transfer where batch_id = p_batch and target_system_id = p_system and date <= p_date), 0)
    - coalesce((select sum(number_of_fish_transfer) from public.fish_transfer where batch_id = p_batch and origin_system_id = p_system and date <= p_date), 0)
    - coalesce((select sum(number_of_fish_mortality) from public.fish_mortality where batch_id = p_batch and system_id = p_system and date <= p_date), 0)
    - coalesce((select sum(number_of_fish_harvest) from public.fish_harvest where batch_id = p_batch and system_id = p_system and date <= p_date), 0)
    + coalesce((select sum(fish_delta) from public.fish_inventory_reconciliation where batch_id = p_batch and system_id = p_system and reconciliation_date <= p_date), 0)
  )::bigint
$f$;
create or replace function pg_temp.cb(p_system bigint) returns bigint language sql stable as $f$
  select (
    coalesce((select sum(number_of_fish_stocking) from public.fish_stocking where system_id = p_system), 0)
    + coalesce((select sum(number_of_fish_transfer) from public.fish_transfer where target_system_id = p_system), 0)
    - coalesce((select sum(number_of_fish_transfer) from public.fish_transfer where origin_system_id = p_system), 0)
    - coalesce((select sum(number_of_fish_mortality) from public.fish_mortality where system_id = p_system), 0)
    - coalesce((select sum(number_of_fish_harvest) from public.fish_harvest where system_id = p_system), 0)
    + coalesce((select sum(fish_delta) from public.fish_inventory_reconciliation where system_id = p_system), 0)
  )::bigint
$f$;

DO $migration$
DECLARE
  dry boolean := false;
  mix_start constant date := date '2026-10-15';
  ev record;
  n bigint;
  calc_mix bigint;
  cage_before jsonb;
  cage_after jsonb;
  leftover bigint;
  report text := '';
  r record;
BEGIN
  select jsonb_object_agg(s::text, pg_temp.cb(s)) into cage_before from unnest(array[25, 35, 37, 53]::bigint[]) s;

  insert into private.mixed_batch_change_audit (change_key, before_state, after_state)
  values ('mixi_revert_2026_10_30', jsonb_build_object(
    'batches', (select jsonb_agg(to_jsonb(b)) from public.fingerling_batch b where id in (50, 67)),
    'cycles', (select jsonb_agg(to_jsonb(c)) from public.production_cycle c where cycle_id in (23, 24, 25, 41)),
    'placements', (select jsonb_agg(to_jsonb(p)) from public.production_cycle_system p where cycle_id in (23, 24, 25, 41)),
    'sources', (select jsonb_agg(to_jsonb(s)) from public.fingerling_batch_source s where target_batch_id = 67),
    'pending_entry_401', (select to_jsonb(e) from public.production_pending_entry e where id = 401),
    'retagged', jsonb_build_object(
      'feeding_record', (select coalesce(jsonb_agg(jsonb_build_object('id', id, 'batch_id', batch_id, 'cycle_id', cycle_id)), '[]') from public.feeding_record where batch_id = 67),
      'fish_mortality', (select coalesce(jsonb_agg(jsonb_build_object('id', id, 'batch_id', batch_id, 'cycle_id', cycle_id)), '[]') from public.fish_mortality where batch_id = 67),
      'fish_sampling_weight', (select coalesce(jsonb_agg(jsonb_build_object('id', id, 'batch_id', batch_id, 'cycle_id', cycle_id)), '[]') from public.fish_sampling_weight where batch_id = 67),
      'fish_stocking', (select coalesce(jsonb_agg(jsonb_build_object('id', id, 'batch_id', batch_id, 'cycle_id', cycle_id)), '[]') from public.fish_stocking where batch_id = 67),
      'fish_transfer', (select coalesce(jsonb_agg(jsonb_build_object('id', id, 'batch_id', batch_id, 'cycle_id', cycle_id)), '[]') from public.fish_transfer where batch_id = 67),
      'fish_inventory_reconciliation', (select coalesce(jsonb_agg(jsonb_build_object('id', id, 'batch_id', batch_id, 'cycle_id', cycle_id)), '[]') from public.fish_inventory_reconciliation where batch_id = 67)
    )), '{}'::jsonb);

  update public.fingerling_batch set
    name = '05.26mixi', number_of_fish = 0, date_of_delivery = mix_start, mixed_on = mix_start,
    notes = 'Mix of 05.26aK (3A), 05.26cK (3B) and 05.26b (2B) in G1E. Starts 15 October 2026 when fish from a second batch first arrived; 2B joined on 21 October. Original batches keep their own dates, suppliers and records. Mixing moves existing fish and is not new stocking. Source contributions are in fingerling_batch_source; the fish movement is recorded as paired reconciliations in G1E. Majority source is Kipili Farm (supplier 8).'
  where id = 67;
  update public.fingerling_batch set name = '05.26aK' where id = 50;

  update public.production_cycle set cycle_start = mix_start where cycle_id = 41;
  update public.production_cycle_system set started_at = mix_start where id = 45;
  delete from public.production_cycle_system where id in (49, 50, 51);
  update public.production_cycle set cycle_end = date '2026-10-15' where cycle_id = 23;
  update public.production_cycle set cycle_end = date '2026-10-18' where cycle_id = 25;
  update public.production_cycle_system set ended_at = mix_start where id = 42;

  update public.feeding_record t set batch_id = m.b, cycle_id = m.c from (values (25, 51, 24), (35, 50, 23), (37, 52, 25)) m(s, b, c) where t.batch_id = 67 and t.system_id = m.s;
  update public.feeding_record set batch_id = 50, cycle_id = 23 where batch_id = 67 and system_id = 53 and date < mix_start;
  update public.fish_mortality t set batch_id = m.b, cycle_id = m.c from (values (25, 51, 24), (35, 50, 23), (37, 52, 25)) m(s, b, c) where t.batch_id = 67 and t.system_id = m.s;
  update public.fish_mortality set batch_id = 50, cycle_id = 23 where batch_id = 67 and system_id = 53 and date < mix_start;
  update public.fish_sampling_weight t set batch_id = m.b, cycle_id = m.c from (values (25, 51, 24), (35, 50, 23), (37, 52, 25)) m(s, b, c) where t.batch_id = 67 and t.system_id = m.s;
  update public.fish_sampling_weight set batch_id = 50, cycle_id = 23 where batch_id = 67 and system_id = 53 and date < mix_start;
  update public.fish_stocking t set batch_id = m.b, cycle_id = m.c from (values (25, 51, 24), (35, 50, 23), (37, 52, 25)) m(s, b, c) where t.batch_id = 67 and t.system_id = m.s;
  update public.fish_transfer t set batch_id = m.b, cycle_id = m.c from (values (25, 51, 24), (35, 50, 23), (37, 52, 25)) m(s, b, c) where t.batch_id = 67 and t.origin_system_id = m.s;
  update public.fish_inventory_reconciliation t set batch_id = m.b, cycle_id = m.c from (values (25, 51, 24), (35, 50, 23), (37, 52, 25)) m(s, b, c) where t.batch_id = 67 and t.system_id = m.s;

  for ev in select * from (values (date '2026-10-15', 50::bigint, 23::bigint), (date '2026-10-15', 52, 25), (date '2026-10-18', 52, 25), (date '2026-10-21', 51, 24)) v(d, b, c) order by d, b loop
    n := pg_temp.bb(ev.b, 53, ev.d);
    if n <= 0 then raise exception 'No fish to move from batch % into the mix on %', ev.b, ev.d; end if;
    calc_mix := pg_temp.bb(67, 53, ev.d);
    insert into public.fish_inventory_reconciliation (system_id, batch_id, cycle_id, reconciliation_date, calculated_fish, confirmed_fish, fish_delta, reason, notes)
    values
      (53, ev.b, ev.c, ev.d, n, 0, -n, 'mixed_into_05.26mixi', 'Fish from this batch joined the 05.26mixi mix in G1E. A movement within the cage, not a loss.'),
      (53, 67, 41, ev.d, calc_mix, calc_mix + n, n, 'mixed_from_source_batch', 'Fish joined the mix from batch ' || ev.b || ' in G1E. A movement within the cage, not new stocking.');
  end loop;

  update public.fingerling_batch_source s set
    combined_on = v.d,
    fish_count = (select sum(-rc.fish_delta) from public.fish_inventory_reconciliation rc where rc.batch_id = v.b and rc.system_id = 53 and rc.reason = 'mixed_into_05.26mixi'),
    notes = 'Source provenance for the 05.26mixi mix. combined_on is the date this source first joined the mix; fish_count is the total fish it contributed (gross at transfer). The movement is recorded as paired reconciliations in G1E. Not new stocking.'
  from (values (50::bigint, date '2026-10-15'), (52, date '2026-10-15'), (51, date '2026-10-21')) v(b, d)
  where s.target_batch_id = 67 and s.source_batch_id = v.b;

  update public.production_pending_entry set payload = jsonb_set(payload, '{batch_id}', '51'::jsonb) where id = 401 and payload->>'batch_id' = '67';

  select jsonb_object_agg(s::text, pg_temp.cb(s)) into cage_after from unnest(array[25, 35, 37, 53]::bigint[]) s;
  if cage_before is distinct from cage_after then raise exception 'Cage totals changed: % -> %', cage_before, cage_after; end if;

  select (select count(*) from public.feeding_record where batch_id = 67 and system_id in (25, 35, 37))
       + (select count(*) from public.fish_mortality where batch_id = 67 and system_id in (25, 35, 37))
       + (select count(*) from public.fish_sampling_weight where batch_id = 67 and system_id in (25, 35, 37))
       + (select count(*) from public.fish_stocking where batch_id = 67)
       + (select count(*) from public.fish_transfer where batch_id = 67)
       + (select count(*) from public.fish_inventory_reconciliation where batch_id = 67 and system_id <> 53) into leftover;
  if leftover <> 0 then raise exception '% rows still on the mix in the source cages', leftover; end if;

  if pg_temp.bb(50, 53, current_date) <> 0 or pg_temp.bb(51, 53, current_date) <> 0 or pg_temp.bb(52, 53, current_date) <> 0 then
    raise exception 'A source batch still holds fish in G1E: 50=%, 51=%, 52=%', pg_temp.bb(50, 53, current_date), pg_temp.bb(51, 53, current_date), pg_temp.bb(52, 53, current_date);
  end if;
  if (select (cycle_id, batch_id) from public.resolve_cycle_batch_for_system_date(53, date '2026-10-14')) is distinct from (23, 50::bigint) then
    raise exception 'G1E on 14 Oct does not resolve to batch 50 / cycle 23'; end if;
  if (select (cycle_id, batch_id) from public.resolve_cycle_batch_for_system_date(53, date '2026-10-16')) is distinct from (41, 67::bigint) then
    raise exception 'G1E on 16 Oct does not resolve to the mix / cycle 41'; end if;

  report := 'cage totals (unchanged) ' || cage_after::text
    || ' | G1E balances: 05.26aK=' || pg_temp.bb(50, 53, current_date) || ' 05.26b=' || pg_temp.bb(51, 53, current_date) || ' 05.26cK=' || pg_temp.bb(52, 53, current_date) || ' mix=' || pg_temp.bb(67, 53, current_date)
    || ' | contributions: ' || (select string_agg(source_batch_id || '=' || fish_count || '@' || combined_on, ', ' order by source_batch_id) from public.fingerling_batch_source where target_batch_id = 67);
  for r in select b.id, b.name, (select count(*) from public.feeding_record where batch_id = b.id) feed, (select count(*) from public.fish_mortality where batch_id = b.id) mort,
      (select count(*) from public.fish_sampling_weight where batch_id = b.id) samp, (select count(*) from public.fish_transfer where batch_id = b.id) xfer
    from public.fingerling_batch b where b.id in (50, 51, 52, 67) order by b.id loop
    report := report || E'\n' || r.id || ' ' || r.name || ': feed ' || r.feed || ', mort ' || r.mort || ', samp ' || r.samp || ', xfer ' || r.xfer;
  end loop;

  if dry then raise exception 'DRY RUN OK, rolled back: %', report; end if;
  raise notice '%', report;
END
$migration$;
