-- AquaSmart synthetic seed data
-- Intended for fresh/local environments where mock production and monitoring
-- history is useful for validating dashboards, reports, and operational flows.

-- Disable FK checks (does not disable unique constraints)
SET session_replication_role = replica;
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change
)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  '00000000-0000-4000-8000-000000000001',
  'authenticated',
  'authenticated',
  'demo@aquasmart.com',
  extensions.crypt('demo1234', extensions.gen_salt('bf')),
  now(),
  now(),
  now(),
  '',
  '',
  '',
  ''
)
ON CONFLICT (id) DO NOTHING;
-- Truncate all known tables in safe dependency order
TRUNCATE TABLE
  public.water_quality_measurement,
  public.fish_harvest,
  public.fish_transfer,
  public.fish_stocking,
  public.fish_sampling_weight,
  public.fish_mortality,
  public.feeding_record,
  public.feed_incoming,
  public.fingerling_batch,
  public.feed_type,
  public.feed_supplier,
  public.fingerling_supplier,
  public.farm_user,
  public.app_config,
  public.alert_threshold,
  public.system,
  public.farm
RESTART IDENTITY CASCADE;

-- Re-enable triggers for synthetic event inserts so derived read models can be built.
SET session_replication_role = DEFAULT;

do $$
declare
  v_farm_id uuid := '11111111-1111-4111-8111-111111111111';
  v_now timestamptz := now();
  v_start_date date := current_date - interval '180 days';
  v_first_user_id uuid;

  v_system_n1 bigint;
  v_system_n2 bigint;
  v_system_n3 bigint;
  v_system_n4 bigint;
  v_system_g1 bigint;
  v_system_g2 bigint;
  v_system_g3 bigint;
  v_system_g4 bigint;

  v_feed_supplier_a bigint;
  v_feed_supplier_b bigint;
  v_fingerling_supplier_a bigint;
  v_fingerling_supplier_b bigint;

  v_feed_starter bigint;
  v_feed_grower_2 bigint;
  v_feed_grower_3 bigint;
  v_feed_finisher bigint;

  v_batch_alpha bigint;
  v_batch_beta bigint;
  v_batch_gamma bigint;
  v_batch_delta bigint;

  v_day date;
  v_system_id bigint;
  v_batch_id bigint;
  v_cycle_start date;
  v_is_nursing boolean;
  v_phase_day integer;
  v_sample_interval integer;
  v_should_transfer boolean;
  v_live_fish numeric;
  v_abw_g numeric;
  v_target_feed_pct numeric;
  v_daily_feed_kg numeric;
  v_daily_mortality numeric;
  v_transfer_fish numeric;
  v_transfer_weight_kg numeric;
  v_harvest_fish numeric;
  v_harvest_weight_kg numeric;
  v_stocking_fish numeric;
  v_response public.feeding_response;
  v_do numeric;
  v_ph numeric;
  v_temp numeric;
  v_ammonia numeric;
  v_nitrite numeric;
  v_nitrate numeric;
  v_salinity numeric;
  v_secchi numeric;
begin

  insert into public.farm (id, name, location, owner, email, phone, created_at)
  values (
    v_farm_id,
    'AquaSmart Synthetic Farm',
    'Kisumu Bay, Lake Victoria',
    'Synthetic Ops',
    'demo@aquasmart.local',
    '+254700000000',
    v_now
  );

  insert into public.alert_threshold (
    farm_id,
    scope,
    low_do_threshold,
    high_ammonia_threshold,
    high_mortality_threshold
  )
  values (
    v_farm_id,
    'farm',
    4.2,
    0.12,
    1.8
  );

  insert into public.app_config (key, value)
  values ('default_farm_id', v_farm_id::text)
  on conflict (key) do update
    set value = excluded.value;

  insert into public.water_quality_framework (
    parameter_name,
    unit,
    parameter_optimal,
    parameter_acceptable,
    parameter_critical,
    parameter_lethal
  )
  values
    ('dissolved_oxygen', 'mg/l', '{"min": 5.5}', '{"min": 4.5}', '{"min": 3.5}', '{"max": 3.49}'),
    ('temperature', 'mg/l', '{"min": 24, "max": 30}', '{"min": 22, "max": 32}', '{"min": 20, "max": 34}', '{"min": 0, "max": 50}'),
    ('pH', 'pH', '{"min": 6.5, "max": 8.5}', '{"min": 6.0, "max": 9.0}', '{"min": 5.5, "max": 9.5}', '{"min": 0, "max": 14}'),
    ('ammonia', 'mg/l', '{"max": 0.05}', '{"max": 0.10}', '{"max": 0.20}', '{"min": 0.201}'),
    ('nitrite', 'mg/l', '{"max": 0.05}', '{"max": 0.10}', '{"max": 0.20}', '{"min": 0.201}'),
    ('nitrate', 'mg/l', '{"max": 2.0}', '{"max": 5.0}', '{"max": 10.0}', '{"min": 10.01}'),
    ('salinity', 'ppt', '{"min": 0.0, "max": 1.0}', '{"min": 0.0, "max": 2.0}', '{"min": 0.0, "max": 5.0}', '{"min": 5.01}'),
    ('secchi_disk_depth', 'm', '{"min": 0.35, "max": 0.60}', '{"min": 0.25, "max": 0.70}', '{"min": 0.15, "max": 0.80}', '{"max": 0.149}')
  on conflict (parameter_name) do update
    set
      unit = excluded.unit,
      parameter_optimal = excluded.parameter_optimal,
      parameter_acceptable = excluded.parameter_acceptable,
      parameter_critical = excluded.parameter_critical,
      parameter_lethal = excluded.parameter_lethal;

  select id
  into v_first_user_id
  from auth.users
  order by created_at
  limit 1;

  if v_first_user_id is not null then
    insert into public.farm_user (farm_id, user_id, role)
    values (v_farm_id, v_first_user_id, 'admin')
    on conflict (farm_id, user_id) do update
      set role = excluded.role;
  end if;

  insert into public.feed_supplier (company_name, location_country, location_city)
  values
    ('Lake Feeds Ltd', 'Kenya', 'Kisumu'),
    ('BlueRiver Nutrition', 'Uganda', 'Jinja');

  select id
  into v_feed_supplier_a
  from public.feed_supplier
  where company_name = 'Lake Feeds Ltd'
  order by id desc
  limit 1;

  select id
  into v_feed_supplier_b
  from public.feed_supplier
  where company_name = 'BlueRiver Nutrition'
  order by id desc
  limit 1;

  insert into public.feed_type (
    feed_supplier,
    feed_line,
    feed_category,
    feed_pellet_size,
    crude_protein_percentage,
    crude_fat_percentage
  )
  values
    (v_feed_supplier_a, 'Starter 1.5mm', 'starter', '1.5-1.99mm', 42, 12),
    (v_feed_supplier_a, 'Grower 2mm', 'grower', '2mm', 36, 10),
    (v_feed_supplier_b, 'Grower 3mm', 'grower', '3mm', 32, 8),
    (v_feed_supplier_b, 'Finisher 4mm', 'finisher', '4mm', 28, 7);

  select id into v_feed_starter from public.feed_type where feed_line = 'Starter 1.5mm' order by id desc limit 1;
  select id into v_feed_grower_2 from public.feed_type where feed_line = 'Grower 2mm' order by id desc limit 1;
  select id into v_feed_grower_3 from public.feed_type where feed_line = 'Grower 3mm' order by id desc limit 1;
  select id into v_feed_finisher from public.feed_type where feed_line = 'Finisher 4mm' order by id desc limit 1;

  insert into public.fingerling_supplier (company_name, location_country, location_city)
  values
    ('Victoria Hatchery', 'Kenya', 'Homa Bay'),
    ('Nile Fry Centre', 'Uganda', 'Entebbe');

  select id into v_fingerling_supplier_a from public.fingerling_supplier where company_name = 'Victoria Hatchery' order by id desc limit 1;
  select id into v_fingerling_supplier_b from public.fingerling_supplier where company_name = 'Nile Fry Centre' order by id desc limit 1;

  insert into public.fingerling_batch (
    supplier_id,
    date_of_delivery,
    number_of_fish,
    abw,
    name,
    farm_id
  )
  values
    (v_fingerling_supplier_a, v_start_date + 5,  32000, 12, 'Batch Alpha', v_farm_id),
    (v_fingerling_supplier_b, v_start_date + 18, 28000, 14, 'Batch Beta',  v_farm_id),
    (v_fingerling_supplier_a, v_start_date + 55, 36000, 16, 'Batch Gamma', v_farm_id),
    (v_fingerling_supplier_b, v_start_date + 92, 30000, 18, 'Batch Delta', v_farm_id);

  select id into v_batch_alpha from public.fingerling_batch where name = 'Batch Alpha' order by id desc limit 1;
  select id into v_batch_beta  from public.fingerling_batch where name = 'Batch Beta'  order by id desc limit 1;
  select id into v_batch_gamma from public.fingerling_batch where name = 'Batch Gamma' order by id desc limit 1;
  select id into v_batch_delta from public.fingerling_batch where name = 'Batch Delta' order by id desc limit 1;

  insert into public.system (
    farm_id,
    name,
    type,
    growth_stage,
    volume,
    depth,
    length,
    width,
    diameter,
    commissioned_at,
    is_active
  )
  values
    (v_farm_id, 'Nursing 1',   'tank',             'nursing',   80,  1.4, 8,    5,    null, v_start_date - 60,  true),
    (v_farm_id, 'Nursing 2',   'tank',             'nursing',   80,  1.4, 8,    5,    null, v_start_date - 60,  true),
    (v_farm_id, 'Nursing 3',   'rectangular_cage', 'nursing',   120, 3.0, 6,    6,    null, v_start_date - 40,  true),
    (v_farm_id, 'Nursing 4',   'rectangular_cage', 'nursing',   120, 3.0, 6,    6,    null, v_start_date - 40,  true),
    (v_farm_id, 'Grow-out 1',  'circular_cage',    'grow_out',  450, 4.0, null, null, 12,   v_start_date - 120, true),
    (v_farm_id, 'Grow-out 2',  'circular_cage',    'grow_out',  450, 4.0, null, null, 12,   v_start_date - 120, true),
    (v_farm_id, 'Grow-out 3',  'circular_cage',    'grow_out',  520, 4.5, null, null, 13,   v_start_date - 120, true),
    (v_farm_id, 'Grow-out 4',  'circular_cage',    'grow_out',  520, 4.5, null, null, 13,   v_start_date - 120, true);

  select id into v_system_n1 from public.system where name = 'Nursing 1'  order by id desc limit 1;
  select id into v_system_n2 from public.system where name = 'Nursing 2'  order by id desc limit 1;
  select id into v_system_n3 from public.system where name = 'Nursing 3'  order by id desc limit 1;
  select id into v_system_n4 from public.system where name = 'Nursing 4'  order by id desc limit 1;
  select id into v_system_g1 from public.system where name = 'Grow-out 1' order by id desc limit 1;
  select id into v_system_g2 from public.system where name = 'Grow-out 2' order by id desc limit 1;
  select id into v_system_g3 from public.system where name = 'Grow-out 3' order by id desc limit 1;
  select id into v_system_g4 from public.system where name = 'Grow-out 4' order by id desc limit 1;

  -- Seed incoming feed deliveries every 14 days.
  for v_day in
    select generate_series(v_start_date::timestamp, current_date::timestamp, interval '14 days')::date
  loop
    insert into public.feed_incoming (farm_id, date, feed_amount, feed_type_id)
    values
      (v_farm_id, v_day, 900  + ((extract(day from v_day)::int % 5) * 110), v_feed_starter),
      (v_farm_id, v_day, 1400 + ((extract(day from v_day)::int % 7) * 90),  v_feed_grower_2),
      (v_farm_id, v_day, 1800 + ((extract(day from v_day)::int % 6) * 120), v_feed_grower_3),
      (v_farm_id, v_day, 1200 + ((extract(day from v_day)::int % 4) * 130), v_feed_finisher)
    ON CONFLICT DO NOTHING;
  end loop;

  -- Initial stocking events by batch/system.
  insert into public.fish_stocking (
    system_id,
    batch_id,
    date,
    number_of_fish_stocking,
    total_weight_stocking,
    abw,
    type_of_stocking
  )
  values
    (v_system_n1, v_batch_alpha, v_start_date + 5,  16000, 192, 12, 'empty'),
    (v_system_n2, v_batch_alpha, v_start_date + 5,  16000, 192, 12, 'empty'),
    (v_system_n3, v_batch_beta,  v_start_date + 18, 14000, 196, 14, 'empty'),
    (v_system_n4, v_batch_beta,  v_start_date + 18, 14000, 196, 14, 'empty'),
    (v_system_n1, v_batch_gamma, v_start_date + 55, 18000, 288, 16, 'already_stocked'),
    (v_system_n2, v_batch_gamma, v_start_date + 55, 18000, 288, 16, 'already_stocked'),
    (v_system_n3, v_batch_delta, v_start_date + 92, 15000, 270, 18, 'already_stocked'),
    (v_system_n4, v_batch_delta, v_start_date + 92, 15000, 270, 18, 'already_stocked')
  ON CONFLICT DO NOTHING;

  -- Daily production and monitoring history per batch/system pair.
  create temporary table tmp_seed_cycles (
    system_id  bigint,
    batch_id   bigint,
    cycle_start date,
    phase       text
  ) on commit drop;

  insert into tmp_seed_cycles (system_id, batch_id, cycle_start, phase)
  values
    (v_system_n1, v_batch_alpha, v_start_date + 5,   'nursing'),
    (v_system_n2, v_batch_alpha, v_start_date + 5,   'nursing'),
    (v_system_n3, v_batch_beta,  v_start_date + 18,  'nursing'),
    (v_system_n4, v_batch_beta,  v_start_date + 18,  'nursing'),
    (v_system_n1, v_batch_gamma, v_start_date + 55,  'nursing'),
    (v_system_n2, v_batch_gamma, v_start_date + 55,  'nursing'),
    (v_system_n3, v_batch_delta, v_start_date + 92,  'nursing'),
    (v_system_n4, v_batch_delta, v_start_date + 92,  'nursing'),
    (v_system_g1, v_batch_alpha, v_start_date + 39,  'grow_out'),
    (v_system_g2, v_batch_alpha, v_start_date + 41,  'grow_out'),
    (v_system_g3, v_batch_beta,  v_start_date + 51,  'grow_out'),
    (v_system_g4, v_batch_beta,  v_start_date + 53,  'grow_out'),
    (v_system_g1, v_batch_gamma, v_start_date + 89,  'grow_out'),
    (v_system_g2, v_batch_gamma, v_start_date + 91,  'grow_out'),
    (v_system_g3, v_batch_delta, v_start_date + 126, 'grow_out'),
    (v_system_g4, v_batch_delta, v_start_date + 128, 'grow_out');

  for v_system_id, v_batch_id, v_cycle_start, v_is_nursing in
    select
      c.system_id,
      c.batch_id,
      c.cycle_start,
      c.phase = 'nursing'
    from tmp_seed_cycles c
    order by c.cycle_start, c.system_id
  loop
    v_stocking_fish :=
      case
        when v_batch_id = v_batch_alpha and v_is_nursing then 16000
        when v_batch_id = v_batch_beta  and v_is_nursing then 14000
        when v_batch_id = v_batch_gamma and v_is_nursing then 18000
        when v_batch_id = v_batch_delta and v_is_nursing then 15000
        when v_batch_id = v_batch_alpha then 7200
        when v_batch_id = v_batch_beta  then 6200
        when v_batch_id = v_batch_gamma then 8200
        else 6800
      end;

    v_abw_g :=
      case
        when v_batch_id = v_batch_alpha and v_is_nursing then 12
        when v_batch_id = v_batch_beta  and v_is_nursing then 14
        when v_batch_id = v_batch_gamma and v_is_nursing then 16
        when v_batch_id = v_batch_delta and v_is_nursing then 18
        when v_batch_id = v_batch_alpha then 48
        when v_batch_id = v_batch_beta  then 54
        when v_batch_id = v_batch_gamma then 62
        else 68
      end;

    v_live_fish      := v_stocking_fish;
    v_sample_interval := case when v_is_nursing then 7 else 10 end;

    for v_day in
      select generate_series(
        v_cycle_start::timestamp,
        least(current_date, v_cycle_start + interval '70 days')::timestamp,
        interval '1 day'
      )::date
    loop
      v_phase_day := greatest(0, (v_day - v_cycle_start));

      v_abw_g :=
        round(
          v_abw_g
          + case
              when v_is_nursing then 0.75 + ((v_phase_day % 3) * 0.08)
              else 2.10 + ((v_phase_day % 5) * 0.18)
            end,
          2
        );

      v_target_feed_pct :=
        case
          when v_abw_g < 20  then 9.8
          when v_abw_g < 40  then 6.7
          when v_abw_g < 80  then 4.2
          when v_abw_g < 150 then 3.2
          when v_abw_g < 300 then 2.4
          else 1.8
        end;

      v_daily_feed_kg := round((v_live_fish * v_abw_g / 1000.0) * (v_target_feed_pct / 100.0), 2);
      v_daily_feed_kg := greatest(2.5, v_daily_feed_kg * (0.96 + ((v_phase_day % 6) * 0.015)));

      v_daily_mortality :=
        case
          when (v_phase_day % 29) = 0 and v_phase_day > 0 then ceil(v_live_fish * 0.008)
          when (v_phase_day % 17) = 0 and v_phase_day > 0 then ceil(v_live_fish * 0.0035)
          else ceil(v_live_fish * (case when v_is_nursing then 0.0007 else 0.00045 end))
        end;
      v_daily_mortality := least(v_daily_mortality, greatest(v_live_fish - 100, 0));

      if v_day <= current_date and v_live_fish > 0 then

        v_response :=
          case
            when (v_phase_day % 29) = 0 and v_phase_day > 0 then 'bad'
            when (v_phase_day % 13) = 0 and v_phase_day > 0 then 'good'
            when (v_phase_day % 5)  = 0                      then 'very_good'
            else 'good'
          end;

        -- Feeding record
        insert into public.feeding_record (
          system_id,
          batch_id,
          date,
          feed_type_id,
          feeding_amount,
          feeding_response
        )
        values (
          v_system_id,
          v_batch_id,
          v_day,
          case
            when v_abw_g < 25  then v_feed_starter
            when v_abw_g < 120 then v_feed_grower_2
            when v_abw_g < 260 then v_feed_grower_3
            else v_feed_finisher
          end,
          v_daily_feed_kg,
          v_response
        )
        ON CONFLICT DO NOTHING;

        -- Fish mortality
        insert into public.fish_mortality (
          system_id,
          batch_id,
          date,
          number_of_fish_mortality,
          avg_dead_wt_g,
          cause,
          farm_id,
          notes
        )
        values (
          v_system_id,
          v_batch_id,
          v_day,
          v_daily_mortality,
          round(v_abw_g * 0.92, 2),
          case
            when (v_phase_day % 29) = 0 and v_phase_day > 0 then 'hypoxia'
            when (v_phase_day % 17) = 0 and v_phase_day > 0 then 'handling'
            else 'unknown'
          end,
          v_farm_id,
          case
            when (v_phase_day % 29) = 0 and v_phase_day > 0
              then 'Synthetic spike tied to a low-oxygen event.'
            else null
          end
        )
        ON CONFLICT DO NOTHING;

        -- Fish sampling weight (periodic)
        if (v_phase_day % v_sample_interval) = 0 or v_phase_day in (1, 3) then
          insert into public.fish_sampling_weight (
            system_id,
            batch_id,
            date,
            number_of_fish_sampling,
            total_weight_sampling,
            abw
          )
          values (
            v_system_id,
            v_batch_id,
            v_day,
            case when v_is_nursing then 60 else 80 end,
            round((case when v_is_nursing then 60 else 80 end) * v_abw_g / 1000.0, 2),
            v_abw_g
          )
          ON CONFLICT DO NOTHING;
        end if;

        -- Water quality parameters
        v_do      := round(greatest(3.4, least(8.2,
                      6.8
                      - (case when (v_phase_day % 29) = 0 and v_phase_day > 0 then 2.0 else 0 end)
                      - (case when (v_phase_day % 13) = 0 and v_phase_day > 0 then 0.6
                              when v_response = 'bad' then 1.0 else 0 end)
                      + ((v_phase_day % 5) * 0.18)
                    )), 2);
        v_ph      := round(7.1  + ((v_phase_day % 6)  * 0.11),  2);
        v_temp    := round(26.0 + ((v_phase_day % 8)  * 0.37),  2);
        v_ammonia := round(0.03 + ((v_phase_day % 9)  * 0.008)
                      + case when v_do < 4.5 then 0.06 else 0 end, 3);
        v_nitrite := round(0.02 + ((v_phase_day % 7)  * 0.005), 3);
        v_nitrate := round(0.9  + ((v_phase_day % 10) * 0.14),  3);
        v_salinity := round(
                        case when v_is_nursing then 0.2 else 0.4 end
                        + ((v_phase_day % 4) * 0.05), 2);
        v_secchi  := round((38 + ((v_phase_day % 6) * 3)
                      - case when v_do < 4.5 then 6 else 0 end) / 100.0, 2);

        insert into public.water_quality_measurement (
          system_id,
          date,
          time,
          measured_at,
          water_depth,
          parameter_name,
          parameter_value
        )
        values
          (v_system_id, v_day, '06:00', v_day::timestamp + time '06:00', case when v_is_nursing then 1.2 else 3.5 end, 'dissolved_oxygen', v_do),
          (v_system_id, v_day, '06:00', v_day::timestamp + time '06:00', case when v_is_nursing then 1.2 else 3.5 end, 'temperature',      v_temp),
          (v_system_id, v_day, '06:00', v_day::timestamp + time '06:00', case when v_is_nursing then 1.2 else 3.5 end, 'pH',               v_ph),
          (v_system_id, v_day, '06:00', v_day::timestamp + time '06:00', case when v_is_nursing then 1.2 else 3.5 end, 'ammonia',          v_ammonia),
          (v_system_id, v_day, '06:00', v_day::timestamp + time '06:00', case when v_is_nursing then 1.2 else 3.5 end, 'nitrite',          v_nitrite),
          (v_system_id, v_day, '06:00', v_day::timestamp + time '06:00', case when v_is_nursing then 1.2 else 3.5 end, 'nitrate',          v_nitrate),
          (v_system_id, v_day, '06:00', v_day::timestamp + time '06:00', case when v_is_nursing then 1.2 else 3.5 end, 'salinity',         v_salinity),
          (v_system_id, v_day, '12:00', v_day::timestamp + time '12:00', case when v_is_nursing then 1.2 else 3.5 end, 'secchi_disk_depth',v_secchi)
        ON CONFLICT (system_id, parameter_name, date, time, water_depth) DO NOTHING;

      end if;

      -- Transfer events
      v_should_transfer :=
        (
          (v_batch_id = v_batch_alpha and v_day in (v_start_date + 38,  v_start_date + 40))
          or (v_batch_id = v_batch_beta  and v_day in (v_start_date + 50,  v_start_date + 52))
          or (v_batch_id = v_batch_gamma and v_day in (v_start_date + 88,  v_start_date + 90))
          or (v_batch_id = v_batch_delta and v_day in (v_start_date + 125, v_start_date + 127))
        );

      if v_should_transfer and v_is_nursing and v_live_fish > 0 then
        v_transfer_fish      := round(v_live_fish * 0.46, 0);
        v_transfer_weight_kg := round((v_transfer_fish * v_abw_g) / 1000.0, 2);

        insert into public.fish_transfer (
          origin_system_id,
          target_system_id,
          batch_id,
          date,
          number_of_fish_transfer,
          total_weight_transfer,
          abw,
          transfer_type
        )
        values (
          v_system_id,
          case
            when v_batch_id = v_batch_alpha and v_system_id = v_system_n1 then v_system_g1
            when v_batch_id = v_batch_alpha and v_system_id = v_system_n2 then v_system_g2
            when v_batch_id = v_batch_beta  and v_system_id = v_system_n3 then v_system_g3
            when v_batch_id = v_batch_beta  and v_system_id = v_system_n4 then v_system_g4
            when v_batch_id = v_batch_gamma and v_system_id = v_system_n1 then v_system_g1
            when v_batch_id = v_batch_gamma and v_system_id = v_system_n2 then v_system_g2
            when v_batch_id = v_batch_delta and v_system_id = v_system_n3 then v_system_g3
            else v_system_g4
          end,
          v_batch_id,
          v_day,
          v_transfer_fish,
          v_transfer_weight_kg,
          v_abw_g,
          'transfer'
        )
        ON CONFLICT DO NOTHING;
      end if;

      -- Harvest events remain partial in the synthetic dataset.
      -- The demo reuses grow-out systems across overlapping batches, so a final-harvest
      -- closeout would conflict with production_cycle constraints during seeding.
      if not v_is_nursing and v_phase_day in (52, 65) and v_live_fish > 1200 then
        v_harvest_fish      := round(v_live_fish * case when v_phase_day = 52 then 0.16 else 0.22 end, 0);
        v_harvest_weight_kg := round((v_harvest_fish * v_abw_g) / 1000.0, 2);

        insert into public.fish_harvest (
          system_id,
          batch_id,
          date,
          number_of_fish_harvest,
          total_weight_harvest,
          abw,
          type_of_harvest
        )
        values (
          v_system_id,
          v_batch_id,
          v_day,
          v_harvest_fish,
          v_harvest_weight_kg,
          v_abw_g,
          'partial'::public.type_of_harvest
        )
        ON CONFLICT DO NOTHING;
      end if;

      -- Update running fish count
      v_live_fish := greatest(
        0,
        v_live_fish
        - v_daily_mortality
        - case
            when v_should_transfer and v_is_nursing
              then round(v_live_fish * 0.46, 0)
            else 0
          end
        - case
            when not v_is_nursing and v_phase_day in (52, 65)
              then round(v_live_fish * case when v_phase_day = 52 then 0.16 else 0.22 end, 0)
            else 0
          end
      );

    end loop; -- daily loop
  end loop;   -- cycle loop

  -- Build derived daily inventory and refresh all aggregate read models.
  perform public.process_inventory_queue(10000);

  if exists (select 1 from public.water_quality_measurement) then
    perform public.refresh_daily_water_quality_rating(
      null,
      (select min(date) from public.water_quality_measurement),
      (select max(date) from public.water_quality_measurement)
    );
  end if;

  perform public.refresh_all_materialized_views();

end
$$;
