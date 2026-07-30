create extension if not exists "pg_cron" with schema "pg_catalog";

create extension if not exists "btree_gist" with schema "extensions";

create extension if not exists "pgjwt" with schema "extensions";

create schema if not exists "analytics";

create schema if not exists "energy";

create schema if not exists "private";

create type "public"."arrows" as enum ('up', 'down', 'straight');

create type "public"."cage_status_enum" as enum ('occupied', 'available', 'retired');

create type "public"."change_type_enum" as enum ('INSERT', 'UPDATE', 'DELETE');

create type "public"."feed_category" as enum ('pre-starter', 'starter', 'pre-grower', 'grower', 'finisher', 'broodstock', 'unknown');

create type "public"."feed_pellet_size" as enum ('mash_powder', '<0.49mm', '0.5-0.99mm', '1.0-1.5mm', '1.5-1.99mm', '2mm', '2.5mm', '3mm', '3.5mm', '4mm', '4.5mm', '5mm', 'unknown', '0.5mm', '0.5-1.0mm', '0.9-1.6mm');

create type "public"."mortality_cause" as enum ('unknown', 'hypoxia', 'disease', 'injury', 'handling', 'predator', 'starvation', 'temperature', 'other');

create type "public"."system_growth_stage" as enum ('nursing', 'grow_out');

create type "public"."system_type" as enum ('cage', 'compartment', 'all_active_cages', 'rectangular_cage', 'circular_cage', 'pond', 'tank');

create type "public"."time_period" as enum ('day', 'week', '2 weeks', 'month', 'quarter', '6 months', 'year');

create type "public"."transfer_type" as enum ('transfer', 'grading', 'density_thinning', 'broodstock', 'count_check', 'lab_sample', 'training', 'external_out');

create type "public"."type_of_harvest" as enum ('partial', 'final');

create type "public"."type_of_stocking" as enum ('empty', 'already_stocked');

create type "public"."units" as enum ('m', 'mg/l', 'ppt', '°C', 'pH', 'NTU', 'µS/cm');

create type "public"."water_quality_parameters" as enum ('pH', 'temperature', 'dissolved_oxygen', 'secchi_disk_depth', 'nitrite', 'nitrate', 'ammonia', 'salinity');

create type "public"."water_quality_rating" as enum ('optimal', 'acceptable', 'critical', 'lethal');

create sequence "public"."production_cycle_cycle_id_seq";

create sequence "public"."water_quality_measurements_id_seq";


  create table "energy"."live" (
    "id" bigint generated always as identity not null,
    "farm_id" uuid not null,
    "system_id" bigint,
    "source_id" text,
    "source_type" text not null default 'mqtt_rs485'::text,
    "meter_id" text not null,
    "meter_name" text,
    "measured_at" timestamp with time zone not null default now(),
    "power_kw" numeric,
    "pv_power_w" numeric,
    "load_power_w" numeric,
    "battery_power_w" numeric,
    "battery_power_kw" numeric,
    "battery_state_of_charge_pct" numeric,
    "mppt1_power_w" numeric,
    "mppt2_power_w" numeric,
    "mppt3_power_w" numeric,
    "mppt4_power_w" numeric,
    "energy_today_kwh" numeric,
    "energy_total_kwh" numeric,
    "voltage_v" numeric,
    "current_a" numeric,
    "frequency_hz" numeric,
    "power_factor" numeric,
    "status" text not null default 'online'::text,
    "payload" jsonb not null default '{}'::jsonb,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "energy"."live" enable row level security;


  create table "energy"."timeseries" (
    "id" bigint generated always as identity not null,
    "farm_id" uuid not null,
    "system_id" bigint,
    "source_id" text,
    "source_type" text not null default 'mqtt_rs485'::text,
    "measured_at" timestamp with time zone not null,
    "power_kw" numeric,
    "pv_power_w" numeric,
    "load_power_w" numeric,
    "battery_power_w" numeric,
    "battery_power_kw" numeric,
    "battery_state_of_charge_pct" numeric,
    "mppt1_power_w" numeric,
    "mppt2_power_w" numeric,
    "mppt3_power_w" numeric,
    "mppt4_power_w" numeric,
    "energy_kwh" numeric,
    "energy_import_kwh" numeric,
    "energy_export_kwh" numeric,
    "solar_generation_kwh" numeric,
    "grid_import_kwh" numeric,
    "payload" jsonb not null default '{}'::jsonb,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "energy"."timeseries" enable row level security;


  create table "private"."farm_user_invitation" (
    "id" uuid not null default gen_random_uuid(),
    "farm_id" uuid not null,
    "email" text not null,
    "role" text not null,
    "status" text not null default 'pending'::text,
    "invited_by" uuid,
    "invited_user_id" uuid,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "last_sent_at" timestamp with time zone,
    "accepted_at" timestamp with time zone,
    "revoked_at" timestamp with time zone
      );



  create table "public"."_affected_systems" (
    "system_id" bigint not null,
    "min_affected_date" date not null default CURRENT_DATE
      );



  create table "public"."alert_threshold" (
    "id" uuid not null default gen_random_uuid(),
    "scope" text not null,
    "farm_id" uuid,
    "system_id" bigint,
    "low_do_threshold" numeric,
    "high_ammonia_threshold" numeric,
    "high_mortality_threshold" numeric,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now(),
    "low_sgr_threshold" numeric default 1.0,
    "low_survival_pct" numeric default 80.0,
    "critical_survival_pct" numeric default 70.0
      );


alter table "public"."alert_threshold" enable row level security;


  create table "public"."app_config" (
    "key" text not null,
    "value" text not null
      );


alter table "public"."app_config" enable row level security;


  create table "public"."daily_water_quality_rating" (
    "id" bigint generated always as identity not null,
    "system_id" bigint not null,
    "rating_date" date not null,
    "rating" public.water_quality_rating not null,
    "created_at" timestamp with time zone not null default CURRENT_TIMESTAMP,
    "worst_parameter" public.water_quality_parameters,
    "worst_parameter_value" double precision,
    "worst_parameter_unit" text,
    "rating_numeric" integer
      );


alter table "public"."daily_water_quality_rating" enable row level security;


  create table "public"."dashboard_time_period" (
    "time_period" public.time_period not null,
    "days_since_start" integer not null
      );


alter table "public"."dashboard_time_period" enable row level security;


  create table "public"."energy_alarm_events" (
    "id" bigint generated by default as identity not null,
    "farm_id" uuid not null,
    "meter_id" text,
    "alarm_code" text not null,
    "alarm_name" text,
    "severity" text not null default 'warning'::text,
    "status" text not null default 'active'::text,
    "started_at" timestamp with time zone not null default now(),
    "ended_at" timestamp with time zone,
    "acknowledged_at" timestamp with time zone,
    "resolved_at" timestamp with time zone,
    "message" text,
    "payload" jsonb not null default '{}'::jsonb,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."energy_alarm_events" enable row level security;


  create table "public"."energy_meter_timeseries" (
    "id" bigint generated by default as identity not null,
    "farm_id" uuid not null,
    "meter_id" text not null,
    "measured_at" timestamp with time zone not null,
    "active_power_kw" numeric,
    "reactive_power_kvar" numeric,
    "apparent_power_kva" numeric,
    "energy_import_kwh" numeric,
    "energy_export_kwh" numeric,
    "voltage_l1_v" numeric,
    "voltage_l2_v" numeric,
    "voltage_l3_v" numeric,
    "current_l1_a" numeric,
    "current_l2_a" numeric,
    "current_l3_a" numeric,
    "frequency_hz" numeric,
    "power_factor" numeric,
    "payload" jsonb not null default '{}'::jsonb,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."energy_meter_timeseries" enable row level security;


  create table "public"."farm" (
    "id" uuid not null default gen_random_uuid(),
    "name" text not null,
    "location" text,
    "created_at" timestamp with time zone default now(),
    "organization_id" uuid,
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."farm" enable row level security;


  create table "public"."farm_user" (
    "farm_id" uuid not null,
    "user_id" uuid not null,
    "role" text not null,
    "created_at" timestamp with time zone default now(),
    "id" uuid not null default gen_random_uuid()
      );


alter table "public"."farm_user" enable row level security;


  create table "public"."feed_inventory" (
    "id" bigint generated by default as identity not null,
    "created_at" timestamp with time zone not null default now(),
    "farm_id" uuid not null,
    "feed_type_id" bigint not null,
    "inventory_date" date not null,
    "inventory_time" time without time zone,
    "bag_weight" integer,
    "amount_of_bags" numeric,
    "opened_bags" integer,
    "comments" text,
    "updated_at" timestamp with time zone not null default now(),
    "bag_number" text,
    "snapshot_kg" numeric generated always as (public.feed_inventory_snapshot_kg((bag_weight)::numeric, amount_of_bags, (opened_bags)::numeric)) stored
      );


alter table "public"."feed_inventory" enable row level security;


  create table "public"."feed_supplier" (
    "id" bigint generated by default as identity not null,
    "created_at" timestamp with time zone not null default now(),
    "company_name" text not null,
    "location_country" text not null,
    "location_city" text
      );


alter table "public"."feed_supplier" enable row level security;


  create table "public"."feed_type" (
    "id" bigint generated by default as identity not null,
    "created_at" timestamp with time zone not null default now(),
    "feed_supplier_id" bigint not null,
    "feed_line" text,
    "feed_category" public.feed_category not null,
    "feed_pellet_size" public.feed_pellet_size not null,
    "crude_protein_percentage" double precision,
    "crude_fat_percentage" double precision,
    "farm_id" uuid,
    "is_active" boolean not null default true,
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."feed_type" enable row level security;


  create table "public"."feeding_rate_config" (
    "config_id" bigint generated by default as identity not null,
    "version" text not null,
    "scenario" text not null default 'main'::text,
    "phase_id" integer not null,
    "abw_min_g" numeric(10,3) not null,
    "abw_max_g" numeric(10,3),
    "feed_rate_min_pct" numeric(10,4) not null,
    "feed_rate_max_pct" numeric(10,4) not null,
    "is_default" boolean not null default true,
    "valid_from" date not null,
    "valid_to" date,
    "created_at" timestamp with time zone not null default timezone('utc'::text, now())
      );


alter table "public"."feeding_rate_config" enable row level security;


  create table "public"."feeding_record" (
    "id" bigint generated by default as identity not null,
    "created_at" timestamp with time zone not null default now(),
    "system_id" bigint not null,
    "feed_type_id" bigint,
    "feeding_amount" double precision not null,
    "date" date not null,
    "batch_id" bigint,
    "notes" text,
    "cycle_id" bigint,
    "local_id" text,
    "feeding_response" smallint,
    "synced_at" timestamp with time zone,
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."feeding_record" enable row level security;


  create table "public"."feeding_response_level" (
    "level" smallint not null,
    "label" text not null,
    "immediate_response" text not null,
    "after_10_min" text,
    "after_3_hours" text,
    "action_guideline" text not null
      );


alter table "public"."feeding_response_level" enable row level security;


  create table "public"."fingerling_batch" (
    "id" bigint generated by default as identity not null,
    "created_at" timestamp with time zone not null default now(),
    "supplier_id" bigint not null,
    "date_of_delivery" date not null,
    "number_of_fish" bigint not null,
    "abw" double precision not null,
    "name" text not null,
    "farm_id" uuid,
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."fingerling_batch" enable row level security;


  create table "public"."fingerling_supplier" (
    "id" bigint generated by default as identity not null,
    "created_at" timestamp with time zone not null default now(),
    "company_name" text not null,
    "location_country" text not null,
    "location_city" text
      );


alter table "public"."fingerling_supplier" enable row level security;


  create table "public"."fish_harvest" (
    "id" bigint generated by default as identity not null,
    "created_at" timestamp with time zone not null default now(),
    "date" date not null,
    "system_id" bigint not null,
    "number_of_fish_harvest" bigint not null,
    "total_weight_harvest" double precision not null,
    "abw" double precision,
    "type_of_harvest" public.type_of_harvest not null,
    "batch_id" bigint,
    "cycle_id" bigint,
    "local_id" text,
    "synced_at" timestamp with time zone,
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."fish_harvest" enable row level security;


  create table "public"."fish_mortality" (
    "id" bigint generated by default as identity not null,
    "created_at" timestamp with time zone not null default now(),
    "system_id" bigint not null,
    "date" date not null,
    "number_of_fish_mortality" bigint not null,
    "total_weight_mortality" double precision,
    "cause" public.mortality_cause not null default 'unknown'::public.mortality_cause,
    "notes" text,
    "batch_id" bigint,
    "is_mass_mortality" boolean generated always as ((number_of_fish_mortality >= 100)) stored,
    "cycle_id" bigint,
    "local_id" text,
    "synced_at" timestamp with time zone,
    "updated_at" timestamp with time zone not null default now(),
    "farm_id" uuid
      );


alter table "public"."fish_mortality" enable row level security;


  create table "public"."fish_sampling_weight" (
    "id" bigint generated by default as identity not null,
    "created_at" timestamp with time zone not null default now(),
    "system_id" bigint not null,
    "date" date not null,
    "number_of_fish_sampling" bigint not null,
    "total_weight_sampling" double precision not null,
    "abw" double precision not null,
    "batch_id" bigint,
    "notes" text,
    "cycle_id" bigint,
    "local_id" text,
    "synced_at" timestamp with time zone,
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."fish_sampling_weight" enable row level security;


  create table "public"."fish_stocking" (
    "id" bigint generated by default as identity not null,
    "created_at" timestamp with time zone not null default now(),
    "date" date not null,
    "system_id" bigint not null,
    "number_of_fish_stocking" bigint not null,
    "total_weight_stocking" double precision not null,
    "abw" double precision not null,
    "batch_id" bigint not null,
    "type_of_stocking" public.type_of_stocking not null,
    "notes" text,
    "cycle_id" bigint not null,
    "local_id" text,
    "synced_at" timestamp with time zone,
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."fish_stocking" enable row level security;


  create table "public"."fish_transfer" (
    "id" bigint generated by default as identity not null,
    "created_at" timestamp with time zone not null default now(),
    "origin_system_id" bigint,
    "target_system_id" bigint,
    "number_of_fish_transfer" double precision not null,
    "date" date not null,
    "total_weight_transfer" double precision,
    "abw" double precision,
    "batch_id" bigint,
    "transfer_type" public.transfer_type not null default 'transfer'::public.transfer_type,
    "notes" text,
    "external_target_name" text,
    "cycle_id" bigint,
    "local_id" text,
    "external_origin_name" text,
    "synced_at" timestamp with time zone,
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."fish_transfer" enable row level security;


  create table "public"."growth_phase" (
    "phase_id" integer not null,
    "scenario" text not null default 'main'::text,
    "abw_min_g" numeric(10,3) not null,
    "abw_max_g" numeric(10,3),
    "sgr_pct_per_day" numeric(10,4) not null,
    "created_at" timestamp with time zone not null default timezone('utc'::text, now())
      );


alter table "public"."growth_phase" enable row level security;


  create table "public"."organization" (
    "id" uuid not null default gen_random_uuid(),
    "name" text not null,
    "slug" text not null,
    "owner_id" uuid,
    "created_at" timestamp with time zone not null default now(),
    "is_active" boolean not null default true,
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."organization" enable row level security;


  create table "public"."production_cycle" (
    "cycle_id" bigint not null default nextval('public.production_cycle_cycle_id_seq'::regclass),
    "system_id" bigint not null,
    "cycle_start" date not null,
    "cycle_end" date,
    "ongoing_cycle" boolean not null,
    "target_weight_g" numeric,
    "batch_id" bigint not null,
    "previous_system_id" bigint,
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."production_cycle" enable row level security;


  create table "public"."system" (
    "id" bigint generated by default as identity not null,
    "created_at" timestamp with time zone not null default now(),
    "type" public.system_type not null,
    "growth_stage" public.system_growth_stage not null,
    "volume" double precision,
    "depth" double precision,
    "name" text not null,
    "is_active" boolean not null default true,
    "commissioned_at" date,
    "decommissioned_at" date,
    "farm_id" uuid,
    "unit" text,
    "cage_status" public.cage_status_enum,
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."system" enable row level security;


  create table "public"."system_name_change_log" (
    "id" bigint generated always as identity not null,
    "system_id" bigint not null,
    "old_name" text not null,
    "new_name" text not null,
    "changed_by" uuid,
    "changed_at" timestamp with time zone not null default now(),
    "has_stocking" boolean not null default false
      );



  create table "public"."user_profile" (
    "user_id" uuid not null,
    "notifications_enabled" boolean default true,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now(),
    "full_name" text,
    "role" text,
    "organization_id" uuid,
    "farm_id" uuid,
    "email" text
      );


alter table "public"."user_profile" enable row level security;


  create table "public"."user_settings" (
    "user_id" uuid not null,
    "theme" text default 'light'::text,
    "default_views" jsonb,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );


alter table "public"."user_settings" enable row level security;


  create table "public"."water_quality_framework" (
    "id" bigint generated by default as identity not null,
    "created_at" timestamp with time zone not null default now(),
    "parameter_acceptable" jsonb,
    "parameter_critical" jsonb,
    "parameter_lethal" jsonb,
    "parameter_optimal" jsonb,
    "unit" public.units,
    "parameter_name" public.water_quality_parameters not null
      );


alter table "public"."water_quality_framework" enable row level security;


  create table "public"."water_quality_measurement" (
    "id" bigint generated by default as identity not null,
    "date" date not null,
    "time" time without time zone not null,
    "water_depth" double precision not null,
    "parameter_value" double precision not null,
    "system_id" bigint not null,
    "created_at" timestamp with time zone not null default now(),
    "parameter_name" public.water_quality_parameters not null,
    "measured_at" timestamp with time zone not null,
    "location_reference" text,
    "local_id" text,
    "synced_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."water_quality_measurement" enable row level security;

alter table "public"."api_rate_limit_counter" enable row level security;

alter sequence "public"."production_cycle_cycle_id_seq" owned by "public"."production_cycle"."cycle_id";

alter sequence "public"."water_quality_measurements_id_seq" owned by "public"."water_quality_measurement"."id";

CREATE INDEX idx_energy_live_farm_system ON energy.live USING btree (farm_id, system_id);

CREATE INDEX idx_energy_live_measured_at ON energy.live USING btree (measured_at DESC);

CREATE INDEX idx_energy_timeseries_farm_measured ON energy.timeseries USING btree (farm_id, measured_at DESC);

CREATE INDEX idx_energy_timeseries_farm_system ON energy.timeseries USING btree (farm_id, system_id);

CREATE INDEX idx_energy_timeseries_measured_at ON energy.timeseries USING btree (measured_at DESC);

CREATE UNIQUE INDEX live_farm_id_meter_id_key ON energy.live USING btree (farm_id, meter_id);

CREATE UNIQUE INDEX live_pkey ON energy.live USING btree (id);

CREATE UNIQUE INDEX timeseries_pkey ON energy.timeseries USING btree (id);

CREATE UNIQUE INDEX farm_user_invitation_active_unique ON private.farm_user_invitation USING btree (farm_id, email) WHERE ((revoked_at IS NULL) AND (accepted_at IS NULL));

CREATE UNIQUE INDEX farm_user_invitation_pkey ON private.farm_user_invitation USING btree (id);

CREATE UNIQUE INDEX _affected_systems_pkey ON public._affected_systems USING btree (system_id);

CREATE UNIQUE INDEX alert_threshold_pkey ON public.alert_threshold USING btree (id);

CREATE UNIQUE INDEX app_config_pkey ON public.app_config USING btree (key);

CREATE UNIQUE INDEX daily_water_quality_rating_pkey ON public.daily_water_quality_rating USING btree (id);

CREATE UNIQUE INDEX daily_water_quality_rating_unique ON public.daily_water_quality_rating USING btree (system_id, rating_date);

CREATE UNIQUE INDEX dashboard_time_period_pkey ON public.dashboard_time_period USING btree (time_period);

CREATE UNIQUE INDEX energy_alarm_events_pkey ON public.energy_alarm_events USING btree (id);

CREATE UNIQUE INDEX energy_meter_timeseries_pkey ON public.energy_meter_timeseries USING btree (id);

CREATE UNIQUE INDEX energy_meter_timeseries_unique ON public.energy_meter_timeseries USING btree (farm_id, meter_id, measured_at);

CREATE UNIQUE INDEX farm_pkey ON public.farm USING btree (id);

CREATE UNIQUE INDEX farm_user_farm_id_user_id_key ON public.farm_user USING btree (farm_id, user_id);

CREATE UNIQUE INDEX farm_user_pkey ON public.farm_user USING btree (id);

CREATE UNIQUE INDEX feed_inventory_pkey ON public.feed_inventory USING btree (id);

CREATE UNIQUE INDEX feed_record_pkey ON public.feeding_record USING btree (id);

CREATE UNIQUE INDEX feed_supplier_identity_idx ON public.feed_supplier USING btree (lower(TRIM(BOTH FROM company_name)), lower(TRIM(BOTH FROM location_country)), lower(COALESCE(TRIM(BOTH FROM location_city), ''::text)));

CREATE UNIQUE INDEX feed_supplier_pkey ON public.feed_supplier USING btree (id);

CREATE UNIQUE INDEX feed_type_identity_idx ON public.feed_type USING btree (COALESCE(farm_id, '00000000-0000-0000-0000-000000000000'::uuid), feed_supplier_id, lower(COALESCE(TRIM(BOTH FROM feed_line), ''::text)), feed_category, feed_pellet_size, COALESCE(crude_protein_percentage, '-1'::double precision), COALESCE(crude_fat_percentage, '-1'::double precision));

CREATE UNIQUE INDEX feed_type_pkey ON public.feed_type USING btree (id);

CREATE UNIQUE INDEX feeding_rate_config_pkey ON public.feeding_rate_config USING btree (config_id);

CREATE UNIQUE INDEX feeding_rate_config_version_phase_valid_from_idx ON public.feeding_rate_config USING btree (version, scenario, phase_id, valid_from);

CREATE UNIQUE INDEX feeding_record_local_id_key ON public.feeding_record USING btree (local_id);

CREATE UNIQUE INDEX feeding_record_local_id_unique ON public.feeding_record USING btree (system_id, local_id) WHERE (local_id IS NOT NULL);

CREATE UNIQUE INDEX feeding_response_level_pkey ON public.feeding_response_level USING btree (level);

CREATE UNIQUE INDEX fingerling_batch_name_unique ON public.fingerling_batch USING btree (name);

CREATE UNIQUE INDEX fingerling_batch_pkey ON public.fingerling_batch USING btree (id);

CREATE UNIQUE INDEX fish_harvest_local_id_key ON public.fish_harvest USING btree (local_id);

CREATE UNIQUE INDEX fish_harvest_local_id_unique ON public.fish_harvest USING btree (system_id, local_id) WHERE (local_id IS NOT NULL);

CREATE UNIQUE INDEX fish_harvest_pkey ON public.fish_harvest USING btree (id);

CREATE INDEX fish_mortality_farm_id_idx ON public.fish_mortality USING btree (farm_id);

CREATE UNIQUE INDEX fish_mortality_local_id_key ON public.fish_mortality USING btree (local_id);

CREATE UNIQUE INDEX fish_mortality_local_id_unique ON public.fish_mortality USING btree (system_id, local_id) WHERE (local_id IS NOT NULL);

CREATE UNIQUE INDEX fish_sampling_weight_local_id_key ON public.fish_sampling_weight USING btree (local_id);

CREATE UNIQUE INDEX fish_sampling_weight_local_id_unique ON public.fish_sampling_weight USING btree (system_id, local_id) WHERE (local_id IS NOT NULL);

CREATE UNIQUE INDEX fish_stocking_local_id_key ON public.fish_stocking USING btree (local_id);

CREATE UNIQUE INDEX fish_stocking_local_id_unique ON public.fish_stocking USING btree (system_id, local_id) WHERE (local_id IS NOT NULL);

CREATE UNIQUE INDEX fish_transfer_local_id_key ON public.fish_transfer USING btree (local_id);

CREATE UNIQUE INDEX fish_transfer_local_id_unique ON public.fish_transfer USING btree (origin_system_id, local_id) WHERE (local_id IS NOT NULL);

CREATE UNIQUE INDEX fish_weight_sampling_pkey ON public.fish_sampling_weight USING btree (id);

CREATE UNIQUE INDEX growth_phase_pkey ON public.growth_phase USING btree (scenario, phase_id);

CREATE INDEX idx_alert_threshold_farm_id ON public.alert_threshold USING btree (farm_id) WHERE (farm_id IS NOT NULL);

CREATE INDEX idx_alert_threshold_system_id ON public.alert_threshold USING btree (system_id) WHERE (system_id IS NOT NULL);

CREATE INDEX idx_daily_water_quality_rating_system_date_desc ON public.daily_water_quality_rating USING btree (system_id, rating_date DESC, created_at DESC, id DESC);

CREATE INDEX idx_daily_wq_rating_date ON public.daily_water_quality_rating USING btree (rating_date);

CREATE INDEX idx_energy_alarm_events_active ON public.energy_alarm_events USING btree (farm_id, status, severity, started_at DESC) WHERE (status <> 'resolved'::text);

CREATE INDEX idx_energy_alarm_events_farm_started_at ON public.energy_alarm_events USING btree (farm_id, started_at DESC);

CREATE INDEX idx_energy_meter_timeseries_farm_meter_measured_at ON public.energy_meter_timeseries USING btree (farm_id, meter_id, measured_at DESC);

CREATE INDEX idx_farm_org_id ON public.farm USING btree (organization_id);

CREATE INDEX idx_farm_user_farm_user_role ON public.farm_user USING btree (farm_id, user_id, role);

CREATE INDEX idx_farm_user_user_farm ON public.farm_user USING btree (user_id, farm_id);

CREATE INDEX idx_farm_user_user_id ON public.farm_user USING btree (user_id);

CREATE INDEX idx_feed_inventory_farm_date ON public.feed_inventory USING btree (farm_id, inventory_date);

CREATE INDEX idx_feed_inventory_feed_type_date ON public.feed_inventory USING btree (feed_type_id, inventory_date);

CREATE INDEX idx_feed_inventory_feed_type_id ON public.feed_inventory USING btree (feed_type_id);

CREATE INDEX idx_feed_type_farm_id ON public.feed_type USING btree (farm_id);

CREATE INDEX idx_feed_type_feed_supplier ON public.feed_type USING btree (feed_supplier_id);

CREATE INDEX idx_feeding_record_batch_id ON public.feeding_record USING btree (batch_id);

CREATE INDEX idx_feeding_record_cycle_id ON public.feeding_record USING btree (cycle_id);

CREATE INDEX idx_feeding_record_feed_type_id ON public.feeding_record USING btree (feed_type_id);

CREATE INDEX idx_feeding_record_response_date ON public.feeding_record USING btree (system_id, date, feeding_response);

CREATE INDEX idx_feeding_record_system_date ON public.feeding_record USING btree (system_id, date);

CREATE INDEX idx_fh_system_date ON public.fish_harvest USING btree (system_id, date);

CREATE INDEX idx_fingerling_batch_farm_id ON public.fingerling_batch USING btree (farm_id);

CREATE INDEX idx_fingerling_batch_supplier_id ON public.fingerling_batch USING btree (supplier_id);

CREATE INDEX idx_fish_harvest_batch_id ON public.fish_harvest USING btree (batch_id);

CREATE INDEX idx_fish_harvest_cycle_id ON public.fish_harvest USING btree (cycle_id);

CREATE INDEX idx_fish_harvest_system_date ON public.fish_harvest USING btree (system_id, date DESC);

CREATE INDEX idx_fish_mortality_batch_id ON public.fish_mortality USING btree (batch_id);

CREATE INDEX idx_fish_mortality_cycle_id ON public.fish_mortality USING btree (cycle_id);

CREATE INDEX idx_fish_mortality_farm_date ON public.fish_mortality USING btree (farm_id, date DESC);

CREATE INDEX idx_fish_mortality_system_date ON public.fish_mortality USING btree (system_id, date);

CREATE INDEX idx_fish_sampling_weight_batch_id ON public.fish_sampling_weight USING btree (batch_id);

CREATE INDEX idx_fish_sampling_weight_cycle_id ON public.fish_sampling_weight USING btree (cycle_id);

CREATE INDEX idx_fish_sampling_weight_system_date ON public.fish_sampling_weight USING btree (system_id, date DESC);

CREATE INDEX idx_fish_stocking_batch_id ON public.fish_stocking USING btree (batch_id);

CREATE INDEX idx_fish_stocking_cycle_id ON public.fish_stocking USING btree (cycle_id);

CREATE INDEX idx_fish_stocking_system_date ON public.fish_stocking USING btree (system_id, date DESC);

CREATE INDEX idx_fish_transfer_batch_id ON public.fish_transfer USING btree (batch_id);

CREATE INDEX idx_fish_transfer_cycle_id ON public.fish_transfer USING btree (cycle_id);

CREATE INDEX idx_fish_transfer_origin_date ON public.fish_transfer USING btree (origin_system_id, date DESC);

CREATE INDEX idx_fish_transfer_system_date ON public.fish_transfer USING btree (origin_system_id, date DESC);

CREATE INDEX idx_fish_transfer_target_date ON public.fish_transfer USING btree (target_system_id, date DESC);

CREATE INDEX idx_fish_transfer_type_date_desc ON public.fish_transfer USING btree (transfer_type, date DESC);

CREATE INDEX idx_fs_system_date ON public.fish_stocking USING btree (system_id, date);

CREATE INDEX idx_ft_origin_date ON public.fish_transfer USING btree (origin_system_id, date);

CREATE INDEX idx_ft_target_date ON public.fish_transfer USING btree (target_system_id, date);

CREATE INDEX idx_organization_owner_id ON public.organization USING btree (owner_id);

CREATE INDEX idx_production_cycle_batch_id ON public.production_cycle USING btree (batch_id);

CREATE INDEX idx_production_cycle_previous_system_id ON public.production_cycle USING btree (previous_system_id);

CREATE INDEX idx_production_cycle_system_ongoing ON public.production_cycle USING btree (system_id) WHERE (ongoing_cycle = true);

CREATE INDEX idx_system_farm_id_id ON public.system USING btree (farm_id, id);

CREATE INDEX idx_system_name_change_log_system_id ON public.system_name_change_log USING btree (system_id, changed_at DESC);

CREATE INDEX idx_user_profile_farm_id ON public.user_profile USING btree (farm_id) WHERE (farm_id IS NOT NULL);

CREATE INDEX idx_user_profile_organization_id ON public.user_profile USING btree (organization_id) WHERE (organization_id IS NOT NULL);

CREATE INDEX idx_water_quality_measurement_system_date ON public.water_quality_measurement USING btree (system_id, date DESC);

CREATE INDEX idx_water_quality_measurement_system_measured_at ON public.water_quality_measurement USING btree (system_id, measured_at DESC);

CREATE INDEX idx_wqm_system_date ON public.water_quality_measurement USING btree (system_id, date DESC);

CREATE INDEX idx_wqm_system_date_time ON public.water_quality_measurement USING btree (system_id, date, "time");

CREATE INDEX idx_wqm_system_id ON public.water_quality_measurement USING btree (system_id);

CREATE INDEX idx_wqm_system_measured_at ON public.water_quality_measurement USING btree (system_id, measured_at);

CREATE UNIQUE INDEX mortality_pkey ON public.fish_mortality USING btree (id);

CREATE UNIQUE INDEX organization_pkey ON public.organization USING btree (id);

CREATE UNIQUE INDEX organization_slug_key ON public.organization USING btree (slug);

CREATE UNIQUE INDEX production_cycle_cycle_batch_key ON public.production_cycle USING btree (cycle_id, batch_id);

CREATE UNIQUE INDEX production_cycle_pkey_cycle_id ON public.production_cycle USING btree (cycle_id);

CREATE UNIQUE INDEX stocking_pkey ON public.fish_stocking USING btree (id);

CREATE UNIQUE INDEX supplier_name_key ON public.fingerling_supplier USING btree (company_name);

CREATE UNIQUE INDEX supplier_pkey ON public.fingerling_supplier USING btree (id);

CREATE UNIQUE INDEX system_active_name_farm_unique ON public.system USING btree (farm_id, name) WHERE (is_active IS TRUE);

CREATE UNIQUE INDEX system_name_change_log_pkey ON public.system_name_change_log USING btree (id);

CREATE UNIQUE INDEX system_pkey ON public.system USING btree (id);

CREATE UNIQUE INDEX transfer_pkey ON public.fish_transfer USING btree (id);

CREATE UNIQUE INDEX uq_production_cycle_batch ON public.production_cycle USING btree (batch_id);

CREATE UNIQUE INDEX user_profile_pkey ON public.user_profile USING btree (user_id);

CREATE UNIQUE INDEX user_settings_pkey ON public.user_settings USING btree (user_id);

CREATE UNIQUE INDEX water_quality_framework_parameter_unique ON public.water_quality_framework USING btree (parameter_name);

CREATE UNIQUE INDEX water_quality_framework_pkey ON public.water_quality_framework USING btree (id);

CREATE UNIQUE INDEX water_quality_measurement_local_id_key ON public.water_quality_measurement USING btree (local_id);

CREATE UNIQUE INDEX water_quality_measurement_local_id_unique ON public.water_quality_measurement USING btree (system_id, local_id) WHERE (local_id IS NOT NULL);

CREATE UNIQUE INDEX water_quality_measurement_unique ON public.water_quality_measurement USING btree (system_id, parameter_name, date, "time", water_depth);

CREATE UNIQUE INDEX water_quality_measurements_pkey ON public.water_quality_measurement USING btree (id);

alter table "energy"."live" add constraint "live_pkey" PRIMARY KEY using index "live_pkey";

alter table "energy"."timeseries" add constraint "timeseries_pkey" PRIMARY KEY using index "timeseries_pkey";

alter table "private"."farm_user_invitation" add constraint "farm_user_invitation_pkey" PRIMARY KEY using index "farm_user_invitation_pkey";

alter table "public"."_affected_systems" add constraint "_affected_systems_pkey" PRIMARY KEY using index "_affected_systems_pkey";

alter table "public"."alert_threshold" add constraint "alert_threshold_pkey" PRIMARY KEY using index "alert_threshold_pkey";

alter table "public"."app_config" add constraint "app_config_pkey" PRIMARY KEY using index "app_config_pkey";

alter table "public"."daily_water_quality_rating" add constraint "daily_water_quality_rating_pkey" PRIMARY KEY using index "daily_water_quality_rating_pkey";

alter table "public"."dashboard_time_period" add constraint "dashboard_time_period_pkey" PRIMARY KEY using index "dashboard_time_period_pkey";

alter table "public"."energy_alarm_events" add constraint "energy_alarm_events_pkey" PRIMARY KEY using index "energy_alarm_events_pkey";

alter table "public"."energy_meter_timeseries" add constraint "energy_meter_timeseries_pkey" PRIMARY KEY using index "energy_meter_timeseries_pkey";

alter table "public"."farm" add constraint "farm_pkey" PRIMARY KEY using index "farm_pkey";

alter table "public"."farm_user" add constraint "farm_user_pkey" PRIMARY KEY using index "farm_user_pkey";

alter table "public"."feed_inventory" add constraint "feed_inventory_pkey" PRIMARY KEY using index "feed_inventory_pkey";

alter table "public"."feed_supplier" add constraint "feed_supplier_pkey" PRIMARY KEY using index "feed_supplier_pkey";

alter table "public"."feed_type" add constraint "feed_type_pkey" PRIMARY KEY using index "feed_type_pkey";

alter table "public"."feeding_rate_config" add constraint "feeding_rate_config_pkey" PRIMARY KEY using index "feeding_rate_config_pkey";

alter table "public"."feeding_record" add constraint "feed_record_pkey" PRIMARY KEY using index "feed_record_pkey";

alter table "public"."feeding_response_level" add constraint "feeding_response_level_pkey" PRIMARY KEY using index "feeding_response_level_pkey";

alter table "public"."fingerling_batch" add constraint "fingerling_batch_pkey" PRIMARY KEY using index "fingerling_batch_pkey";

alter table "public"."fingerling_supplier" add constraint "supplier_pkey" PRIMARY KEY using index "supplier_pkey";

alter table "public"."fish_harvest" add constraint "fish_harvest_pkey" PRIMARY KEY using index "fish_harvest_pkey";

alter table "public"."fish_mortality" add constraint "mortality_pkey" PRIMARY KEY using index "mortality_pkey";

alter table "public"."fish_sampling_weight" add constraint "fish_weight_sampling_pkey" PRIMARY KEY using index "fish_weight_sampling_pkey";

alter table "public"."fish_stocking" add constraint "stocking_pkey" PRIMARY KEY using index "stocking_pkey";

alter table "public"."fish_transfer" add constraint "transfer_pkey" PRIMARY KEY using index "transfer_pkey";

alter table "public"."growth_phase" add constraint "growth_phase_pkey" PRIMARY KEY using index "growth_phase_pkey";

alter table "public"."organization" add constraint "organization_pkey" PRIMARY KEY using index "organization_pkey";

alter table "public"."production_cycle" add constraint "production_cycle_pkey_cycle_id" PRIMARY KEY using index "production_cycle_pkey_cycle_id";

alter table "public"."system" add constraint "system_pkey" PRIMARY KEY using index "system_pkey";

alter table "public"."system_name_change_log" add constraint "system_name_change_log_pkey" PRIMARY KEY using index "system_name_change_log_pkey";

alter table "public"."user_profile" add constraint "user_profile_pkey" PRIMARY KEY using index "user_profile_pkey";

alter table "public"."user_settings" add constraint "user_settings_pkey" PRIMARY KEY using index "user_settings_pkey";

alter table "public"."water_quality_framework" add constraint "water_quality_framework_pkey" PRIMARY KEY using index "water_quality_framework_pkey";

alter table "public"."water_quality_measurement" add constraint "water_quality_measurements_pkey" PRIMARY KEY using index "water_quality_measurements_pkey";

alter table "energy"."live" add constraint "live_farm_id_fkey" FOREIGN KEY (farm_id) REFERENCES public.farm(id) not valid;

alter table "energy"."live" validate constraint "live_farm_id_fkey";

alter table "energy"."live" add constraint "live_farm_id_meter_id_key" UNIQUE using index "live_farm_id_meter_id_key";

alter table "energy"."live" add constraint "live_system_id_fkey" FOREIGN KEY (system_id) REFERENCES public.system(id) not valid;

alter table "energy"."live" validate constraint "live_system_id_fkey";

alter table "energy"."timeseries" add constraint "timeseries_farm_id_fkey" FOREIGN KEY (farm_id) REFERENCES public.farm(id) not valid;

alter table "energy"."timeseries" validate constraint "timeseries_farm_id_fkey";

alter table "energy"."timeseries" add constraint "timeseries_system_id_fkey" FOREIGN KEY (system_id) REFERENCES public.system(id) not valid;

alter table "energy"."timeseries" validate constraint "timeseries_system_id_fkey";

alter table "private"."farm_user_invitation" add constraint "farm_user_invitation_farm_id_fkey" FOREIGN KEY (farm_id) REFERENCES public.farm(id) ON DELETE CASCADE not valid;

alter table "private"."farm_user_invitation" validate constraint "farm_user_invitation_farm_id_fkey";

alter table "public"."_affected_systems" add constraint "_affected_systems_system_id_fkey" FOREIGN KEY (system_id) REFERENCES public.system(id) ON DELETE CASCADE not valid;

alter table "public"."_affected_systems" validate constraint "_affected_systems_system_id_fkey";

alter table "public"."alert_threshold" add constraint "alert_threshold_farm_id_fkey" FOREIGN KEY (farm_id) REFERENCES public.farm(id) ON DELETE CASCADE not valid;

alter table "public"."alert_threshold" validate constraint "alert_threshold_farm_id_fkey";

alter table "public"."alert_threshold" add constraint "alert_threshold_scope_check" CHECK ((((scope = 'default'::text) AND (farm_id IS NULL) AND (system_id IS NULL)) OR ((scope = 'farm'::text) AND (farm_id IS NOT NULL) AND (system_id IS NULL)) OR ((scope = 'system'::text) AND (system_id IS NOT NULL)))) not valid;

alter table "public"."alert_threshold" validate constraint "alert_threshold_scope_check";

alter table "public"."alert_threshold" add constraint "alert_threshold_scope_target_check" CHECK ((((scope = 'default'::text) AND (farm_id IS NULL) AND (system_id IS NULL)) OR ((scope = 'farm'::text) AND (farm_id IS NOT NULL) AND (system_id IS NULL)) OR ((scope = 'system'::text) AND (system_id IS NOT NULL)))) NOT VALID not valid;

alter table "public"."alert_threshold" validate constraint "alert_threshold_scope_target_check";

alter table "public"."alert_threshold" add constraint "alert_threshold_system_id_fkey" FOREIGN KEY (system_id) REFERENCES public.system(id) ON DELETE CASCADE not valid;

alter table "public"."alert_threshold" validate constraint "alert_threshold_system_id_fkey";

alter table "public"."alert_threshold" add constraint "chk_alert_scope" CHECK (((scope = ANY (ARRAY['farm'::text, 'system'::text, 'default'::text])) AND (((scope = 'farm'::text) AND (farm_id IS NOT NULL)) OR ((scope = 'system'::text) AND (system_id IS NOT NULL)) OR (scope = 'default'::text)))) NOT VALID not valid;

alter table "public"."alert_threshold" validate constraint "chk_alert_scope";

alter table "public"."daily_water_quality_rating" add constraint "daily_water_quality_rating_rating_numeric_matches_rating" CHECK ((((rating = 'lethal'::public.water_quality_rating) AND (rating_numeric = 0)) OR ((rating = 'critical'::public.water_quality_rating) AND (rating_numeric = 1)) OR ((rating = 'acceptable'::public.water_quality_rating) AND (rating_numeric = 2)) OR ((rating = 'optimal'::public.water_quality_rating) AND (rating_numeric = 3)))) not valid;

alter table "public"."daily_water_quality_rating" validate constraint "daily_water_quality_rating_rating_numeric_matches_rating";

alter table "public"."daily_water_quality_rating" add constraint "daily_water_quality_rating_system_id_fkey" FOREIGN KEY (system_id) REFERENCES public.system(id) not valid;

alter table "public"."daily_water_quality_rating" validate constraint "daily_water_quality_rating_system_id_fkey";

alter table "public"."daily_water_quality_rating" add constraint "daily_water_quality_rating_unique" UNIQUE using index "daily_water_quality_rating_unique";

alter table "public"."energy_alarm_events" add constraint "energy_alarm_events_alarm_code_not_blank" CHECK ((btrim(alarm_code) <> ''::text)) not valid;

alter table "public"."energy_alarm_events" validate constraint "energy_alarm_events_alarm_code_not_blank";

alter table "public"."energy_alarm_events" add constraint "energy_alarm_events_farm_id_fkey" FOREIGN KEY (farm_id) REFERENCES public.farm(id) ON DELETE CASCADE not valid;

alter table "public"."energy_alarm_events" validate constraint "energy_alarm_events_farm_id_fkey";

alter table "public"."energy_alarm_events" add constraint "energy_alarm_events_severity_check" CHECK ((severity = ANY (ARRAY['info'::text, 'warning'::text, 'critical'::text]))) not valid;

alter table "public"."energy_alarm_events" validate constraint "energy_alarm_events_severity_check";

alter table "public"."energy_alarm_events" add constraint "energy_alarm_events_status_check" CHECK ((status = ANY (ARRAY['active'::text, 'acknowledged'::text, 'resolved'::text]))) not valid;

alter table "public"."energy_alarm_events" validate constraint "energy_alarm_events_status_check";

alter table "public"."energy_alarm_events" add constraint "energy_alarm_events_time_check" CHECK (((ended_at IS NULL) OR (ended_at >= started_at))) not valid;

alter table "public"."energy_alarm_events" validate constraint "energy_alarm_events_time_check";

alter table "public"."energy_meter_timeseries" add constraint "energy_meter_timeseries_farm_id_fkey" FOREIGN KEY (farm_id) REFERENCES public.farm(id) ON DELETE CASCADE not valid;

alter table "public"."energy_meter_timeseries" validate constraint "energy_meter_timeseries_farm_id_fkey";

alter table "public"."energy_meter_timeseries" add constraint "energy_meter_timeseries_meter_id_not_blank" CHECK ((btrim(meter_id) <> ''::text)) not valid;

alter table "public"."energy_meter_timeseries" validate constraint "energy_meter_timeseries_meter_id_not_blank";

alter table "public"."energy_meter_timeseries" add constraint "energy_meter_timeseries_unique" UNIQUE using index "energy_meter_timeseries_unique";

alter table "public"."farm" add constraint "farm_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES public.organization(id) not valid;

alter table "public"."farm" validate constraint "farm_organization_id_fkey";

alter table "public"."farm_user" add constraint "chk_farm_user_role" CHECK ((role = ANY (ARRAY['admin'::text, 'farm_manager'::text, 'system_operator'::text, 'data_analyst'::text, 'viewer'::text]))) NOT VALID not valid;

alter table "public"."farm_user" validate constraint "chk_farm_user_role";

alter table "public"."farm_user" add constraint "farm_user_farm_id_fkey" FOREIGN KEY (farm_id) REFERENCES public.farm(id) ON DELETE CASCADE not valid;

alter table "public"."farm_user" validate constraint "farm_user_farm_id_fkey";

alter table "public"."farm_user" add constraint "farm_user_role_check" CHECK ((role = ANY (ARRAY['admin'::text, 'farm_manager'::text, 'system_operator'::text, 'data_analyst'::text, 'viewer'::text]))) not valid;

alter table "public"."farm_user" validate constraint "farm_user_role_check";

alter table "public"."farm_user" add constraint "farm_user_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."farm_user" validate constraint "farm_user_user_id_fkey";

alter table "public"."feed_inventory" add constraint "feed_inventory_farm_id_fkey" FOREIGN KEY (farm_id) REFERENCES public.farm(id) ON DELETE CASCADE not valid;

alter table "public"."feed_inventory" validate constraint "feed_inventory_farm_id_fkey";

alter table "public"."feed_inventory" add constraint "feed_inventory_feed_type_id_fkey" FOREIGN KEY (feed_type_id) REFERENCES public.feed_type(id) ON UPDATE CASCADE ON DELETE RESTRICT not valid;

alter table "public"."feed_inventory" validate constraint "feed_inventory_feed_type_id_fkey";

alter table "public"."feed_inventory" add constraint "feed_inventory_nonnegative_values" CHECK ((((bag_weight IS NULL) OR (bag_weight >= 0)) AND ((amount_of_bags IS NULL) OR (amount_of_bags >= (0)::numeric)) AND ((opened_bags IS NULL) OR (opened_bags >= 0)))) not valid;

alter table "public"."feed_inventory" validate constraint "feed_inventory_nonnegative_values";

alter table "public"."feed_type" add constraint "feed_type_farm_id_fkey" FOREIGN KEY (farm_id) REFERENCES public.farm(id) ON UPDATE CASCADE ON DELETE SET NULL not valid;

alter table "public"."feed_type" validate constraint "feed_type_farm_id_fkey";

alter table "public"."feed_type" add constraint "feed_type_feed_supplier_fkey" FOREIGN KEY (feed_supplier_id) REFERENCES public.feed_supplier(id) ON UPDATE CASCADE not valid;

alter table "public"."feed_type" validate constraint "feed_type_feed_supplier_fkey";

alter table "public"."feeding_rate_config" add constraint "feeding_rate_config_bounds_check" CHECK (((abw_max_g IS NULL) OR (abw_max_g >= abw_min_g))) not valid;

alter table "public"."feeding_rate_config" validate constraint "feeding_rate_config_bounds_check";

alter table "public"."feeding_rate_config" add constraint "feeding_rate_config_growth_phase_fkey" FOREIGN KEY (scenario, phase_id) REFERENCES public.growth_phase(scenario, phase_id) ON UPDATE CASCADE ON DELETE RESTRICT not valid;

alter table "public"."feeding_rate_config" validate constraint "feeding_rate_config_growth_phase_fkey";

alter table "public"."feeding_rate_config" add constraint "feeding_rate_config_rate_bounds_check" CHECK (((feed_rate_min_pct > (0)::numeric) AND (feed_rate_max_pct > (0)::numeric) AND (feed_rate_max_pct >= feed_rate_min_pct))) not valid;

alter table "public"."feeding_rate_config" validate constraint "feeding_rate_config_rate_bounds_check";

alter table "public"."feeding_rate_config" add constraint "feeding_rate_config_scenario_check" CHECK ((scenario = ANY (ARRAY['main'::text, 'potential'::text, 'slow'::text]))) not valid;

alter table "public"."feeding_rate_config" validate constraint "feeding_rate_config_scenario_check";

alter table "public"."feeding_rate_config" add constraint "feeding_rate_config_validity_check" CHECK (((valid_to IS NULL) OR (valid_to >= valid_from))) not valid;

alter table "public"."feeding_rate_config" validate constraint "feeding_rate_config_validity_check";

alter table "public"."feeding_record" add constraint "feed_record_system_id_fkey" FOREIGN KEY (system_id) REFERENCES public.system(id) not valid;

alter table "public"."feeding_record" validate constraint "feed_record_system_id_fkey";

alter table "public"."feeding_record" add constraint "feeding_amount_check" CHECK (((feeding_amount >= (0)::double precision) AND (feeding_amount < (1000)::double precision))) not valid;

alter table "public"."feeding_record" validate constraint "feeding_amount_check";

alter table "public"."feeding_record" add constraint "feeding_record_batch_id_fkey" FOREIGN KEY (batch_id) REFERENCES public.fingerling_batch(id) ON UPDATE CASCADE not valid;

alter table "public"."feeding_record" validate constraint "feeding_record_batch_id_fkey";

alter table "public"."feeding_record" add constraint "feeding_record_cycle_batch_fkey" FOREIGN KEY (cycle_id, batch_id) REFERENCES public.production_cycle(cycle_id, batch_id) not valid;

alter table "public"."feeding_record" validate constraint "feeding_record_cycle_batch_fkey";

alter table "public"."feeding_record" add constraint "feeding_record_feed_id_fkey" FOREIGN KEY (feed_type_id) REFERENCES public.feed_type(id) ON UPDATE CASCADE not valid;

alter table "public"."feeding_record" validate constraint "feeding_record_feed_id_fkey";

alter table "public"."feeding_record" add constraint "feeding_response_range_check" CHECK (((feeding_response >= 1) AND (feeding_response <= 5))) not valid;

alter table "public"."feeding_record" validate constraint "feeding_response_range_check";

alter table "public"."feeding_record" add constraint "fk_feeding_response_level" FOREIGN KEY (feeding_response) REFERENCES public.feeding_response_level(level) not valid;

alter table "public"."feeding_record" validate constraint "fk_feeding_response_level";

alter table "public"."feeding_response_level" add constraint "feeding_response_level_level_check" CHECK (((level >= 1) AND (level <= 5))) not valid;

alter table "public"."feeding_response_level" validate constraint "feeding_response_level_level_check";

alter table "public"."fingerling_batch" add constraint "fingerling_batch_abw_positive" CHECK (((abw IS NULL) OR (abw > (0)::double precision))) not valid;

alter table "public"."fingerling_batch" validate constraint "fingerling_batch_abw_positive";

alter table "public"."fingerling_batch" add constraint "fingerling_batch_farm_id_fkey" FOREIGN KEY (farm_id) REFERENCES public.farm(id) not valid;

alter table "public"."fingerling_batch" validate constraint "fingerling_batch_farm_id_fkey";

alter table "public"."fingerling_batch" add constraint "fingerling_batch_name_unique" UNIQUE using index "fingerling_batch_name_unique";

alter table "public"."fingerling_batch" add constraint "fingerling_batch_number_positive" CHECK (((number_of_fish IS NULL) OR (number_of_fish >= 0))) not valid;

alter table "public"."fingerling_batch" validate constraint "fingerling_batch_number_positive";

alter table "public"."fingerling_batch" add constraint "fingerling_batch_supplier_id_fkey" FOREIGN KEY (supplier_id) REFERENCES public.fingerling_supplier(id) ON UPDATE CASCADE not valid;

alter table "public"."fingerling_batch" validate constraint "fingerling_batch_supplier_id_fkey";

alter table "public"."fingerling_supplier" add constraint "supplier_name_key" UNIQUE using index "supplier_name_key";

alter table "public"."fish_harvest" add constraint "fish_harvest_abw_matches_total" CHECK (((number_of_fish_harvest IS NULL) OR (number_of_fish_harvest <= 0) OR (abs((abw - ((total_weight_harvest * (1000.0)::double precision) / (number_of_fish_harvest)::double precision))) <= (0.01)::double precision))) NOT VALID not valid;

alter table "public"."fish_harvest" validate constraint "fish_harvest_abw_matches_total";

alter table "public"."fish_harvest" add constraint "fish_harvest_batch_id_fkey" FOREIGN KEY (batch_id) REFERENCES public.fingerling_batch(id) ON UPDATE CASCADE not valid;

alter table "public"."fish_harvest" validate constraint "fish_harvest_batch_id_fkey";

alter table "public"."fish_harvest" add constraint "fish_harvest_batch_required" CHECK ((batch_id IS NOT NULL)) NOT VALID not valid;

alter table "public"."fish_harvest" validate constraint "fish_harvest_batch_required";

alter table "public"."fish_harvest" add constraint "fish_harvest_cycle_batch_fkey" FOREIGN KEY (cycle_id, batch_id) REFERENCES public.production_cycle(cycle_id, batch_id) not valid;

alter table "public"."fish_harvest" validate constraint "fish_harvest_cycle_batch_fkey";

alter table "public"."fish_harvest" add constraint "fish_harvest_cycle_required" CHECK ((cycle_id IS NOT NULL)) NOT VALID not valid;

alter table "public"."fish_harvest" validate constraint "fish_harvest_cycle_required";

alter table "public"."fish_harvest" add constraint "fish_harvest_positive_count" CHECK (((number_of_fish_harvest IS NOT NULL) AND (number_of_fish_harvest > 0))) NOT VALID not valid;

alter table "public"."fish_harvest" validate constraint "fish_harvest_positive_count";

alter table "public"."fish_harvest" add constraint "fish_harvest_positive_weight" CHECK ((total_weight_harvest > (0)::double precision)) NOT VALID not valid;

alter table "public"."fish_harvest" validate constraint "fish_harvest_positive_weight";

alter table "public"."fish_harvest" add constraint "fish_harvest_system_id_fkey" FOREIGN KEY (system_id) REFERENCES public.system(id) ON UPDATE CASCADE not valid;

alter table "public"."fish_harvest" validate constraint "fish_harvest_system_id_fkey";

alter table "public"."fish_mortality" add constraint "fish_mortality_batch_id_fkey" FOREIGN KEY (batch_id) REFERENCES public.fingerling_batch(id) ON UPDATE CASCADE not valid;

alter table "public"."fish_mortality" validate constraint "fish_mortality_batch_id_fkey";

alter table "public"."fish_mortality" add constraint "fish_mortality_cycle_batch_fkey" FOREIGN KEY (cycle_id, batch_id) REFERENCES public.production_cycle(cycle_id, batch_id) not valid;

alter table "public"."fish_mortality" validate constraint "fish_mortality_cycle_batch_fkey";

alter table "public"."fish_mortality" add constraint "fish_mortality_farm_id_fkey" FOREIGN KEY (farm_id) REFERENCES public.farm(id) not valid;

alter table "public"."fish_mortality" validate constraint "fish_mortality_farm_id_fkey";

alter table "public"."fish_mortality" add constraint "fish_mortality_mass_weight_required" CHECK (((number_of_fish_mortality < 100) OR (total_weight_mortality IS NOT NULL))) NOT VALID not valid;

alter table "public"."fish_mortality" validate constraint "fish_mortality_mass_weight_required";

alter table "public"."fish_mortality" add constraint "fish_mortality_total_weight_nonnegative" CHECK (((total_weight_mortality IS NULL) OR (total_weight_mortality >= (0)::double precision))) NOT VALID not valid;

alter table "public"."fish_mortality" validate constraint "fish_mortality_total_weight_nonnegative";

alter table "public"."fish_mortality" add constraint "mortality_system_id_fkey" FOREIGN KEY (system_id) REFERENCES public.system(id) not valid;

alter table "public"."fish_mortality" validate constraint "mortality_system_id_fkey";

alter table "public"."fish_sampling_weight" add constraint "fish_sampling_positive_numbers" CHECK (((number_of_fish_sampling > 0) AND (total_weight_sampling > (0)::double precision) AND (abw > (0)::double precision))) not valid;

alter table "public"."fish_sampling_weight" validate constraint "fish_sampling_positive_numbers";

alter table "public"."fish_sampling_weight" add constraint "fish_sampling_weight_abw_matches_sample" CHECK ((abs((abw - ((total_weight_sampling * (1000.0)::double precision) / (NULLIF(number_of_fish_sampling, 0))::double precision))) <= (0.01)::double precision)) NOT VALID not valid;

alter table "public"."fish_sampling_weight" validate constraint "fish_sampling_weight_abw_matches_sample";

alter table "public"."fish_sampling_weight" add constraint "fish_sampling_weight_batch_id_fkey" FOREIGN KEY (batch_id) REFERENCES public.fingerling_batch(id) ON UPDATE CASCADE not valid;

alter table "public"."fish_sampling_weight" validate constraint "fish_sampling_weight_batch_id_fkey";

alter table "public"."fish_sampling_weight" add constraint "fish_sampling_weight_batch_required" CHECK ((batch_id IS NOT NULL)) NOT VALID not valid;

alter table "public"."fish_sampling_weight" validate constraint "fish_sampling_weight_batch_required";

alter table "public"."fish_sampling_weight" add constraint "fish_sampling_weight_cycle_batch_fkey" FOREIGN KEY (cycle_id, batch_id) REFERENCES public.production_cycle(cycle_id, batch_id) not valid;

alter table "public"."fish_sampling_weight" validate constraint "fish_sampling_weight_cycle_batch_fkey";

alter table "public"."fish_sampling_weight" add constraint "fish_sampling_weight_cycle_required" CHECK ((cycle_id IS NOT NULL)) NOT VALID not valid;

alter table "public"."fish_sampling_weight" validate constraint "fish_sampling_weight_cycle_required";

alter table "public"."fish_sampling_weight" add constraint "fish_weight_sampling_system_id_fkey" FOREIGN KEY (system_id) REFERENCES public.system(id) not valid;

alter table "public"."fish_sampling_weight" validate constraint "fish_weight_sampling_system_id_fkey";

alter table "public"."fish_stocking" add constraint "fish_stocking_batch_id_fkey" FOREIGN KEY (batch_id) REFERENCES public.fingerling_batch(id) ON UPDATE CASCADE not valid;

alter table "public"."fish_stocking" validate constraint "fish_stocking_batch_id_fkey";

alter table "public"."fish_stocking" add constraint "fish_stocking_cycle_batch_fkey" FOREIGN KEY (cycle_id, batch_id) REFERENCES public.production_cycle(cycle_id, batch_id) not valid;

alter table "public"."fish_stocking" validate constraint "fish_stocking_cycle_batch_fkey";

alter table "public"."fish_stocking" add constraint "stocking_system_id_fkey" FOREIGN KEY (system_id) REFERENCES public.system(id) not valid;

alter table "public"."fish_stocking" validate constraint "stocking_system_id_fkey";

alter table "public"."fish_transfer" add constraint "chk_fish_transfer_has_system" CHECK (((origin_system_id IS NOT NULL) OR (target_system_id IS NOT NULL))) not valid;

alter table "public"."fish_transfer" validate constraint "chk_fish_transfer_has_system";

alter table "public"."fish_transfer" add constraint "fish_transfer_batch_id_fkey" FOREIGN KEY (batch_id) REFERENCES public.fingerling_batch(id) ON UPDATE CASCADE not valid;

alter table "public"."fish_transfer" validate constraint "fish_transfer_batch_id_fkey";

alter table "public"."fish_transfer" add constraint "fish_transfer_cycle_batch_fkey" FOREIGN KEY (cycle_id, batch_id) REFERENCES public.production_cycle(cycle_id, batch_id) not valid;

alter table "public"."fish_transfer" validate constraint "fish_transfer_cycle_batch_fkey";

alter table "public"."fish_transfer" add constraint "fish_transfer_endpoint_check" CHECK (((origin_system_id IS NOT NULL) OR (target_system_id IS NOT NULL) OR (NULLIF(btrim(external_origin_name), ''::text) IS NOT NULL) OR (NULLIF(btrim(external_target_name), ''::text) IS NOT NULL))) NOT VALID not valid;

alter table "public"."fish_transfer" validate constraint "fish_transfer_endpoint_check";

alter table "public"."fish_transfer" add constraint "fish_transfer_positive_count_check" CHECK ((number_of_fish_transfer > (0)::double precision)) NOT VALID not valid;

alter table "public"."fish_transfer" validate constraint "fish_transfer_positive_count_check";

alter table "public"."fish_transfer" add constraint "fish_transfer_whole_fish_count_check" CHECK ((number_of_fish_transfer = trunc(number_of_fish_transfer))) NOT VALID not valid;

alter table "public"."fish_transfer" validate constraint "fish_transfer_whole_fish_count_check";

alter table "public"."fish_transfer" add constraint "transfer_origin_system_id_fkey" FOREIGN KEY (origin_system_id) REFERENCES public.system(id) not valid;

alter table "public"."fish_transfer" validate constraint "transfer_origin_system_id_fkey";

alter table "public"."fish_transfer" add constraint "transfer_target_system_id_fkey" FOREIGN KEY (target_system_id) REFERENCES public.system(id) not valid;

alter table "public"."fish_transfer" validate constraint "transfer_target_system_id_fkey";

alter table "public"."growth_phase" add constraint "growth_phase_bounds_check" CHECK (((abw_max_g IS NULL) OR (abw_max_g >= abw_min_g))) not valid;

alter table "public"."growth_phase" validate constraint "growth_phase_bounds_check";

alter table "public"."growth_phase" add constraint "growth_phase_scenario_check" CHECK ((scenario = ANY (ARRAY['main'::text, 'potential'::text, 'slow'::text]))) not valid;

alter table "public"."growth_phase" validate constraint "growth_phase_scenario_check";

alter table "public"."growth_phase" add constraint "growth_phase_sgr_check" CHECK ((sgr_pct_per_day > (0)::numeric)) not valid;

alter table "public"."growth_phase" validate constraint "growth_phase_sgr_check";

alter table "public"."organization" add constraint "organization_owner_id_fkey" FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."organization" validate constraint "organization_owner_id_fkey";

alter table "public"."organization" add constraint "organization_slug_key" UNIQUE using index "organization_slug_key";

alter table "public"."production_cycle" add constraint "production_cycle_batch_id_fkey" FOREIGN KEY (batch_id) REFERENCES public.fingerling_batch(id) ON UPDATE CASCADE not valid;

alter table "public"."production_cycle" validate constraint "production_cycle_batch_id_fkey";

alter table "public"."production_cycle" add constraint "production_cycle_cycle_batch_key" UNIQUE using index "production_cycle_cycle_batch_key";

alter table "public"."production_cycle" add constraint "production_cycle_date_check" CHECK (((cycle_end IS NULL) OR (cycle_end >= cycle_start))) not valid;

alter table "public"."production_cycle" validate constraint "production_cycle_date_check";

alter table "public"."production_cycle" add constraint "production_cycle_end_after_start" CHECK (((cycle_end IS NULL) OR (cycle_end >= cycle_start))) not valid;

alter table "public"."production_cycle" validate constraint "production_cycle_end_after_start";

alter table "public"."production_cycle" add constraint "production_cycle_ongoing_matches_end" CHECK ((ongoing_cycle = (cycle_end IS NULL))) not valid;

alter table "public"."production_cycle" validate constraint "production_cycle_ongoing_matches_end";

alter table "public"."production_cycle" add constraint "production_cycle_previous_system_id_fkey" FOREIGN KEY (previous_system_id) REFERENCES public.system(id) not valid;

alter table "public"."production_cycle" validate constraint "production_cycle_previous_system_id_fkey";

alter table "public"."production_cycle" add constraint "production_cycle_system_id_fkey" FOREIGN KEY (system_id) REFERENCES public.system(id) ON UPDATE CASCADE not valid;

alter table "public"."production_cycle" validate constraint "production_cycle_system_id_fkey";

alter table "public"."production_cycle" add constraint "production_cycle_target_weight_g_check" CHECK ((target_weight_g > (0)::numeric)) not valid;

alter table "public"."production_cycle" validate constraint "production_cycle_target_weight_g_check";

alter table "public"."system" add constraint "system_farm_id_fkey" FOREIGN KEY (farm_id) REFERENCES public.farm(id) ON DELETE SET NULL not valid;

alter table "public"."system" validate constraint "system_farm_id_fkey";

alter table "public"."system_name_change_log" add constraint "system_name_change_log_changed_by_fkey" FOREIGN KEY (changed_by) REFERENCES auth.users(id) not valid;

alter table "public"."system_name_change_log" validate constraint "system_name_change_log_changed_by_fkey";

alter table "public"."system_name_change_log" add constraint "system_name_change_log_system_id_fkey" FOREIGN KEY (system_id) REFERENCES public.system(id) ON DELETE CASCADE not valid;

alter table "public"."system_name_change_log" validate constraint "system_name_change_log_system_id_fkey";

alter table "public"."user_profile" add constraint "user_profile_farm_id_fkey" FOREIGN KEY (farm_id) REFERENCES public.farm(id) not valid;

alter table "public"."user_profile" validate constraint "user_profile_farm_id_fkey";

alter table "public"."user_profile" add constraint "user_profile_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES public.organization(id) not valid;

alter table "public"."user_profile" validate constraint "user_profile_organization_id_fkey";

alter table "public"."user_profile" add constraint "user_profile_role_check" CHECK ((role = ANY (ARRAY['admin'::text, 'farm_manager'::text, 'system_operator'::text, 'data_analyst'::text, 'viewer'::text]))) not valid;

alter table "public"."user_profile" validate constraint "user_profile_role_check";

alter table "public"."user_profile" add constraint "user_profile_user_id_auth_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE NOT VALID not valid;

alter table "public"."user_profile" validate constraint "user_profile_user_id_auth_fkey";

alter table "public"."user_settings" add constraint "user_settings_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.user_profile(user_id) not valid;

alter table "public"."user_settings" validate constraint "user_settings_user_id_fkey";

alter table "public"."water_quality_framework" add constraint "water_quality_framework_parameter_unique" UNIQUE using index "water_quality_framework_parameter_unique";

alter table "public"."water_quality_measurement" add constraint "chk_wqm_date_time_matches_measured_at" CHECK (((date = ((measured_at AT TIME ZONE 'UTC'::text))::date) AND ("time" = ((measured_at AT TIME ZONE 'UTC'::text))::time without time zone))) not valid;

alter table "public"."water_quality_measurement" validate constraint "chk_wqm_date_time_matches_measured_at";

alter table "public"."water_quality_measurement" add constraint "water_quality_measurement_measured_at_parts_check" CHECK (((date = (measured_at)::date) AND ("time" = (measured_at)::time without time zone))) NOT VALID not valid;

alter table "public"."water_quality_measurement" validate constraint "water_quality_measurement_measured_at_parts_check";

alter table "public"."water_quality_measurement" add constraint "water_quality_measurement_parameter_fkey" FOREIGN KEY (parameter_name) REFERENCES public.water_quality_framework(parameter_name) not valid;

alter table "public"."water_quality_measurement" validate constraint "water_quality_measurement_parameter_fkey";

alter table "public"."water_quality_measurement" add constraint "water_quality_measurement_unique" UNIQUE using index "water_quality_measurement_unique";

alter table "public"."water_quality_measurement" add constraint "water_quality_measurements_system_id_fkey" FOREIGN KEY (system_id) REFERENCES public.system(id) not valid;

alter table "public"."water_quality_measurement" validate constraint "water_quality_measurements_system_id_fkey";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION analytics.debug_view_end()
 RETURNS text
 LANGUAGE plpgsql
AS $function$
DECLARE v text;
BEGIN
  v := pg_get_viewdef('analytics.production_summary'::regclass);
    RETURN substring(v, length(v) - 200);
    END $function$
;

CREATE OR REPLACE FUNCTION analytics.debug_view_update()
 RETURNS text
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_def text;
    v_inner_body text;
      v_outer_select_start int;
        v_core_body text;
          v_sampling_end int;
          BEGIN
            v_def := pg_get_viewdef('analytics.production_summary'::regclass);
              v_inner_body := substring(v_def, length('WITH _inner AS (') + 1);
                v_outer_select_start := position(E')\n SELECT _inner.' IN v_inner_body);
                  IF v_outer_select_start = 0 then    v_outer_select_start := position(') SELECT _inner.' IN v_inner_body);
                    END IF;
                      v_sampling_end := position(', boundaries_with_lag AS (' IN v_inner_body);
                        RETURN format('inner_len=%s, outer_select_pos=%s, sampling_end=%s, inner_start=%s, at_outer=%s',
                            length(v_inner_body), v_outer_select_start, v_sampling_end,
                                substring(v_inner_body, 1, 30),
                                    CASE WHEN v_outer_select_start > 0 THEN substring(v_inner_body, v_outer_select_start, 40) ELSE 'NOT FOUND' END);
                                    END $function$
;

create or replace view "analytics"."feeding_response_distribution" as  SELECT s.farm_id,
    fr.system_id,
    fr.date,
    fr.feeding_response,
    count(*) AS response_count
   FROM (public.feeding_record fr
     JOIN public.system s ON ((s.id = fr.system_id)))
  WHERE ((s.farm_id IS NOT NULL) AND (fr.feeding_response IS NOT NULL))
  GROUP BY s.farm_id, fr.system_id, fr.date, fr.feeding_response;


CREATE OR REPLACE FUNCTION analytics.update_production_summary_view()
 RETURNS void
 LANGUAGE plpgsql
AS $function$
begin
  refresh materialized view analytics.daily_system_facts;
  refresh materialized view analytics.production_summary;
end;
$function$
;

CREATE OR REPLACE FUNCTION private.app_rpc_scope_ok(p_farm_id uuid, p_system_ids bigint[] DEFAULT NULL::bigint[], p_cycle_id bigint DEFAULT NULL::bigint, p_start_date date DEFAULT NULL::date, p_end_date date DEFAULT NULL::date)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'private'
AS $function$
          BEGIN
            PERFORM private.assert_rpc_parameters(
                p_farm_id, p_system_ids, p_cycle_id, p_start_date, p_end_date
                  );
                    RETURN TRUE;
                    EXCEPTION WHEN OTHERS THEN
                      RETURN FALSE;
                      END;
                      $function$
;

CREATE OR REPLACE FUNCTION private.apply_pending_farm_user_invitations(p_user_id uuid, p_email text)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'private'
AS $function$
declare
  v_email text := lower(trim(coalesce(p_email, '')));
  v_rows int := 0;
begin
  if p_user_id is null or v_email = '' then
    return 0;
  end if;

  insert into public.farm_user (farm_id, user_id, role)
  select
    i.farm_id,
    p_user_id,
    i.role
  from private.farm_user_invitation i
  where i.email = v_email
    and i.status = 'pending'
  on conflict (farm_id, user_id) do nothing;

  update private.farm_user_invitation
  set
    status = 'accepted',
    invited_user_id = p_user_id,
    accepted_at = coalesce(accepted_at, timezone('utc', now())),
    revoked_at = null
  where email = v_email
    and status = 'pending';

  get diagnostics v_rows = row_count;

  insert into public.user_profile (
    user_id,
    email
  )
  values (
    p_user_id,
    v_email
  )
  on conflict (user_id) do update
  set
    email = coalesce(excluded.email, public.user_profile.email),
    updated_at = timezone('utc', now());

  return v_rows;
end;
$function$
;

CREATE OR REPLACE FUNCTION private.assert_rpc_parameters(p_farm_id uuid, p_system_ids bigint[] DEFAULT NULL::bigint[], p_cycle_id bigint DEFAULT NULL::bigint, p_start_date date DEFAULT NULL::date, p_end_date date DEFAULT NULL::date)
 RETURNS void
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'private'
AS $function$
            BEGIN
              -- Validate date range
                IF p_start_date IS NOT NULL AND p_end_date IS NOT NULL
                     AND p_start_date > p_end_date THEN
                         RAISE EXCEPTION 'invalid date range: start_date must be <= end_date'
                               USING ERRCODE = '22023';
                                 END IF;

                                   -- Validate each system_id belongs to this farm
                                     IF p_system_ids IS NOT NULL THEN
                                         IF EXISTS (
                                               SELECT 1 FROM unnest(p_system_ids) AS sid
                                                     WHERE NOT EXISTS (
                                                             SELECT 1 FROM public.system s
                                                                     WHERE s.id = sid AND s.farm_id = p_farm_id
                                                                           )
                                                                               ) THEN
                                                                                     RAISE EXCEPTION 'one or more system_ids do not belong to the specified farm'
                                                                                             USING ERRCODE = '42501';
                                                                                                 END IF;
                                                                                                   END IF;

                                                                                                     -- Validate cycle belongs to this farm
                                                                                                       IF p_cycle_id IS NOT NULL THEN
                                                                                                           IF NOT EXISTS (
                                                                                                                 SELECT 1 FROM public.cycle c
                                                                                                                       JOIN public.system s ON s.id = c.system_id
                                                                                                                             WHERE c.id = p_cycle_id AND s.farm_id = p_farm_id
                                                                                                                                 ) THEN
                                                                                                                                       RAISE EXCEPTION 'cycle_id does not belong to the specified farm'
                                                                                                                                               USING ERRCODE = '42501';
                                                                                                                                                   END IF;
                                                                                                                                                     END IF;
                                                                                                                                                     END;
                                                                                                                                                     $function$
;

CREATE OR REPLACE FUNCTION private.has_farm_role(farm uuid, roles text[])
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'private'
AS $function$
      SELECT EXISTS (
          SELECT 1
              FROM public.farm_user fu
                  WHERE fu.farm_id = farm
                        AND fu.user_id = (SELECT auth.uid())
                              AND fu.role = ANY(roles)
                                );
                                $function$
;

CREATE OR REPLACE FUNCTION private.has_farm_role(farm uuid, roles text[], _user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'private'
AS $function$
                                        SELECT EXISTS (
                                            SELECT 1
                                                FROM public.farm_user fu
                                                    WHERE fu.farm_id = farm
                                                          AND fu.user_id = _user_id
                                                                AND fu.role = ANY(roles)
                                                                  );
                                                                  $function$
;

CREATE OR REPLACE FUNCTION private.is_farm_member(farm uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'private'
AS $function$
                                                                      SELECT EXISTS (
                                                                          SELECT 1
                                                                              FROM public.farm_user fu
                                                                                  WHERE fu.farm_id = farm
                                                                                        AND fu.user_id = (SELECT auth.uid())
                                                                                          );
                                                                                          $function$
;

CREATE OR REPLACE FUNCTION private.is_farm_member(farm uuid, _user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'private'
AS $function$
                                                                                                SELECT EXISTS (
                                                                                                    SELECT 1
                                                                                                        FROM public.farm_user fu
                                                                                                            WHERE fu.farm_id = farm
                                                                                                                  AND fu.user_id = _user_id
                                                                                                                    );
                                                                                                                    $function$
;

CREATE OR REPLACE FUNCTION private.set_fish_mortality_farm_id()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'private'
AS $function$
              BEGIN
                IF NEW.farm_id IS NULL OR (TG_OP = 'UPDATE' AND NEW.system_id IS DISTINCT FROM OLD.system_id) THEN
                    SELECT s.farm_id INTO NEW.farm_id FROM public.system s WHERE s.id = NEW.system_id;
                      END IF;
                        RETURN NEW;
                        END;
                        $function$
;

CREATE OR REPLACE FUNCTION private.set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  new.updated_at = now();
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.after_event_queue_new()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
BEGIN
  IF TG_TABLE_NAME = 'fish_transfer' THEN
    INSERT INTO public._affected_systems (system_id)
    SELECT DISTINCT sid FROM (
      SELECT origin_system_id AS sid FROM new_rows WHERE origin_system_id IS NOT NULL
      UNION ALL
      SELECT target_system_id AS sid FROM new_rows WHERE target_system_id IS NOT NULL
    ) x ON CONFLICT (system_id) DO NOTHING;
  ELSE
    INSERT INTO public._affected_systems (system_id)
    SELECT DISTINCT system_id FROM new_rows WHERE system_id IS NOT NULL
    ON CONFLICT (system_id) DO NOTHING;
  END IF;
  RETURN NULL;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.after_event_queue_old()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
BEGIN
  IF TG_TABLE_NAME = 'fish_transfer' THEN
    INSERT INTO public._affected_systems (system_id)
    SELECT DISTINCT sid FROM (
      SELECT origin_system_id AS sid FROM old_rows WHERE origin_system_id IS NOT NULL
      UNION ALL
      SELECT target_system_id AS sid FROM old_rows WHERE target_system_id IS NOT NULL
    ) x ON CONFLICT (system_id) DO NOTHING;
  ELSE
    INSERT INTO public._affected_systems (system_id)
    SELECT DISTINCT system_id FROM old_rows WHERE system_id IS NOT NULL
    ON CONFLICT (system_id) DO NOTHING;
  END IF;
  RETURN NULL;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.after_event_update_inventory()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_origin_id bigint;
  v_target_id bigint;
  v_system_id bigint;
BEGIN
  IF tg_table_name = 'fish_transfer' THEN
    v_origin_id := COALESCE(NEW.origin_system_id, OLD.origin_system_id);
    v_target_id := COALESCE(NEW.target_system_id, OLD.target_system_id);
    IF v_origin_id IS NOT NULL THEN
      INSERT INTO public._affected_systems (system_id)
      VALUES (v_origin_id)
      ON CONFLICT (system_id) DO NOTHING;
    END IF;
    IF v_target_id IS NOT NULL THEN
      INSERT INTO public._affected_systems (system_id)
      VALUES (v_target_id)
      ON CONFLICT (system_id) DO NOTHING;
    END IF;
  ELSE
    v_system_id := COALESCE(NEW.system_id, OLD.system_id);
    IF v_system_id IS NOT NULL THEN
      INSERT INTO public._affected_systems (system_id)
      VALUES (v_system_id)
      ON CONFLICT (system_id) DO NOTHING;
    END IF;
  END IF;
  RETURN NULL;
END;
$function$
;

create or replace view "public"."api_alert_thresholds" as  SELECT at.id,
    at.scope,
    at.farm_id,
    at.system_id,
    at.low_do_threshold,
    at.high_ammonia_threshold,
    at.high_mortality_threshold,
    at.low_sgr_threshold,
    at.low_survival_pct,
    at.critical_survival_pct,
    at.created_at,
    at.updated_at
   FROM public.alert_threshold at
  WHERE (((at.farm_id IS NOT NULL) AND (EXISTS ( SELECT 1
           FROM public.farm_user fu
          WHERE ((fu.farm_id = at.farm_id) AND (fu.user_id = auth.uid()))))) OR ((at.system_id IS NOT NULL) AND (EXISTS ( SELECT 1
           FROM (public.system s
             JOIN public.farm_user fu ON ((fu.farm_id = s.farm_id)))
          WHERE ((s.id = at.system_id) AND (fu.user_id = auth.uid()))))) OR (at.scope = 'default'::text));


CREATE OR REPLACE FUNCTION public.api_batch_system_ids(p_batch_id bigint)
 RETURNS TABLE(system_id bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
  with recursive
  batch as (
    select fb.id, fb.farm_id
    from public.fingerling_batch fb
    where fb.id = p_batch_id
      and private.is_farm_member(fb.farm_id)
  ),
  direct_systems as (
    select pc.system_id::bigint as system_id
    from public.production_cycle pc
    join batch b on b.id = pc.batch_id
    where pc.system_id is not null

    union
    select fs.system_id::bigint
    from public.fish_stocking fs
    join batch b on b.id = fs.batch_id
    where fs.system_id is not null

    union
    select fr.system_id::bigint
    from public.feeding_record fr
    join batch b on b.id = fr.batch_id
    where fr.system_id is not null

    union
    select sw.system_id::bigint
    from public.fish_sampling_weight sw
    join batch b on b.id = sw.batch_id
    where sw.system_id is not null

    union
    select fm.system_id::bigint
    from public.fish_mortality fm
    join batch b on b.id = fm.batch_id
    where fm.system_id is not null

    union
    select fh.system_id::bigint
    from public.fish_harvest fh
    join batch b on b.id = fh.batch_id
    where fh.system_id is not null

    union
    select ft.origin_system_id::bigint
    from public.fish_transfer ft
    join batch b on b.id = ft.batch_id
    where ft.origin_system_id is not null

    union
    select ft.target_system_id::bigint
    from public.fish_transfer ft
    join batch b on b.id = ft.batch_id
    where ft.target_system_id is not null
  ),
  lineage(system_id, depth) as (
    select ds.system_id, 0
    from direct_systems ds

    union
    select ft.target_system_id::bigint, l.depth + 1
    from lineage l
    join public.fish_transfer ft on ft.origin_system_id = l.system_id
    join batch b on b.id = ft.batch_id
    where ft.target_system_id is not null
      and l.depth < 12
  )
  select distinct s.id::bigint as system_id
  from lineage l
  join public.system s on s.id = l.system_id
  join batch b on b.farm_id = s.farm_id
  where s.is_active = true
  order by s.id;
$function$
;

create or replace view "public"."api_daily_water_quality_rating" as  SELECT dwr.system_id,
    s.farm_id,
    s.name AS system_name,
    dwr.rating_date,
    dwr.rating,
    dwr.rating_numeric,
    dwr.worst_parameter,
    (dwr.worst_parameter)::text AS worst_parameter_normalized,
    dwr.worst_parameter_value,
    dwr.worst_parameter_unit,
    ( SELECT avg(wqm.parameter_value) AS avg
           FROM public.water_quality_measurement wqm
          WHERE ((wqm.system_id = dwr.system_id) AND (wqm.date = dwr.rating_date) AND (wqm.parameter_name = 'temperature'::public.water_quality_parameters))) AS temperature_average,
    dwr.created_at
   FROM (public.daily_water_quality_rating dwr
     JOIN public.system s ON ((s.id = dwr.system_id)))
  WHERE (EXISTS ( SELECT 1
           FROM public.user_profile up
          WHERE ((up.user_id = auth.uid()) AND (up.farm_id = s.farm_id) AND (up.role = ANY (ARRAY['admin'::text, 'farm_manager'::text, 'system_operator'::text])))));


CREATE OR REPLACE FUNCTION public.api_dashboard_batches(p_farm_id uuid, p_batch_ids bigint[] DEFAULT NULL::bigint[], p_stage public.system_growth_stage DEFAULT NULL::public.system_growth_stage, p_start_date date DEFAULT NULL::date, p_end_date date DEFAULT NULL::date)
 RETURNS TABLE(batch_id bigint, batch_name text, growth_stage public.system_growth_stage, system_ids bigint[], system_count integer, input_start_date date, input_end_date date, as_of_date date, fish_end double precision, biomass_end double precision, sampling_end_date date, sample_age_days integer, efcr double precision, efcr_latest_date date, efcr_arrow text, feed_total double precision, abw double precision, abw_latest_date date, abw_arrow text, feeding_rate double precision, feeding_rate_latest_date date, feeding_rate_arrow text, mortality_rate double precision, mortality_rate_latest_date date, mortality_rate_arrow text, biomass_density double precision, biomass_density_latest_date date, biomass_density_arrow text, sgr double precision, agr double precision, sgr_arrow text, agr_arrow text, missing_days_count integer, water_quality_rating_average text, water_quality_rating_numeric_average double precision, water_quality_latest_date date, water_quality_arrow text, worst_parameter text, worst_parameter_value double precision, worst_parameter_unit text, cycle_day integer, target_weight_g double precision, target_weight_progress_pct double precision, is_complete boolean)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'analytics', 'private'
AS $function$
with batches_all as (
  select fb.id as batch_id,
         coalesce(nullif(fb.name, ''), 'Batch #' || fb.id::text) as batch_name
  from public.fingerling_batch fb
  where fb.farm_id = p_farm_id
    and private.app_rpc_scope_ok(p_farm_id, null::bigint[], null::bigint, p_start_date, p_end_date)
    and (p_batch_ids is null or fb.id = any(p_batch_ids))
),
data_anchor as (
  select coalesce(max(dsf.inventory_date), current_date) as last_data_date
  from analytics.daily_system_facts dsf
  join batches_all b on b.batch_id = dsf.batch_id
),
bounds as (
  select
    coalesce(p_start_date, da.last_data_date - interval '30 days')::date as start_date,
    coalesce(p_end_date, da.last_data_date)::date as end_date
  from data_anchor da
),
period_meta as (
  select b.start_date, b.end_date,
         greatest((b.end_date - b.start_date + 1)::integer, 1) as period_days
  from bounds b
),
periods as (
  select 'current'::text as period_label, pm.start_date, pm.end_date from period_meta pm
  union all
  select 'previous'::text, (pm.start_date - pm.period_days)::date, (pm.start_date - 1)::date
  from period_meta pm
),
batch_flows as (
  select fs.batch_id, fs.system_id, fs.number_of_fish_stocking::double precision as qty_delta
  from public.fish_stocking fs
  join batches_all b on b.batch_id = fs.batch_id
  where fs.system_id is not null and fs.date <= (select end_date from bounds)
  union all
  select ft.batch_id, ft.target_system_id, ft.number_of_fish_transfer::double precision
  from public.fish_transfer ft
  join batches_all b on b.batch_id = ft.batch_id
  where ft.target_system_id is not null and ft.date <= (select end_date from bounds)
  union all
  select ft.batch_id, ft.origin_system_id, -ft.number_of_fish_transfer::double precision
  from public.fish_transfer ft
  join batches_all b on b.batch_id = ft.batch_id
  where ft.origin_system_id is not null and ft.date <= (select end_date from bounds)
  union all
  select fm.batch_id, fm.system_id, -fm.number_of_fish_mortality::double precision
  from public.fish_mortality fm
  join batches_all b on b.batch_id = fm.batch_id
  where fm.system_id is not null and fm.date <= (select end_date from bounds)
  union all
  select fh.batch_id, fh.system_id, -coalesce(fh.number_of_fish_harvest, 0)::double precision
  from public.fish_harvest fh
  join batches_all b on b.batch_id = fh.batch_id
  where fh.system_id is not null and fh.date <= (select end_date from bounds)
),
batch_system_balance as (
  select batch_id, system_id, sum(qty_delta) as fish_balance
  from batch_flows
  group by batch_id, system_id
  having sum(qty_delta) > 0
),
batch_systems as (
  select bsb.batch_id, bsb.system_id, s.growth_stage
  from batch_system_balance bsb
  join public.system s on s.id = bsb.system_id
  where s.farm_id = p_farm_id
    and s.is_active = true
    and coalesce(s.cage_status, 'occupied'::public.cage_status_enum) <> 'retired'::public.cage_status_enum
),
batch_meta as (
  select
    bs.batch_id,
    array_agg(distinct bs.system_id order by bs.system_id) as system_ids,
    count(distinct bs.system_id)::integer as system_count,
    case when count(distinct bs.growth_stage) = 1 then min(bs.growth_stage) else null end as growth_stage
  from batch_systems bs
  group by bs.batch_id
),
batch as (
  select ba.batch_id, ba.batch_name, bm.system_ids, bm.system_count, bm.growth_stage
  from batches_all ba
  join batch_meta bm on bm.batch_id = ba.batch_id
  where p_stage is null
     or exists (select 1 from batch_systems bs2 where bs2.batch_id = ba.batch_id and bs2.growth_stage = p_stage)
),
inv_daily as (
  select
    p.period_label,
    dsf.inventory_date,
    dsf.batch_id,
    sum(dsf.number_of_fish) as fish_count,
    sum(dsf.biomass_last_sampling) as biomass,
    case when sum(dsf.biomass_last_sampling) > 0
      then sum(coalesce(dsf.abw_last_sampling,0) * coalesce(dsf.biomass_last_sampling,0)) / sum(dsf.biomass_last_sampling)
      else avg(dsf.abw_last_sampling)
    end as abw,
    max(dsf.last_abw_date) as sampling_end_date,
    case when sum(dsf.biomass_last_sampling) > 0
      then sum(coalesce(dsf.feeding_rate,0) * coalesce(dsf.biomass_last_sampling,0)) / sum(dsf.biomass_last_sampling)
      else avg(dsf.feeding_rate)
    end as feeding_rate,
    case when sum(dsf.number_of_fish) > 0
      then sum(coalesce(dsf.mortality_rate,0) * coalesce(dsf.number_of_fish,0)) / sum(dsf.number_of_fish)
      else avg(dsf.mortality_rate)
    end as mortality_rate,
    avg(dsf.biomass_density) as biomass_density
  from periods p
  join analytics.daily_system_facts dsf
    on dsf.inventory_date between p.start_date and p.end_date
  join batches_all b on b.batch_id = dsf.batch_id
  group by p.period_label, dsf.inventory_date, dsf.batch_id
),
inv_snapshot as (
  select distinct on (period_label, batch_id)
    period_label, batch_id, inventory_date,
    fish_count as fish_end, biomass as biomass_end, abw,
    sampling_end_date, feeding_rate, mortality_rate, biomass_density
  from inv_daily
  order by period_label, batch_id, inventory_date desc
),
inv_latest as (select * from inv_snapshot where period_label = 'current'),
inv_prev as (select * from inv_snapshot where period_label = 'previous'),
inv_agg as (
  select batch_id, count(distinct inventory_date)::integer as days_present
  from inv_daily
  where period_label = 'current'
  group by batch_id
),
inv_period_metrics as (
  select
    period_label, batch_id,
    case when sum(coalesce(fish_count,0)) > 0
      then sum(coalesce(mortality_rate,0) * coalesce(fish_count,0)) / sum(fish_count)
      else avg(mortality_rate)
    end as mortality_rate_period,
    avg(biomass_density) as biomass_density_period,
    case when sum(coalesce(biomass,0)) > 0
      then sum(coalesce(feeding_rate,0) * coalesce(biomass,0)) / sum(biomass)
      else avg(feeding_rate)
    end as feeding_rate_period
  from inv_daily
  group by period_label, batch_id
),
inv_current_metrics as (select * from inv_period_metrics where period_label = 'current'),
inv_prev_metrics as (select * from inv_period_metrics where period_label = 'previous'),
ps_window as (
  select p.period_label, pc.batch_id, ps.date, ps.feed_over_period, ps.biomass_increase_over_period,
         ps.sgr, ps.agr, ps.days_in_period
  from periods p
  join analytics.production_summary ps on ps.date between p.start_date and p.end_date
  join public.production_cycle pc on pc.cycle_id = ps.cycle_id
  join batches_all b on b.batch_id = pc.batch_id
),
ps_daily as (
  select
    period_label, batch_id, date,
    sum(coalesce(feed_over_period,0))::double precision as feed_over_period,
    greatest(sum(coalesce(biomass_increase_over_period,0)),0)::double precision as biomass_increase_over_period,
    case when sum(case when sgr is not null then greatest(coalesce(biomass_increase_over_period,0),0) else 0 end) > 0
      then sum(coalesce(sgr,0) * greatest(coalesce(biomass_increase_over_period,0),0))
           / sum(case when sgr is not null then greatest(coalesce(biomass_increase_over_period,0),0) else 0 end)
      else null
    end::double precision as sgr,
    case when sum(case when agr is not null then greatest(coalesce(biomass_increase_over_period,0),0) else 0 end) > 0
      then sum(coalesce(agr,0) * greatest(coalesce(biomass_increase_over_period,0),0))
           / sum(case when agr is not null then greatest(coalesce(biomass_increase_over_period,0),0) else 0 end)
      else null
    end::double precision as agr,
    max(days_in_period)::integer as days_in_period
  from ps_window
  group by period_label, batch_id, date
),
ps_ranked as (
  select *, row_number() over (partition by period_label, batch_id order by date desc) as rn
  from ps_daily
),
ps_latest as (
  select * from ps_ranked where period_label = 'current' and rn = 1
),
ps_period_metrics as (
  select
    period_label, batch_id,
    sum(coalesce(feed_over_period,0))::double precision as feed_total,
    sum(coalesce(feed_over_period,0))::double precision as total_feed_period,
    sum(coalesce(biomass_increase_over_period,0))::double precision as total_growth_period,
    case when sum(case when sgr is not null then days_in_period else 0 end) > 0
      then sum(case when sgr is not null then sgr * days_in_period else 0 end)
           / nullif(sum(case when sgr is not null then days_in_period else 0 end), 0)
      else null
    end::double precision as sgr_period,
    case when sum(case when agr is not null then days_in_period else 0 end) > 0
      then sum(case when agr is not null then agr * days_in_period else 0 end)
           / nullif(sum(case when agr is not null then days_in_period else 0 end), 0)
      else null
    end::double precision as agr_period
  from ps_daily
  group by period_label, batch_id
),
ps_current_metrics as (
  select period_label, batch_id, feed_total,
    case when total_growth_period > 0 then (total_feed_period/total_growth_period)::double precision else null::double precision end as efcr_period,
    sgr_period, agr_period
  from ps_period_metrics where period_label = 'current'
),
ps_prev_metrics as (
  select period_label, batch_id, feed_total,
    case when total_growth_period > 0 then (total_feed_period/total_growth_period)::double precision else null::double precision end as efcr_period,
    sgr_period, agr_period
  from ps_period_metrics where period_label = 'previous'
),
wq_window as (
  select p.period_label, bs.batch_id, wq.rating_date, wq.rating_numeric,
         wq.worst_parameter, wq.worst_parameter_value, wq.worst_parameter_unit,
         wq.created_at, wq.id
  from periods p
  join public.daily_water_quality_rating wq on wq.rating_date between p.start_date and p.end_date
  join batch_systems bs on bs.system_id = wq.system_id
),
wq_avg as (
  select
    period_label, batch_id,
    avg(rating_numeric::double precision) as rating_numeric_avg,
    case
      when avg(rating_numeric::double precision) >= 2.5 then 'Optimal'
      when avg(rating_numeric::double precision) >= 1.5 then 'Acceptable'
      when avg(rating_numeric::double precision) >= 0.5 then 'Critical'
      else 'Lethal'
    end as rating_label_avg
  from wq_window
  group by period_label, batch_id
),
wq_current_avg as (select * from wq_avg where period_label = 'current'),
wq_prev_avg as (select * from wq_avg where period_label = 'previous'),
wq_ranked as (
  select
    wq.period_label, wq.batch_id, wq.rating_date,
    wq.worst_parameter, wq.worst_parameter_value, wq.worst_parameter_unit,
    row_number() over (
      partition by wq.period_label, wq.batch_id
      order by wq.rating_date desc, wq.rating_numeric asc, wq.created_at desc, wq.id desc
    ) as rn
  from wq_window wq
),
wq_latest as (select * from wq_ranked where period_label = 'current' and rn = 1),
batch_cycles as (
  select pc.batch_id, min(pc.cycle_start) as cycle_start, max(pc.target_weight_g) as target_weight_g
  from public.production_cycle pc
  join batch_systems bs on bs.system_id = pc.system_id and bs.batch_id = pc.batch_id
  where pc.ongoing_cycle = true
  group by pc.batch_id
)
select
  batch.batch_id,
  batch.batch_name,
  batch.growth_stage,
  batch.system_ids,
  batch.system_count,
  b.start_date as input_start_date,
  b.end_date as input_end_date,
  b.end_date as as_of_date,
  inv_latest.fish_end,
  inv_latest.biomass_end,
  inv_latest.sampling_end_date,
  case when inv_latest.sampling_end_date is null then null
       else (b.end_date - inv_latest.sampling_end_date)::integer
  end as sample_age_days,
  case when ps_latest.biomass_increase_over_period > 0
       then (ps_latest.feed_over_period / ps_latest.biomass_increase_over_period)::double precision
       else null::double precision
  end as efcr,
  ps_latest.date as efcr_latest_date,
  case
    when ps_current_metrics.efcr_period is null or ps_prev_metrics.efcr_period is null then null
    when ps_current_metrics.efcr_period = ps_prev_metrics.efcr_period then 'straight'
    when ps_current_metrics.efcr_period > ps_prev_metrics.efcr_period then 'up'
    else 'down'
  end as efcr_arrow,
  ps_current_metrics.feed_total,
  inv_latest.abw,
  inv_latest.sampling_end_date as abw_latest_date,
  case
    when inv_latest.abw is null or inv_prev.abw is null then null
    when inv_latest.abw = inv_prev.abw then 'straight'
    when inv_latest.abw > inv_prev.abw then 'up'
    else 'down'
  end as abw_arrow,
  inv_current_metrics.feeding_rate_period as feeding_rate,
  inv_latest.inventory_date as feeding_rate_latest_date,
  case
    when inv_current_metrics.feeding_rate_period is null or inv_prev_metrics.feeding_rate_period is null then null
    when inv_current_metrics.feeding_rate_period = inv_prev_metrics.feeding_rate_period then 'straight'
    when inv_current_metrics.feeding_rate_period > inv_prev_metrics.feeding_rate_period then 'up'
    else 'down'
  end as feeding_rate_arrow,
  inv_latest.mortality_rate,
  inv_latest.inventory_date as mortality_rate_latest_date,
  case
    when inv_current_metrics.mortality_rate_period is null or inv_prev_metrics.mortality_rate_period is null then null
    when inv_current_metrics.mortality_rate_period = inv_prev_metrics.mortality_rate_period then 'straight'
    when inv_current_metrics.mortality_rate_period > inv_prev_metrics.mortality_rate_period then 'up'
    else 'down'
  end as mortality_rate_arrow,
  inv_latest.biomass_density,
  inv_latest.inventory_date as biomass_density_latest_date,
  case
    when inv_current_metrics.biomass_density_period is null or inv_prev_metrics.biomass_density_period is null then null
    when inv_current_metrics.biomass_density_period = inv_prev_metrics.biomass_density_period then 'straight'
    when inv_current_metrics.biomass_density_period > inv_prev_metrics.biomass_density_period then 'up'
    else 'down'
  end as biomass_density_arrow,
  ps_current_metrics.sgr_period as sgr,
  ps_current_metrics.agr_period as agr,
  case
    when ps_current_metrics.sgr_period is null or ps_prev_metrics.sgr_period is null then null
    when ps_current_metrics.sgr_period > ps_prev_metrics.sgr_period then 'up'
    when ps_current_metrics.sgr_period < ps_prev_metrics.sgr_period then 'down'
    else 'straight'
  end as sgr_arrow,
  case
    when ps_current_metrics.agr_period is null or ps_prev_metrics.agr_period is null then null
    when ps_current_metrics.agr_period > ps_prev_metrics.agr_period then 'up'
    when ps_current_metrics.agr_period < ps_prev_metrics.agr_period then 'down'
    else 'straight'
  end as agr_arrow,
  greatest(0, (b.end_date - b.start_date + 1)::integer - coalesce(inv_agg.days_present, 0)) as missing_days_count,
  wq_current_avg.rating_label_avg as water_quality_rating_average,
  wq_current_avg.rating_numeric_avg as water_quality_rating_numeric_average,
  wq_latest.rating_date as water_quality_latest_date,
  case
    when wq_current_avg.rating_numeric_avg is null or wq_prev_avg.rating_numeric_avg is null then null
    when wq_current_avg.rating_numeric_avg = wq_prev_avg.rating_numeric_avg then 'straight'
    when wq_current_avg.rating_numeric_avg > wq_prev_avg.rating_numeric_avg then 'up'
    else 'down'
  end as water_quality_arrow,
  wq_latest.worst_parameter,
  wq_latest.worst_parameter_value,
  wq_latest.worst_parameter_unit,
  case when bc.cycle_start is null then null else (b.end_date - bc.cycle_start)::integer end as cycle_day,
  bc.target_weight_g::double precision as target_weight_g,
  case
    when bc.target_weight_g is not null and inv_latest.abw is not null
    then round((inv_latest.abw / bc.target_weight_g::double precision * 100)::numeric, 1)::double precision
    else null
  end as target_weight_progress_pct,
  case
    when inv_latest.fish_end is not null and inv_latest.fish_end > 0
     and inv_latest.biomass_end is not null
     and ps_current_metrics.feed_total is not null
     and ps_latest.biomass_increase_over_period is not null and ps_latest.biomass_increase_over_period > 0
     and inv_latest.abw is not null
     and inv_latest.biomass_density is not null
    then true else false
  end as is_complete
from batch
cross join bounds b
left join inv_latest on inv_latest.batch_id = batch.batch_id
left join inv_prev on inv_prev.batch_id = batch.batch_id
left join inv_agg on inv_agg.batch_id = batch.batch_id
left join ps_latest on ps_latest.batch_id = batch.batch_id
left join inv_current_metrics on inv_current_metrics.batch_id = batch.batch_id
left join inv_prev_metrics on inv_prev_metrics.batch_id = batch.batch_id
left join ps_current_metrics on ps_current_metrics.batch_id = batch.batch_id
left join ps_prev_metrics on ps_prev_metrics.batch_id = batch.batch_id
left join wq_current_avg on wq_current_avg.batch_id = batch.batch_id
left join wq_prev_avg on wq_prev_avg.batch_id = batch.batch_id
left join wq_latest on wq_latest.batch_id = batch.batch_id
left join batch_cycles bc on bc.batch_id = batch.batch_id
order by batch.batch_name;
$function$
;

CREATE OR REPLACE FUNCTION public.api_dashboard_consolidated(p_farm_id uuid, p_system_ids bigint[] DEFAULT NULL::bigint[], p_stage public.system_growth_stage DEFAULT NULL::public.system_growth_stage, p_start_date date DEFAULT NULL::date, p_end_date date DEFAULT NULL::date, p_time_period text DEFAULT NULL::text, p_limit integer DEFAULT NULL::integer, p_order_desc boolean DEFAULT true)
 RETURNS TABLE(system_id bigint, time_period text, input_start_date date, input_end_date date, efcr_period_consolidated double precision, efcr_period_consolidated_delta double precision, mortality_rate double precision, mortality_rate_delta double precision, abw_asof_end double precision, abw_asof_end_delta double precision, total_biomass double precision, total_biomass_delta double precision, biomass_density double precision, biomass_density_delta double precision, feeding_rate double precision, feeding_rate_delta double precision, sgr double precision, sgr_delta double precision, agr double precision, agr_delta double precision, water_quality_rating_average text, water_quality_rating_numeric_average double precision, water_quality_rating_numeric_delta double precision)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'analytics', 'private'
AS $function$
with sys as (
select s.id as system_id
from public.system s
where s.farm_id = p_farm_id
and private.app_rpc_scope_ok(p_farm_id, p_system_ids, null::bigint, p_start_date, p_end_date)
and s.is_active = true
and coalesce(s.cage_status, 'occupied'::public.cage_status_enum) <> 'retired'::public.cage_status_enum
and (p_stage is null or s.growth_stage = p_stage)
and (p_system_ids is null or s.id = any(p_system_ids))
),
data_anchor as (
select coalesce(max(dsf.inventory_date), current_date) as last_data_date
from analytics.daily_system_facts dsf
join sys on sys.system_id = dsf.system_id
),
bounds as (
select
coalesce(p_start_date, da.last_data_date - interval '30 days')::date as start_date,
coalesce(p_end_date, da.last_data_date)::date as end_date
from data_anchor da
),
period_meta as (
select
b.start_date,
b.end_date,
greatest((b.end_date - b.start_date + 1)::integer, 1) as period_days
from bounds b
),
periods as (
select 'current'::text as period_label, pm.start_date, pm.end_date
from period_meta pm
union all
select 'previous'::text as period_label,
(pm.start_date - pm.period_days)::date as start_date,
(pm.start_date - 1)::date as end_date
from period_meta pm
),
inv as (
select p.period_label, dsf.*
from periods p
join analytics.daily_system_facts dsf
on dsf.inventory_date between p.start_date and p.end_date
join sys on sys.system_id = dsf.system_id
),
snap as (
select distinct on (period_label, system_id)
period_label,
system_id,
abw_last_sampling,
biomass_last_sampling,
number_of_fish
from inv
order by period_label, system_id, inventory_date desc
),
ps_period as (
select
p.period_label,
ps.system_id,
ps.feed_over_period,
ps.biomass_increase_over_period,
ps.sgr,
ps.agr,
ps.days_in_period
from periods p
join analytics.production_summary ps
on ps.date between p.start_date and p.end_date
join sys on sys.system_id = ps.system_id
),
efcr_period_calc as (
select
period_label,
sum(feed_over_period) as total_feed_period,
sum(greatest(biomass_increase_over_period, 0)) as total_growth_period
from ps_period
group by period_label
),
ps_sgr_per_system as (
select
pp.period_label,
pp.system_id,
case
when sum(case when pp.sgr > 0 then pp.days_in_period else 0 end) > 0
then sum(case when pp.sgr > 0 then pp.sgr * pp.days_in_period else 0 end)
/ nullif(sum(case when pp.sgr > 0 then pp.days_in_period else 0 end), 0)
else null
end::double precision as sgr_system,
case
when sum(case when pp.agr > 0 then pp.days_in_period else 0 end) > 0
then sum(case when pp.agr > 0 then pp.agr * pp.days_in_period else 0 end)
/ nullif(sum(case when pp.agr > 0 then pp.days_in_period else 0 end), 0)
else null
end::double precision as agr_system
from ps_period pp
group by pp.period_label, pp.system_id
),
sgr_agg_calc as (
select
sg.period_label,
case
when sum(case when sg.sgr_system is not null
then coalesce(s.biomass_last_sampling, 0) else 0 end) > 0
then sum(coalesce(sg.sgr_system, 0) * coalesce(s.biomass_last_sampling, 0))
/ nullif(sum(case when sg.sgr_system is not null
then coalesce(s.biomass_last_sampling, 0) else 0 end), 0)
else null
end::double precision as sgr_weighted,
case
when sum(case when sg.agr_system is not null
then coalesce(s.biomass_last_sampling, 0) else 0 end) > 0
then sum(coalesce(sg.agr_system, 0) * coalesce(s.biomass_last_sampling, 0))
/ nullif(sum(case when sg.agr_system is not null
then coalesce(s.biomass_last_sampling, 0) else 0 end), 0)
else null
end::double precision as agr_weighted
from ps_sgr_per_system sg
join snap s
on s.system_id = sg.system_id
and s.period_label = sg.period_label
group by sg.period_label
),
ps_latest as (
select distinct on (p.period_label, ps.system_id)
p.period_label,
ps.system_id,
ps.cycle_id,
ps.feed_aggregated,
ps.cumulative_biomass,
ps.number_of_fish_end
from periods p
join analytics.production_summary ps
on ps.date between p.start_date and p.end_date
join sys on sys.system_id = ps.system_id
order by p.period_label, ps.system_id, ps.date desc
),
one_per_cycle as (
select distinct on (period_label, cycle_id)
period_label,
cycle_id,
feed_aggregated,
cumulative_biomass
from ps_latest
where cumulative_biomass > 0
order by period_label, cycle_id, number_of_fish_end desc nulls last
),
efcr_agg_calc as (
select
period_label,
sum(feed_aggregated) as total_feed_agg,
sum(cumulative_biomass) as total_growth_agg
from one_per_cycle
group by period_label
),
wq as (
select p.period_label, wq_row.*
from periods p
join public.daily_water_quality_rating wq_row
on wq_row.rating_date between p.start_date and p.end_date
join sys on sys.system_id = wq_row.system_id
),
agg as (
select
p.period_label,
case
when ep.total_growth_period > 0
then (ep.total_feed_period / ep.total_growth_period)::double precision
else null::double precision
end as efcr_period,
case
when ea.total_growth_agg > 0
then (ea.total_feed_agg / ea.total_growth_agg)::double precision
else null::double precision
end as efcr_aggregated,
(
select case
when sum(coalesce(number_of_fish, 0)) > 0
then sum(coalesce(mortality_rate, 0) * coalesce(number_of_fish, 0))
/ sum(coalesce(number_of_fish, 0))
else avg(mortality_rate)
end
from inv i where i.period_label = p.period_label
) as mortality,
(
select case
when sum(coalesce(number_of_fish, 0)) > 0
then sum(coalesce(abw_last_sampling, 0) * coalesce(number_of_fish, 0))
/ nullif(sum(coalesce(number_of_fish, 0)), 0)
else avg(abw_last_sampling)
end
from snap s
where s.period_label = p.period_label and s.abw_last_sampling is not null
) as abw,
(
select sum(coalesce(biomass_last_sampling, 0))
from snap s where s.period_label = p.period_label
) as biomass,
(
select avg(biomass_density)
from inv i where i.period_label = p.period_label and i.biomass_density is not null
) as density,
(
select case
when sum(coalesce(biomass_last_sampling, 0)) > 0
then sum(coalesce(feeding_rate, 0) * coalesce(biomass_last_sampling, 0))
/ sum(coalesce(biomass_last_sampling, 0))
else avg(feeding_rate)
end
from inv i where i.period_label = p.period_label
) as feeding,
(
select avg(rating_numeric::double precision)
from wq w where w.period_label = p.period_label
) as wq_numeric,
sa.sgr_weighted as sgr,
sa.agr_weighted as agr
from periods p
left join efcr_period_calc ep on ep.period_label = p.period_label
left join efcr_agg_calc ea on ea.period_label = p.period_label
left join sgr_agg_calc sa on sa.period_label = p.period_label
),
current_agg as (select * from agg where period_label = 'current'),
previous_agg as (select * from agg where period_label = 'previous')
select
null::bigint as system_id,
coalesce(p_time_period, 'custom')::text as time_period,
b.start_date as input_start_date,
b.end_date as input_end_date,
cur.efcr_period as efcr_period_consolidated,
case
when cur.efcr_period is null or prev.efcr_period is null then null::double precision
else cur.efcr_period - prev.efcr_period
end as efcr_period_consolidated_delta,
cur.mortality as mortality_rate,
case
when cur.mortality is null or prev.mortality is null then null::double precision
else cur.mortality - prev.mortality
end as mortality_rate_delta,
cur.abw as abw_asof_end,
case
when cur.abw is null or prev.abw is null then null::double precision
else cur.abw - prev.abw
end as abw_asof_end_delta,
cur.biomass as total_biomass,
case
when cur.biomass is null or prev.biomass is null then null::double precision
else cur.biomass - prev.biomass
end as total_biomass_delta,
cur.density as biomass_density,
case
when cur.density is null or prev.density is null then null::double precision
else cur.density - prev.density
end as biomass_density_delta,
cur.feeding as feeding_rate,
case
when cur.feeding is null or prev.feeding is null then null::double precision
else cur.feeding - prev.feeding
end as feeding_rate_delta,
cur.sgr,
case
when cur.sgr is null or prev.sgr is null then null::double precision
else cur.sgr - prev.sgr
end as sgr_delta,
cur.agr,
case
when cur.agr is null or prev.agr is null then null::double precision
else cur.agr - prev.agr
end as agr_delta,
case
when cur.wq_numeric >= 2.5 then 'Optimal'
when cur.wq_numeric >= 1.5 then 'Acceptable'
when cur.wq_numeric >= 0.5 then 'Critical'
when cur.wq_numeric is not null then 'Lethal'
else null
end as water_quality_rating_average,
cur.wq_numeric as water_quality_rating_numeric_average,
case
when cur.wq_numeric is null or prev.wq_numeric is null then null::double precision
else cur.wq_numeric - prev.wq_numeric
end as water_quality_rating_numeric_delta
from current_agg cur
left join previous_agg prev on true
cross join bounds b;
$function$
;

CREATE OR REPLACE FUNCTION public.api_dashboard_systems(p_farm_id uuid, p_system_ids bigint[] DEFAULT NULL::bigint[], p_stage public.system_growth_stage DEFAULT NULL::public.system_growth_stage, p_start_date date DEFAULT NULL::date, p_end_date date DEFAULT NULL::date)
 RETURNS TABLE(system_id bigint, system_name text, growth_stage public.system_growth_stage, input_start_date date, input_end_date date, as_of_date date, fish_end double precision, biomass_end double precision, sampling_end_date date, sample_age_days integer, efcr double precision, efcr_latest_date date, efcr_arrow text, feed_total double precision, abw double precision, abw_latest_date date, abw_arrow text, feeding_rate double precision, feeding_rate_latest_date date, feeding_rate_arrow text, mortality_rate double precision, mortality_rate_latest_date date, mortality_rate_arrow text, biomass_density double precision, biomass_density_latest_date date, biomass_density_arrow text, sgr double precision, agr double precision, sgr_arrow text, agr_arrow text, missing_days_count integer, water_quality_rating_average text, water_quality_rating_numeric_average double precision, water_quality_latest_date date, water_quality_arrow text, worst_parameter text, worst_parameter_value double precision, worst_parameter_unit text, cycle_day integer, target_weight_g double precision, target_weight_progress_pct double precision, is_complete boolean)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
with sys as (
select s.id as system_id, s.name as system_name, s.growth_stage
from public.system s
where s.farm_id = p_farm_id
and private.app_rpc_scope_ok(p_farm_id, p_system_ids, null::bigint, p_start_date, p_end_date)
and s.is_active = true
and coalesce(s.cage_status, 'occupied'::public.cage_status_enum) <> 'retired'::public.cage_status_enum
and (p_stage is null or s.growth_stage = p_stage)
and (p_system_ids is null or s.id = any(p_system_ids))
),
data_anchor as (
select coalesce(max(dsf.inventory_date), current_date) as last_data_date
from analytics.daily_system_facts dsf
join sys on sys.system_id = dsf.system_id
),
bounds as (
select
coalesce(p_start_date, da.last_data_date - interval '30 days')::date as start_date,
coalesce(p_end_date, da.last_data_date)::date as end_date
from data_anchor da
),
period_meta as (
select
b.start_date,
b.end_date,
greatest((b.end_date - b.start_date + 1)::integer, 1) as period_days
from bounds b
),
periods as (
select 'current'::text as period_label, pm.start_date, pm.end_date
from period_meta pm
union all
select 'previous'::text as period_label,
(pm.start_date - pm.period_days)::date as start_date,
(pm.start_date - 1)::date as end_date
from period_meta pm
),
inv as (
select p.period_label, dsf.*
from periods p
join analytics.daily_system_facts dsf
on dsf.inventory_date between p.start_date and p.end_date
join sys on sys.system_id = dsf.system_id
),
inv_snapshot as (
select distinct on (period_label, system_id)
period_label,
system_id,
inventory_date,
number_of_fish as fish_end,
biomass_last_sampling as biomass_end,
abw_last_sampling as abw,
last_abw_date as sampling_end_date,
feeding_rate,
mortality_rate,
biomass_density
from inv
order by period_label, system_id, inventory_date desc
),
inv_latest as (select * from inv_snapshot where period_label = 'current'),
inv_prev as (select * from inv_snapshot where period_label = 'previous'),
inv_agg as (
select
system_id,
count(distinct inventory_date)::integer as days_present
from inv
where period_label = 'current'
group by system_id
),
inv_period_metrics as (
select
period_label,
system_id,
case
when sum(coalesce(number_of_fish, 0)) > 0
then sum(coalesce(mortality_rate, 0) * coalesce(number_of_fish, 0))
/ sum(coalesce(number_of_fish, 0))
else avg(mortality_rate)
end as mortality_rate_period,
avg(biomass_density) as biomass_density_period,
case
when sum(coalesce(biomass_last_sampling, 0)) > 0
then sum(coalesce(feeding_rate, 0) * coalesce(biomass_last_sampling, 0))
/ sum(coalesce(biomass_last_sampling, 0))
else avg(feeding_rate)
end as feeding_rate_period
from inv
group by period_label, system_id
),
inv_current_metrics as (select * from inv_period_metrics where period_label = 'current'),
inv_prev_metrics as (select * from inv_period_metrics where period_label = 'previous'),
ps_window as (
select p.period_label, ps.*
from periods p
join analytics.production_summary ps
on ps.date between p.start_date and p.end_date
join sys on sys.system_id = ps.system_id
),
ps_ranked as (
select
ps.period_label,
ps.system_id,
ps.cycle_id,
ps.date,
ps.feed_over_period::double precision as feed_over_period,
coalesce(ps.efcr_period, ps.efcr_aggregated)::double precision as efcr,
greatest(coalesce(ps.biomass_increase_over_period, 0), 0)::double precision as biomass_increase_over_period,
ps.sgr::double precision as sgr,
ps.agr::double precision as agr,
ps.days_in_period::integer as days_in_period,
row_number() over (
partition by ps.period_label, ps.system_id
order by ps.date desc
) as rn
from ps_window ps
),
ps_latest as (
select * from ps_ranked where period_label = 'current' and rn = 1
),
ps_period_metrics as (
select
period_label,
system_id,
sum(coalesce(feed_over_period, 0))::double precision as feed_total,
sum(coalesce(feed_over_period, 0))::double precision as total_feed_period,
sum(coalesce(biomass_increase_over_period, 0))::double precision as total_growth_period,
case
when sum(case when sgr > 0 then days_in_period else 0 end) > 0
then sum(case when sgr > 0 then sgr * days_in_period else 0 end)
/ nullif(sum(case when sgr > 0 then days_in_period else 0 end), 0)
else null
end::double precision as sgr_period,
case
when sum(case when agr > 0 then days_in_period else 0 end) > 0
then sum(case when agr > 0 then agr * days_in_period else 0 end)
/ nullif(sum(case when agr > 0 then days_in_period else 0 end), 0)
else null
end::double precision as agr_period
from ps_ranked
group by period_label, system_id
),
ps_current_metrics as (
select
period_label,
system_id,
feed_total,
case
when total_growth_period > 0
then (total_feed_period / total_growth_period)::double precision
else null::double precision
end as efcr_period,
sgr_period,
agr_period
from ps_period_metrics
where period_label = 'current'
),
ps_prev_metrics as (
select
period_label,
system_id,
feed_total,
case
when total_growth_period > 0
then (total_feed_period / total_growth_period)::double precision
else null::double precision
end as efcr_period,
sgr_period,
agr_period
from ps_period_metrics
where period_label = 'previous'
),
wq_window as (
select p.period_label, wq.*
from periods p
join public.daily_water_quality_rating wq
on wq.rating_date between p.start_date and p.end_date
join sys on sys.system_id = wq.system_id
),
wq_avg as (
select
period_label,
system_id,
avg(rating_numeric::double precision) as rating_numeric_avg,
case
when avg(rating_numeric::double precision) >= 2.5 then 'Optimal'
when avg(rating_numeric::double precision) >= 1.5 then 'Acceptable'
when avg(rating_numeric::double precision) >= 0.5 then 'Critical'
else 'Lethal'
end as rating_label_avg
from wq_window
group by period_label, system_id
),
wq_current_avg as (select * from wq_avg where period_label = 'current'),
wq_prev_avg as (select * from wq_avg where period_label = 'previous'),
wq_ranked as (
select
wq.period_label,
wq.system_id,
wq.rating_date,
wq.rating_numeric::double precision as rating_numeric,
case
when wq.rating_numeric >= 2.5 then 'Optimal'
when wq.rating_numeric >= 1.5 then 'Acceptable'
when wq.rating_numeric >= 0.5 then 'Critical'
else 'Lethal'
end as rating_label,
wq.worst_parameter::text,
wq.worst_parameter_value::double precision,
wq.worst_parameter_unit::text,
row_number() over (
partition by wq.period_label, wq.system_id
order by wq.rating_date desc, wq.created_at desc, wq.id desc
) as rn
from wq_window wq
),
wq_latest as (select * from wq_ranked where period_label = 'current' and rn = 1)
select
sys.system_id,
sys.system_name,
sys.growth_stage,
b.start_date as input_start_date,
b.end_date as input_end_date,
b.end_date as as_of_date,
inv_latest.fish_end,
inv_latest.biomass_end,
inv_latest.sampling_end_date,
case
when inv_latest.sampling_end_date is null then null
else (b.end_date - inv_latest.sampling_end_date)::integer
end as sample_age_days,
ps_latest.efcr,
ps_latest.date as efcr_latest_date,
case
when ps_current_metrics.efcr_period is null or ps_prev_metrics.efcr_period is null then null
when ps_current_metrics.efcr_period = ps_prev_metrics.efcr_period then 'straight'
when ps_current_metrics.efcr_period > ps_prev_metrics.efcr_period then 'up'
else 'down'
end as efcr_arrow,
ps_current_metrics.feed_total,
inv_latest.abw,
inv_latest.sampling_end_date as abw_latest_date,
case
when inv_latest.abw is null or inv_prev.abw is null then null
when inv_latest.abw = inv_prev.abw then 'straight'
when inv_latest.abw > inv_prev.abw then 'up'
else 'down'
end as abw_arrow,
inv_current_metrics.feeding_rate_period as feeding_rate,
inv_latest.inventory_date as feeding_rate_latest_date,
case
when inv_current_metrics.feeding_rate_period is null or inv_prev_metrics.feeding_rate_period is null then null
when inv_current_metrics.feeding_rate_period = inv_prev_metrics.feeding_rate_period then 'straight'
when inv_current_metrics.feeding_rate_period > inv_prev_metrics.feeding_rate_period then 'up'
else 'down'
end as feeding_rate_arrow,
inv_latest.mortality_rate,
inv_latest.inventory_date as mortality_rate_latest_date,
case
when inv_current_metrics.mortality_rate_period is null or inv_prev_metrics.mortality_rate_period is null then null
when inv_current_metrics.mortality_rate_period = inv_prev_metrics.mortality_rate_period then 'straight'
when inv_current_metrics.mortality_rate_period > inv_prev_metrics.mortality_rate_period then 'up'
else 'down'
end as mortality_rate_arrow,
inv_latest.biomass_density,
inv_latest.inventory_date as biomass_density_latest_date,
case
when inv_current_metrics.biomass_density_period is null or inv_prev_metrics.biomass_density_period is null then null
when inv_current_metrics.biomass_density_period = inv_prev_metrics.biomass_density_period then 'straight'
when inv_current_metrics.biomass_density_period > inv_prev_metrics.biomass_density_period then 'up'
else 'down'
end as biomass_density_arrow,
ps_current_metrics.sgr_period as sgr,
ps_current_metrics.agr_period as agr,
case
when ps_current_metrics.sgr_period is null or ps_prev_metrics.sgr_period is null then null
when ps_current_metrics.sgr_period > ps_prev_metrics.sgr_period then 'up'
when ps_current_metrics.sgr_period < ps_prev_metrics.sgr_period then 'down'
else 'straight'
end as sgr_arrow,
case
when ps_current_metrics.agr_period is null or ps_prev_metrics.agr_period is null then null
when ps_current_metrics.agr_period > ps_prev_metrics.agr_period then 'up'
when ps_current_metrics.agr_period < ps_prev_metrics.agr_period then 'down'
else 'straight'
end as agr_arrow,
greatest(0, (b.end_date - b.start_date + 1)::integer - coalesce(inv_agg.days_present, 0)) as missing_days_count,
wq_current_avg.rating_label_avg as water_quality_rating_average,
wq_current_avg.rating_numeric_avg as water_quality_rating_numeric_average,
wq_latest.rating_date as water_quality_latest_date,
case
when wq_current_avg.rating_numeric_avg is null or wq_prev_avg.rating_numeric_avg is null then null
when wq_current_avg.rating_numeric_avg = wq_prev_avg.rating_numeric_avg then 'straight'
when wq_current_avg.rating_numeric_avg > wq_prev_avg.rating_numeric_avg then 'up'
else 'down'
end as water_quality_arrow,
wq_latest.worst_parameter,
wq_latest.worst_parameter_value,
wq_latest.worst_parameter_unit,
case
when pc.cycle_start is null then null
else (b.end_date - pc.cycle_start)::integer
end as cycle_day,
pc.target_weight_g::double precision as target_weight_g,
case
when pc.target_weight_g is not null and inv_latest.abw is not null
then round((inv_latest.abw / pc.target_weight_g::double precision * 100)::numeric, 1)::double precision
else null
end as target_weight_progress_pct,
case
when inv_latest.fish_end is not null
and inv_latest.fish_end > 0
and inv_latest.biomass_end is not null
and ps_current_metrics.feed_total is not null
and ps_latest.efcr is not null
and inv_latest.abw is not null
and inv_latest.biomass_density is not null
then true else false
end as is_complete
from sys
cross join bounds b
left join inv_latest on inv_latest.system_id = sys.system_id
left join inv_prev on inv_prev.system_id = sys.system_id
left join inv_agg on inv_agg.system_id = sys.system_id
left join ps_latest on ps_latest.system_id = sys.system_id
left join public.production_cycle pc on pc.cycle_id = ps_latest.cycle_id
left join inv_current_metrics on inv_current_metrics.system_id = sys.system_id
left join inv_prev_metrics on inv_prev_metrics.system_id = sys.system_id
left join ps_current_metrics on ps_current_metrics.system_id = sys.system_id
left join ps_prev_metrics on ps_prev_metrics.system_id = sys.system_id
left join wq_current_avg on wq_current_avg.system_id = sys.system_id
left join wq_prev_avg on wq_prev_avg.system_id = sys.system_id
left join wq_latest on wq_latest.system_id = sys.system_id
order by sys.system_name;
$function$
;

CREATE OR REPLACE FUNCTION public.api_farm_options_rpc()
 RETURNS TABLE(id uuid, label text, location text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
  select f.id, f.name as label, f.location
  from public.farm f
  where private.is_farm_member(f.id)
  order by f.name;
$function$
;

CREATE OR REPLACE FUNCTION public.api_farm_user_invitations(p_farm_id uuid)
 RETURNS TABLE(id uuid, farm_id uuid, email text, role text, status text, invited_by uuid, invited_user_id uuid, created_at timestamp with time zone, updated_at timestamp with time zone, last_sent_at timestamp with time zone, accepted_at timestamp with time zone, revoked_at timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'private'
AS $function$
begin
  if auth.uid() is null
     or not private.has_farm_role(p_farm_id, array['admin'], auth.uid()) then
    raise insufficient_privilege using errcode = '42501';
  end if;

  return query
  select
    i.id,
    i.farm_id,
    i.email,
    i.role,
    i.status,
    i.invited_by,
    i.invited_user_id,
    i.created_at,
    i.updated_at,
    i.last_sent_at,
    i.accepted_at,
    i.revoked_at
  from private.farm_user_invitation i
  where i.farm_id = p_farm_id
    and i.status = 'pending'
    and i.revoked_at is null
    and i.accepted_at is null
  order by i.created_at desc;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.api_feed_dashboard_kpis(p_farm_id uuid, p_system_ids bigint[] DEFAULT NULL::bigint[], p_start_date date DEFAULT NULL::date, p_end_date date DEFAULT NULL::date)
 RETURNS TABLE(as_of_date date, feed_used_today_kg numeric, feed_this_period_kg numeric, plan_vs_actual_pct numeric, avg_feeding_rate_pct numeric, overfeeding_systems integer, underfeeding_systems integer)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'analytics', 'private'
AS $function$
declare
  v_end_date date := coalesce(p_end_date, current_date);
  v_start_date date := coalesce(p_start_date, v_end_date - 29);
begin
  if not private.is_farm_member(p_farm_id) then
    return;
  end if;

  perform private.assert_rpc_parameters(
    p_farm_id := p_farm_id,
    p_system_ids := p_system_ids,
    p_cycle_id := null::bigint,
    p_start_date := v_start_date,
    p_end_date := v_end_date
  );

  return query
  with scoped_plan as (
    select *
    from analytics.feed_plan_vs_actual fpva
    where fpva.farm_id = p_farm_id
      and fpva.date between v_start_date and v_end_date
      and (p_system_ids is null or fpva.system_id = any(p_system_ids))
  ),
  latest_status as (
    select distinct on (sfs.system_id)
      sfs.system_id,
      sfs.feeding_rate_pct,
      sfs.status
    from analytics.system_feed_status sfs
    where sfs.farm_id = p_farm_id
      and sfs.date between v_start_date and v_end_date
      and (p_system_ids is null or sfs.system_id = any(p_system_ids))
    order by sfs.system_id, sfs.date desc
  )
  select
    v_end_date as as_of_date,
    coalesce(
      (
        select sum(coalesce(actual_feed_kg, 0))::numeric
        from scoped_plan
        where date = v_end_date
      ),
      0::numeric
    ) as feed_used_today_kg,
    coalesce((select sum(coalesce(actual_feed_kg, 0))::numeric from scoped_plan), 0::numeric) as feed_this_period_kg,
    case
      when coalesce((select sum(coalesce(planned_feed_kg, 0))::numeric from scoped_plan), 0::numeric) = 0::numeric
        then null::numeric
      else round(
        (
          coalesce((select sum(coalesce(actual_feed_kg, 0))::numeric from scoped_plan), 0::numeric)
          / nullif((select sum(coalesce(planned_feed_kg, 0))::numeric from scoped_plan), 0::numeric)
        ) * 100.0,
        2
      )
    end as plan_vs_actual_pct,
    round((select avg(feeding_rate_pct) from latest_status), 2) as avg_feeding_rate_pct,
    coalesce((select count(*)::integer from latest_status where status = 'OVERFEED'), 0) as overfeeding_systems,
    coalesce((select count(*)::integer from latest_status where status = 'UNDERFEED'), 0) as underfeeding_systems;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.api_feed_efcr_trend(p_farm_id uuid, p_system_ids bigint[] DEFAULT NULL::bigint[], p_start_date date DEFAULT NULL::date, p_end_date date DEFAULT NULL::date)
 RETURNS TABLE(date date, efcr_period numeric)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'analytics', 'private'
AS $function$
declare
  v_end_date date := coalesce(p_end_date, current_date);
  v_start_date date := coalesce(p_start_date, v_end_date - 13);
begin
  if not private.is_farm_member(p_farm_id) then
    return;
  end if;

  perform private.assert_rpc_parameters(
    p_farm_id := p_farm_id,
    p_system_ids := p_system_ids,
    p_cycle_id := null::bigint,
    p_start_date := v_start_date,
    p_end_date := v_end_date
  );

  return query
  select
    et.date,
    round(avg(et.efcr_period), 4) as efcr_period
  from analytics.efcr_trend et
  where et.farm_id = p_farm_id
    and et.date between v_start_date and v_end_date
    and (p_system_ids is null or et.system_id = any(p_system_ids))
  group by et.date
  order by et.date;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.api_feed_inventory_feed_type_options_rpc(p_farm_id uuid, p_date_to date DEFAULT NULL::date)
 RETURNS TABLE(id bigint, farm_id uuid, feed_line text, label text, feed_category text, feed_pellet_size text, crude_protein_percentage numeric, crude_fat_percentage numeric, visibility_scope text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
  with latest_inventory as (
    select distinct on (fi.feed_type_id)
      fi.feed_type_id,
      coalesce(
        fi.snapshot_kg,
        public.feed_inventory_snapshot_kg(
          fi.bag_weight::numeric,
          fi.amount_of_bags::numeric,
          fi.opened_bags::numeric
        )
      ) as snapshot_kg
    from public.feed_inventory fi
    where private.is_farm_member(p_farm_id)
      and fi.farm_id = p_farm_id
      and fi.feed_type_id is not null
      and fi.inventory_date <= coalesce(p_date_to, fi.inventory_date)
    order by
      fi.feed_type_id,
      fi.inventory_date desc,
      fi.inventory_time desc nulls last,
      fi.created_at desc nulls last,
      fi.id desc
  )
  select
    ft.id,
    ft.farm_id,
    ft.feed_line,
    ft.label,
    ft.feed_category,
    ft.feed_pellet_size,
    ft.crude_protein_percentage,
    ft.crude_fat_percentage,
    ft.visibility_scope
  from public.api_feed_type_options_rpc(
    p_farm_id => p_farm_id
  ) ft
  join latest_inventory li on li.feed_type_id = ft.id
  where li.snapshot_kg > 0::numeric
  order by
    ft.label,
    ft.id;
$function$
;

CREATE OR REPLACE FUNCTION public.api_feed_plan_vs_actual(p_farm_id uuid, p_system_ids bigint[] DEFAULT NULL::bigint[], p_start_date date DEFAULT NULL::date, p_end_date date DEFAULT NULL::date)
 RETURNS TABLE(date date, planned_feed_kg numeric, actual_feed_kg numeric)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'analytics', 'private'
AS $function$
declare
  v_end_date date := coalesce(p_end_date, current_date);
  v_start_date date := coalesce(p_start_date, v_end_date - 29);
begin
  if not private.is_farm_member(p_farm_id) then
    return;
  end if;

  perform private.assert_rpc_parameters(
    p_farm_id := p_farm_id,
    p_system_ids := p_system_ids,
    p_cycle_id := null::bigint,
    p_start_date := v_start_date,
    p_end_date := v_end_date
  );

  return query
  select
    fpva.date,
    sum(coalesce(fpva.planned_feed_kg, 0))::numeric as planned_feed_kg,
    sum(coalesce(fpva.actual_feed_kg, 0))::numeric as actual_feed_kg
  from analytics.feed_plan_vs_actual fpva
  where fpva.farm_id = p_farm_id
    and fpva.date between v_start_date and v_end_date
    and (p_system_ids is null or fpva.system_id = any(p_system_ids))
  group by fpva.date
  order by fpva.date;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.api_feed_recommendations(p_farm_id uuid, p_system_ids bigint[] DEFAULT NULL::bigint[], p_date date DEFAULT CURRENT_DATE)
 RETURNS TABLE(system_id bigint, system_name text, recommendation_date date, model_version text, scenario text, phase_id integer, biomass_kg numeric, abw_g numeric, abw_projected_g numeric, feeding_rate_pct numeric, planned_feed_kg numeric, adjusted_feed_kg numeric, confidence text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'analytics', 'private'
AS $function$
begin
  if not private.is_farm_member(p_farm_id) then
    return;
  end if;

  perform private.assert_rpc_parameters(
    p_farm_id    := p_farm_id,
    p_system_ids := p_system_ids,
    p_cycle_id   := null::bigint,
    p_start_date := coalesce(p_date, current_date),
    p_end_date   := coalesce(p_date, current_date)
  );

  return query
  select
    fmo.system_id,
    s.name                as system_name,
    fmo.date              as recommendation_date,
    fmo.model_version,
    fmo.scenario,
    fmo.phase_id,
    fmo.biomass_kg,
    fmo.abw_g,
    fmo.abw_projected_g,
    fmo.feeding_rate_pct,
    fmo.planned_feed_kg,
    fmo.adjusted_feed_kg,
    fmo.confidence
  from analytics.feeding_model_output fmo
  join public.system s on s.id = fmo.system_id
  where s.farm_id = p_farm_id
    and (p_system_ids is null or fmo.system_id = any(p_system_ids))
    and fmo.date = coalesce(p_date, current_date)
  order by s.name, fmo.system_id;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.api_feed_type_options_rpc(p_farm_id uuid)
 RETURNS TABLE(id bigint, farm_id uuid, feed_line text, label text, feed_category text, feed_pellet_size text, crude_protein_percentage numeric, crude_fat_percentage numeric, visibility_scope text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
  select
    ft.id,
    ft.farm_id,
    ft.feed_line,
    ft.feed_line as label,
    ft.feed_category::text,
    ft.feed_pellet_size::text,
    ft.crude_protein_percentage::numeric,
    ft.crude_fat_percentage::numeric,
    case
      when ft.farm_id = p_farm_id then 'farm'
      when exists (
        select 1
        from public.feed_inventory fi
        where fi.farm_id = p_farm_id
          and fi.feed_type_id = ft.id
      ) or exists (
        select 1
        from public.feeding_record fr
        join public.system s on s.id = fr.system_id
        where s.farm_id = p_farm_id
          and fr.feed_type_id = ft.id
      ) then 'farm_used'
      else 'shared_catalog'
    end as visibility_scope
  from public.feed_type ft
  left join public.feed_supplier fs on fs.id = ft.feed_supplier_id
  where private.is_farm_member(p_farm_id)
    and coalesce(ft.is_active, true)
    and (
      ft.farm_id is null
      or ft.farm_id = p_farm_id
      or exists (
        select 1
        from public.feed_inventory fi
        where fi.farm_id = p_farm_id
          and fi.feed_type_id = ft.id
      )
      or exists (
        select 1
        from public.feeding_record fr
        join public.system s on s.id = fr.system_id
        where s.farm_id = p_farm_id
          and fr.feed_type_id = ft.id
      )
    )
  order by
    case when ft.farm_id = p_farm_id then 0 else 1 end,
    ft.feed_line,
    ft.feed_pellet_size::text;
$function$
;

CREATE OR REPLACE FUNCTION public.api_feed_vs_biomass_gain(p_farm_id uuid, p_system_ids bigint[] DEFAULT NULL::bigint[], p_start_date date DEFAULT NULL::date, p_end_date date DEFAULT NULL::date)
 RETURNS TABLE(system_id bigint, system_name text, date date, feed_kg numeric, biomass_gain_kg numeric)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'analytics', 'private'
AS $function$
declare
  v_end_date date := coalesce(p_end_date, current_date);
  v_start_date date := coalesce(p_start_date, v_end_date - 29);
begin
  if not private.is_farm_member(p_farm_id) then
    return;
  end if;

  perform private.assert_rpc_parameters(
    p_farm_id := p_farm_id,
    p_system_ids := p_system_ids,
    p_cycle_id := null::bigint,
    p_start_date := v_start_date,
    p_end_date := v_end_date
  );

  return query
  select
    fvbg.system_id,
    fvbg.system_name,
    fvbg.date,
    fvbg.feed_kg,
    fvbg.biomass_gain_kg
  from analytics.feed_vs_biomass_gain fvbg
  where fvbg.farm_id = p_farm_id
    and fvbg.date between v_start_date and v_end_date
    and (p_system_ids is null or fvbg.system_id = any(p_system_ids))
    and fvbg.feed_kg is not null
    and fvbg.biomass_gain_kg is not null
  order by fvbg.date, fvbg.system_name;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.api_feeding_alerts(p_farm_id uuid, p_system_ids bigint[] DEFAULT NULL::bigint[], p_start_date date DEFAULT NULL::date, p_end_date date DEFAULT NULL::date)
 RETURNS TABLE(system_id bigint, system_name text, date date, alert text, recommendation text, severity text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'analytics', 'private'
AS $function$
declare
  v_end_date date := coalesce(p_end_date, current_date);
  v_start_date date := coalesce(p_start_date, v_end_date - 29);
begin
  if not private.is_farm_member(p_farm_id) then
    return;
  end if;

  perform private.assert_rpc_parameters(
    p_farm_id := p_farm_id,
    p_system_ids := p_system_ids,
    p_cycle_id := null::bigint,
    p_start_date := v_start_date,
    p_end_date := v_end_date
  );

  return query
  select distinct on (fa.system_id, fa.alert)
    fa.system_id,
    fa.system_name,
    fa.date,
    fa.alert,
    fa.recommendation,
    fa.severity
  from analytics.feeding_alerts fa
  where fa.farm_id = p_farm_id
    and fa.date between v_start_date and v_end_date
    and (p_system_ids is null or fa.system_id = any(p_system_ids))
    and fa.alert is not null
  order by fa.system_id, fa.alert, fa.date desc;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.api_feeding_rate_vs_target(p_farm_id uuid, p_system_ids bigint[] DEFAULT NULL::bigint[], p_start_date date DEFAULT NULL::date, p_end_date date DEFAULT NULL::date)
 RETURNS TABLE(date date, actual_rate numeric, feed_rate_min_pct numeric, feed_rate_max_pct numeric)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'analytics', 'private'
AS $function$
declare
  v_end_date date := coalesce(p_end_date, current_date);
  v_start_date date := coalesce(p_start_date, v_end_date - 13);
begin
  if not private.is_farm_member(p_farm_id) then
    return;
  end if;

  perform private.assert_rpc_parameters(
    p_farm_id := p_farm_id,
    p_system_ids := p_system_ids,
    p_cycle_id := null::bigint,
    p_start_date := v_start_date,
    p_end_date := v_end_date
  );

  return query
  select
    frt.date,
    round(avg(frt.actual_rate), 4) as actual_rate,
    round(avg(frt.feed_rate_min_pct), 4) as feed_rate_min_pct,
    round(avg(frt.feed_rate_max_pct), 4) as feed_rate_max_pct
  from analytics.feeding_rate_vs_target frt
  where frt.farm_id = p_farm_id
    and frt.date between v_start_date and v_end_date
    and (p_system_ids is null or frt.system_id = any(p_system_ids))
  group by frt.date
  order by frt.date;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.api_feeding_response_distribution(p_farm_id uuid, p_system_ids bigint[] DEFAULT NULL::bigint[], p_start_date date DEFAULT NULL::date, p_end_date date DEFAULT NULL::date)
 RETURNS TABLE(feeding_response integer, count bigint)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'analytics', 'private'
AS $function$
declare
  v_end_date date := coalesce(p_end_date, current_date);
  v_start_date date := coalesce(p_start_date, v_end_date - 29);
begin
  if not private.is_farm_member(p_farm_id) then
    return;
  end if;

  perform private.assert_rpc_parameters(
    p_farm_id := p_farm_id,
    p_system_ids := p_system_ids,
    p_cycle_id := null::bigint,
    p_start_date := v_start_date,
    p_end_date := v_end_date
  );

  return query
  select
    frd.feeding_response::integer as feeding_response,
    sum(frd.response_count)::bigint as count
  from analytics.feeding_response_distribution frd
  where frd.farm_id = p_farm_id
    and frd.date between v_start_date and v_end_date
    and (p_system_ids is null or frd.system_id = any(p_system_ids))
  group by frd.feeding_response
  order by frd.feeding_response;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.api_fingerling_batch_options_rpc(p_farm_id uuid DEFAULT NULL::uuid, p_active_only boolean DEFAULT true)
 RETURNS TABLE(id bigint, farm_id uuid, system_id bigint, label text, date_of_delivery date, abw numeric, number_of_fish numeric, supplier_id bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
with batch_system_flows as (
  select fs.batch_id,
         fs.system_id,
         fs.number_of_fish_stocking::double precision as qty_delta
  from public.fish_stocking fs
  where fs.batch_id is not null
    and fs.system_id is not null
    and fs.date <= current_date

  union all

  select ft.batch_id,
         ft.target_system_id as system_id,
         ft.number_of_fish_transfer::double precision as qty_delta
  from public.fish_transfer ft
  where ft.batch_id is not null
    and ft.target_system_id is not null
    and ft.date <= current_date

  union all

  select ft.batch_id,
         ft.origin_system_id as system_id,
         -ft.number_of_fish_transfer::double precision as qty_delta
  from public.fish_transfer ft
  where ft.batch_id is not null
    and ft.origin_system_id is not null
    and ft.date <= current_date

  union all

  select fm.batch_id,
         fm.system_id,
         -fm.number_of_fish_mortality::double precision as qty_delta
  from public.fish_mortality fm
  where fm.batch_id is not null
    and fm.system_id is not null
    and fm.date <= current_date

  union all

  select fh.batch_id,
         fh.system_id,
         -coalesce(fh.number_of_fish_harvest, 0)::double precision as qty_delta
  from public.fish_harvest fh
  where fh.batch_id is not null
    and fh.system_id is not null
    and fh.date <= current_date
),
active_batch_systems as (
  select batch_system_flows.batch_id,
         batch_system_flows.system_id,
         sum(batch_system_flows.qty_delta) as fish_balance
  from batch_system_flows
  group by batch_system_flows.batch_id, batch_system_flows.system_id
  having sum(batch_system_flows.qty_delta) > 0
),
resolved_system as (
  select active_batch_systems.batch_id,
         case
           when count(*) = 1 then min(active_batch_systems.system_id)::bigint
           else null::bigint
         end as system_id
  from active_batch_systems
  group by active_batch_systems.batch_id
)
select
  fb.id,
  fb.farm_id,
  rs.system_id,
  coalesce(nullif(fb.name, ''), 'Batch #' || fb.id::text) as label,
  fb.date_of_delivery,
  fb.abw::numeric,
  fb.number_of_fish::numeric,
  fb.supplier_id
from public.fingerling_batch fb
left join resolved_system rs
  on rs.batch_id = fb.id
where (p_farm_id is null or private.is_farm_member(p_farm_id))
  and (p_farm_id is null or fb.farm_id = p_farm_id)
  and exists (
    select 1
    from public.farm_user fu
    where fu.farm_id = fb.farm_id
      and fu.user_id = (select auth.uid())
  )
  and exists (
    select 1
    from public.production_cycle pc
    where pc.batch_id = fb.id
      and pc.ongoing_cycle = true
  )
  and (
    coalesce(p_active_only, true) = false
    or exists (
      select 1
      from active_batch_systems abs
      join public.system s on s.id = abs.system_id
      where abs.batch_id = fb.id
        and s.farm_id = fb.farm_id
        and s.is_active = true
    )
  )
order by fb.date_of_delivery desc nulls last;
$function$
;

CREATE OR REPLACE FUNCTION public.api_kpi_coverage(p_farm_id uuid, p_date_from date DEFAULT NULL::date, p_date_to date DEFAULT NULL::date)
 RETURNS TABLE(kpi_key text, covered integer, total integer, label text, source text, basis text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'analytics'
AS $function$
with bounds as (
  select
    coalesce(p_date_from, min(dsf.inventory_date)) as start_date,
    coalesce(p_date_to, max(dsf.inventory_date)) as end_date
  from analytics.daily_system_facts dsf
  join public.system s
    on s.id = dsf.system_id
  where s.farm_id = p_farm_id
    and private.is_farm_member(p_farm_id)
),
dsf_window as (
  select dsf.*
  from analytics.daily_system_facts dsf
  join public.system s
    on s.id = dsf.system_id
  cross join bounds b
  where s.farm_id = p_farm_id
    and dsf.inventory_date between b.start_date and b.end_date
),
coverage as (
  select
    sum(case when dsf_window.abw_last_sampling is not null then 1 else 0 end) as abw_covered,
    sum(case when dsf_window.number_of_fish is not null then 1 else 0 end) as fish_count_covered,
    sum(case when coalesce(dsf_window.feeding_amount_today, 0::double precision) > 0::double precision then 1 else 0 end) as feed_covered,
    count(*) as total_rows
  from dsf_window
)
select
  t.kpi_key,
  t.covered::integer,
  t.total::integer,
  t.label,
  t.source,
  t.basis
from (
  values
    (
      'abw',
      (select abw_covered from coverage)::integer,
      (select total_rows from coverage)::integer,
      'Average Body Weight',
      'analytics.daily_system_facts',
      'abw_last_sampling is not null'
    ),
    (
      'fish_count',
      (select fish_count_covered from coverage)::integer,
      (select total_rows from coverage)::integer,
      'Fish Count',
      'analytics.daily_system_facts',
      'number_of_fish is not null'
    ),
    (
      'feeding',
      (select feed_covered from coverage)::integer,
      (select total_rows from coverage)::integer,
      'Feed Records',
      'analytics.daily_system_facts',
      'feeding_amount_today > 0'
    )
) as t(kpi_key, covered, total, label, source, basis);
$function$
;

CREATE OR REPLACE FUNCTION public.api_latest_water_quality_status(p_farm_id uuid, p_system_id bigint DEFAULT NULL::bigint)
 RETURNS TABLE(system_id bigint, system_name text, rating_date date, rating text, rating_numeric integer, worst_parameter text, worst_parameter_value double precision, worst_parameter_unit text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
  select distinct on (dwr.system_id)
    dwr.system_id,
    s.name::text as system_name,
    dwr.rating_date,
    initcap(dwr.rating::text) as rating,
    dwr.rating_numeric as rating_numeric,
    dwr.worst_parameter::text as worst_parameter,
    dwr.worst_parameter_value::double precision as worst_parameter_value,
    dwr.worst_parameter_unit::text as worst_parameter_unit
  from public.daily_water_quality_rating dwr
  join public.system s on s.id = dwr.system_id
  where s.farm_id = p_farm_id
    and (p_system_id is null or dwr.system_id = p_system_id)
    and private.is_farm_member(p_farm_id)
  order by dwr.system_id, dwr.rating_date desc;
$function$
;

CREATE OR REPLACE FUNCTION public.api_production_summary(p_farm_id uuid, p_system_id bigint DEFAULT NULL::bigint, p_stage public.system_growth_stage DEFAULT NULL::public.system_growth_stage, p_start_date date DEFAULT NULL::date, p_end_date date DEFAULT NULL::date)
 RETURNS TABLE(cycle_id bigint, system_id bigint, system_name text, growth_stage text, ongoing_cycle boolean, cycle_start date, cycle_end date, target_weight_g double precision, date date, activity text, days_in_period integer, fish_count_period_start double precision, number_of_fish_inventory double precision, average_body_weight double precision, total_biomass double precision, biomass_density double precision, mortality_count_period double precision, total_feed_amount_period double precision, number_of_fish_transfer_in double precision, number_of_fish_transfer_out double precision, number_of_fish_harvested double precision, total_weight_harvested double precision, biomass_increase_period double precision, feeding_rate_on_date double precision, efcr_period double precision, sgr double precision, agr double precision, survival_rate_pct double precision, total_feed_amount_aggregated double precision, cumulative_mortality double precision, biomass_increase_aggregated double precision, number_of_fish_transfer_in_aggregated double precision, number_of_fish_transfer_out_aggregated double precision, number_of_fish_harvested_aggregated double precision, total_weight_harvested_aggregated double precision, efcr_aggregated double precision)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'analytics', 'private'
AS $function$
select
ps.cycle_id,
ps.system_id,
s.name as system_name,
s.growth_stage::text as growth_stage,
pc.ongoing_cycle,
pc.cycle_start::date,
pc.cycle_end::date,
pc.target_weight_g::double precision,
ps.date,
ps.activity,
ps.days_in_period::integer,
ps.number_of_fish_start::double precision as fish_count_period_start,
ps.number_of_fish_end::double precision as number_of_fish_inventory,
ps.average_body_weight::double precision,
ps.total_weight_kg::double precision as total_biomass,
dsf.biomass_density::double precision,
ps.mortality_over_period::double precision as mortality_count_period,
ps.feed_over_period::double precision as total_feed_amount_period,
ps.transfers_in_over_period::double precision as number_of_fish_transfer_in,
ps.transfers_out_over_period::double precision as number_of_fish_transfer_out,
ps.harvest_fish_over_period::double precision as number_of_fish_harvested,
ps.harvest_weight_kg_over_period::double precision as total_weight_harvested,
ps.biomass_increase_over_period::double precision as biomass_increase_period,
dsf.feeding_rate::double precision as feeding_rate_on_date,
ps.efcr_period::double precision,
ps.sgr::double precision,
ps.agr::double precision,
case
when ps.number_of_fish_start > 0
then round(
(ps.number_of_fish_end::double precision
/ ps.number_of_fish_start::double precision * 100)::numeric,
2
)
else null
end as survival_rate_pct,
ps.feed_aggregated::double precision as total_feed_amount_aggregated,
ps.cumulative_mortality::double precision,
ps.cumulative_biomass::double precision as biomass_increase_aggregated,
ps.transfers_in_aggregated::double precision as number_of_fish_transfer_in_aggregated,
ps.transfers_out_aggregated::double precision as number_of_fish_transfer_out_aggregated,
ps.harvest_fish_aggregated::double precision as number_of_fish_harvested_aggregated,
ps.harvest_weight_kg_aggregated::double precision as total_weight_harvested_aggregated,
ps.efcr_aggregated::double precision
from analytics.production_summary ps
join public.system s
on s.id = ps.system_id
join public.production_cycle pc
on pc.cycle_id = ps.cycle_id
left join analytics.daily_system_facts dsf
on dsf.system_id = ps.system_id
and dsf.inventory_date = ps.date
where s.farm_id = p_farm_id
and private.app_rpc_scope_ok(
p_farm_id,
case when p_system_id is not null then array[p_system_id] else null::bigint[] end,
null::bigint,
p_start_date,
p_end_date
)
and (p_system_id is null or ps.system_id = p_system_id)
and (p_stage is null or s.growth_stage = p_stage)
and (p_start_date is null or ps.date >= p_start_date)
and (p_end_date is null or ps.date <= p_end_date)
order by ps.date desc, ps.system_id desc;
$function$
;

CREATE OR REPLACE FUNCTION public.api_production_trend(p_farm_id uuid, p_system_ids bigint[] DEFAULT NULL::bigint[], p_start_date date DEFAULT NULL::date, p_end_date date DEFAULT NULL::date)
 RETURNS TABLE(trend_date date, avg_abw_g double precision, total_biomass_kg double precision, total_feed_kg double precision, total_fish_count double precision, total_mortality_period double precision, system_count bigint)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'analytics', 'private'
AS $function$
declare
  v_start date := coalesce(p_start_date, date '1900-01-01');
  v_end date := coalesce(
    p_end_date,
    (
      select max(ps.date)
      from analytics.production_summary ps
      join public.system s on s.id = ps.system_id
      where s.farm_id = p_farm_id
        and (p_system_ids is null or ps.system_id = any(p_system_ids))
    ),
    current_date
  );
begin
  if not private.is_farm_member(p_farm_id) then
    return;
  end if;

  return query
  with latest_per_system_date as (
    select distinct on (ps.date, ps.system_id)
      ps.date,
      ps.system_id,
      ps.number_of_fish_end,
      ps.average_body_weight,
      ps.total_weight_kg,
      ps.feed_over_period,
      ps.mortality_over_period
    from analytics.production_summary ps
    join public.system s on s.id = ps.system_id
    where s.farm_id = p_farm_id
      and (p_system_ids is null or ps.system_id = any(p_system_ids))
      and ps.date between v_start and v_end
    order by ps.date, ps.system_id, ps.cycle_id desc
  )
  select
    l.date as trend_date,
    case
      when sum(l.number_of_fish_end) > 0
        then sum(l.average_body_weight * l.number_of_fish_end) / sum(l.number_of_fish_end)
      else null
    end::double precision as avg_abw_g,
    sum(l.total_weight_kg)::double precision as total_biomass_kg,
    sum(l.feed_over_period)::double precision as total_feed_kg,
    sum(l.number_of_fish_end)::double precision as total_fish_count,
    sum(l.mortality_over_period)::double precision as total_mortality_period,
    count(distinct l.system_id) as system_count
  from latest_per_system_date l
  group by l.date
  order by l.date;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.api_recent_activity_feed(p_farm_id uuid, p_limit integer DEFAULT 50, p_mode text DEFAULT 'flat'::text, p_date_from date DEFAULT NULL::date, p_date_to date DEFAULT NULL::date, p_table text DEFAULT NULL::text)
 RETURNS TABLE(id bigint, table_name text, activity_date date, system_id bigint, batch_id bigint, notes text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
WITH farm_systems AS (
  SELECT s.id AS system_id
  FROM public.system s
  WHERE s.farm_id = p_farm_id
),

activity AS (

  -- feeding_record
  SELECT
    fr.id::bigint,
    'feeding_record'::text          AS table_name,
    fr.date::date                   AS activity_date,
    fr.system_id::bigint,
    fr.batch_id::bigint,
    fr.notes::text
  FROM public.feeding_record fr
  JOIN farm_systems fs ON fs.system_id = fr.system_id
  WHERE (p_date_from IS NULL OR fr.date >= p_date_from)
    AND (p_date_to   IS NULL OR fr.date <= p_date_to)
    AND (p_table IS NULL OR p_table = 'feeding_record')

  UNION ALL

  -- fish_mortality
  SELECT
    fm.id::bigint,
    'fish_mortality'::text,
    fm.date::date,
    fm.system_id::bigint,
    fm.batch_id::bigint,
    fm.notes::text
  FROM public.fish_mortality fm
  JOIN farm_systems fs ON fs.system_id = fm.system_id
  WHERE (p_date_from IS NULL OR fm.date >= p_date_from)
    AND (p_date_to   IS NULL OR fm.date <= p_date_to)
    AND (p_table IS NULL OR p_table = 'fish_mortality')

  UNION ALL

  -- fish_sampling_weight
  SELECT
    sw.id::bigint,
    'fish_sampling_weight'::text,
    sw.date::date,
    sw.system_id::bigint,
    sw.batch_id::bigint,
    sw.notes::text
  FROM public.fish_sampling_weight sw
  JOIN farm_systems fs ON fs.system_id = sw.system_id
  WHERE (p_date_from IS NULL OR sw.date >= p_date_from)
    AND (p_date_to   IS NULL OR sw.date <= p_date_to)
    AND (p_table IS NULL OR p_table = 'fish_sampling_weight')

  UNION ALL

  -- fish_stocking
  SELECT
    fst.id::bigint,
    'fish_stocking'::text,
    fst.date::date,
    fst.system_id::bigint,
    fst.batch_id::bigint,
    fst.notes::text
  FROM public.fish_stocking fst
  JOIN farm_systems fs ON fs.system_id = fst.system_id
  WHERE (p_date_from IS NULL OR fst.date >= p_date_from)
    AND (p_date_to   IS NULL OR fst.date <= p_date_to)
    AND (p_table IS NULL OR p_table = 'fish_stocking')

  UNION ALL

  -- fish_harvest
  SELECT
    fh.id::bigint,
    'fish_harvest'::text,
    fh.date::date,
    fh.system_id::bigint,
    fh.batch_id::bigint,
    NULL::text
  FROM public.fish_harvest fh
  JOIN farm_systems fs ON fs.system_id = fh.system_id
  WHERE (p_date_from IS NULL OR fh.date >= p_date_from)
    AND (p_date_to   IS NULL OR fh.date <= p_date_to)
    AND (p_table IS NULL OR p_table = 'fish_harvest')

  UNION ALL

  -- fish_transfer (use origin system for scoping)
  SELECT
    ft.id::bigint,
    'fish_transfer'::text,
    ft.date::date,
    ft.origin_system_id::bigint,
    ft.batch_id::bigint,
    ft.notes::text
  FROM public.fish_transfer ft
  JOIN farm_systems fs ON fs.system_id = ft.origin_system_id
  WHERE (p_date_from IS NULL OR ft.date >= p_date_from)
    AND (p_date_to   IS NULL OR ft.date <= p_date_to)
    AND (p_table IS NULL OR p_table = 'fish_transfer')

  UNION ALL

  -- water_quality_measurement
  SELECT
    wq.id::bigint,
    'water_quality_measurement'::text,
    wq.date::date,
    wq.system_id::bigint,
    NULL::bigint,
    NULL::text
  FROM public.water_quality_measurement wq
  JOIN farm_systems fs ON fs.system_id = wq.system_id
  WHERE (p_date_from IS NULL OR wq.date >= p_date_from)
    AND (p_date_to   IS NULL OR wq.date <= p_date_to)
    AND (p_table IS NULL OR p_table = 'water_quality_measurement')

  UNION ALL

  -- feed_inventory (farm-scoped, no system_id)
  SELECT
    fi.id::bigint,
    'feed_inventory'::text,
    fi.inventory_date::date,
    NULL::bigint,
    NULL::bigint,
    fi.comments::text
  FROM public.feed_inventory fi
  WHERE fi.farm_id = p_farm_id
    AND (p_date_from IS NULL OR fi.inventory_date >= p_date_from)
    AND (p_date_to   IS NULL OR fi.inventory_date <= p_date_to)
    AND (p_table IS NULL OR p_table = 'feed_inventory')
)

SELECT
  a.id,
  a.table_name,
  a.activity_date,
  a.system_id,
  a.batch_id,
  a.notes
FROM activity a
ORDER BY a.activity_date DESC, a.table_name, a.id DESC
LIMIT COALESCE(p_limit, 50);
$function$
;

CREATE OR REPLACE FUNCTION public.api_recommended_actions(p_farm_id uuid, p_system_id bigint DEFAULT NULL::bigint)
 RETURNS TABLE(system_id bigint, system_name text, metric_name text, current_value numeric, threshold_low numeric, threshold_high numeric, unit text, severity text, context_json jsonb)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
-- L3: All KPI reads come from L1 (daily_system_facts) and L1-WQ (daily_water_quality_rating).
-- No direct L0 reads for computed metrics.
WITH sys AS (
  SELECT s.id AS system_id, s.name AS system_name
  FROM public.system s
  WHERE s.farm_id = p_farm_id
    AND s.is_active = true
    AND COALESCE(s.cage_status, 'occupied'::public.cage_status_enum) <> 'retired'::public.cage_status_enum
    AND (p_system_id IS NULL OR s.id = p_system_id)
    AND private.is_farm_member(p_farm_id)
),
-- Latest daily facts snapshot per system (L1)
latest_dsf AS (
  SELECT DISTINCT ON (dsf.system_id)
    dsf.system_id,
    dsf.mortality_rate,
    dsf.feeding_rate,
    dsf.abw_last_sampling,
    dsf.number_of_fish,
    dsf.inventory_date
  FROM analytics.daily_system_facts dsf
  JOIN sys ON sys.system_id = dsf.system_id
  ORDER BY dsf.system_id, dsf.inventory_date DESC
),
-- Latest WQ rating per system from L1-WQ (daily_water_quality_rating)
-- This already classifies DO, ammonia, etc. into worst_parameter / rating
latest_wq AS (
  SELECT DISTINCT ON (dwr.system_id)
    dwr.system_id,
    dwr.rating_date,
    dwr.rating_numeric,
    dwr.worst_parameter,
    dwr.worst_parameter_value,
    dwr.worst_parameter_unit
  FROM public.daily_water_quality_rating dwr
  JOIN sys ON sys.system_id = dwr.system_id
  ORDER BY dwr.system_id, dwr.rating_date DESC
),
-- Thresholds: farm-level overrides, then defaults
thresholds AS (
  SELECT
    COALESCE(
      (SELECT at.low_do_threshold FROM public.alert_threshold at WHERE at.farm_id = p_farm_id LIMIT 1),
      (SELECT at.low_do_threshold FROM public.alert_threshold at WHERE at.scope = 'default' LIMIT 1)
    ) AS low_do_threshold,
    COALESCE(
      (SELECT at.high_ammonia_threshold FROM public.alert_threshold at WHERE at.farm_id = p_farm_id LIMIT 1),
      (SELECT at.high_ammonia_threshold FROM public.alert_threshold at WHERE at.scope = 'default' LIMIT 1)
    ) AS high_ammonia_threshold,
    COALESCE(
      (SELECT at.high_mortality_threshold FROM public.alert_threshold at WHERE at.farm_id = p_farm_id LIMIT 1),
      (SELECT at.high_mortality_threshold FROM public.alert_threshold at WHERE at.scope = 'default' LIMIT 1)
    ) AS high_mortality_threshold,
    COALESCE(
      (SELECT at.low_survival_pct FROM public.alert_threshold at WHERE at.farm_id = p_farm_id LIMIT 1),
      (SELECT at.low_survival_pct FROM public.alert_threshold at WHERE at.scope = 'default' LIMIT 1)
    ) AS low_survival_pct,
    COALESCE(
      (SELECT at.critical_survival_pct FROM public.alert_threshold at WHERE at.farm_id = p_farm_id LIMIT 1),
      (SELECT at.critical_survival_pct FROM public.alert_threshold at WHERE at.scope = 'default' LIMIT 1)
    ) AS critical_survival_pct
),
-- Mortality alert (from L1)
mortality_alerts AS (
  SELECT
    d.system_id,
    'mortality_rate'::text AS metric_name,
    d.mortality_rate::numeric AS current_value,
    NULL::numeric AS threshold_low,
    t.high_mortality_threshold::numeric AS threshold_high,
    '%'::text AS unit,
    CASE WHEN d.mortality_rate >= t.high_mortality_threshold * 2 THEN 'critical'
         WHEN d.mortality_rate >= t.high_mortality_threshold THEN 'warning'
    END AS severity,
    jsonb_build_object('inventory_date', d.inventory_date, 'fish_count', d.number_of_fish) AS context_json
  FROM latest_dsf d
  CROSS JOIN thresholds t
  WHERE t.high_mortality_threshold IS NOT NULL
    AND d.mortality_rate >= t.high_mortality_threshold
),
-- WQ alerts from L1-WQ (worst_parameter already identified by refresh_daily_water_quality_rating)
wq_alerts AS (
  SELECT
    w.system_id,
    COALESCE(w.worst_parameter::text, 'water_quality') AS metric_name,
    w.worst_parameter_value::numeric AS current_value,
    NULL::numeric AS threshold_low,
    NULL::numeric AS threshold_high,
    COALESCE(w.worst_parameter_unit, '') AS unit,
    CASE WHEN w.rating_numeric <= 1 THEN 'critical'
         WHEN w.rating_numeric <= 2 THEN 'warning'
    END AS severity,
    jsonb_build_object('rating_date', w.rating_date, 'rating_numeric', w.rating_numeric, 'worst_parameter', w.worst_parameter) AS context_json
  FROM latest_wq w
  WHERE w.rating_numeric IS NOT NULL AND w.rating_numeric <= 2
)
-- Union all alert types and return with system name
SELECT
  a.system_id,
  sys.system_name,
  a.metric_name,
  a.current_value,
  a.threshold_low,
  a.threshold_high,
  a.unit,
  a.severity,
  a.context_json
FROM (
  SELECT * FROM mortality_alerts
  UNION ALL
  SELECT * FROM wq_alerts
) a
JOIN sys ON sys.system_id = a.system_id
ORDER BY a.severity DESC, sys.system_name, a.metric_name;
$function$
;

CREATE OR REPLACE FUNCTION public.api_system_daily_trend(p_farm_id uuid, p_system_ids bigint[] DEFAULT NULL::bigint[], p_start_date date DEFAULT NULL::date, p_end_date date DEFAULT NULL::date)
 RETURNS TABLE(date date, system_id bigint, number_of_fish double precision, abw_last_sampling double precision, biomass_last_sampling double precision, feeding_rate double precision, biomass_density double precision, fish_density double precision, mortality_rate double precision, fish_died_today double precision, fish_stocked_today double precision, fish_transferred_in_today double precision, fish_transferred_out_today double precision, fish_harvested_today double precision, feeding_amount_today double precision, system_volume double precision)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'analytics', 'private'
AS $function$
declare
v_end_date date := coalesce(p_end_date, current_date);
v_start_date date := coalesce(p_start_date, v_end_date - 29);
begin
if not private.is_farm_member(p_farm_id) then
return;
end if;
perform private.assert_rpc_parameters(
p_farm_id := p_farm_id,
p_system_ids := p_system_ids,
p_cycle_id := null::bigint,
p_start_date := v_start_date,
p_end_date := v_end_date
);
return query
select
dsf.inventory_date as date,
dsf.system_id as system_id,
dsf.number_of_fish as number_of_fish,
dsf.abw_last_sampling as abw_last_sampling,
dsf.biomass_last_sampling as biomass_last_sampling,
dsf.feeding_rate as feeding_rate,
dsf.biomass_density as biomass_density,
dsf.fish_density as fish_density,
dsf.mortality_rate as mortality_rate,
dsf.fish_died_today as fish_died_today,
dsf.fish_stocked_today as fish_stocked_today,
dsf.fish_transferred_in_today as fish_transferred_in_today,
dsf.fish_transferred_out_today as fish_transferred_out_today,
dsf.fish_harvested_today as fish_harvested_today,
dsf.feeding_amount_today as feeding_amount_today,
dsf.system_volume as system_volume
from analytics.daily_system_facts dsf
join public.system s on s.id = dsf.system_id
where s.farm_id = p_farm_id
and dsf.inventory_date between v_start_date and v_end_date
and (p_system_ids is null or dsf.system_id = any(p_system_ids))
order by dsf.system_id, dsf.inventory_date;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.api_system_feed_status(p_farm_id uuid, p_system_ids bigint[] DEFAULT NULL::bigint[], p_start_date date DEFAULT NULL::date, p_end_date date DEFAULT NULL::date)
 RETURNS TABLE(system_id bigint, system_name text, date date, biomass_kg numeric, planned_feed_kg numeric, actual_feed_kg numeric, deviation_pct numeric, feeding_rate_pct numeric, efcr_period numeric, status text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'analytics', 'private'
AS $function$
declare
  v_end_date date := coalesce(p_end_date, current_date);
  v_start_date date := coalesce(p_start_date, v_end_date - 29);
begin
  if not private.is_farm_member(p_farm_id) then
    return;
  end if;

  perform private.assert_rpc_parameters(
    p_farm_id := p_farm_id,
    p_system_ids := p_system_ids,
    p_cycle_id := null::bigint,
    p_start_date := v_start_date,
    p_end_date := v_end_date
  );

  return query
  select distinct on (sfs.system_id)
    sfs.system_id,
    sfs.system_name,
    sfs.date,
    sfs.biomass_kg,
    sfs.planned_feed_kg,
    sfs.actual_feed_kg,
    sfs.deviation_pct,
    sfs.feeding_rate_pct,
    sfs.efcr_period,
    sfs.status
  from analytics.system_feed_status sfs
  where sfs.farm_id = p_farm_id
    and sfs.date between v_start_date and v_end_date
    and (p_system_ids is null or sfs.system_id = any(p_system_ids))
  order by sfs.system_id, sfs.date desc;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.api_system_options_rpc(p_farm_id uuid DEFAULT NULL::uuid, p_stage public.system_growth_stage DEFAULT NULL::public.system_growth_stage, p_active_only boolean DEFAULT true)
 RETURNS TABLE(id bigint, farm_id uuid, farm_name text, label text, name text, unit text, type text, growth_stage public.system_growth_stage, is_active boolean)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
select
s.id,
s.farm_id,
f.name as farm_name,
case
when nullif(trim(s.unit), '') is not null
and nullif(trim(s.name), '') is not null
and lower(trim(s.name)) like lower(trim(s.unit)) || '%'
then trim(s.name)
when nullif(trim(s.unit), '') is not null
and nullif(trim(s.name), '') is not null
then trim(s.unit) || trim(s.name)
when nullif(trim(s.name), '') is not null then trim(s.name)
when nullif(trim(s.unit), '') is not null then trim(s.unit)
else 'Missing cage name'
end as label,
s.name,
s.unit,
s.type::text,
s.growth_stage,
s.is_active
from public.system s
join public.farm f on f.id = s.farm_id
where (p_farm_id is null or s.farm_id = p_farm_id)
and (p_farm_id is null or private.is_farm_member(p_farm_id))
and (p_stage is null or s.growth_stage = p_stage)
and (not p_active_only or s.is_active = true)
order by s.is_active desc, s.id desc;
$function$
;

CREATE OR REPLACE FUNCTION public.api_system_timeline_bounds(p_farm_id uuid, p_system_id bigint DEFAULT NULL::bigint)
 RETURNS TABLE(system_id bigint, resolved_start date, resolved_end date, resolved_ongoing boolean, snapshot_as_of date, first_stocking_date date, final_harvest_date date, first_activity_date date, last_activity_date date, configured_cycle_start date, configured_cycle_end date, period_source text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
  with sys as (
    select s.id as system_id
    from public.system s
    where private.app_rpc_scope_ok(
      p_farm_id,
      case when p_system_id is not null then array[p_system_id] else null::bigint[] end,
      null,
      null,
      null
    )
      and s.farm_id = p_farm_id
      and coalesce(s.is_active, true) = true
      and (p_system_id is null or s.id = p_system_id)
  ),
  snapshot_bounds as (
    select d.system_id,
           max(d.inventory_date) as snapshot_as_of
    from analytics.daily_system_facts d
    join sys on sys.system_id = d.system_id
    group by d.system_id
  ),
  stocking_bounds as (
    select fs.system_id,
           min(fs.date) as first_stocking_date
    from public.fish_stocking fs
    join sys on sys.system_id = fs.system_id
    group by fs.system_id
  ),
  harvest_bounds as (
    select fh.system_id,
           max(fh.date) as final_harvest_date
    from public.fish_harvest fh
    join sys on sys.system_id = fh.system_id
    where fh.type_of_harvest = 'final'::public.type_of_harvest
    group by fh.system_id
  ),
  configured_cycle as (
    select occ.system_id,
           min(pc.cycle_start) as configured_cycle_start,
           case when bool_or(pc.cycle_end is null) then null else max(pc.cycle_end) end as configured_cycle_end
    from (
      select fs.system_id, fs.cycle_id
      from public.fish_stocking fs
      join sys on sys.system_id = fs.system_id
      where fs.cycle_id is not null

      union

      select ft.target_system_id as system_id, ft.cycle_id
      from public.fish_transfer ft
      join sys on sys.system_id = ft.target_system_id
      where ft.target_system_id is not null
        and ft.cycle_id is not null
    ) occ
    join public.production_cycle pc on pc.cycle_id = occ.cycle_id
    group by occ.system_id
  ),
  activity_bounds as (
    select sub.system_id,
           min(sub.d) as first_activity_date,
           max(sub.d) as last_activity_date
    from (
      select dsf.system_id, dsf.inventory_date as d
        from analytics.daily_system_facts dsf
        join sys on sys.system_id = dsf.system_id
      union all
      select fsw.system_id, fsw.date as d
        from public.fish_sampling_weight fsw
        join sys on sys.system_id = fsw.system_id
      union all
      select dwr.system_id, dwr.rating_date as d
        from public.daily_water_quality_rating dwr
        join sys on sys.system_id = dwr.system_id
      union all
      select fh.system_id, fh.date as d
        from public.fish_harvest fh
        join sys on sys.system_id = fh.system_id
      union all
      select ft.origin_system_id as system_id, ft.date as d
        from public.fish_transfer ft
        join sys on sys.system_id = ft.origin_system_id
       where ft.origin_system_id is not null
      union all
      select ft.target_system_id as system_id, ft.date as d
        from public.fish_transfer ft
        join sys on sys.system_id = ft.target_system_id
       where ft.target_system_id is not null
    ) sub
    group by sub.system_id
  )
  select
    sys.system_id,
    case
      when sb.first_stocking_date is not null then sb.first_stocking_date
      when cc.configured_cycle_start is not null and ab.first_activity_date is null then cc.configured_cycle_start
      else ab.first_activity_date
    end as resolved_start,
    case
      when sb.first_stocking_date is not null then hb.final_harvest_date
      when cc.configured_cycle_start is not null and ab.first_activity_date is null then cc.configured_cycle_end
      else coalesce(hb.final_harvest_date, ab.last_activity_date)
    end as resolved_end,
    case
      when sb.first_stocking_date is not null then hb.final_harvest_date is null
      when cc.configured_cycle_start is not null and ab.first_activity_date is null then cc.configured_cycle_end is null
      else false
    end as resolved_ongoing,
    snap.snapshot_as_of,
    sb.first_stocking_date,
    hb.final_harvest_date,
    ab.first_activity_date,
    ab.last_activity_date,
    cc.configured_cycle_start,
    cc.configured_cycle_end,
    case
      when sb.first_stocking_date is not null and hb.final_harvest_date is null then 'cycle_ongoing'
      when sb.first_stocking_date is not null and hb.final_harvest_date is not null then 'cycle_closed'
      when cc.configured_cycle_start is not null and ab.first_activity_date is null then 'planned_cycle'
      when ab.first_activity_date is not null then 'observed_activity'
      else 'no_data'
    end as period_source
  from sys
  left join snapshot_bounds snap on snap.system_id = sys.system_id
  left join stocking_bounds sb on sb.system_id = sys.system_id
  left join harvest_bounds hb on hb.system_id = sys.system_id
  left join configured_cycle cc on cc.system_id = sys.system_id
  left join activity_bounds ab on ab.system_id = sys.system_id
  order by sys.system_id;
$function$
;

CREATE OR REPLACE FUNCTION public.api_time_period_bounds_scoped(p_farm_id uuid, p_time_period text, p_scope text DEFAULT 'dashboard'::text, p_anchor_date date DEFAULT NULL::date, p_system_id bigint DEFAULT NULL::bigint, p_batch_id bigint DEFAULT NULL::bigint)
 RETURNS TABLE(time_period text, input_start_date date, input_end_date date, anchor_scope text, latest_available_date date, available_from_date date, requested_days integer, available_days integer, resolved_days integer, staleness_days integer, is_truncated boolean)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
  with perm as (
    select private.app_rpc_scope_ok(p_farm_id, null, null, null, null) as ok
  ),
  selected_batch as (
    select fb.id, fb.date_of_delivery
    from public.fingerling_batch fb
    join perm on perm.ok
    where p_batch_id is not null
      and fb.id = p_batch_id
      and fb.farm_id = p_farm_id
      and private.is_farm_member(fb.farm_id)
    limit 1
  ),
  resolved_scope as (
    select case lower(coalesce(nullif(trim(p_scope), ''), 'dashboard'))
      when 'dashboard' then 'dashboard'
      when 'inventory' then 'inventory'
      when 'production' then 'production'
      when 'water_quality' then 'water_quality'
      when 'water-quality' then 'water_quality'
      when 'feeding' then 'feeding'
      when 'feed' then 'feeding'
      when 'feed_inventory' then 'feed_inventory'
      when 'feed-inventory' then 'feed_inventory'
      else 'dashboard'
    end as anchor_scope
    from perm where perm.ok
  ),
  requested_period as (
    select lower(replace(coalesce(nullif(trim(p_time_period), ''), '2 weeks'), '-', ' ')) as value
  ),
  tp as (
    select
      case
        when rp.value in ('all history', 'all_history') then 'all history'
        else dtp.time_period::text
      end as time_period,
      case
        when rp.value in ('all history', 'all_history') then null::integer
        else greatest(dtp.days_since_start, 1)
      end as requested_days
    from requested_period rp
    join perm on perm.ok
    left join public.dashboard_time_period dtp on dtp.time_period::text = rp.value
    where rp.value in ('all history', 'all_history') or dtp.time_period is not null
    limit 1
  ),
  capped_anchor as (
    select least(coalesce(p_anchor_date, current_date), current_date) as value
  ),
  batch_systems as (
    select bsi.system_id
    from selected_batch sb
    cross join public.api_batch_system_ids(sb.id) bsi
  ),
  active_systems as (
    select s.id
    from public.system s
    where s.farm_id = p_farm_id
      and coalesce(s.is_active, true) = true
      and (p_system_id is null or s.id = p_system_id)
      and (p_batch_id is null or exists (select 1 from batch_systems bs where bs.system_id = s.id))
  ),
  scoped_dates as (
    select
      rs.anchor_scope,
      case rs.anchor_scope
        when 'water_quality' then (
          select max(latest_date)
          from (
            select max(dwr.rating_date) as latest_date
            from active_systems s
            join public.daily_water_quality_rating dwr on dwr.system_id = s.id
            cross join capped_anchor ca
            where dwr.rating_date <= ca.value
            group by s.id
          ) per_system
          where latest_date is not null
        )
        when 'feeding' then (
          select max(latest_date)
          from (
            select max(fr.date) as latest_date
            from active_systems s
            join public.feeding_record fr on fr.system_id = s.id
            cross join capped_anchor ca
            where fr.date <= ca.value
            group by s.id
          ) per_system
          where latest_date is not null
        )
        when 'feed_inventory' then (
          select max(fi.inventory_date)
          from public.feed_inventory fi
          cross join capped_anchor ca
          where fi.farm_id = p_farm_id
            and fi.inventory_date <= ca.value
            and p_system_id is null
            and p_batch_id is null
        )
        else (
          select max(latest_date)
          from (
            select max(d.inventory_date) as latest_date
            from active_systems s
            join analytics.daily_system_facts d on d.system_id = s.id
            cross join capped_anchor ca
            where d.inventory_date <= ca.value
            group by s.id
          ) per_system
          where latest_date is not null
        )
      end as latest_available_date,
      case rs.anchor_scope
        when 'water_quality' then (
          select min(dwr.rating_date)
          from active_systems s
          join public.daily_water_quality_rating dwr on dwr.system_id = s.id
          where dwr.rating_date <= current_date
        )
        when 'feeding' then (
          select min(fr.date)
          from active_systems s
          join public.feeding_record fr on fr.system_id = s.id
          where fr.date <= current_date
        )
        when 'feed_inventory' then (
          select min(fi.inventory_date)
          from public.feed_inventory fi
          where fi.farm_id = p_farm_id
            and fi.inventory_date <= current_date
            and p_system_id is null
            and p_batch_id is null
        )
        else (
          select min(d.inventory_date)
          from active_systems s
          join analytics.daily_system_facts d on d.system_id = s.id
          where d.inventory_date <= current_date
        )
      end as first_data_date
    from resolved_scope rs
  ),
  scoped_available as (
    select
      sd.anchor_scope,
      sd.latest_available_date,
      case
        when sd.first_data_date is null then null::date
        when sb.date_of_delivery is null then sd.first_data_date
        else greatest(sd.first_data_date, sb.date_of_delivery)
      end as available_from_date
    from scoped_dates sd
    left join selected_batch sb on true
  ),
  bounded as (
    select
      tp.time_period,
      sa.anchor_scope,
      sa.latest_available_date as input_end_date,
      sa.available_from_date,
      tp.requested_days,
      case
        when sa.latest_available_date is null or sa.available_from_date is null then null::date
        when tp.time_period = 'all history' then sa.available_from_date
        else greatest(sa.available_from_date, sa.latest_available_date - (tp.requested_days - 1))
      end as input_start_date
    from tp cross join scoped_available sa
  )
  select
    b.time_period,
    b.input_start_date,
    b.input_end_date,
    case
      when p_system_id is not null and p_batch_id is not null then b.anchor_scope || ':system:batch'
      when p_system_id is not null then b.anchor_scope || ':system'
      when p_batch_id is not null then b.anchor_scope || ':batch'
      else b.anchor_scope
    end as anchor_scope,
    b.input_end_date as latest_available_date,
    b.available_from_date,
    b.requested_days,
    case
      when b.input_end_date is null or b.available_from_date is null then null::integer
      else (b.input_end_date - b.available_from_date + 1)::integer
    end as available_days,
    case
      when b.input_end_date is null or b.input_start_date is null then null::integer
      else (b.input_end_date - b.input_start_date + 1)::integer
    end as resolved_days,
    case
      when b.input_end_date is null then null::integer
      else greatest((current_date - b.input_end_date)::integer, 0)
    end as staleness_days,
    case
      when b.time_period = 'all history' then false
      when b.input_end_date is null or b.available_from_date is null or b.input_start_date is null then false
      else b.input_start_date > (b.input_end_date - (b.requested_days - 1))
    end as is_truncated
  from bounded b;
$function$
;

create or replace view "public"."api_water_quality_measurements" as  SELECT wqm.id,
    wqm.system_id,
    s.farm_id,
    s.name AS system_name,
    wqm.date,
    wqm."time",
    wqm.parameter_name,
    wqm.parameter_value,
    wqm.water_depth,
    wqf.unit,
    wqm.created_at,
    (wqm.parameter_name)::text AS parameter_name_normalized
   FROM ((public.water_quality_measurement wqm
     JOIN public.system s ON ((s.id = wqm.system_id)))
     JOIN public.water_quality_framework wqf ON ((wqf.parameter_name = wqm.parameter_name)))
  WHERE (EXISTS ( SELECT 1
           FROM public.user_profile up
          WHERE ((up.user_id = auth.uid()) AND (up.farm_id = s.farm_id) AND (up.role = ANY (ARRAY['admin'::text, 'farm_manager'::text, 'system_operator'::text])))));


CREATE OR REPLACE FUNCTION public.api_water_quality_trend(p_farm_id uuid, p_system_id bigint DEFAULT NULL::bigint, p_start_date date DEFAULT NULL::date, p_end_date date DEFAULT NULL::date)
 RETURNS TABLE(wq_date date, system_id bigint, system_name text, temp_avg double precision, temp_min double precision, temp_max double precision, do_avg double precision, do_min double precision, do_max double precision, do_variation double precision, ph_avg double precision, rating text, rating_numeric integer, rating_7d_rolling double precision)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'private'
AS $function$
declare
  v_start date := coalesce(p_start_date, date '1900-01-01');
  v_end date := coalesce(
    p_end_date,
    (
      select max(dwr.rating_date)
      from public.daily_water_quality_rating dwr
      join public.system s on s.id = dwr.system_id
      where s.farm_id = p_farm_id
        and (p_system_id is null or dwr.system_id = p_system_id)
    ),
    current_date
  );
begin
  if not private.is_farm_member(p_farm_id) then
    return;
  end if;

  return query
  with daily_params as (
    select
      wqm.system_id,
      s.farm_id,
      wqm.date as wq_date,
      avg(case when wqm.parameter_name::text = 'temperature' then wqm.parameter_value end) as temp_avg,
      min(case when wqm.parameter_name::text = 'temperature' then wqm.parameter_value end) as temp_min,
      max(case when wqm.parameter_name::text = 'temperature' then wqm.parameter_value end) as temp_max,
      avg(case when wqm.parameter_name::text = 'dissolved_oxygen' then wqm.parameter_value end) as do_avg,
      min(case when wqm.parameter_name::text = 'dissolved_oxygen' then wqm.parameter_value end) as do_min,
      max(case when wqm.parameter_name::text = 'dissolved_oxygen' then wqm.parameter_value end) as do_max,
      avg(case when wqm.parameter_name::text = 'ph' then wqm.parameter_value end) as ph_avg
    from public.water_quality_measurement wqm
    join public.system s on s.id = wqm.system_id
    where s.farm_id = p_farm_id
      and (p_system_id is null or wqm.system_id = p_system_id)
      and wqm.date between v_start and v_end
    group by wqm.system_id, s.farm_id, wqm.date
  ),
  with_rating as (
    select
      dp.*,
      dqr.system_name,
      initcap(dqr.rating::text) as rating,
      dqr.rating_numeric
    from daily_params dp
    left join public.api_daily_water_quality_rating dqr
      on dqr.system_id = dp.system_id and dqr.rating_date = dp.wq_date
  )
  select
    wr.wq_date,
    wr.system_id,
    wr.system_name,
    wr.temp_avg,
    wr.temp_min,
    wr.temp_max,
    wr.do_avg,
    wr.do_min,
    wr.do_max,
    (wr.do_max - wr.do_min) as do_variation,
    wr.ph_avg,
    wr.rating::text,
    wr.rating_numeric,
    avg(wr.rating_numeric::double precision) over (
      partition by wr.system_id
      order by wr.wq_date
      rows between 6 preceding and current row
    ) as rating_7d_rolling
  from with_rating wr
  order by wr.system_id, wr.wq_date;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.assign_operation_lineage_from_system()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'public'
AS $function$
declare lineage record;
begin
  if new.cycle_id is not null then
    select pc.cycle_id, pc.batch_id into lineage from public.production_cycle pc where pc.cycle_id = new.cycle_id;
    if lineage.cycle_id is null then raise exception 'Unknown production cycle %', new.cycle_id; end if;
    if new.batch_id is not null and new.batch_id <> lineage.batch_id then raise exception 'Production cycle % belongs to batch %, not batch %', new.cycle_id, lineage.batch_id, new.batch_id; end if;
    new.batch_id := lineage.batch_id;
  elsif new.batch_id is not null then
    select pc.cycle_id, pc.batch_id into lineage from public.production_cycle pc where pc.batch_id = new.batch_id;
    if lineage.cycle_id is null then raise exception 'No production cycle exists for batch %', new.batch_id; end if;
    new.cycle_id := lineage.cycle_id;
  else
    select * into lineage from public.resolve_cycle_batch_for_system_date(new.system_id, new.date);
    if lineage.cycle_id is null then raise exception 'No stocked or transferred fish batch could be resolved for system % on %', new.system_id, new.date; end if;
    new.cycle_id := lineage.cycle_id; new.batch_id := lineage.batch_id;
  end if;
  return new;
end; $function$
;

CREATE OR REPLACE FUNCTION public.assign_transfer_lineage_from_origin()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'public'
AS $function$
declare lineage record;
begin
  if new.cycle_id is not null then
    select pc.cycle_id, pc.batch_id into lineage from public.production_cycle pc where pc.cycle_id = new.cycle_id;
    if lineage.cycle_id is null then raise exception 'Unknown production cycle %', new.cycle_id; end if;
    if new.batch_id is not null and new.batch_id <> lineage.batch_id then raise exception 'Production cycle % belongs to batch %, not batch %', new.cycle_id, lineage.batch_id, new.batch_id; end if;
    new.batch_id := lineage.batch_id;
  elsif new.batch_id is not null then
    select pc.cycle_id, pc.batch_id into lineage from public.production_cycle pc where pc.batch_id = new.batch_id;
    if lineage.cycle_id is null then raise exception 'No production cycle exists for batch %', new.batch_id; end if;
    new.cycle_id := lineage.cycle_id;
  else
    if new.origin_system_id is null then raise exception 'origin_system_id is required to resolve transfer batch lineage'; end if;
    select * into lineage from public.resolve_cycle_batch_for_system_date(new.origin_system_id, new.date);
    if lineage.cycle_id is null then raise exception 'No fish batch could be resolved for transfer origin system % on %', new.origin_system_id, new.date; end if;
    new.cycle_id := lineage.cycle_id; new.batch_id := lineage.batch_id;
  end if;
  return new;
end; $function$
;

CREATE OR REPLACE FUNCTION public.claim_my_farm_user_invitations()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'private'
AS $function$
declare
  v_email text := lower(trim(coalesce(auth.email(), '')));
begin
  if auth.uid() is null or v_email = '' then
    return 0;
  end if;

  return private.apply_pending_farm_user_invitations(auth.uid(), v_email);
end;
$function$
;

CREATE OR REPLACE FUNCTION public.classify_growth_phase(p_abw_g numeric, p_scenario text DEFAULT 'main'::text)
 RETURNS TABLE(phase_id integer, scenario text, abw_min_g numeric, abw_max_g numeric, sgr_pct_per_day numeric)
 LANGUAGE sql
 STABLE
 SET search_path TO 'pg_catalog', 'public'
AS $function$
  select
    gp.phase_id,
    gp.scenario,
    gp.abw_min_g,
    gp.abw_max_g,
    gp.sgr_pct_per_day
  from public.growth_phase gp
  where p_abw_g is not null
    and gp.scenario = lower(coalesce(p_scenario, 'main'))
    and p_abw_g >= gp.abw_min_g
    and (gp.abw_max_g is null or p_abw_g <= gp.abw_max_g)
  order by gp.abw_min_g desc, gp.phase_id desc
  limit 1;
$function$
;

CREATE OR REPLACE FUNCTION public.classify_growth_stage_tanganicae(p_abw_g numeric)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'pg_catalog', 'public'
AS $function$
  select case
    when p_abw_g is null then null
    when p_abw_g < 20.0 then 'fingerling'
    when p_abw_g < 80.0 then 'juvenile'
    when p_abw_g < 250.0 then 'sub_adult'
    else 'broodstock'
  end;
$function$
;

CREATE OR REPLACE FUNCTION public.classify_water_quality_measurement(p_parameter_value double precision, p_optimal jsonb, p_acceptable jsonb, p_critical jsonb, p_lethal jsonb)
 RETURNS TABLE(measurement_rating public.water_quality_rating, severity_rank integer, distance_from_next_better_band double precision)
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'pg_catalog', 'public'
AS $function$
declare
  opt_min  double precision := nullif(p_optimal->>'min', '')::double precision;
  opt_max  double precision := nullif(p_optimal->>'max', '')::double precision;
  acc_min  double precision := nullif(p_acceptable->>'min', '')::double precision;
  acc_max  double precision := nullif(p_acceptable->>'max', '')::double precision;
  crit_min double precision := nullif(p_critical->>'min', '')::double precision;
  crit_max double precision := nullif(p_critical->>'max', '')::double precision;
  v_distance double precision;
begin
  if (opt_min is null or p_parameter_value >= opt_min)
     and (opt_max is null or p_parameter_value <= opt_max) then
    v_distance := least(coalesce(p_parameter_value - opt_min, 1e12), coalesce(opt_max - p_parameter_value, 1e12));
    return query select 'optimal'::public.water_quality_rating, 3, v_distance;
    return;
  end if;

  if (acc_min is null or p_parameter_value >= acc_min)
     and (acc_max is null or p_parameter_value <= acc_max) then
    v_distance := least(
      case when opt_min is not null and p_parameter_value < opt_min then opt_min - p_parameter_value else 1e12 end,
      case when opt_max is not null and p_parameter_value > opt_max then p_parameter_value - opt_max else 1e12 end
    );
    return query select 'acceptable'::public.water_quality_rating, 2, v_distance;
    return;
  end if;

  if (crit_min is null or p_parameter_value >= crit_min)
     and (crit_max is null or p_parameter_value <= crit_max) then
    v_distance := least(
      case when acc_min is not null and p_parameter_value < acc_min then acc_min - p_parameter_value else 1e12 end,
      case when acc_max is not null and p_parameter_value > acc_max then p_parameter_value - acc_max else 1e12 end
    );
    return query select 'critical'::public.water_quality_rating, 1, v_distance;
    return;
  end if;

  v_distance := least(
    case when crit_min is not null and p_parameter_value < crit_min then crit_min - p_parameter_value else 1e12 end,
    case when crit_max is not null and p_parameter_value > crit_max then p_parameter_value - crit_max else 1e12 end
  );
  return query select 'lethal'::public.water_quality_rating, 0, v_distance;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.close_cycle_on_final_harvest()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'public'
AS $function$
declare resolved_cycle_id bigint;
begin
  if new.type_of_harvest <> 'final'::public.type_of_harvest then return null; end if;
  resolved_cycle_id := new.cycle_id;
  if resolved_cycle_id is null and new.batch_id is not null then select pc.cycle_id into resolved_cycle_id from public.production_cycle pc where pc.batch_id = new.batch_id; end if;
  if resolved_cycle_id is null then raise exception 'Final harvest on % for batch % has no production cycle', new.date, new.batch_id; end if;
  update public.production_cycle set cycle_end = new.date, ongoing_cycle = false where cycle_id = resolved_cycle_id and (cycle_end is null or cycle_end >= new.date);
  return null;
end; $function$
;

CREATE OR REPLACE FUNCTION public.create_farm_user_invitation(p_farm_id uuid, p_email text, p_role text DEFAULT 'viewer'::text)
 RETURNS SETOF public.farm_user_invitation_rpc_result
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'private'
AS $function$
declare
  v_email text := lower(trim(coalesce(p_email, '')));
  v_role text := lower(trim(coalesce(p_role, 'viewer')));
begin
  if auth.uid() is null
     or not private.has_farm_role(p_farm_id, array['admin'], auth.uid()) then
    raise insufficient_privilege using errcode = '42501';
  end if;

  if v_email = '' or position('@' in v_email) <= 1 then
    raise exception 'A valid email is required.' using errcode = '22023';
  end if;

  if v_role not in ('admin', 'farm_manager', 'system_operator', 'data_analyst', 'viewer') then
    raise exception 'Invalid role.' using errcode = '22023';
  end if;

  return query
  with updated as (
    update private.farm_user_invitation i
    set
      role = v_role,
      status = 'pending',
      invited_by = auth.uid(),
      updated_at = timezone('utc', now()),
      revoked_at = null,
      accepted_at = null,
      invited_user_id = null
    where i.farm_id = p_farm_id
      and i.email = v_email
      and i.revoked_at is null
      and i.accepted_at is null
    returning i.*
  ),
  inserted as (
    insert into private.farm_user_invitation (
      farm_id,
      email,
      role,
      status,
      invited_by
    )
    select
      p_farm_id,
      v_email,
      v_role,
      'pending',
      auth.uid()
    where not exists (select 1 from updated)
    returning *
  ),
  selected as (
    select * from updated
    union all
    select * from inserted
  )
  select
    s.id,
    s.farm_id,
    s.email,
    s.role,
    s.status,
    s.invited_by,
    s.invited_user_id,
    s.created_at,
    s.updated_at,
    s.last_sent_at,
    s.accepted_at,
    s.revoked_at,
    true as should_send_auth_invite
  from selected s;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.ensure_cycle_on_stocking()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'public'
AS $function$
declare resolved_cycle_id bigint; resolved_batch_id bigint;
begin
  if new.batch_id is null then raise exception 'fish_stocking.batch_id is required to start a production cycle'; end if;
  if new.cycle_id is not null then
    select pc.cycle_id, pc.batch_id into resolved_cycle_id, resolved_batch_id from public.production_cycle pc where pc.cycle_id = new.cycle_id;
    if resolved_cycle_id is null or resolved_batch_id <> new.batch_id then raise exception 'Production cycle % does not belong to batch %', new.cycle_id, new.batch_id; end if;
  else
    select pc.cycle_id into resolved_cycle_id from public.production_cycle pc where pc.batch_id = new.batch_id;
  end if;
  if resolved_cycle_id is null then
    insert into public.production_cycle (system_id, batch_id, cycle_start, cycle_end, ongoing_cycle)
    values (new.system_id, new.batch_id, new.date, null, true)
    returning cycle_id into resolved_cycle_id;
  else
    update public.production_cycle set cycle_start = least(cycle_start, new.date) where cycle_id = resolved_cycle_id;
  end if;
  new.cycle_id := resolved_cycle_id;
  return new;
end; $function$
;

create type "public"."farm_user_invitation_rpc_result" as ("id" uuid, "farm_id" uuid, "email" text, "role" text, "status" text, "invited_by" uuid, "invited_user_id" uuid, "created_at" timestamp with time zone, "updated_at" timestamp with time zone, "last_sent_at" timestamp with time zone, "accepted_at" timestamp with time zone, "revoked_at" timestamp with time zone, "should_send_auth_invite" boolean);

CREATE OR REPLACE FUNCTION public.feed_inventory_snapshot_kg(p_bag_weight integer, p_amount_of_bags integer, p_opened_bags integer)
 RETURNS numeric
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'pg_catalog', 'public'
AS $function$
  select greatest(
    coalesce(p_bag_weight, 0)::numeric * coalesce(p_amount_of_bags, 0)::numeric
      + coalesce(p_opened_bags, 0)::numeric / 1000.0,
    0::numeric
  );
$function$
;

CREATE OR REPLACE FUNCTION public.feed_inventory_snapshot_kg(p_bag_weight numeric, p_amount_of_bags numeric, p_opened_bags numeric)
 RETURNS numeric
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'pg_catalog', 'public'
AS $function$
  select greatest(
    coalesce(p_bag_weight, 0)::numeric * coalesce(p_amount_of_bags, 0)::numeric
      + coalesce(p_opened_bags, 0)::numeric / 1000.0,
    0::numeric
  );
$function$
;

CREATE OR REPLACE FUNCTION public.get_running_stock(p_farm_id uuid)
 RETURNS TABLE(feed_type_id bigint, feed_type_name text, pellet_size text, current_stock_kg numeric, avg_daily_usage_kg numeric, days_remaining numeric, stock_status text, last_delivery_date date)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'private'
AS $function$
-- Auth guard folded in from the deleted api_running_stock() wrapper
WITH auth_check AS (
  SELECT private.is_farm_member(p_farm_id) AS ok
),
latest_inventory_date AS (
  SELECT max(fi.inventory_date) AS inventory_date
  FROM public.feed_inventory fi
  WHERE fi.farm_id = p_farm_id
    AND fi.inventory_date <= current_date
),
latest_snapshot AS (
  SELECT DISTINCT ON (fi.feed_type_id)
    fi.feed_type_id,
    public.feed_inventory_snapshot_kg(fi.bag_weight, fi.amount_of_bags, fi.opened_bags) AS stock_kg,
    fi.inventory_date AS last_inventory_date
  FROM public.feed_inventory fi
  JOIN latest_inventory_date lid ON lid.inventory_date = fi.inventory_date
  WHERE fi.farm_id = p_farm_id
  ORDER BY fi.feed_type_id, fi.inventory_date DESC, fi.inventory_time DESC NULLS LAST, fi.id DESC
),
usage_7d AS (
  SELECT fr.feed_type_id, GREATEST(SUM(fr.feeding_amount)::numeric / 7.0, 0.001) AS avg_d
  FROM public.feeding_record fr
  JOIN public.system s ON s.id = fr.system_id
  WHERE s.farm_id = p_farm_id
    AND fr.feed_type_id IS NOT NULL
    AND fr.date >= current_date - 7
  GROUP BY fr.feed_type_id
),
used_types AS (
  SELECT DISTINCT fr.feed_type_id
  FROM public.feeding_record fr
  JOIN public.system s ON s.id = fr.system_id
  WHERE s.farm_id = p_farm_id AND fr.feed_type_id IS NOT NULL
),
base AS (
  SELECT
    ft.id AS feed_type_id,
    CONCAT_WS(' ', COALESCE(ft.feed_line, ''), ft.feed_category::text,
      ft.feed_pellet_size::text, CONCAT('CP', ft.crude_protein_percentage::text))::text AS feed_type_name,
    ft.feed_pellet_size::text AS pellet_size,
    COALESCE(ls.stock_kg, 0) AS stock_kg,
    u7.avg_d,
    ls.last_inventory_date
  FROM public.feed_type ft
  LEFT JOIN latest_snapshot ls ON ls.feed_type_id = ft.id
  LEFT JOIN usage_7d u7 ON u7.feed_type_id = ft.id
  LEFT JOIN used_types ut ON ut.feed_type_id = ft.id
  WHERE COALESCE(ft.is_active, true)
    AND (ls.feed_type_id IS NOT NULL OR ut.feed_type_id IS NOT NULL)
)
SELECT
  b.feed_type_id,
  b.feed_type_name,
  b.pellet_size,
  ROUND(b.stock_kg, 2),
  ROUND(COALESCE(b.avg_d, 0), 2),
  CASE WHEN COALESCE(b.avg_d, 0) > 0 THEN ROUND(b.stock_kg / b.avg_d, 1) ELSE NULL END AS days_remaining,
  CASE
    WHEN COALESCE(b.avg_d, 0) = 0 THEN 'no_data'
    WHEN b.stock_kg / b.avg_d < 7  THEN 'critical'
    WHEN b.stock_kg / b.avg_d < 14 THEN 'low'
    WHEN b.stock_kg / b.avg_d < 30 THEN 'reorder'
    ELSE 'ok'
  END AS stock_status,
  b.last_inventory_date AS last_delivery_date
FROM base b
CROSS JOIN auth_check ac
WHERE ac.ok = true
ORDER BY b.stock_kg ASC;
$function$
;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'private'
AS $function$
declare
  v_email text := lower(trim(coalesce(new.email, '')));
  v_full_name text := nullif(
    trim(coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', '')),
    ''
  );
begin
  insert into public.user_profile (
    user_id,
    email,
    full_name
  )
  values (
    new.id,
    v_email,
    v_full_name
  )
  on conflict (user_id) do update
  set
    email = coalesce(excluded.email, public.user_profile.email),
    full_name = coalesce(public.user_profile.full_name, excluded.full_name),
    updated_at = timezone('utc', now());

  perform private.apply_pending_farm_user_invitations(new.id, v_email);

  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.mark_farm_user_invitation_sent(p_invitation_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'private'
AS $function$
declare
  v_farm_id uuid;
begin
  select i.farm_id
  into v_farm_id
  from private.farm_user_invitation i
  where i.id = p_invitation_id;

  if v_farm_id is null then
    raise exception 'Invitation not found' using errcode = 'P0002';
  end if;

  if auth.uid() is null
     or not private.has_farm_role(v_farm_id, array['admin'], auth.uid()) then
    raise insufficient_privilege using errcode = '42501';
  end if;

  update private.farm_user_invitation
  set
    last_sent_at = timezone('utc', now()),
    updated_at = timezone('utc', now())
  where id = p_invitation_id;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.prevent_manual_wqr_changes()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'public'
AS $function$
BEGIN
  -- Allow writes only when the system explicitly unlocks this table
  IF current_setting('app.allow_wqr_write', true) = 'true' THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'daily_water_quality_rating is managed by the system only. '
    'Direct INSERT/UPDATE/DELETE is not permitted.';
END;
$function$
;

CREATE OR REPLACE FUNCTION public.prevent_system_name_update()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_has_stocking boolean;
BEGIN
  -- Only act if name is actually changing
  IF NEW.name IS NOT DISTINCT FROM OLD.name THEN
    RETURN NEW;
  END IF;

  -- Check if the system has been stocked (has biological history)
  SELECT EXISTS (
    SELECT 1 FROM public.fish_stocking WHERE system_id = OLD.id LIMIT 1
  ) INTO v_has_stocking;

  -- Log the name change for audit trail
  INSERT INTO public.system_name_change_log
    (system_id, old_name, new_name, changed_by, has_stocking)
  VALUES
    (OLD.id, OLD.name, NEW.name, auth.uid(), v_has_stocking);

  -- Allow the change to proceed (return NEW instead of raising exception)
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.process_inventory_queue(p_limit integer DEFAULT 50)
 RETURNS TABLE(processed_system_id bigint, processed_to_date date, upserted_days integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'analytics'
AS $function$
declare
  r record;
begin
  if not exists (select 1 from public._affected_systems) then
    return;
  end if;

  refresh materialized view analytics.daily_system_facts;
  refresh materialized view analytics.production_summary;
  perform public.refresh_feeding_model_output();

  for r in
    select system_id from public._affected_systems order by system_id
  loop
    processed_system_id := r.system_id;
    processed_to_date   := current_date;
    upserted_days       := 0;
    return next;
  end loop;

  delete from public._affected_systems;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.production_cycle_set_ongoing()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'public'
AS $function$
begin
  new.ongoing_cycle := (new.cycle_end is null);
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.provision_default_farm_membership()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'private'
AS $function$
begin
  perform private.apply_pending_farm_user_invitations(new.id, new.email);
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.refresh_after_system_if_needed()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
BEGIN
  IF TG_OP IN ('INSERT', 'DELETE') THEN
    INSERT INTO public._affected_systems (system_id, min_affected_date)
    VALUES (COALESCE(NEW.id, OLD.id), COALESCE(NEW.commissioned_at, CURRENT_DATE - INTERVAL '1 year'))
    ON CONFLICT (system_id)
    DO UPDATE SET min_affected_date = LEAST(
      public._affected_systems.min_affected_date,
      EXCLUDED.min_affected_date
    );
  ELSIF
    NEW.volume             IS DISTINCT FROM OLD.volume
    OR NEW.farm_id         IS DISTINCT FROM OLD.farm_id
    OR NEW.name            IS DISTINCT FROM OLD.name
    OR NEW.growth_stage    IS DISTINCT FROM OLD.growth_stage
    OR COALESCE(NEW.is_active, true) IS DISTINCT FROM COALESCE(OLD.is_active, true)
  THEN
    INSERT INTO public._affected_systems (system_id, min_affected_date)
    VALUES (NEW.id, CURRENT_DATE - INTERVAL '1 year')
    ON CONFLICT (system_id)
    DO UPDATE SET min_affected_date = LEAST(
      public._affected_systems.min_affected_date,
      EXCLUDED.min_affected_date
    );
  END IF;
  RETURN NULL;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.refresh_daily_water_quality_rating(p_system_id bigint DEFAULT NULL::bigint, p_from date DEFAULT NULL::date, p_to date DEFAULT NULL::date)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
begin
  -- Allow writes to the protected table within this function scope only
  PERFORM set_config('app.allow_wqr_write', 'true', true);  -- true = local to transaction

  with measurement_base as (
    select wqm.system_id, wqm.date as rating_date, wqm.parameter_name,
      wqm.parameter_value, wf.unit::text as unit,
      wf.parameter_optimal, wf.parameter_acceptable, wf.parameter_critical, wf.parameter_lethal
    from public.water_quality_measurement wqm
    join public.water_quality_framework wf on wf.parameter_name = wqm.parameter_name
    where (p_system_id is null or wqm.system_id = p_system_id)
      and (p_from is null or wqm.date >= p_from)
      and (p_to is null or wqm.date <= p_to)
  ),
  measurement_scored as (
    select mb.system_id, mb.rating_date, mb.parameter_name, mb.parameter_value, mb.unit,
      c.measurement_rating, c.severity_rank, c.distance_from_next_better_band
    from measurement_base mb
    cross join lateral public.classify_water_quality_measurement(
      mb.parameter_value, mb.parameter_optimal, mb.parameter_acceptable,
      mb.parameter_critical, mb.parameter_lethal
    ) c
  ),
  ranked as (
    select ms.*,
      row_number() over (
        partition by ms.system_id, ms.rating_date
        order by ms.severity_rank asc, ms.distance_from_next_better_band asc,
          ms.parameter_name asc, ms.parameter_value asc
      ) as rn
    from measurement_scored ms
  ),
  daily_result as (
    select r.system_id, r.rating_date, r.measurement_rating as rating,
      r.parameter_name as worst_parameter, r.parameter_value as worst_parameter_value,
      r.unit as worst_parameter_unit, r.severity_rank,
      case r.measurement_rating
        when 'lethal' then 0 when 'critical' then 1
        when 'acceptable' then 2 when 'optimal' then 3
      end as rating_numeric
    from ranked r where r.rn = 1
  )
  insert into public.daily_water_quality_rating (
    system_id, rating_date, rating, worst_parameter, worst_parameter_value,
    worst_parameter_unit, rating_numeric
  )
  select dr.system_id, dr.rating_date, dr.rating, dr.worst_parameter,
    dr.worst_parameter_value, dr.worst_parameter_unit, dr.rating_numeric
  from daily_result dr
  on conflict (system_id, rating_date)
  do update set
    rating = excluded.rating,
    worst_parameter = excluded.worst_parameter,
    worst_parameter_value = excluded.worst_parameter_value,
    worst_parameter_unit = excluded.worst_parameter_unit,
    rating_numeric = excluded.rating_numeric;

  delete from public.daily_water_quality_rating d
  where (p_system_id is null or d.system_id = p_system_id)
    and (p_from is null or d.rating_date >= p_from)
    and (p_to is null or d.rating_date <= p_to)
    and not exists (
      select 1 from public.water_quality_measurement wqm
      where wqm.system_id = d.system_id and wqm.date = d.rating_date
    );

  -- Reset the flag (redundant since it's transaction-local, but explicit)
  PERFORM set_config('app.allow_wqr_write', 'false', true);
end;
$function$
;

CREATE OR REPLACE FUNCTION public.refresh_feeding_model_after_config_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'analytics'
AS $function$
begin
  perform public.refresh_feeding_model_output();
  return null;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.refresh_feeding_model_output()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'analytics'
AS $function$
begin
  refresh materialized view analytics.feeding_model_output;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.resolve_abw_g(p_total_weight_kg double precision, p_fish_count double precision)
 RETURNS double precision
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'pg_catalog', 'public'
AS $function$
  SELECT CASE
    WHEN p_total_weight_kg IS NOT NULL
     AND p_total_weight_kg > 0
     AND p_fish_count IS NOT NULL
     AND p_fish_count > 0
    THEN (p_total_weight_kg * 1000.0) / p_fish_count
    ELSE NULL::double precision
  END;
$function$
;

CREATE OR REPLACE FUNCTION public.resolve_cycle_batch_for_system_date(p_system_id bigint, p_date date)
 RETURNS TABLE(cycle_id integer, batch_id bigint)
 LANGUAGE sql
 STABLE
 SET search_path TO 'pg_catalog', 'public'
AS $function$
  with candidate_flows as (
    select fs.cycle_id::bigint as cycle_id,
           fs.batch_id,
           fs.date as event_date,
           fs.id as event_id,
           fs.number_of_fish_stocking::double precision as qty_delta
    from public.fish_stocking fs
    where fs.system_id = p_system_id
      and fs.date <= p_date
      and fs.cycle_id is not null
      and fs.batch_id is not null

    union all

    select ft.cycle_id::bigint,
           ft.batch_id,
           ft.date,
           ft.id,
           ft.number_of_fish_transfer::double precision
    from public.fish_transfer ft
    where ft.target_system_id = p_system_id
      and ft.date <= p_date
      and ft.cycle_id is not null
      and ft.batch_id is not null

    union all

    select ft.cycle_id::bigint,
           ft.batch_id,
           ft.date,
           ft.id,
           -ft.number_of_fish_transfer::double precision
    from public.fish_transfer ft
    where ft.origin_system_id = p_system_id
      and ft.date <= p_date
      and ft.cycle_id is not null
      and ft.batch_id is not null

    union all

    select fm.cycle_id::bigint,
           fm.batch_id,
           fm.date,
           fm.id,
           -fm.number_of_fish_mortality::double precision
    from public.fish_mortality fm
    where fm.system_id = p_system_id
      and fm.date <= p_date
      and fm.cycle_id is not null
      and fm.batch_id is not null

    union all

    select fh.cycle_id::bigint,
           fh.batch_id,
           fh.date,
           fh.id,
           -coalesce(fh.number_of_fish_harvest, 0)::double precision
    from public.fish_harvest fh
    where fh.system_id = p_system_id
      and fh.date <= p_date
      and fh.cycle_id is not null
      and fh.batch_id is not null
  ),
  batch_balance as (
    select candidate_flows.cycle_id,
           candidate_flows.batch_id,
           sum(candidate_flows.qty_delta) as fish_balance,
           max(candidate_flows.event_date) as last_event_date,
           max(candidate_flows.event_id) as last_event_id
    from candidate_flows
    group by candidate_flows.cycle_id, candidate_flows.batch_id
    having sum(candidate_flows.qty_delta) > 0
  )
  select batch_balance.cycle_id::integer,
         batch_balance.batch_id
  from batch_balance
  order by batch_balance.last_event_date desc,
           batch_balance.fish_balance desc,
           batch_balance.last_event_id desc,
           batch_balance.cycle_id desc
  limit 1;
$function$
;

CREATE OR REPLACE FUNCTION public.resolve_feeding_rate_config(p_phase_id integer, p_as_of date DEFAULT CURRENT_DATE, p_scenario text DEFAULT 'main'::text)
 RETURNS TABLE(config_id bigint, version text, scenario text, phase_id integer, abw_min_g numeric, abw_max_g numeric, feed_rate_min_pct numeric, feed_rate_max_pct numeric, feed_rate_mid_pct numeric, valid_from date, valid_to date)
 LANGUAGE sql
 STABLE
 SET search_path TO 'pg_catalog', 'public'
AS $function$
  select
    frc.config_id,
    frc.version,
    frc.scenario,
    frc.phase_id,
    frc.abw_min_g,
    frc.abw_max_g,
    frc.feed_rate_min_pct,
    frc.feed_rate_max_pct,
    round(((frc.feed_rate_min_pct + frc.feed_rate_max_pct) / 2.0)::numeric, 4) as feed_rate_mid_pct,
    frc.valid_from,
    frc.valid_to
  from public.feeding_rate_config frc
  where frc.phase_id = p_phase_id
    and frc.scenario = lower(coalesce(p_scenario, 'main'))
    and frc.is_default = true
    and frc.valid_from <= coalesce(p_as_of, current_date)
    and (frc.valid_to is null or frc.valid_to >= coalesce(p_as_of, current_date))
  order by frc.valid_from desc, frc.config_id desc
  limit 1;
$function$
;

CREATE OR REPLACE FUNCTION public.resolve_sampling_abw_g(p_abw double precision, p_total_weight_sampling double precision, p_number_of_fish_sampling numeric)
 RETURNS numeric
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'pg_catalog', 'public'
AS $function$
  select public.resolve_sampling_abw_g(
    p_abw::numeric,
    p_total_weight_sampling::numeric,
    p_number_of_fish_sampling
  )
$function$
;

CREATE OR REPLACE FUNCTION public.resolve_sampling_abw_g(p_abw numeric, p_total_weight_sampling numeric, p_number_of_fish_sampling numeric)
 RETURNS numeric
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'pg_catalog', 'public'
AS $function$
  select case
    when p_abw is not null and p_abw > 0 then p_abw
    when nullif(p_number_of_fish_sampling, 0) is null then null
    when p_total_weight_sampling is null or p_total_weight_sampling <= 0 then null
    -- More than 20 per fish is implausible as kg/fish for this farm, so treat
    -- the total as grams. Otherwise treat the total as kilograms.
    when (p_total_weight_sampling / p_number_of_fish_sampling) > 20
      then p_total_weight_sampling / p_number_of_fish_sampling
    else (p_total_weight_sampling * 1000.0) / p_number_of_fish_sampling
  end
$function$
;

CREATE OR REPLACE FUNCTION public.revoke_farm_user_invitation(p_invitation_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'private'
AS $function$
declare
  v_farm_id uuid;
begin
  select i.farm_id
  into v_farm_id
  from private.farm_user_invitation i
  where i.id = p_invitation_id;

  if v_farm_id is null then
    raise exception 'Invitation not found' using errcode = 'P0002';
  end if;

  if auth.uid() is null
     or not private.has_farm_role(v_farm_id, array['admin'], auth.uid()) then
    raise insufficient_privilege using errcode = '42501';
  end if;

  update private.farm_user_invitation
  set
    status = 'revoked',
    revoked_at = timezone('utc', now()),
    updated_at = timezone('utc', now())
  where id = p_invitation_id
    and status = 'pending'
    and revoked_at is null
    and accepted_at is null;

  if not found then
    raise exception 'Only pending invitations can be revoked' using errcode = '22023';
  end if;

  return p_invitation_id;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.set_harvest_abw()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
BEGIN
  IF NEW.abw IS NULL THEN
    NEW.abw := public.resolve_abw_g(NEW.total_weight_harvest, NEW.number_of_fish_harvest::double precision);
  END IF;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.set_sampling_weight_abw()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'public'
AS $function$
BEGIN
  IF NEW.number_of_fish_sampling IS NULL OR NEW.number_of_fish_sampling <= 0 THEN
    RAISE EXCEPTION 'number_of_fish_sampling must be greater than 0';
  END IF;

  IF NEW.total_weight_sampling IS NULL OR NEW.total_weight_sampling <= 0 THEN
    RAISE EXCEPTION 'total_weight_sampling must be greater than 0';
  END IF;

  NEW.abw := public.resolve_abw_g(NEW.total_weight_sampling, NEW.number_of_fish_sampling::double precision);

  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.set_stocking_abw()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_batch_abw double precision;
BEGIN
  IF NEW.abw IS NULL THEN
    -- Try weight/count first
    NEW.abw := public.resolve_abw_g(NEW.total_weight_stocking, NEW.number_of_fish_stocking::double precision);
    -- Fall back to fingerling_batch.abw
    IF NEW.abw IS NULL AND NEW.batch_id IS NOT NULL THEN
      SELECT fb.abw INTO v_batch_abw
      FROM public.fingerling_batch fb
      WHERE fb.id = NEW.batch_id;
      NEW.abw := v_batch_abw;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.sync_water_quality_measured_at_parts()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'public'
AS $function$
BEGIN
  IF NEW.measured_at IS NULL THEN
    IF NEW.date IS NULL OR NEW.time IS NULL THEN
      RAISE EXCEPTION 'measured_at or both date/time are required';
    END IF;
    NEW.measured_at := (NEW.date::timestamp + NEW.time) AT TIME ZONE current_setting('TimeZone');
  END IF;

  NEW.date := NEW.measured_at::date;
  NEW.time := NEW.measured_at::time;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.touch_affected_systems_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
begin
  new.updated_at := now();
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.transfer_impacts_efcr(p_transfer_type public.transfer_type, p_origin_system_id bigint, p_target_system_id bigint)
 RETURNS boolean
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'pg_catalog', 'public'
AS $function$
  select case
    when coalesce(
      p_transfer_type::text,
      case when p_origin_system_id = p_target_system_id then 'count_check' else 'transfer' end
    ) in ('transfer', 'grading', 'density_thinning', 'external_out') then true
    else false
  end;
$function$
;

CREATE OR REPLACE FUNCTION public.transfer_weight_kg(p_total_weight_transfer double precision, p_number_of_fish_transfer double precision, p_abw double precision)
 RETURNS double precision
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
  select coalesce(
    p_total_weight_transfer,
    case
      when p_number_of_fish_transfer is not null
       and p_number_of_fish_transfer > 0
       and p_abw is not null
       and p_abw > 0
      then (p_number_of_fish_transfer * p_abw) / 1000.0
      else null::double precision
    end
  )
$function$
;

CREATE OR REPLACE FUNCTION public.trg_compute_abw_transfer()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
BEGIN
  IF NEW.abw IS NULL THEN
    NEW.abw := public.resolve_abw_g(NEW.total_weight_transfer, NEW.number_of_fish_transfer::double precision);
  END IF;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.trg_refresh_daily_water_quality_rating()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_system_id bigint;
  v_date date;
begin
  if tg_op = 'DELETE' then
    v_system_id := old.system_id; v_date := old.date;
  else
    v_system_id := new.system_id; v_date := new.date;
  end if;

  perform public.refresh_daily_water_quality_rating(v_system_id, v_date, v_date);

  if tg_op = 'UPDATE' then
    if old.system_id is distinct from new.system_id or old.date is distinct from new.date then
      perform public.refresh_daily_water_quality_rating(old.system_id, old.date, old.date);
    end if;
  end if;
  return null;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.trg_refresh_daily_water_quality_rating_from_framework()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'public'
AS $function$ declare v_parameter public.water_quality_parameters; v_min_date date; v_max_date date; begin v_parameter := coalesce(new.parameter_name, old.parameter_name); select min(wqm.date), max(wqm.date) into v_min_date, v_max_date from public.water_quality_measurement wqm where wqm.parameter_name = v_parameter; if v_min_date is not null then perform public.refresh_daily_water_quality_rating(null, v_min_date, v_max_date); end if; return null; end; $function$
;

CREATE OR REPLACE FUNCTION public.trg_update_system_growth_stage()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
declare
  v_abw_g numeric;
  v_new_stage text;
begin
  v_abw_g := public.resolve_sampling_abw_g(
    new.abw::numeric,
    new.total_weight_sampling::numeric,
    new.number_of_fish_sampling::numeric
  );

  v_new_stage := public.classify_growth_stage_tanganicae(v_abw_g);

  if v_new_stage is not null then
    update public.system
    set growth_stage = v_new_stage::public.system_growth_stage
    where id = new.system_id;
  end if;

  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.enforce_api_rate_limit(p_scope text, p_user_id uuid, p_limit integer, p_window_seconds integer, p_ip_address inet DEFAULT NULL::inet)
 RETURNS TABLE(allowed boolean, current_count integer, remaining integer, reset_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_now timestamptz := now();
  v_window_start timestamptz;
  v_reset_at timestamptz;
  v_current_count integer;
begin
  if p_scope is null or btrim(p_scope) = '' then
    raise exception 'p_scope is required';
  end if;

  if p_user_id is null then
    raise exception 'p_user_id is required';
  end if;

  if p_limit is null or p_limit < 1 then
    raise exception 'p_limit must be greater than zero';
  end if;

  if p_window_seconds is null or p_window_seconds < 1 then
    raise exception 'p_window_seconds must be greater than zero';
  end if;

  v_window_start := to_timestamp(floor(extract(epoch from v_now) / p_window_seconds) * p_window_seconds);
  v_reset_at := v_window_start + make_interval(secs => p_window_seconds);

  insert into public.api_rate_limit_counter as counter (
    scope,
    user_id,
    window_start,
    request_count,
    last_request_ip
  )
  values (
    p_scope,
    p_user_id,
    v_window_start,
    1,
    p_ip_address
  )
  on conflict (scope, user_id, window_start) do update
  set
    request_count = counter.request_count + 1,
    updated_at = v_now,
    last_request_ip = excluded.last_request_ip
  returning counter.request_count into v_current_count;

  delete from public.api_rate_limit_counter
  where scope = p_scope
    and user_id = p_user_id
    and window_start < v_window_start;

  return query
  select
    v_current_count <= p_limit,
    v_current_count,
    greatest(p_limit - v_current_count, 0),
    v_reset_at;
end;
$function$
;

create materialized view "analytics"."daily_system_facts" as  WITH activity_dates AS (
         SELECT fs.system_id,
            fs.date
           FROM public.fish_stocking fs
        UNION ALL
         SELECT fm.system_id,
            fm.date
           FROM public.fish_mortality fm
        UNION ALL
         SELECT fr.system_id,
            fr.date
           FROM public.feeding_record fr
        UNION ALL
         SELECT fsw.system_id,
            fsw.date
           FROM public.fish_sampling_weight fsw
        UNION ALL
         SELECT fh.system_id,
            fh.date
           FROM public.fish_harvest fh
        UNION ALL
         SELECT ft.target_system_id AS system_id,
            ft.date
           FROM public.fish_transfer ft
          WHERE (ft.target_system_id IS NOT NULL)
        UNION ALL
         SELECT ft.origin_system_id AS system_id,
            ft.date
           FROM public.fish_transfer ft
          WHERE (ft.origin_system_id IS NOT NULL)
        ), system_bounds AS (
         SELECT s.id AS system_id,
            s.volume AS system_volume,
            min(ad.date) AS start_date,
                CASE
                    WHEN (s.decommissioned_at IS NOT NULL) THEN GREATEST(COALESCE(max(ad.date), s.decommissioned_at), s.decommissioned_at)
                    ELSE COALESCE(max(ad.date), CURRENT_DATE)
                END AS end_date
           FROM (public.system s
             LEFT JOIN activity_dates ad ON ((ad.system_id = s.id)))
          WHERE (s.farm_id IS NOT NULL)
          GROUP BY s.id, s.volume, s.commissioned_at, s.decommissioned_at
         HAVING (min(ad.date) IS NOT NULL)
        ), date_spine AS (
         SELECT sb.system_id,
            sb.system_volume,
            (gs.gs)::date AS inventory_date
           FROM (system_bounds sb
             CROSS JOIN LATERAL generate_series((sb.start_date)::timestamp without time zone, (sb.end_date)::timestamp without time zone, '1 day'::interval) gs(gs))
        ), daily_stocked AS (
         SELECT fs.system_id,
            fs.date AS inventory_date,
            (sum(fs.number_of_fish_stocking))::double precision AS qty_stocked
           FROM public.fish_stocking fs
          GROUP BY fs.system_id, fs.date
        ), daily_mortality AS (
         SELECT fm.system_id,
            fm.date AS inventory_date,
            (sum(fm.number_of_fish_mortality))::double precision AS qty_mortality
           FROM public.fish_mortality fm
          GROUP BY fm.system_id, fm.date
        ), daily_transfer_in AS (
         SELECT ft.target_system_id AS system_id,
            ft.date AS inventory_date,
            sum(ft.number_of_fish_transfer) AS qty_transfer_in
           FROM public.fish_transfer ft
          WHERE (ft.target_system_id IS NOT NULL)
          GROUP BY ft.target_system_id, ft.date
        ), daily_transfer_out AS (
         SELECT ft.origin_system_id AS system_id,
            ft.date AS inventory_date,
            sum(ft.number_of_fish_transfer) AS qty_transfer_out
           FROM public.fish_transfer ft
          WHERE (ft.origin_system_id IS NOT NULL)
          GROUP BY ft.origin_system_id, ft.date
        ), daily_harvest AS (
         SELECT fh.system_id,
            fh.date AS inventory_date,
            (sum(COALESCE(fh.number_of_fish_harvest, (0)::bigint)))::double precision AS qty_harvested
           FROM public.fish_harvest fh
          GROUP BY fh.system_id, fh.date
        ), daily_feed AS (
         SELECT fr.system_id,
            fr.date AS inventory_date,
            sum(fr.feeding_amount) AS feed_kg
           FROM public.feeding_record fr
          GROUP BY fr.system_id, fr.date
        ), daily_events AS (
         SELECT ds.system_id,
            ds.system_volume,
            ds.inventory_date,
            COALESCE(stk.qty_stocked, (0)::double precision) AS fish_stocked_today,
            COALESCE(mort.qty_mortality, (0)::double precision) AS fish_died_today,
            COALESCE(tin.qty_transfer_in, (0)::double precision) AS fish_transferred_in_today,
            COALESCE(tout.qty_transfer_out, (0)::double precision) AS fish_transferred_out_today,
            COALESCE(harv.qty_harvested, (0)::double precision) AS fish_harvested_today,
            COALESCE(feed.feed_kg, (0)::double precision) AS feeding_amount_today
           FROM ((((((date_spine ds
             LEFT JOIN daily_stocked stk ON (((stk.system_id = ds.system_id) AND (stk.inventory_date = ds.inventory_date))))
             LEFT JOIN daily_mortality mort ON (((mort.system_id = ds.system_id) AND (mort.inventory_date = ds.inventory_date))))
             LEFT JOIN daily_transfer_in tin ON (((tin.system_id = ds.system_id) AND (tin.inventory_date = ds.inventory_date))))
             LEFT JOIN daily_transfer_out tout ON (((tout.system_id = ds.system_id) AND (tout.inventory_date = ds.inventory_date))))
             LEFT JOIN daily_harvest harv ON (((harv.system_id = ds.system_id) AND (harv.inventory_date = ds.inventory_date))))
             LEFT JOIN daily_feed feed ON (((feed.system_id = ds.system_id) AND (feed.inventory_date = ds.inventory_date))))
        ), running AS (
         SELECT de.system_id,
            de.system_volume,
            de.inventory_date,
            de.fish_stocked_today,
            de.fish_died_today,
            de.fish_transferred_in_today,
            de.fish_transferred_out_today,
            de.fish_harvested_today,
            de.feeding_amount_today,
            GREATEST(sum(((((de.fish_stocked_today + de.fish_transferred_in_today) - de.fish_died_today) - de.fish_transferred_out_today) - de.fish_harvested_today)) OVER (PARTITION BY de.system_id ORDER BY de.inventory_date ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW), (0)::double precision) AS number_of_fish
           FROM daily_events de
        ), running_lineage AS (
         SELECT r.system_id,
            r.system_volume,
            r.inventory_date,
            r.fish_stocked_today,
            r.fish_died_today,
            r.fish_transferred_in_today,
            r.fish_transferred_out_today,
            r.fish_harvested_today,
            r.feeding_amount_today,
            r.number_of_fish,
            (lineage.cycle_id)::bigint AS resolved_cycle_id,
            lineage.batch_id AS resolved_batch_id
           FROM (running r
             LEFT JOIN LATERAL public.resolve_cycle_batch_for_system_date(r.system_id, r.inventory_date) lineage(cycle_id, batch_id) ON (true))
        ), sampling_anchor AS (
         SELECT w.system_id,
            w.cycle_id,
            w.date AS anchor_date,
            COALESCE(
                CASE
                    WHEN (sum(w.number_of_fish_sampling) FILTER (WHERE (w.total_weight_sampling IS NOT NULL)) > (0)::numeric) THEN ((sum(w.total_weight_sampling) FILTER (WHERE (w.total_weight_sampling IS NOT NULL)) * (1000.0)::double precision) / (NULLIF(sum(w.number_of_fish_sampling) FILTER (WHERE (w.total_weight_sampling IS NOT NULL)), (0)::numeric))::double precision)
                    ELSE NULL::double precision
                END, avg(NULLIF(w.abw, (0)::double precision))) AS abw_g,
            1 AS anchor_priority
           FROM public.fish_sampling_weight w
          WHERE (w.cycle_id IS NOT NULL)
          GROUP BY w.system_id, w.cycle_id, w.date
        ), transfer_anchor AS (
         SELECT ft.target_system_id AS system_id,
            ft.cycle_id,
            ft.date AS anchor_date,
            COALESCE(avg(NULLIF(ft.abw, (0)::double precision)),
                CASE
                    WHEN ((sum(ft.number_of_fish_transfer) > (0)::double precision) AND (sum(ft.total_weight_transfer) > (0)::double precision)) THEN ((sum(ft.total_weight_transfer) * (1000.0)::double precision) / sum(ft.number_of_fish_transfer))
                    ELSE NULL::double precision
                END) AS abw_g,
            2 AS anchor_priority
           FROM public.fish_transfer ft
          WHERE ((ft.target_system_id IS NOT NULL) AND (ft.cycle_id IS NOT NULL))
          GROUP BY ft.target_system_id, ft.cycle_id, ft.date
         HAVING (COALESCE(avg(NULLIF(ft.abw, (0)::double precision)),
                CASE
                    WHEN ((sum(ft.number_of_fish_transfer) > (0)::double precision) AND (sum(ft.total_weight_transfer) > (0)::double precision)) THEN ((sum(ft.total_weight_transfer) * (1000.0)::double precision) / sum(ft.number_of_fish_transfer))
                    ELSE NULL::double precision
                END) IS NOT NULL)
        ), stocking_anchor AS (
         SELECT fs.system_id,
            fs.cycle_id,
            fs.date AS anchor_date,
            COALESCE(avg(NULLIF(fs.abw, (0)::double precision)),
                CASE
                    WHEN ((sum(fs.number_of_fish_stocking) > (0)::numeric) AND (sum(fs.total_weight_stocking) > (0)::double precision)) THEN ((sum(fs.total_weight_stocking) * (1000.0)::double precision) / (sum(fs.number_of_fish_stocking))::double precision)
                    ELSE NULL::double precision
                END, avg(NULLIF(fb.abw, (0)::double precision))) AS abw_g,
            3 AS anchor_priority
           FROM (public.fish_stocking fs
             LEFT JOIN public.fingerling_batch fb ON ((fb.id = fs.batch_id)))
          WHERE (fs.cycle_id IS NOT NULL)
          GROUP BY fs.system_id, fs.cycle_id, fs.date
         HAVING (COALESCE(avg(NULLIF(fs.abw, (0)::double precision)),
                CASE
                    WHEN ((sum(fs.number_of_fish_stocking) > (0)::numeric) AND (sum(fs.total_weight_stocking) > (0)::double precision)) THEN ((sum(fs.total_weight_stocking) * (1000.0)::double precision) / (sum(fs.number_of_fish_stocking))::double precision)
                    ELSE NULL::double precision
                END, avg(NULLIF(fb.abw, (0)::double precision))) IS NOT NULL)
        ), all_anchors AS (
         SELECT sampling_anchor.system_id,
            sampling_anchor.cycle_id,
            sampling_anchor.anchor_date,
            sampling_anchor.abw_g,
            sampling_anchor.anchor_priority
           FROM sampling_anchor
        UNION ALL
         SELECT transfer_anchor.system_id,
            transfer_anchor.cycle_id,
            transfer_anchor.anchor_date,
            transfer_anchor.abw_g,
            transfer_anchor.anchor_priority
           FROM transfer_anchor
        UNION ALL
         SELECT stocking_anchor.system_id,
            stocking_anchor.cycle_id,
            stocking_anchor.anchor_date,
            stocking_anchor.abw_g,
            stocking_anchor.anchor_priority
           FROM stocking_anchor
        ), last_abw AS (
         SELECT DISTINCT ON (rl.system_id, rl.inventory_date) rl.system_id,
            rl.inventory_date,
            a.anchor_date AS last_abw_date,
            a.abw_g AS abw_last_sampling
           FROM (running_lineage rl
             LEFT JOIN all_anchors a ON (((a.system_id = rl.system_id) AND (a.cycle_id = rl.resolved_cycle_id) AND (a.anchor_date <= rl.inventory_date))))
          ORDER BY rl.system_id, rl.inventory_date, a.anchor_date DESC NULLS LAST, a.anchor_priority
        ), anchor_dedup AS (
         SELECT DISTINCT ON (all_anchors.system_id, all_anchors.cycle_id, all_anchors.anchor_date) all_anchors.system_id,
            all_anchors.cycle_id,
            all_anchors.anchor_date,
            all_anchors.abw_g
           FROM all_anchors
          WHERE (all_anchors.abw_g IS NOT NULL)
          ORDER BY all_anchors.system_id, all_anchors.cycle_id, all_anchors.anchor_date, all_anchors.anchor_priority
        ), anchor_brackets AS (
         SELECT anchor_dedup.system_id,
            anchor_dedup.cycle_id,
            anchor_dedup.anchor_date,
            anchor_dedup.abw_g,
            lag(anchor_dedup.anchor_date) OVER (PARTITION BY anchor_dedup.system_id, anchor_dedup.cycle_id ORDER BY anchor_dedup.anchor_date) AS prev_anchor_date,
            lag(anchor_dedup.abw_g) OVER (PARTITION BY anchor_dedup.system_id, anchor_dedup.cycle_id ORDER BY anchor_dedup.anchor_date) AS prev_anchor_abw,
            lead(anchor_dedup.anchor_date) OVER (PARTITION BY anchor_dedup.system_id, anchor_dedup.cycle_id ORDER BY anchor_dedup.anchor_date) AS next_anchor_date,
            lead(anchor_dedup.abw_g) OVER (PARTITION BY anchor_dedup.system_id, anchor_dedup.cycle_id ORDER BY anchor_dedup.anchor_date) AS next_anchor_abw
           FROM anchor_dedup
        ), estimated_abw AS (
         SELECT DISTINCT ON (rl.system_id, rl.inventory_date) rl.system_id,
            rl.inventory_date,
            ab.anchor_date AS base_anchor_date,
            ab.abw_g AS base_anchor_abw,
            ab.prev_anchor_date,
            ab.prev_anchor_abw,
            ab.next_anchor_date,
            ab.next_anchor_abw
           FROM (running_lineage rl
             LEFT JOIN anchor_brackets ab ON (((ab.system_id = rl.system_id) AND (ab.cycle_id = rl.resolved_cycle_id) AND (ab.anchor_date <= rl.inventory_date))))
          ORDER BY rl.system_id, rl.inventory_date, ab.anchor_date DESC NULLS LAST
        ), facts AS (
         SELECT rl.inventory_date,
            rl.system_id,
            rl.system_volume,
                CASE
                    WHEN (rl.number_of_fish > (0)::double precision) THEN rl.resolved_cycle_id
                    ELSE NULL::bigint
                END AS production_cycle_id,
            rl.resolved_batch_id AS batch_id,
            rl.fish_stocked_today,
            rl.fish_died_today,
            rl.fish_transferred_in_today,
            rl.fish_transferred_out_today,
            rl.fish_harvested_today,
            rl.feeding_amount_today,
            rl.number_of_fish,
            la.abw_last_sampling,
            la.last_abw_date,
                CASE
                    WHEN (la.abw_last_sampling IS NOT NULL) THEN ((la.abw_last_sampling * rl.number_of_fish) / (1000.0)::double precision)
                    ELSE NULL::double precision
                END AS biomass_kg,
                CASE
                    WHEN (ea.base_anchor_abw IS NULL) THEN NULL::double precision
                    WHEN ((ea.next_anchor_date IS NOT NULL) AND (ea.next_anchor_abw IS NOT NULL) AND (ea.next_anchor_date > ea.base_anchor_date)) THEN (ea.base_anchor_abw + (((ea.next_anchor_abw - ea.base_anchor_abw) * ((rl.inventory_date - ea.base_anchor_date))::double precision) / ((ea.next_anchor_date - ea.base_anchor_date))::double precision))
                    WHEN ((ea.prev_anchor_date IS NOT NULL) AND (ea.prev_anchor_abw IS NOT NULL) AND (ea.base_anchor_date > ea.prev_anchor_date)) THEN (ea.base_anchor_abw + (((ea.base_anchor_abw - ea.prev_anchor_abw) * ((rl.inventory_date - ea.base_anchor_date))::double precision) / ((ea.base_anchor_date - ea.prev_anchor_date))::double precision))
                    ELSE ea.base_anchor_abw
                END AS estimated_abw_g,
                CASE
                    WHEN ((la.abw_last_sampling IS NOT NULL) AND (((la.abw_last_sampling * rl.number_of_fish) / (1000.0)::double precision) > (0)::double precision)) THEN ((rl.feeding_amount_today / ((la.abw_last_sampling * rl.number_of_fish) / (1000.0)::double precision)) * (100.0)::double precision)
                    ELSE NULL::double precision
                END AS feeding_rate,
                CASE
                    WHEN ((rl.system_volume > (0)::double precision) AND (la.abw_last_sampling IS NOT NULL)) THEN (GREATEST(((la.abw_last_sampling * rl.number_of_fish) / (1000.0)::double precision), (0)::double precision) / rl.system_volume)
                    ELSE NULL::double precision
                END AS biomass_density,
                CASE
                    WHEN (rl.system_volume > (0)::double precision) THEN (rl.number_of_fish / rl.system_volume)
                    ELSE NULL::double precision
                END AS fish_density,
                CASE
                    WHEN ((((((rl.number_of_fish + rl.fish_died_today) + rl.fish_transferred_out_today) + rl.fish_harvested_today) - rl.fish_stocked_today) - rl.fish_transferred_in_today) > (0)::double precision) THEN ((rl.fish_died_today / (((((rl.number_of_fish + rl.fish_died_today) + rl.fish_transferred_out_today) + rl.fish_harvested_today) - rl.fish_stocked_today) - rl.fish_transferred_in_today)) * (100.0)::double precision)
                    ELSE (0)::double precision
                END AS mortality_rate
           FROM ((running_lineage rl
             LEFT JOIN last_abw la ON (((la.system_id = rl.system_id) AND (la.inventory_date = rl.inventory_date))))
             LEFT JOIN estimated_abw ea ON (((ea.system_id = rl.system_id) AND (ea.inventory_date = rl.inventory_date))))
        )
 SELECT f.inventory_date,
    f.system_id,
    f.production_cycle_id,
    f.batch_id,
    f.fish_stocked_today,
    f.fish_died_today,
    f.fish_transferred_in_today,
    f.fish_transferred_out_today,
    f.fish_harvested_today,
    f.feeding_amount_today,
    f.number_of_fish,
    f.abw_last_sampling,
    f.last_abw_date,
    f.biomass_kg AS biomass_last_sampling,
    f.estimated_abw_g,
        CASE
            WHEN (f.estimated_abw_g IS NOT NULL) THEN ((f.estimated_abw_g * f.number_of_fish) / (1000.0)::double precision)
            ELSE NULL::double precision
        END AS estimated_biomass_kg,
    f.feeding_rate,
    f.biomass_density,
    f.fish_density,
    f.mortality_rate,
    f.system_volume
   FROM facts f
  ORDER BY f.system_id, f.inventory_date;


create materialized view "analytics"."feeding_model_output" as  WITH base_state AS (
         SELECT dsf.inventory_date AS date,
            dsf.system_id,
            sys.farm_id,
            dsf.production_cycle_id,
            dsf.batch_id,
            (dsf.number_of_fish)::numeric AS fish_count,
            (dsf.abw_last_sampling)::numeric AS abw_g,
            (dsf.biomass_last_sampling)::numeric AS biomass_kg,
            dsf.last_abw_date,
            (dsf.feeding_amount_today)::numeric AS actual_feed_kg,
            (dsf.mortality_rate)::numeric AS mortality_rate_pct,
            (dsf.fish_density)::numeric AS fish_density,
            (dsf.biomass_density)::numeric AS biomass_density,
            (dsf.system_volume)::numeric AS system_volume
           FROM (analytics.daily_system_facts dsf
             JOIN public.system sys ON ((sys.id = dsf.system_id)))
          WHERE ((sys.farm_id IS NOT NULL) AND (COALESCE(dsf.number_of_fish, (0)::double precision) > (0)::double precision))
        ), projected AS (
         SELECT b.date,
            b.system_id,
            b.farm_id,
            b.production_cycle_id,
            b.batch_id,
            b.fish_count,
            b.abw_g,
            b.biomass_kg,
            b.last_abw_date,
            b.actual_feed_kg,
            b.mortality_rate_pct,
            b.fish_density,
            b.biomass_density,
            b.system_volume,
            (b.date - b.last_abw_date) AS days_since_last_sample,
            LEAST((b.date - b.last_abw_date), 21) AS days_capped,
                CASE
                    WHEN ((b.abw_g IS NULL) OR (b.last_abw_date IS NULL)) THEN b.abw_g
                    ELSE round((b.abw_g * power((1.0 + (gp_sgr.sgr_pct_per_day / 100.0)), (LEAST((b.date - b.last_abw_date), 21))::numeric)), 3)
                END AS abw_projected_g,
                CASE
                    WHEN (b.abw_g IS NULL) THEN NULL::numeric
                    WHEN ((b.date - b.last_abw_date) <= 10) THEN b.abw_g
                    ELSE round((b.abw_g * power((1.0 + (gp_sgr.sgr_pct_per_day / 100.0)), (LEAST((b.date - b.last_abw_date), 21))::numeric)), 3)
                END AS phase_abw
           FROM (base_state b
             LEFT JOIN LATERAL public.classify_growth_phase(b.abw_g, 'main'::text) gp_sgr(phase_id, scenario, abw_min_g, abw_max_g, sgr_pct_per_day) ON (true))
        ), daily_response AS (
         SELECT ranked.system_id,
            ranked.date,
            ranked.feeding_response
           FROM ( SELECT fr.system_id,
                    fr.date,
                    fr.feeding_response,
                    row_number() OVER (PARTITION BY fr.system_id, fr.date ORDER BY fr.created_at DESC) AS rn
                   FROM public.feeding_record fr
                  WHERE (fr.feeding_response IS NOT NULL)) ranked
          WHERE (ranked.rn = 1)
        ), classified AS (
         SELECT p.date,
            p.system_id,
            p.farm_id,
            p.production_cycle_id,
            p.batch_id,
            p.fish_count,
            p.abw_g,
            p.abw_projected_g,
            p.phase_abw,
            p.biomass_kg,
            p.last_abw_date,
            p.days_since_last_sample,
            p.days_capped,
            p.actual_feed_kg,
            p.mortality_rate_pct,
            p.fish_density,
            p.biomass_density,
            p.system_volume,
            COALESCE((dr.feeding_response)::integer, 3) AS last_feeding_response,
            'main'::text AS scenario,
            gp.phase_id,
            gp.sgr_pct_per_day
           FROM ((projected p
             LEFT JOIN LATERAL public.classify_growth_phase(p.phase_abw, 'main'::text) gp(phase_id, scenario, abw_min_g, abw_max_g, sgr_pct_per_day) ON (true))
             LEFT JOIN daily_response dr ON (((dr.system_id = p.system_id) AND (dr.date = p.date))))
        ), configured AS (
         SELECT c.date,
            c.system_id,
            c.farm_id,
            c.production_cycle_id,
            c.batch_id,
            c.fish_count,
            c.abw_g,
            c.abw_projected_g,
            c.phase_abw,
            c.biomass_kg,
            c.last_abw_date,
            c.days_since_last_sample,
            c.days_capped,
            c.actual_feed_kg,
            c.mortality_rate_pct,
            c.fish_density,
            c.biomass_density,
            c.system_volume,
            c.last_feeding_response,
            c.scenario,
            c.phase_id,
            c.sgr_pct_per_day,
            frc.version AS model_version,
            frc.feed_rate_min_pct,
            frc.feed_rate_max_pct,
            frc.feed_rate_mid_pct AS feeding_rate_mid_pct
           FROM (classified c
             LEFT JOIN LATERAL public.resolve_feeding_rate_config(c.phase_id, c.date, c.scenario) frc(config_id, version, scenario, phase_id, abw_min_g, abw_max_g, feed_rate_min_pct, feed_rate_max_pct, feed_rate_mid_pct, valid_from, valid_to) ON (true))
        ), mortality_signal AS (
         SELECT c.system_id,
            c.date,
            (avg(COALESCE(d2.mortality_rate, (0)::double precision)))::numeric AS avg_mortality_rate_7d
           FROM (configured c
             JOIN analytics.daily_system_facts d2 ON (((d2.system_id = c.system_id) AND (d2.inventory_date >= (c.date - 6)) AND (d2.inventory_date <= c.date))))
          GROUP BY c.system_id, c.date
        ), with_signals AS (
         SELECT c.date,
            c.system_id,
            c.farm_id,
            c.production_cycle_id,
            c.batch_id,
            c.fish_count,
            c.abw_g,
            c.abw_projected_g,
            c.phase_abw,
            c.biomass_kg,
            c.last_abw_date,
            c.days_since_last_sample,
            c.days_capped,
            c.actual_feed_kg,
            c.mortality_rate_pct,
            c.fish_density,
            c.biomass_density,
            c.system_volume,
            c.last_feeding_response,
            c.scenario,
            c.phase_id,
            c.sgr_pct_per_day,
            c.model_version,
            c.feed_rate_min_pct,
            c.feed_rate_max_pct,
            c.feeding_rate_mid_pct,
            COALESCE(ms.avg_mortality_rate_7d, (0)::numeric) AS avg_mortality_rate_7d,
            round((((COALESCE(c.last_feeding_response, 3))::numeric - 1.0) / 4.0), 4) AS response_factor,
            round((1.0 - LEAST((COALESCE(ms.avg_mortality_rate_7d, (0)::numeric) / 2.0), 1.0)), 4) AS mortality_factor
           FROM (configured c
             LEFT JOIN mortality_signal ms ON (((ms.system_id = c.system_id) AND (ms.date = c.date))))
        ), with_planned AS (
         SELECT s.date,
            s.system_id,
            s.farm_id,
            s.production_cycle_id,
            s.batch_id,
            s.fish_count,
            s.abw_g,
            s.abw_projected_g,
            s.phase_abw,
            s.biomass_kg,
            s.last_abw_date,
            s.days_since_last_sample,
            s.days_capped,
            s.actual_feed_kg,
            s.mortality_rate_pct,
            s.fish_density,
            s.biomass_density,
            s.system_volume,
            s.last_feeding_response,
            s.scenario,
            s.phase_id,
            s.sgr_pct_per_day,
            s.model_version,
            s.feed_rate_min_pct,
            s.feed_rate_max_pct,
            s.feeding_rate_mid_pct,
            s.avg_mortality_rate_7d,
            s.response_factor,
            s.mortality_factor,
            round((s.feed_rate_min_pct + (((s.feed_rate_max_pct - s.feed_rate_min_pct) * s.response_factor) * s.mortality_factor)), 4) AS feeding_rate_pct,
            round(((s.biomass_kg * (s.feed_rate_min_pct + (((s.feed_rate_max_pct - s.feed_rate_min_pct) * s.response_factor) * s.mortality_factor))) / 100.0), 3) AS planned_feed_kg
           FROM with_signals s
        ), with_adjusted AS (
         SELECT w.date,
            w.system_id,
            w.farm_id,
            w.production_cycle_id,
            w.batch_id,
            w.fish_count,
            w.abw_g,
            w.abw_projected_g,
            w.phase_abw,
            w.biomass_kg,
            w.last_abw_date,
            w.days_since_last_sample,
            w.days_capped,
            w.actual_feed_kg,
            w.mortality_rate_pct,
            w.fish_density,
            w.biomass_density,
            w.system_volume,
            w.last_feeding_response,
            w.scenario,
            w.phase_id,
            w.sgr_pct_per_day,
            w.model_version,
            w.feed_rate_min_pct,
            w.feed_rate_max_pct,
            w.feeding_rate_mid_pct,
            w.avg_mortality_rate_7d,
            w.response_factor,
            w.mortality_factor,
            w.feeding_rate_pct,
            w.planned_feed_kg,
            lag(w.actual_feed_kg) OVER (PARTITION BY w.system_id ORDER BY w.date) AS actual_feed_prev,
            lag(w.planned_feed_kg) OVER (PARTITION BY w.system_id ORDER BY w.date) AS planned_feed_prev,
            round((w.planned_feed_kg * GREATEST(0.85, LEAST(1.15, (lag(w.actual_feed_kg) OVER (PARTITION BY w.system_id ORDER BY w.date) / NULLIF(lag(w.planned_feed_kg) OVER (PARTITION BY w.system_id ORDER BY w.date), (0)::numeric))))), 3) AS adjusted_feed_kg
           FROM with_planned w
        )
 SELECT a.system_id,
    a.date,
    a.model_version,
    a.scenario,
    a.phase_id,
    round(a.biomass_kg, 3) AS biomass_kg,
    round(a.abw_g, 3) AS abw_g,
    round(a.abw_projected_g, 3) AS abw_projected_g,
    a.feeding_rate_pct,
    a.planned_feed_kg,
    COALESCE(a.adjusted_feed_kg, a.planned_feed_kg) AS adjusted_feed_kg,
    a.response_factor,
    a.mortality_factor,
        CASE
            WHEN ((a.abw_g IS NULL) OR (a.last_abw_date IS NULL)) THEN 'LOW'::text
            WHEN (a.days_since_last_sample > 30) THEN 'LOW'::text
            WHEN (COALESCE(a.biomass_density, (0)::numeric) > (80)::numeric) THEN 'LOW'::text
            WHEN ((a.days_since_last_sample <= 10) AND (COALESCE(a.avg_mortality_rate_7d, (0)::numeric) <= 0.5)) THEN 'HIGH'::text
            WHEN ((a.days_since_last_sample <= 21) AND (COALESCE(a.avg_mortality_rate_7d, (0)::numeric) <= 1.5)) THEN 'MEDIUM'::text
            ELSE 'LOW'::text
        END AS confidence
   FROM with_adjusted a
  ORDER BY a.system_id, a.date;


create or replace view "analytics"."feeding_rate_vs_target" as  SELECT s.farm_id,
    fmo.system_id,
    s.name AS system_name,
    fmo.date,
    fmo.feeding_rate_pct AS actual_rate,
    (frc.feed_rate_min_pct)::numeric AS feed_rate_min_pct,
    (frc.feed_rate_max_pct)::numeric AS feed_rate_max_pct
   FROM ((analytics.feeding_model_output fmo
     JOIN public.system s ON ((s.id = fmo.system_id)))
     JOIN public.feeding_rate_config frc ON (((frc.phase_id = fmo.phase_id) AND (frc.scenario = fmo.scenario) AND (frc.is_default = true) AND (frc.valid_from <= fmo.date) AND ((frc.valid_to IS NULL) OR (frc.valid_to >= fmo.date)))))
  WHERE (s.farm_id IS NOT NULL);


create materialized view "analytics"."production_summary" as  WITH boundaries_base AS (
         SELECT fs.cycle_id,
            fs.system_id,
            fs.date AS boundary_date,
            'stocking'::text AS boundary_type,
            avg(fs.abw) AS abw_g,
            (sum(fs.number_of_fish_stocking))::double precision AS fish_stocked
           FROM public.fish_stocking fs
          WHERE (fs.cycle_id IS NOT NULL)
          GROUP BY fs.cycle_id, fs.system_id, fs.date
        UNION ALL
         SELECT fsw.cycle_id,
            fsw.system_id,
            fsw.date AS boundary_date,
            'sampling'::text AS boundary_type,
            avg(fsw.abw) AS abw_g,
            NULL::double precision AS fish_stocked
           FROM public.fish_sampling_weight fsw
          WHERE (fsw.cycle_id IS NOT NULL)
          GROUP BY fsw.cycle_id, fsw.system_id, fsw.date
        UNION ALL
         SELECT ft.cycle_id,
            ft.origin_system_id AS system_id,
            ft.date AS boundary_date,
            'transfer'::text AS boundary_type,
            ft.abw AS abw_g,
            NULL::double precision AS fish_stocked
           FROM public.fish_transfer ft
          WHERE (ft.cycle_id IS NOT NULL)
        UNION ALL
         SELECT ft2.cycle_id,
            ft2.target_system_id AS system_id,
            ft2.date AS boundary_date,
            'transfer'::text AS boundary_type,
            ft2.abw AS abw_g,
            NULL::double precision AS fish_stocked
           FROM public.fish_transfer ft2
          WHERE ((ft2.cycle_id IS NOT NULL) AND (ft2.target_system_id IS NOT NULL) AND (ft2.origin_system_id <> ft2.target_system_id))
        ), latest_system_date AS (
         SELECT dsf.system_id,
            max(dsf.inventory_date) AS max_date
           FROM analytics.daily_system_facts dsf
          GROUP BY dsf.system_id
        ), current_boundary AS (
         SELECT dsf.production_cycle_id AS cycle_id,
            dsf.system_id,
            dsf.inventory_date AS boundary_date,
            'current'::text AS boundary_type,
            dsf.estimated_abw_g AS abw_g,
            NULL::double precision AS fish_stocked
           FROM (analytics.daily_system_facts dsf
             JOIN latest_system_date lsd ON (((lsd.system_id = dsf.system_id) AND (lsd.max_date = dsf.inventory_date))))
          WHERE ((dsf.production_cycle_id IS NOT NULL) AND (COALESCE(dsf.number_of_fish, (0)::double precision) > (0)::double precision) AND (dsf.inventory_date > ( SELECT max(bb.boundary_date) AS max
                   FROM boundaries_base bb
                  WHERE ((bb.cycle_id = dsf.production_cycle_id) AND (bb.system_id = dsf.system_id)))))
        ), boundaries AS (
         SELECT boundaries_base.cycle_id,
            boundaries_base.system_id,
            boundaries_base.boundary_date,
            boundaries_base.boundary_type,
            boundaries_base.abw_g,
            boundaries_base.fish_stocked
           FROM boundaries_base
        UNION ALL
         SELECT current_boundary.cycle_id,
            current_boundary.system_id,
            current_boundary.boundary_date,
            current_boundary.boundary_type,
            current_boundary.abw_g,
            current_boundary.fish_stocked
           FROM current_boundary
        ), boundaries_with_lag AS (
         SELECT b.cycle_id,
            b.system_id,
            b.boundary_date,
            b.boundary_type,
            b.abw_g,
            b.fish_stocked,
            lag(b.boundary_date) OVER (PARTITION BY b.cycle_id, b.system_id ORDER BY b.boundary_date) AS prev_boundary_date,
            lag(b.abw_g) OVER (PARTITION BY b.cycle_id, b.system_id ORDER BY b.boundary_date) AS abw_prev
           FROM boundaries b
        ), boundaries_with_facts AS (
         SELECT bl.cycle_id,
            bl.system_id,
            bl.boundary_date,
            bl.boundary_type,
            bl.abw_g,
            bl.fish_stocked,
            bl.prev_boundary_date,
            bl.abw_prev,
            dsf_curr.number_of_fish AS fish_count_current,
            dsf_prev.number_of_fish AS fish_count_prev,
            s.volume AS system_volume
           FROM (((boundaries_with_lag bl
             JOIN public.system s ON ((s.id = bl.system_id)))
             LEFT JOIN analytics.daily_system_facts dsf_curr ON (((dsf_curr.system_id = bl.system_id) AND (dsf_curr.inventory_date = bl.boundary_date))))
             LEFT JOIN analytics.daily_system_facts dsf_prev ON (((dsf_prev.system_id = bl.system_id) AND (dsf_prev.inventory_date = bl.prev_boundary_date))))
        ), period_flows AS (
         SELECT bf.cycle_id,
            bf.system_id,
            bf.boundary_date,
                CASE
                    WHEN (bf.prev_boundary_date IS NULL) THEN (0)::double precision
                    ELSE COALESCE(( SELECT (sum(fm.number_of_fish_mortality))::double precision AS sum
                       FROM public.fish_mortality fm
                      WHERE ((fm.system_id = bf.system_id) AND (fm.cycle_id = bf.cycle_id) AND (fm.date > bf.prev_boundary_date) AND (fm.date <= bf.boundary_date))), (0)::double precision)
                END AS mortality_over_period,
                CASE
                    WHEN (bf.prev_boundary_date IS NULL) THEN (0)::double precision
                    ELSE COALESCE(( SELECT sum(fr.feeding_amount) AS sum
                       FROM public.feeding_record fr
                      WHERE ((fr.system_id = bf.system_id) AND (fr.cycle_id = bf.cycle_id) AND (fr.date > bf.prev_boundary_date) AND (fr.date <= bf.boundary_date))), (0)::double precision)
                END AS feed_over_period,
                CASE
                    WHEN (bf.prev_boundary_date IS NULL) THEN COALESCE(( SELECT sum(ft.number_of_fish_transfer) AS sum
                       FROM public.fish_transfer ft
                      WHERE ((ft.target_system_id = bf.system_id) AND (ft.cycle_id = bf.cycle_id) AND (ft.date <= bf.boundary_date) AND public.transfer_impacts_efcr(ft.transfer_type, ft.origin_system_id, ft.target_system_id))), (0)::double precision)
                    ELSE COALESCE(( SELECT sum(ft.number_of_fish_transfer) AS sum
                       FROM public.fish_transfer ft
                      WHERE ((ft.target_system_id = bf.system_id) AND (ft.cycle_id = bf.cycle_id) AND (ft.date > bf.prev_boundary_date) AND (ft.date <= bf.boundary_date) AND public.transfer_impacts_efcr(ft.transfer_type, ft.origin_system_id, ft.target_system_id))), (0)::double precision)
                END AS transfers_in_over_period,
                CASE
                    WHEN (bf.prev_boundary_date IS NULL) THEN COALESCE(( SELECT sum(ft.number_of_fish_transfer) AS sum
                       FROM public.fish_transfer ft
                      WHERE ((ft.origin_system_id = bf.system_id) AND (ft.cycle_id = bf.cycle_id) AND (ft.date <= bf.boundary_date) AND public.transfer_impacts_efcr(ft.transfer_type, ft.origin_system_id, ft.target_system_id))), (0)::double precision)
                    ELSE COALESCE(( SELECT sum(ft.number_of_fish_transfer) AS sum
                       FROM public.fish_transfer ft
                      WHERE ((ft.origin_system_id = bf.system_id) AND (ft.cycle_id = bf.cycle_id) AND (ft.date > bf.prev_boundary_date) AND (ft.date <= bf.boundary_date) AND public.transfer_impacts_efcr(ft.transfer_type, ft.origin_system_id, ft.target_system_id))), (0)::double precision)
                END AS transfers_out_over_period,
                CASE
                    WHEN (bf.prev_boundary_date IS NULL) THEN COALESCE(( SELECT sum(public.transfer_weight_kg(ft.total_weight_transfer, ft.number_of_fish_transfer, ft.abw)) AS sum
                       FROM public.fish_transfer ft
                      WHERE ((ft.target_system_id = bf.system_id) AND (ft.cycle_id = bf.cycle_id) AND (ft.date <= bf.boundary_date) AND public.transfer_impacts_efcr(ft.transfer_type, ft.origin_system_id, ft.target_system_id))), (0)::double precision)
                    ELSE COALESCE(( SELECT sum(public.transfer_weight_kg(ft.total_weight_transfer, ft.number_of_fish_transfer, ft.abw)) AS sum
                       FROM public.fish_transfer ft
                      WHERE ((ft.target_system_id = bf.system_id) AND (ft.cycle_id = bf.cycle_id) AND (ft.date > bf.prev_boundary_date) AND (ft.date <= bf.boundary_date) AND public.transfer_impacts_efcr(ft.transfer_type, ft.origin_system_id, ft.target_system_id))), (0)::double precision)
                END AS weight_transfer_in_kg_period,
                CASE
                    WHEN (bf.prev_boundary_date IS NULL) THEN COALESCE(( SELECT sum(public.transfer_weight_kg(ft.total_weight_transfer, ft.number_of_fish_transfer, ft.abw)) AS sum
                       FROM public.fish_transfer ft
                      WHERE ((ft.origin_system_id = bf.system_id) AND (ft.cycle_id = bf.cycle_id) AND (ft.date <= bf.boundary_date) AND public.transfer_impacts_efcr(ft.transfer_type, ft.origin_system_id, ft.target_system_id))), (0)::double precision)
                    ELSE COALESCE(( SELECT sum(public.transfer_weight_kg(ft.total_weight_transfer, ft.number_of_fish_transfer, ft.abw)) AS sum
                       FROM public.fish_transfer ft
                      WHERE ((ft.origin_system_id = bf.system_id) AND (ft.cycle_id = bf.cycle_id) AND (ft.date > bf.prev_boundary_date) AND (ft.date <= bf.boundary_date) AND public.transfer_impacts_efcr(ft.transfer_type, ft.origin_system_id, ft.target_system_id))), (0)::double precision)
                END AS weight_transfer_out_kg_period,
                CASE
                    WHEN (bf.prev_boundary_date IS NULL) THEN (0)::double precision
                    ELSE COALESCE(( SELECT (sum(COALESCE(fh.number_of_fish_harvest, (0)::bigint)))::double precision AS sum
                       FROM public.fish_harvest fh
                      WHERE ((fh.system_id = bf.system_id) AND (fh.cycle_id = bf.cycle_id) AND (fh.date > bf.prev_boundary_date) AND (fh.date <= bf.boundary_date))), (0)::double precision)
                END AS harvest_fish_over_period,
                CASE
                    WHEN (bf.prev_boundary_date IS NULL) THEN (0)::double precision
                    ELSE COALESCE(( SELECT sum(fh.total_weight_harvest) AS sum
                       FROM public.fish_harvest fh
                      WHERE ((fh.system_id = bf.system_id) AND (fh.cycle_id = bf.cycle_id) AND (fh.date > bf.prev_boundary_date) AND (fh.date <= bf.boundary_date))), (0)::double precision)
                END AS harvest_weight_kg_over_period
           FROM boundaries_with_facts bf
        ), combined AS (
         SELECT bf.cycle_id,
            bf.system_id,
            bf.boundary_date AS sampling_date,
            bf.boundary_type,
            bf.prev_boundary_date,
                CASE
                    WHEN (bf.prev_boundary_date IS NULL) THEN 0
                    ELSE (bf.boundary_date - bf.prev_boundary_date)
                END AS days_in_period,
            bf.abw_g AS abw_current,
            bf.abw_prev,
                CASE
                    WHEN ((bf.prev_boundary_date IS NULL) AND (bf.fish_stocked IS NOT NULL)) THEN bf.fish_stocked
                    WHEN (bf.prev_boundary_date IS NULL) THEN bf.fish_count_current
                    ELSE bf.fish_count_prev
                END AS fish_count_start,
                CASE
                    WHEN ((bf.prev_boundary_date IS NULL) AND (bf.fish_stocked IS NOT NULL)) THEN bf.fish_stocked
                    WHEN (bf.prev_boundary_date IS NULL) THEN bf.fish_count_current
                    ELSE bf.fish_count_current
                END AS fish_count_end,
                CASE
                    WHEN ((bf.prev_boundary_date IS NULL) AND (bf.fish_stocked IS NOT NULL) AND (bf.abw_g IS NOT NULL)) THEN ((bf.fish_stocked * bf.abw_g) / (1000.0)::double precision)
                    WHEN ((bf.fish_count_current IS NOT NULL) AND (bf.abw_g IS NOT NULL)) THEN ((bf.fish_count_current * bf.abw_g) / (1000.0)::double precision)
                    ELSE NULL::double precision
                END AS total_weight_kg,
                CASE
                    WHEN ((bf.prev_boundary_date IS NULL) AND (bf.fish_stocked IS NOT NULL) AND (bf.abw_g IS NOT NULL)) THEN ((bf.fish_stocked * bf.abw_g) / (1000.0)::double precision)
                    WHEN ((bf.fish_count_current IS NOT NULL) AND (bf.abw_g IS NOT NULL)) THEN ((bf.fish_count_current * bf.abw_g) / (1000.0)::double precision)
                    ELSE NULL::double precision
                END AS biomass_current,
                CASE
                    WHEN (bf.prev_boundary_date IS NULL) THEN NULL::double precision
                    ELSE ((bf.fish_count_prev * bf.abw_prev) / (1000.0)::double precision)
                END AS biomass_prev,
            bf.system_volume,
            pf.mortality_over_period,
            pf.feed_over_period,
            pf.transfers_in_over_period,
            pf.transfers_out_over_period,
            pf.weight_transfer_in_kg_period,
            pf.weight_transfer_out_kg_period,
            pf.harvest_fish_over_period,
            pf.harvest_weight_kg_over_period
           FROM (boundaries_with_facts bf
             JOIN period_flows pf ON (((pf.cycle_id = bf.cycle_id) AND (pf.system_id = bf.system_id) AND (pf.boundary_date = bf.boundary_date))))
        ), with_kpis AS (
         SELECT c.cycle_id,
            c.system_id,
            c.sampling_date,
            c.boundary_type,
            c.prev_boundary_date,
            c.days_in_period,
            c.abw_current,
            c.abw_prev,
            c.fish_count_start,
            c.fish_count_end,
            c.total_weight_kg,
            c.biomass_current,
            c.biomass_prev,
            c.system_volume,
            c.mortality_over_period,
            c.feed_over_period,
            c.transfers_in_over_period,
            c.transfers_out_over_period,
            c.weight_transfer_in_kg_period,
            c.weight_transfer_out_kg_period,
            c.harvest_fish_over_period,
            c.harvest_weight_kg_over_period,
                CASE
                    WHEN (c.prev_boundary_date IS NULL) THEN (0)::double precision
                    WHEN ((c.total_weight_kg IS NULL) OR (c.biomass_prev IS NULL)) THEN (0)::double precision
                    ELSE (c.total_weight_kg - c.biomass_prev)
                END AS biomass_increase_over_period,
                CASE
                    WHEN (c.prev_boundary_date IS NULL) THEN NULL::double precision
                    WHEN ((c.total_weight_kg IS NULL) OR (c.biomass_prev IS NULL)) THEN NULL::double precision
                    ELSE ((((c.total_weight_kg - c.biomass_prev) + c.weight_transfer_out_kg_period) - c.weight_transfer_in_kg_period) + c.harvest_weight_kg_over_period)
                END AS efcr_denominator_period,
            sum(c.feed_over_period) OVER w_sys AS feed_aggregated,
            sum(c.mortality_over_period) OVER w_sys AS cumulative_mortality,
            sum(c.transfers_in_over_period) OVER w_sys AS transfers_in_aggregated,
            sum(c.transfers_out_over_period) OVER w_sys AS transfers_out_aggregated,
            sum(c.harvest_fish_over_period) OVER w_sys AS harvest_fish_aggregated,
            sum(c.harvest_weight_kg_over_period) OVER w_sys AS harvest_weight_kg_aggregated
           FROM combined c
          WINDOW w_sys AS (PARTITION BY c.cycle_id ORDER BY c.sampling_date RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)
        ), with_cumulative AS (
         SELECT w1.cycle_id,
            w1.system_id,
            w1.sampling_date,
            w1.boundary_type,
            w1.prev_boundary_date,
            w1.days_in_period,
            w1.abw_current,
            w1.abw_prev,
            w1.fish_count_start,
            w1.fish_count_end,
            w1.total_weight_kg,
            w1.biomass_current,
            w1.biomass_prev,
            w1.system_volume,
            w1.mortality_over_period,
            w1.feed_over_period,
            w1.transfers_in_over_period,
            w1.transfers_out_over_period,
            w1.weight_transfer_in_kg_period,
            w1.weight_transfer_out_kg_period,
            w1.harvest_fish_over_period,
            w1.harvest_weight_kg_over_period,
            w1.biomass_increase_over_period,
            w1.efcr_denominator_period,
            w1.feed_aggregated,
            w1.cumulative_mortality,
            w1.transfers_in_aggregated,
            w1.transfers_out_aggregated,
            w1.harvest_fish_aggregated,
            w1.harvest_weight_kg_aggregated,
            sum(w1.biomass_increase_over_period) OVER w_sys2 AS cumulative_biomass,
            sum(COALESCE(w1.efcr_denominator_period, (0)::double precision)) OVER w_sys2 AS efcr_denominator_aggregated
           FROM with_kpis w1
          WINDOW w_sys2 AS (PARTITION BY w1.cycle_id ORDER BY w1.sampling_date RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)
        )
 SELECT w.cycle_id,
    w.system_id,
    w.sampling_date AS date,
    w.boundary_type AS activity,
    w.days_in_period,
    w.abw_current AS average_body_weight,
    w.fish_count_start AS number_of_fish_start,
    w.fish_count_end AS number_of_fish_end,
    w.total_weight_kg,
    w.mortality_over_period,
    w.feed_over_period,
    w.transfers_in_over_period,
    w.transfers_out_over_period,
    w.biomass_increase_over_period,
    w.harvest_fish_over_period,
    w.harvest_weight_kg_over_period,
        CASE
            WHEN (w.prev_boundary_date IS NULL) THEN (0)::double precision
            WHEN ((w.efcr_denominator_period > (0)::double precision) AND (w.feed_over_period > (0)::double precision)) THEN (w.feed_over_period / w.efcr_denominator_period)
            ELSE NULL::double precision
        END AS efcr_period,
        CASE
            WHEN (w.prev_boundary_date IS NULL) THEN (0)::double precision
            WHEN ((w.abw_current IS NULL) OR (w.abw_prev IS NULL) OR (w.abw_prev <= (0)::double precision) OR (w.days_in_period = 0)) THEN NULL::double precision
            ELSE (((ln(w.abw_current) - ln(w.abw_prev)) / (w.days_in_period)::double precision) * (100.0)::double precision)
        END AS sgr,
        CASE
            WHEN (w.prev_boundary_date IS NULL) THEN (0)::double precision
            WHEN ((w.abw_current IS NULL) OR (w.abw_prev IS NULL) OR (w.days_in_period = 0)) THEN NULL::double precision
            ELSE ((w.abw_current - w.abw_prev) / (w.days_in_period)::double precision)
        END AS agr,
    w.feed_aggregated,
    w.cumulative_biomass,
    w.cumulative_mortality,
    w.transfers_in_aggregated,
    w.transfers_out_aggregated,
    w.harvest_fish_aggregated,
    w.harvest_weight_kg_aggregated,
        CASE
            WHEN ((w.efcr_denominator_aggregated > (0)::double precision) AND (w.feed_aggregated > (0)::double precision)) THEN (w.feed_aggregated / w.efcr_denominator_aggregated)
            ELSE NULL::double precision
        END AS efcr_aggregated
   FROM with_cumulative w
  ORDER BY w.cycle_id, w.system_id, w.sampling_date;


create or replace view "analytics"."system_feed_status" as  SELECT s.farm_id,
    s.id AS system_id,
    s.name AS system_name,
    fmo.date,
    fmo.biomass_kg,
    fmo.planned_feed_kg,
    (dsf.feeding_amount_today)::numeric AS actual_feed_kg,
    round((((COALESCE((dsf.feeding_amount_today)::numeric, (0)::numeric) - fmo.planned_feed_kg) / NULLIF(fmo.planned_feed_kg, (0)::numeric)) * 100.0), 2) AS deviation_pct,
    fmo.feeding_rate_pct,
    (ps_latest.efcr_period)::numeric AS efcr_period,
        CASE
            WHEN (COALESCE((dsf.feeding_amount_today)::numeric, (0)::numeric) > (fmo.planned_feed_kg * 1.20)) THEN 'OVERFEED'::text
            WHEN (COALESCE((dsf.feeding_amount_today)::numeric, (0)::numeric) < (fmo.planned_feed_kg * 0.80)) THEN 'UNDERFEED'::text
            WHEN (COALESCE((ps_latest.efcr_period)::numeric, (ps_latest.efcr_aggregated)::numeric, (0)::numeric) > 1.60) THEN 'WARNING'::text
            ELSE 'OK'::text
        END AS status,
    (ps_latest.efcr_aggregated)::numeric AS efcr_aggregated,
    COALESCE((ps_latest.efcr_period)::numeric, (ps_latest.efcr_aggregated)::numeric) AS dashboard_efcr
   FROM (((analytics.feeding_model_output fmo
     JOIN public.system s ON ((s.id = fmo.system_id)))
     LEFT JOIN analytics.daily_system_facts dsf ON (((dsf.system_id = fmo.system_id) AND (dsf.inventory_date = fmo.date))))
     LEFT JOIN LATERAL ( SELECT ps.efcr_period,
            ps.efcr_aggregated
           FROM analytics.production_summary ps
          WHERE ((ps.system_id = fmo.system_id) AND (ps.date <= fmo.date) AND ((fmo.phase_id IS NULL) OR (ps.average_body_weight IS NOT NULL)))
          ORDER BY ps.date DESC, ps.cycle_id DESC NULLS LAST
         LIMIT 1) ps_latest ON (true))
  WHERE (s.farm_id IS NOT NULL);


create or replace view "analytics"."efcr_trend" as  SELECT s.farm_id,
    ps.system_id,
    s.name AS system_name,
    ps.date,
    (ps.efcr_period)::numeric AS efcr_period,
    ps.cycle_id,
    ps.activity,
    (ps.efcr_aggregated)::numeric AS efcr_aggregated,
    COALESCE((ps.efcr_period)::numeric, (ps.efcr_aggregated)::numeric) AS dashboard_efcr
   FROM (analytics.production_summary ps
     JOIN public.system s ON ((s.id = ps.system_id)))
  WHERE ((s.farm_id IS NOT NULL) AND ((ps.efcr_period IS NOT NULL) OR (ps.efcr_aggregated IS NOT NULL)));


create or replace view "analytics"."feed_dashboard_kpis" as  WITH base AS (
         SELECT s.farm_id,
            fmo.system_id,
            fmo.date,
            fmo.planned_feed_kg,
            (dsf.feeding_amount_today)::numeric AS actual_feed_kg,
            fmo.feeding_rate_pct
           FROM ((analytics.feeding_model_output fmo
             JOIN public.system s ON ((s.id = fmo.system_id)))
             LEFT JOIN analytics.daily_system_facts dsf ON (((dsf.system_id = fmo.system_id) AND (dsf.inventory_date = fmo.date))))
          WHERE (s.farm_id IS NOT NULL)
        ), daily AS (
         SELECT base.farm_id,
            base.date,
            sum(COALESCE(base.actual_feed_kg, (0)::numeric)) AS feed_used_today_kg,
            sum(COALESCE(base.planned_feed_kg, (0)::numeric)) AS planned_feed_today_kg,
                CASE
                    WHEN (sum(COALESCE(base.planned_feed_kg, (0)::numeric)) = (0)::numeric) THEN NULL::numeric
                    ELSE round(((sum(COALESCE(base.actual_feed_kg, (0)::numeric)) / sum(COALESCE(base.planned_feed_kg, (0)::numeric))) * 100.0), 2)
                END AS plan_vs_actual_pct,
            round(avg(base.feeding_rate_pct), 2) AS avg_feeding_rate_pct,
            count(*) FILTER (WHERE (COALESCE(base.actual_feed_kg, (0)::numeric) > (COALESCE(base.planned_feed_kg, (0)::numeric) * 1.10))) AS overfeeding_systems,
            count(*) FILTER (WHERE (COALESCE(base.actual_feed_kg, (0)::numeric) < (COALESCE(base.planned_feed_kg, (0)::numeric) * 0.90))) AS underfeeding_systems
           FROM base
          GROUP BY base.farm_id, base.date
        )
 SELECT d.farm_id,
    d.date,
    d.feed_used_today_kg,
    ( SELECT sum(d2.feed_used_today_kg) AS sum
           FROM daily d2
          WHERE ((d2.farm_id = d.farm_id) AND (d2.date >= (d.date - 29)) AND (d2.date <= d.date))) AS feed_this_period_kg,
    d.planned_feed_today_kg,
    d.plan_vs_actual_pct,
    d.avg_feeding_rate_pct,
    d.overfeeding_systems,
    d.underfeeding_systems
   FROM daily d;


create or replace view "analytics"."feed_plan_vs_actual" as  SELECT s.farm_id,
    fmo.system_id,
    s.name AS system_name,
    fmo.date,
    fmo.planned_feed_kg,
    (dsf.feeding_amount_today)::numeric AS actual_feed_kg
   FROM ((analytics.feeding_model_output fmo
     JOIN public.system s ON ((s.id = fmo.system_id)))
     LEFT JOIN analytics.daily_system_facts dsf ON (((dsf.system_id = fmo.system_id) AND (dsf.inventory_date = fmo.date))))
  WHERE (s.farm_id IS NOT NULL);


create or replace view "analytics"."feed_vs_biomass_gain" as  SELECT s.farm_id,
    dsf.system_id,
    s.name AS system_name,
    dsf.inventory_date AS date,
    (dsf.feeding_amount_today)::numeric AS feed_kg,
    (ps_latest.biomass_increase_over_period)::numeric AS biomass_gain_kg
   FROM ((analytics.daily_system_facts dsf
     JOIN public.system s ON ((s.id = dsf.system_id)))
     LEFT JOIN LATERAL ( SELECT ps.biomass_increase_over_period
           FROM analytics.production_summary ps
          WHERE ((ps.system_id = dsf.system_id) AND (ps.date <= dsf.inventory_date) AND (ps.biomass_increase_over_period IS NOT NULL))
          ORDER BY ps.date DESC, ps.cycle_id DESC NULLS LAST
         LIMIT 1) ps_latest ON (true))
  WHERE (s.farm_id IS NOT NULL);


create or replace view "analytics"."feeding_alerts" as  SELECT s.farm_id,
    fmo.system_id,
    s.name AS system_name,
    fmo.date,
        CASE
            WHEN (COALESCE((dsf.feeding_amount_today)::numeric, (0)::numeric) > (fmo.planned_feed_kg * 1.20)) THEN 'Overfeeding detected'::text
            WHEN (COALESCE((ps_latest.efcr_period)::numeric, (0)::numeric) > 1.60) THEN 'High eFCR'::text
            WHEN (COALESCE((dsf.mortality_rate)::numeric, (0)::numeric) > 2.00) THEN 'High mortality'::text
            ELSE NULL::text
        END AS alert,
        CASE
            WHEN (COALESCE((dsf.feeding_amount_today)::numeric, (0)::numeric) > (fmo.planned_feed_kg * 1.20)) THEN 'Reduce feed by 20%'::text
            WHEN (COALESCE((ps_latest.efcr_period)::numeric, (0)::numeric) > 1.60) THEN 'Adjust feeding strategy'::text
            WHEN (COALESCE((dsf.mortality_rate)::numeric, (0)::numeric) > 2.00) THEN 'Pause feeding'::text
            ELSE NULL::text
        END AS recommendation,
        CASE
            WHEN (COALESCE((dsf.mortality_rate)::numeric, (0)::numeric) > 2.00) THEN 'critical'::text
            WHEN (COALESCE((ps_latest.efcr_period)::numeric, (0)::numeric) > 1.60) THEN 'warning'::text
            WHEN (COALESCE((dsf.feeding_amount_today)::numeric, (0)::numeric) > (fmo.planned_feed_kg * 1.20)) THEN 'warning'::text
            ELSE NULL::text
        END AS severity
   FROM (((analytics.feeding_model_output fmo
     JOIN public.system s ON ((s.id = fmo.system_id)))
     LEFT JOIN analytics.daily_system_facts dsf ON (((dsf.system_id = fmo.system_id) AND (dsf.inventory_date = fmo.date))))
     LEFT JOIN LATERAL ( SELECT ps.efcr_period
           FROM analytics.production_summary ps
          WHERE ((ps.system_id = fmo.system_id) AND (ps.date <= fmo.date))
          ORDER BY ps.date DESC, ps.cycle_id DESC NULLS LAST
         LIMIT 1) ps_latest ON (true))
  WHERE (s.farm_id IS NOT NULL);


create or replace view "analytics"."feeding_model_validation" as  SELECT fmo.system_id,
    fmo.date,
    fmo.model_version,
    fmo.scenario,
    fmo.phase_id,
    fmo.planned_feed_kg,
    fmo.adjusted_feed_kg,
    (dsf.feeding_amount_today)::numeric AS actual_feed_kg,
        CASE
            WHEN ((dsf.feeding_amount_today IS NULL) OR (fmo.adjusted_feed_kg IS NULL)) THEN NULL::numeric
            ELSE round(((dsf.feeding_amount_today)::numeric - fmo.adjusted_feed_kg), 3)
        END AS feed_deviation_kg,
        CASE
            WHEN ((dsf.feeding_amount_today IS NULL) OR (fmo.adjusted_feed_kg IS NULL) OR (fmo.adjusted_feed_kg = (0)::numeric)) THEN NULL::numeric
            ELSE round(((((dsf.feeding_amount_today)::numeric - fmo.adjusted_feed_kg) / fmo.adjusted_feed_kg) * 100.0), 2)
        END AS feed_deviation_pct,
    (perf.efcr_period)::numeric AS latest_efcr_period,
    (perf.biomass_increase_over_period)::numeric AS latest_biomass_gain_kg
   FROM ((analytics.feeding_model_output fmo
     LEFT JOIN analytics.daily_system_facts dsf ON (((dsf.system_id = fmo.system_id) AND (dsf.inventory_date = fmo.date))))
     LEFT JOIN LATERAL ( SELECT ps.efcr_period,
            ps.biomass_increase_over_period
           FROM analytics.production_summary ps
          WHERE ((ps.system_id = fmo.system_id) AND (ps.date <= fmo.date))
          ORDER BY ps.date DESC, ps.cycle_id DESC NULLS LAST
         LIMIT 1) perf ON (true));


CREATE UNIQUE INDEX idx_daily_system_facts_system_date ON analytics.daily_system_facts USING btree (system_id, inventory_date);

CREATE INDEX idx_production_summary_cycle_system_date ON analytics.production_summary USING btree (cycle_id, system_id, date);

grant delete on table "public"."_affected_systems" to "service_role";

grant insert on table "public"."_affected_systems" to "service_role";

grant references on table "public"."_affected_systems" to "service_role";

grant select on table "public"."_affected_systems" to "service_role";

grant trigger on table "public"."_affected_systems" to "service_role";

grant truncate on table "public"."_affected_systems" to "service_role";

grant update on table "public"."_affected_systems" to "service_role";

grant delete on table "public"."alert_threshold" to "authenticated";

grant insert on table "public"."alert_threshold" to "authenticated";

grant references on table "public"."alert_threshold" to "authenticated";

grant select on table "public"."alert_threshold" to "authenticated";

grant trigger on table "public"."alert_threshold" to "authenticated";

grant update on table "public"."alert_threshold" to "authenticated";

grant delete on table "public"."alert_threshold" to "service_role";

grant insert on table "public"."alert_threshold" to "service_role";

grant references on table "public"."alert_threshold" to "service_role";

grant select on table "public"."alert_threshold" to "service_role";

grant trigger on table "public"."alert_threshold" to "service_role";

grant truncate on table "public"."alert_threshold" to "service_role";

grant update on table "public"."alert_threshold" to "service_role";

grant references on table "public"."app_config" to "authenticated";

grant select on table "public"."app_config" to "authenticated";

grant trigger on table "public"."app_config" to "authenticated";

grant delete on table "public"."app_config" to "service_role";

grant insert on table "public"."app_config" to "service_role";

grant references on table "public"."app_config" to "service_role";

grant select on table "public"."app_config" to "service_role";

grant trigger on table "public"."app_config" to "service_role";

grant truncate on table "public"."app_config" to "service_role";

grant update on table "public"."app_config" to "service_role";

grant delete on table "public"."daily_water_quality_rating" to "authenticated";

grant insert on table "public"."daily_water_quality_rating" to "authenticated";

grant references on table "public"."daily_water_quality_rating" to "authenticated";

grant select on table "public"."daily_water_quality_rating" to "authenticated";

grant trigger on table "public"."daily_water_quality_rating" to "authenticated";

grant update on table "public"."daily_water_quality_rating" to "authenticated";

grant delete on table "public"."daily_water_quality_rating" to "service_role";

grant insert on table "public"."daily_water_quality_rating" to "service_role";

grant references on table "public"."daily_water_quality_rating" to "service_role";

grant select on table "public"."daily_water_quality_rating" to "service_role";

grant trigger on table "public"."daily_water_quality_rating" to "service_role";

grant truncate on table "public"."daily_water_quality_rating" to "service_role";

grant update on table "public"."daily_water_quality_rating" to "service_role";

grant references on table "public"."dashboard_time_period" to "authenticated";

grant select on table "public"."dashboard_time_period" to "authenticated";

grant trigger on table "public"."dashboard_time_period" to "authenticated";

grant delete on table "public"."dashboard_time_period" to "service_role";

grant insert on table "public"."dashboard_time_period" to "service_role";

grant references on table "public"."dashboard_time_period" to "service_role";

grant select on table "public"."dashboard_time_period" to "service_role";

grant trigger on table "public"."dashboard_time_period" to "service_role";

grant truncate on table "public"."dashboard_time_period" to "service_role";

grant update on table "public"."dashboard_time_period" to "service_role";

grant references on table "public"."energy_alarm_events" to "anon";

grant trigger on table "public"."energy_alarm_events" to "anon";

grant truncate on table "public"."energy_alarm_events" to "anon";

grant delete on table "public"."energy_alarm_events" to "authenticated";

grant insert on table "public"."energy_alarm_events" to "authenticated";

grant references on table "public"."energy_alarm_events" to "authenticated";

grant select on table "public"."energy_alarm_events" to "authenticated";

grant trigger on table "public"."energy_alarm_events" to "authenticated";

grant truncate on table "public"."energy_alarm_events" to "authenticated";

grant update on table "public"."energy_alarm_events" to "authenticated";

grant delete on table "public"."energy_alarm_events" to "service_role";

grant insert on table "public"."energy_alarm_events" to "service_role";

grant references on table "public"."energy_alarm_events" to "service_role";

grant select on table "public"."energy_alarm_events" to "service_role";

grant trigger on table "public"."energy_alarm_events" to "service_role";

grant truncate on table "public"."energy_alarm_events" to "service_role";

grant update on table "public"."energy_alarm_events" to "service_role";

grant references on table "public"."energy_meter_timeseries" to "anon";

grant trigger on table "public"."energy_meter_timeseries" to "anon";

grant truncate on table "public"."energy_meter_timeseries" to "anon";

grant delete on table "public"."energy_meter_timeseries" to "authenticated";

grant insert on table "public"."energy_meter_timeseries" to "authenticated";

grant references on table "public"."energy_meter_timeseries" to "authenticated";

grant select on table "public"."energy_meter_timeseries" to "authenticated";

grant trigger on table "public"."energy_meter_timeseries" to "authenticated";

grant truncate on table "public"."energy_meter_timeseries" to "authenticated";

grant update on table "public"."energy_meter_timeseries" to "authenticated";

grant delete on table "public"."energy_meter_timeseries" to "service_role";

grant insert on table "public"."energy_meter_timeseries" to "service_role";

grant references on table "public"."energy_meter_timeseries" to "service_role";

grant select on table "public"."energy_meter_timeseries" to "service_role";

grant trigger on table "public"."energy_meter_timeseries" to "service_role";

grant truncate on table "public"."energy_meter_timeseries" to "service_role";

grant update on table "public"."energy_meter_timeseries" to "service_role";

grant delete on table "public"."farm" to "authenticated";

grant insert on table "public"."farm" to "authenticated";

grant references on table "public"."farm" to "authenticated";

grant select on table "public"."farm" to "authenticated";

grant trigger on table "public"."farm" to "authenticated";

grant update on table "public"."farm" to "authenticated";

grant delete on table "public"."farm" to "service_role";

grant insert on table "public"."farm" to "service_role";

grant references on table "public"."farm" to "service_role";

grant select on table "public"."farm" to "service_role";

grant trigger on table "public"."farm" to "service_role";

grant truncate on table "public"."farm" to "service_role";

grant update on table "public"."farm" to "service_role";

grant delete on table "public"."farm_user" to "authenticated";

grant insert on table "public"."farm_user" to "authenticated";

grant references on table "public"."farm_user" to "authenticated";

grant select on table "public"."farm_user" to "authenticated";

grant trigger on table "public"."farm_user" to "authenticated";

grant update on table "public"."farm_user" to "authenticated";

grant delete on table "public"."farm_user" to "service_role";

grant insert on table "public"."farm_user" to "service_role";

grant references on table "public"."farm_user" to "service_role";

grant select on table "public"."farm_user" to "service_role";

grant trigger on table "public"."farm_user" to "service_role";

grant truncate on table "public"."farm_user" to "service_role";

grant update on table "public"."farm_user" to "service_role";

grant delete on table "public"."feed_inventory" to "authenticated";

grant insert on table "public"."feed_inventory" to "authenticated";

grant select on table "public"."feed_inventory" to "authenticated";

grant update on table "public"."feed_inventory" to "authenticated";

grant delete on table "public"."feed_inventory" to "service_role";

grant insert on table "public"."feed_inventory" to "service_role";

grant references on table "public"."feed_inventory" to "service_role";

grant select on table "public"."feed_inventory" to "service_role";

grant trigger on table "public"."feed_inventory" to "service_role";

grant truncate on table "public"."feed_inventory" to "service_role";

grant update on table "public"."feed_inventory" to "service_role";

grant delete on table "public"."feed_supplier" to "authenticated";

grant insert on table "public"."feed_supplier" to "authenticated";

grant references on table "public"."feed_supplier" to "authenticated";

grant select on table "public"."feed_supplier" to "authenticated";

grant trigger on table "public"."feed_supplier" to "authenticated";

grant update on table "public"."feed_supplier" to "authenticated";

grant delete on table "public"."feed_supplier" to "service_role";

grant insert on table "public"."feed_supplier" to "service_role";

grant references on table "public"."feed_supplier" to "service_role";

grant select on table "public"."feed_supplier" to "service_role";

grant trigger on table "public"."feed_supplier" to "service_role";

grant truncate on table "public"."feed_supplier" to "service_role";

grant update on table "public"."feed_supplier" to "service_role";

grant delete on table "public"."feed_type" to "authenticated";

grant insert on table "public"."feed_type" to "authenticated";

grant references on table "public"."feed_type" to "authenticated";

grant select on table "public"."feed_type" to "authenticated";

grant trigger on table "public"."feed_type" to "authenticated";

grant update on table "public"."feed_type" to "authenticated";

grant delete on table "public"."feed_type" to "service_role";

grant insert on table "public"."feed_type" to "service_role";

grant references on table "public"."feed_type" to "service_role";

grant select on table "public"."feed_type" to "service_role";

grant trigger on table "public"."feed_type" to "service_role";

grant truncate on table "public"."feed_type" to "service_role";

grant update on table "public"."feed_type" to "service_role";

grant references on table "public"."feeding_rate_config" to "service_role";

grant select on table "public"."feeding_rate_config" to "service_role";

grant trigger on table "public"."feeding_rate_config" to "service_role";

grant truncate on table "public"."feeding_rate_config" to "service_role";

grant delete on table "public"."feeding_record" to "authenticated";

grant insert on table "public"."feeding_record" to "authenticated";

grant references on table "public"."feeding_record" to "authenticated";

grant select on table "public"."feeding_record" to "authenticated";

grant trigger on table "public"."feeding_record" to "authenticated";

grant update on table "public"."feeding_record" to "authenticated";

grant delete on table "public"."feeding_record" to "service_role";

grant insert on table "public"."feeding_record" to "service_role";

grant references on table "public"."feeding_record" to "service_role";

grant select on table "public"."feeding_record" to "service_role";

grant trigger on table "public"."feeding_record" to "service_role";

grant truncate on table "public"."feeding_record" to "service_role";

grant update on table "public"."feeding_record" to "service_role";

grant select on table "public"."feeding_response_level" to "authenticated";

grant delete on table "public"."feeding_response_level" to "service_role";

grant insert on table "public"."feeding_response_level" to "service_role";

grant references on table "public"."feeding_response_level" to "service_role";

grant select on table "public"."feeding_response_level" to "service_role";

grant trigger on table "public"."feeding_response_level" to "service_role";

grant truncate on table "public"."feeding_response_level" to "service_role";

grant update on table "public"."feeding_response_level" to "service_role";

grant delete on table "public"."fingerling_batch" to "authenticated";

grant insert on table "public"."fingerling_batch" to "authenticated";

grant references on table "public"."fingerling_batch" to "authenticated";

grant select on table "public"."fingerling_batch" to "authenticated";

grant trigger on table "public"."fingerling_batch" to "authenticated";

grant update on table "public"."fingerling_batch" to "authenticated";

grant delete on table "public"."fingerling_batch" to "service_role";

grant insert on table "public"."fingerling_batch" to "service_role";

grant references on table "public"."fingerling_batch" to "service_role";

grant select on table "public"."fingerling_batch" to "service_role";

grant trigger on table "public"."fingerling_batch" to "service_role";

grant truncate on table "public"."fingerling_batch" to "service_role";

grant update on table "public"."fingerling_batch" to "service_role";

grant delete on table "public"."fingerling_supplier" to "authenticated";

grant insert on table "public"."fingerling_supplier" to "authenticated";

grant references on table "public"."fingerling_supplier" to "authenticated";

grant select on table "public"."fingerling_supplier" to "authenticated";

grant trigger on table "public"."fingerling_supplier" to "authenticated";

grant update on table "public"."fingerling_supplier" to "authenticated";

grant delete on table "public"."fingerling_supplier" to "service_role";

grant insert on table "public"."fingerling_supplier" to "service_role";

grant references on table "public"."fingerling_supplier" to "service_role";

grant select on table "public"."fingerling_supplier" to "service_role";

grant trigger on table "public"."fingerling_supplier" to "service_role";

grant truncate on table "public"."fingerling_supplier" to "service_role";

grant update on table "public"."fingerling_supplier" to "service_role";

grant delete on table "public"."fish_harvest" to "authenticated";

grant insert on table "public"."fish_harvest" to "authenticated";

grant references on table "public"."fish_harvest" to "authenticated";

grant select on table "public"."fish_harvest" to "authenticated";

grant trigger on table "public"."fish_harvest" to "authenticated";

grant update on table "public"."fish_harvest" to "authenticated";

grant delete on table "public"."fish_harvest" to "service_role";

grant insert on table "public"."fish_harvest" to "service_role";

grant references on table "public"."fish_harvest" to "service_role";

grant select on table "public"."fish_harvest" to "service_role";

grant trigger on table "public"."fish_harvest" to "service_role";

grant truncate on table "public"."fish_harvest" to "service_role";

grant update on table "public"."fish_harvest" to "service_role";

grant delete on table "public"."fish_mortality" to "authenticated";

grant insert on table "public"."fish_mortality" to "authenticated";

grant references on table "public"."fish_mortality" to "authenticated";

grant select on table "public"."fish_mortality" to "authenticated";

grant trigger on table "public"."fish_mortality" to "authenticated";

grant update on table "public"."fish_mortality" to "authenticated";

grant delete on table "public"."fish_mortality" to "service_role";

grant insert on table "public"."fish_mortality" to "service_role";

grant references on table "public"."fish_mortality" to "service_role";

grant select on table "public"."fish_mortality" to "service_role";

grant trigger on table "public"."fish_mortality" to "service_role";

grant truncate on table "public"."fish_mortality" to "service_role";

grant update on table "public"."fish_mortality" to "service_role";

grant delete on table "public"."fish_sampling_weight" to "authenticated";

grant insert on table "public"."fish_sampling_weight" to "authenticated";

grant references on table "public"."fish_sampling_weight" to "authenticated";

grant select on table "public"."fish_sampling_weight" to "authenticated";

grant trigger on table "public"."fish_sampling_weight" to "authenticated";

grant update on table "public"."fish_sampling_weight" to "authenticated";

grant delete on table "public"."fish_sampling_weight" to "service_role";

grant insert on table "public"."fish_sampling_weight" to "service_role";

grant references on table "public"."fish_sampling_weight" to "service_role";

grant select on table "public"."fish_sampling_weight" to "service_role";

grant trigger on table "public"."fish_sampling_weight" to "service_role";

grant truncate on table "public"."fish_sampling_weight" to "service_role";

grant update on table "public"."fish_sampling_weight" to "service_role";

grant delete on table "public"."fish_stocking" to "authenticated";

grant insert on table "public"."fish_stocking" to "authenticated";

grant references on table "public"."fish_stocking" to "authenticated";

grant select on table "public"."fish_stocking" to "authenticated";

grant trigger on table "public"."fish_stocking" to "authenticated";

grant update on table "public"."fish_stocking" to "authenticated";

grant delete on table "public"."fish_stocking" to "service_role";

grant insert on table "public"."fish_stocking" to "service_role";

grant references on table "public"."fish_stocking" to "service_role";

grant select on table "public"."fish_stocking" to "service_role";

grant trigger on table "public"."fish_stocking" to "service_role";

grant truncate on table "public"."fish_stocking" to "service_role";

grant update on table "public"."fish_stocking" to "service_role";

grant delete on table "public"."fish_transfer" to "authenticated";

grant insert on table "public"."fish_transfer" to "authenticated";

grant references on table "public"."fish_transfer" to "authenticated";

grant select on table "public"."fish_transfer" to "authenticated";

grant trigger on table "public"."fish_transfer" to "authenticated";

grant update on table "public"."fish_transfer" to "authenticated";

grant delete on table "public"."fish_transfer" to "service_role";

grant insert on table "public"."fish_transfer" to "service_role";

grant references on table "public"."fish_transfer" to "service_role";

grant select on table "public"."fish_transfer" to "service_role";

grant trigger on table "public"."fish_transfer" to "service_role";

grant truncate on table "public"."fish_transfer" to "service_role";

grant update on table "public"."fish_transfer" to "service_role";

grant references on table "public"."growth_phase" to "service_role";

grant select on table "public"."growth_phase" to "service_role";

grant trigger on table "public"."growth_phase" to "service_role";

grant truncate on table "public"."growth_phase" to "service_role";

grant delete on table "public"."organization" to "authenticated";

grant insert on table "public"."organization" to "authenticated";

grant references on table "public"."organization" to "authenticated";

grant select on table "public"."organization" to "authenticated";

grant trigger on table "public"."organization" to "authenticated";

grant truncate on table "public"."organization" to "authenticated";

grant update on table "public"."organization" to "authenticated";

grant delete on table "public"."organization" to "service_role";

grant insert on table "public"."organization" to "service_role";

grant references on table "public"."organization" to "service_role";

grant select on table "public"."organization" to "service_role";

grant trigger on table "public"."organization" to "service_role";

grant truncate on table "public"."organization" to "service_role";

grant update on table "public"."organization" to "service_role";

grant delete on table "public"."production_cycle" to "authenticated";

grant insert on table "public"."production_cycle" to "authenticated";

grant references on table "public"."production_cycle" to "authenticated";

grant select on table "public"."production_cycle" to "authenticated";

grant trigger on table "public"."production_cycle" to "authenticated";

grant update on table "public"."production_cycle" to "authenticated";

grant delete on table "public"."production_cycle" to "service_role";

grant insert on table "public"."production_cycle" to "service_role";

grant references on table "public"."production_cycle" to "service_role";

grant select on table "public"."production_cycle" to "service_role";

grant trigger on table "public"."production_cycle" to "service_role";

grant truncate on table "public"."production_cycle" to "service_role";

grant update on table "public"."production_cycle" to "service_role";

grant delete on table "public"."system" to "authenticated";

grant insert on table "public"."system" to "authenticated";

grant references on table "public"."system" to "authenticated";

grant select on table "public"."system" to "authenticated";

grant trigger on table "public"."system" to "authenticated";

grant update on table "public"."system" to "authenticated";

grant delete on table "public"."system" to "service_role";

grant insert on table "public"."system" to "service_role";

grant references on table "public"."system" to "service_role";

grant select on table "public"."system" to "service_role";

grant trigger on table "public"."system" to "service_role";

grant truncate on table "public"."system" to "service_role";

grant update on table "public"."system" to "service_role";

grant references on table "public"."system_name_change_log" to "anon";

grant trigger on table "public"."system_name_change_log" to "anon";

grant truncate on table "public"."system_name_change_log" to "anon";

grant references on table "public"."system_name_change_log" to "authenticated";

grant trigger on table "public"."system_name_change_log" to "authenticated";

grant truncate on table "public"."system_name_change_log" to "authenticated";

grant references on table "public"."system_name_change_log" to "service_role";

grant trigger on table "public"."system_name_change_log" to "service_role";

grant truncate on table "public"."system_name_change_log" to "service_role";

grant delete on table "public"."user_profile" to "authenticated";

grant insert on table "public"."user_profile" to "authenticated";

grant references on table "public"."user_profile" to "authenticated";

grant select on table "public"."user_profile" to "authenticated";

grant trigger on table "public"."user_profile" to "authenticated";

grant update on table "public"."user_profile" to "authenticated";

grant delete on table "public"."user_profile" to "service_role";

grant insert on table "public"."user_profile" to "service_role";

grant references on table "public"."user_profile" to "service_role";

grant select on table "public"."user_profile" to "service_role";

grant trigger on table "public"."user_profile" to "service_role";

grant truncate on table "public"."user_profile" to "service_role";

grant update on table "public"."user_profile" to "service_role";

grant delete on table "public"."user_settings" to "authenticated";

grant insert on table "public"."user_settings" to "authenticated";

grant references on table "public"."user_settings" to "authenticated";

grant select on table "public"."user_settings" to "authenticated";

grant trigger on table "public"."user_settings" to "authenticated";

grant truncate on table "public"."user_settings" to "authenticated";

grant update on table "public"."user_settings" to "authenticated";

grant delete on table "public"."user_settings" to "service_role";

grant insert on table "public"."user_settings" to "service_role";

grant references on table "public"."user_settings" to "service_role";

grant select on table "public"."user_settings" to "service_role";

grant trigger on table "public"."user_settings" to "service_role";

grant truncate on table "public"."user_settings" to "service_role";

grant update on table "public"."user_settings" to "service_role";

grant references on table "public"."water_quality_framework" to "authenticated";

grant select on table "public"."water_quality_framework" to "authenticated";

grant trigger on table "public"."water_quality_framework" to "authenticated";

grant delete on table "public"."water_quality_framework" to "service_role";

grant insert on table "public"."water_quality_framework" to "service_role";

grant references on table "public"."water_quality_framework" to "service_role";

grant select on table "public"."water_quality_framework" to "service_role";

grant trigger on table "public"."water_quality_framework" to "service_role";

grant truncate on table "public"."water_quality_framework" to "service_role";

grant update on table "public"."water_quality_framework" to "service_role";

grant delete on table "public"."water_quality_measurement" to "authenticated";

grant insert on table "public"."water_quality_measurement" to "authenticated";

grant references on table "public"."water_quality_measurement" to "authenticated";

grant select on table "public"."water_quality_measurement" to "authenticated";

grant trigger on table "public"."water_quality_measurement" to "authenticated";

grant update on table "public"."water_quality_measurement" to "authenticated";

grant delete on table "public"."water_quality_measurement" to "service_role";

grant insert on table "public"."water_quality_measurement" to "service_role";

grant references on table "public"."water_quality_measurement" to "service_role";

grant select on table "public"."water_quality_measurement" to "service_role";

grant trigger on table "public"."water_quality_measurement" to "service_role";

grant truncate on table "public"."water_quality_measurement" to "service_role";

grant update on table "public"."water_quality_measurement" to "service_role";


  create policy "energy_live: farm members all"
  on "energy"."live"
  as permissive
  for all
  to authenticated
using (private.is_farm_member(farm_id, ( SELECT auth.uid() AS uid)));



  create policy "energy_live_farm_members_all"
  on "energy"."live"
  as permissive
  for all
  to authenticated
using (private.is_farm_member(farm_id))
with check (private.is_farm_member(farm_id));



  create policy "energy_timeseries: farm members all"
  on "energy"."timeseries"
  as permissive
  for all
  to authenticated
using (private.is_farm_member(farm_id, ( SELECT auth.uid() AS uid)));



  create policy "energy_timeseries_farm_members_all"
  on "energy"."timeseries"
  as permissive
  for all
  to authenticated
using (private.is_farm_member(farm_id))
with check (private.is_farm_member(farm_id));



  create policy "alert_threshold_delete"
  on "public"."alert_threshold"
  as permissive
  for delete
  to authenticated
using ((((scope = 'farm'::text) AND private.has_farm_role(farm_id, ARRAY['admin'::text, 'farm_manager'::text], ( SELECT auth.uid() AS uid))) OR ((scope = 'system'::text) AND (EXISTS ( SELECT 1
   FROM public.system s
  WHERE ((s.id = alert_threshold.system_id) AND private.has_farm_role(s.farm_id, ARRAY['admin'::text, 'farm_manager'::text], ( SELECT auth.uid() AS uid))))))));



  create policy "alert_threshold_select_farm_member"
  on "public"."alert_threshold"
  as permissive
  for select
  to authenticated
using ((((farm_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM public.farm_user fu
  WHERE ((fu.farm_id = alert_threshold.farm_id) AND (fu.user_id = ( SELECT auth.uid() AS uid)))))) OR ((system_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM (public.system s
     JOIN public.farm_user fu ON ((fu.farm_id = s.farm_id)))
  WHERE ((s.id = alert_threshold.system_id) AND (fu.user_id = ( SELECT auth.uid() AS uid))))))));



  create policy "alert_threshold_update_admin_manager"
  on "public"."alert_threshold"
  as permissive
  for update
  to authenticated
using ((((farm_id IS NOT NULL) AND private.has_farm_role(farm_id, ARRAY['admin'::text, 'farm_manager'::text])) OR ((system_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM public.system s
  WHERE ((s.id = alert_threshold.system_id) AND private.has_farm_role(s.farm_id, ARRAY['admin'::text, 'farm_manager'::text])))))))
with check ((((farm_id IS NOT NULL) AND private.has_farm_role(farm_id, ARRAY['admin'::text, 'farm_manager'::text])) OR ((system_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM public.system s
  WHERE ((s.id = alert_threshold.system_id) AND private.has_farm_role(s.farm_id, ARRAY['admin'::text, 'farm_manager'::text])))))));



  create policy "alert_threshold_write_admin_manager"
  on "public"."alert_threshold"
  as permissive
  for insert
  to authenticated
with check ((((farm_id IS NOT NULL) AND private.has_farm_role(farm_id, ARRAY['admin'::text, 'farm_manager'::text])) OR ((system_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM public.system s
  WHERE ((s.id = alert_threshold.system_id) AND private.has_farm_role(s.farm_id, ARRAY['admin'::text, 'farm_manager'::text])))))));



  create policy "app_config_select"
  on "public"."app_config"
  as permissive
  for select
  to authenticated
using (true);



  create policy "dwr_select_farm_member"
  on "public"."daily_water_quality_rating"
  as permissive
  for select
  to authenticated
using ((EXISTS ( SELECT 1
   FROM (public.system s
     JOIN public.farm_user fu ON ((fu.farm_id = s.farm_id)))
  WHERE ((s.id = daily_water_quality_rating.system_id) AND (fu.user_id = ( SELECT auth.uid() AS uid))))));



  create policy "dashboard_time_period: authenticated read"
  on "public"."dashboard_time_period"
  as permissive
  for select
  to authenticated
using (true);



  create policy "energy_alarm_events_farm_members_all"
  on "public"."energy_alarm_events"
  as permissive
  for all
  to authenticated
using (private.is_farm_member(farm_id))
with check (private.is_farm_member(farm_id));



  create policy "energy_meter_timeseries_farm_members_all"
  on "public"."energy_meter_timeseries"
  as permissive
  for all
  to authenticated
using (private.is_farm_member(farm_id))
with check (private.is_farm_member(farm_id));



  create policy "farm_delete"
  on "public"."farm"
  as permissive
  for delete
  to public
using (private.has_farm_role(id, ARRAY['admin'::text, 'farm_manager'::text], ( SELECT auth.uid() AS uid)));



  create policy "farm_insert"
  on "public"."farm"
  as permissive
  for insert
  to public
with check ((( SELECT auth.uid() AS uid) IS NOT NULL));



  create policy "farm_select"
  on "public"."farm"
  as permissive
  for select
  to public
using (private.is_farm_member(id, ( SELECT auth.uid() AS uid)));



  create policy "farm_update"
  on "public"."farm"
  as permissive
  for update
  to public
using (private.has_farm_role(id, ARRAY['admin'::text, 'farm_manager'::text], ( SELECT auth.uid() AS uid)))
with check (private.has_farm_role(id, ARRAY['admin'::text, 'farm_manager'::text], ( SELECT auth.uid() AS uid)));



  create policy "farm_user: read own"
  on "public"."farm_user"
  as permissive
  for select
  to authenticated
using ((user_id = ( SELECT auth.uid() AS uid)));



  create policy "farm_user_delete"
  on "public"."farm_user"
  as permissive
  for delete
  to authenticated
using (private.has_farm_role(farm_id, ARRAY['admin'::text], ( SELECT auth.uid() AS uid)));



  create policy "farm_user_insert"
  on "public"."farm_user"
  as permissive
  for insert
  to authenticated
with check (private.has_farm_role(farm_id, ARRAY['admin'::text], ( SELECT auth.uid() AS uid)));



  create policy "farm_user_update"
  on "public"."farm_user"
  as permissive
  for update
  to authenticated
using (private.has_farm_role(farm_id, ARRAY['admin'::text], ( SELECT auth.uid() AS uid)))
with check (private.has_farm_role(farm_id, ARRAY['admin'::text], ( SELECT auth.uid() AS uid)));



  create policy "feed_inventory: delete managers"
  on "public"."feed_inventory"
  as permissive
  for delete
  to authenticated
using (private.has_farm_role(farm_id, ARRAY['admin'::text, 'farm_manager'::text]));



  create policy "feed_inventory: insert write roles"
  on "public"."feed_inventory"
  as permissive
  for insert
  to authenticated
with check (private.has_farm_role(farm_id, ARRAY['admin'::text, 'farm_manager'::text, 'farm_technician'::text]));



  create policy "feed_inventory: read farm members"
  on "public"."feed_inventory"
  as permissive
  for select
  to authenticated
using (private.is_farm_member(farm_id));



  create policy "feed_inventory: update managers"
  on "public"."feed_inventory"
  as permissive
  for update
  to authenticated
using (private.has_farm_role(farm_id, ARRAY['admin'::text, 'farm_manager'::text]))
with check (private.has_farm_role(farm_id, ARRAY['admin'::text, 'farm_manager'::text]));



  create policy "feed_supplier: delete by managers"
  on "public"."feed_supplier"
  as permissive
  for delete
  to public
using ((EXISTS ( SELECT 1
   FROM public.farm_user fu
  WHERE ((fu.user_id = ( SELECT auth.uid() AS uid)) AND (fu.role = ANY (ARRAY['admin'::text, 'farm_manager'::text]))))));



  create policy "feed_supplier: insert by managers"
  on "public"."feed_supplier"
  as permissive
  for insert
  to public
with check ((EXISTS ( SELECT 1
   FROM public.farm_user fu
  WHERE ((fu.user_id = ( SELECT auth.uid() AS uid)) AND (fu.role = ANY (ARRAY['admin'::text, 'farm_manager'::text]))))));



  create policy "feed_supplier: update by managers"
  on "public"."feed_supplier"
  as permissive
  for update
  to public
using ((EXISTS ( SELECT 1
   FROM public.farm_user fu
  WHERE ((fu.user_id = ( SELECT auth.uid() AS uid)) AND (fu.role = ANY (ARRAY['admin'::text, 'farm_manager'::text]))))))
with check ((EXISTS ( SELECT 1
   FROM public.farm_user fu
  WHERE ((fu.user_id = ( SELECT auth.uid() AS uid)) AND (fu.role = ANY (ARRAY['admin'::text, 'farm_manager'::text]))))));



  create policy "feed_supplier_select"
  on "public"."feed_supplier"
  as permissive
  for select
  to authenticated
using (true);



  create policy "feed_type: delete by farm managers"
  on "public"."feed_type"
  as permissive
  for delete
  to authenticated
using (((farm_id IS NOT NULL) AND private.has_farm_role(farm_id, ARRAY['admin'::text, 'farm_manager'::text])));



  create policy "feed_type: insert by farm managers"
  on "public"."feed_type"
  as permissive
  for insert
  to authenticated
with check (((farm_id IS NOT NULL) AND private.has_farm_role(farm_id, ARRAY['admin'::text, 'farm_manager'::text])));



  create policy "feed_type: read shared or farm scoped"
  on "public"."feed_type"
  as permissive
  for select
  to authenticated
using (((farm_id IS NULL) OR private.is_farm_member(farm_id)));



  create policy "feed_type: update by farm managers"
  on "public"."feed_type"
  as permissive
  for update
  to authenticated
using (((farm_id IS NOT NULL) AND private.has_farm_role(farm_id, ARRAY['admin'::text, 'farm_manager'::text])))
with check (((farm_id IS NOT NULL) AND private.has_farm_role(farm_id, ARRAY['admin'::text, 'farm_manager'::text])));



  create policy "feeding_record: delete by managers"
  on "public"."feeding_record"
  as permissive
  for delete
  to public
using ((EXISTS ( SELECT 1
   FROM (public.system s
     JOIN public.farm_user fu ON ((fu.farm_id = s.farm_id)))
  WHERE ((s.id = feeding_record.system_id) AND (fu.user_id = ( SELECT auth.uid() AS uid)) AND (fu.role = ANY (ARRAY['admin'::text, 'farm_manager'::text]))))));



  create policy "feeding_record: insert by write roles"
  on "public"."feeding_record"
  as permissive
  for insert
  to public
with check ((EXISTS ( SELECT 1
   FROM (public.system s
     JOIN public.farm_user fu ON ((fu.farm_id = s.farm_id)))
  WHERE ((s.id = feeding_record.system_id) AND (fu.user_id = ( SELECT auth.uid() AS uid)) AND (fu.role = ANY (ARRAY['admin'::text, 'farm_manager'::text, 'system_operator'::text]))))));



  create policy "feeding_record: read if farm member"
  on "public"."feeding_record"
  as permissive
  for select
  to authenticated
using ((EXISTS ( SELECT 1
   FROM (public.system s
     JOIN public.farm_user fu ON ((fu.farm_id = s.farm_id)))
  WHERE ((s.id = feeding_record.system_id) AND (fu.user_id = ( SELECT auth.uid() AS uid))))));



  create policy "feeding_record: update by managers"
  on "public"."feeding_record"
  as permissive
  for update
  to public
using ((EXISTS ( SELECT 1
   FROM (public.system s
     JOIN public.farm_user fu ON ((fu.farm_id = s.farm_id)))
  WHERE ((s.id = feeding_record.system_id) AND (fu.user_id = auth.uid()) AND (fu.role = ANY (ARRAY['admin'::text, 'farm_manager'::text, 'system_operator'::text]))))))
with check ((EXISTS ( SELECT 1
   FROM (public.system s
     JOIN public.farm_user fu ON ((fu.farm_id = s.farm_id)))
  WHERE ((s.id = feeding_record.system_id) AND (fu.user_id = auth.uid()) AND (fu.role = ANY (ARRAY['admin'::text, 'farm_manager'::text, 'system_operator'::text]))))));



  create policy "feeding_response_level: read authenticated"
  on "public"."feeding_response_level"
  as permissive
  for select
  to authenticated
using (true);



  create policy "fingerling_batch: delete by managers"
  on "public"."fingerling_batch"
  as permissive
  for delete
  to public
using ((EXISTS ( SELECT 1
   FROM public.farm_user fu
  WHERE ((fu.farm_id = fingerling_batch.farm_id) AND (fu.user_id = ( SELECT auth.uid() AS uid)) AND (fu.role = ANY (ARRAY['admin'::text, 'farm_manager'::text]))))));



  create policy "fingerling_batch: insert by write roles"
  on "public"."fingerling_batch"
  as permissive
  for insert
  to public
with check (((farm_id IS NOT NULL) AND private.has_farm_role(farm_id, ARRAY['admin'::text, 'farm_manager'::text, 'system_operator'::text], auth.uid())));



  create policy "fingerling_batch: read if user is farm member"
  on "public"."fingerling_batch"
  as permissive
  for select
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.farm_user fu
  WHERE (fu.user_id = ( SELECT auth.uid() AS uid)))));



  create policy "fingerling_batch: update by managers"
  on "public"."fingerling_batch"
  as permissive
  for update
  to public
using ((EXISTS ( SELECT 1
   FROM public.farm_user fu
  WHERE ((fu.farm_id = fingerling_batch.farm_id) AND (fu.user_id = ( SELECT auth.uid() AS uid)) AND (fu.role = ANY (ARRAY['admin'::text, 'farm_manager'::text]))))))
with check ((EXISTS ( SELECT 1
   FROM public.farm_user fu
  WHERE ((fu.farm_id = fingerling_batch.farm_id) AND (fu.user_id = ( SELECT auth.uid() AS uid)) AND (fu.role = ANY (ARRAY['admin'::text, 'farm_manager'::text]))))));



  create policy "fingerling_supplier: delete by managers"
  on "public"."fingerling_supplier"
  as permissive
  for delete
  to public
using ((EXISTS ( SELECT 1
   FROM public.farm_user fu
  WHERE ((fu.user_id = ( SELECT auth.uid() AS uid)) AND (fu.role = ANY (ARRAY['admin'::text, 'farm_manager'::text]))))));



  create policy "fingerling_supplier: insert by write roles"
  on "public"."fingerling_supplier"
  as permissive
  for insert
  to authenticated
with check ((EXISTS ( SELECT 1
   FROM public.farm_user fu
  WHERE ((fu.user_id = ( SELECT auth.uid() AS uid)) AND (fu.role = ANY (ARRAY['admin'::text, 'farm_manager'::text, 'system_operator'::text]))))));



  create policy "fingerling_supplier: update by managers"
  on "public"."fingerling_supplier"
  as permissive
  for update
  to public
using ((EXISTS ( SELECT 1
   FROM public.farm_user fu
  WHERE ((fu.user_id = ( SELECT auth.uid() AS uid)) AND (fu.role = ANY (ARRAY['admin'::text, 'farm_manager'::text]))))))
with check ((EXISTS ( SELECT 1
   FROM public.farm_user fu
  WHERE ((fu.user_id = ( SELECT auth.uid() AS uid)) AND (fu.role = ANY (ARRAY['admin'::text, 'farm_manager'::text]))))));



  create policy "fingerling_supplier_select"
  on "public"."fingerling_supplier"
  as permissive
  for select
  to authenticated
using (true);



  create policy "fish_harvest: delete by managers"
  on "public"."fish_harvest"
  as permissive
  for delete
  to public
using ((EXISTS ( SELECT 1
   FROM (public.system s
     JOIN public.farm_user fu ON ((fu.farm_id = s.farm_id)))
  WHERE ((s.id = fish_harvest.system_id) AND (fu.user_id = ( SELECT auth.uid() AS uid)) AND (fu.role = ANY (ARRAY['admin'::text, 'farm_manager'::text]))))));



  create policy "fish_harvest: insert by write roles"
  on "public"."fish_harvest"
  as permissive
  for insert
  to public
with check ((EXISTS ( SELECT 1
   FROM (public.system s
     JOIN public.farm_user fu ON ((fu.farm_id = s.farm_id)))
  WHERE ((s.id = fish_harvest.system_id) AND (fu.user_id = ( SELECT auth.uid() AS uid)) AND (fu.role = ANY (ARRAY['admin'::text, 'farm_manager'::text, 'system_operator'::text]))))));



  create policy "fish_harvest: read if farm member"
  on "public"."fish_harvest"
  as permissive
  for select
  to authenticated
using ((EXISTS ( SELECT 1
   FROM (public.system s
     JOIN public.farm_user fu ON ((fu.farm_id = s.farm_id)))
  WHERE ((s.id = fish_harvest.system_id) AND (fu.user_id = ( SELECT auth.uid() AS uid))))));



  create policy "fish_harvest: update by managers"
  on "public"."fish_harvest"
  as permissive
  for update
  to public
using ((EXISTS ( SELECT 1
   FROM (public.system s
     JOIN public.farm_user fu ON ((fu.farm_id = s.farm_id)))
  WHERE ((s.id = fish_harvest.system_id) AND (fu.user_id = ( SELECT auth.uid() AS uid)) AND (fu.role = ANY (ARRAY['admin'::text, 'farm_manager'::text]))))))
with check ((EXISTS ( SELECT 1
   FROM (public.system s
     JOIN public.farm_user fu ON ((fu.farm_id = s.farm_id)))
  WHERE ((s.id = fish_harvest.system_id) AND (fu.user_id = ( SELECT auth.uid() AS uid)) AND (fu.role = ANY (ARRAY['admin'::text, 'farm_manager'::text]))))));



  create policy "fish_mortality: delete by managers"
  on "public"."fish_mortality"
  as permissive
  for delete
  to public
using ((EXISTS ( SELECT 1
   FROM (public.system s
     JOIN public.farm_user fu ON ((fu.farm_id = s.farm_id)))
  WHERE ((s.id = fish_mortality.system_id) AND (fu.user_id = ( SELECT auth.uid() AS uid)) AND (fu.role = ANY (ARRAY['admin'::text, 'farm_manager'::text]))))));



  create policy "fish_mortality: insert by write roles"
  on "public"."fish_mortality"
  as permissive
  for insert
  to public
with check ((EXISTS ( SELECT 1
   FROM (public.system s
     JOIN public.farm_user fu ON ((fu.farm_id = s.farm_id)))
  WHERE ((s.id = fish_mortality.system_id) AND (fu.user_id = ( SELECT auth.uid() AS uid)) AND (fu.role = ANY (ARRAY['admin'::text, 'farm_manager'::text, 'system_operator'::text]))))));



  create policy "fish_mortality: read if farm member"
  on "public"."fish_mortality"
  as permissive
  for select
  to authenticated
using ((EXISTS ( SELECT 1
   FROM (public.system s
     JOIN public.farm_user fu ON ((fu.farm_id = s.farm_id)))
  WHERE ((s.id = fish_mortality.system_id) AND (fu.user_id = ( SELECT auth.uid() AS uid))))));



  create policy "fish_mortality: update by managers"
  on "public"."fish_mortality"
  as permissive
  for update
  to public
using ((EXISTS ( SELECT 1
   FROM (public.system s
     JOIN public.farm_user fu ON ((fu.farm_id = s.farm_id)))
  WHERE ((s.id = fish_mortality.system_id) AND (fu.user_id = ( SELECT auth.uid() AS uid)) AND (fu.role = ANY (ARRAY['admin'::text, 'farm_manager'::text]))))))
with check ((EXISTS ( SELECT 1
   FROM (public.system s
     JOIN public.farm_user fu ON ((fu.farm_id = s.farm_id)))
  WHERE ((s.id = fish_mortality.system_id) AND (fu.user_id = ( SELECT auth.uid() AS uid)) AND (fu.role = ANY (ARRAY['admin'::text, 'farm_manager'::text]))))));



  create policy "fish_sampling_weight: delete by managers"
  on "public"."fish_sampling_weight"
  as permissive
  for delete
  to public
using ((EXISTS ( SELECT 1
   FROM (public.system s
     JOIN public.farm_user fu ON ((fu.farm_id = s.farm_id)))
  WHERE ((s.id = fish_sampling_weight.system_id) AND (fu.user_id = ( SELECT auth.uid() AS uid)) AND (fu.role = ANY (ARRAY['admin'::text, 'farm_manager'::text]))))));



  create policy "fish_sampling_weight: insert by write roles"
  on "public"."fish_sampling_weight"
  as permissive
  for insert
  to public
with check ((EXISTS ( SELECT 1
   FROM (public.system s
     JOIN public.farm_user fu ON ((fu.farm_id = s.farm_id)))
  WHERE ((s.id = fish_sampling_weight.system_id) AND (fu.user_id = ( SELECT auth.uid() AS uid)) AND (fu.role = ANY (ARRAY['admin'::text, 'farm_manager'::text, 'system_operator'::text]))))));



  create policy "fish_sampling_weight: read if farm member"
  on "public"."fish_sampling_weight"
  as permissive
  for select
  to authenticated
using ((EXISTS ( SELECT 1
   FROM (public.system s
     JOIN public.farm_user fu ON ((fu.farm_id = s.farm_id)))
  WHERE ((s.id = fish_sampling_weight.system_id) AND (fu.user_id = ( SELECT auth.uid() AS uid))))));



  create policy "fish_sampling_weight: update by managers"
  on "public"."fish_sampling_weight"
  as permissive
  for update
  to public
using ((EXISTS ( SELECT 1
   FROM (public.system s
     JOIN public.farm_user fu ON ((fu.farm_id = s.farm_id)))
  WHERE ((s.id = fish_sampling_weight.system_id) AND (fu.user_id = ( SELECT auth.uid() AS uid)) AND (fu.role = ANY (ARRAY['admin'::text, 'farm_manager'::text]))))))
with check ((EXISTS ( SELECT 1
   FROM (public.system s
     JOIN public.farm_user fu ON ((fu.farm_id = s.farm_id)))
  WHERE ((s.id = fish_sampling_weight.system_id) AND (fu.user_id = ( SELECT auth.uid() AS uid)) AND (fu.role = ANY (ARRAY['admin'::text, 'farm_manager'::text]))))));



  create policy "fish_stocking: delete by managers"
  on "public"."fish_stocking"
  as permissive
  for delete
  to public
using ((EXISTS ( SELECT 1
   FROM (public.system s
     JOIN public.farm_user fu ON ((fu.farm_id = s.farm_id)))
  WHERE ((s.id = fish_stocking.system_id) AND (fu.user_id = ( SELECT auth.uid() AS uid)) AND (fu.role = ANY (ARRAY['admin'::text, 'farm_manager'::text]))))));



  create policy "fish_stocking: insert by write roles"
  on "public"."fish_stocking"
  as permissive
  for insert
  to public
with check ((EXISTS ( SELECT 1
   FROM (public.system s
     JOIN public.farm_user fu ON ((fu.farm_id = s.farm_id)))
  WHERE ((s.id = fish_stocking.system_id) AND (fu.user_id = ( SELECT auth.uid() AS uid)) AND (fu.role = ANY (ARRAY['admin'::text, 'farm_manager'::text, 'system_operator'::text]))))));



  create policy "fish_stocking: read if farm member"
  on "public"."fish_stocking"
  as permissive
  for select
  to authenticated
using ((EXISTS ( SELECT 1
   FROM (public.system s
     JOIN public.farm_user fu ON ((fu.farm_id = s.farm_id)))
  WHERE ((s.id = fish_stocking.system_id) AND (fu.user_id = ( SELECT auth.uid() AS uid))))));



  create policy "fish_stocking: update by managers"
  on "public"."fish_stocking"
  as permissive
  for update
  to public
using ((EXISTS ( SELECT 1
   FROM (public.system s
     JOIN public.farm_user fu ON ((fu.farm_id = s.farm_id)))
  WHERE ((s.id = fish_stocking.system_id) AND (fu.user_id = ( SELECT auth.uid() AS uid)) AND (fu.role = ANY (ARRAY['admin'::text, 'farm_manager'::text]))))))
with check ((EXISTS ( SELECT 1
   FROM (public.system s
     JOIN public.farm_user fu ON ((fu.farm_id = s.farm_id)))
  WHERE ((s.id = fish_stocking.system_id) AND (fu.user_id = ( SELECT auth.uid() AS uid)) AND (fu.role = ANY (ARRAY['admin'::text, 'farm_manager'::text]))))));



  create policy "fish_transfer: delete by managers"
  on "public"."fish_transfer"
  as permissive
  for delete
  to public
using ((EXISTS ( SELECT 1
   FROM (public.system s
     JOIN public.farm_user fu ON ((fu.farm_id = s.farm_id)))
  WHERE ((s.id = fish_transfer.origin_system_id) AND (fu.user_id = ( SELECT auth.uid() AS uid)) AND (fu.role = ANY (ARRAY['admin'::text, 'farm_manager'::text]))))));



  create policy "fish_transfer: insert by write roles"
  on "public"."fish_transfer"
  as permissive
  for insert
  to public
with check ((EXISTS ( SELECT 1
   FROM (public.system s
     JOIN public.farm_user fu ON ((fu.farm_id = s.farm_id)))
  WHERE ((s.id = fish_transfer.origin_system_id) AND (fu.user_id = ( SELECT auth.uid() AS uid)) AND (fu.role = ANY (ARRAY['admin'::text, 'farm_manager'::text, 'system_operator'::text]))))));



  create policy "fish_transfer: read if farm member"
  on "public"."fish_transfer"
  as permissive
  for select
  to authenticated
using ((EXISTS ( SELECT 1
   FROM (public.system s
     JOIN public.farm_user fu ON ((fu.farm_id = s.farm_id)))
  WHERE ((fu.user_id = ( SELECT auth.uid() AS uid)) AND ((s.id = fish_transfer.origin_system_id) OR (s.id = fish_transfer.target_system_id))))));



  create policy "fish_transfer: update by managers"
  on "public"."fish_transfer"
  as permissive
  for update
  to public
using ((EXISTS ( SELECT 1
   FROM (public.system s
     JOIN public.farm_user fu ON ((fu.farm_id = s.farm_id)))
  WHERE ((s.id = fish_transfer.origin_system_id) AND (fu.user_id = ( SELECT auth.uid() AS uid)) AND (fu.role = ANY (ARRAY['admin'::text, 'farm_manager'::text]))))))
with check ((EXISTS ( SELECT 1
   FROM (public.system s
     JOIN public.farm_user fu ON ((fu.farm_id = s.farm_id)))
  WHERE ((s.id = fish_transfer.origin_system_id) AND (fu.user_id = ( SELECT auth.uid() AS uid)) AND (fu.role = ANY (ARRAY['admin'::text, 'farm_manager'::text]))))));



  create policy "organization_select_owner_or_farm_member"
  on "public"."organization"
  as permissive
  for select
  to authenticated
using (((owner_id = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1
   FROM (public.farm f
     JOIN public.farm_user fu ON ((fu.farm_id = f.id)))
  WHERE ((f.organization_id = organization.id) AND (fu.user_id = ( SELECT auth.uid() AS uid)))))));



  create policy "production_cycle: delete by managers"
  on "public"."production_cycle"
  as permissive
  for delete
  to authenticated
using ((EXISTS ( SELECT 1
   FROM (public.fingerling_batch fb
     JOIN public.farm_user fu ON ((fu.farm_id = fb.farm_id)))
  WHERE ((fb.id = production_cycle.batch_id) AND (fu.user_id = ( SELECT auth.uid() AS uid)) AND (fu.role = ANY (ARRAY['admin'::text, 'farm_manager'::text]))))));



  create policy "production_cycle_insert"
  on "public"."production_cycle"
  as permissive
  for insert
  to authenticated
with check ((EXISTS ( SELECT 1
   FROM ((public.fingerling_batch fb
     JOIN public.farm_user fu ON ((fu.farm_id = fb.farm_id)))
     JOIN public.system s ON (((s.id = production_cycle.system_id) AND (s.farm_id = fb.farm_id))))
  WHERE ((fb.id = production_cycle.batch_id) AND (fu.user_id = ( SELECT auth.uid() AS uid))))));



  create policy "production_cycle_select"
  on "public"."production_cycle"
  as permissive
  for select
  to authenticated
using ((EXISTS ( SELECT 1
   FROM (public.fingerling_batch fb
     JOIN public.farm_user fu ON ((fu.farm_id = fb.farm_id)))
  WHERE ((fb.id = production_cycle.batch_id) AND (fu.user_id = ( SELECT auth.uid() AS uid))))));



  create policy "production_cycle_update"
  on "public"."production_cycle"
  as permissive
  for update
  to authenticated
using ((EXISTS ( SELECT 1
   FROM (public.fingerling_batch fb
     JOIN public.farm_user fu ON ((fu.farm_id = fb.farm_id)))
  WHERE ((fb.id = production_cycle.batch_id) AND (fu.user_id = ( SELECT auth.uid() AS uid))))))
with check ((EXISTS ( SELECT 1
   FROM ((public.fingerling_batch fb
     JOIN public.farm_user fu ON ((fu.farm_id = fb.farm_id)))
     JOIN public.system s ON (((s.id = production_cycle.system_id) AND (s.farm_id = fb.farm_id))))
  WHERE ((fb.id = production_cycle.batch_id) AND (fu.user_id = ( SELECT auth.uid() AS uid))))));



  create policy "system_delete"
  on "public"."system"
  as permissive
  for delete
  to public
using (private.has_farm_role(farm_id, ARRAY['admin'::text, 'farm_manager'::text], ( SELECT auth.uid() AS uid)));



  create policy "system_insert"
  on "public"."system"
  as permissive
  for insert
  to public
with check (private.has_farm_role(farm_id, ARRAY['admin'::text, 'farm_manager'::text, 'system_operator'::text], ( SELECT auth.uid() AS uid)));



  create policy "system_select"
  on "public"."system"
  as permissive
  for select
  to authenticated
using (private.is_farm_member(farm_id, ( SELECT auth.uid() AS uid)));



  create policy "system_update"
  on "public"."system"
  as permissive
  for update
  to public
using (private.has_farm_role(farm_id, ARRAY['admin'::text, 'farm_manager'::text, 'system_operator'::text], ( SELECT auth.uid() AS uid)))
with check (private.has_farm_role(farm_id, ARRAY['admin'::text, 'farm_manager'::text, 'system_operator'::text], ( SELECT auth.uid() AS uid)));



  create policy "user_profile_insert"
  on "public"."user_profile"
  as permissive
  for insert
  to public
with check ((user_id = ( SELECT auth.uid() AS uid)));



  create policy "user_profile_select"
  on "public"."user_profile"
  as permissive
  for select
  to authenticated
using (((user_id = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1
   FROM (public.farm_user fu1
     JOIN public.farm_user fu2 ON ((fu1.farm_id = fu2.farm_id)))
  WHERE ((fu1.user_id = ( SELECT auth.uid() AS uid)) AND (fu2.user_id = user_profile.user_id))))));



  create policy "user_profile_update"
  on "public"."user_profile"
  as permissive
  for update
  to public
using ((user_id = ( SELECT auth.uid() AS uid)))
with check ((user_id = ( SELECT auth.uid() AS uid)));



  create policy "user_settings: delete own"
  on "public"."user_settings"
  as permissive
  for delete
  to authenticated
using ((( SELECT auth.uid() AS uid) = user_id));



  create policy "user_settings: insert own"
  on "public"."user_settings"
  as permissive
  for insert
  to authenticated
with check ((( SELECT auth.uid() AS uid) = user_id));



  create policy "user_settings: select own"
  on "public"."user_settings"
  as permissive
  for select
  to authenticated
using ((( SELECT auth.uid() AS uid) = user_id));



  create policy "user_settings: update own"
  on "public"."user_settings"
  as permissive
  for update
  to authenticated
using ((( SELECT auth.uid() AS uid) = user_id))
with check ((( SELECT auth.uid() AS uid) = user_id));



  create policy "user_settings_delete_own"
  on "public"."user_settings"
  as permissive
  for delete
  to authenticated
using ((user_id = ( SELECT auth.uid() AS uid)));



  create policy "user_settings_insert_own"
  on "public"."user_settings"
  as permissive
  for insert
  to authenticated
with check ((user_id = ( SELECT auth.uid() AS uid)));



  create policy "user_settings_select_own"
  on "public"."user_settings"
  as permissive
  for select
  to authenticated
using ((user_id = ( SELECT auth.uid() AS uid)));



  create policy "user_settings_update_own"
  on "public"."user_settings"
  as permissive
  for update
  to authenticated
using ((user_id = ( SELECT auth.uid() AS uid)))
with check ((user_id = ( SELECT auth.uid() AS uid)));



  create policy "Authenticated users can read water_quality_framework"
  on "public"."water_quality_framework"
  as permissive
  for select
  to authenticated
using (true);



  create policy "water_quality_measurement: delete by managers"
  on "public"."water_quality_measurement"
  as permissive
  for delete
  to public
using ((EXISTS ( SELECT 1
   FROM (public.system s
     JOIN public.farm_user fu ON ((fu.farm_id = s.farm_id)))
  WHERE ((s.id = water_quality_measurement.system_id) AND (fu.user_id = ( SELECT auth.uid() AS uid)) AND (fu.role = ANY (ARRAY['admin'::text, 'farm_manager'::text]))))));



  create policy "water_quality_measurement: insert by write roles"
  on "public"."water_quality_measurement"
  as permissive
  for insert
  to public
with check ((EXISTS ( SELECT 1
   FROM (public.system s
     JOIN public.farm_user fu ON ((fu.farm_id = s.farm_id)))
  WHERE ((s.id = water_quality_measurement.system_id) AND (fu.user_id = ( SELECT auth.uid() AS uid)) AND (fu.role = ANY (ARRAY['admin'::text, 'farm_manager'::text, 'system_operator'::text]))))));



  create policy "water_quality_measurement: update by managers"
  on "public"."water_quality_measurement"
  as permissive
  for update
  to public
using ((EXISTS ( SELECT 1
   FROM (public.system s
     JOIN public.farm_user fu ON ((fu.farm_id = s.farm_id)))
  WHERE ((s.id = water_quality_measurement.system_id) AND (fu.user_id = ( SELECT auth.uid() AS uid)) AND (fu.role = ANY (ARRAY['admin'::text, 'farm_manager'::text]))))))
with check ((EXISTS ( SELECT 1
   FROM (public.system s
     JOIN public.farm_user fu ON ((fu.farm_id = s.farm_id)))
  WHERE ((s.id = water_quality_measurement.system_id) AND (fu.user_id = ( SELECT auth.uid() AS uid)) AND (fu.role = ANY (ARRAY['admin'::text, 'farm_manager'::text]))))));



  create policy "wqm_select_farm_member"
  on "public"."water_quality_measurement"
  as permissive
  for select
  to authenticated
using ((EXISTS ( SELECT 1
   FROM (public.system s
     JOIN public.farm_user fu ON ((fu.farm_id = s.farm_id)))
  WHERE ((s.id = water_quality_measurement.system_id) AND (fu.user_id = ( SELECT auth.uid() AS uid))))));


CREATE TRIGGER no_manual_changes BEFORE INSERT OR DELETE OR UPDATE ON public.daily_water_quality_rating FOR EACH ROW EXECUTE FUNCTION public.prevent_manual_wqr_changes();

CREATE TRIGGER trg_energy_alarm_events_updated_at BEFORE UPDATE ON public.energy_alarm_events FOR EACH ROW EXECUTE FUNCTION private.set_updated_at();

CREATE TRIGGER trg_energy_meter_timeseries_updated_at BEFORE UPDATE ON public.energy_meter_timeseries FOR EACH ROW EXECUTE FUNCTION private.set_updated_at();

CREATE TRIGGER trg_farm_updated_at BEFORE UPDATE ON public.farm FOR EACH ROW EXECUTE FUNCTION private.set_updated_at();

CREATE TRIGGER trg_feed_inventory_updated_at BEFORE UPDATE ON public.feed_inventory FOR EACH ROW EXECUTE FUNCTION private.set_updated_at();

CREATE TRIGGER trg_feed_type_updated_at BEFORE UPDATE ON public.feed_type FOR EACH ROW EXECUTE FUNCTION private.set_updated_at();

CREATE TRIGGER trg_feeding_rate_config_refresh_feeding_model AFTER INSERT OR DELETE OR UPDATE OR TRUNCATE ON public.feeding_rate_config FOR EACH STATEMENT EXECUTE FUNCTION public.refresh_feeding_model_after_config_change();

CREATE TRIGGER after_feeding_record_del_inventory AFTER DELETE ON public.feeding_record REFERENCING OLD TABLE AS old_rows FOR EACH STATEMENT EXECUTE FUNCTION public.after_event_queue_old();

CREATE TRIGGER after_feeding_record_ins_inventory AFTER INSERT ON public.feeding_record REFERENCING NEW TABLE AS new_rows FOR EACH STATEMENT EXECUTE FUNCTION public.after_event_queue_new();

CREATE TRIGGER after_feeding_record_upd_inventory AFTER UPDATE ON public.feeding_record REFERENCING NEW TABLE AS new_rows FOR EACH STATEMENT EXECUTE FUNCTION public.after_event_queue_new();

CREATE TRIGGER trg_feeding_record_assign_lineage BEFORE INSERT OR UPDATE OF system_id, date, cycle_id, batch_id ON public.feeding_record FOR EACH ROW EXECUTE FUNCTION public.assign_operation_lineage_from_system();

CREATE TRIGGER trg_feeding_record_updated_at BEFORE UPDATE ON public.feeding_record FOR EACH ROW EXECUTE FUNCTION private.set_updated_at();

CREATE TRIGGER trg_fingerling_batch_updated_at BEFORE UPDATE ON public.fingerling_batch FOR EACH ROW EXECUTE FUNCTION private.set_updated_at();

CREATE TRIGGER after_fish_harvest_del_inventory AFTER DELETE ON public.fish_harvest REFERENCING OLD TABLE AS old_rows FOR EACH STATEMENT EXECUTE FUNCTION public.after_event_queue_old();

CREATE TRIGGER after_fish_harvest_ins_inventory AFTER INSERT ON public.fish_harvest REFERENCING NEW TABLE AS new_rows FOR EACH STATEMENT EXECUTE FUNCTION public.after_event_queue_new();

CREATE TRIGGER after_fish_harvest_upd_inventory AFTER UPDATE ON public.fish_harvest REFERENCING NEW TABLE AS new_rows FOR EACH STATEMENT EXECUTE FUNCTION public.after_event_queue_new();

CREATE TRIGGER trg_close_cycle_on_final_harvest AFTER INSERT OR UPDATE OF type_of_harvest, date, system_id ON public.fish_harvest FOR EACH ROW EXECUTE FUNCTION public.close_cycle_on_final_harvest();

CREATE TRIGGER trg_fish_harvest_assign_lineage BEFORE INSERT OR UPDATE OF system_id, date, cycle_id, batch_id ON public.fish_harvest FOR EACH ROW EXECUTE FUNCTION public.assign_operation_lineage_from_system();

CREATE TRIGGER trg_fish_harvest_set_abw BEFORE INSERT OR UPDATE OF number_of_fish_harvest, total_weight_harvest, abw ON public.fish_harvest FOR EACH ROW EXECUTE FUNCTION public.set_harvest_abw();

CREATE TRIGGER trg_fish_harvest_updated_at BEFORE UPDATE ON public.fish_harvest FOR EACH ROW EXECUTE FUNCTION private.set_updated_at();

CREATE TRIGGER after_fish_mortality_del_inventory AFTER DELETE ON public.fish_mortality REFERENCING OLD TABLE AS old_rows FOR EACH STATEMENT EXECUTE FUNCTION public.after_event_queue_old();

CREATE TRIGGER after_fish_mortality_ins_inventory AFTER INSERT ON public.fish_mortality REFERENCING NEW TABLE AS new_rows FOR EACH STATEMENT EXECUTE FUNCTION public.after_event_queue_new();

CREATE TRIGGER after_fish_mortality_upd_inventory AFTER UPDATE ON public.fish_mortality REFERENCING NEW TABLE AS new_rows FOR EACH STATEMENT EXECUTE FUNCTION public.after_event_queue_new();

CREATE TRIGGER trg_fish_mortality_assign_lineage BEFORE INSERT OR UPDATE OF system_id, date, cycle_id, batch_id ON public.fish_mortality FOR EACH ROW EXECUTE FUNCTION public.assign_operation_lineage_from_system();

CREATE TRIGGER trg_fish_mortality_set_farm_id BEFORE INSERT OR UPDATE ON public.fish_mortality FOR EACH ROW EXECUTE FUNCTION private.set_fish_mortality_farm_id();

CREATE TRIGGER trg_fish_mortality_updated_at BEFORE UPDATE ON public.fish_mortality FOR EACH ROW EXECUTE FUNCTION private.set_updated_at();

CREATE TRIGGER after_fish_sampling_del_inventory AFTER DELETE ON public.fish_sampling_weight REFERENCING OLD TABLE AS old_rows FOR EACH STATEMENT EXECUTE FUNCTION public.after_event_queue_old();

CREATE TRIGGER after_fish_sampling_ins_inventory AFTER INSERT ON public.fish_sampling_weight REFERENCING NEW TABLE AS new_rows FOR EACH STATEMENT EXECUTE FUNCTION public.after_event_queue_new();

CREATE TRIGGER after_fish_sampling_upd_inventory AFTER UPDATE ON public.fish_sampling_weight REFERENCING NEW TABLE AS new_rows FOR EACH STATEMENT EXECUTE FUNCTION public.after_event_queue_new();

CREATE TRIGGER trg_fish_sampling_weight_assign_lineage BEFORE INSERT OR UPDATE OF system_id, date, cycle_id, batch_id ON public.fish_sampling_weight FOR EACH ROW EXECUTE FUNCTION public.assign_operation_lineage_from_system();

CREATE TRIGGER trg_fish_sampling_weight_set_abw BEFORE INSERT OR UPDATE OF number_of_fish_sampling, total_weight_sampling, abw ON public.fish_sampling_weight FOR EACH ROW EXECUTE FUNCTION public.set_sampling_weight_abw();

CREATE TRIGGER trg_fish_sampling_weight_updated_at BEFORE UPDATE ON public.fish_sampling_weight FOR EACH ROW EXECUTE FUNCTION private.set_updated_at();

CREATE TRIGGER trg_growth_stage_on_sampling AFTER INSERT OR UPDATE OF abw, total_weight_sampling, number_of_fish_sampling ON public.fish_sampling_weight FOR EACH ROW EXECUTE FUNCTION public.trg_update_system_growth_stage();

CREATE TRIGGER after_fish_stocking_del_inventory AFTER DELETE ON public.fish_stocking REFERENCING OLD TABLE AS old_rows FOR EACH STATEMENT EXECUTE FUNCTION public.after_event_queue_old();

CREATE TRIGGER after_fish_stocking_ins_inventory AFTER INSERT ON public.fish_stocking REFERENCING NEW TABLE AS new_rows FOR EACH STATEMENT EXECUTE FUNCTION public.after_event_queue_new();

CREATE TRIGGER after_fish_stocking_upd_inventory AFTER UPDATE ON public.fish_stocking REFERENCING NEW TABLE AS new_rows FOR EACH STATEMENT EXECUTE FUNCTION public.after_event_queue_new();

CREATE TRIGGER trg_cycle_on_stocking BEFORE INSERT OR UPDATE OF system_id, batch_id, date, cycle_id ON public.fish_stocking FOR EACH ROW EXECUTE FUNCTION public.ensure_cycle_on_stocking();

CREATE TRIGGER trg_fish_stocking_set_abw BEFORE INSERT OR UPDATE OF number_of_fish_stocking, total_weight_stocking, abw ON public.fish_stocking FOR EACH ROW EXECUTE FUNCTION public.set_stocking_abw();

CREATE TRIGGER trg_fish_stocking_updated_at BEFORE UPDATE ON public.fish_stocking FOR EACH ROW EXECUTE FUNCTION private.set_updated_at();

CREATE TRIGGER after_fish_transfer_del_inventory AFTER DELETE ON public.fish_transfer REFERENCING OLD TABLE AS old_rows FOR EACH STATEMENT EXECUTE FUNCTION public.after_event_queue_old();

CREATE TRIGGER after_fish_transfer_ins_inventory AFTER INSERT ON public.fish_transfer REFERENCING NEW TABLE AS new_rows FOR EACH STATEMENT EXECUTE FUNCTION public.after_event_queue_new();

CREATE TRIGGER after_fish_transfer_upd_inventory AFTER UPDATE ON public.fish_transfer REFERENCING NEW TABLE AS new_rows FOR EACH STATEMENT EXECUTE FUNCTION public.after_event_queue_new();

CREATE TRIGGER trg_abw_transfer BEFORE INSERT OR UPDATE OF number_of_fish_transfer, total_weight_transfer, abw ON public.fish_transfer FOR EACH ROW EXECUTE FUNCTION public.trg_compute_abw_transfer();

CREATE TRIGGER trg_fish_transfer_assign_lineage BEFORE INSERT OR UPDATE OF origin_system_id, date, cycle_id, batch_id ON public.fish_transfer FOR EACH ROW EXECUTE FUNCTION public.assign_transfer_lineage_from_origin();

CREATE TRIGGER trg_fish_transfer_updated_at BEFORE UPDATE ON public.fish_transfer FOR EACH ROW EXECUTE FUNCTION private.set_updated_at();

CREATE TRIGGER trg_growth_phase_refresh_feeding_model AFTER INSERT OR DELETE OR UPDATE OR TRUNCATE ON public.growth_phase FOR EACH STATEMENT EXECUTE FUNCTION public.refresh_feeding_model_after_config_change();

CREATE TRIGGER trg_organization_updated_at BEFORE UPDATE ON public.organization FOR EACH ROW EXECUTE FUNCTION private.set_updated_at();

CREATE TRIGGER trg_production_cycle_set_ongoing BEFORE INSERT OR UPDATE OF cycle_end ON public.production_cycle FOR EACH ROW EXECUTE FUNCTION public.production_cycle_set_ongoing();

CREATE TRIGGER trg_production_cycle_updated_at BEFORE UPDATE ON public.production_cycle FOR EACH ROW EXECUTE FUNCTION private.set_updated_at();

CREATE TRIGGER prevent_system_name_change BEFORE UPDATE ON public.system FOR EACH ROW EXECUTE FUNCTION public.prevent_system_name_update();

CREATE TRIGGER refresh_after_system AFTER INSERT OR DELETE OR UPDATE ON public.system FOR EACH ROW EXECUTE FUNCTION public.refresh_after_system_if_needed();

CREATE TRIGGER trg_system_updated_at BEFORE UPDATE ON public.system FOR EACH ROW EXECUTE FUNCTION private.set_updated_at();

CREATE TRIGGER trg_user_settings_updated_at BEFORE UPDATE ON public.user_settings FOR EACH ROW EXECUTE FUNCTION private.set_updated_at();

CREATE TRIGGER water_quality_framework_refresh_daily_rating AFTER UPDATE ON public.water_quality_framework FOR EACH ROW EXECUTE FUNCTION public.trg_refresh_daily_water_quality_rating_from_framework();

CREATE TRIGGER trg_water_quality_measurement_updated_at BEFORE UPDATE ON public.water_quality_measurement FOR EACH ROW EXECUTE FUNCTION private.set_updated_at();

CREATE TRIGGER trg_water_quality_sync_measured_at_parts BEFORE INSERT OR UPDATE OF measured_at, date, "time" ON public.water_quality_measurement FOR EACH ROW EXECUTE FUNCTION public.sync_water_quality_measured_at_parts();

CREATE TRIGGER water_quality_measurement_refresh_daily_rating AFTER INSERT OR DELETE OR UPDATE ON public.water_quality_measurement FOR EACH ROW EXECUTE FUNCTION public.trg_refresh_daily_water_quality_rating();

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


  create policy "auth_insert_raw_uploads"
  on "storage"."objects"
  as permissive
  for insert
  to public
with check (((bucket_id = 'raw-uploads'::text) AND (auth.role() = 'authenticated'::text)));



  create policy "auth_read_raw_uploads"
  on "storage"."objects"
  as permissive
  for select
  to public
using (((bucket_id = 'raw-uploads'::text) AND (auth.role() = 'authenticated'::text)));



  create policy "auth_update_raw_uploads"
  on "storage"."objects"
  as permissive
  for update
  to public
using (((bucket_id = 'raw-uploads'::text) AND (auth.role() = 'authenticated'::text)));



  create policy "svc_all_raw_uploads"
  on "storage"."objects"
  as permissive
  for all
  to public
using (((bucket_id = 'raw-uploads'::text) AND (auth.role() = 'service_role'::text)));



