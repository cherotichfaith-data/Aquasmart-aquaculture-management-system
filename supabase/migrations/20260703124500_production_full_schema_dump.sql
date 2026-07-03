--
-- PostgreSQL database dump
--

\restrict CouupSSGDpmglWEAyPe27LpacuD8dfs3vajNzPT0jx58YpMc2d8Os9ZG2QTi4WR

-- Dumped from database version 15.14
-- Dumped by pg_dump version 18.4

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: analytics; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA "analytics";


ALTER SCHEMA "analytics" OWNER TO "postgres";

--
-- Name: auth; Type: SCHEMA; Schema: -; Owner: supabase_admin
--

CREATE SCHEMA "auth";


ALTER SCHEMA "auth" OWNER TO "supabase_admin";

--
-- Name: energy; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA "energy";


ALTER SCHEMA "energy" OWNER TO "postgres";

--
-- Name: extensions; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA "extensions";


ALTER SCHEMA "extensions" OWNER TO "postgres";

--
-- Name: graphql; Type: SCHEMA; Schema: -; Owner: supabase_admin
--

CREATE SCHEMA "graphql";


ALTER SCHEMA "graphql" OWNER TO "supabase_admin";

--
-- Name: graphql_public; Type: SCHEMA; Schema: -; Owner: supabase_admin
--

CREATE SCHEMA "graphql_public";


ALTER SCHEMA "graphql_public" OWNER TO "supabase_admin";

--
-- Name: private; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA "private";


ALTER SCHEMA "private" OWNER TO "postgres";

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: pg_database_owner
--

CREATE SCHEMA "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";

--
-- Name: SCHEMA "public"; Type: COMMENT; Schema: -; Owner: pg_database_owner
--

COMMENT ON SCHEMA "public" IS 'standard public schema';


--
-- Name: realtime; Type: SCHEMA; Schema: -; Owner: supabase_admin
--

CREATE SCHEMA "realtime";


ALTER SCHEMA "realtime" OWNER TO "supabase_admin";

--
-- Name: storage; Type: SCHEMA; Schema: -; Owner: supabase_admin
--

CREATE SCHEMA "storage";


ALTER SCHEMA "storage" OWNER TO "supabase_admin";

--
-- Name: supabase_migrations; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA "supabase_migrations";


ALTER SCHEMA "supabase_migrations" OWNER TO "postgres";

--
-- Name: vault; Type: SCHEMA; Schema: -; Owner: supabase_admin
--

CREATE SCHEMA "vault";


ALTER SCHEMA "vault" OWNER TO "supabase_admin";

--
-- Name: aal_level; Type: TYPE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TYPE "auth"."aal_level" AS ENUM (
    'aal1',
    'aal2',
    'aal3'
);


ALTER TYPE "auth"."aal_level" OWNER TO "supabase_auth_admin";

--
-- Name: code_challenge_method; Type: TYPE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TYPE "auth"."code_challenge_method" AS ENUM (
    's256',
    'plain'
);


ALTER TYPE "auth"."code_challenge_method" OWNER TO "supabase_auth_admin";

--
-- Name: factor_status; Type: TYPE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TYPE "auth"."factor_status" AS ENUM (
    'unverified',
    'verified'
);


ALTER TYPE "auth"."factor_status" OWNER TO "supabase_auth_admin";

--
-- Name: factor_type; Type: TYPE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TYPE "auth"."factor_type" AS ENUM (
    'totp',
    'webauthn',
    'phone'
);


ALTER TYPE "auth"."factor_type" OWNER TO "supabase_auth_admin";

--
-- Name: oauth_authorization_status; Type: TYPE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TYPE "auth"."oauth_authorization_status" AS ENUM (
    'pending',
    'approved',
    'denied',
    'expired'
);


ALTER TYPE "auth"."oauth_authorization_status" OWNER TO "supabase_auth_admin";

--
-- Name: oauth_client_type; Type: TYPE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TYPE "auth"."oauth_client_type" AS ENUM (
    'public',
    'confidential'
);


ALTER TYPE "auth"."oauth_client_type" OWNER TO "supabase_auth_admin";

--
-- Name: oauth_registration_type; Type: TYPE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TYPE "auth"."oauth_registration_type" AS ENUM (
    'dynamic',
    'manual'
);


ALTER TYPE "auth"."oauth_registration_type" OWNER TO "supabase_auth_admin";

--
-- Name: oauth_response_type; Type: TYPE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TYPE "auth"."oauth_response_type" AS ENUM (
    'code'
);


ALTER TYPE "auth"."oauth_response_type" OWNER TO "supabase_auth_admin";

--
-- Name: one_time_token_type; Type: TYPE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TYPE "auth"."one_time_token_type" AS ENUM (
    'confirmation_token',
    'reauthentication_token',
    'recovery_token',
    'email_change_token_new',
    'email_change_token_current',
    'phone_change_token'
);


ALTER TYPE "auth"."one_time_token_type" OWNER TO "supabase_auth_admin";

--
-- Name: arrows; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE "public"."arrows" AS ENUM (
    'up',
    'down',
    'straight'
);


ALTER TYPE "public"."arrows" OWNER TO "postgres";

--
-- Name: cage_status_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE "public"."cage_status_enum" AS ENUM (
    'occupied',
    'available',
    'retired'
);


ALTER TYPE "public"."cage_status_enum" OWNER TO "postgres";

--
-- Name: change_type_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE "public"."change_type_enum" AS ENUM (
    'INSERT',
    'UPDATE',
    'DELETE'
);


ALTER TYPE "public"."change_type_enum" OWNER TO "postgres";

--
-- Name: farm_user_invitation_rpc_result; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE "public"."farm_user_invitation_rpc_result" AS (
	"id" "uuid",
	"farm_id" "uuid",
	"email" "text",
	"role" "text",
	"status" "text",
	"invited_by" "uuid",
	"invited_user_id" "uuid",
	"created_at" timestamp with time zone,
	"updated_at" timestamp with time zone,
	"last_sent_at" timestamp with time zone,
	"accepted_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"should_send_auth_invite" boolean
);


ALTER TYPE "public"."farm_user_invitation_rpc_result" OWNER TO "postgres";

--
-- Name: feed_category; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE "public"."feed_category" AS ENUM (
    'pre-starter',
    'starter',
    'pre-grower',
    'grower',
    'finisher',
    'broodstock',
    'unknown'
);


ALTER TYPE "public"."feed_category" OWNER TO "postgres";

--
-- Name: feed_pellet_size; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE "public"."feed_pellet_size" AS ENUM (
    'mash_powder',
    '<0.49mm',
    '0.5-0.99mm',
    '1.0-1.5mm',
    '1.5-1.99mm',
    '2mm',
    '2.5mm',
    '3mm',
    '3.5mm',
    '4mm',
    '4.5mm',
    '5mm',
    'unknown',
    '0.5mm',
    '0.5-1.0mm',
    '0.9-1.6mm'
);


ALTER TYPE "public"."feed_pellet_size" OWNER TO "postgres";

--
-- Name: mortality_cause; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE "public"."mortality_cause" AS ENUM (
    'unknown',
    'hypoxia',
    'disease',
    'injury',
    'handling',
    'predator',
    'starvation',
    'temperature',
    'other'
);


ALTER TYPE "public"."mortality_cause" OWNER TO "postgres";

--
-- Name: system_growth_stage; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE "public"."system_growth_stage" AS ENUM (
    'fingerling',
    'juvenile',
    'sub_adult',
    'broodstock'
);


ALTER TYPE "public"."system_growth_stage" OWNER TO "postgres";

--
-- Name: system_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE "public"."system_type" AS ENUM (
    'cage',
    'compartment',
    'all_active_cages',
    'rectangular_cage',
    'circular_cage',
    'pond',
    'tank'
);


ALTER TYPE "public"."system_type" OWNER TO "postgres";

--
-- Name: time_period; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE "public"."time_period" AS ENUM (
    'day',
    'week',
    '2 weeks',
    'month',
    'quarter',
    '6 months',
    'year'
);


ALTER TYPE "public"."time_period" OWNER TO "postgres";

--
-- Name: transfer_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE "public"."transfer_type" AS ENUM (
    'transfer',
    'grading',
    'density_thinning',
    'broodstock',
    'count_check',
    'lab_sample',
    'training',
    'external_out'
);


ALTER TYPE "public"."transfer_type" OWNER TO "postgres";

--
-- Name: type_of_harvest; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE "public"."type_of_harvest" AS ENUM (
    'partial',
    'final'
);


ALTER TYPE "public"."type_of_harvest" OWNER TO "postgres";

--
-- Name: type_of_stocking; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE "public"."type_of_stocking" AS ENUM (
    'empty',
    'already_stocked'
);


ALTER TYPE "public"."type_of_stocking" OWNER TO "postgres";

--
-- Name: units; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE "public"."units" AS ENUM (
    'm',
    'mg/l',
    'ppt',
    '°C',
    'pH',
    'NTU',
    'µS/cm'
);


ALTER TYPE "public"."units" OWNER TO "postgres";

--
-- Name: water_quality_parameters; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE "public"."water_quality_parameters" AS ENUM (
    'pH',
    'temperature',
    'dissolved_oxygen',
    'secchi_disk_depth',
    'nitrite',
    'nitrate',
    'ammonia',
    'salinity'
);


ALTER TYPE "public"."water_quality_parameters" OWNER TO "postgres";

--
-- Name: water_quality_rating; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE "public"."water_quality_rating" AS ENUM (
    'optimal',
    'acceptable',
    'critical',
    'lethal'
);


ALTER TYPE "public"."water_quality_rating" OWNER TO "postgres";

--
-- Name: action; Type: TYPE; Schema: realtime; Owner: supabase_admin
--

CREATE TYPE "realtime"."action" AS ENUM (
    'INSERT',
    'UPDATE',
    'DELETE',
    'TRUNCATE',
    'ERROR'
);


ALTER TYPE "realtime"."action" OWNER TO "supabase_admin";

--
-- Name: equality_op; Type: TYPE; Schema: realtime; Owner: supabase_admin
--

CREATE TYPE "realtime"."equality_op" AS ENUM (
    'eq',
    'neq',
    'lt',
    'lte',
    'gt',
    'gte',
    'in',
    'like',
    'ilike',
    'is',
    'match',
    'imatch',
    'isdistinct'
);


ALTER TYPE "realtime"."equality_op" OWNER TO "supabase_admin";

--
-- Name: user_defined_filter; Type: TYPE; Schema: realtime; Owner: supabase_admin
--

CREATE TYPE "realtime"."user_defined_filter" AS (
	"column_name" "text",
	"op" "realtime"."equality_op",
	"value" "text",
	"negate" boolean
);


ALTER TYPE "realtime"."user_defined_filter" OWNER TO "supabase_admin";

--
-- Name: wal_column; Type: TYPE; Schema: realtime; Owner: supabase_admin
--

CREATE TYPE "realtime"."wal_column" AS (
	"name" "text",
	"type_name" "text",
	"type_oid" "oid",
	"value" "jsonb",
	"is_pkey" boolean,
	"is_selectable" boolean
);


ALTER TYPE "realtime"."wal_column" OWNER TO "supabase_admin";

--
-- Name: wal_rls; Type: TYPE; Schema: realtime; Owner: supabase_admin
--

CREATE TYPE "realtime"."wal_rls" AS (
	"wal" "jsonb",
	"is_rls_enabled" boolean,
	"subscription_ids" "uuid"[],
	"errors" "text"[]
);


ALTER TYPE "realtime"."wal_rls" OWNER TO "supabase_admin";

--
-- Name: buckettype; Type: TYPE; Schema: storage; Owner: supabase_storage_admin
--

CREATE TYPE "storage"."buckettype" AS ENUM (
    'STANDARD',
    'ANALYTICS',
    'VECTOR'
);


ALTER TYPE "storage"."buckettype" OWNER TO "supabase_storage_admin";

--
-- Name: debug_view_end(); Type: FUNCTION; Schema: analytics; Owner: postgres
--

CREATE FUNCTION "analytics"."debug_view_end"() RETURNS "text"
    LANGUAGE "plpgsql"
    AS $$
DECLARE v text;
BEGIN
  v := pg_get_viewdef('analytics.production_summary'::regclass);
    RETURN substring(v, length(v) - 200);
    END $$;


ALTER FUNCTION "analytics"."debug_view_end"() OWNER TO "postgres";

--
-- Name: debug_view_update(); Type: FUNCTION; Schema: analytics; Owner: postgres
--

CREATE FUNCTION "analytics"."debug_view_update"() RETURNS "text"
    LANGUAGE "plpgsql"
    AS $$
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
                                    END $$;


ALTER FUNCTION "analytics"."debug_view_update"() OWNER TO "postgres";

--
-- Name: update_production_summary_view(); Type: FUNCTION; Schema: analytics; Owner: postgres
--

CREATE FUNCTION "analytics"."update_production_summary_view"() RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
begin
  refresh materialized view analytics.daily_system_facts;
  refresh materialized view analytics.production_summary;
end;
$$;


ALTER FUNCTION "analytics"."update_production_summary_view"() OWNER TO "postgres";

--
-- Name: email(); Type: FUNCTION; Schema: auth; Owner: supabase_auth_admin
--

CREATE FUNCTION "auth"."email"() RETURNS "text"
    LANGUAGE "sql" STABLE
    AS $$
  select 
  coalesce(
    nullif(current_setting('request.jwt.claim.email', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'email')
  )::text
$$;


ALTER FUNCTION "auth"."email"() OWNER TO "supabase_auth_admin";

--
-- Name: FUNCTION "email"(); Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON FUNCTION "auth"."email"() IS 'Deprecated. Use auth.jwt() -> ''email'' instead.';


--
-- Name: jwt(); Type: FUNCTION; Schema: auth; Owner: supabase_auth_admin
--

CREATE FUNCTION "auth"."jwt"() RETURNS "jsonb"
    LANGUAGE "sql" STABLE
    AS $$
  select 
    coalesce(
        nullif(current_setting('request.jwt.claim', true), ''),
        nullif(current_setting('request.jwt.claims', true), '')
    )::jsonb
$$;


ALTER FUNCTION "auth"."jwt"() OWNER TO "supabase_auth_admin";

--
-- Name: role(); Type: FUNCTION; Schema: auth; Owner: supabase_auth_admin
--

CREATE FUNCTION "auth"."role"() RETURNS "text"
    LANGUAGE "sql" STABLE
    AS $$
  select 
  coalesce(
    nullif(current_setting('request.jwt.claim.role', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role')
  )::text
$$;


ALTER FUNCTION "auth"."role"() OWNER TO "supabase_auth_admin";

--
-- Name: FUNCTION "role"(); Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON FUNCTION "auth"."role"() IS 'Deprecated. Use auth.jwt() -> ''role'' instead.';


--
-- Name: uid(); Type: FUNCTION; Schema: auth; Owner: supabase_auth_admin
--

CREATE FUNCTION "auth"."uid"() RETURNS "uuid"
    LANGUAGE "sql" STABLE
    AS $$
  select 
  coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid
$$;


ALTER FUNCTION "auth"."uid"() OWNER TO "supabase_auth_admin";

--
-- Name: FUNCTION "uid"(); Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON FUNCTION "auth"."uid"() IS 'Deprecated. Use auth.jwt() -> ''sub'' instead.';


--
-- Name: grant_pg_cron_access(); Type: FUNCTION; Schema: extensions; Owner: supabase_admin
--

CREATE FUNCTION "extensions"."grant_pg_cron_access"() RETURNS "event_trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF EXISTS (
    SELECT
    FROM pg_event_trigger_ddl_commands() AS ev
    JOIN pg_extension AS ext
    ON ev.objid = ext.oid
    WHERE ext.extname = 'pg_cron'
  )
  THEN
    grant usage on schema cron to postgres with grant option;

    alter default privileges in schema cron grant all on tables to postgres with grant option;
    alter default privileges in schema cron grant all on functions to postgres with grant option;
    alter default privileges in schema cron grant all on sequences to postgres with grant option;

    alter default privileges for user supabase_admin in schema cron grant all
        on sequences to postgres with grant option;
    alter default privileges for user supabase_admin in schema cron grant all
        on tables to postgres with grant option;
    alter default privileges for user supabase_admin in schema cron grant all
        on functions to postgres with grant option;

    grant all privileges on all tables in schema cron to postgres with grant option;
    revoke all on table cron.job from postgres;
    grant select on table cron.job to postgres with grant option;
  END IF;
END;
$$;


ALTER FUNCTION "extensions"."grant_pg_cron_access"() OWNER TO "supabase_admin";

--
-- Name: FUNCTION "grant_pg_cron_access"(); Type: COMMENT; Schema: extensions; Owner: supabase_admin
--

COMMENT ON FUNCTION "extensions"."grant_pg_cron_access"() IS 'Grants access to pg_cron';


--
-- Name: grant_pg_graphql_access(); Type: FUNCTION; Schema: extensions; Owner: supabase_admin
--

CREATE FUNCTION "extensions"."grant_pg_graphql_access"() RETURNS "event_trigger"
    LANGUAGE "plpgsql"
    AS $_$
DECLARE
    func_is_graphql_resolve bool;
BEGIN
    func_is_graphql_resolve = (
        SELECT n.proname = 'resolve'
        FROM pg_event_trigger_ddl_commands() AS ev
        LEFT JOIN pg_catalog.pg_proc AS n
        ON ev.objid = n.oid
    );

    IF func_is_graphql_resolve
    THEN
        -- Update public wrapper to pass all arguments through to the pg_graphql resolve func
        DROP FUNCTION IF EXISTS graphql_public.graphql;
        create or replace function graphql_public.graphql(
            "operationName" text default null,
            query text default null,
            variables jsonb default null,
            extensions jsonb default null
        )
            returns jsonb
            language sql
        as $$
            select graphql.resolve(
                query := query,
                variables := coalesce(variables, '{}'),
                "operationName" := "operationName",
                extensions := extensions
            );
        $$;

        -- This hook executes when `graphql.resolve` is created. That is not necessarily the last
        -- function in the extension so we need to grant permissions on existing entities AND
        -- update default permissions to any others that are created after `graphql.resolve`
        grant usage on schema graphql to postgres, anon, authenticated, service_role;
        grant select on all tables in schema graphql to postgres, anon, authenticated, service_role;
        grant execute on all functions in schema graphql to postgres, anon, authenticated, service_role;
        grant all on all sequences in schema graphql to postgres, anon, authenticated, service_role;
        alter default privileges in schema graphql grant all on tables to postgres, anon, authenticated, service_role;
        alter default privileges in schema graphql grant all on functions to postgres, anon, authenticated, service_role;
        alter default privileges in schema graphql grant all on sequences to postgres, anon, authenticated, service_role;

        -- Allow postgres role to allow granting usage on graphql and graphql_public schemas to custom roles
        grant usage on schema graphql_public to postgres with grant option;
        grant usage on schema graphql to postgres with grant option;
    END IF;

END;
$_$;


ALTER FUNCTION "extensions"."grant_pg_graphql_access"() OWNER TO "supabase_admin";

--
-- Name: FUNCTION "grant_pg_graphql_access"(); Type: COMMENT; Schema: extensions; Owner: supabase_admin
--

COMMENT ON FUNCTION "extensions"."grant_pg_graphql_access"() IS 'Grants access to pg_graphql';


--
-- Name: grant_pg_net_access(); Type: FUNCTION; Schema: extensions; Owner: supabase_admin
--

CREATE FUNCTION "extensions"."grant_pg_net_access"() RETURNS "event_trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_event_trigger_ddl_commands() AS ev
    JOIN pg_extension AS ext
    ON ev.objid = ext.oid
    WHERE ext.extname = 'pg_net'
  )
  THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_roles
      WHERE rolname = 'supabase_functions_admin'
    )
    THEN
      CREATE USER supabase_functions_admin NOINHERIT CREATEROLE LOGIN NOREPLICATION;
    END IF;

    GRANT USAGE ON SCHEMA net TO supabase_functions_admin, postgres, anon, authenticated, service_role;

    IF EXISTS (
      SELECT FROM pg_extension
      WHERE extname = 'pg_net'
      -- all versions in use on existing projects as of 2025-02-20
      -- version 0.12.0 onwards don't need these applied
      AND extversion IN ('0.2', '0.6', '0.7', '0.7.1', '0.8', '0.10.0', '0.11.0')
    ) THEN
      ALTER function net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) SECURITY DEFINER;
      ALTER function net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) SECURITY DEFINER;

      ALTER function net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) SET search_path = net;
      ALTER function net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) SET search_path = net;

      REVOKE ALL ON FUNCTION net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) FROM PUBLIC;
      REVOKE ALL ON FUNCTION net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) FROM PUBLIC;

      GRANT EXECUTE ON FUNCTION net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) TO supabase_functions_admin, postgres, anon, authenticated, service_role;
      GRANT EXECUTE ON FUNCTION net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) TO supabase_functions_admin, postgres, anon, authenticated, service_role;
    END IF;
  END IF;
END;
$$;


ALTER FUNCTION "extensions"."grant_pg_net_access"() OWNER TO "supabase_admin";

--
-- Name: FUNCTION "grant_pg_net_access"(); Type: COMMENT; Schema: extensions; Owner: supabase_admin
--

COMMENT ON FUNCTION "extensions"."grant_pg_net_access"() IS 'Grants access to pg_net';


--
-- Name: pgrst_ddl_watch(); Type: FUNCTION; Schema: extensions; Owner: supabase_admin
--

CREATE FUNCTION "extensions"."pgrst_ddl_watch"() RETURNS "event_trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN SELECT * FROM pg_event_trigger_ddl_commands()
  LOOP
    IF cmd.command_tag IN (
      'CREATE SCHEMA', 'ALTER SCHEMA'
    , 'CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO', 'ALTER TABLE'
    , 'CREATE FOREIGN TABLE', 'ALTER FOREIGN TABLE'
    , 'CREATE VIEW', 'ALTER VIEW'
    , 'CREATE MATERIALIZED VIEW', 'ALTER MATERIALIZED VIEW'
    , 'CREATE FUNCTION', 'ALTER FUNCTION'
    , 'CREATE TRIGGER'
    , 'CREATE TYPE', 'ALTER TYPE'
    , 'CREATE RULE'
    , 'COMMENT'
    )
    -- don't notify in case of CREATE TEMP table or other objects created on pg_temp
    AND cmd.schema_name is distinct from 'pg_temp'
    THEN
      NOTIFY pgrst, 'reload schema';
    END IF;
  END LOOP;
END; $$;


ALTER FUNCTION "extensions"."pgrst_ddl_watch"() OWNER TO "supabase_admin";

--
-- Name: pgrst_drop_watch(); Type: FUNCTION; Schema: extensions; Owner: supabase_admin
--

CREATE FUNCTION "extensions"."pgrst_drop_watch"() RETURNS "event_trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  obj record;
BEGIN
  FOR obj IN SELECT * FROM pg_event_trigger_dropped_objects()
  LOOP
    IF obj.object_type IN (
      'schema'
    , 'table'
    , 'foreign table'
    , 'view'
    , 'materialized view'
    , 'function'
    , 'trigger'
    , 'type'
    , 'rule'
    )
    AND obj.is_temporary IS false -- no pg_temp objects
    THEN
      NOTIFY pgrst, 'reload schema';
    END IF;
  END LOOP;
END; $$;


ALTER FUNCTION "extensions"."pgrst_drop_watch"() OWNER TO "supabase_admin";

--
-- Name: set_graphql_placeholder(); Type: FUNCTION; Schema: extensions; Owner: supabase_admin
--

CREATE FUNCTION "extensions"."set_graphql_placeholder"() RETURNS "event_trigger"
    LANGUAGE "plpgsql"
    AS $_$
    DECLARE
    graphql_is_dropped bool;
    BEGIN
    graphql_is_dropped = (
        SELECT ev.schema_name = 'graphql_public'
        FROM pg_event_trigger_dropped_objects() AS ev
        WHERE ev.schema_name = 'graphql_public'
    );

    IF graphql_is_dropped
    THEN
        create or replace function graphql_public.graphql(
            "operationName" text default null,
            query text default null,
            variables jsonb default null,
            extensions jsonb default null
        )
            returns jsonb
            language plpgsql
        as $$
            DECLARE
                server_version float;
            BEGIN
                server_version = (SELECT (SPLIT_PART((select version()), ' ', 2))::float);

                IF server_version >= 14 THEN
                    RETURN jsonb_build_object(
                        'errors', jsonb_build_array(
                            jsonb_build_object(
                                'message', 'pg_graphql extension is not enabled.'
                            )
                        )
                    );
                ELSE
                    RETURN jsonb_build_object(
                        'errors', jsonb_build_array(
                            jsonb_build_object(
                                'message', 'pg_graphql is only available on projects running Postgres 14 onwards.'
                            )
                        )
                    );
                END IF;
            END;
        $$;
    END IF;

    END;
$_$;


ALTER FUNCTION "extensions"."set_graphql_placeholder"() OWNER TO "supabase_admin";

--
-- Name: FUNCTION "set_graphql_placeholder"(); Type: COMMENT; Schema: extensions; Owner: supabase_admin
--

COMMENT ON FUNCTION "extensions"."set_graphql_placeholder"() IS 'Reintroduces placeholder function for graphql_public.graphql';


--
-- Name: graphql("text", "text", "jsonb", "jsonb"); Type: FUNCTION; Schema: graphql_public; Owner: supabase_admin
--

CREATE FUNCTION "graphql_public"."graphql"("operationName" "text" DEFAULT NULL::"text", "query" "text" DEFAULT NULL::"text", "variables" "jsonb" DEFAULT NULL::"jsonb", "extensions" "jsonb" DEFAULT NULL::"jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql"
    AS $$
            DECLARE
                server_version float;
            BEGIN
                server_version = (SELECT (SPLIT_PART((select version()), ' ', 2))::float);

                IF server_version >= 14 THEN
                    RETURN jsonb_build_object(
                        'errors', jsonb_build_array(
                            jsonb_build_object(
                                'message', 'pg_graphql extension is not enabled.'
                            )
                        )
                    );
                ELSE
                    RETURN jsonb_build_object(
                        'errors', jsonb_build_array(
                            jsonb_build_object(
                                'message', 'pg_graphql is only available on projects running Postgres 14 onwards.'
                            )
                        )
                    );
                END IF;
            END;
        $$;


ALTER FUNCTION "graphql_public"."graphql"("operationName" "text", "query" "text", "variables" "jsonb", "extensions" "jsonb") OWNER TO "supabase_admin";

--
-- Name: app_rpc_scope_ok("uuid", bigint[], bigint, "date", "date"); Type: FUNCTION; Schema: private; Owner: postgres
--

CREATE FUNCTION "private"."app_rpc_scope_ok"("p_farm_id" "uuid", "p_system_ids" bigint[] DEFAULT NULL::bigint[], "p_cycle_id" bigint DEFAULT NULL::bigint, "p_start_date" "date" DEFAULT NULL::"date", "p_end_date" "date" DEFAULT NULL::"date") RETURNS boolean
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public', 'private'
    AS $$
          BEGIN
            PERFORM private.assert_rpc_parameters(
                p_farm_id, p_system_ids, p_cycle_id, p_start_date, p_end_date
                  );
                    RETURN TRUE;
                    EXCEPTION WHEN OTHERS THEN
                      RETURN FALSE;
                      END;
                      $$;


ALTER FUNCTION "private"."app_rpc_scope_ok"("p_farm_id" "uuid", "p_system_ids" bigint[], "p_cycle_id" bigint, "p_start_date" "date", "p_end_date" "date") OWNER TO "postgres";

--
-- Name: apply_pending_farm_user_invitations("uuid", "text"); Type: FUNCTION; Schema: private; Owner: postgres
--

CREATE FUNCTION "private"."apply_pending_farm_user_invitations"("p_user_id" "uuid", "p_email" "text") RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public', 'private'
    AS $$
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
$$;


ALTER FUNCTION "private"."apply_pending_farm_user_invitations"("p_user_id" "uuid", "p_email" "text") OWNER TO "postgres";

--
-- Name: assert_rpc_parameters("uuid", bigint[], bigint, "date", "date"); Type: FUNCTION; Schema: private; Owner: postgres
--

CREATE FUNCTION "private"."assert_rpc_parameters"("p_farm_id" "uuid", "p_system_ids" bigint[] DEFAULT NULL::bigint[], "p_cycle_id" bigint DEFAULT NULL::bigint, "p_start_date" "date" DEFAULT NULL::"date", "p_end_date" "date" DEFAULT NULL::"date") RETURNS "void"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public', 'private'
    AS $$
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
                                                                                                                                                     $$;


ALTER FUNCTION "private"."assert_rpc_parameters"("p_farm_id" "uuid", "p_system_ids" bigint[], "p_cycle_id" bigint, "p_start_date" "date", "p_end_date" "date") OWNER TO "postgres";

--
-- Name: has_farm_role("uuid", "text"[]); Type: FUNCTION; Schema: private; Owner: postgres
--

CREATE FUNCTION "private"."has_farm_role"("farm" "uuid", "roles" "text"[]) RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public', 'private'
    AS $$
      SELECT EXISTS (
          SELECT 1
              FROM public.farm_user fu
                  WHERE fu.farm_id = farm
                        AND fu.user_id = (SELECT auth.uid())
                              AND fu.role = ANY(roles)
                                );
                                $$;


ALTER FUNCTION "private"."has_farm_role"("farm" "uuid", "roles" "text"[]) OWNER TO "postgres";

--
-- Name: has_farm_role("uuid", "text"[], "uuid"); Type: FUNCTION; Schema: private; Owner: postgres
--

CREATE FUNCTION "private"."has_farm_role"("farm" "uuid", "roles" "text"[], "_user_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public', 'private'
    AS $$
                                        SELECT EXISTS (
                                            SELECT 1
                                                FROM public.farm_user fu
                                                    WHERE fu.farm_id = farm
                                                          AND fu.user_id = _user_id
                                                                AND fu.role = ANY(roles)
                                                                  );
                                                                  $$;


ALTER FUNCTION "private"."has_farm_role"("farm" "uuid", "roles" "text"[], "_user_id" "uuid") OWNER TO "postgres";

--
-- Name: is_farm_member("uuid"); Type: FUNCTION; Schema: private; Owner: postgres
--

CREATE FUNCTION "private"."is_farm_member"("farm" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public', 'private'
    AS $$
                                                                      SELECT EXISTS (
                                                                          SELECT 1
                                                                              FROM public.farm_user fu
                                                                                  WHERE fu.farm_id = farm
                                                                                        AND fu.user_id = (SELECT auth.uid())
                                                                                          );
                                                                                          $$;


ALTER FUNCTION "private"."is_farm_member"("farm" "uuid") OWNER TO "postgres";

--
-- Name: is_farm_member("uuid", "uuid"); Type: FUNCTION; Schema: private; Owner: postgres
--

CREATE FUNCTION "private"."is_farm_member"("farm" "uuid", "_user_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public', 'private'
    AS $$
                                                                                                SELECT EXISTS (
                                                                                                    SELECT 1
                                                                                                        FROM public.farm_user fu
                                                                                                            WHERE fu.farm_id = farm
                                                                                                                  AND fu.user_id = _user_id
                                                                                                                    );
                                                                                                                    $$;


ALTER FUNCTION "private"."is_farm_member"("farm" "uuid", "_user_id" "uuid") OWNER TO "postgres";

--
-- Name: set_fish_mortality_farm_id(); Type: FUNCTION; Schema: private; Owner: postgres
--

CREATE FUNCTION "private"."set_fish_mortality_farm_id"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public', 'private'
    AS $$
              BEGIN
                IF NEW.farm_id IS NULL OR (TG_OP = 'UPDATE' AND NEW.system_id IS DISTINCT FROM OLD.system_id) THEN
                    SELECT s.farm_id INTO NEW.farm_id FROM public.system s WHERE s.id = NEW.system_id;
                      END IF;
                        RETURN NEW;
                        END;
                        $$;


ALTER FUNCTION "private"."set_fish_mortality_farm_id"() OWNER TO "postgres";

--
-- Name: set_updated_at(); Type: FUNCTION; Schema: private; Owner: postgres
--

CREATE FUNCTION "private"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "private"."set_updated_at"() OWNER TO "postgres";

--
-- Name: after_event_queue_new(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."after_event_queue_new"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."after_event_queue_new"() OWNER TO "postgres";

--
-- Name: after_event_queue_old(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."after_event_queue_old"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."after_event_queue_old"() OWNER TO "postgres";

--
-- Name: after_event_update_inventory(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."after_event_update_inventory"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."after_event_update_inventory"() OWNER TO "postgres";

--
-- Name: FUNCTION "after_event_update_inventory"(); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION "public"."after_event_update_inventory"() IS 'Registers affected system(s) and triggers scoped daily inventory recomputation.';


--
-- Name: api_batch_system_ids(bigint); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."api_batch_system_ids"("p_batch_id" bigint) RETURNS TABLE("system_id" bigint)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."api_batch_system_ids"("p_batch_id" bigint) OWNER TO "postgres";

--
-- Name: FUNCTION "api_batch_system_ids"("p_batch_id" bigint); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION "public"."api_batch_system_ids"("p_batch_id" bigint) IS 'L3. Component: Batch Filter Resolver. Reads: L0 recursive (system lineage via production_cycle). Biology source: none. Delete if: batch filter removed. Last reviewed: 2026-06. Owner: @aquasmart-backend';


--
-- Name: api_dashboard_consolidated("uuid", bigint[], "public"."system_growth_stage", "date", "date", "text", integer, boolean); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."api_dashboard_consolidated"("p_farm_id" "uuid", "p_system_ids" bigint[] DEFAULT NULL::bigint[], "p_stage" "public"."system_growth_stage" DEFAULT NULL::"public"."system_growth_stage", "p_start_date" "date" DEFAULT NULL::"date", "p_end_date" "date" DEFAULT NULL::"date", "p_time_period" "text" DEFAULT NULL::"text", "p_limit" integer DEFAULT NULL::integer, "p_order_desc" boolean DEFAULT true) RETURNS TABLE("system_id" bigint, "time_period" "text", "input_start_date" "date", "input_end_date" "date", "efcr_period_consolidated" double precision, "efcr_period_consolidated_delta" double precision, "mortality_rate" double precision, "mortality_rate_delta" double precision, "abw_asof_end" double precision, "abw_asof_end_delta" double precision, "total_biomass" double precision, "total_biomass_delta" double precision, "biomass_density" double precision, "biomass_density_delta" double precision, "feeding_rate" double precision, "feeding_rate_delta" double precision, "sgr" double precision, "sgr_delta" double precision, "agr" double precision, "agr_delta" double precision, "water_quality_rating_average" "text", "water_quality_rating_numeric_average" double precision, "water_quality_rating_numeric_delta" double precision)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public', 'analytics', 'private'
    AS $$
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
$$;


ALTER FUNCTION "public"."api_dashboard_consolidated"("p_farm_id" "uuid", "p_system_ids" bigint[], "p_stage" "public"."system_growth_stage", "p_start_date" "date", "p_end_date" "date", "p_time_period" "text", "p_limit" integer, "p_order_desc" boolean) OWNER TO "postgres";

--
-- Name: api_dashboard_systems("uuid", bigint[], "public"."system_growth_stage", "date", "date"); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."api_dashboard_systems"("p_farm_id" "uuid", "p_system_ids" bigint[] DEFAULT NULL::bigint[], "p_stage" "public"."system_growth_stage" DEFAULT NULL::"public"."system_growth_stage", "p_start_date" "date" DEFAULT NULL::"date", "p_end_date" "date" DEFAULT NULL::"date") RETURNS TABLE("system_id" bigint, "system_name" "text", "growth_stage" "public"."system_growth_stage", "input_start_date" "date", "input_end_date" "date", "as_of_date" "date", "fish_end" double precision, "biomass_end" double precision, "sampling_end_date" "date", "sample_age_days" integer, "efcr" double precision, "efcr_latest_date" "date", "efcr_arrow" "text", "feed_total" double precision, "abw" double precision, "abw_latest_date" "date", "abw_arrow" "text", "feeding_rate" double precision, "feeding_rate_latest_date" "date", "feeding_rate_arrow" "text", "mortality_rate" double precision, "mortality_rate_latest_date" "date", "mortality_rate_arrow" "text", "biomass_density" double precision, "biomass_density_latest_date" "date", "biomass_density_arrow" "text", "sgr" double precision, "agr" double precision, "sgr_arrow" "text", "agr_arrow" "text", "missing_days_count" integer, "water_quality_rating_average" "text", "water_quality_rating_numeric_average" double precision, "water_quality_latest_date" "date", "water_quality_arrow" "text", "worst_parameter" "text", "worst_parameter_value" double precision, "worst_parameter_unit" "text", "cycle_day" integer, "target_weight_g" double precision, "target_weight_progress_pct" double precision, "is_complete" boolean)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public', 'pg_temp'
    AS $$
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
$$;


ALTER FUNCTION "public"."api_dashboard_systems"("p_farm_id" "uuid", "p_system_ids" bigint[], "p_stage" "public"."system_growth_stage", "p_start_date" "date", "p_end_date" "date") OWNER TO "postgres";

--
-- Name: api_farm_options_rpc(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."api_farm_options_rpc"() RETURNS TABLE("id" "uuid", "label" "text", "location" "text")
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
  select f.id, f.name as label, f.location
  from public.farm f
  where private.is_farm_member(f.id)
  order by f.name;
$$;


ALTER FUNCTION "public"."api_farm_options_rpc"() OWNER TO "postgres";

--
-- Name: FUNCTION "api_farm_options_rpc"(); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION "public"."api_farm_options_rpc"() IS 'L3. Component: Farm Selector Dropdown. Reads: L0 lookup (farm table metadata only). Biology source: none. Delete if: farm selector dropdown removed. Last reviewed: 2026-06. Owner: @aquasmart-backend';


--
-- Name: api_farm_user_invitations("uuid"); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."api_farm_user_invitations"("p_farm_id" "uuid") RETURNS TABLE("id" "uuid", "farm_id" "uuid", "email" "text", "role" "text", "status" "text", "invited_by" "uuid", "invited_user_id" "uuid", "created_at" timestamp with time zone, "updated_at" timestamp with time zone, "last_sent_at" timestamp with time zone, "accepted_at" timestamp with time zone, "revoked_at" timestamp with time zone)
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public', 'private'
    AS $$
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
$$;


ALTER FUNCTION "public"."api_farm_user_invitations"("p_farm_id" "uuid") OWNER TO "postgres";

--
-- Name: FUNCTION "api_farm_user_invitations"("p_farm_id" "uuid"); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION "public"."api_farm_user_invitations"("p_farm_id" "uuid") IS 'L3. Component: User Management > Invitations List. Reads: private schema (farm_user_invitation). Biology source: none. Delete if: UserInvitations component removed. Last reviewed: 2026-06. Owner: @aquasmart-backend';


--
-- Name: api_feed_dashboard_kpis("uuid", bigint[], "date", "date"); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."api_feed_dashboard_kpis"("p_farm_id" "uuid", "p_system_ids" bigint[] DEFAULT NULL::bigint[], "p_start_date" "date" DEFAULT NULL::"date", "p_end_date" "date" DEFAULT NULL::"date") RETURNS TABLE("as_of_date" "date", "feed_used_today_kg" numeric, "feed_this_period_kg" numeric, "plan_vs_actual_pct" numeric, "avg_feeding_rate_pct" numeric, "overfeeding_systems" integer, "underfeeding_systems" integer)
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public', 'analytics', 'private'
    AS $$
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
$$;


ALTER FUNCTION "public"."api_feed_dashboard_kpis"("p_farm_id" "uuid", "p_system_ids" bigint[], "p_start_date" "date", "p_end_date" "date") OWNER TO "postgres";

--
-- Name: api_feed_efcr_trend("uuid", bigint[], "date", "date"); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."api_feed_efcr_trend"("p_farm_id" "uuid", "p_system_ids" bigint[] DEFAULT NULL::bigint[], "p_start_date" "date" DEFAULT NULL::"date", "p_end_date" "date" DEFAULT NULL::"date") RETURNS TABLE("date" "date", "efcr_period" numeric)
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public', 'analytics', 'private'
    AS $$
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
$$;


ALTER FUNCTION "public"."api_feed_efcr_trend"("p_farm_id" "uuid", "p_system_ids" bigint[], "p_start_date" "date", "p_end_date" "date") OWNER TO "postgres";

--
-- Name: api_feed_inventory_feed_type_options_rpc("uuid", "date"); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."api_feed_inventory_feed_type_options_rpc"("p_farm_id" "uuid", "p_date_to" "date" DEFAULT NULL::"date") RETURNS TABLE("id" bigint, "farm_id" "uuid", "feed_line" "text", "label" "text", "feed_category" "text", "feed_pellet_size" "text", "crude_protein_percentage" numeric, "crude_fat_percentage" numeric, "visibility_scope" "text")
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."api_feed_inventory_feed_type_options_rpc"("p_farm_id" "uuid", "p_date_to" "date") OWNER TO "postgres";

--
-- Name: api_feed_plan_vs_actual("uuid", bigint[], "date", "date"); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."api_feed_plan_vs_actual"("p_farm_id" "uuid", "p_system_ids" bigint[] DEFAULT NULL::bigint[], "p_start_date" "date" DEFAULT NULL::"date", "p_end_date" "date" DEFAULT NULL::"date") RETURNS TABLE("date" "date", "planned_feed_kg" numeric, "actual_feed_kg" numeric)
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public', 'analytics', 'private'
    AS $$
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
$$;


ALTER FUNCTION "public"."api_feed_plan_vs_actual"("p_farm_id" "uuid", "p_system_ids" bigint[], "p_start_date" "date", "p_end_date" "date") OWNER TO "postgres";

--
-- Name: api_feed_recommendations("uuid", bigint[], "date"); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."api_feed_recommendations"("p_farm_id" "uuid", "p_system_ids" bigint[] DEFAULT NULL::bigint[], "p_date" "date" DEFAULT CURRENT_DATE) RETURNS TABLE("system_id" bigint, "system_name" "text", "recommendation_date" "date", "model_version" "text", "scenario" "text", "phase_id" integer, "biomass_kg" numeric, "abw_g" numeric, "abw_projected_g" numeric, "feeding_rate_pct" numeric, "planned_feed_kg" numeric, "adjusted_feed_kg" numeric, "confidence" "text")
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public', 'analytics', 'private'
    AS $$
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
$$;


ALTER FUNCTION "public"."api_feed_recommendations"("p_farm_id" "uuid", "p_system_ids" bigint[], "p_date" "date") OWNER TO "postgres";

--
-- Name: api_feed_type_options_rpc("uuid"); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."api_feed_type_options_rpc"("p_farm_id" "uuid") RETURNS TABLE("id" bigint, "farm_id" "uuid", "feed_line" "text", "label" "text", "feed_category" "text", "feed_pellet_size" "text", "crude_protein_percentage" numeric, "crude_fat_percentage" numeric, "visibility_scope" "text")
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."api_feed_type_options_rpc"("p_farm_id" "uuid") OWNER TO "postgres";

--
-- Name: FUNCTION "api_feed_type_options_rpc"("p_farm_id" "uuid"); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION "public"."api_feed_type_options_rpc"("p_farm_id" "uuid") IS 'L3. Component: Feed Type Selector Dropdown. Reads: L0 lookup (feed_type table). Biology source: none. Delete if: feed type selector removed. Last reviewed: 2026-06. Owner: @aquasmart-backend';


--
-- Name: api_feed_vs_biomass_gain("uuid", bigint[], "date", "date"); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."api_feed_vs_biomass_gain"("p_farm_id" "uuid", "p_system_ids" bigint[] DEFAULT NULL::bigint[], "p_start_date" "date" DEFAULT NULL::"date", "p_end_date" "date" DEFAULT NULL::"date") RETURNS TABLE("system_id" bigint, "system_name" "text", "date" "date", "feed_kg" numeric, "biomass_gain_kg" numeric)
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public', 'analytics', 'private'
    AS $$
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
$$;


ALTER FUNCTION "public"."api_feed_vs_biomass_gain"("p_farm_id" "uuid", "p_system_ids" bigint[], "p_start_date" "date", "p_end_date" "date") OWNER TO "postgres";

--
-- Name: api_feeding_alerts("uuid", bigint[], "date", "date"); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."api_feeding_alerts"("p_farm_id" "uuid", "p_system_ids" bigint[] DEFAULT NULL::bigint[], "p_start_date" "date" DEFAULT NULL::"date", "p_end_date" "date" DEFAULT NULL::"date") RETURNS TABLE("system_id" bigint, "system_name" "text", "date" "date", "alert" "text", "recommendation" "text", "severity" "text")
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public', 'analytics', 'private'
    AS $$
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
$$;


ALTER FUNCTION "public"."api_feeding_alerts"("p_farm_id" "uuid", "p_system_ids" bigint[], "p_start_date" "date", "p_end_date" "date") OWNER TO "postgres";

--
-- Name: api_feeding_rate_vs_target("uuid", bigint[], "date", "date"); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."api_feeding_rate_vs_target"("p_farm_id" "uuid", "p_system_ids" bigint[] DEFAULT NULL::bigint[], "p_start_date" "date" DEFAULT NULL::"date", "p_end_date" "date" DEFAULT NULL::"date") RETURNS TABLE("date" "date", "actual_rate" numeric, "feed_rate_min_pct" numeric, "feed_rate_max_pct" numeric)
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public', 'analytics', 'private'
    AS $$
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
$$;


ALTER FUNCTION "public"."api_feeding_rate_vs_target"("p_farm_id" "uuid", "p_system_ids" bigint[], "p_start_date" "date", "p_end_date" "date") OWNER TO "postgres";

--
-- Name: api_feeding_response_distribution("uuid", bigint[], "date", "date"); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."api_feeding_response_distribution"("p_farm_id" "uuid", "p_system_ids" bigint[] DEFAULT NULL::bigint[], "p_start_date" "date" DEFAULT NULL::"date", "p_end_date" "date" DEFAULT NULL::"date") RETURNS TABLE("feeding_response" integer, "count" bigint)
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public', 'analytics', 'private'
    AS $$
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
$$;


ALTER FUNCTION "public"."api_feeding_response_distribution"("p_farm_id" "uuid", "p_system_ids" bigint[], "p_start_date" "date", "p_end_date" "date") OWNER TO "postgres";

--
-- Name: api_fingerling_batch_options_rpc("uuid", boolean); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."api_fingerling_batch_options_rpc"("p_farm_id" "uuid" DEFAULT NULL::"uuid", "p_active_only" boolean DEFAULT true) RETURNS TABLE("id" bigint, "farm_id" "uuid", "system_id" bigint, "label" "text", "date_of_delivery" "date", "abw" numeric, "number_of_fish" numeric, "supplier_id" bigint)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
select
  fb.id,
  fb.farm_id,
  -- derive system_id from the most recent ongoing production cycle for this batch
  (
    select pc.system_id
    from public.production_cycle pc
    where pc.batch_id = fb.id
      and pc.ongoing_cycle = true
    order by pc.cycle_start desc
    limit 1
  ) as system_id,
  coalesce(nullif(fb.name, ''), 'Batch #' || fb.id::text) as label,
  fb.date_of_delivery,
  fb.abw::numeric,
  fb.number_of_fish::numeric,
  fb.supplier_id
from public.fingerling_batch fb
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
      from public.production_cycle pc2
      join public.system s on s.id = pc2.system_id
      where pc2.batch_id = fb.id
        and pc2.ongoing_cycle = true
        and s.farm_id = fb.farm_id
        and s.is_active = true
        and fb.date_of_delivery >= coalesce(s.commissioned_at, date '0001-01-01')
    )
    or exists (
      select 1
      from public.fish_stocking fs
      join public.system s on s.id = fs.system_id
      where fs.batch_id = fb.id
        and s.farm_id = fb.farm_id
        and s.is_active = true
        and fs.date >= coalesce(s.commissioned_at, date '0001-01-01')
    )
    or exists (
      select 1
      from public.fish_transfer ft
      join public.system s on s.id = ft.target_system_id
      where ft.batch_id = fb.id
        and s.farm_id = fb.farm_id
        and s.is_active = true
        and ft.date >= coalesce(s.commissioned_at, date '0001-01-01')
    )
  )
order by fb.date_of_delivery desc nulls last;
$$;


ALTER FUNCTION "public"."api_fingerling_batch_options_rpc"("p_farm_id" "uuid", "p_active_only" boolean) OWNER TO "postgres";

--
-- Name: FUNCTION "api_fingerling_batch_options_rpc"("p_farm_id" "uuid", "p_active_only" boolean); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION "public"."api_fingerling_batch_options_rpc"("p_farm_id" "uuid", "p_active_only" boolean) IS 'L3. Component: Batch Selector Dropdown. Reads: L0 lookup (fingerling_batch table). Biology source: none. Delete if: batch selector dropdown removed. Last reviewed: 2026-06. Owner: @aquasmart-backend';


--
-- Name: api_kpi_coverage("uuid", "date", "date"); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."api_kpi_coverage"("p_farm_id" "uuid", "p_date_from" "date" DEFAULT NULL::"date", "p_date_to" "date" DEFAULT NULL::"date") RETURNS TABLE("kpi_key" "text", "covered" integer, "total" integer, "label" "text", "source" "text", "basis" "text")
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public', 'analytics'
    AS $$
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
$$;


ALTER FUNCTION "public"."api_kpi_coverage"("p_farm_id" "uuid", "p_date_from" "date", "p_date_to" "date") OWNER TO "postgres";

--
-- Name: FUNCTION "api_kpi_coverage"("p_farm_id" "uuid", "p_date_from" "date", "p_date_to" "date"); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION "public"."api_kpi_coverage"("p_farm_id" "uuid", "p_date_from" "date", "p_date_to" "date") IS 'L3. Component: KPI Coverage Indicator. Reads: L1 flags (has_abw, has_inventory_count, has_feed_record). Biology source: none (refactored 2026-06 — L0 count removed). Delete if: KPICoverage indicator removed. Last reviewed: 2026-06. Owner: @aquasmart-backend';


--
-- Name: api_latest_water_quality_status("uuid", bigint); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."api_latest_water_quality_status"("p_farm_id" "uuid", "p_system_id" bigint DEFAULT NULL::bigint) RETURNS TABLE("system_id" bigint, "system_name" "text", "rating_date" "date", "rating" "text", "rating_numeric" integer, "worst_parameter" "text", "worst_parameter_value" double precision, "worst_parameter_unit" "text")
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."api_latest_water_quality_status"("p_farm_id" "uuid", "p_system_id" bigint) OWNER TO "postgres";

--
-- Name: FUNCTION "api_latest_water_quality_status"("p_farm_id" "uuid", "p_system_id" bigint); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION "public"."api_latest_water_quality_status"("p_farm_id" "uuid", "p_system_id" bigint) IS 'L3. Component: WQ Status Badge. Reads: L1-WQ (daily_water_quality_rating). Biology source: none (refactored 2026-06 — L0 join removed). Delete if: WQStatusBadge removed. Last reviewed: 2026-06. Owner: @aquasmart-backend';


--
-- Name: api_production_summary("uuid", bigint, "public"."system_growth_stage", "date", "date"); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."api_production_summary"("p_farm_id" "uuid", "p_system_id" bigint DEFAULT NULL::bigint, "p_stage" "public"."system_growth_stage" DEFAULT NULL::"public"."system_growth_stage", "p_start_date" "date" DEFAULT NULL::"date", "p_end_date" "date" DEFAULT NULL::"date") RETURNS TABLE("cycle_id" bigint, "system_id" bigint, "system_name" "text", "growth_stage" "text", "ongoing_cycle" boolean, "cycle_start" "date", "cycle_end" "date", "target_weight_g" double precision, "date" "date", "activity" "text", "days_in_period" integer, "fish_count_period_start" double precision, "number_of_fish_inventory" double precision, "average_body_weight" double precision, "total_biomass" double precision, "biomass_density" double precision, "mortality_count_period" double precision, "total_feed_amount_period" double precision, "number_of_fish_transfer_in" double precision, "number_of_fish_transfer_out" double precision, "number_of_fish_harvested" double precision, "total_weight_harvested" double precision, "biomass_increase_period" double precision, "feeding_rate_on_date" double precision, "efcr_period" double precision, "sgr" double precision, "agr" double precision, "survival_rate_pct" double precision, "total_feed_amount_aggregated" double precision, "cumulative_mortality" double precision, "biomass_increase_aggregated" double precision, "number_of_fish_transfer_in_aggregated" double precision, "number_of_fish_transfer_out_aggregated" double precision, "number_of_fish_harvested_aggregated" double precision, "total_weight_harvested_aggregated" double precision, "efcr_aggregated" double precision)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public', 'analytics', 'private'
    AS $$
select
  ps.cycle_id,
  ps.system_id,
  s.name                                              as system_name,
  s.growth_stage::text                                as growth_stage,
  pc.ongoing_cycle,
  pc.cycle_start::date,
  pc.cycle_end::date,
  pc.target_weight_g::double precision,
  ps.date,
  ps.activity,
  ps.days_in_period::integer,
  ps.number_of_fish_start::double precision           as fish_count_period_start,
  ps.number_of_fish_end::double precision             as number_of_fish_inventory,
  ps.average_body_weight::double precision,
  ps.total_weight_kg::double precision                as total_biomass,
  dsf.biomass_density::double precision,
  ps.mortality_over_period::double precision          as mortality_count_period,
  ps.feed_over_period::double precision               as total_feed_amount_period,
  ps.transfers_in_over_period::double precision       as number_of_fish_transfer_in,
  ps.transfers_out_over_period::double precision      as number_of_fish_transfer_out,
  ps.harvest_fish_over_period::double precision       as number_of_fish_harvested,
  ps.harvest_weight_kg_over_period::double precision  as total_weight_harvested,
  ps.biomass_increase_over_period::double precision   as biomass_increase_period,
  dsf.feeding_rate::double precision                  as feeding_rate_on_date,
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
  end                                                 as survival_rate_pct,
  ps.feed_aggregated::double precision                as total_feed_amount_aggregated,
  ps.cumulative_mortality::double precision,
  ps.cumulative_biomass::double precision             as biomass_increase_aggregated,
  ps.transfers_in_aggregated::double precision        as number_of_fish_transfer_in_aggregated,
  ps.transfers_out_aggregated::double precision       as number_of_fish_transfer_out_aggregated,
  ps.harvest_fish_aggregated::double precision        as number_of_fish_harvested_aggregated,
  ps.harvest_weight_kg_aggregated::double precision   as total_weight_harvested_aggregated,
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
$$;


ALTER FUNCTION "public"."api_production_summary"("p_farm_id" "uuid", "p_system_id" bigint, "p_stage" "public"."system_growth_stage", "p_start_date" "date", "p_end_date" "date") OWNER TO "postgres";

--
-- Name: api_production_trend("uuid", bigint[], "date", "date"); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."api_production_trend"("p_farm_id" "uuid", "p_system_ids" bigint[] DEFAULT NULL::bigint[], "p_start_date" "date" DEFAULT NULL::"date", "p_end_date" "date" DEFAULT NULL::"date") RETURNS TABLE("trend_date" "date", "avg_abw_g" double precision, "total_biomass_kg" double precision, "total_feed_kg" double precision, "total_fish_count" double precision, "total_mortality_period" double precision, "system_count" bigint)
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public', 'analytics', 'private'
    AS $$
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
$$;


ALTER FUNCTION "public"."api_production_trend"("p_farm_id" "uuid", "p_system_ids" bigint[], "p_start_date" "date", "p_end_date" "date") OWNER TO "postgres";

--
-- Name: FUNCTION "api_production_trend"("p_farm_id" "uuid", "p_system_ids" bigint[], "p_start_date" "date", "p_end_date" "date"); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION "public"."api_production_trend"("p_farm_id" "uuid", "p_system_ids" bigint[], "p_start_date" "date", "p_end_date" "date") IS 'L3. Component: Farm Production Trend Chart. Reads: L1 (daily_system_facts). Biology source: none (aggregates L1 date rows). Delete if: ProductionTrendChart removed. Last reviewed: 2026-06. Owner: @aquasmart-backend';


--
-- Name: api_recent_activity_feed("uuid", integer, "text", "date", "date", "text"); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."api_recent_activity_feed"("p_farm_id" "uuid", "p_limit" integer DEFAULT 50, "p_mode" "text" DEFAULT 'flat'::"text", "p_date_from" "date" DEFAULT NULL::"date", "p_date_to" "date" DEFAULT NULL::"date", "p_table" "text" DEFAULT NULL::"text") RETURNS TABLE("id" bigint, "table_name" "text", "activity_date" "date", "system_id" bigint, "batch_id" bigint, "notes" "text")
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."api_recent_activity_feed"("p_farm_id" "uuid", "p_limit" integer, "p_mode" "text", "p_date_from" "date", "p_date_to" "date", "p_table" "text") OWNER TO "postgres";

--
-- Name: FUNCTION "api_recent_activity_feed"("p_farm_id" "uuid", "p_limit" integer, "p_mode" "text", "p_date_from" "date", "p_date_to" "date", "p_table" "text"); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION "public"."api_recent_activity_feed"("p_farm_id" "uuid", "p_limit" integer, "p_mode" "text", "p_date_from" "date", "p_date_to" "date", "p_table" "text") IS 'L3. Component: Activity Timeline. Reads: L0 direct (7 activity tables — raw event display only, not biological computation). Biology source: none. Delete if: ActivityFeed component removed. Last reviewed: 2026-06. Owner: @aquasmart-backend';


--
-- Name: api_recommended_actions("uuid", bigint); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."api_recommended_actions"("p_farm_id" "uuid", "p_system_id" bigint DEFAULT NULL::bigint) RETURNS TABLE("system_id" bigint, "system_name" "text", "metric_name" "text", "current_value" numeric, "threshold_low" numeric, "threshold_high" numeric, "unit" "text", "severity" "text", "context_json" "jsonb")
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."api_recommended_actions"("p_farm_id" "uuid", "p_system_id" bigint) OWNER TO "postgres";

--
-- Name: FUNCTION "api_recommended_actions"("p_farm_id" "uuid", "p_system_id" bigint); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION "public"."api_recommended_actions"("p_farm_id" "uuid", "p_system_id" bigint) IS 'L3. Component: Recommended Actions Panel. Reads: L1-WQ (daily_water_quality_rating). Biology source: none. Delete if: RecommendedActions component removed. Last reviewed: 2026-06. Owner: @aquasmart-backend';


--
-- Name: api_system_feed_status("uuid", bigint[], "date", "date"); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."api_system_feed_status"("p_farm_id" "uuid", "p_system_ids" bigint[] DEFAULT NULL::bigint[], "p_start_date" "date" DEFAULT NULL::"date", "p_end_date" "date" DEFAULT NULL::"date") RETURNS TABLE("system_id" bigint, "system_name" "text", "date" "date", "biomass_kg" numeric, "planned_feed_kg" numeric, "actual_feed_kg" numeric, "deviation_pct" numeric, "feeding_rate_pct" numeric, "efcr_period" numeric, "status" "text")
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public', 'analytics', 'private'
    AS $$
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
$$;


ALTER FUNCTION "public"."api_system_feed_status"("p_farm_id" "uuid", "p_system_ids" bigint[], "p_start_date" "date", "p_end_date" "date") OWNER TO "postgres";

--
-- Name: api_system_options_rpc("uuid", "public"."system_growth_stage", boolean); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."api_system_options_rpc"("p_farm_id" "uuid" DEFAULT NULL::"uuid", "p_stage" "public"."system_growth_stage" DEFAULT NULL::"public"."system_growth_stage", "p_active_only" boolean DEFAULT true) RETURNS TABLE("id" bigint, "farm_id" "uuid", "farm_name" "text", "label" "text", "name" "text", "unit" "text", "type" "text", "growth_stage" "public"."system_growth_stage", "is_active" boolean)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public', 'private'
    AS $$
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
          then trim(s.unit) || ' - ' || trim(s.name)
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
    and (not coalesce(p_active_only, true) or s.is_active = true)
  order by s.is_active desc, s.commissioned_at desc nulls last, s.id desc;
$$;


ALTER FUNCTION "public"."api_system_options_rpc"("p_farm_id" "uuid", "p_stage" "public"."system_growth_stage", "p_active_only" boolean) OWNER TO "postgres";

--
-- Name: FUNCTION "api_system_options_rpc"("p_farm_id" "uuid", "p_stage" "public"."system_growth_stage", "p_active_only" boolean); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION "public"."api_system_options_rpc"("p_farm_id" "uuid", "p_stage" "public"."system_growth_stage", "p_active_only" boolean) IS 'L3. Component: System Selector Dropdown. Reads: L0 lookup (system table metadata only). Biology source: none. Delete if: system selector dropdown removed. Last reviewed: 2026-06. Owner: @aquasmart-backend';


--
-- Name: api_system_timeline_bounds("uuid", bigint); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."api_system_timeline_bounds"("p_farm_id" "uuid", "p_system_id" bigint DEFAULT NULL::bigint) RETURNS TABLE("system_id" bigint, "resolved_start" "date", "resolved_end" "date", "resolved_ongoing" boolean, "snapshot_as_of" "date", "first_stocking_date" "date", "final_harvest_date" "date", "first_activity_date" "date", "last_activity_date" "date", "configured_cycle_start" "date", "configured_cycle_end" "date", "period_source" "text")
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
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
    select distinct on (pc.system_id)
      pc.system_id,
      pc.cycle_start as configured_cycle_start,
      pc.cycle_end as configured_cycle_end
    from public.production_cycle pc
    join sys on sys.system_id = pc.system_id
    order by pc.system_id, pc.ongoing_cycle desc, pc.cycle_start desc, pc.cycle_id desc
  ),
  activity_bounds as (
    select
      sub.system_id,
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
$$;


ALTER FUNCTION "public"."api_system_timeline_bounds"("p_farm_id" "uuid", "p_system_id" bigint) OWNER TO "postgres";

--
-- Name: FUNCTION "api_system_timeline_bounds"("p_farm_id" "uuid", "p_system_id" bigint); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION "public"."api_system_timeline_bounds"("p_farm_id" "uuid", "p_system_id" bigint) IS 'L3. Component: Date Range Picker. Reads: L0 metadata (stocking/harvest dates only — not biological computation). Delete if: timeline date picker removed. Last reviewed: 2026-06. Owner: @aquasmart-backend';


--
-- Name: api_time_period_bounds_scoped("uuid", "text", "text", "date", bigint, bigint); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."api_time_period_bounds_scoped"("p_farm_id" "uuid", "p_time_period" "text", "p_scope" "text" DEFAULT 'dashboard'::"text", "p_anchor_date" "date" DEFAULT NULL::"date", "p_system_id" bigint DEFAULT NULL::bigint, "p_batch_id" bigint DEFAULT NULL::bigint) RETURNS TABLE("time_period" "text", "input_start_date" "date", "input_end_date" "date", "anchor_scope" "text", "latest_available_date" "date", "available_from_date" "date", "requested_days" integer, "available_days" integer, "resolved_days" integer, "staleness_days" integer, "is_truncated" boolean)
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."api_time_period_bounds_scoped"("p_farm_id" "uuid", "p_time_period" "text", "p_scope" "text", "p_anchor_date" "date", "p_system_id" bigint, "p_batch_id" bigint) OWNER TO "postgres";

--
-- Name: FUNCTION "api_time_period_bounds_scoped"("p_farm_id" "uuid", "p_time_period" "text", "p_scope" "text", "p_anchor_date" "date", "p_system_id" bigint, "p_batch_id" bigint); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION "public"."api_time_period_bounds_scoped"("p_farm_id" "uuid", "p_time_period" "text", "p_scope" "text", "p_anchor_date" "date", "p_system_id" bigint, "p_batch_id" bigint) IS 'L3. Component: Filter Date Picker. Reads: L1 + L0 metadata. Biology source: none (resolves named periods to concrete dates). Delete if: period filter removed. Last reviewed: 2026-06. Owner: @aquasmart-backend';


--
-- Name: api_water_quality_trend("uuid", bigint, "date", "date"); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."api_water_quality_trend"("p_farm_id" "uuid", "p_system_id" bigint DEFAULT NULL::bigint, "p_start_date" "date" DEFAULT NULL::"date", "p_end_date" "date" DEFAULT NULL::"date") RETURNS TABLE("wq_date" "date", "system_id" bigint, "system_name" "text", "temp_avg" double precision, "temp_min" double precision, "temp_max" double precision, "do_avg" double precision, "do_min" double precision, "do_max" double precision, "do_variation" double precision, "ph_avg" double precision, "rating" "text", "rating_numeric" integer, "rating_7d_rolling" double precision)
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public', 'private'
    AS $$
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
$$;


ALTER FUNCTION "public"."api_water_quality_trend"("p_farm_id" "uuid", "p_system_id" bigint, "p_start_date" "date", "p_end_date" "date") OWNER TO "postgres";

--
-- Name: FUNCTION "api_water_quality_trend"("p_farm_id" "uuid", "p_system_id" bigint, "p_start_date" "date", "p_end_date" "date"); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION "public"."api_water_quality_trend"("p_farm_id" "uuid", "p_system_id" bigint, "p_start_date" "date", "p_end_date" "date") IS 'L3. Component: Water Quality Trend Chart. Reads: L1-WQ (daily_water_quality_rating). Biology source: none. Delete if: WQTrendChart removed. Last reviewed: 2026-06. Owner: @aquasmart-backend';


--
-- Name: assign_operation_lineage_from_system(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."assign_operation_lineage_from_system"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
declare
  lineage record;
begin
  if new.cycle_id is null or new.batch_id is null then
    select *
      into lineage
    from public.resolve_cycle_batch_for_system_date(new.system_id, new.date);

    if lineage.cycle_id is null or lineage.batch_id is null then
      raise exception 'No stocked or transferred fish batch could be resolved for system % on %', new.system_id, new.date;
    end if;

    new.cycle_id := coalesce(new.cycle_id, lineage.cycle_id);
    new.batch_id := coalesce(new.batch_id, lineage.batch_id);
  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."assign_operation_lineage_from_system"() OWNER TO "postgres";

--
-- Name: assign_transfer_lineage_from_origin(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."assign_transfer_lineage_from_origin"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
declare
  lineage record;
begin
  if new.cycle_id is null or new.batch_id is null then
    if new.origin_system_id is null then
      raise exception 'origin_system_id is required to resolve transfer batch lineage';
    end if;

    select *
      into lineage
    from public.resolve_cycle_batch_for_system_date(new.origin_system_id, new.date);

    if lineage.cycle_id is null or lineage.batch_id is null then
      raise exception 'No stocked or transferred fish batch could be resolved for transfer origin system % on %', new.origin_system_id, new.date;
    end if;

    new.cycle_id := coalesce(new.cycle_id, lineage.cycle_id);
    new.batch_id := coalesce(new.batch_id, lineage.batch_id);
  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."assign_transfer_lineage_from_origin"() OWNER TO "postgres";

--
-- Name: claim_my_farm_user_invitations(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."claim_my_farm_user_invitations"() RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public', 'private'
    AS $$
declare
  v_email text := lower(trim(coalesce(auth.email(), '')));
begin
  if auth.uid() is null or v_email = '' then
    return 0;
  end if;

  return private.apply_pending_farm_user_invitations(auth.uid(), v_email);
end;
$$;


ALTER FUNCTION "public"."claim_my_farm_user_invitations"() OWNER TO "postgres";

--
-- Name: classify_growth_phase(numeric, "text"); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."classify_growth_phase"("p_abw_g" numeric, "p_scenario" "text" DEFAULT 'main'::"text") RETURNS TABLE("phase_id" integer, "scenario" "text", "abw_min_g" numeric, "abw_max_g" numeric, "sgr_pct_per_day" numeric)
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."classify_growth_phase"("p_abw_g" numeric, "p_scenario" "text") OWNER TO "postgres";

--
-- Name: FUNCTION "classify_growth_phase"("p_abw_g" numeric, "p_scenario" "text"); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION "public"."classify_growth_phase"("p_abw_g" numeric, "p_scenario" "text") IS 'Returns the authoritative biology phase for a given ABW and scenario. Boundary overlaps resolve to the higher phase.';


--
-- Name: classify_growth_stage_tanganicae(numeric); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."classify_growth_stage_tanganicae"("p_abw_g" numeric) RETURNS "text"
    LANGUAGE "sql" IMMUTABLE
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
  select case
    when p_abw_g is null then null
    when p_abw_g < 20.0 then 'fingerling'
    when p_abw_g < 80.0 then 'juvenile'
    when p_abw_g < 250.0 then 'sub_adult'
    else 'broodstock'
  end;
$$;


ALTER FUNCTION "public"."classify_growth_stage_tanganicae"("p_abw_g" numeric) OWNER TO "postgres";

--
-- Name: classify_water_quality_measurement(double precision, "jsonb", "jsonb", "jsonb", "jsonb"); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."classify_water_quality_measurement"("p_parameter_value" double precision, "p_optimal" "jsonb", "p_acceptable" "jsonb", "p_critical" "jsonb", "p_lethal" "jsonb") RETURNS TABLE("measurement_rating" "public"."water_quality_rating", "severity_rank" integer, "distance_from_next_better_band" double precision)
    LANGUAGE "plpgsql" IMMUTABLE
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."classify_water_quality_measurement"("p_parameter_value" double precision, "p_optimal" "jsonb", "p_acceptable" "jsonb", "p_critical" "jsonb", "p_lethal" "jsonb") OWNER TO "postgres";

--
-- Name: close_cycle_on_final_harvest(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."close_cycle_on_final_harvest"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
declare
  resolved_cycle_id int;
begin
  if new.type_of_harvest <> 'final'::public.type_of_harvest then
    return null;
  end if;

  resolved_cycle_id := new.cycle_id;

  if resolved_cycle_id is null then
    select pc.cycle_id
      into resolved_cycle_id
    from public.production_cycle pc
    where pc.system_id = new.system_id
      and pc.cycle_end is null
      and pc.cycle_start <= new.date
    order by pc.cycle_start desc, pc.cycle_id desc
    limit 1;
  end if;

  if resolved_cycle_id is null then
    raise exception 'Final harvest on % for system % but no production cycle exists.', new.date, new.system_id;
  end if;

  update public.production_cycle pc
  set cycle_end = new.date,
      ongoing_cycle = false
  where pc.cycle_id = resolved_cycle_id
    and (pc.cycle_end is null or pc.cycle_end >= new.date);

  return null;
end;
$$;


ALTER FUNCTION "public"."close_cycle_on_final_harvest"() OWNER TO "postgres";

--
-- Name: create_farm_user_invitation("uuid", "text", "text"); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."create_farm_user_invitation"("p_farm_id" "uuid", "p_email" "text", "p_role" "text" DEFAULT 'viewer'::"text") RETURNS SETOF "public"."farm_user_invitation_rpc_result"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public', 'private'
    AS $$
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
$$;


ALTER FUNCTION "public"."create_farm_user_invitation"("p_farm_id" "uuid", "p_email" "text", "p_role" "text") OWNER TO "postgres";

--
-- Name: ensure_cycle_on_stocking(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."ensure_cycle_on_stocking"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
declare
  resolved_cycle_id int;
begin
  if new.batch_id is null then
    raise exception 'fish_stocking.batch_id is required to start a production cycle';
  end if;

  resolved_cycle_id := new.cycle_id;

  if resolved_cycle_id is null then
    select pc.cycle_id
      into resolved_cycle_id
    from public.production_cycle pc
    where pc.system_id = new.system_id
      and pc.batch_id = new.batch_id
      and new.date >= pc.cycle_start
      and new.date <= coalesce(pc.cycle_end, 'infinity'::date)
    order by
      case when pc.cycle_end is null then 0 else 1 end,
      pc.cycle_start desc,
      pc.cycle_id desc
    limit 1;
  end if;

  if resolved_cycle_id is null then
    insert into public.production_cycle(system_id, batch_id, cycle_start, cycle_end, ongoing_cycle)
    values (new.system_id, new.batch_id, new.date, null, true)
    returning cycle_id into resolved_cycle_id;
  end if;

  update public.production_cycle pc
  set batch_id = new.batch_id,
      cycle_start = least(pc.cycle_start, new.date),
      ongoing_cycle = (pc.cycle_end is null)
  where pc.cycle_id = resolved_cycle_id
    and (
      pc.batch_id is distinct from new.batch_id
      or pc.cycle_start > new.date
      or pc.ongoing_cycle is distinct from (pc.cycle_end is null)
    );

  new.cycle_id := resolved_cycle_id;
  return new;
end;
$$;


ALTER FUNCTION "public"."ensure_cycle_on_stocking"() OWNER TO "postgres";

--
-- Name: feed_inventory_snapshot_kg(integer, integer, integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."feed_inventory_snapshot_kg"("p_bag_weight" integer, "p_amount_of_bags" integer, "p_opened_bags" integer) RETURNS numeric
    LANGUAGE "sql" IMMUTABLE
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
  select greatest(
    coalesce(p_bag_weight, 0)::numeric * coalesce(p_amount_of_bags, 0)::numeric
      + coalesce(p_opened_bags, 0)::numeric / 1000.0,
    0::numeric
  );
$$;


ALTER FUNCTION "public"."feed_inventory_snapshot_kg"("p_bag_weight" integer, "p_amount_of_bags" integer, "p_opened_bags" integer) OWNER TO "postgres";

--
-- Name: feed_inventory_snapshot_kg(numeric, numeric, numeric); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."feed_inventory_snapshot_kg"("p_bag_weight" numeric, "p_amount_of_bags" numeric, "p_opened_bags" numeric) RETURNS numeric
    LANGUAGE "sql" IMMUTABLE
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
  select greatest(
    coalesce(p_bag_weight, 0)::numeric * coalesce(p_amount_of_bags, 0)::numeric
      + coalesce(p_opened_bags, 0)::numeric / 1000.0,
    0::numeric
  );
$$;


ALTER FUNCTION "public"."feed_inventory_snapshot_kg"("p_bag_weight" numeric, "p_amount_of_bags" numeric, "p_opened_bags" numeric) OWNER TO "postgres";

--
-- Name: get_running_stock("uuid"); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."get_running_stock"("p_farm_id" "uuid") RETURNS TABLE("feed_type_id" bigint, "feed_type_name" "text", "pellet_size" "text", "current_stock_kg" numeric, "avg_daily_usage_kg" numeric, "days_remaining" numeric, "stock_status" "text", "last_delivery_date" "date")
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public', 'private'
    AS $$
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
$$;


ALTER FUNCTION "public"."get_running_stock"("p_farm_id" "uuid") OWNER TO "postgres";

--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public', 'private'
    AS $$
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
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";

--
-- Name: mark_farm_user_invitation_sent("uuid"); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."mark_farm_user_invitation_sent"("p_invitation_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public', 'private'
    AS $$
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
$$;


ALTER FUNCTION "public"."mark_farm_user_invitation_sent"("p_invitation_id" "uuid") OWNER TO "postgres";

--
-- Name: prevent_manual_wqr_changes(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."prevent_manual_wqr_changes"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
BEGIN
  -- Allow writes only when the system explicitly unlocks this table
  IF current_setting('app.allow_wqr_write', true) = 'true' THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'daily_water_quality_rating is managed by the system only. '
    'Direct INSERT/UPDATE/DELETE is not permitted.';
END;
$$;


ALTER FUNCTION "public"."prevent_manual_wqr_changes"() OWNER TO "postgres";

--
-- Name: prevent_system_name_update(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."prevent_system_name_update"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."prevent_system_name_update"() OWNER TO "postgres";

--
-- Name: process_inventory_queue(integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."process_inventory_queue"("p_limit" integer DEFAULT 50) RETURNS TABLE("processed_system_id" bigint, "processed_to_date" "date", "upserted_days" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public', 'analytics'
    AS $$
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
$$;


ALTER FUNCTION "public"."process_inventory_queue"("p_limit" integer) OWNER TO "postgres";

--
-- Name: production_cycle_set_ongoing(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."production_cycle_set_ongoing"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
begin
  new.ongoing_cycle := (new.cycle_end is null);
  return new;
end;
$$;


ALTER FUNCTION "public"."production_cycle_set_ongoing"() OWNER TO "postgres";

--
-- Name: provision_default_farm_membership(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."provision_default_farm_membership"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public', 'private'
    AS $$
begin
  perform private.apply_pending_farm_user_invitations(new.id, new.email);
  return new;
end;
$$;


ALTER FUNCTION "public"."provision_default_farm_membership"() OWNER TO "postgres";

--
-- Name: refresh_after_system_if_needed(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."refresh_after_system_if_needed"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."refresh_after_system_if_needed"() OWNER TO "postgres";

--
-- Name: refresh_daily_water_quality_rating(bigint, "date", "date"); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."refresh_daily_water_quality_rating"("p_system_id" bigint DEFAULT NULL::bigint, "p_from" "date" DEFAULT NULL::"date", "p_to" "date" DEFAULT NULL::"date") RETURNS "void"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."refresh_daily_water_quality_rating"("p_system_id" bigint, "p_from" "date", "p_to" "date") OWNER TO "postgres";

--
-- Name: refresh_feeding_model_after_config_change(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."refresh_feeding_model_after_config_change"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public', 'analytics'
    AS $$
begin
  perform public.refresh_feeding_model_output();
  return null;
end;
$$;


ALTER FUNCTION "public"."refresh_feeding_model_after_config_change"() OWNER TO "postgres";

--
-- Name: refresh_feeding_model_output(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."refresh_feeding_model_output"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public', 'analytics'
    AS $$
begin
  refresh materialized view analytics.feeding_model_output;
end;
$$;


ALTER FUNCTION "public"."refresh_feeding_model_output"() OWNER TO "postgres";

--
-- Name: resolve_abw_g(double precision, double precision); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."resolve_abw_g"("p_total_weight_kg" double precision, "p_fish_count" double precision) RETURNS double precision
    LANGUAGE "sql" IMMUTABLE
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
  SELECT CASE
    WHEN p_total_weight_kg IS NOT NULL
     AND p_total_weight_kg > 0
     AND p_fish_count IS NOT NULL
     AND p_fish_count > 0
    THEN (p_total_weight_kg * 1000.0) / p_fish_count
    ELSE NULL::double precision
  END;
$$;


ALTER FUNCTION "public"."resolve_abw_g"("p_total_weight_kg" double precision, "p_fish_count" double precision) OWNER TO "postgres";

--
-- Name: resolve_cycle_batch_for_system_date(bigint, "date"); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."resolve_cycle_batch_for_system_date"("p_system_id" bigint, "p_date" "date") RETURNS TABLE("cycle_id" integer, "batch_id" bigint)
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
  select candidate.cycle_id, candidate.batch_id
  from (
    select
      pc.cycle_id,
      pc.batch_id,
      20 as priority,
      pc.cycle_start as event_date,
      pc.cycle_id::bigint as event_id
    from public.production_cycle pc
    where pc.system_id = p_system_id
      and p_date >= pc.cycle_start
      and p_date <= coalesce(pc.cycle_end, 'infinity'::date)

    union all

    select
      ft.cycle_id,
      ft.batch_id,
      10 as priority,
      ft.date as event_date,
      ft.id::bigint as event_id
    from public.fish_transfer ft
    where ft.target_system_id = p_system_id
      and ft.date <= p_date
      and ft.cycle_id is not null
      and ft.batch_id is not null
      and not exists (
        select 1
        from public.fish_transfer moved_out
        where moved_out.origin_system_id = p_system_id
          and moved_out.cycle_id = ft.cycle_id
          and moved_out.date > ft.date
          and moved_out.date <= p_date
      )
  ) as candidate
  order by candidate.event_date desc, candidate.priority asc, candidate.event_id desc
  limit 1;
$$;


ALTER FUNCTION "public"."resolve_cycle_batch_for_system_date"("p_system_id" bigint, "p_date" "date") OWNER TO "postgres";

--
-- Name: resolve_feeding_rate_config(integer, "date", "text"); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."resolve_feeding_rate_config"("p_phase_id" integer, "p_as_of" "date" DEFAULT CURRENT_DATE, "p_scenario" "text" DEFAULT 'main'::"text") RETURNS TABLE("config_id" bigint, "version" "text", "scenario" "text", "phase_id" integer, "abw_min_g" numeric, "abw_max_g" numeric, "feed_rate_min_pct" numeric, "feed_rate_max_pct" numeric, "feed_rate_mid_pct" numeric, "valid_from" "date", "valid_to" "date")
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."resolve_feeding_rate_config"("p_phase_id" integer, "p_as_of" "date", "p_scenario" "text") OWNER TO "postgres";

--
-- Name: FUNCTION "resolve_feeding_rate_config"("p_phase_id" integer, "p_as_of" "date", "p_scenario" "text"); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION "public"."resolve_feeding_rate_config"("p_phase_id" integer, "p_as_of" "date", "p_scenario" "text") IS 'Resolves the active default feeding-rate band and midpoint for a phase, scenario, and date.';


--
-- Name: resolve_sampling_abw_g(double precision, double precision, numeric); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."resolve_sampling_abw_g"("p_abw" double precision, "p_total_weight_sampling" double precision, "p_number_of_fish_sampling" numeric) RETURNS numeric
    LANGUAGE "sql" IMMUTABLE
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
  select public.resolve_sampling_abw_g(
    p_abw::numeric,
    p_total_weight_sampling::numeric,
    p_number_of_fish_sampling
  )
$$;


ALTER FUNCTION "public"."resolve_sampling_abw_g"("p_abw" double precision, "p_total_weight_sampling" double precision, "p_number_of_fish_sampling" numeric) OWNER TO "postgres";

--
-- Name: resolve_sampling_abw_g(numeric, numeric, numeric); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."resolve_sampling_abw_g"("p_abw" numeric, "p_total_weight_sampling" numeric, "p_number_of_fish_sampling" numeric) RETURNS numeric
    LANGUAGE "sql" IMMUTABLE
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."resolve_sampling_abw_g"("p_abw" numeric, "p_total_weight_sampling" numeric, "p_number_of_fish_sampling" numeric) OWNER TO "postgres";

--
-- Name: revoke_farm_user_invitation("uuid"); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."revoke_farm_user_invitation"("p_invitation_id" "uuid") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public', 'private'
    AS $$
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
$$;


ALTER FUNCTION "public"."revoke_farm_user_invitation"("p_invitation_id" "uuid") OWNER TO "postgres";

--
-- Name: set_harvest_abw(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."set_harvest_abw"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
BEGIN
  IF NEW.abw IS NULL THEN
    NEW.abw := public.resolve_abw_g(NEW.total_weight_harvest, NEW.number_of_fish_harvest::double precision);
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_harvest_abw"() OWNER TO "postgres";

--
-- Name: set_sampling_weight_abw(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."set_sampling_weight_abw"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."set_sampling_weight_abw"() OWNER TO "postgres";

--
-- Name: FUNCTION "set_sampling_weight_abw"(); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION "public"."set_sampling_weight_abw"() IS 'Trigger: fish_sampling_weight BEFORE INSERT OR UPDATE. Validates weight and count > 0. Delegates ABW computation to shared public.resolve_abw_g(). Updated 2026-06 to use shared resolver.';


--
-- Name: set_stocking_abw(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."set_stocking_abw"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."set_stocking_abw"() OWNER TO "postgres";

--
-- Name: FUNCTION "set_stocking_abw"(); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION "public"."set_stocking_abw"() IS 'Computes fish_stocking.abw from total_weight_stocking and number_of_fish_stocking so clients do not provide derived ABW.';


--
-- Name: sync_water_quality_measured_at_parts(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."sync_water_quality_measured_at_parts"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."sync_water_quality_measured_at_parts"() OWNER TO "postgres";

--
-- Name: touch_affected_systems_updated_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."touch_affected_systems_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
begin
  new.updated_at := now();
  return new;
end;
$$;


ALTER FUNCTION "public"."touch_affected_systems_updated_at"() OWNER TO "postgres";

--
-- Name: transfer_impacts_efcr("public"."transfer_type", bigint, bigint); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."transfer_impacts_efcr"("p_transfer_type" "public"."transfer_type", "p_origin_system_id" bigint, "p_target_system_id" bigint) RETURNS boolean
    LANGUAGE "sql" IMMUTABLE
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
  select case
    when coalesce(
      p_transfer_type::text,
      case when p_origin_system_id = p_target_system_id then 'count_check' else 'transfer' end
    ) in ('transfer', 'grading', 'density_thinning', 'external_out') then true
    else false
  end;
$$;


ALTER FUNCTION "public"."transfer_impacts_efcr"("p_transfer_type" "public"."transfer_type", "p_origin_system_id" bigint, "p_target_system_id" bigint) OWNER TO "postgres";

--
-- Name: transfer_weight_kg(double precision, double precision, double precision); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."transfer_weight_kg"("p_total_weight_transfer" double precision, "p_number_of_fish_transfer" double precision, "p_abw" double precision) RETURNS double precision
    LANGUAGE "sql" IMMUTABLE
    SET "search_path" TO 'pg_catalog', 'public', 'pg_temp'
    AS $$
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
$$;


ALTER FUNCTION "public"."transfer_weight_kg"("p_total_weight_transfer" double precision, "p_number_of_fish_transfer" double precision, "p_abw" double precision) OWNER TO "postgres";

--
-- Name: trg_compute_abw_transfer(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."trg_compute_abw_transfer"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
BEGIN
  IF NEW.abw IS NULL THEN
    NEW.abw := public.resolve_abw_g(NEW.total_weight_transfer, NEW.number_of_fish_transfer::double precision);
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."trg_compute_abw_transfer"() OWNER TO "postgres";

--
-- Name: trg_refresh_daily_water_quality_rating(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."trg_refresh_daily_water_quality_rating"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."trg_refresh_daily_water_quality_rating"() OWNER TO "postgres";

--
-- Name: trg_refresh_daily_water_quality_rating_from_framework(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."trg_refresh_daily_water_quality_rating_from_framework"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$ declare v_parameter public.water_quality_parameters; v_min_date date; v_max_date date; begin v_parameter := coalesce(new.parameter_name, old.parameter_name); select min(wqm.date), max(wqm.date) into v_min_date, v_max_date from public.water_quality_measurement wqm where wqm.parameter_name = v_parameter; if v_min_date is not null then perform public.refresh_daily_water_quality_rating(null, v_min_date, v_max_date); end if; return null; end; $$;


ALTER FUNCTION "public"."trg_refresh_daily_water_quality_rating_from_framework"() OWNER TO "postgres";

--
-- Name: trg_update_system_growth_stage(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."trg_update_system_growth_stage"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."trg_update_system_growth_stage"() OWNER TO "postgres";

--
-- Name: apply_rls("jsonb", integer); Type: FUNCTION; Schema: realtime; Owner: supabase_admin
--

CREATE FUNCTION "realtime"."apply_rls"("wal" "jsonb", "max_record_bytes" integer DEFAULT (1024 * 1024)) RETURNS SETOF "realtime"."wal_rls"
    LANGUAGE "plpgsql"
    AS $$
declare
    -- Regclass of the table e.g. public.notes
    entity_ regclass = (quote_ident(wal ->> 'schema') || '.' || quote_ident(wal ->> 'table'))::regclass;

    -- I, U, D, T: insert, update ...
    action realtime.action = (
        case wal ->> 'action'
            when 'I' then 'INSERT'
            when 'U' then 'UPDATE'
            when 'D' then 'DELETE'
            else 'ERROR'
        end
    );

    -- Is row level security enabled for the table
    is_rls_enabled bool = relrowsecurity from pg_class where oid = entity_;

    subscriptions realtime.subscription[] = array_agg(subs)
        from
            realtime.subscription subs
        where
            subs.entity = entity_
            -- Filter by action early - only get subscriptions interested in this action
            -- action_filter column can be: '*' (all), 'INSERT', 'UPDATE', or 'DELETE'
            and (subs.action_filter = '*' or subs.action_filter = action::text);

    -- Subscription vars
    working_role regrole;
    working_selected_columns text[];
    claimed_role regrole;
    claims jsonb;

    subscription_id uuid;
    subscription_has_access bool;
    visible_to_subscription_ids uuid[] = '{}';

    -- structured info for wal's columns
    columns realtime.wal_column[];
    -- previous identity values for update/delete
    old_columns realtime.wal_column[];

    error_record_exceeds_max_size boolean = octet_length(wal::text) > max_record_bytes;

    -- Primary jsonb output for record
    output jsonb;

    -- Loop record for iterating unique roles (outer loop)
    role_record record;
    -- Loop record for iterating unique selected_columns within a role (inner loop)
    cols_record record;
    -- Subscription ids visible at the role level (before fanning out by selected_columns)
    visible_role_sub_ids uuid[] = '{}';

begin
    perform set_config('role', null, true);

    columns =
        array_agg(
            (
                x->>'name',
                x->>'type',
                x->>'typeoid',
                realtime.cast(
                    (x->'value') #>> '{}',
                    coalesce(
                        (x->>'typeoid')::regtype, -- null when wal2json version <= 2.4
                        (x->>'type')::regtype
                    )
                ),
                (pks ->> 'name') is not null,
                true
            )::realtime.wal_column
        )
        from
            jsonb_array_elements(wal -> 'columns') x
            left join jsonb_array_elements(wal -> 'pk') pks
                on (x ->> 'name') = (pks ->> 'name');

    old_columns =
        array_agg(
            (
                x->>'name',
                x->>'type',
                x->>'typeoid',
                realtime.cast(
                    (x->'value') #>> '{}',
                    coalesce(
                        (x->>'typeoid')::regtype, -- null when wal2json version <= 2.4
                        (x->>'type')::regtype
                    )
                ),
                (pks ->> 'name') is not null,
                true
            )::realtime.wal_column
        )
        from
            jsonb_array_elements(wal -> 'identity') x
            left join jsonb_array_elements(wal -> 'pk') pks
                on (x ->> 'name') = (pks ->> 'name');

    for role_record in
        select claims_role
        from (select distinct claims_role from unnest(subscriptions)) t
        order by claims_role::text
    loop
        working_role := role_record.claims_role;

        -- Update `is_selectable` for columns and old_columns (once per role)
        columns =
            array_agg(
                (
                    c.name,
                    c.type_name,
                    c.type_oid,
                    c.value,
                    c.is_pkey,
                    pg_catalog.has_column_privilege(working_role, entity_, c.name, 'SELECT')
                )::realtime.wal_column
            )
            from
                unnest(columns) c;

        old_columns =
                array_agg(
                    (
                        c.name,
                        c.type_name,
                        c.type_oid,
                        c.value,
                        c.is_pkey,
                        pg_catalog.has_column_privilege(working_role, entity_, c.name, 'SELECT')
                    )::realtime.wal_column
                )
                from
                    unnest(old_columns) c;

        if action <> 'DELETE' and count(1) = 0 from unnest(columns) c where c.is_pkey then
            -- Fan out 400 error per distinct selected_columns for this role
            for cols_record in
                select selected_columns
                from (select distinct selected_columns from unnest(subscriptions) s where s.claims_role = working_role) t
                order by coalesce(array_to_string(selected_columns, ','), '')
            loop
                working_selected_columns := cols_record.selected_columns;
                return next (
                    jsonb_build_object(
                        'schema', wal ->> 'schema',
                        'table', wal ->> 'table',
                        'type', action
                    ),
                    is_rls_enabled,
                    (select array_agg(s.subscription_id) from unnest(subscriptions) as s where s.claims_role = working_role and (s.selected_columns is not distinct from working_selected_columns)),
                    array['Error 400: Bad Request, no primary key']
                )::realtime.wal_rls;
            end loop;

        -- The claims role does not have SELECT permission to the primary key of entity
        elsif action <> 'DELETE' and sum(c.is_selectable::int) <> count(1) from unnest(columns) c where c.is_pkey then
            -- Fan out 401 error per distinct selected_columns for this role
            for cols_record in
                select selected_columns
                from (select distinct selected_columns from unnest(subscriptions) s where s.claims_role = working_role) t
                order by coalesce(array_to_string(selected_columns, ','), '')
            loop
                working_selected_columns := cols_record.selected_columns;
                return next (
                    jsonb_build_object(
                        'schema', wal ->> 'schema',
                        'table', wal ->> 'table',
                        'type', action
                    ),
                    is_rls_enabled,
                    (select array_agg(s.subscription_id) from unnest(subscriptions) as s where s.claims_role = working_role and (s.selected_columns is not distinct from working_selected_columns)),
                    array['Error 401: Unauthorized']
                )::realtime.wal_rls;
            end loop;

        else
            -- Create the prepared statement (once per role)
            if is_rls_enabled and action <> 'DELETE' then
                if (select 1 from pg_prepared_statements where name = 'walrus_rls_stmt' limit 1) > 0 then
                    deallocate walrus_rls_stmt;
                end if;
                execute realtime.build_prepared_statement_sql('walrus_rls_stmt', entity_, columns);
            end if;

            -- Collect all visible subscription IDs for this role (filter check + RLS check)
            visible_role_sub_ids = '{}';

            for subscription_id, claims in (
                    select
                        subs.subscription_id,
                        subs.claims
                    from
                        unnest(subscriptions) subs
                    where
                        subs.entity = entity_
                        and subs.claims_role = working_role
                        and (
                            realtime.is_visible_through_filters(columns, subs.filters)
                            or (
                              action = 'DELETE'
                              and realtime.is_visible_through_filters(old_columns, subs.filters)
                            )
                        )
            ) loop

                if not is_rls_enabled or action = 'DELETE' then
                    visible_role_sub_ids = visible_role_sub_ids || subscription_id;
                else
                    -- Check if RLS allows the role to see the record
                    perform
                        -- Trim leading and trailing quotes from working_role because set_config
                        -- doesn't recognize the role as valid if they are included
                        set_config('role', trim(both '"' from working_role::text), true),
                        set_config('request.jwt.claims', claims::text, true);

                    execute 'execute walrus_rls_stmt' into subscription_has_access;

                    if subscription_has_access then
                        visible_role_sub_ids = visible_role_sub_ids || subscription_id;
                    end if;
                end if;
            end loop;

            perform set_config('role', null, true);

            -- Inner loop: per distinct selected_columns for this role
            for cols_record in
                select selected_columns
                from (select distinct selected_columns from unnest(subscriptions) s where s.claims_role = working_role) t
                order by coalesce(array_to_string(selected_columns, ','), '')
            loop
                working_selected_columns := cols_record.selected_columns;

                output = jsonb_build_object(
                    'schema', wal ->> 'schema',
                    'table', wal ->> 'table',
                    'type', action,
                    'commit_timestamp', to_char(
                        ((wal ->> 'timestamp')::timestamptz at time zone 'utc'),
                        'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'
                    ),
                    'columns', (
                        select
                            jsonb_agg(
                                jsonb_build_object(
                                    'name', pa.attname,
                                    'type', pt.typname
                                )
                                order by pa.attnum asc
                            )
                        from
                            pg_attribute pa
                            join pg_type pt
                                on pa.atttypid = pt.oid
                            left join (
                                select unnest(conkey) as pkey_attnum
                                from pg_constraint
                                where conrelid = entity_ and contype = 'p'
                            ) pk on pk.pkey_attnum = pa.attnum
                        where
                            attrelid = entity_
                            and attnum > 0
                            and pg_catalog.has_column_privilege(working_role, entity_, pa.attname, 'SELECT')
                            and (working_selected_columns is null or pa.attname = any(working_selected_columns) or pk.pkey_attnum is not null)
                    )
                )
                -- Add "record" key for insert and update
                || case
                    when action in ('INSERT', 'UPDATE') then
                        jsonb_build_object(
                            'record',
                            (
                                select
                                    jsonb_object_agg(
                                        -- if unchanged toast, get column name and value from old record
                                        coalesce((c).name, (oc).name),
                                        case
                                            when (c).name is null then (oc).value
                                            else (c).value
                                        end
                                    )
                                from
                                    unnest(columns) c
                                    full outer join unnest(old_columns) oc
                                        on (c).name = (oc).name
                                where
                                    coalesce((c).is_selectable, (oc).is_selectable)
                                    and (working_selected_columns is null or coalesce((c).name, (oc).name) = any(working_selected_columns) or coalesce((c).is_pkey, (oc).is_pkey))
                                    and ( not error_record_exceeds_max_size or (octet_length((c).value::text) <= 64))
                            )
                        )
                    else '{}'::jsonb
                end
                -- Add "old_record" key for update and delete
                || case
                    when action = 'UPDATE' then
                        jsonb_build_object(
                                'old_record',
                                (
                                    select jsonb_object_agg((c).name, (c).value)
                                    from unnest(old_columns) c
                                    where
                                        (c).is_selectable
                                        and (working_selected_columns is null or (c).name = any(working_selected_columns) or (c).is_pkey)
                                        and ( not error_record_exceeds_max_size or (octet_length((c).value::text) <= 64))
                                )
                            )
                    when action = 'DELETE' then
                        jsonb_build_object(
                            'old_record',
                            (
                                select jsonb_object_agg((c).name, (c).value)
                                from unnest(old_columns) c
                                where
                                    (c).is_selectable
                                    and (working_selected_columns is null or (c).name = any(working_selected_columns) or (c).is_pkey)
                                    and ( not error_record_exceeds_max_size or (octet_length((c).value::text) <= 64))
                                    and ( not is_rls_enabled or (c).is_pkey ) -- if RLS enabled, we can't secure deletes so filter to pkey
                            )
                        )
                    else '{}'::jsonb
                end;

                -- Filter visible_role_sub_ids to those matching the current selected_columns group
                visible_to_subscription_ids = coalesce(
                    (
                        select array_agg(s.subscription_id)
                        from unnest(subscriptions) s
                        where s.claims_role = working_role
                          and (s.selected_columns is not distinct from working_selected_columns)
                          and s.subscription_id = any(visible_role_sub_ids)
                    ),
                    '{}'::uuid[]
                );

                return next (
                    output,
                    is_rls_enabled,
                    visible_to_subscription_ids,
                    case
                        when error_record_exceeds_max_size then array['Error 413: Payload Too Large']
                        else '{}'
                    end
                )::realtime.wal_rls;
            end loop;

        end if;
    end loop;

    perform set_config('role', null, true);
end;
$$;


ALTER FUNCTION "realtime"."apply_rls"("wal" "jsonb", "max_record_bytes" integer) OWNER TO "supabase_admin";

--
-- Name: broadcast_changes("text", "text", "text", "text", "text", "record", "record", "text"); Type: FUNCTION; Schema: realtime; Owner: supabase_admin
--

CREATE FUNCTION "realtime"."broadcast_changes"("topic_name" "text", "event_name" "text", "operation" "text", "table_name" "text", "table_schema" "text", "new" "record", "old" "record", "level" "text" DEFAULT 'ROW'::"text") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    -- Declare a variable to hold the JSONB representation of the row
    row_data jsonb := '{}'::jsonb;
BEGIN
    IF level = 'STATEMENT' THEN
        RAISE EXCEPTION 'function can only be triggered for each row, not for each statement';
    END IF;
    -- Check the operation type and handle accordingly
    IF operation = 'INSERT' OR operation = 'UPDATE' OR operation = 'DELETE' THEN
        row_data := jsonb_build_object('old_record', OLD, 'record', NEW, 'operation', operation, 'table', table_name, 'schema', table_schema);
        PERFORM realtime.send (row_data, event_name, topic_name);
    ELSE
        RAISE EXCEPTION 'Unexpected operation type: %', operation;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Failed to process the row: %', SQLERRM;
END;

$$;


ALTER FUNCTION "realtime"."broadcast_changes"("topic_name" "text", "event_name" "text", "operation" "text", "table_name" "text", "table_schema" "text", "new" "record", "old" "record", "level" "text") OWNER TO "supabase_admin";

--
-- Name: build_prepared_statement_sql("text", "regclass", "realtime"."wal_column"[]); Type: FUNCTION; Schema: realtime; Owner: supabase_admin
--

CREATE FUNCTION "realtime"."build_prepared_statement_sql"("prepared_statement_name" "text", "entity" "regclass", "columns" "realtime"."wal_column"[]) RETURNS "text"
    LANGUAGE "sql"
    AS $$
      /*
      Builds a sql string that, if executed, creates a prepared statement to
      tests retrive a row from *entity* by its primary key columns.
      Example
          select realtime.build_prepared_statement_sql('public.notes', '{"id"}'::text[], '{"bigint"}'::text[])
      */
          select
      'prepare ' || prepared_statement_name || ' as
          select
              exists(
                  select
                      1
                  from
                      ' || entity || '
                  where
                      ' || string_agg(quote_ident(pkc.name) || '=' || quote_nullable(pkc.value #>> '{}') , ' and ') || '
              )'
          from
              unnest(columns) pkc
          where
              pkc.is_pkey
          group by
              entity
      $$;


ALTER FUNCTION "realtime"."build_prepared_statement_sql"("prepared_statement_name" "text", "entity" "regclass", "columns" "realtime"."wal_column"[]) OWNER TO "supabase_admin";

--
-- Name: cast("text", "regtype"); Type: FUNCTION; Schema: realtime; Owner: supabase_admin
--

CREATE FUNCTION "realtime"."cast"("val" "text", "type_" "regtype") RETURNS "jsonb"
    LANGUAGE "plpgsql" IMMUTABLE
    AS $$
declare
  res jsonb;
begin
  if type_::text = 'bytea' then
    return to_jsonb(val);
  end if;
  execute format('select to_jsonb(%L::'|| type_::text || ')', val) into res;
  return res;
end
$$;


ALTER FUNCTION "realtime"."cast"("val" "text", "type_" "regtype") OWNER TO "supabase_admin";

--
-- Name: check_equality_op("realtime"."equality_op", "regtype", "text", "text"); Type: FUNCTION; Schema: realtime; Owner: supabase_admin
--

CREATE FUNCTION "realtime"."check_equality_op"("op" "realtime"."equality_op", "type_" "regtype", "val_1" "text", "val_2" "text") RETURNS boolean
    LANGUAGE "plpgsql" IMMUTABLE
    AS $$
/*
Casts *val_1* and *val_2* as type *type_* and check the *op* condition for truthiness
*/
declare
    op_symbol text = (
        case
            when op = 'eq' then '='
            when op = 'neq' then '!='
            when op = 'lt' then '<'
            when op = 'lte' then '<='
            when op = 'gt' then '>'
            when op = 'gte' then '>='
            when op = 'in' then '= any'
            else 'UNKNOWN OP'
        end
    );
    res boolean;
begin
    execute format(
        'select %L::'|| type_::text || ' ' || op_symbol
        || ' ( %L::'
        || (
            case
                when op = 'in' then type_::text || '[]'
                else type_::text end
        )
        || ')', val_1, val_2) into res;
    return res;
end;
$$;


ALTER FUNCTION "realtime"."check_equality_op"("op" "realtime"."equality_op", "type_" "regtype", "val_1" "text", "val_2" "text") OWNER TO "supabase_admin";

--
-- Name: check_equality_op("realtime"."equality_op", "regtype", "text", "text", boolean); Type: FUNCTION; Schema: realtime; Owner: supabase_admin
--

CREATE FUNCTION "realtime"."check_equality_op"("op" "realtime"."equality_op", "type_" "regtype", "val_1" "text", "val_2" "text", "negate" boolean) RETURNS boolean
    LANGUAGE "plpgsql" STABLE
    AS $$
declare
    op_symbol text;
    res boolean;
begin
    -- IS DISTINCT FROM / IS NOT DISTINCT FROM: infix, both sides typed literals
    if op = 'isdistinct' then
        execute format(
            'select %L::%s %s %L::%s',
            val_1,
            type_::text,
            case when negate then 'IS NOT DISTINCT FROM' else 'IS DISTINCT FROM' end,
            val_2,
            type_::text
        ) into res;
        return res;
    end if;

    -- IS requires a keyword RHS (NULL, TRUE, FALSE, UNKNOWN), not a typed literal
    if op = 'is' then
        if val_2 not in ('null', 'true', 'false', 'unknown') then
            raise exception 'invalid value for is filter: must be null, true, false, or unknown';
        end if;
        execute format(
            'select %L::%s %s %s',
            val_1,
            type_::text,
            case when negate then 'IS NOT' else 'IS' end,
            upper(val_2)
        ) into res;
        return res;
    end if;

    op_symbol = case
        when op = 'eq'    then '='
        when op = 'neq'   then '!='
        when op = 'lt'    then '<'
        when op = 'lte'   then '<='
        when op = 'gt'    then '>'
        when op = 'gte'   then '>='
        when op = 'in'    then '= any'
        when op = 'like'   then 'LIKE'
        when op = 'ilike'  then 'ILIKE'
        when op = 'match'  then '~'
        when op = 'imatch' then '~*'
        else null
    end;

    if op_symbol is null then
        raise exception 'unsupported equality operator: %', op::text;
    end if;

    execute format(
        'select %L::%s %s (%L::%s)',
        val_1,
        type_::text,
        op_symbol,
        val_2,
        case when op = 'in' then type_::text || '[]' else type_::text end
    ) into res;

    return case when negate then not res else res end;
end;
$$;


ALTER FUNCTION "realtime"."check_equality_op"("op" "realtime"."equality_op", "type_" "regtype", "val_1" "text", "val_2" "text", "negate" boolean) OWNER TO "supabase_admin";

--
-- Name: is_visible_through_filters("realtime"."wal_column"[], "realtime"."user_defined_filter"[]); Type: FUNCTION; Schema: realtime; Owner: supabase_admin
--

CREATE FUNCTION "realtime"."is_visible_through_filters"("columns" "realtime"."wal_column"[], "filters" "realtime"."user_defined_filter"[]) RETURNS boolean
    LANGUAGE "sql" STABLE
    AS $$
    select
        filters is null
        or array_length(filters, 1) is null
        or coalesce(
            count(col.name) = count(1)
            and sum(
                realtime.check_equality_op(
                    op:=f.op,
                    type_:=coalesce(col.type_oid::regtype, col.type_name::regtype),
                    val_1:=col.value #>> '{}',
                    val_2:=f.value,
                    negate:=coalesce(f.negate, false)
                )::int
            ) filter (where col.name is not null) = count(col.name),
            false
        )
    from
        unnest(filters) f
        left join unnest(columns) col
            on f.column_name = col.name;
$$;


ALTER FUNCTION "realtime"."is_visible_through_filters"("columns" "realtime"."wal_column"[], "filters" "realtime"."user_defined_filter"[]) OWNER TO "supabase_admin";

--
-- Name: list_changes("name", "name", integer, integer); Type: FUNCTION; Schema: realtime; Owner: supabase_admin
--

CREATE FUNCTION "realtime"."list_changes"("publication" "name", "slot_name" "name", "max_changes" integer, "max_record_bytes" integer) RETURNS TABLE("wal" "jsonb", "is_rls_enabled" boolean, "subscription_ids" "uuid"[], "errors" "text"[], "slot_changes_count" bigint)
    LANGUAGE "sql"
    SET "log_min_messages" TO 'fatal'
    AS $$
  WITH pub AS (
    SELECT
      concat_ws(
        ',',
        CASE WHEN bool_or(pubinsert) THEN 'insert' ELSE NULL END,
        CASE WHEN bool_or(pubupdate) THEN 'update' ELSE NULL END,
        CASE WHEN bool_or(pubdelete) THEN 'delete' ELSE NULL END
      ) AS w2j_actions,
      coalesce(
        string_agg(
          realtime.quote_wal2json(format('%I.%I', schemaname, tablename)::regclass),
          ','
        ) filter (WHERE ppt.tablename IS NOT NULL),
        ''
      ) AS w2j_add_tables
    FROM pg_publication pp
    LEFT JOIN pg_publication_tables ppt ON pp.pubname = ppt.pubname
    WHERE pp.pubname = publication
    GROUP BY pp.pubname
    LIMIT 1
  ),
  -- MATERIALIZED ensures pg_logical_slot_get_changes is called exactly once
  w2j AS MATERIALIZED (
    SELECT x.*, pub.w2j_add_tables
    FROM pub,
         pg_logical_slot_get_changes(
           slot_name, null, max_changes,
           'include-pk', 'true',
           'include-transaction', 'false',
           'include-timestamp', 'true',
           'include-type-oids', 'true',
           'format-version', '2',
           'actions', pub.w2j_actions,
           'add-tables', pub.w2j_add_tables
         ) x
  ),
  slot_count AS (
    SELECT count(*)::bigint AS cnt
    FROM w2j
    WHERE w2j.w2j_add_tables <> ''
  ),
  rls_filtered AS (
    SELECT xyz.wal, xyz.is_rls_enabled, xyz.subscription_ids, xyz.errors
    FROM w2j,
         realtime.apply_rls(
           wal := w2j.data::jsonb,
           max_record_bytes := max_record_bytes
         ) xyz(wal, is_rls_enabled, subscription_ids, errors)
    WHERE w2j.w2j_add_tables <> ''
      AND xyz.subscription_ids[1] IS NOT NULL
  )
  SELECT rf.wal, rf.is_rls_enabled, rf.subscription_ids, rf.errors, sc.cnt
  FROM rls_filtered rf, slot_count sc

  UNION ALL

  SELECT null, null, null, null, sc.cnt
  FROM slot_count sc
  WHERE NOT EXISTS (SELECT 1 FROM rls_filtered)
$$;


ALTER FUNCTION "realtime"."list_changes"("publication" "name", "slot_name" "name", "max_changes" integer, "max_record_bytes" integer) OWNER TO "supabase_admin";

--
-- Name: quote_wal2json("regclass"); Type: FUNCTION; Schema: realtime; Owner: supabase_admin
--

CREATE FUNCTION "realtime"."quote_wal2json"("entity" "regclass") RETURNS "text"
    LANGUAGE "sql" IMMUTABLE STRICT
    AS $$
  SELECT
    realtime.wal2json_escape_identifier(nsp.nspname::text)
    || '.'
    || realtime.wal2json_escape_identifier(pc.relname::text)
  FROM pg_class pc
  JOIN pg_namespace nsp ON pc.relnamespace = nsp.oid
  WHERE pc.oid = entity
$$;


ALTER FUNCTION "realtime"."quote_wal2json"("entity" "regclass") OWNER TO "supabase_admin";

--
-- Name: send("jsonb", "text", "text", boolean); Type: FUNCTION; Schema: realtime; Owner: supabase_admin
--

CREATE FUNCTION "realtime"."send"("payload" "jsonb", "event" "text", "topic" "text", "private" boolean DEFAULT true) RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  generated_id uuid;
  final_payload jsonb;
BEGIN
  BEGIN
    generated_id := gen_random_uuid();

    -- Check if payload has an 'id' key, if not, add the generated UUID
    IF payload ? 'id' THEN
      final_payload := payload;
    ELSE
      final_payload := jsonb_set(payload, '{id}', to_jsonb(generated_id));
    END IF;

    -- Set the topic configuration
    EXECUTE format('SET LOCAL realtime.topic TO %L', topic);

    INSERT INTO realtime.messages (id, payload, event, topic, private, extension)
    VALUES (generated_id, final_payload, event, topic, private, 'broadcast');
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'WarnSendingBroadcastMessage: %', SQLERRM;
  END;
END;
$$;


ALTER FUNCTION "realtime"."send"("payload" "jsonb", "event" "text", "topic" "text", "private" boolean) OWNER TO "supabase_admin";

--
-- Name: send_binary("bytea", "text", "text", boolean); Type: FUNCTION; Schema: realtime; Owner: supabase_admin
--

CREATE FUNCTION "realtime"."send_binary"("payload" "bytea", "event" "text", "topic" "text", "private" boolean DEFAULT true) RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  generated_id uuid;
BEGIN
  BEGIN
    generated_id := gen_random_uuid();

    EXECUTE format('SET LOCAL realtime.topic TO %L', topic);

    INSERT INTO realtime.messages (id, binary_payload, event, topic, private, extension)
    VALUES (generated_id, payload, event, topic, private, 'broadcast');
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'WarnSendingBroadcastMessage: %', SQLERRM;
  END;
END;
$$;


ALTER FUNCTION "realtime"."send_binary"("payload" "bytea", "event" "text", "topic" "text", "private" boolean) OWNER TO "supabase_admin";

--
-- Name: subscription_check_filters(); Type: FUNCTION; Schema: realtime; Owner: supabase_admin
--

CREATE FUNCTION "realtime"."subscription_check_filters"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
declare
    col_names text[] = coalesce(
            array_agg(a.attname order by a.attnum),
            '{}'::text[]
        )
        from
            pg_catalog.pg_attribute a
        where
            a.attrelid = new.entity
            and a.attnum > 0
            and not a.attisdropped
            and pg_catalog.has_column_privilege(
                (new.claims ->> 'role'),
                a.attrelid,
                a.attnum,
                'SELECT'
            );
    filter realtime.user_defined_filter;
    col_type regtype;
    in_val jsonb;
    selected_col text;
begin
    for filter in select * from unnest(new.filters) loop
        if not filter.column_name = any(col_names) then
            raise exception 'invalid column for filter %', filter.column_name;
        end if;

        col_type = (
            select atttypid::regtype
            from pg_catalog.pg_attribute
            where attrelid = new.entity
                  and attname = filter.column_name
        );
        if col_type is null then
            raise exception 'failed to lookup type for column %', filter.column_name;
        end if;

        if filter.op = 'in'::realtime.equality_op then
            in_val = realtime.cast(filter.value, (col_type::text || '[]')::regtype);
            if coalesce(jsonb_array_length(in_val), 0) > 100 then
                raise exception 'too many values for `in` filter. Maximum 100';
            end if;
        elsif filter.op = 'is'::realtime.equality_op then
            -- `is` requires a keyword RHS rather than a typed literal
            if filter.value not in ('null', 'true', 'false', 'unknown') then
                raise exception 'invalid value for is filter: must be null, true, false, or unknown';
            end if;
            -- IS NULL works for any type, but IS TRUE/FALSE/UNKNOWN require a boolean
            -- operand. Reject the non-null keywords on non-boolean columns here so they
            -- don't abort apply_rls at WAL time.
            if filter.value <> 'null' and col_type <> 'boolean'::regtype then
                raise exception 'is % filter requires a boolean column, got %', filter.value, col_type::text;
            end if;
        elsif filter.op in ('like'::realtime.equality_op, 'ilike'::realtime.equality_op) then
            -- like/ilike apply the text pattern operator (~~); reject column types that
            -- have no such operator instead of failing at WAL time
            if not exists (
                select 1 from pg_catalog.pg_operator
                where oprname = '~~' and oprleft = col_type
            ) then
                raise exception 'operator % requires a text-compatible column type, got %', filter.op::text, col_type::text;
            end if;
        elsif filter.op in ('match'::realtime.equality_op, 'imatch'::realtime.equality_op) then
            -- match/imatch apply the regex operators ~ / ~*; reject column types that have
            -- no such operator (e.g. integer) instead of failing at WAL time, mirroring the
            -- like/ilike guard above.
            if not exists (
                select 1 from pg_catalog.pg_operator
                where oprname = case when filter.op = 'imatch'::realtime.equality_op then '~*' else '~' end
                  and oprleft = col_type
                  and oprright = col_type
                  and oprresult = 'boolean'::regtype
            ) then
                raise exception 'operator % requires a text-compatible column type, got %', filter.op::text, col_type::text;
            end if;
            -- validate the regex eagerly so a bad pattern is rejected here, not inside
            -- apply_rls where it would abort the WAL stream for the entity
            begin
                perform '' ~ filter.value;
            exception when others then
                raise exception 'invalid regular expression for % filter: %', filter.op::text, sqlerrm;
            end;
        else
            -- eq/neq/lt/lte/gt/gte: value must be coercable to the type
            perform realtime.cast(filter.value, col_type);
        end if;
    end loop;

    if new.selected_columns is not null then
        for selected_col in select * from unnest(new.selected_columns) loop
            if not selected_col = any(col_names) then
                raise exception 'invalid column for select %', selected_col;
            end if;
        end loop;
    end if;

    -- Apply consistent order to filters so the unique constraint can't be tricked by a
    -- different filter order. negate is part of the sort key.
    new.filters = coalesce(
        array_agg(f order by f.column_name, f.op, f.value, f.negate),
        '{}'
    ) from unnest(new.filters) f;

    new.selected_columns = (
        select array_agg(c order by c)
        from unnest(new.selected_columns) c
    );

    return new;
end;
$$;


ALTER FUNCTION "realtime"."subscription_check_filters"() OWNER TO "supabase_admin";

--
-- Name: to_regrole("text"); Type: FUNCTION; Schema: realtime; Owner: supabase_admin
--

CREATE FUNCTION "realtime"."to_regrole"("role_name" "text") RETURNS "regrole"
    LANGUAGE "sql" IMMUTABLE
    AS $$ select role_name::regrole $$;


ALTER FUNCTION "realtime"."to_regrole"("role_name" "text") OWNER TO "supabase_admin";

--
-- Name: topic(); Type: FUNCTION; Schema: realtime; Owner: supabase_realtime_admin
--

CREATE FUNCTION "realtime"."topic"() RETURNS "text"
    LANGUAGE "sql" STABLE
    AS $$
select nullif(current_setting('realtime.topic', true), '')::text;
$$;


ALTER FUNCTION "realtime"."topic"() OWNER TO "supabase_realtime_admin";

--
-- Name: wal2json_escape_identifier("text"); Type: FUNCTION; Schema: realtime; Owner: supabase_admin
--

CREATE FUNCTION "realtime"."wal2json_escape_identifier"("name" "text") RETURNS "text"
    LANGUAGE "sql" IMMUTABLE STRICT
    AS $$
  -- Prefix `\`, `,`, `.`, and any whitespace with `\`
  SELECT regexp_replace(name, '([\\,.[:space:]])', '\\\1', 'g')
$$;


ALTER FUNCTION "realtime"."wal2json_escape_identifier"("name" "text") OWNER TO "supabase_admin";

--
-- Name: allow_any_operation("text"[]); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION "storage"."allow_any_operation"("expected_operations" "text"[]) RETURNS boolean
    LANGUAGE "sql" STABLE
    AS $$
  WITH current_operation AS (
    SELECT storage.operation() AS raw_operation
  ),
  normalized AS (
    SELECT CASE
      WHEN raw_operation LIKE 'storage.%' THEN substr(raw_operation, 9)
      ELSE raw_operation
    END AS current_operation
    FROM current_operation
  )
  SELECT EXISTS (
    SELECT 1
    FROM normalized n
    CROSS JOIN LATERAL unnest(expected_operations) AS expected_operation
    WHERE expected_operation IS NOT NULL
      AND expected_operation <> ''
      AND n.current_operation = CASE
        WHEN expected_operation LIKE 'storage.%' THEN substr(expected_operation, 9)
        ELSE expected_operation
      END
  );
$$;


ALTER FUNCTION "storage"."allow_any_operation"("expected_operations" "text"[]) OWNER TO "supabase_storage_admin";

--
-- Name: allow_only_operation("text"); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION "storage"."allow_only_operation"("expected_operation" "text") RETURNS boolean
    LANGUAGE "sql" STABLE
    AS $$
  WITH current_operation AS (
    SELECT storage.operation() AS raw_operation
  ),
  normalized AS (
    SELECT
      CASE
        WHEN raw_operation LIKE 'storage.%' THEN substr(raw_operation, 9)
        ELSE raw_operation
      END AS current_operation,
      CASE
        WHEN expected_operation LIKE 'storage.%' THEN substr(expected_operation, 9)
        ELSE expected_operation
      END AS requested_operation
    FROM current_operation
  )
  SELECT CASE
    WHEN requested_operation IS NULL OR requested_operation = '' THEN FALSE
    ELSE COALESCE(current_operation = requested_operation, FALSE)
  END
  FROM normalized;
$$;


ALTER FUNCTION "storage"."allow_only_operation"("expected_operation" "text") OWNER TO "supabase_storage_admin";

--
-- Name: can_insert_object("text", "text", "uuid", "jsonb"); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION "storage"."can_insert_object"("bucketid" "text", "name" "text", "owner" "uuid", "metadata" "jsonb") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  INSERT INTO "storage"."objects" ("bucket_id", "name", "owner", "metadata") VALUES (bucketid, name, owner, metadata);
  -- hack to rollback the successful insert
  RAISE sqlstate 'PT200' using
  message = 'ROLLBACK',
  detail = 'rollback successful insert';
END
$$;


ALTER FUNCTION "storage"."can_insert_object"("bucketid" "text", "name" "text", "owner" "uuid", "metadata" "jsonb") OWNER TO "supabase_storage_admin";

--
-- Name: enforce_bucket_name_length(); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION "storage"."enforce_bucket_name_length"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
    if length(new.name) > 100 then
        raise exception 'bucket name "%" is too long (% characters). Max is 100.', new.name, length(new.name);
    end if;
    return new;
end;
$$;


ALTER FUNCTION "storage"."enforce_bucket_name_length"() OWNER TO "supabase_storage_admin";

--
-- Name: extension("text"); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION "storage"."extension"("name" "text") RETURNS "text"
    LANGUAGE "plpgsql" IMMUTABLE
    AS $$
DECLARE
    _parts text[];
    _filename text;
BEGIN
    -- Split on "/" to get path segments
    SELECT string_to_array(name, '/') INTO _parts;
    -- Get the last path segment (the actual filename)
    SELECT _parts[array_length(_parts, 1)] INTO _filename;
    -- Extract extension: reverse, split on '.', then reverse again
    RETURN reverse(split_part(reverse(_filename), '.', 1));
END
$$;


ALTER FUNCTION "storage"."extension"("name" "text") OWNER TO "supabase_storage_admin";

--
-- Name: filename("text"); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION "storage"."filename"("name" "text") RETURNS "text"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
_parts text[];
BEGIN
	select string_to_array(name, '/') into _parts;
	return _parts[array_length(_parts,1)];
END
$$;


ALTER FUNCTION "storage"."filename"("name" "text") OWNER TO "supabase_storage_admin";

--
-- Name: foldername("text"); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION "storage"."foldername"("name" "text") RETURNS "text"[]
    LANGUAGE "plpgsql" IMMUTABLE
    AS $$
DECLARE
    _parts text[];
BEGIN
    -- Split on "/" to get path segments
    SELECT string_to_array(name, '/') INTO _parts;
    -- Return everything except the last segment
    RETURN _parts[1 : array_length(_parts,1) - 1];
END
$$;


ALTER FUNCTION "storage"."foldername"("name" "text") OWNER TO "supabase_storage_admin";

--
-- Name: get_common_prefix("text", "text", "text"); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION "storage"."get_common_prefix"("p_key" "text", "p_prefix" "text", "p_delimiter" "text") RETURNS "text"
    LANGUAGE "sql" IMMUTABLE
    AS $$
SELECT CASE
    WHEN position(p_delimiter IN substring(p_key FROM length(p_prefix) + 1)) > 0
    THEN left(p_key, length(p_prefix) + position(p_delimiter IN substring(p_key FROM length(p_prefix) + 1)))
    ELSE NULL
END;
$$;


ALTER FUNCTION "storage"."get_common_prefix"("p_key" "text", "p_prefix" "text", "p_delimiter" "text") OWNER TO "supabase_storage_admin";

--
-- Name: get_size_by_bucket(); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION "storage"."get_size_by_bucket"() RETURNS TABLE("size" bigint, "bucket_id" "text")
    LANGUAGE "plpgsql" STABLE
    AS $$
BEGIN
    return query
        select sum((metadata->>'size')::bigint)::bigint as size, obj.bucket_id
        from "storage".objects as obj
        group by obj.bucket_id;
END
$$;


ALTER FUNCTION "storage"."get_size_by_bucket"() OWNER TO "supabase_storage_admin";

--
-- Name: list_multipart_uploads_with_delimiter("text", "text", "text", integer, "text", "text"); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION "storage"."list_multipart_uploads_with_delimiter"("bucket_id" "text", "prefix_param" "text", "delimiter_param" "text", "max_keys" integer DEFAULT 100, "next_key_token" "text" DEFAULT ''::"text", "next_upload_token" "text" DEFAULT ''::"text") RETURNS TABLE("key" "text", "id" "text", "created_at" timestamp with time zone)
    LANGUAGE "plpgsql"
    AS $_$
BEGIN
    RETURN QUERY EXECUTE
        'SELECT DISTINCT ON(key COLLATE "C") * from (
            SELECT
                CASE
                    WHEN position($2 IN substring(key from length($1) + 1)) > 0 THEN
                        substring(key from 1 for length($1) + position($2 IN substring(key from length($1) + 1)))
                    ELSE
                        key
                END AS key, id, created_at
            FROM
                storage.s3_multipart_uploads
            WHERE
                bucket_id = $5 AND
                key ILIKE $1 || ''%'' AND
                CASE
                    WHEN $4 != '''' AND $6 = '''' THEN
                        CASE
                            WHEN position($2 IN substring(key from length($1) + 1)) > 0 THEN
                                substring(key from 1 for length($1) + position($2 IN substring(key from length($1) + 1))) COLLATE "C" > $4
                            ELSE
                                key COLLATE "C" > $4
                            END
                    ELSE
                        true
                END AND
                CASE
                    WHEN $6 != '''' THEN
                        id COLLATE "C" > $6
                    ELSE
                        true
                    END
            ORDER BY
                key COLLATE "C" ASC, created_at ASC) as e order by key COLLATE "C" LIMIT $3'
        USING prefix_param, delimiter_param, max_keys, next_key_token, bucket_id, next_upload_token;
END;
$_$;


ALTER FUNCTION "storage"."list_multipart_uploads_with_delimiter"("bucket_id" "text", "prefix_param" "text", "delimiter_param" "text", "max_keys" integer, "next_key_token" "text", "next_upload_token" "text") OWNER TO "supabase_storage_admin";

--
-- Name: list_objects_with_delimiter("text", "text", "text", integer, "text", "text", "text"); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION "storage"."list_objects_with_delimiter"("_bucket_id" "text", "prefix_param" "text", "delimiter_param" "text", "max_keys" integer DEFAULT 100, "start_after" "text" DEFAULT ''::"text", "next_token" "text" DEFAULT ''::"text", "sort_order" "text" DEFAULT 'asc'::"text") RETURNS TABLE("name" "text", "id" "uuid", "metadata" "jsonb", "updated_at" timestamp with time zone, "created_at" timestamp with time zone, "last_accessed_at" timestamp with time zone)
    LANGUAGE "plpgsql" STABLE
    AS $_$
DECLARE
    v_peek_name TEXT;
    v_current RECORD;
    v_common_prefix TEXT;

    -- Configuration
    v_is_asc BOOLEAN;
    v_prefix TEXT;
    v_start TEXT;
    v_upper_bound TEXT;
    v_file_batch_size INT;

    -- Seek state
    v_next_seek TEXT;
    v_count INT := 0;

    -- Dynamic SQL for batch query only
    v_batch_query TEXT;

BEGIN
    -- ========================================================================
    -- INITIALIZATION
    -- ========================================================================
    v_is_asc := lower(coalesce(sort_order, 'asc')) = 'asc';
    v_prefix := coalesce(prefix_param, '');
    v_start := CASE WHEN coalesce(next_token, '') <> '' THEN next_token ELSE coalesce(start_after, '') END;
    v_file_batch_size := LEAST(GREATEST(max_keys * 2, 100), 1000);

    -- Calculate upper bound for prefix filtering (bytewise, using COLLATE "C")
    IF v_prefix = '' THEN
        v_upper_bound := NULL;
    ELSIF right(v_prefix, 1) = delimiter_param THEN
        v_upper_bound := left(v_prefix, -1) || chr(ascii(delimiter_param) + 1);
    ELSE
        v_upper_bound := left(v_prefix, -1) || chr(ascii(right(v_prefix, 1)) + 1);
    END IF;

    -- Build batch query (dynamic SQL - called infrequently, amortized over many rows)
    IF v_is_asc THEN
        IF v_upper_bound IS NOT NULL THEN
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND o.name COLLATE "C" >= $2 ' ||
                'AND o.name COLLATE "C" < $3 ORDER BY o.name COLLATE "C" ASC LIMIT $4';
        ELSE
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND o.name COLLATE "C" >= $2 ' ||
                'ORDER BY o.name COLLATE "C" ASC LIMIT $4';
        END IF;
    ELSE
        IF v_upper_bound IS NOT NULL THEN
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND o.name COLLATE "C" < $2 ' ||
                'AND o.name COLLATE "C" >= $3 ORDER BY o.name COLLATE "C" DESC LIMIT $4';
        ELSE
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND o.name COLLATE "C" < $2 ' ||
                'ORDER BY o.name COLLATE "C" DESC LIMIT $4';
        END IF;
    END IF;

    -- ========================================================================
    -- SEEK INITIALIZATION: Determine starting position
    -- ========================================================================
    IF v_start = '' THEN
        IF v_is_asc THEN
            v_next_seek := v_prefix;
        ELSE
            -- DESC without cursor: find the last item in range
            IF v_upper_bound IS NOT NULL THEN
                SELECT o.name INTO v_next_seek FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" >= v_prefix AND o.name COLLATE "C" < v_upper_bound
                ORDER BY o.name COLLATE "C" DESC LIMIT 1;
            ELSIF v_prefix <> '' THEN
                SELECT o.name INTO v_next_seek FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" >= v_prefix
                ORDER BY o.name COLLATE "C" DESC LIMIT 1;
            ELSE
                SELECT o.name INTO v_next_seek FROM storage.objects o
                WHERE o.bucket_id = _bucket_id
                ORDER BY o.name COLLATE "C" DESC LIMIT 1;
            END IF;

            IF v_next_seek IS NOT NULL THEN
                v_next_seek := v_next_seek || delimiter_param;
            ELSE
                RETURN;
            END IF;
        END IF;
    ELSE
        -- Cursor provided: determine if it refers to a folder or leaf
        IF EXISTS (
            SELECT 1 FROM storage.objects o
            WHERE o.bucket_id = _bucket_id
              AND o.name COLLATE "C" LIKE v_start || delimiter_param || '%'
            LIMIT 1
        ) THEN
            -- Cursor refers to a folder
            IF v_is_asc THEN
                v_next_seek := v_start || chr(ascii(delimiter_param) + 1);
            ELSE
                v_next_seek := v_start || delimiter_param;
            END IF;
        ELSE
            -- Cursor refers to a leaf object
            IF v_is_asc THEN
                v_next_seek := v_start || delimiter_param;
            ELSE
                v_next_seek := v_start;
            END IF;
        END IF;
    END IF;

    -- ========================================================================
    -- MAIN LOOP: Hybrid peek-then-batch algorithm
    -- Uses STATIC SQL for peek (hot path) and DYNAMIC SQL for batch
    -- ========================================================================
    LOOP
        EXIT WHEN v_count >= max_keys;

        -- STEP 1: PEEK using STATIC SQL (plan cached, very fast)
        IF v_is_asc THEN
            IF v_upper_bound IS NOT NULL THEN
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" >= v_next_seek AND o.name COLLATE "C" < v_upper_bound
                ORDER BY o.name COLLATE "C" ASC LIMIT 1;
            ELSE
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" >= v_next_seek
                ORDER BY o.name COLLATE "C" ASC LIMIT 1;
            END IF;
        ELSE
            IF v_upper_bound IS NOT NULL THEN
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" < v_next_seek AND o.name COLLATE "C" >= v_prefix
                ORDER BY o.name COLLATE "C" DESC LIMIT 1;
            ELSIF v_prefix <> '' THEN
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" < v_next_seek AND o.name COLLATE "C" >= v_prefix
                ORDER BY o.name COLLATE "C" DESC LIMIT 1;
            ELSE
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" < v_next_seek
                ORDER BY o.name COLLATE "C" DESC LIMIT 1;
            END IF;
        END IF;

        EXIT WHEN v_peek_name IS NULL;

        -- STEP 2: Check if this is a FOLDER or FILE
        v_common_prefix := storage.get_common_prefix(v_peek_name, v_prefix, delimiter_param);

        IF v_common_prefix IS NOT NULL THEN
            -- FOLDER: Emit and skip to next folder (no heap access needed)
            name := rtrim(v_common_prefix, delimiter_param);
            id := NULL;
            updated_at := NULL;
            created_at := NULL;
            last_accessed_at := NULL;
            metadata := NULL;
            RETURN NEXT;
            v_count := v_count + 1;

            -- Advance seek past the folder range
            IF v_is_asc THEN
                v_next_seek := left(v_common_prefix, -1) || chr(ascii(delimiter_param) + 1);
            ELSE
                v_next_seek := v_common_prefix;
            END IF;
        ELSE
            -- FILE: Batch fetch using DYNAMIC SQL (overhead amortized over many rows)
            -- For ASC: upper_bound is the exclusive upper limit (< condition)
            -- For DESC: prefix is the inclusive lower limit (>= condition)
            FOR v_current IN EXECUTE v_batch_query USING _bucket_id, v_next_seek,
                CASE WHEN v_is_asc THEN COALESCE(v_upper_bound, v_prefix) ELSE v_prefix END, v_file_batch_size
            LOOP
                v_common_prefix := storage.get_common_prefix(v_current.name, v_prefix, delimiter_param);

                IF v_common_prefix IS NOT NULL THEN
                    -- Hit a folder: exit batch, let peek handle it
                    v_next_seek := v_current.name;
                    EXIT;
                END IF;

                -- Emit file
                name := v_current.name;
                id := v_current.id;
                updated_at := v_current.updated_at;
                created_at := v_current.created_at;
                last_accessed_at := v_current.last_accessed_at;
                metadata := v_current.metadata;
                RETURN NEXT;
                v_count := v_count + 1;

                -- Advance seek past this file
                IF v_is_asc THEN
                    v_next_seek := v_current.name || delimiter_param;
                ELSE
                    v_next_seek := v_current.name;
                END IF;

                EXIT WHEN v_count >= max_keys;
            END LOOP;
        END IF;
    END LOOP;
END;
$_$;


ALTER FUNCTION "storage"."list_objects_with_delimiter"("_bucket_id" "text", "prefix_param" "text", "delimiter_param" "text", "max_keys" integer, "start_after" "text", "next_token" "text", "sort_order" "text") OWNER TO "supabase_storage_admin";

--
-- Name: operation(); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION "storage"."operation"() RETURNS "text"
    LANGUAGE "plpgsql" STABLE
    AS $$
BEGIN
    RETURN current_setting('storage.operation', true);
END;
$$;


ALTER FUNCTION "storage"."operation"() OWNER TO "supabase_storage_admin";

--
-- Name: protect_delete(); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION "storage"."protect_delete"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    -- Check if storage.allow_delete_query is set to 'true'
    IF COALESCE(current_setting('storage.allow_delete_query', true), 'false') != 'true' THEN
        RAISE EXCEPTION 'Direct deletion from storage tables is not allowed. Use the Storage API instead.'
            USING HINT = 'This prevents accidental data loss from orphaned objects.',
                  ERRCODE = '42501';
    END IF;
    RETURN NULL;
END;
$$;


ALTER FUNCTION "storage"."protect_delete"() OWNER TO "supabase_storage_admin";

--
-- Name: search("text", "text", integer, integer, integer, "text", "text", "text"); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION "storage"."search"("prefix" "text", "bucketname" "text", "limits" integer DEFAULT 100, "levels" integer DEFAULT 1, "offsets" integer DEFAULT 0, "search" "text" DEFAULT ''::"text", "sortcolumn" "text" DEFAULT 'name'::"text", "sortorder" "text" DEFAULT 'asc'::"text") RETURNS TABLE("name" "text", "id" "uuid", "updated_at" timestamp with time zone, "created_at" timestamp with time zone, "last_accessed_at" timestamp with time zone, "metadata" "jsonb")
    LANGUAGE "plpgsql" STABLE
    AS $_$
DECLARE
    v_peek_name TEXT;
    v_current RECORD;
    v_common_prefix TEXT;
    v_delimiter CONSTANT TEXT := '/';

    -- Configuration
    v_limit INT;
    v_prefix TEXT;
    v_prefix_lower TEXT;
    v_is_asc BOOLEAN;
    v_order_by TEXT;
    v_sort_order TEXT;
    v_upper_bound TEXT;
    v_file_batch_size INT;

    -- Dynamic SQL for batch query only
    v_batch_query TEXT;

    -- Seek state
    v_next_seek TEXT;
    v_count INT := 0;
    v_skipped INT := 0;
BEGIN
    -- ========================================================================
    -- INITIALIZATION
    -- ========================================================================
    v_limit := LEAST(coalesce(limits, 100), 1500);
    v_prefix := coalesce(prefix, '') || coalesce(search, '');
    v_prefix_lower := lower(v_prefix);
    v_is_asc := lower(coalesce(sortorder, 'asc')) = 'asc';
    v_file_batch_size := LEAST(GREATEST(v_limit * 2, 100), 1000);

    -- Validate sort column
    CASE lower(coalesce(sortcolumn, 'name'))
        WHEN 'name' THEN v_order_by := 'name';
        WHEN 'updated_at' THEN v_order_by := 'updated_at';
        WHEN 'created_at' THEN v_order_by := 'created_at';
        WHEN 'last_accessed_at' THEN v_order_by := 'last_accessed_at';
        ELSE v_order_by := 'name';
    END CASE;

    v_sort_order := CASE WHEN v_is_asc THEN 'asc' ELSE 'desc' END;

    -- ========================================================================
    -- NON-NAME SORTING: Use path_tokens approach (unchanged)
    -- ========================================================================
    IF v_order_by != 'name' THEN
        RETURN QUERY EXECUTE format(
            $sql$
            WITH folders AS (
                SELECT path_tokens[$1] AS folder
                FROM storage.objects
                WHERE objects.name ILIKE $2 || '%%'
                  AND bucket_id = $3
                  AND array_length(objects.path_tokens, 1) <> $1
                GROUP BY folder
                ORDER BY folder %s
            )
            (SELECT folder AS "name",
                   NULL::uuid AS id,
                   NULL::timestamptz AS updated_at,
                   NULL::timestamptz AS created_at,
                   NULL::timestamptz AS last_accessed_at,
                   NULL::jsonb AS metadata FROM folders)
            UNION ALL
            (SELECT path_tokens[$1] AS "name",
                   id, updated_at, created_at, last_accessed_at, metadata
             FROM storage.objects
             WHERE objects.name ILIKE $2 || '%%'
               AND bucket_id = $3
               AND array_length(objects.path_tokens, 1) = $1
             ORDER BY %I %s)
            LIMIT $4 OFFSET $5
            $sql$, v_sort_order, v_order_by, v_sort_order
        ) USING levels, v_prefix, bucketname, v_limit, offsets;
        RETURN;
    END IF;

    -- ========================================================================
    -- NAME SORTING: Hybrid skip-scan with batch optimization
    -- ========================================================================

    -- Calculate upper bound for prefix filtering
    IF v_prefix_lower = '' THEN
        v_upper_bound := NULL;
    ELSIF right(v_prefix_lower, 1) = v_delimiter THEN
        v_upper_bound := left(v_prefix_lower, -1) || chr(ascii(v_delimiter) + 1);
    ELSE
        v_upper_bound := left(v_prefix_lower, -1) || chr(ascii(right(v_prefix_lower, 1)) + 1);
    END IF;

    -- Build batch query (dynamic SQL - called infrequently, amortized over many rows)
    IF v_is_asc THEN
        IF v_upper_bound IS NOT NULL THEN
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND lower(o.name) COLLATE "C" >= $2 ' ||
                'AND lower(o.name) COLLATE "C" < $3 ORDER BY lower(o.name) COLLATE "C" ASC LIMIT $4';
        ELSE
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND lower(o.name) COLLATE "C" >= $2 ' ||
                'ORDER BY lower(o.name) COLLATE "C" ASC LIMIT $4';
        END IF;
    ELSE
        IF v_upper_bound IS NOT NULL THEN
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND lower(o.name) COLLATE "C" < $2 ' ||
                'AND lower(o.name) COLLATE "C" >= $3 ORDER BY lower(o.name) COLLATE "C" DESC LIMIT $4';
        ELSE
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND lower(o.name) COLLATE "C" < $2 ' ||
                'ORDER BY lower(o.name) COLLATE "C" DESC LIMIT $4';
        END IF;
    END IF;

    -- Initialize seek position
    IF v_is_asc THEN
        v_next_seek := v_prefix_lower;
    ELSE
        -- DESC: find the last item in range first (static SQL)
        IF v_upper_bound IS NOT NULL THEN
            SELECT o.name INTO v_peek_name FROM storage.objects o
            WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" >= v_prefix_lower AND lower(o.name) COLLATE "C" < v_upper_bound
            ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1;
        ELSIF v_prefix_lower <> '' THEN
            SELECT o.name INTO v_peek_name FROM storage.objects o
            WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" >= v_prefix_lower
            ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1;
        ELSE
            SELECT o.name INTO v_peek_name FROM storage.objects o
            WHERE o.bucket_id = bucketname
            ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1;
        END IF;

        IF v_peek_name IS NOT NULL THEN
            v_next_seek := lower(v_peek_name) || v_delimiter;
        ELSE
            RETURN;
        END IF;
    END IF;

    -- ========================================================================
    -- MAIN LOOP: Hybrid peek-then-batch algorithm
    -- Uses STATIC SQL for peek (hot path) and DYNAMIC SQL for batch
    -- ========================================================================
    LOOP
        EXIT WHEN v_count >= v_limit;

        -- STEP 1: PEEK using STATIC SQL (plan cached, very fast)
        IF v_is_asc THEN
            IF v_upper_bound IS NOT NULL THEN
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" >= v_next_seek AND lower(o.name) COLLATE "C" < v_upper_bound
                ORDER BY lower(o.name) COLLATE "C" ASC LIMIT 1;
            ELSE
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" >= v_next_seek
                ORDER BY lower(o.name) COLLATE "C" ASC LIMIT 1;
            END IF;
        ELSE
            IF v_upper_bound IS NOT NULL THEN
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" < v_next_seek AND lower(o.name) COLLATE "C" >= v_prefix_lower
                ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1;
            ELSIF v_prefix_lower <> '' THEN
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" < v_next_seek AND lower(o.name) COLLATE "C" >= v_prefix_lower
                ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1;
            ELSE
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" < v_next_seek
                ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1;
            END IF;
        END IF;

        EXIT WHEN v_peek_name IS NULL;

        -- STEP 2: Check if this is a FOLDER or FILE
        v_common_prefix := storage.get_common_prefix(lower(v_peek_name), v_prefix_lower, v_delimiter);

        IF v_common_prefix IS NOT NULL THEN
            -- FOLDER: Handle offset, emit if needed, skip to next folder
            IF v_skipped < offsets THEN
                v_skipped := v_skipped + 1;
            ELSE
                name := split_part(rtrim(storage.get_common_prefix(v_peek_name, v_prefix, v_delimiter), v_delimiter), v_delimiter, levels);
                id := NULL;
                updated_at := NULL;
                created_at := NULL;
                last_accessed_at := NULL;
                metadata := NULL;
                RETURN NEXT;
                v_count := v_count + 1;
            END IF;

            -- Advance seek past the folder range
            IF v_is_asc THEN
                v_next_seek := lower(left(v_common_prefix, -1)) || chr(ascii(v_delimiter) + 1);
            ELSE
                v_next_seek := lower(v_common_prefix);
            END IF;
        ELSE
            -- FILE: Batch fetch using DYNAMIC SQL (overhead amortized over many rows)
            -- For ASC: upper_bound is the exclusive upper limit (< condition)
            -- For DESC: prefix_lower is the inclusive lower limit (>= condition)
            FOR v_current IN EXECUTE v_batch_query
                USING bucketname, v_next_seek,
                    CASE WHEN v_is_asc THEN COALESCE(v_upper_bound, v_prefix_lower) ELSE v_prefix_lower END, v_file_batch_size
            LOOP
                v_common_prefix := storage.get_common_prefix(lower(v_current.name), v_prefix_lower, v_delimiter);

                IF v_common_prefix IS NOT NULL THEN
                    -- Hit a folder: exit batch, let peek handle it
                    v_next_seek := lower(v_current.name);
                    EXIT;
                END IF;

                -- Handle offset skipping
                IF v_skipped < offsets THEN
                    v_skipped := v_skipped + 1;
                ELSE
                    -- Emit file
                    name := split_part(v_current.name, v_delimiter, levels);
                    id := v_current.id;
                    updated_at := v_current.updated_at;
                    created_at := v_current.created_at;
                    last_accessed_at := v_current.last_accessed_at;
                    metadata := v_current.metadata;
                    RETURN NEXT;
                    v_count := v_count + 1;
                END IF;

                -- Advance seek past this file
                IF v_is_asc THEN
                    v_next_seek := lower(v_current.name) || v_delimiter;
                ELSE
                    v_next_seek := lower(v_current.name);
                END IF;

                EXIT WHEN v_count >= v_limit;
            END LOOP;
        END IF;
    END LOOP;
END;
$_$;


ALTER FUNCTION "storage"."search"("prefix" "text", "bucketname" "text", "limits" integer, "levels" integer, "offsets" integer, "search" "text", "sortcolumn" "text", "sortorder" "text") OWNER TO "supabase_storage_admin";

--
-- Name: search_by_timestamp("text", "text", integer, integer, "text", "text", "text", "text"); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION "storage"."search_by_timestamp"("p_prefix" "text", "p_bucket_id" "text", "p_limit" integer, "p_level" integer, "p_start_after" "text", "p_sort_order" "text", "p_sort_column" "text", "p_sort_column_after" "text") RETURNS TABLE("key" "text", "name" "text", "id" "uuid", "updated_at" timestamp with time zone, "created_at" timestamp with time zone, "last_accessed_at" timestamp with time zone, "metadata" "jsonb")
    LANGUAGE "plpgsql" STABLE
    AS $_$
DECLARE
    v_cursor_op text;
    v_query text;
    v_prefix text;
BEGIN
    v_prefix := coalesce(p_prefix, '');

    IF p_sort_order = 'asc' THEN
        v_cursor_op := '>';
    ELSE
        v_cursor_op := '<';
    END IF;

    v_query := format($sql$
        WITH raw_objects AS (
            SELECT
                o.name AS obj_name,
                o.id AS obj_id,
                o.updated_at AS obj_updated_at,
                o.created_at AS obj_created_at,
                o.last_accessed_at AS obj_last_accessed_at,
                o.metadata AS obj_metadata,
                storage.get_common_prefix(o.name, $1, '/') AS common_prefix
            FROM storage.objects o
            WHERE o.bucket_id = $2
              AND o.name COLLATE "C" LIKE $1 || '%%'
        ),
        -- Aggregate common prefixes (folders)
        -- Both created_at and updated_at use MIN(obj_created_at) to match the old prefixes table behavior
        aggregated_prefixes AS (
            SELECT
                rtrim(common_prefix, '/') AS name,
                NULL::uuid AS id,
                MIN(obj_created_at) AS updated_at,
                MIN(obj_created_at) AS created_at,
                NULL::timestamptz AS last_accessed_at,
                NULL::jsonb AS metadata,
                TRUE AS is_prefix
            FROM raw_objects
            WHERE common_prefix IS NOT NULL
            GROUP BY common_prefix
        ),
        leaf_objects AS (
            SELECT
                obj_name AS name,
                obj_id AS id,
                obj_updated_at AS updated_at,
                obj_created_at AS created_at,
                obj_last_accessed_at AS last_accessed_at,
                obj_metadata AS metadata,
                FALSE AS is_prefix
            FROM raw_objects
            WHERE common_prefix IS NULL
        ),
        combined AS (
            SELECT * FROM aggregated_prefixes
            UNION ALL
            SELECT * FROM leaf_objects
        ),
        filtered AS (
            SELECT *
            FROM combined
            WHERE (
                $5 = ''
                OR ROW(
                    date_trunc('milliseconds', %I),
                    name COLLATE "C"
                ) %s ROW(
                    COALESCE(NULLIF($6, '')::timestamptz, 'epoch'::timestamptz),
                    $5
                )
            )
        )
        SELECT
            split_part(name, '/', $3) AS key,
            name,
            id,
            updated_at,
            created_at,
            last_accessed_at,
            metadata
        FROM filtered
        ORDER BY
            COALESCE(date_trunc('milliseconds', %I), 'epoch'::timestamptz) %s,
            name COLLATE "C" %s
        LIMIT $4
    $sql$,
        p_sort_column,
        v_cursor_op,
        p_sort_column,
        p_sort_order,
        p_sort_order
    );

    RETURN QUERY EXECUTE v_query
    USING v_prefix, p_bucket_id, p_level, p_limit, p_start_after, p_sort_column_after;
END;
$_$;


ALTER FUNCTION "storage"."search_by_timestamp"("p_prefix" "text", "p_bucket_id" "text", "p_limit" integer, "p_level" integer, "p_start_after" "text", "p_sort_order" "text", "p_sort_column" "text", "p_sort_column_after" "text") OWNER TO "supabase_storage_admin";

--
-- Name: search_v2("text", "text", integer, integer, "text", "text", "text", "text"); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION "storage"."search_v2"("prefix" "text", "bucket_name" "text", "limits" integer DEFAULT 100, "levels" integer DEFAULT 1, "start_after" "text" DEFAULT ''::"text", "sort_order" "text" DEFAULT 'asc'::"text", "sort_column" "text" DEFAULT 'name'::"text", "sort_column_after" "text" DEFAULT ''::"text") RETURNS TABLE("key" "text", "name" "text", "id" "uuid", "updated_at" timestamp with time zone, "created_at" timestamp with time zone, "last_accessed_at" timestamp with time zone, "metadata" "jsonb")
    LANGUAGE "plpgsql" STABLE
    AS $$
DECLARE
    v_sort_col text;
    v_sort_ord text;
    v_limit int;
BEGIN
    -- Cap limit to maximum of 1500 records
    v_limit := LEAST(coalesce(limits, 100), 1500);

    -- Validate and normalize sort_order
    v_sort_ord := lower(coalesce(sort_order, 'asc'));
    IF v_sort_ord NOT IN ('asc', 'desc') THEN
        v_sort_ord := 'asc';
    END IF;

    -- Validate and normalize sort_column
    v_sort_col := lower(coalesce(sort_column, 'name'));
    IF v_sort_col NOT IN ('name', 'updated_at', 'created_at') THEN
        v_sort_col := 'name';
    END IF;

    -- Route to appropriate implementation
    IF v_sort_col = 'name' THEN
        -- Use list_objects_with_delimiter for name sorting (most efficient: O(k * log n))
        RETURN QUERY
        SELECT
            split_part(l.name, '/', levels) AS key,
            l.name AS name,
            l.id,
            l.updated_at,
            l.created_at,
            l.last_accessed_at,
            l.metadata
        FROM storage.list_objects_with_delimiter(
            bucket_name,
            coalesce(prefix, ''),
            '/',
            v_limit,
            start_after,
            '',
            v_sort_ord
        ) l;
    ELSE
        -- Use aggregation approach for timestamp sorting
        -- Not efficient for large datasets but supports correct pagination
        RETURN QUERY SELECT * FROM storage.search_by_timestamp(
            prefix, bucket_name, v_limit, levels, start_after,
            v_sort_ord, v_sort_col, sort_column_after
        );
    END IF;
END;
$$;


ALTER FUNCTION "storage"."search_v2"("prefix" "text", "bucket_name" "text", "limits" integer, "levels" integer, "start_after" "text", "sort_order" "text", "sort_column" "text", "sort_column_after" "text") OWNER TO "supabase_storage_admin";

--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION "storage"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW; 
END;
$$;


ALTER FUNCTION "storage"."update_updated_at_column"() OWNER TO "supabase_storage_admin";

--
-- Name: secrets_encrypt_secret_secret(); Type: FUNCTION; Schema: vault; Owner: supabase_admin
--

CREATE FUNCTION "vault"."secrets_encrypt_secret_secret"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
		BEGIN
		        new.secret = CASE WHEN new.secret IS NULL THEN NULL ELSE
			CASE WHEN new.key_id IS NULL THEN NULL ELSE pg_catalog.encode(
			  pgsodium.crypto_aead_det_encrypt(
				pg_catalog.convert_to(new.secret, 'utf8'),
				pg_catalog.convert_to((new.id::text || new.description::text || new.created_at::text || new.updated_at::text)::text, 'utf8'),
				new.key_id::uuid,
				new.nonce
			  ),
				'base64') END END;
		RETURN new;
		END;
		$$;


ALTER FUNCTION "vault"."secrets_encrypt_secret_secret"() OWNER TO "supabase_admin";

SET default_tablespace = '';

SET default_table_access_method = "heap";

--
-- Name: feeding_record; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."feeding_record" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "system_id" bigint NOT NULL,
    "feed_type_id" bigint,
    "feeding_amount" double precision NOT NULL,
    "date" "date" NOT NULL,
    "batch_id" bigint,
    "notes" "text",
    "cycle_id" bigint,
    "local_id" "text",
    "feeding_response" smallint,
    "synced_at" timestamp with time zone,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "feeding_amount_check" CHECK ((("feeding_amount" >= (0)::double precision) AND ("feeding_amount" < (1000)::double precision))),
    CONSTRAINT "feeding_response_range_check" CHECK ((("feeding_response" >= 1) AND ("feeding_response" <= 5)))
);


ALTER TABLE "public"."feeding_record" OWNER TO "postgres";

--
-- Name: COLUMN "feeding_record"."feed_type_id"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN "public"."feeding_record"."feed_type_id" IS 'Optional when no feed was given and feeding_amount is 0; required by the app for positive feeding entries.';


--
-- Name: COLUMN "feeding_record"."feeding_response"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN "public"."feeding_record"."feeding_response" IS 'Optional when no feed was given and feeding_amount is 0. Appetite level 1-5 for positive feeding entries.';


--
-- Name: fingerling_batch; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."fingerling_batch" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "supplier_id" bigint NOT NULL,
    "date_of_delivery" "date" NOT NULL,
    "number_of_fish" bigint NOT NULL,
    "abw" double precision NOT NULL,
    "name" "text" NOT NULL,
    "farm_id" "uuid",
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "fingerling_batch_abw_positive" CHECK ((("abw" IS NULL) OR ("abw" > (0)::double precision))),
    CONSTRAINT "fingerling_batch_number_positive" CHECK ((("number_of_fish" IS NULL) OR ("number_of_fish" >= 0)))
);


ALTER TABLE "public"."fingerling_batch" OWNER TO "postgres";

--
-- Name: fish_harvest; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."fish_harvest" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "date" "date" NOT NULL,
    "system_id" bigint NOT NULL,
    "number_of_fish_harvest" bigint NOT NULL,
    "total_weight_harvest" double precision NOT NULL,
    "abw" double precision,
    "type_of_harvest" "public"."type_of_harvest" NOT NULL,
    "batch_id" bigint,
    "cycle_id" bigint,
    "local_id" "text",
    "synced_at" timestamp with time zone,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."fish_harvest" OWNER TO "postgres";

--
-- Name: fish_mortality; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."fish_mortality" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "system_id" bigint NOT NULL,
    "date" "date" NOT NULL,
    "number_of_fish_mortality" bigint NOT NULL,
    "total_weight_mortality" double precision,
    "cause" "public"."mortality_cause" DEFAULT 'unknown'::"public"."mortality_cause" NOT NULL,
    "notes" "text",
    "batch_id" bigint,
    "is_mass_mortality" boolean GENERATED ALWAYS AS (("number_of_fish_mortality" >= 100)) STORED,
    "cycle_id" bigint,
    "local_id" "text",
    "synced_at" timestamp with time zone,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "farm_id" "uuid"
);


ALTER TABLE "public"."fish_mortality" OWNER TO "postgres";

--
-- Name: COLUMN "fish_mortality"."total_weight_mortality"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN "public"."fish_mortality"."total_weight_mortality" IS 'Total dead fish weight in kg. Required for new mass mortality records of 100 or more fish.';


--
-- Name: fish_sampling_weight; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."fish_sampling_weight" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "system_id" bigint NOT NULL,
    "date" "date" NOT NULL,
    "number_of_fish_sampling" bigint NOT NULL,
    "total_weight_sampling" double precision NOT NULL,
    "abw" double precision NOT NULL,
    "batch_id" bigint,
    "notes" "text",
    "cycle_id" bigint,
    "local_id" "text",
    "synced_at" timestamp with time zone,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "fish_sampling_positive_numbers" CHECK ((("number_of_fish_sampling" > 0) AND ("total_weight_sampling" > (0)::double precision) AND ("abw" > (0)::double precision)))
);


ALTER TABLE "public"."fish_sampling_weight" OWNER TO "postgres";

--
-- Name: TABLE "fish_sampling_weight"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE "public"."fish_sampling_weight" IS 'Monthly fish growth sampling records. Each row stores the sampled fish count, total sample weight in kg, and derived ABW in grams for the stocked batch production cycle.';


--
-- Name: COLUMN "fish_sampling_weight"."total_weight_sampling"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN "public"."fish_sampling_weight"."total_weight_sampling" IS 'Total weight of sampled fish in kg.';


--
-- Name: COLUMN "fish_sampling_weight"."abw"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN "public"."fish_sampling_weight"."abw" IS 'Average body weight in grams, derived from total_weight_sampling and number_of_fish_sampling.';


--
-- Name: fish_stocking; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."fish_stocking" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "date" "date" NOT NULL,
    "system_id" bigint NOT NULL,
    "number_of_fish_stocking" bigint NOT NULL,
    "total_weight_stocking" double precision NOT NULL,
    "abw" double precision NOT NULL,
    "batch_id" bigint NOT NULL,
    "type_of_stocking" "public"."type_of_stocking" NOT NULL,
    "notes" "text",
    "cycle_id" bigint NOT NULL,
    "local_id" "text",
    "synced_at" timestamp with time zone,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."fish_stocking" OWNER TO "postgres";

--
-- Name: fish_transfer; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."fish_transfer" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "origin_system_id" bigint,
    "target_system_id" bigint,
    "number_of_fish_transfer" double precision NOT NULL,
    "date" "date" NOT NULL,
    "total_weight_transfer" double precision,
    "abw" double precision,
    "batch_id" bigint,
    "transfer_type" "public"."transfer_type" DEFAULT 'transfer'::"public"."transfer_type" NOT NULL,
    "notes" "text",
    "external_target_name" "text",
    "cycle_id" bigint,
    "local_id" "text",
    "external_origin_name" "text",
    "synced_at" timestamp with time zone,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "chk_fish_transfer_has_system" CHECK ((("origin_system_id" IS NOT NULL) OR ("target_system_id" IS NOT NULL)))
);


ALTER TABLE "public"."fish_transfer" OWNER TO "postgres";

--
-- Name: system; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."system" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "type" "public"."system_type" NOT NULL,
    "growth_stage" "public"."system_growth_stage" NOT NULL,
    "volume" double precision,
    "depth" double precision,
    "name" "text" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "commissioned_at" "date",
    "decommissioned_at" "date",
    "farm_id" "uuid",
    "unit" "text",
    "cage_status" "public"."cage_status_enum",
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."system" OWNER TO "postgres";

--
-- Name: daily_system_facts; Type: MATERIALIZED VIEW; Schema: analytics; Owner: postgres
--

CREATE MATERIALIZED VIEW "analytics"."daily_system_facts" AS
 WITH "activity_dates" AS (
         SELECT "fs"."system_id",
            "fs"."date"
           FROM "public"."fish_stocking" "fs"
        UNION ALL
         SELECT "fm"."system_id",
            "fm"."date"
           FROM "public"."fish_mortality" "fm"
        UNION ALL
         SELECT "fr"."system_id",
            "fr"."date"
           FROM "public"."feeding_record" "fr"
        UNION ALL
         SELECT "fsw"."system_id",
            "fsw"."date"
           FROM "public"."fish_sampling_weight" "fsw"
        UNION ALL
         SELECT "fh"."system_id",
            "fh"."date"
           FROM "public"."fish_harvest" "fh"
        UNION ALL
         SELECT "ft"."target_system_id" AS "system_id",
            "ft"."date"
           FROM "public"."fish_transfer" "ft"
          WHERE ("ft"."target_system_id" IS NOT NULL)
        UNION ALL
         SELECT "ft"."origin_system_id" AS "system_id",
            "ft"."date"
           FROM "public"."fish_transfer" "ft"
          WHERE ("ft"."origin_system_id" IS NOT NULL)
        ), "system_bounds" AS (
         SELECT "s"."id" AS "system_id",
            "s"."volume" AS "system_volume",
            "min"("ad"."date") AS "start_date",
                CASE
                    WHEN ("s"."decommissioned_at" IS NOT NULL) THEN GREATEST(COALESCE("max"("ad"."date"), "s"."decommissioned_at"), "s"."decommissioned_at")
                    ELSE COALESCE("max"("ad"."date"), CURRENT_DATE)
                END AS "end_date"
           FROM ("public"."system" "s"
             LEFT JOIN "activity_dates" "ad" ON (("ad"."system_id" = "s"."id")))
          WHERE ("s"."farm_id" IS NOT NULL)
          GROUP BY "s"."id", "s"."volume", "s"."commissioned_at", "s"."decommissioned_at"
         HAVING ("min"("ad"."date") IS NOT NULL)
        ), "date_spine" AS (
         SELECT "sb"."system_id",
            "sb"."system_volume",
            ("gs"."gs")::"date" AS "inventory_date"
           FROM ("system_bounds" "sb"
             CROSS JOIN LATERAL "generate_series"(("sb"."start_date")::timestamp without time zone, ("sb"."end_date")::timestamp without time zone, '1 day'::interval) "gs"("gs"))
        ), "daily_stocked" AS (
         SELECT "fs"."system_id",
            "fs"."date" AS "inventory_date",
            ("sum"("fs"."number_of_fish_stocking"))::double precision AS "qty_stocked"
           FROM "public"."fish_stocking" "fs"
          GROUP BY "fs"."system_id", "fs"."date"
        ), "daily_mortality" AS (
         SELECT "fm"."system_id",
            "fm"."date" AS "inventory_date",
            ("sum"("fm"."number_of_fish_mortality"))::double precision AS "qty_mortality"
           FROM "public"."fish_mortality" "fm"
          GROUP BY "fm"."system_id", "fm"."date"
        ), "daily_transfer_in" AS (
         SELECT "ft"."target_system_id" AS "system_id",
            "ft"."date" AS "inventory_date",
            "sum"("ft"."number_of_fish_transfer") AS "qty_transfer_in"
           FROM "public"."fish_transfer" "ft"
          WHERE ("ft"."target_system_id" IS NOT NULL)
          GROUP BY "ft"."target_system_id", "ft"."date"
        ), "daily_transfer_out" AS (
         SELECT "ft"."origin_system_id" AS "system_id",
            "ft"."date" AS "inventory_date",
            "sum"("ft"."number_of_fish_transfer") AS "qty_transfer_out"
           FROM "public"."fish_transfer" "ft"
          WHERE ("ft"."origin_system_id" IS NOT NULL)
          GROUP BY "ft"."origin_system_id", "ft"."date"
        ), "daily_harvest" AS (
         SELECT "fh"."system_id",
            "fh"."date" AS "inventory_date",
            ("sum"(COALESCE("fh"."number_of_fish_harvest", (0)::bigint)))::double precision AS "qty_harvested"
           FROM "public"."fish_harvest" "fh"
          GROUP BY "fh"."system_id", "fh"."date"
        ), "daily_feed" AS (
         SELECT "fr"."system_id",
            "fr"."date" AS "inventory_date",
            "sum"("fr"."feeding_amount") AS "feed_kg"
           FROM "public"."feeding_record" "fr"
          GROUP BY "fr"."system_id", "fr"."date"
        ), "daily_events" AS (
         SELECT "ds"."system_id",
            "ds"."system_volume",
            "ds"."inventory_date",
            COALESCE("stk"."qty_stocked", (0)::double precision) AS "fish_stocked_today",
            COALESCE("mort"."qty_mortality", (0)::double precision) AS "fish_died_today",
            COALESCE("tin"."qty_transfer_in", (0)::double precision) AS "fish_transferred_in_today",
            COALESCE("tout"."qty_transfer_out", (0)::double precision) AS "fish_transferred_out_today",
            COALESCE("harv"."qty_harvested", (0)::double precision) AS "fish_harvested_today",
            COALESCE("feed"."feed_kg", (0)::double precision) AS "feeding_amount_today"
           FROM (((((("date_spine" "ds"
             LEFT JOIN "daily_stocked" "stk" ON ((("stk"."system_id" = "ds"."system_id") AND ("stk"."inventory_date" = "ds"."inventory_date"))))
             LEFT JOIN "daily_mortality" "mort" ON ((("mort"."system_id" = "ds"."system_id") AND ("mort"."inventory_date" = "ds"."inventory_date"))))
             LEFT JOIN "daily_transfer_in" "tin" ON ((("tin"."system_id" = "ds"."system_id") AND ("tin"."inventory_date" = "ds"."inventory_date"))))
             LEFT JOIN "daily_transfer_out" "tout" ON ((("tout"."system_id" = "ds"."system_id") AND ("tout"."inventory_date" = "ds"."inventory_date"))))
             LEFT JOIN "daily_harvest" "harv" ON ((("harv"."system_id" = "ds"."system_id") AND ("harv"."inventory_date" = "ds"."inventory_date"))))
             LEFT JOIN "daily_feed" "feed" ON ((("feed"."system_id" = "ds"."system_id") AND ("feed"."inventory_date" = "ds"."inventory_date"))))
        ), "running" AS (
         SELECT "de"."system_id",
            "de"."system_volume",
            "de"."inventory_date",
            "de"."fish_stocked_today",
            "de"."fish_died_today",
            "de"."fish_transferred_in_today",
            "de"."fish_transferred_out_today",
            "de"."fish_harvested_today",
            "de"."feeding_amount_today",
            GREATEST("sum"((((("de"."fish_stocked_today" + "de"."fish_transferred_in_today") - "de"."fish_died_today") - "de"."fish_transferred_out_today") - "de"."fish_harvested_today")) OVER (PARTITION BY "de"."system_id" ORDER BY "de"."inventory_date" ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW), (0)::double precision) AS "number_of_fish"
           FROM "daily_events" "de"
        ), "sampling_anchor" AS (
         SELECT "w"."system_id",
            "w"."date" AS "anchor_date",
            COALESCE(
                CASE
                    WHEN ("sum"("w"."number_of_fish_sampling") FILTER (WHERE ("w"."total_weight_sampling" IS NOT NULL)) > (0)::numeric) THEN (("sum"("w"."total_weight_sampling") FILTER (WHERE ("w"."total_weight_sampling" IS NOT NULL)) * (1000.0)::double precision) / (NULLIF("sum"("w"."number_of_fish_sampling") FILTER (WHERE ("w"."total_weight_sampling" IS NOT NULL)), (0)::numeric))::double precision)
                    ELSE NULL::double precision
                END, "avg"(NULLIF("w"."abw", (0)::double precision))) AS "abw_g",
            1 AS "anchor_priority"
           FROM "public"."fish_sampling_weight" "w"
          GROUP BY "w"."system_id", "w"."date"
        ), "transfer_anchor" AS (
         SELECT "ft"."target_system_id" AS "system_id",
            "ft"."date" AS "anchor_date",
            COALESCE("avg"(NULLIF("ft"."abw", (0)::double precision)),
                CASE
                    WHEN (("sum"("ft"."number_of_fish_transfer") > (0)::double precision) AND ("sum"("ft"."total_weight_transfer") > (0)::double precision)) THEN (("sum"("ft"."total_weight_transfer") * (1000.0)::double precision) / "sum"("ft"."number_of_fish_transfer"))
                    ELSE NULL::double precision
                END) AS "abw_g",
            2 AS "anchor_priority"
           FROM "public"."fish_transfer" "ft"
          WHERE ("ft"."target_system_id" IS NOT NULL)
          GROUP BY "ft"."target_system_id", "ft"."date"
         HAVING (COALESCE("avg"(NULLIF("ft"."abw", (0)::double precision)),
                CASE
                    WHEN (("sum"("ft"."number_of_fish_transfer") > (0)::double precision) AND ("sum"("ft"."total_weight_transfer") > (0)::double precision)) THEN (("sum"("ft"."total_weight_transfer") * (1000.0)::double precision) / "sum"("ft"."number_of_fish_transfer"))
                    ELSE NULL::double precision
                END) IS NOT NULL)
        ), "stocking_anchor" AS (
         SELECT "fs"."system_id",
            "fs"."date" AS "anchor_date",
            COALESCE("avg"(NULLIF("fs"."abw", (0)::double precision)),
                CASE
                    WHEN (("sum"("fs"."number_of_fish_stocking") > (0)::numeric) AND ("sum"("fs"."total_weight_stocking") > (0)::double precision)) THEN (("sum"("fs"."total_weight_stocking") * (1000.0)::double precision) / ("sum"("fs"."number_of_fish_stocking"))::double precision)
                    ELSE NULL::double precision
                END, "avg"(NULLIF("fb"."abw", (0)::double precision))) AS "abw_g",
            3 AS "anchor_priority"
           FROM ("public"."fish_stocking" "fs"
             LEFT JOIN "public"."fingerling_batch" "fb" ON (("fb"."id" = "fs"."batch_id")))
          GROUP BY "fs"."system_id", "fs"."date"
         HAVING (COALESCE("avg"(NULLIF("fs"."abw", (0)::double precision)),
                CASE
                    WHEN (("sum"("fs"."number_of_fish_stocking") > (0)::numeric) AND ("sum"("fs"."total_weight_stocking") > (0)::double precision)) THEN (("sum"("fs"."total_weight_stocking") * (1000.0)::double precision) / ("sum"("fs"."number_of_fish_stocking"))::double precision)
                    ELSE NULL::double precision
                END, "avg"(NULLIF("fb"."abw", (0)::double precision))) IS NOT NULL)
        ), "all_anchors" AS (
         SELECT "sampling_anchor"."system_id",
            "sampling_anchor"."anchor_date",
            "sampling_anchor"."abw_g",
            "sampling_anchor"."anchor_priority"
           FROM "sampling_anchor"
        UNION ALL
         SELECT "transfer_anchor"."system_id",
            "transfer_anchor"."anchor_date",
            "transfer_anchor"."abw_g",
            "transfer_anchor"."anchor_priority"
           FROM "transfer_anchor"
        UNION ALL
         SELECT "stocking_anchor"."system_id",
            "stocking_anchor"."anchor_date",
            "stocking_anchor"."abw_g",
            "stocking_anchor"."anchor_priority"
           FROM "stocking_anchor"
        ), "last_abw" AS (
         SELECT DISTINCT ON ("r"."system_id", "r"."inventory_date") "r"."system_id",
            "r"."inventory_date",
            "a"."anchor_date" AS "last_abw_date",
            "a"."abw_g" AS "abw_last_sampling"
           FROM ("running" "r"
             LEFT JOIN "all_anchors" "a" ON ((("a"."system_id" = "r"."system_id") AND ("a"."anchor_date" <= "r"."inventory_date"))))
          ORDER BY "r"."system_id", "r"."inventory_date", "a"."anchor_date" DESC NULLS LAST, "a"."anchor_priority"
        ), "facts" AS (
         SELECT "r"."inventory_date",
            "r"."system_id",
            "r"."system_volume",
                CASE
                    WHEN ("r"."number_of_fish" > (0)::double precision) THEN ("lineage"."cycle_id")::bigint
                    ELSE NULL::bigint
                END AS "production_cycle_id",
            "lineage"."batch_id",
            "r"."fish_stocked_today",
            "r"."fish_died_today",
            "r"."fish_transferred_in_today",
            "r"."fish_transferred_out_today",
            "r"."fish_harvested_today",
            "r"."feeding_amount_today",
            "r"."number_of_fish",
            "la"."abw_last_sampling",
            "la"."last_abw_date",
                CASE
                    WHEN ("la"."abw_last_sampling" IS NOT NULL) THEN (("la"."abw_last_sampling" * "r"."number_of_fish") / (1000.0)::double precision)
                    ELSE NULL::double precision
                END AS "biomass_kg",
                CASE
                    WHEN (("la"."abw_last_sampling" IS NOT NULL) AND ((("la"."abw_last_sampling" * "r"."number_of_fish") / (1000.0)::double precision) > (0)::double precision)) THEN (("r"."feeding_amount_today" / (("la"."abw_last_sampling" * "r"."number_of_fish") / (1000.0)::double precision)) * (100.0)::double precision)
                    ELSE NULL::double precision
                END AS "feeding_rate",
                CASE
                    WHEN (("r"."system_volume" > (0)::double precision) AND ("la"."abw_last_sampling" IS NOT NULL)) THEN (GREATEST((("la"."abw_last_sampling" * "r"."number_of_fish") / (1000.0)::double precision), (0)::double precision) / "r"."system_volume")
                    ELSE NULL::double precision
                END AS "biomass_density",
                CASE
                    WHEN ("r"."system_volume" > (0)::double precision) THEN ("r"."number_of_fish" / "r"."system_volume")
                    ELSE NULL::double precision
                END AS "fish_density",
                CASE
                    WHEN ("r"."number_of_fish" > (0)::double precision) THEN (("r"."fish_died_today" / "r"."number_of_fish") * (100.0)::double precision)
                    ELSE (0)::double precision
                END AS "mortality_rate"
           FROM (("running" "r"
             LEFT JOIN "last_abw" "la" ON ((("la"."system_id" = "r"."system_id") AND ("la"."inventory_date" = "r"."inventory_date"))))
             LEFT JOIN LATERAL "public"."resolve_cycle_batch_for_system_date"("r"."system_id", "r"."inventory_date") "lineage"("cycle_id", "batch_id") ON (true))
        )
 SELECT "f"."inventory_date",
    "f"."system_id",
    "f"."production_cycle_id",
    "f"."batch_id",
    "f"."fish_stocked_today",
    "f"."fish_died_today",
    "f"."fish_transferred_in_today",
    "f"."fish_transferred_out_today",
    "f"."fish_harvested_today",
    "f"."feeding_amount_today",
    "f"."number_of_fish",
    "f"."abw_last_sampling",
    "f"."last_abw_date",
    "f"."biomass_kg" AS "biomass_last_sampling",
    "f"."feeding_rate",
    "f"."biomass_density",
    "f"."fish_density",
    "f"."mortality_rate",
    "f"."system_volume"
   FROM "facts" "f"
  ORDER BY "f"."system_id", "f"."inventory_date"
  WITH NO DATA;


ALTER MATERIALIZED VIEW "analytics"."daily_system_facts" OWNER TO "postgres";

--
-- Name: production_cycle; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."production_cycle" (
    "cycle_id" bigint NOT NULL,
    "system_id" bigint NOT NULL,
    "cycle_start" "date" NOT NULL,
    "cycle_end" "date",
    "ongoing_cycle" boolean NOT NULL,
    "target_weight_g" numeric,
    "batch_id" bigint NOT NULL,
    "previous_system_id" bigint,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "production_cycle_date_check" CHECK ((("cycle_end" IS NULL) OR ("cycle_end" >= "cycle_start"))),
    CONSTRAINT "production_cycle_end_after_start" CHECK ((("cycle_end" IS NULL) OR ("cycle_end" >= "cycle_start"))),
    CONSTRAINT "production_cycle_ongoing_matches_end" CHECK (("ongoing_cycle" = ("cycle_end" IS NULL))),
    CONSTRAINT "production_cycle_target_weight_g_check" CHECK (("target_weight_g" > (0)::numeric))
);


ALTER TABLE "public"."production_cycle" OWNER TO "postgres";

--
-- Name: COLUMN "production_cycle"."target_weight_g"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN "public"."production_cycle"."target_weight_g" IS 'Target market weight (grams) for this cycle. NULL = use farm/species default (400 g).';


--
-- Name: production_summary; Type: MATERIALIZED VIEW; Schema: analytics; Owner: postgres
--

CREATE MATERIALIZED VIEW "analytics"."production_summary" AS
 WITH "boundaries" AS (
         SELECT "fs"."cycle_id",
            "fs"."system_id",
            "fs"."date" AS "boundary_date",
            'stocking'::"text" AS "boundary_type",
            "avg"("fs"."abw") AS "abw_g",
            ("sum"("fs"."number_of_fish_stocking"))::double precision AS "fish_stocked"
           FROM "public"."fish_stocking" "fs"
          WHERE ("fs"."cycle_id" IS NOT NULL)
          GROUP BY "fs"."cycle_id", "fs"."system_id", "fs"."date"
        UNION ALL
         SELECT "fsw"."cycle_id",
            "fsw"."system_id",
            "fsw"."date" AS "boundary_date",
            'sampling'::"text" AS "boundary_type",
            "avg"("fsw"."abw") AS "abw_g",
            NULL::double precision AS "fish_stocked"
           FROM "public"."fish_sampling_weight" "fsw"
          WHERE ("fsw"."cycle_id" IS NOT NULL)
          GROUP BY "fsw"."cycle_id", "fsw"."system_id", "fsw"."date"
        UNION ALL
         SELECT "ft"."cycle_id",
            "ft"."origin_system_id" AS "system_id",
            "ft"."date" AS "boundary_date",
            'transfer'::"text" AS "boundary_type",
            "ft"."abw" AS "abw_g",
            NULL::double precision AS "fish_stocked"
           FROM "public"."fish_transfer" "ft"
          WHERE ("ft"."cycle_id" IS NOT NULL)
        UNION ALL
         SELECT "pc_t"."cycle_id",
            "ft2"."target_system_id" AS "system_id",
            "ft2"."date" AS "boundary_date",
            'transfer'::"text" AS "boundary_type",
            "ft2"."abw" AS "abw_g",
            NULL::double precision AS "fish_stocked"
           FROM ("public"."fish_transfer" "ft2"
             JOIN "public"."production_cycle" "pc_t" ON ((("pc_t"."system_id" = "ft2"."target_system_id") AND ("ft2"."date" >= "pc_t"."cycle_start") AND (("pc_t"."cycle_end" IS NULL) OR ("ft2"."date" <= "pc_t"."cycle_end")))))
          WHERE ("ft2"."cycle_id" IS NOT NULL)
        ), "boundaries_with_lag" AS (
         SELECT "b"."cycle_id",
            "b"."system_id",
            "b"."boundary_date",
            "b"."boundary_type",
            "b"."abw_g",
            "b"."fish_stocked",
            "lag"("b"."boundary_date") OVER (PARTITION BY "b"."cycle_id", "b"."system_id" ORDER BY "b"."boundary_date") AS "prev_boundary_date",
            "lag"("b"."abw_g") OVER (PARTITION BY "b"."cycle_id", "b"."system_id" ORDER BY "b"."boundary_date") AS "abw_prev"
           FROM "boundaries" "b"
        ), "boundaries_with_facts" AS (
         SELECT "bl"."cycle_id",
            "bl"."system_id",
            "bl"."boundary_date",
            "bl"."boundary_type",
            "bl"."abw_g",
            "bl"."fish_stocked",
            "bl"."prev_boundary_date",
            "bl"."abw_prev",
            "dsf_curr"."number_of_fish" AS "fish_count_current",
            "dsf_prev"."number_of_fish" AS "fish_count_prev",
            "s"."volume" AS "system_volume"
           FROM ((("boundaries_with_lag" "bl"
             JOIN "public"."system" "s" ON (("s"."id" = "bl"."system_id")))
             LEFT JOIN "analytics"."daily_system_facts" "dsf_curr" ON ((("dsf_curr"."system_id" = "bl"."system_id") AND ("dsf_curr"."inventory_date" = "bl"."boundary_date"))))
             LEFT JOIN "analytics"."daily_system_facts" "dsf_prev" ON ((("dsf_prev"."system_id" = "bl"."system_id") AND ("dsf_prev"."inventory_date" = "bl"."prev_boundary_date"))))
        ), "period_flows" AS (
         SELECT "bf"."cycle_id",
            "bf"."system_id",
            "bf"."boundary_date",
                CASE
                    WHEN ("bf"."prev_boundary_date" IS NULL) THEN (0)::double precision
                    ELSE COALESCE(( SELECT ("sum"("fm"."number_of_fish_mortality"))::double precision AS "sum"
                       FROM "public"."fish_mortality" "fm"
                      WHERE (("fm"."system_id" = "bf"."system_id") AND ("fm"."cycle_id" = "bf"."cycle_id") AND ("fm"."date" > "bf"."prev_boundary_date") AND ("fm"."date" <= "bf"."boundary_date"))), (0)::double precision)
                END AS "mortality_over_period",
                CASE
                    WHEN ("bf"."prev_boundary_date" IS NULL) THEN (0)::double precision
                    ELSE COALESCE(( SELECT "sum"("fr"."feeding_amount") AS "sum"
                       FROM "public"."feeding_record" "fr"
                      WHERE (("fr"."system_id" = "bf"."system_id") AND ("fr"."cycle_id" = "bf"."cycle_id") AND ("fr"."date" > "bf"."prev_boundary_date") AND ("fr"."date" <= "bf"."boundary_date"))), (0)::double precision)
                END AS "feed_over_period",
                CASE
                    WHEN ("bf"."prev_boundary_date" IS NULL) THEN COALESCE(( SELECT "sum"("ft"."number_of_fish_transfer") AS "sum"
                       FROM "public"."fish_transfer" "ft"
                      WHERE (("ft"."target_system_id" = "bf"."system_id") AND ("ft"."cycle_id" = "bf"."cycle_id") AND ("ft"."date" <= "bf"."boundary_date") AND "public"."transfer_impacts_efcr"("ft"."transfer_type", "ft"."origin_system_id", "ft"."target_system_id"))), (0)::double precision)
                    ELSE COALESCE(( SELECT "sum"("ft"."number_of_fish_transfer") AS "sum"
                       FROM "public"."fish_transfer" "ft"
                      WHERE (("ft"."target_system_id" = "bf"."system_id") AND ("ft"."cycle_id" = "bf"."cycle_id") AND ("ft"."date" > "bf"."prev_boundary_date") AND ("ft"."date" <= "bf"."boundary_date") AND "public"."transfer_impacts_efcr"("ft"."transfer_type", "ft"."origin_system_id", "ft"."target_system_id"))), (0)::double precision)
                END AS "transfers_in_over_period",
                CASE
                    WHEN ("bf"."prev_boundary_date" IS NULL) THEN COALESCE(( SELECT "sum"("ft"."number_of_fish_transfer") AS "sum"
                       FROM "public"."fish_transfer" "ft"
                      WHERE (("ft"."origin_system_id" = "bf"."system_id") AND ("ft"."cycle_id" = "bf"."cycle_id") AND ("ft"."date" <= "bf"."boundary_date") AND "public"."transfer_impacts_efcr"("ft"."transfer_type", "ft"."origin_system_id", "ft"."target_system_id"))), (0)::double precision)
                    ELSE COALESCE(( SELECT "sum"("ft"."number_of_fish_transfer") AS "sum"
                       FROM "public"."fish_transfer" "ft"
                      WHERE (("ft"."origin_system_id" = "bf"."system_id") AND ("ft"."cycle_id" = "bf"."cycle_id") AND ("ft"."date" > "bf"."prev_boundary_date") AND ("ft"."date" <= "bf"."boundary_date") AND "public"."transfer_impacts_efcr"("ft"."transfer_type", "ft"."origin_system_id", "ft"."target_system_id"))), (0)::double precision)
                END AS "transfers_out_over_period",
                CASE
                    WHEN ("bf"."prev_boundary_date" IS NULL) THEN COALESCE(( SELECT "sum"("public"."transfer_weight_kg"("ft"."total_weight_transfer", "ft"."number_of_fish_transfer", "ft"."abw")) AS "sum"
                       FROM "public"."fish_transfer" "ft"
                      WHERE (("ft"."target_system_id" = "bf"."system_id") AND ("ft"."cycle_id" = "bf"."cycle_id") AND ("ft"."date" <= "bf"."boundary_date") AND "public"."transfer_impacts_efcr"("ft"."transfer_type", "ft"."origin_system_id", "ft"."target_system_id"))), (0)::double precision)
                    ELSE COALESCE(( SELECT "sum"("public"."transfer_weight_kg"("ft"."total_weight_transfer", "ft"."number_of_fish_transfer", "ft"."abw")) AS "sum"
                       FROM "public"."fish_transfer" "ft"
                      WHERE (("ft"."target_system_id" = "bf"."system_id") AND ("ft"."cycle_id" = "bf"."cycle_id") AND ("ft"."date" > "bf"."prev_boundary_date") AND ("ft"."date" <= "bf"."boundary_date") AND "public"."transfer_impacts_efcr"("ft"."transfer_type", "ft"."origin_system_id", "ft"."target_system_id"))), (0)::double precision)
                END AS "weight_transfer_in_kg_period",
                CASE
                    WHEN ("bf"."prev_boundary_date" IS NULL) THEN COALESCE(( SELECT "sum"("public"."transfer_weight_kg"("ft"."total_weight_transfer", "ft"."number_of_fish_transfer", "ft"."abw")) AS "sum"
                       FROM "public"."fish_transfer" "ft"
                      WHERE (("ft"."origin_system_id" = "bf"."system_id") AND ("ft"."cycle_id" = "bf"."cycle_id") AND ("ft"."date" <= "bf"."boundary_date") AND "public"."transfer_impacts_efcr"("ft"."transfer_type", "ft"."origin_system_id", "ft"."target_system_id"))), (0)::double precision)
                    ELSE COALESCE(( SELECT "sum"("public"."transfer_weight_kg"("ft"."total_weight_transfer", "ft"."number_of_fish_transfer", "ft"."abw")) AS "sum"
                       FROM "public"."fish_transfer" "ft"
                      WHERE (("ft"."origin_system_id" = "bf"."system_id") AND ("ft"."cycle_id" = "bf"."cycle_id") AND ("ft"."date" > "bf"."prev_boundary_date") AND ("ft"."date" <= "bf"."boundary_date") AND "public"."transfer_impacts_efcr"("ft"."transfer_type", "ft"."origin_system_id", "ft"."target_system_id"))), (0)::double precision)
                END AS "weight_transfer_out_kg_period",
                CASE
                    WHEN ("bf"."prev_boundary_date" IS NULL) THEN (0)::double precision
                    ELSE COALESCE(( SELECT ("sum"(COALESCE("fh"."number_of_fish_harvest", (0)::bigint)))::double precision AS "sum"
                       FROM "public"."fish_harvest" "fh"
                      WHERE (("fh"."system_id" = "bf"."system_id") AND ("fh"."cycle_id" = "bf"."cycle_id") AND ("fh"."date" > "bf"."prev_boundary_date") AND ("fh"."date" <= "bf"."boundary_date"))), (0)::double precision)
                END AS "harvest_fish_over_period",
                CASE
                    WHEN ("bf"."prev_boundary_date" IS NULL) THEN (0)::double precision
                    ELSE COALESCE(( SELECT "sum"("fh"."total_weight_harvest") AS "sum"
                       FROM "public"."fish_harvest" "fh"
                      WHERE (("fh"."system_id" = "bf"."system_id") AND ("fh"."cycle_id" = "bf"."cycle_id") AND ("fh"."date" > "bf"."prev_boundary_date") AND ("fh"."date" <= "bf"."boundary_date"))), (0)::double precision)
                END AS "harvest_weight_kg_over_period"
           FROM "boundaries_with_facts" "bf"
        ), "combined" AS (
         SELECT "bf"."cycle_id",
            "bf"."system_id",
            "bf"."boundary_date" AS "sampling_date",
            "bf"."boundary_type",
            "bf"."prev_boundary_date",
                CASE
                    WHEN ("bf"."prev_boundary_date" IS NULL) THEN 0
                    ELSE ("bf"."boundary_date" - "bf"."prev_boundary_date")
                END AS "days_in_period",
            "bf"."abw_g" AS "abw_current",
            "bf"."abw_prev",
                CASE
                    WHEN (("bf"."prev_boundary_date" IS NULL) AND ("bf"."fish_stocked" IS NOT NULL)) THEN "bf"."fish_stocked"
                    WHEN ("bf"."prev_boundary_date" IS NULL) THEN "bf"."fish_count_current"
                    ELSE "bf"."fish_count_prev"
                END AS "fish_count_start",
                CASE
                    WHEN (("bf"."prev_boundary_date" IS NULL) AND ("bf"."fish_stocked" IS NOT NULL)) THEN "bf"."fish_stocked"
                    WHEN ("bf"."prev_boundary_date" IS NULL) THEN "bf"."fish_count_current"
                    ELSE "bf"."fish_count_current"
                END AS "fish_count_end",
                CASE
                    WHEN (("bf"."prev_boundary_date" IS NULL) AND ("bf"."fish_stocked" IS NOT NULL) AND ("bf"."abw_g" IS NOT NULL)) THEN (("bf"."fish_stocked" * "bf"."abw_g") / (1000.0)::double precision)
                    WHEN (("bf"."fish_count_current" IS NOT NULL) AND ("bf"."abw_g" IS NOT NULL)) THEN (("bf"."fish_count_current" * "bf"."abw_g") / (1000.0)::double precision)
                    ELSE NULL::double precision
                END AS "total_weight_kg",
                CASE
                    WHEN (("bf"."prev_boundary_date" IS NULL) AND ("bf"."fish_stocked" IS NOT NULL) AND ("bf"."abw_g" IS NOT NULL)) THEN (("bf"."fish_stocked" * "bf"."abw_g") / (1000.0)::double precision)
                    WHEN (("bf"."fish_count_current" IS NOT NULL) AND ("bf"."abw_g" IS NOT NULL)) THEN (("bf"."fish_count_current" * "bf"."abw_g") / (1000.0)::double precision)
                    ELSE NULL::double precision
                END AS "biomass_current",
                CASE
                    WHEN ("bf"."prev_boundary_date" IS NULL) THEN NULL::double precision
                    ELSE (("bf"."fish_count_prev" * "bf"."abw_prev") / (1000.0)::double precision)
                END AS "biomass_prev",
            "bf"."system_volume",
            "pf"."mortality_over_period",
            "pf"."feed_over_period",
            "pf"."transfers_in_over_period",
            "pf"."transfers_out_over_period",
            "pf"."weight_transfer_in_kg_period",
            "pf"."weight_transfer_out_kg_period",
            "pf"."harvest_fish_over_period",
            "pf"."harvest_weight_kg_over_period"
           FROM ("boundaries_with_facts" "bf"
             JOIN "period_flows" "pf" ON ((("pf"."cycle_id" = "bf"."cycle_id") AND ("pf"."system_id" = "bf"."system_id") AND ("pf"."boundary_date" = "bf"."boundary_date"))))
        ), "with_kpis" AS (
         SELECT "c"."cycle_id",
            "c"."system_id",
            "c"."sampling_date",
            "c"."boundary_type",
            "c"."prev_boundary_date",
            "c"."days_in_period",
            "c"."abw_current",
            "c"."abw_prev",
            "c"."fish_count_start",
            "c"."fish_count_end",
            "c"."total_weight_kg",
            "c"."biomass_current",
            "c"."biomass_prev",
            "c"."system_volume",
            "c"."mortality_over_period",
            "c"."feed_over_period",
            "c"."transfers_in_over_period",
            "c"."transfers_out_over_period",
            "c"."weight_transfer_in_kg_period",
            "c"."weight_transfer_out_kg_period",
            "c"."harvest_fish_over_period",
            "c"."harvest_weight_kg_over_period",
                CASE
                    WHEN ("c"."prev_boundary_date" IS NULL) THEN (0)::double precision
                    WHEN (("c"."total_weight_kg" IS NULL) OR ("c"."biomass_prev" IS NULL)) THEN (0)::double precision
                    ELSE ("c"."total_weight_kg" - "c"."biomass_prev")
                END AS "biomass_increase_over_period",
                CASE
                    WHEN ("c"."prev_boundary_date" IS NULL) THEN NULL::double precision
                    WHEN (("c"."total_weight_kg" IS NULL) OR ("c"."biomass_prev" IS NULL)) THEN NULL::double precision
                    ELSE (((("c"."total_weight_kg" - "c"."biomass_prev") + "c"."weight_transfer_out_kg_period") - "c"."weight_transfer_in_kg_period") + "c"."harvest_weight_kg_over_period")
                END AS "efcr_denominator_period",
            "sum"("c"."feed_over_period") OVER "w_sys" AS "feed_aggregated",
            "sum"("c"."mortality_over_period") OVER "w_sys" AS "cumulative_mortality",
            "sum"("c"."transfers_in_over_period") OVER "w_sys" AS "transfers_in_aggregated",
            "sum"("c"."transfers_out_over_period") OVER "w_sys" AS "transfers_out_aggregated",
            "sum"("c"."harvest_fish_over_period") OVER "w_sys" AS "harvest_fish_aggregated",
            "sum"("c"."harvest_weight_kg_over_period") OVER "w_sys" AS "harvest_weight_kg_aggregated"
           FROM "combined" "c"
          WINDOW "w_sys" AS (PARTITION BY "c"."cycle_id", "c"."system_id" ORDER BY "c"."sampling_date" ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)
        ), "with_cumulative" AS (
         SELECT "w1"."cycle_id",
            "w1"."system_id",
            "w1"."sampling_date",
            "w1"."boundary_type",
            "w1"."prev_boundary_date",
            "w1"."days_in_period",
            "w1"."abw_current",
            "w1"."abw_prev",
            "w1"."fish_count_start",
            "w1"."fish_count_end",
            "w1"."total_weight_kg",
            "w1"."biomass_current",
            "w1"."biomass_prev",
            "w1"."system_volume",
            "w1"."mortality_over_period",
            "w1"."feed_over_period",
            "w1"."transfers_in_over_period",
            "w1"."transfers_out_over_period",
            "w1"."weight_transfer_in_kg_period",
            "w1"."weight_transfer_out_kg_period",
            "w1"."harvest_fish_over_period",
            "w1"."harvest_weight_kg_over_period",
            "w1"."biomass_increase_over_period",
            "w1"."efcr_denominator_period",
            "w1"."feed_aggregated",
            "w1"."cumulative_mortality",
            "w1"."transfers_in_aggregated",
            "w1"."transfers_out_aggregated",
            "w1"."harvest_fish_aggregated",
            "w1"."harvest_weight_kg_aggregated",
            "sum"("w1"."biomass_increase_over_period") OVER "w_sys2" AS "cumulative_biomass",
            "sum"(COALESCE("w1"."efcr_denominator_period", (0)::double precision)) OVER "w_sys2" AS "efcr_denominator_aggregated"
           FROM "with_kpis" "w1"
          WINDOW "w_sys2" AS (PARTITION BY "w1"."cycle_id", "w1"."system_id" ORDER BY "w1"."sampling_date" ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)
        )
 SELECT "w"."cycle_id",
    "w"."system_id",
    "w"."sampling_date" AS "date",
    "w"."boundary_type" AS "activity",
    "w"."days_in_period",
    "w"."abw_current" AS "average_body_weight",
    "w"."fish_count_start" AS "number_of_fish_start",
    "w"."fish_count_end" AS "number_of_fish_end",
    "w"."total_weight_kg",
    "w"."mortality_over_period",
    "w"."feed_over_period",
    "w"."feed_aggregated",
    "w"."transfers_in_over_period",
    "w"."transfers_out_over_period",
    "w"."biomass_increase_over_period",
    "w"."cumulative_biomass",
    "w"."harvest_fish_over_period",
    "w"."harvest_weight_kg_over_period",
        CASE
            WHEN ("w"."prev_boundary_date" IS NULL) THEN (0)::double precision
            WHEN (("w"."efcr_denominator_period" > (0)::double precision) AND ("w"."feed_over_period" > (0)::double precision)) THEN ("w"."feed_over_period" / "w"."efcr_denominator_period")
            ELSE NULL::double precision
        END AS "efcr_period",
        CASE
            WHEN (("w"."efcr_denominator_aggregated" > (0)::double precision) AND ("w"."feed_aggregated" > (0)::double precision)) THEN ("w"."feed_aggregated" / "w"."efcr_denominator_aggregated")
            ELSE NULL::double precision
        END AS "efcr_aggregated",
        CASE
            WHEN ("w"."prev_boundary_date" IS NULL) THEN (0)::double precision
            WHEN (("w"."abw_current" IS NULL) OR ("w"."abw_prev" IS NULL) OR ("w"."abw_prev" <= (0)::double precision) OR ("w"."days_in_period" = 0)) THEN NULL::double precision
            ELSE ((("ln"("w"."abw_current") - "ln"("w"."abw_prev")) / ("w"."days_in_period")::double precision) * (100.0)::double precision)
        END AS "sgr",
        CASE
            WHEN ("w"."prev_boundary_date" IS NULL) THEN (0)::double precision
            WHEN (("w"."abw_current" IS NULL) OR ("w"."abw_prev" IS NULL) OR ("w"."days_in_period" = 0)) THEN NULL::double precision
            ELSE (("w"."abw_current" - "w"."abw_prev") / ("w"."days_in_period")::double precision)
        END AS "agr",
    "w"."cumulative_mortality",
    "w"."transfers_in_aggregated",
    "w"."transfers_out_aggregated",
    "w"."harvest_fish_aggregated",
    "w"."harvest_weight_kg_aggregated"
   FROM "with_cumulative" "w"
  ORDER BY "w"."cycle_id", "w"."system_id", "w"."sampling_date"
  WITH NO DATA;


ALTER MATERIALIZED VIEW "analytics"."production_summary" OWNER TO "postgres";

--
-- Name: efcr_trend; Type: VIEW; Schema: analytics; Owner: postgres
--

CREATE VIEW "analytics"."efcr_trend" AS
 SELECT "s"."farm_id",
    "ps"."system_id",
    "s"."name" AS "system_name",
    "ps"."date",
    ("ps"."efcr_period")::numeric AS "efcr_period"
   FROM ("analytics"."production_summary" "ps"
     JOIN "public"."system" "s" ON (("s"."id" = "ps"."system_id")))
  WHERE (("s"."farm_id" IS NOT NULL) AND ("ps"."efcr_period" IS NOT NULL));


ALTER VIEW "analytics"."efcr_trend" OWNER TO "postgres";

--
-- Name: VIEW "efcr_trend"; Type: COMMENT; Schema: analytics; Owner: postgres
--

COMMENT ON VIEW "analytics"."efcr_trend" IS 'Daily eFCR trend rows sourced from production_summary for feed dashboard use.';


--
-- Name: feeding_model_output; Type: MATERIALIZED VIEW; Schema: analytics; Owner: postgres
--

CREATE MATERIALIZED VIEW "analytics"."feeding_model_output" AS
 WITH "base_state" AS (
         SELECT "dsf"."inventory_date" AS "date",
            "dsf"."system_id",
            "sys"."farm_id",
            "dsf"."production_cycle_id",
            "dsf"."batch_id",
            ("dsf"."number_of_fish")::numeric AS "fish_count",
            ("dsf"."abw_last_sampling")::numeric AS "abw_g",
            ("dsf"."biomass_last_sampling")::numeric AS "biomass_kg",
            "dsf"."last_abw_date",
            ("dsf"."feeding_amount_today")::numeric AS "actual_feed_kg",
            ("dsf"."mortality_rate")::numeric AS "mortality_rate_pct",
            ("dsf"."fish_density")::numeric AS "fish_density",
            ("dsf"."biomass_density")::numeric AS "biomass_density",
            ("dsf"."system_volume")::numeric AS "system_volume"
           FROM ("analytics"."daily_system_facts" "dsf"
             JOIN "public"."system" "sys" ON (("sys"."id" = "dsf"."system_id")))
          WHERE (("sys"."farm_id" IS NOT NULL) AND (COALESCE("dsf"."number_of_fish", (0)::double precision) > (0)::double precision))
        ), "projected" AS (
         SELECT "b"."date",
            "b"."system_id",
            "b"."farm_id",
            "b"."production_cycle_id",
            "b"."batch_id",
            "b"."fish_count",
            "b"."abw_g",
            "b"."biomass_kg",
            "b"."last_abw_date",
            "b"."actual_feed_kg",
            "b"."mortality_rate_pct",
            "b"."fish_density",
            "b"."biomass_density",
            "b"."system_volume",
            ("b"."date" - "b"."last_abw_date") AS "days_since_last_sample",
            LEAST(("b"."date" - "b"."last_abw_date"), 21) AS "days_capped",
                CASE
                    WHEN (("b"."abw_g" IS NULL) OR ("b"."last_abw_date" IS NULL)) THEN "b"."abw_g"
                    ELSE "round"(("b"."abw_g" * "power"((1.0 + ("gp_sgr"."sgr_pct_per_day" / 100.0)), (LEAST(("b"."date" - "b"."last_abw_date"), 21))::numeric)), 3)
                END AS "abw_projected_g",
                CASE
                    WHEN ("b"."abw_g" IS NULL) THEN NULL::numeric
                    WHEN (("b"."date" - "b"."last_abw_date") <= 10) THEN "b"."abw_g"
                    ELSE "round"(("b"."abw_g" * "power"((1.0 + ("gp_sgr"."sgr_pct_per_day" / 100.0)), (LEAST(("b"."date" - "b"."last_abw_date"), 21))::numeric)), 3)
                END AS "phase_abw"
           FROM ("base_state" "b"
             LEFT JOIN LATERAL "public"."classify_growth_phase"("b"."abw_g", 'main'::"text") "gp_sgr"("phase_id", "scenario", "abw_min_g", "abw_max_g", "sgr_pct_per_day") ON (true))
        ), "daily_response" AS (
         SELECT "ranked"."system_id",
            "ranked"."date",
            "ranked"."feeding_response"
           FROM ( SELECT "fr"."system_id",
                    "fr"."date",
                    "fr"."feeding_response",
                    "row_number"() OVER (PARTITION BY "fr"."system_id", "fr"."date" ORDER BY "fr"."created_at" DESC) AS "rn"
                   FROM "public"."feeding_record" "fr"
                  WHERE ("fr"."feeding_response" IS NOT NULL)) "ranked"
          WHERE ("ranked"."rn" = 1)
        ), "classified" AS (
         SELECT "p"."date",
            "p"."system_id",
            "p"."farm_id",
            "p"."production_cycle_id",
            "p"."batch_id",
            "p"."fish_count",
            "p"."abw_g",
            "p"."abw_projected_g",
            "p"."phase_abw",
            "p"."biomass_kg",
            "p"."last_abw_date",
            "p"."days_since_last_sample",
            "p"."days_capped",
            "p"."actual_feed_kg",
            "p"."mortality_rate_pct",
            "p"."fish_density",
            "p"."biomass_density",
            "p"."system_volume",
            COALESCE(("dr"."feeding_response")::integer, 3) AS "last_feeding_response",
            'main'::"text" AS "scenario",
            "gp"."phase_id",
            "gp"."sgr_pct_per_day"
           FROM (("projected" "p"
             LEFT JOIN LATERAL "public"."classify_growth_phase"("p"."phase_abw", 'main'::"text") "gp"("phase_id", "scenario", "abw_min_g", "abw_max_g", "sgr_pct_per_day") ON (true))
             LEFT JOIN "daily_response" "dr" ON ((("dr"."system_id" = "p"."system_id") AND ("dr"."date" = "p"."date"))))
        ), "configured" AS (
         SELECT "c"."date",
            "c"."system_id",
            "c"."farm_id",
            "c"."production_cycle_id",
            "c"."batch_id",
            "c"."fish_count",
            "c"."abw_g",
            "c"."abw_projected_g",
            "c"."phase_abw",
            "c"."biomass_kg",
            "c"."last_abw_date",
            "c"."days_since_last_sample",
            "c"."days_capped",
            "c"."actual_feed_kg",
            "c"."mortality_rate_pct",
            "c"."fish_density",
            "c"."biomass_density",
            "c"."system_volume",
            "c"."last_feeding_response",
            "c"."scenario",
            "c"."phase_id",
            "c"."sgr_pct_per_day",
            "frc"."version" AS "model_version",
            "frc"."feed_rate_min_pct",
            "frc"."feed_rate_max_pct",
            "frc"."feed_rate_mid_pct" AS "feeding_rate_mid_pct"
           FROM ("classified" "c"
             LEFT JOIN LATERAL "public"."resolve_feeding_rate_config"("c"."phase_id", "c"."date", "c"."scenario") "frc"("config_id", "version", "scenario", "phase_id", "abw_min_g", "abw_max_g", "feed_rate_min_pct", "feed_rate_max_pct", "feed_rate_mid_pct", "valid_from", "valid_to") ON (true))
        ), "mortality_signal" AS (
         SELECT "c"."system_id",
            "c"."date",
            ("avg"(COALESCE("d2"."mortality_rate", (0)::double precision)))::numeric AS "avg_mortality_rate_7d"
           FROM ("configured" "c"
             JOIN "analytics"."daily_system_facts" "d2" ON ((("d2"."system_id" = "c"."system_id") AND ("d2"."inventory_date" >= ("c"."date" - 6)) AND ("d2"."inventory_date" <= "c"."date"))))
          GROUP BY "c"."system_id", "c"."date"
        ), "with_signals" AS (
         SELECT "c"."date",
            "c"."system_id",
            "c"."farm_id",
            "c"."production_cycle_id",
            "c"."batch_id",
            "c"."fish_count",
            "c"."abw_g",
            "c"."abw_projected_g",
            "c"."phase_abw",
            "c"."biomass_kg",
            "c"."last_abw_date",
            "c"."days_since_last_sample",
            "c"."days_capped",
            "c"."actual_feed_kg",
            "c"."mortality_rate_pct",
            "c"."fish_density",
            "c"."biomass_density",
            "c"."system_volume",
            "c"."last_feeding_response",
            "c"."scenario",
            "c"."phase_id",
            "c"."sgr_pct_per_day",
            "c"."model_version",
            "c"."feed_rate_min_pct",
            "c"."feed_rate_max_pct",
            "c"."feeding_rate_mid_pct",
            COALESCE("ms"."avg_mortality_rate_7d", (0)::numeric) AS "avg_mortality_rate_7d",
            "round"((((COALESCE("c"."last_feeding_response", 3))::numeric - 1.0) / 4.0), 4) AS "response_factor",
            "round"((1.0 - LEAST((COALESCE("ms"."avg_mortality_rate_7d", (0)::numeric) / 2.0), 1.0)), 4) AS "mortality_factor"
           FROM ("configured" "c"
             LEFT JOIN "mortality_signal" "ms" ON ((("ms"."system_id" = "c"."system_id") AND ("ms"."date" = "c"."date"))))
        ), "with_planned" AS (
         SELECT "s"."date",
            "s"."system_id",
            "s"."farm_id",
            "s"."production_cycle_id",
            "s"."batch_id",
            "s"."fish_count",
            "s"."abw_g",
            "s"."abw_projected_g",
            "s"."phase_abw",
            "s"."biomass_kg",
            "s"."last_abw_date",
            "s"."days_since_last_sample",
            "s"."days_capped",
            "s"."actual_feed_kg",
            "s"."mortality_rate_pct",
            "s"."fish_density",
            "s"."biomass_density",
            "s"."system_volume",
            "s"."last_feeding_response",
            "s"."scenario",
            "s"."phase_id",
            "s"."sgr_pct_per_day",
            "s"."model_version",
            "s"."feed_rate_min_pct",
            "s"."feed_rate_max_pct",
            "s"."feeding_rate_mid_pct",
            "s"."avg_mortality_rate_7d",
            "s"."response_factor",
            "s"."mortality_factor",
            "round"(("s"."feed_rate_min_pct" + ((("s"."feed_rate_max_pct" - "s"."feed_rate_min_pct") * "s"."response_factor") * "s"."mortality_factor")), 4) AS "feeding_rate_pct",
            "round"((("s"."biomass_kg" * ("s"."feed_rate_min_pct" + ((("s"."feed_rate_max_pct" - "s"."feed_rate_min_pct") * "s"."response_factor") * "s"."mortality_factor"))) / 100.0), 3) AS "planned_feed_kg"
           FROM "with_signals" "s"
        ), "with_adjusted" AS (
         SELECT "w"."date",
            "w"."system_id",
            "w"."farm_id",
            "w"."production_cycle_id",
            "w"."batch_id",
            "w"."fish_count",
            "w"."abw_g",
            "w"."abw_projected_g",
            "w"."phase_abw",
            "w"."biomass_kg",
            "w"."last_abw_date",
            "w"."days_since_last_sample",
            "w"."days_capped",
            "w"."actual_feed_kg",
            "w"."mortality_rate_pct",
            "w"."fish_density",
            "w"."biomass_density",
            "w"."system_volume",
            "w"."last_feeding_response",
            "w"."scenario",
            "w"."phase_id",
            "w"."sgr_pct_per_day",
            "w"."model_version",
            "w"."feed_rate_min_pct",
            "w"."feed_rate_max_pct",
            "w"."feeding_rate_mid_pct",
            "w"."avg_mortality_rate_7d",
            "w"."response_factor",
            "w"."mortality_factor",
            "w"."feeding_rate_pct",
            "w"."planned_feed_kg",
            "lag"("w"."actual_feed_kg") OVER (PARTITION BY "w"."system_id" ORDER BY "w"."date") AS "actual_feed_prev",
            "lag"("w"."planned_feed_kg") OVER (PARTITION BY "w"."system_id" ORDER BY "w"."date") AS "planned_feed_prev",
            "round"(("w"."planned_feed_kg" * GREATEST(0.85, LEAST(1.15, ("lag"("w"."actual_feed_kg") OVER (PARTITION BY "w"."system_id" ORDER BY "w"."date") / NULLIF("lag"("w"."planned_feed_kg") OVER (PARTITION BY "w"."system_id" ORDER BY "w"."date"), (0)::numeric))))), 3) AS "adjusted_feed_kg"
           FROM "with_planned" "w"
        )
 SELECT "a"."system_id",
    "a"."date",
    "a"."model_version",
    "a"."scenario",
    "a"."phase_id",
    "round"("a"."biomass_kg", 3) AS "biomass_kg",
    "round"("a"."abw_g", 3) AS "abw_g",
    "round"("a"."abw_projected_g", 3) AS "abw_projected_g",
    "a"."feeding_rate_pct",
    "a"."planned_feed_kg",
    COALESCE("a"."adjusted_feed_kg", "a"."planned_feed_kg") AS "adjusted_feed_kg",
    "a"."response_factor",
    "a"."mortality_factor",
        CASE
            WHEN (("a"."abw_g" IS NULL) OR ("a"."last_abw_date" IS NULL)) THEN 'LOW'::"text"
            WHEN ("a"."days_since_last_sample" > 30) THEN 'LOW'::"text"
            WHEN (COALESCE("a"."biomass_density", (0)::numeric) > (80)::numeric) THEN 'LOW'::"text"
            WHEN (("a"."days_since_last_sample" <= 10) AND (COALESCE("a"."avg_mortality_rate_7d", (0)::numeric) <= 0.5)) THEN 'HIGH'::"text"
            WHEN (("a"."days_since_last_sample" <= 21) AND (COALESCE("a"."avg_mortality_rate_7d", (0)::numeric) <= 1.5)) THEN 'MEDIUM'::"text"
            ELSE 'LOW'::"text"
        END AS "confidence"
   FROM "with_adjusted" "a"
  ORDER BY "a"."system_id", "a"."date"
  WITH NO DATA;


ALTER MATERIALIZED VIEW "analytics"."feeding_model_output" OWNER TO "postgres";

--
-- Name: feed_dashboard_kpis; Type: VIEW; Schema: analytics; Owner: postgres
--

CREATE VIEW "analytics"."feed_dashboard_kpis" AS
 WITH "base" AS (
         SELECT "s"."farm_id",
            "fmo"."system_id",
            "fmo"."date",
            "fmo"."planned_feed_kg",
            ("dsf"."feeding_amount_today")::numeric AS "actual_feed_kg",
            "fmo"."feeding_rate_pct"
           FROM (("analytics"."feeding_model_output" "fmo"
             JOIN "public"."system" "s" ON (("s"."id" = "fmo"."system_id")))
             LEFT JOIN "analytics"."daily_system_facts" "dsf" ON ((("dsf"."system_id" = "fmo"."system_id") AND ("dsf"."inventory_date" = "fmo"."date"))))
          WHERE ("s"."farm_id" IS NOT NULL)
        ), "daily" AS (
         SELECT "base"."farm_id",
            "base"."date",
            "sum"(COALESCE("base"."actual_feed_kg", (0)::numeric)) AS "feed_used_today_kg",
            "sum"(COALESCE("base"."planned_feed_kg", (0)::numeric)) AS "planned_feed_today_kg",
                CASE
                    WHEN ("sum"(COALESCE("base"."planned_feed_kg", (0)::numeric)) = (0)::numeric) THEN NULL::numeric
                    ELSE "round"((("sum"(COALESCE("base"."actual_feed_kg", (0)::numeric)) / "sum"(COALESCE("base"."planned_feed_kg", (0)::numeric))) * 100.0), 2)
                END AS "plan_vs_actual_pct",
            "round"("avg"("base"."feeding_rate_pct"), 2) AS "avg_feeding_rate_pct",
            "count"(*) FILTER (WHERE (COALESCE("base"."actual_feed_kg", (0)::numeric) > (COALESCE("base"."planned_feed_kg", (0)::numeric) * 1.10))) AS "overfeeding_systems",
            "count"(*) FILTER (WHERE (COALESCE("base"."actual_feed_kg", (0)::numeric) < (COALESCE("base"."planned_feed_kg", (0)::numeric) * 0.90))) AS "underfeeding_systems"
           FROM "base"
          GROUP BY "base"."farm_id", "base"."date"
        )
 SELECT "d"."farm_id",
    "d"."date",
    "d"."feed_used_today_kg",
    ( SELECT "sum"("d2"."feed_used_today_kg") AS "sum"
           FROM "daily" "d2"
          WHERE (("d2"."farm_id" = "d"."farm_id") AND (("d2"."date" >= ("d"."date" - 29)) AND ("d2"."date" <= "d"."date")))) AS "feed_this_period_kg",
    "d"."planned_feed_today_kg",
    "d"."plan_vs_actual_pct",
    "d"."avg_feeding_rate_pct",
    "d"."overfeeding_systems",
    "d"."underfeeding_systems"
   FROM "daily" "d";


ALTER VIEW "analytics"."feed_dashboard_kpis" OWNER TO "postgres";

--
-- Name: feed_plan_vs_actual; Type: VIEW; Schema: analytics; Owner: postgres
--

CREATE VIEW "analytics"."feed_plan_vs_actual" AS
 SELECT "s"."farm_id",
    "fmo"."system_id",
    "s"."name" AS "system_name",
    "fmo"."date",
    "fmo"."planned_feed_kg",
    ("dsf"."feeding_amount_today")::numeric AS "actual_feed_kg"
   FROM (("analytics"."feeding_model_output" "fmo"
     JOIN "public"."system" "s" ON (("s"."id" = "fmo"."system_id")))
     LEFT JOIN "analytics"."daily_system_facts" "dsf" ON ((("dsf"."system_id" = "fmo"."system_id") AND ("dsf"."inventory_date" = "fmo"."date"))))
  WHERE ("s"."farm_id" IS NOT NULL);


ALTER VIEW "analytics"."feed_plan_vs_actual" OWNER TO "postgres";

--
-- Name: feed_vs_biomass_gain; Type: VIEW; Schema: analytics; Owner: postgres
--

CREATE VIEW "analytics"."feed_vs_biomass_gain" AS
 SELECT "s"."farm_id",
    "dsf"."system_id",
    "s"."name" AS "system_name",
    "dsf"."inventory_date" AS "date",
    ("dsf"."feeding_amount_today")::numeric AS "feed_kg",
    ("ps_latest"."biomass_increase_over_period")::numeric AS "biomass_gain_kg"
   FROM (("analytics"."daily_system_facts" "dsf"
     JOIN "public"."system" "s" ON (("s"."id" = "dsf"."system_id")))
     LEFT JOIN LATERAL ( SELECT "ps"."biomass_increase_over_period"
           FROM "analytics"."production_summary" "ps"
          WHERE (("ps"."system_id" = "dsf"."system_id") AND ("ps"."date" <= "dsf"."inventory_date") AND ("ps"."biomass_increase_over_period" IS NOT NULL))
          ORDER BY "ps"."date" DESC, "ps"."cycle_id" DESC NULLS LAST
         LIMIT 1) "ps_latest" ON (true))
  WHERE ("s"."farm_id" IS NOT NULL);


ALTER VIEW "analytics"."feed_vs_biomass_gain" OWNER TO "postgres";

--
-- Name: feeding_alerts; Type: VIEW; Schema: analytics; Owner: postgres
--

CREATE VIEW "analytics"."feeding_alerts" AS
 SELECT "s"."farm_id",
    "fmo"."system_id",
    "s"."name" AS "system_name",
    "fmo"."date",
        CASE
            WHEN (COALESCE(("dsf"."feeding_amount_today")::numeric, (0)::numeric) > ("fmo"."planned_feed_kg" * 1.20)) THEN 'Overfeeding detected'::"text"
            WHEN (COALESCE(("ps_latest"."efcr_period")::numeric, (0)::numeric) > 1.60) THEN 'High eFCR'::"text"
            WHEN (COALESCE(("dsf"."mortality_rate")::numeric, (0)::numeric) > 2.00) THEN 'High mortality'::"text"
            ELSE NULL::"text"
        END AS "alert",
        CASE
            WHEN (COALESCE(("dsf"."feeding_amount_today")::numeric, (0)::numeric) > ("fmo"."planned_feed_kg" * 1.20)) THEN 'Reduce feed by 20%'::"text"
            WHEN (COALESCE(("ps_latest"."efcr_period")::numeric, (0)::numeric) > 1.60) THEN 'Adjust feeding strategy'::"text"
            WHEN (COALESCE(("dsf"."mortality_rate")::numeric, (0)::numeric) > 2.00) THEN 'Pause feeding'::"text"
            ELSE NULL::"text"
        END AS "recommendation",
        CASE
            WHEN (COALESCE(("dsf"."mortality_rate")::numeric, (0)::numeric) > 2.00) THEN 'critical'::"text"
            WHEN (COALESCE(("ps_latest"."efcr_period")::numeric, (0)::numeric) > 1.60) THEN 'warning'::"text"
            WHEN (COALESCE(("dsf"."feeding_amount_today")::numeric, (0)::numeric) > ("fmo"."planned_feed_kg" * 1.20)) THEN 'warning'::"text"
            ELSE NULL::"text"
        END AS "severity"
   FROM ((("analytics"."feeding_model_output" "fmo"
     JOIN "public"."system" "s" ON (("s"."id" = "fmo"."system_id")))
     LEFT JOIN "analytics"."daily_system_facts" "dsf" ON ((("dsf"."system_id" = "fmo"."system_id") AND ("dsf"."inventory_date" = "fmo"."date"))))
     LEFT JOIN LATERAL ( SELECT "ps"."efcr_period"
           FROM "analytics"."production_summary" "ps"
          WHERE (("ps"."system_id" = "fmo"."system_id") AND ("ps"."date" <= "fmo"."date"))
          ORDER BY "ps"."date" DESC, "ps"."cycle_id" DESC NULLS LAST
         LIMIT 1) "ps_latest" ON (true))
  WHERE ("s"."farm_id" IS NOT NULL);


ALTER VIEW "analytics"."feeding_alerts" OWNER TO "postgres";

--
-- Name: feeding_model_validation; Type: VIEW; Schema: analytics; Owner: postgres
--

CREATE VIEW "analytics"."feeding_model_validation" AS
 SELECT "fmo"."system_id",
    "fmo"."date",
    "fmo"."model_version",
    "fmo"."scenario",
    "fmo"."phase_id",
    "fmo"."planned_feed_kg",
    "fmo"."adjusted_feed_kg",
    ("dsf"."feeding_amount_today")::numeric AS "actual_feed_kg",
        CASE
            WHEN (("dsf"."feeding_amount_today" IS NULL) OR ("fmo"."adjusted_feed_kg" IS NULL)) THEN NULL::numeric
            ELSE "round"((("dsf"."feeding_amount_today")::numeric - "fmo"."adjusted_feed_kg"), 3)
        END AS "feed_deviation_kg",
        CASE
            WHEN (("dsf"."feeding_amount_today" IS NULL) OR ("fmo"."adjusted_feed_kg" IS NULL) OR ("fmo"."adjusted_feed_kg" = (0)::numeric)) THEN NULL::numeric
            ELSE "round"((((("dsf"."feeding_amount_today")::numeric - "fmo"."adjusted_feed_kg") / "fmo"."adjusted_feed_kg") * 100.0), 2)
        END AS "feed_deviation_pct",
    ("perf"."efcr_period")::numeric AS "latest_efcr_period",
    ("perf"."biomass_increase_over_period")::numeric AS "latest_biomass_gain_kg"
   FROM (("analytics"."feeding_model_output" "fmo"
     LEFT JOIN "analytics"."daily_system_facts" "dsf" ON ((("dsf"."system_id" = "fmo"."system_id") AND ("dsf"."inventory_date" = "fmo"."date"))))
     LEFT JOIN LATERAL ( SELECT "ps"."efcr_period",
            "ps"."biomass_increase_over_period"
           FROM "analytics"."production_summary" "ps"
          WHERE (("ps"."system_id" = "fmo"."system_id") AND ("ps"."date" <= "fmo"."date"))
          ORDER BY "ps"."date" DESC, "ps"."cycle_id" DESC NULLS LAST
         LIMIT 1) "perf" ON (true));


ALTER VIEW "analytics"."feeding_model_validation" OWNER TO "postgres";

--
-- Name: feeding_rate_config; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."feeding_rate_config" (
    "config_id" bigint NOT NULL,
    "version" "text" NOT NULL,
    "scenario" "text" DEFAULT 'main'::"text" NOT NULL,
    "phase_id" integer NOT NULL,
    "abw_min_g" numeric(10,3) NOT NULL,
    "abw_max_g" numeric(10,3),
    "feed_rate_min_pct" numeric(10,4) NOT NULL,
    "feed_rate_max_pct" numeric(10,4) NOT NULL,
    "is_default" boolean DEFAULT true NOT NULL,
    "valid_from" "date" NOT NULL,
    "valid_to" "date",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    CONSTRAINT "feeding_rate_config_bounds_check" CHECK ((("abw_max_g" IS NULL) OR ("abw_max_g" >= "abw_min_g"))),
    CONSTRAINT "feeding_rate_config_rate_bounds_check" CHECK ((("feed_rate_min_pct" > (0)::numeric) AND ("feed_rate_max_pct" > (0)::numeric) AND ("feed_rate_max_pct" >= "feed_rate_min_pct"))),
    CONSTRAINT "feeding_rate_config_scenario_check" CHECK (("scenario" = ANY (ARRAY['main'::"text", 'potential'::"text", 'slow'::"text"]))),
    CONSTRAINT "feeding_rate_config_validity_check" CHECK ((("valid_to" IS NULL) OR ("valid_to" >= "valid_from")))
);


ALTER TABLE "public"."feeding_rate_config" OWNER TO "postgres";

--
-- Name: TABLE "feeding_rate_config"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE "public"."feeding_rate_config" IS 'Versioned management layer for the unified feeding model. Stores advisory feeding-rate bands by scenario and phase.';


--
-- Name: COLUMN "feeding_rate_config"."is_default"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN "public"."feeding_rate_config"."is_default" IS 'Marks the active default band to use for the scenario and phase on a given valid date.';


--
-- Name: feeding_rate_vs_target; Type: VIEW; Schema: analytics; Owner: postgres
--

CREATE VIEW "analytics"."feeding_rate_vs_target" AS
 SELECT "s"."farm_id",
    "fmo"."system_id",
    "s"."name" AS "system_name",
    "fmo"."date",
    "fmo"."feeding_rate_pct" AS "actual_rate",
    ("frc"."feed_rate_min_pct")::numeric AS "feed_rate_min_pct",
    ("frc"."feed_rate_max_pct")::numeric AS "feed_rate_max_pct"
   FROM (("analytics"."feeding_model_output" "fmo"
     JOIN "public"."system" "s" ON (("s"."id" = "fmo"."system_id")))
     JOIN "public"."feeding_rate_config" "frc" ON ((("frc"."phase_id" = "fmo"."phase_id") AND ("frc"."scenario" = "fmo"."scenario") AND ("frc"."is_default" = true) AND ("frc"."valid_from" <= "fmo"."date") AND (("frc"."valid_to" IS NULL) OR ("frc"."valid_to" >= "fmo"."date")))))
  WHERE ("s"."farm_id" IS NOT NULL);


ALTER VIEW "analytics"."feeding_rate_vs_target" OWNER TO "postgres";

--
-- Name: feeding_response_distribution; Type: VIEW; Schema: analytics; Owner: postgres
--

CREATE VIEW "analytics"."feeding_response_distribution" AS
 SELECT "s"."farm_id",
    "fr"."system_id",
    "fr"."date",
    "fr"."feeding_response",
    "count"(*) AS "response_count"
   FROM ("public"."feeding_record" "fr"
     JOIN "public"."system" "s" ON (("s"."id" = "fr"."system_id")))
  WHERE (("s"."farm_id" IS NOT NULL) AND ("fr"."feeding_response" IS NOT NULL))
  GROUP BY "s"."farm_id", "fr"."system_id", "fr"."date", "fr"."feeding_response";


ALTER VIEW "analytics"."feeding_response_distribution" OWNER TO "postgres";

--
-- Name: system_feed_status; Type: VIEW; Schema: analytics; Owner: postgres
--

CREATE VIEW "analytics"."system_feed_status" AS
 SELECT "s"."farm_id",
    "s"."id" AS "system_id",
    "s"."name" AS "system_name",
    "fmo"."date",
    "fmo"."biomass_kg",
    "fmo"."planned_feed_kg",
    ("dsf"."feeding_amount_today")::numeric AS "actual_feed_kg",
    "round"((((COALESCE(("dsf"."feeding_amount_today")::numeric, (0)::numeric) - "fmo"."planned_feed_kg") / NULLIF("fmo"."planned_feed_kg", (0)::numeric)) * 100.0), 2) AS "deviation_pct",
    "fmo"."feeding_rate_pct",
    ("ps_latest"."efcr_period")::numeric AS "efcr_period",
        CASE
            WHEN (COALESCE(("dsf"."feeding_amount_today")::numeric, (0)::numeric) > ("fmo"."planned_feed_kg" * 1.20)) THEN 'OVERFEED'::"text"
            WHEN (COALESCE(("dsf"."feeding_amount_today")::numeric, (0)::numeric) < ("fmo"."planned_feed_kg" * 0.80)) THEN 'UNDERFEED'::"text"
            WHEN (COALESCE(("ps_latest"."efcr_period")::numeric, (0)::numeric) > 1.60) THEN 'WARNING'::"text"
            ELSE 'OK'::"text"
        END AS "status"
   FROM ((("analytics"."feeding_model_output" "fmo"
     JOIN "public"."system" "s" ON (("s"."id" = "fmo"."system_id")))
     LEFT JOIN "analytics"."daily_system_facts" "dsf" ON ((("dsf"."system_id" = "fmo"."system_id") AND ("dsf"."inventory_date" = "fmo"."date"))))
     LEFT JOIN LATERAL ( SELECT "ps"."efcr_period"
           FROM "analytics"."production_summary" "ps"
          WHERE (("ps"."system_id" = "fmo"."system_id") AND ("ps"."date" <= "fmo"."date") AND (("fmo"."phase_id" IS NULL) OR ("ps"."average_body_weight" IS NOT NULL)))
          ORDER BY "ps"."date" DESC, "ps"."cycle_id" DESC NULLS LAST
         LIMIT 1) "ps_latest" ON (true))
  WHERE ("s"."farm_id" IS NOT NULL);


ALTER VIEW "analytics"."system_feed_status" OWNER TO "postgres";

--
-- Name: audit_log_entries; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE "auth"."audit_log_entries" (
    "instance_id" "uuid",
    "id" "uuid" NOT NULL,
    "payload" "json",
    "created_at" timestamp with time zone,
    "ip_address" character varying(64) DEFAULT ''::character varying NOT NULL
);


ALTER TABLE "auth"."audit_log_entries" OWNER TO "supabase_auth_admin";

--
-- Name: TABLE "audit_log_entries"; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE "auth"."audit_log_entries" IS 'Auth: Audit trail for user actions.';


--
-- Name: custom_oauth_providers; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE "auth"."custom_oauth_providers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "provider_type" "text" NOT NULL,
    "identifier" "text" NOT NULL,
    "name" "text" NOT NULL,
    "client_id" "text" NOT NULL,
    "client_secret" "text" NOT NULL,
    "acceptable_client_ids" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "scopes" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "pkce_enabled" boolean DEFAULT true NOT NULL,
    "attribute_mapping" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "authorization_params" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "enabled" boolean DEFAULT true NOT NULL,
    "email_optional" boolean DEFAULT false NOT NULL,
    "issuer" "text",
    "discovery_url" "text",
    "skip_nonce_check" boolean DEFAULT false NOT NULL,
    "cached_discovery" "jsonb",
    "discovery_cached_at" timestamp with time zone,
    "authorization_url" "text",
    "token_url" "text",
    "userinfo_url" "text",
    "jwks_uri" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "custom_claims_allowlist" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    CONSTRAINT "custom_oauth_providers_authorization_url_https" CHECK ((("authorization_url" IS NULL) OR ("authorization_url" ~~ 'https://%'::"text"))),
    CONSTRAINT "custom_oauth_providers_authorization_url_length" CHECK ((("authorization_url" IS NULL) OR ("char_length"("authorization_url") <= 2048))),
    CONSTRAINT "custom_oauth_providers_client_id_length" CHECK ((("char_length"("client_id") >= 1) AND ("char_length"("client_id") <= 512))),
    CONSTRAINT "custom_oauth_providers_discovery_url_length" CHECK ((("discovery_url" IS NULL) OR ("char_length"("discovery_url") <= 2048))),
    CONSTRAINT "custom_oauth_providers_identifier_format" CHECK (("identifier" ~ '^[a-z0-9][a-z0-9:-]{0,48}[a-z0-9]$'::"text")),
    CONSTRAINT "custom_oauth_providers_issuer_length" CHECK ((("issuer" IS NULL) OR (("char_length"("issuer") >= 1) AND ("char_length"("issuer") <= 2048)))),
    CONSTRAINT "custom_oauth_providers_jwks_uri_https" CHECK ((("jwks_uri" IS NULL) OR ("jwks_uri" ~~ 'https://%'::"text"))),
    CONSTRAINT "custom_oauth_providers_jwks_uri_length" CHECK ((("jwks_uri" IS NULL) OR ("char_length"("jwks_uri") <= 2048))),
    CONSTRAINT "custom_oauth_providers_name_length" CHECK ((("char_length"("name") >= 1) AND ("char_length"("name") <= 100))),
    CONSTRAINT "custom_oauth_providers_oauth2_requires_endpoints" CHECK ((("provider_type" <> 'oauth2'::"text") OR (("authorization_url" IS NOT NULL) AND ("token_url" IS NOT NULL) AND ("userinfo_url" IS NOT NULL)))),
    CONSTRAINT "custom_oauth_providers_oidc_discovery_url_https" CHECK ((("provider_type" <> 'oidc'::"text") OR ("discovery_url" IS NULL) OR ("discovery_url" ~~ 'https://%'::"text"))),
    CONSTRAINT "custom_oauth_providers_oidc_issuer_https" CHECK ((("provider_type" <> 'oidc'::"text") OR ("issuer" IS NULL) OR ("issuer" ~~ 'https://%'::"text"))),
    CONSTRAINT "custom_oauth_providers_oidc_requires_issuer" CHECK ((("provider_type" <> 'oidc'::"text") OR ("issuer" IS NOT NULL))),
    CONSTRAINT "custom_oauth_providers_provider_type_check" CHECK (("provider_type" = ANY (ARRAY['oauth2'::"text", 'oidc'::"text"]))),
    CONSTRAINT "custom_oauth_providers_token_url_https" CHECK ((("token_url" IS NULL) OR ("token_url" ~~ 'https://%'::"text"))),
    CONSTRAINT "custom_oauth_providers_token_url_length" CHECK ((("token_url" IS NULL) OR ("char_length"("token_url") <= 2048))),
    CONSTRAINT "custom_oauth_providers_userinfo_url_https" CHECK ((("userinfo_url" IS NULL) OR ("userinfo_url" ~~ 'https://%'::"text"))),
    CONSTRAINT "custom_oauth_providers_userinfo_url_length" CHECK ((("userinfo_url" IS NULL) OR ("char_length"("userinfo_url") <= 2048)))
);


ALTER TABLE "auth"."custom_oauth_providers" OWNER TO "supabase_auth_admin";

--
-- Name: flow_state; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE "auth"."flow_state" (
    "id" "uuid" NOT NULL,
    "user_id" "uuid",
    "auth_code" "text",
    "code_challenge_method" "auth"."code_challenge_method",
    "code_challenge" "text",
    "provider_type" "text" NOT NULL,
    "provider_access_token" "text",
    "provider_refresh_token" "text",
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone,
    "authentication_method" "text" NOT NULL,
    "auth_code_issued_at" timestamp with time zone,
    "invite_token" "text",
    "referrer" "text",
    "oauth_client_state_id" "uuid",
    "linking_target_id" "uuid",
    "email_optional" boolean DEFAULT false NOT NULL
);


ALTER TABLE "auth"."flow_state" OWNER TO "supabase_auth_admin";

--
-- Name: TABLE "flow_state"; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE "auth"."flow_state" IS 'Stores metadata for all OAuth/SSO login flows';


--
-- Name: identities; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE "auth"."identities" (
    "provider_id" "text" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "identity_data" "jsonb" NOT NULL,
    "provider" "text" NOT NULL,
    "last_sign_in_at" timestamp with time zone,
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone,
    "email" "text" GENERATED ALWAYS AS ("lower"(("identity_data" ->> 'email'::"text"))) STORED,
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL
);


ALTER TABLE "auth"."identities" OWNER TO "supabase_auth_admin";

--
-- Name: TABLE "identities"; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE "auth"."identities" IS 'Auth: Stores identities associated to a user.';


--
-- Name: COLUMN "identities"."email"; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON COLUMN "auth"."identities"."email" IS 'Auth: Email is a generated column that references the optional email property in the identity_data';


--
-- Name: instances; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE "auth"."instances" (
    "id" "uuid" NOT NULL,
    "uuid" "uuid",
    "raw_base_config" "text",
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone
);


ALTER TABLE "auth"."instances" OWNER TO "supabase_auth_admin";

--
-- Name: TABLE "instances"; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE "auth"."instances" IS 'Auth: Manages users across multiple sites.';


--
-- Name: mfa_amr_claims; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE "auth"."mfa_amr_claims" (
    "session_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone NOT NULL,
    "updated_at" timestamp with time zone NOT NULL,
    "authentication_method" "text" NOT NULL,
    "id" "uuid" NOT NULL
);


ALTER TABLE "auth"."mfa_amr_claims" OWNER TO "supabase_auth_admin";

--
-- Name: TABLE "mfa_amr_claims"; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE "auth"."mfa_amr_claims" IS 'auth: stores authenticator method reference claims for multi factor authentication';


--
-- Name: mfa_challenges; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE "auth"."mfa_challenges" (
    "id" "uuid" NOT NULL,
    "factor_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone NOT NULL,
    "verified_at" timestamp with time zone,
    "ip_address" "inet" NOT NULL,
    "otp_code" "text",
    "web_authn_session_data" "jsonb"
);


ALTER TABLE "auth"."mfa_challenges" OWNER TO "supabase_auth_admin";

--
-- Name: TABLE "mfa_challenges"; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE "auth"."mfa_challenges" IS 'auth: stores metadata about challenge requests made';


--
-- Name: mfa_factors; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE "auth"."mfa_factors" (
    "id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "friendly_name" "text",
    "factor_type" "auth"."factor_type" NOT NULL,
    "status" "auth"."factor_status" NOT NULL,
    "created_at" timestamp with time zone NOT NULL,
    "updated_at" timestamp with time zone NOT NULL,
    "secret" "text",
    "phone" "text",
    "last_challenged_at" timestamp with time zone,
    "web_authn_credential" "jsonb",
    "web_authn_aaguid" "uuid",
    "last_webauthn_challenge_data" "jsonb"
);


ALTER TABLE "auth"."mfa_factors" OWNER TO "supabase_auth_admin";

--
-- Name: TABLE "mfa_factors"; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE "auth"."mfa_factors" IS 'auth: stores metadata about factors';


--
-- Name: COLUMN "mfa_factors"."last_webauthn_challenge_data"; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON COLUMN "auth"."mfa_factors"."last_webauthn_challenge_data" IS 'Stores the latest WebAuthn challenge data including attestation/assertion for customer verification';


--
-- Name: oauth_authorizations; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE "auth"."oauth_authorizations" (
    "id" "uuid" NOT NULL,
    "authorization_id" "text" NOT NULL,
    "client_id" "uuid" NOT NULL,
    "user_id" "uuid",
    "redirect_uri" "text" NOT NULL,
    "scope" "text" NOT NULL,
    "state" "text",
    "resource" "text",
    "code_challenge" "text",
    "code_challenge_method" "auth"."code_challenge_method",
    "response_type" "auth"."oauth_response_type" DEFAULT 'code'::"auth"."oauth_response_type" NOT NULL,
    "status" "auth"."oauth_authorization_status" DEFAULT 'pending'::"auth"."oauth_authorization_status" NOT NULL,
    "authorization_code" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "expires_at" timestamp with time zone DEFAULT ("now"() + '00:03:00'::interval) NOT NULL,
    "approved_at" timestamp with time zone,
    "nonce" "text",
    CONSTRAINT "oauth_authorizations_authorization_code_length" CHECK (("char_length"("authorization_code") <= 255)),
    CONSTRAINT "oauth_authorizations_code_challenge_length" CHECK (("char_length"("code_challenge") <= 128)),
    CONSTRAINT "oauth_authorizations_expires_at_future" CHECK (("expires_at" > "created_at")),
    CONSTRAINT "oauth_authorizations_nonce_length" CHECK (("char_length"("nonce") <= 255)),
    CONSTRAINT "oauth_authorizations_redirect_uri_length" CHECK (("char_length"("redirect_uri") <= 2048)),
    CONSTRAINT "oauth_authorizations_resource_length" CHECK (("char_length"("resource") <= 2048)),
    CONSTRAINT "oauth_authorizations_scope_length" CHECK (("char_length"("scope") <= 4096)),
    CONSTRAINT "oauth_authorizations_state_length" CHECK (("char_length"("state") <= 4096))
);


ALTER TABLE "auth"."oauth_authorizations" OWNER TO "supabase_auth_admin";

--
-- Name: oauth_client_states; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE "auth"."oauth_client_states" (
    "id" "uuid" NOT NULL,
    "provider_type" "text" NOT NULL,
    "code_verifier" "text",
    "created_at" timestamp with time zone NOT NULL
);


ALTER TABLE "auth"."oauth_client_states" OWNER TO "supabase_auth_admin";

--
-- Name: TABLE "oauth_client_states"; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE "auth"."oauth_client_states" IS 'Stores OAuth states for third-party provider authentication flows where Supabase acts as the OAuth client.';


--
-- Name: oauth_clients; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE "auth"."oauth_clients" (
    "id" "uuid" NOT NULL,
    "client_secret_hash" "text",
    "registration_type" "auth"."oauth_registration_type" NOT NULL,
    "redirect_uris" "text" NOT NULL,
    "grant_types" "text" NOT NULL,
    "client_name" "text",
    "client_uri" "text",
    "logo_uri" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted_at" timestamp with time zone,
    "client_type" "auth"."oauth_client_type" DEFAULT 'confidential'::"auth"."oauth_client_type" NOT NULL,
    "token_endpoint_auth_method" "text" NOT NULL,
    CONSTRAINT "oauth_clients_client_name_length" CHECK (("char_length"("client_name") <= 1024)),
    CONSTRAINT "oauth_clients_client_uri_length" CHECK (("char_length"("client_uri") <= 2048)),
    CONSTRAINT "oauth_clients_logo_uri_length" CHECK (("char_length"("logo_uri") <= 2048)),
    CONSTRAINT "oauth_clients_token_endpoint_auth_method_check" CHECK (("token_endpoint_auth_method" = ANY (ARRAY['client_secret_basic'::"text", 'client_secret_post'::"text", 'none'::"text"])))
);


ALTER TABLE "auth"."oauth_clients" OWNER TO "supabase_auth_admin";

--
-- Name: oauth_consents; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE "auth"."oauth_consents" (
    "id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "client_id" "uuid" NOT NULL,
    "scopes" "text" NOT NULL,
    "granted_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "revoked_at" timestamp with time zone,
    CONSTRAINT "oauth_consents_revoked_after_granted" CHECK ((("revoked_at" IS NULL) OR ("revoked_at" >= "granted_at"))),
    CONSTRAINT "oauth_consents_scopes_length" CHECK (("char_length"("scopes") <= 2048)),
    CONSTRAINT "oauth_consents_scopes_not_empty" CHECK (("char_length"(TRIM(BOTH FROM "scopes")) > 0))
);


ALTER TABLE "auth"."oauth_consents" OWNER TO "supabase_auth_admin";

--
-- Name: one_time_tokens; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE "auth"."one_time_tokens" (
    "id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "token_type" "auth"."one_time_token_type" NOT NULL,
    "token_hash" "text" NOT NULL,
    "relates_to" "text" NOT NULL,
    "created_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "one_time_tokens_token_hash_check" CHECK (("char_length"("token_hash") > 0))
);


ALTER TABLE "auth"."one_time_tokens" OWNER TO "supabase_auth_admin";

--
-- Name: refresh_tokens; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE "auth"."refresh_tokens" (
    "instance_id" "uuid",
    "id" bigint NOT NULL,
    "token" character varying(255),
    "user_id" character varying(255),
    "revoked" boolean,
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone,
    "parent" character varying(255),
    "session_id" "uuid"
);


ALTER TABLE "auth"."refresh_tokens" OWNER TO "supabase_auth_admin";

--
-- Name: TABLE "refresh_tokens"; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE "auth"."refresh_tokens" IS 'Auth: Store of tokens used to refresh JWT tokens once they expire.';


--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE; Schema: auth; Owner: supabase_auth_admin
--

CREATE SEQUENCE "auth"."refresh_tokens_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "auth"."refresh_tokens_id_seq" OWNER TO "supabase_auth_admin";

--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE OWNED BY; Schema: auth; Owner: supabase_auth_admin
--

ALTER SEQUENCE "auth"."refresh_tokens_id_seq" OWNED BY "auth"."refresh_tokens"."id";


--
-- Name: saml_providers; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE "auth"."saml_providers" (
    "id" "uuid" NOT NULL,
    "sso_provider_id" "uuid" NOT NULL,
    "entity_id" "text" NOT NULL,
    "metadata_xml" "text" NOT NULL,
    "metadata_url" "text",
    "attribute_mapping" "jsonb",
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone,
    "name_id_format" "text",
    CONSTRAINT "entity_id not empty" CHECK (("char_length"("entity_id") > 0)),
    CONSTRAINT "metadata_url not empty" CHECK ((("metadata_url" = NULL::"text") OR ("char_length"("metadata_url") > 0))),
    CONSTRAINT "metadata_xml not empty" CHECK (("char_length"("metadata_xml") > 0))
);


ALTER TABLE "auth"."saml_providers" OWNER TO "supabase_auth_admin";

--
-- Name: TABLE "saml_providers"; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE "auth"."saml_providers" IS 'Auth: Manages SAML Identity Provider connections.';


--
-- Name: saml_relay_states; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE "auth"."saml_relay_states" (
    "id" "uuid" NOT NULL,
    "sso_provider_id" "uuid" NOT NULL,
    "request_id" "text" NOT NULL,
    "for_email" "text",
    "redirect_to" "text",
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone,
    "flow_state_id" "uuid",
    CONSTRAINT "request_id not empty" CHECK (("char_length"("request_id") > 0))
);


ALTER TABLE "auth"."saml_relay_states" OWNER TO "supabase_auth_admin";

--
-- Name: TABLE "saml_relay_states"; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE "auth"."saml_relay_states" IS 'Auth: Contains SAML Relay State information for each Service Provider initiated login.';


--
-- Name: schema_migrations; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE "auth"."schema_migrations" (
    "version" character varying(255) NOT NULL
);


ALTER TABLE "auth"."schema_migrations" OWNER TO "supabase_auth_admin";

--
-- Name: TABLE "schema_migrations"; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE "auth"."schema_migrations" IS 'Auth: Manages updates to the auth system.';


--
-- Name: sessions; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE "auth"."sessions" (
    "id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone,
    "factor_id" "uuid",
    "aal" "auth"."aal_level",
    "not_after" timestamp with time zone,
    "refreshed_at" timestamp without time zone,
    "user_agent" "text",
    "ip" "inet",
    "tag" "text",
    "oauth_client_id" "uuid",
    "refresh_token_hmac_key" "text",
    "refresh_token_counter" bigint,
    "scopes" "text",
    CONSTRAINT "sessions_scopes_length" CHECK (("char_length"("scopes") <= 4096))
);


ALTER TABLE "auth"."sessions" OWNER TO "supabase_auth_admin";

--
-- Name: TABLE "sessions"; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE "auth"."sessions" IS 'Auth: Stores session data associated to a user.';


--
-- Name: COLUMN "sessions"."not_after"; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON COLUMN "auth"."sessions"."not_after" IS 'Auth: Not after is a nullable column that contains a timestamp after which the session should be regarded as expired.';


--
-- Name: COLUMN "sessions"."refresh_token_hmac_key"; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON COLUMN "auth"."sessions"."refresh_token_hmac_key" IS 'Holds a HMAC-SHA256 key used to sign refresh tokens for this session.';


--
-- Name: COLUMN "sessions"."refresh_token_counter"; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON COLUMN "auth"."sessions"."refresh_token_counter" IS 'Holds the ID (counter) of the last issued refresh token.';


--
-- Name: sso_domains; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE "auth"."sso_domains" (
    "id" "uuid" NOT NULL,
    "sso_provider_id" "uuid" NOT NULL,
    "domain" "text" NOT NULL,
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone,
    CONSTRAINT "domain not empty" CHECK (("char_length"("domain") > 0))
);


ALTER TABLE "auth"."sso_domains" OWNER TO "supabase_auth_admin";

--
-- Name: TABLE "sso_domains"; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE "auth"."sso_domains" IS 'Auth: Manages SSO email address domain mapping to an SSO Identity Provider.';


--
-- Name: sso_providers; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE "auth"."sso_providers" (
    "id" "uuid" NOT NULL,
    "resource_id" "text",
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone,
    "disabled" boolean,
    CONSTRAINT "resource_id not empty" CHECK ((("resource_id" = NULL::"text") OR ("char_length"("resource_id") > 0)))
);


ALTER TABLE "auth"."sso_providers" OWNER TO "supabase_auth_admin";

--
-- Name: TABLE "sso_providers"; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE "auth"."sso_providers" IS 'Auth: Manages SSO identity provider information; see saml_providers for SAML.';


--
-- Name: COLUMN "sso_providers"."resource_id"; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON COLUMN "auth"."sso_providers"."resource_id" IS 'Auth: Uniquely identifies a SSO provider according to a user-chosen resource ID (case insensitive), useful in infrastructure as code.';


--
-- Name: users; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE "auth"."users" (
    "instance_id" "uuid",
    "id" "uuid" NOT NULL,
    "aud" character varying(255),
    "role" character varying(255),
    "email" character varying(255),
    "encrypted_password" character varying(255),
    "email_confirmed_at" timestamp with time zone,
    "invited_at" timestamp with time zone,
    "confirmation_token" character varying(255),
    "confirmation_sent_at" timestamp with time zone,
    "recovery_token" character varying(255),
    "recovery_sent_at" timestamp with time zone,
    "email_change_token_new" character varying(255),
    "email_change" character varying(255),
    "email_change_sent_at" timestamp with time zone,
    "last_sign_in_at" timestamp with time zone,
    "raw_app_meta_data" "jsonb",
    "raw_user_meta_data" "jsonb",
    "is_super_admin" boolean,
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone,
    "phone" "text" DEFAULT NULL::character varying,
    "phone_confirmed_at" timestamp with time zone,
    "phone_change" "text" DEFAULT ''::character varying,
    "phone_change_token" character varying(255) DEFAULT ''::character varying,
    "phone_change_sent_at" timestamp with time zone,
    "confirmed_at" timestamp with time zone GENERATED ALWAYS AS (LEAST("email_confirmed_at", "phone_confirmed_at")) STORED,
    "email_change_token_current" character varying(255) DEFAULT ''::character varying,
    "email_change_confirm_status" smallint DEFAULT 0,
    "banned_until" timestamp with time zone,
    "reauthentication_token" character varying(255) DEFAULT ''::character varying,
    "reauthentication_sent_at" timestamp with time zone,
    "is_sso_user" boolean DEFAULT false NOT NULL,
    "deleted_at" timestamp with time zone,
    "is_anonymous" boolean DEFAULT false NOT NULL,
    CONSTRAINT "users_email_change_confirm_status_check" CHECK ((("email_change_confirm_status" >= 0) AND ("email_change_confirm_status" <= 2)))
);


ALTER TABLE "auth"."users" OWNER TO "supabase_auth_admin";

--
-- Name: TABLE "users"; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE "auth"."users" IS 'Auth: Stores user login data within a secure schema.';


--
-- Name: COLUMN "users"."is_sso_user"; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON COLUMN "auth"."users"."is_sso_user" IS 'Auth: Set this column to true when the account comes from SSO. These accounts can have duplicate emails.';


--
-- Name: webauthn_challenges; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE "auth"."webauthn_challenges" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "challenge_type" "text" NOT NULL,
    "session_data" "jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    CONSTRAINT "webauthn_challenges_challenge_type_check" CHECK (("challenge_type" = ANY (ARRAY['signup'::"text", 'registration'::"text", 'authentication'::"text"])))
);


ALTER TABLE "auth"."webauthn_challenges" OWNER TO "supabase_auth_admin";

--
-- Name: webauthn_credentials; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE "auth"."webauthn_credentials" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "credential_id" "bytea" NOT NULL,
    "public_key" "bytea" NOT NULL,
    "attestation_type" "text" DEFAULT ''::"text" NOT NULL,
    "aaguid" "uuid",
    "sign_count" bigint DEFAULT 0 NOT NULL,
    "transports" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "backup_eligible" boolean DEFAULT false NOT NULL,
    "backed_up" boolean DEFAULT false NOT NULL,
    "friendly_name" "text" DEFAULT ''::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "last_used_at" timestamp with time zone
);


ALTER TABLE "auth"."webauthn_credentials" OWNER TO "supabase_auth_admin";

--
-- Name: live; Type: TABLE; Schema: energy; Owner: postgres
--

CREATE TABLE "energy"."live" (
    "id" bigint NOT NULL,
    "farm_id" "uuid" NOT NULL,
    "system_id" bigint,
    "source_id" "text",
    "source_type" "text" DEFAULT 'mqtt_rs485'::"text" NOT NULL,
    "meter_id" "text" NOT NULL,
    "meter_name" "text",
    "measured_at" timestamp with time zone DEFAULT "now"() NOT NULL,
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
    "status" "text" DEFAULT 'online'::"text" NOT NULL,
    "payload" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "energy"."live" OWNER TO "postgres";

--
-- Name: live_id_seq; Type: SEQUENCE; Schema: energy; Owner: postgres
--

ALTER TABLE "energy"."live" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "energy"."live_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: timeseries; Type: TABLE; Schema: energy; Owner: postgres
--

CREATE TABLE "energy"."timeseries" (
    "id" bigint NOT NULL,
    "farm_id" "uuid" NOT NULL,
    "system_id" bigint,
    "source_id" "text",
    "source_type" "text" DEFAULT 'mqtt_rs485'::"text" NOT NULL,
    "measured_at" timestamp with time zone NOT NULL,
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
    "payload" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "energy"."timeseries" OWNER TO "postgres";

--
-- Name: timeseries_id_seq; Type: SEQUENCE; Schema: energy; Owner: postgres
--

ALTER TABLE "energy"."timeseries" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "energy"."timeseries_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: farm_user_invitation; Type: TABLE; Schema: private; Owner: postgres
--

CREATE TABLE "private"."farm_user_invitation" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "farm_id" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "role" "text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "invited_by" "uuid",
    "invited_user_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "last_sent_at" timestamp with time zone,
    "accepted_at" timestamp with time zone,
    "revoked_at" timestamp with time zone
);


ALTER TABLE "private"."farm_user_invitation" OWNER TO "postgres";

--
-- Name: _affected_systems; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."_affected_systems" (
    "system_id" bigint NOT NULL,
    "min_affected_date" "date" DEFAULT CURRENT_DATE NOT NULL
);


ALTER TABLE "public"."_affected_systems" OWNER TO "postgres";

--
-- Name: TABLE "_affected_systems"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE "public"."_affected_systems" IS 'Internal queue of systems whose daily inventory needs recomputation after operational event changes.';


--
-- Name: alert_threshold; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."alert_threshold" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "scope" "text" NOT NULL,
    "farm_id" "uuid",
    "system_id" bigint,
    "low_do_threshold" numeric,
    "high_ammonia_threshold" numeric,
    "high_mortality_threshold" numeric,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "low_sgr_threshold" numeric DEFAULT 1.0,
    "low_survival_pct" numeric DEFAULT 80.0,
    "critical_survival_pct" numeric DEFAULT 70.0,
    CONSTRAINT "alert_threshold_scope_check" CHECK (((("scope" = 'default'::"text") AND ("farm_id" IS NULL) AND ("system_id" IS NULL)) OR (("scope" = 'farm'::"text") AND ("farm_id" IS NOT NULL) AND ("system_id" IS NULL)) OR (("scope" = 'system'::"text") AND ("system_id" IS NOT NULL))))
);


ALTER TABLE "public"."alert_threshold" OWNER TO "postgres";

--
-- Name: COLUMN "alert_threshold"."low_sgr_threshold"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN "public"."alert_threshold"."low_sgr_threshold" IS 'SGR (%/day) below which a warning fires. Research brief: fingerlings ≥3%/day; grow-out ≥1%/day.';


--
-- Name: COLUMN "alert_threshold"."low_survival_pct"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN "public"."alert_threshold"."low_survival_pct" IS 'Cumulative survival (%) below which a WARNING fires. Research brief: investigate <80%.';


--
-- Name: COLUMN "alert_threshold"."critical_survival_pct"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN "public"."alert_threshold"."critical_survival_pct" IS 'Cumulative survival (%) below which a CRITICAL fires. Research brief: critical <70%.';


--
-- Name: farm_user; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."farm_user" (
    "farm_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    CONSTRAINT "farm_user_role_check" CHECK (("role" = ANY (ARRAY['admin'::"text", 'farm_manager'::"text", 'system_operator'::"text", 'data_analyst'::"text", 'viewer'::"text"])))
);


ALTER TABLE "public"."farm_user" OWNER TO "postgres";

--
-- Name: api_alert_thresholds; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW "public"."api_alert_thresholds" WITH ("security_invoker"='true') AS
 SELECT "at"."id",
    "at"."scope",
    "at"."farm_id",
    "at"."system_id",
    "at"."low_do_threshold",
    "at"."high_ammonia_threshold",
    "at"."high_mortality_threshold",
    "at"."low_sgr_threshold",
    "at"."low_survival_pct",
    "at"."critical_survival_pct",
    "at"."created_at",
    "at"."updated_at"
   FROM "public"."alert_threshold" "at"
  WHERE ((("at"."farm_id" IS NOT NULL) AND (EXISTS ( SELECT 1
           FROM "public"."farm_user" "fu"
          WHERE (("fu"."farm_id" = "at"."farm_id") AND ("fu"."user_id" = "auth"."uid"()))))) OR (("at"."system_id" IS NOT NULL) AND (EXISTS ( SELECT 1
           FROM ("public"."system" "s"
             JOIN "public"."farm_user" "fu" ON (("fu"."farm_id" = "s"."farm_id")))
          WHERE (("s"."id" = "at"."system_id") AND ("fu"."user_id" = "auth"."uid"()))))) OR ("at"."scope" = 'default'::"text"));


ALTER VIEW "public"."api_alert_thresholds" OWNER TO "postgres";

--
-- Name: daily_water_quality_rating; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."daily_water_quality_rating" (
    "id" bigint NOT NULL,
    "system_id" bigint NOT NULL,
    "rating_date" "date" NOT NULL,
    "rating" "public"."water_quality_rating" NOT NULL,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "worst_parameter" "public"."water_quality_parameters",
    "worst_parameter_value" double precision,
    "worst_parameter_unit" "text",
    "rating_numeric" integer,
    CONSTRAINT "daily_water_quality_rating_rating_numeric_matches_rating" CHECK (((("rating" = 'lethal'::"public"."water_quality_rating") AND ("rating_numeric" = 0)) OR (("rating" = 'critical'::"public"."water_quality_rating") AND ("rating_numeric" = 1)) OR (("rating" = 'acceptable'::"public"."water_quality_rating") AND ("rating_numeric" = 2)) OR (("rating" = 'optimal'::"public"."water_quality_rating") AND ("rating_numeric" = 3))))
);


ALTER TABLE "public"."daily_water_quality_rating" OWNER TO "postgres";

--
-- Name: user_profile; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."user_profile" (
    "user_id" "uuid" NOT NULL,
    "notifications_enabled" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "full_name" "text",
    "role" "text",
    "organization_id" "uuid",
    "farm_id" "uuid",
    "email" "text",
    CONSTRAINT "user_profile_role_check" CHECK (("role" = ANY (ARRAY['admin'::"text", 'farm_manager'::"text", 'system_operator'::"text", 'data_analyst'::"text", 'viewer'::"text"])))
);


ALTER TABLE "public"."user_profile" OWNER TO "postgres";

--
-- Name: water_quality_measurement; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."water_quality_measurement" (
    "id" bigint NOT NULL,
    "date" "date" NOT NULL,
    "time" time without time zone NOT NULL,
    "water_depth" double precision NOT NULL,
    "parameter_value" double precision NOT NULL,
    "system_id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "parameter_name" "public"."water_quality_parameters" NOT NULL,
    "measured_at" timestamp with time zone NOT NULL,
    "location_reference" "text",
    "local_id" "text",
    "synced_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "chk_wqm_date_time_matches_measured_at" CHECK ((("date" = (("measured_at" AT TIME ZONE 'UTC'::"text"))::"date") AND ("time" = (("measured_at" AT TIME ZONE 'UTC'::"text"))::time without time zone)))
);


ALTER TABLE "public"."water_quality_measurement" OWNER TO "postgres";

--
-- Name: COLUMN "water_quality_measurement"."date"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN "public"."water_quality_measurement"."date" IS 'Measurement date in UTC (aligned with measured_at). All records normalized to UTC as of migration 2026-06.';


--
-- Name: COLUMN "water_quality_measurement"."time"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN "public"."water_quality_measurement"."time" IS 'Measurement time in UTC (aligned with measured_at). All records normalized to UTC as of migration 2026-06.';


--
-- Name: api_daily_water_quality_rating; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW "public"."api_daily_water_quality_rating" WITH ("security_invoker"='true') AS
 SELECT "dwr"."system_id",
    "s"."farm_id",
    "s"."name" AS "system_name",
    "dwr"."rating_date",
    "dwr"."rating",
    "dwr"."rating_numeric",
    "dwr"."worst_parameter",
    ("dwr"."worst_parameter")::"text" AS "worst_parameter_normalized",
    "dwr"."worst_parameter_value",
    "dwr"."worst_parameter_unit",
    ( SELECT "avg"("wqm"."parameter_value") AS "avg"
           FROM "public"."water_quality_measurement" "wqm"
          WHERE (("wqm"."system_id" = "dwr"."system_id") AND ("wqm"."date" = "dwr"."rating_date") AND ("wqm"."parameter_name" = 'temperature'::"public"."water_quality_parameters"))) AS "temperature_average",
    "dwr"."created_at"
   FROM ("public"."daily_water_quality_rating" "dwr"
     JOIN "public"."system" "s" ON (("s"."id" = "dwr"."system_id")))
  WHERE (EXISTS ( SELECT 1
           FROM "public"."user_profile" "up"
          WHERE (("up"."user_id" = "auth"."uid"()) AND ("up"."farm_id" = "s"."farm_id") AND ("up"."role" = ANY (ARRAY['admin'::"text", 'farm_manager'::"text", 'system_operator'::"text"])))));


ALTER VIEW "public"."api_daily_water_quality_rating" OWNER TO "postgres";

--
-- Name: water_quality_framework; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."water_quality_framework" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "parameter_acceptable" "jsonb",
    "parameter_critical" "jsonb",
    "parameter_lethal" "jsonb",
    "parameter_optimal" "jsonb",
    "unit" "public"."units",
    "parameter_name" "public"."water_quality_parameters" NOT NULL
);


ALTER TABLE "public"."water_quality_framework" OWNER TO "postgres";

--
-- Name: api_water_quality_measurements; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW "public"."api_water_quality_measurements" WITH ("security_invoker"='true') AS
 SELECT "wqm"."id",
    "wqm"."system_id",
    "s"."farm_id",
    "s"."name" AS "system_name",
    "wqm"."date",
    "wqm"."time",
    "wqm"."parameter_name",
    "wqm"."parameter_value",
    "wqm"."water_depth",
    "wqf"."unit",
    "wqm"."created_at",
    ("wqm"."parameter_name")::"text" AS "parameter_name_normalized"
   FROM (("public"."water_quality_measurement" "wqm"
     JOIN "public"."system" "s" ON (("s"."id" = "wqm"."system_id")))
     JOIN "public"."water_quality_framework" "wqf" ON (("wqf"."parameter_name" = "wqm"."parameter_name")))
  WHERE (EXISTS ( SELECT 1
           FROM "public"."user_profile" "up"
          WHERE (("up"."user_id" = "auth"."uid"()) AND ("up"."farm_id" = "s"."farm_id") AND ("up"."role" = ANY (ARRAY['admin'::"text", 'farm_manager'::"text", 'system_operator'::"text"])))));


ALTER VIEW "public"."api_water_quality_measurements" OWNER TO "postgres";

--
-- Name: app_config; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."app_config" (
    "key" "text" NOT NULL,
    "value" "text" NOT NULL
);


ALTER TABLE "public"."app_config" OWNER TO "postgres";

--
-- Name: daily_water_quality_rating_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE "public"."daily_water_quality_rating" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."daily_water_quality_rating_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: dashboard_time_period; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."dashboard_time_period" (
    "time_period" "public"."time_period" NOT NULL,
    "days_since_start" integer NOT NULL
);


ALTER TABLE "public"."dashboard_time_period" OWNER TO "postgres";

--
-- Name: energy_alarm_events; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."energy_alarm_events" (
    "id" bigint NOT NULL,
    "farm_id" "uuid" NOT NULL,
    "meter_id" "text",
    "alarm_code" "text" NOT NULL,
    "alarm_name" "text",
    "severity" "text" DEFAULT 'warning'::"text" NOT NULL,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "started_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "ended_at" timestamp with time zone,
    "acknowledged_at" timestamp with time zone,
    "resolved_at" timestamp with time zone,
    "message" "text",
    "payload" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "energy_alarm_events_alarm_code_not_blank" CHECK (("btrim"("alarm_code") <> ''::"text")),
    CONSTRAINT "energy_alarm_events_severity_check" CHECK (("severity" = ANY (ARRAY['info'::"text", 'warning'::"text", 'critical'::"text"]))),
    CONSTRAINT "energy_alarm_events_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'acknowledged'::"text", 'resolved'::"text"]))),
    CONSTRAINT "energy_alarm_events_time_check" CHECK ((("ended_at" IS NULL) OR ("ended_at" >= "started_at")))
);


ALTER TABLE "public"."energy_alarm_events" OWNER TO "postgres";

--
-- Name: energy_alarm_events_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE "public"."energy_alarm_events" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."energy_alarm_events_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: energy_meter_timeseries; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."energy_meter_timeseries" (
    "id" bigint NOT NULL,
    "farm_id" "uuid" NOT NULL,
    "meter_id" "text" NOT NULL,
    "measured_at" timestamp with time zone NOT NULL,
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
    "payload" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "energy_meter_timeseries_meter_id_not_blank" CHECK (("btrim"("meter_id") <> ''::"text"))
);


ALTER TABLE "public"."energy_meter_timeseries" OWNER TO "postgres";

--
-- Name: energy_meter_timeseries_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE "public"."energy_meter_timeseries" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."energy_meter_timeseries_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: farm; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."farm" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "location" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "organization_id" "uuid",
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."farm" OWNER TO "postgres";

--
-- Name: feed_inventory; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."feed_inventory" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "farm_id" "uuid" NOT NULL,
    "feed_type_id" bigint NOT NULL,
    "inventory_date" "date" NOT NULL,
    "inventory_time" time without time zone,
    "bag_weight" integer,
    "amount_of_bags" numeric,
    "opened_bags" integer,
    "comments" "text",
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "bag_number" "text",
    "snapshot_kg" numeric GENERATED ALWAYS AS ("public"."feed_inventory_snapshot_kg"(("bag_weight")::numeric, "amount_of_bags", ("opened_bags")::numeric)) STORED,
    CONSTRAINT "feed_inventory_nonnegative_values" CHECK (((("bag_weight" IS NULL) OR ("bag_weight" >= 0)) AND (("amount_of_bags" IS NULL) OR ("amount_of_bags" >= (0)::numeric)) AND (("opened_bags" IS NULL) OR ("opened_bags" >= 0))))
);


ALTER TABLE "public"."feed_inventory" OWNER TO "postgres";

--
-- Name: TABLE "feed_inventory"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE "public"."feed_inventory" IS 'Manual feed inventory stock-count snapshots. These are the feed stock source of truth, normally counted at start of day and end of day.';


--
-- Name: COLUMN "feed_inventory"."inventory_time"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN "public"."feed_inventory"."inventory_time" IS 'Stock-count time. Operationally this is usually near 08:00 for start-of-day and near 16:00 for end-of-day.';


--
-- Name: COLUMN "feed_inventory"."amount_of_bags"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN "public"."feed_inventory"."amount_of_bags" IS 'Closed/full bags counted in the feed store. Numeric to preserve decimal bag counts from the updated workbook.';


--
-- Name: COLUMN "feed_inventory"."opened_bags"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN "public"."feed_inventory"."opened_bags" IS 'Remaining feed in opened bags, recorded in grams in the historical AquaSmart data.';


--
-- Name: COLUMN "feed_inventory"."bag_number"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN "public"."feed_inventory"."bag_number" IS 'Bag identifier(s) from the source workbook when tracked.';


--
-- Name: feed_inventory_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE "public"."feed_inventory" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."feed_inventory_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: feed_supplier; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."feed_supplier" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "company_name" "text" NOT NULL,
    "location_country" "text" NOT NULL,
    "location_city" "text"
);


ALTER TABLE "public"."feed_supplier" OWNER TO "postgres";

--
-- Name: feed_supplier_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE "public"."feed_supplier" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."feed_supplier_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: feed_type; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."feed_type" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "feed_supplier_id" bigint NOT NULL,
    "feed_line" "text",
    "feed_category" "public"."feed_category" NOT NULL,
    "feed_pellet_size" "public"."feed_pellet_size" NOT NULL,
    "crude_protein_percentage" double precision,
    "crude_fat_percentage" double precision,
    "farm_id" "uuid",
    "is_active" boolean DEFAULT true NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."feed_type" OWNER TO "postgres";

--
-- Name: COLUMN "feed_type"."is_active"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN "public"."feed_type"."is_active" IS 'When false this feed type is retired and will not appear in form dropdowns, but historical records referencing it are preserved.';


--
-- Name: feed_type_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE "public"."feed_type" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."feed_type_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: feeding_rate_config_config_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE "public"."feeding_rate_config" ALTER COLUMN "config_id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."feeding_rate_config_config_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: feeding_record_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE "public"."feeding_record" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."feeding_record_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: feeding_response_level; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."feeding_response_level" (
    "level" smallint NOT NULL,
    "label" "text" NOT NULL,
    "immediate_response" "text" NOT NULL,
    "after_10_min" "text",
    "after_3_hours" "text",
    "action_guideline" "text" NOT NULL,
    CONSTRAINT "feeding_response_level_level_check" CHECK ((("level" >= 1) AND ("level" <= 5)))
);


ALTER TABLE "public"."feeding_response_level" OWNER TO "postgres";

--
-- Name: TABLE "feeding_response_level"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE "public"."feeding_response_level" IS 'Official 1-5 appetite scale used by feeding_record.feeding_response.';


--
-- Name: fingerling_batch_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE "public"."fingerling_batch" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."fingerling_batch_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: fingerling_supplier; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."fingerling_supplier" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "company_name" "text" NOT NULL,
    "location_country" "text" NOT NULL,
    "location_city" "text"
);


ALTER TABLE "public"."fingerling_supplier" OWNER TO "postgres";

--
-- Name: fingerling_supplier_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE "public"."fingerling_supplier" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."fingerling_supplier_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: fish_harvest_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE "public"."fish_harvest" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."fish_harvest_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: fish_mortality_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE "public"."fish_mortality" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."fish_mortality_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: fish_sampling_weight_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE "public"."fish_sampling_weight" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."fish_sampling_weight_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: fish_stocking_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE "public"."fish_stocking" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."fish_stocking_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: fish_transfer_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE "public"."fish_transfer" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."fish_transfer_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: growth_phase; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."growth_phase" (
    "phase_id" integer NOT NULL,
    "scenario" "text" DEFAULT 'main'::"text" NOT NULL,
    "abw_min_g" numeric(10,3) NOT NULL,
    "abw_max_g" numeric(10,3),
    "sgr_pct_per_day" numeric(10,4) NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    CONSTRAINT "growth_phase_bounds_check" CHECK ((("abw_max_g" IS NULL) OR ("abw_max_g" >= "abw_min_g"))),
    CONSTRAINT "growth_phase_scenario_check" CHECK (("scenario" = ANY (ARRAY['main'::"text", 'potential'::"text", 'slow'::"text"]))),
    CONSTRAINT "growth_phase_sgr_check" CHECK (("sgr_pct_per_day" > (0)::numeric))
);


ALTER TABLE "public"."growth_phase" OWNER TO "postgres";

--
-- Name: TABLE "growth_phase"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE "public"."growth_phase" IS 'Authoritative biology layer for the unified feeding model. Stores ABW-to-phase and expected SGR by scenario.';


--
-- Name: COLUMN "growth_phase"."sgr_pct_per_day"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN "public"."growth_phase"."sgr_pct_per_day" IS 'Expected daily specific growth rate for the phase, expressed as percent per day.';


--
-- Name: normalization_review; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."normalization_review" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "raw_upload_id" "uuid",
    "farm_id" "uuid" NOT NULL,
    "table_name" "text" NOT NULL,
    "row_data" "jsonb" NOT NULL,
    "issue_type" "text" NOT NULL,
    "issue_detail" "text" NOT NULL,
    "resolved" boolean DEFAULT false NOT NULL,
    "resolution" "text",
    "resolved_by" "uuid",
    "resolved_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."normalization_review" OWNER TO "postgres";

--
-- Name: organization; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."organization" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "owner_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."organization" OWNER TO "postgres";

--
-- Name: production_cycle_cycle_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE "public"."production_cycle_cycle_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."production_cycle_cycle_id_seq" OWNER TO "postgres";

--
-- Name: production_cycle_cycle_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE "public"."production_cycle_cycle_id_seq" OWNED BY "public"."production_cycle"."cycle_id";


--
-- Name: raw_uploads; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."raw_uploads" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "farm_id" "uuid" NOT NULL,
    "uploaded_by" "uuid" NOT NULL,
    "file_name" "text" NOT NULL,
    "file_type" "text",
    "storage_path" "text" NOT NULL,
    "row_count" integer,
    "status" "text" DEFAULT 'pending_review'::"text" NOT NULL,
    "reviewed_by" "uuid",
    "reviewed_at" timestamp with time zone,
    "rejection_reason" "text",
    "review_notes" "text",
    "parse_warnings" "jsonb",
    "uploaded_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "raw_uploads_status_check" CHECK (("status" = ANY (ARRAY['pending_review'::"text", 'in_review'::"text", 'approved'::"text", 'rejected'::"text", 'normalizing'::"text", 'normalized'::"text", 'failed'::"text"])))
);


ALTER TABLE "public"."raw_uploads" OWNER TO "postgres";

--
-- Name: system_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE "public"."system" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."system_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: system_name_change_log; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."system_name_change_log" (
    "id" bigint NOT NULL,
    "system_id" bigint NOT NULL,
    "old_name" "text" NOT NULL,
    "new_name" "text" NOT NULL,
    "changed_by" "uuid",
    "changed_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "has_stocking" boolean DEFAULT false NOT NULL
);


ALTER TABLE "public"."system_name_change_log" OWNER TO "postgres";

--
-- Name: system_name_change_log_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE "public"."system_name_change_log" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."system_name_change_log_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: user_settings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."user_settings" (
    "user_id" "uuid" NOT NULL,
    "theme" "text" DEFAULT 'light'::"text",
    "default_views" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_settings" OWNER TO "postgres";

--
-- Name: water_quality_framework_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE "public"."water_quality_framework" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."water_quality_framework_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: water_quality_measurement_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE "public"."water_quality_measurement" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."water_quality_measurement_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: water_quality_measurements_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE "public"."water_quality_measurements_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."water_quality_measurements_id_seq" OWNER TO "postgres";

--
-- Name: water_quality_measurements_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE "public"."water_quality_measurements_id_seq" OWNED BY "public"."water_quality_measurement"."id";


--
-- Name: messages; Type: TABLE; Schema: realtime; Owner: supabase_realtime_admin
--

CREATE TABLE "realtime"."messages" (
    "topic" "text" NOT NULL,
    "extension" "text" NOT NULL,
    "payload" "jsonb",
    "event" "text",
    "private" boolean DEFAULT false,
    "updated_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "inserted_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "binary_payload" "bytea"
)
PARTITION BY RANGE ("inserted_at");


ALTER TABLE "realtime"."messages" OWNER TO "supabase_realtime_admin";

--
-- Name: messages_2026_06_29; Type: TABLE; Schema: realtime; Owner: supabase_realtime_admin
--

CREATE TABLE "realtime"."messages_2026_06_29" (
    "topic" "text" NOT NULL,
    "extension" "text" NOT NULL,
    "payload" "jsonb",
    "event" "text",
    "private" boolean DEFAULT false,
    "updated_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "inserted_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "binary_payload" "bytea",
    CONSTRAINT "messages_payload_exclusive" CHECK ((("payload" IS NULL) OR ("binary_payload" IS NULL)))
);


ALTER TABLE "realtime"."messages_2026_06_29" OWNER TO "supabase_realtime_admin";

--
-- Name: messages_2026_06_30; Type: TABLE; Schema: realtime; Owner: supabase_realtime_admin
--

CREATE TABLE "realtime"."messages_2026_06_30" (
    "topic" "text" NOT NULL,
    "extension" "text" NOT NULL,
    "payload" "jsonb",
    "event" "text",
    "private" boolean DEFAULT false,
    "updated_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "inserted_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "binary_payload" "bytea",
    CONSTRAINT "messages_payload_exclusive" CHECK ((("payload" IS NULL) OR ("binary_payload" IS NULL)))
);


ALTER TABLE "realtime"."messages_2026_06_30" OWNER TO "supabase_realtime_admin";

--
-- Name: messages_2026_07_01; Type: TABLE; Schema: realtime; Owner: supabase_realtime_admin
--

CREATE TABLE "realtime"."messages_2026_07_01" (
    "topic" "text" NOT NULL,
    "extension" "text" NOT NULL,
    "payload" "jsonb",
    "event" "text",
    "private" boolean DEFAULT false,
    "updated_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "inserted_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "binary_payload" "bytea",
    CONSTRAINT "messages_payload_exclusive" CHECK ((("payload" IS NULL) OR ("binary_payload" IS NULL)))
);


ALTER TABLE "realtime"."messages_2026_07_01" OWNER TO "supabase_realtime_admin";

--
-- Name: messages_2026_07_02; Type: TABLE; Schema: realtime; Owner: supabase_realtime_admin
--

CREATE TABLE "realtime"."messages_2026_07_02" (
    "topic" "text" NOT NULL,
    "extension" "text" NOT NULL,
    "payload" "jsonb",
    "event" "text",
    "private" boolean DEFAULT false,
    "updated_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "inserted_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "binary_payload" "bytea",
    CONSTRAINT "messages_payload_exclusive" CHECK ((("payload" IS NULL) OR ("binary_payload" IS NULL)))
);


ALTER TABLE "realtime"."messages_2026_07_02" OWNER TO "supabase_realtime_admin";

--
-- Name: messages_2026_07_03; Type: TABLE; Schema: realtime; Owner: supabase_realtime_admin
--

CREATE TABLE "realtime"."messages_2026_07_03" (
    "topic" "text" NOT NULL,
    "extension" "text" NOT NULL,
    "payload" "jsonb",
    "event" "text",
    "private" boolean DEFAULT false,
    "updated_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "inserted_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "binary_payload" "bytea",
    CONSTRAINT "messages_payload_exclusive" CHECK ((("payload" IS NULL) OR ("binary_payload" IS NULL)))
);


ALTER TABLE "realtime"."messages_2026_07_03" OWNER TO "supabase_realtime_admin";

--
-- Name: messages_2026_07_04; Type: TABLE; Schema: realtime; Owner: supabase_realtime_admin
--

CREATE TABLE "realtime"."messages_2026_07_04" (
    "topic" "text" NOT NULL,
    "extension" "text" NOT NULL,
    "payload" "jsonb",
    "event" "text",
    "private" boolean DEFAULT false,
    "updated_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "inserted_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "binary_payload" "bytea",
    CONSTRAINT "messages_payload_exclusive" CHECK ((("payload" IS NULL) OR ("binary_payload" IS NULL)))
);


ALTER TABLE "realtime"."messages_2026_07_04" OWNER TO "supabase_realtime_admin";

--
-- Name: messages_2026_07_05; Type: TABLE; Schema: realtime; Owner: supabase_realtime_admin
--

CREATE TABLE "realtime"."messages_2026_07_05" (
    "topic" "text" NOT NULL,
    "extension" "text" NOT NULL,
    "payload" "jsonb",
    "event" "text",
    "private" boolean DEFAULT false,
    "updated_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "inserted_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "binary_payload" "bytea",
    CONSTRAINT "messages_payload_exclusive" CHECK ((("payload" IS NULL) OR ("binary_payload" IS NULL)))
);


ALTER TABLE "realtime"."messages_2026_07_05" OWNER TO "supabase_realtime_admin";

--
-- Name: messages_2026_07_06; Type: TABLE; Schema: realtime; Owner: supabase_realtime_admin
--

CREATE TABLE "realtime"."messages_2026_07_06" (
    "topic" "text" NOT NULL,
    "extension" "text" NOT NULL,
    "payload" "jsonb",
    "event" "text",
    "private" boolean DEFAULT false,
    "updated_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "inserted_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "binary_payload" "bytea",
    CONSTRAINT "messages_payload_exclusive" CHECK ((("payload" IS NULL) OR ("binary_payload" IS NULL)))
);


ALTER TABLE "realtime"."messages_2026_07_06" OWNER TO "supabase_realtime_admin";

--
-- Name: schema_migrations; Type: TABLE; Schema: realtime; Owner: supabase_admin
--

CREATE TABLE "realtime"."schema_migrations" (
    "version" bigint NOT NULL,
    "inserted_at" timestamp(0) without time zone
);


ALTER TABLE "realtime"."schema_migrations" OWNER TO "supabase_admin";

--
-- Name: subscription; Type: TABLE; Schema: realtime; Owner: supabase_admin
--

CREATE TABLE "realtime"."subscription" (
    "id" bigint NOT NULL,
    "subscription_id" "uuid" NOT NULL,
    "entity" "regclass" NOT NULL,
    "filters" "realtime"."user_defined_filter"[] DEFAULT '{}'::"realtime"."user_defined_filter"[] NOT NULL,
    "claims" "jsonb" NOT NULL,
    "claims_role" "regrole" GENERATED ALWAYS AS ("realtime"."to_regrole"(("claims" ->> 'role'::"text"))) STORED NOT NULL,
    "created_at" timestamp without time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "action_filter" "text" DEFAULT '*'::"text",
    "selected_columns" "text"[],
    CONSTRAINT "subscription_action_filter_check" CHECK (("action_filter" = ANY (ARRAY['*'::"text", 'INSERT'::"text", 'UPDATE'::"text", 'DELETE'::"text"])))
);


ALTER TABLE "realtime"."subscription" OWNER TO "supabase_admin";

--
-- Name: subscription_id_seq; Type: SEQUENCE; Schema: realtime; Owner: supabase_admin
--

ALTER TABLE "realtime"."subscription" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "realtime"."subscription_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: buckets; Type: TABLE; Schema: storage; Owner: supabase_storage_admin
--

CREATE TABLE "storage"."buckets" (
    "id" "text" NOT NULL,
    "name" "text" NOT NULL,
    "owner" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "public" boolean DEFAULT false,
    "avif_autodetection" boolean DEFAULT false,
    "file_size_limit" bigint,
    "allowed_mime_types" "text"[],
    "owner_id" "text",
    "type" "storage"."buckettype" DEFAULT 'STANDARD'::"storage"."buckettype" NOT NULL
);


ALTER TABLE "storage"."buckets" OWNER TO "supabase_storage_admin";

--
-- Name: COLUMN "buckets"."owner"; Type: COMMENT; Schema: storage; Owner: supabase_storage_admin
--

COMMENT ON COLUMN "storage"."buckets"."owner" IS 'Field is deprecated, use owner_id instead';


--
-- Name: buckets_analytics; Type: TABLE; Schema: storage; Owner: supabase_storage_admin
--

CREATE TABLE "storage"."buckets_analytics" (
    "name" "text" NOT NULL,
    "type" "storage"."buckettype" DEFAULT 'ANALYTICS'::"storage"."buckettype" NOT NULL,
    "format" "text" DEFAULT 'ICEBERG'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "deleted_at" timestamp with time zone
);


ALTER TABLE "storage"."buckets_analytics" OWNER TO "supabase_storage_admin";

--
-- Name: buckets_vectors; Type: TABLE; Schema: storage; Owner: supabase_storage_admin
--

CREATE TABLE "storage"."buckets_vectors" (
    "id" "text" NOT NULL,
    "type" "storage"."buckettype" DEFAULT 'VECTOR'::"storage"."buckettype" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "storage"."buckets_vectors" OWNER TO "supabase_storage_admin";

--
-- Name: migrations; Type: TABLE; Schema: storage; Owner: supabase_storage_admin
--

CREATE TABLE "storage"."migrations" (
    "id" integer NOT NULL,
    "name" character varying(100) NOT NULL,
    "hash" character varying(40) NOT NULL,
    "executed_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "storage"."migrations" OWNER TO "supabase_storage_admin";

--
-- Name: objects; Type: TABLE; Schema: storage; Owner: supabase_storage_admin
--

CREATE TABLE "storage"."objects" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "bucket_id" "text",
    "name" "text",
    "owner" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "last_accessed_at" timestamp with time zone DEFAULT "now"(),
    "metadata" "jsonb",
    "path_tokens" "text"[] GENERATED ALWAYS AS ("string_to_array"("name", '/'::"text")) STORED,
    "version" "text",
    "owner_id" "text",
    "user_metadata" "jsonb"
);


ALTER TABLE "storage"."objects" OWNER TO "supabase_storage_admin";

--
-- Name: COLUMN "objects"."owner"; Type: COMMENT; Schema: storage; Owner: supabase_storage_admin
--

COMMENT ON COLUMN "storage"."objects"."owner" IS 'Field is deprecated, use owner_id instead';


--
-- Name: s3_multipart_uploads; Type: TABLE; Schema: storage; Owner: supabase_storage_admin
--

CREATE TABLE "storage"."s3_multipart_uploads" (
    "id" "text" NOT NULL,
    "in_progress_size" bigint DEFAULT 0 NOT NULL,
    "upload_signature" "text" NOT NULL,
    "bucket_id" "text" NOT NULL,
    "key" "text" NOT NULL COLLATE "pg_catalog"."C",
    "version" "text" NOT NULL,
    "owner_id" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "user_metadata" "jsonb",
    "metadata" "jsonb"
);


ALTER TABLE "storage"."s3_multipart_uploads" OWNER TO "supabase_storage_admin";

--
-- Name: s3_multipart_uploads_parts; Type: TABLE; Schema: storage; Owner: supabase_storage_admin
--

CREATE TABLE "storage"."s3_multipart_uploads_parts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "upload_id" "text" NOT NULL,
    "size" bigint DEFAULT 0 NOT NULL,
    "part_number" integer NOT NULL,
    "bucket_id" "text" NOT NULL,
    "key" "text" NOT NULL COLLATE "pg_catalog"."C",
    "etag" "text" NOT NULL,
    "owner_id" "text",
    "version" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "storage"."s3_multipart_uploads_parts" OWNER TO "supabase_storage_admin";

--
-- Name: vector_indexes; Type: TABLE; Schema: storage; Owner: supabase_storage_admin
--

CREATE TABLE "storage"."vector_indexes" (
    "id" "text" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL COLLATE "pg_catalog"."C",
    "bucket_id" "text" NOT NULL,
    "data_type" "text" NOT NULL,
    "dimension" integer NOT NULL,
    "distance_metric" "text" NOT NULL,
    "metadata_configuration" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "storage"."vector_indexes" OWNER TO "supabase_storage_admin";

--
-- Name: schema_migrations; Type: TABLE; Schema: supabase_migrations; Owner: postgres
--

CREATE TABLE "supabase_migrations"."schema_migrations" (
    "version" "text" NOT NULL,
    "statements" "text"[],
    "name" "text"
);


ALTER TABLE "supabase_migrations"."schema_migrations" OWNER TO "postgres";

--
-- Name: messages_2026_06_29; Type: TABLE ATTACH; Schema: realtime; Owner: supabase_realtime_admin
--

ALTER TABLE ONLY "realtime"."messages" ATTACH PARTITION "realtime"."messages_2026_06_29" FOR VALUES FROM ('2026-06-29 00:00:00') TO ('2026-06-30 00:00:00');


--
-- Name: messages_2026_06_30; Type: TABLE ATTACH; Schema: realtime; Owner: supabase_realtime_admin
--

ALTER TABLE ONLY "realtime"."messages" ATTACH PARTITION "realtime"."messages_2026_06_30" FOR VALUES FROM ('2026-06-30 00:00:00') TO ('2026-07-01 00:00:00');


--
-- Name: messages_2026_07_01; Type: TABLE ATTACH; Schema: realtime; Owner: supabase_realtime_admin
--

ALTER TABLE ONLY "realtime"."messages" ATTACH PARTITION "realtime"."messages_2026_07_01" FOR VALUES FROM ('2026-07-01 00:00:00') TO ('2026-07-02 00:00:00');


--
-- Name: messages_2026_07_02; Type: TABLE ATTACH; Schema: realtime; Owner: supabase_realtime_admin
--

ALTER TABLE ONLY "realtime"."messages" ATTACH PARTITION "realtime"."messages_2026_07_02" FOR VALUES FROM ('2026-07-02 00:00:00') TO ('2026-07-03 00:00:00');


--
-- Name: messages_2026_07_03; Type: TABLE ATTACH; Schema: realtime; Owner: supabase_realtime_admin
--

ALTER TABLE ONLY "realtime"."messages" ATTACH PARTITION "realtime"."messages_2026_07_03" FOR VALUES FROM ('2026-07-03 00:00:00') TO ('2026-07-04 00:00:00');


--
-- Name: messages_2026_07_04; Type: TABLE ATTACH; Schema: realtime; Owner: supabase_realtime_admin
--

ALTER TABLE ONLY "realtime"."messages" ATTACH PARTITION "realtime"."messages_2026_07_04" FOR VALUES FROM ('2026-07-04 00:00:00') TO ('2026-07-05 00:00:00');


--
-- Name: messages_2026_07_05; Type: TABLE ATTACH; Schema: realtime; Owner: supabase_realtime_admin
--

ALTER TABLE ONLY "realtime"."messages" ATTACH PARTITION "realtime"."messages_2026_07_05" FOR VALUES FROM ('2026-07-05 00:00:00') TO ('2026-07-06 00:00:00');


--
-- Name: messages_2026_07_06; Type: TABLE ATTACH; Schema: realtime; Owner: supabase_realtime_admin
--

ALTER TABLE ONLY "realtime"."messages" ATTACH PARTITION "realtime"."messages_2026_07_06" FOR VALUES FROM ('2026-07-06 00:00:00') TO ('2026-07-07 00:00:00');


--
-- Name: refresh_tokens id; Type: DEFAULT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY "auth"."refresh_tokens" ALTER COLUMN "id" SET DEFAULT "nextval"('"auth"."refresh_tokens_id_seq"'::"regclass");


--
-- Name: production_cycle cycle_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."production_cycle" ALTER COLUMN "cycle_id" SET DEFAULT "nextval"('"public"."production_cycle_cycle_id_seq"'::"regclass");


--
-- Name: mfa_amr_claims amr_id_pk; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY "auth"."mfa_amr_claims"
    ADD CONSTRAINT "amr_id_pk" PRIMARY KEY ("id");


--
-- Name: audit_log_entries audit_log_entries_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY "auth"."audit_log_entries"
    ADD CONSTRAINT "audit_log_entries_pkey" PRIMARY KEY ("id");


--
-- Name: custom_oauth_providers custom_oauth_providers_identifier_key; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY "auth"."custom_oauth_providers"
    ADD CONSTRAINT "custom_oauth_providers_identifier_key" UNIQUE ("identifier");


--
-- Name: custom_oauth_providers custom_oauth_providers_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY "auth"."custom_oauth_providers"
    ADD CONSTRAINT "custom_oauth_providers_pkey" PRIMARY KEY ("id");


--
-- Name: flow_state flow_state_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY "auth"."flow_state"
    ADD CONSTRAINT "flow_state_pkey" PRIMARY KEY ("id");


--
-- Name: identities identities_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY "auth"."identities"
    ADD CONSTRAINT "identities_pkey" PRIMARY KEY ("id");


--
-- Name: identities identities_provider_id_provider_unique; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY "auth"."identities"
    ADD CONSTRAINT "identities_provider_id_provider_unique" UNIQUE ("provider_id", "provider");


--
-- Name: instances instances_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY "auth"."instances"
    ADD CONSTRAINT "instances_pkey" PRIMARY KEY ("id");


--
-- Name: mfa_amr_claims mfa_amr_claims_session_id_authentication_method_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY "auth"."mfa_amr_claims"
    ADD CONSTRAINT "mfa_amr_claims_session_id_authentication_method_pkey" UNIQUE ("session_id", "authentication_method");


--
-- Name: mfa_challenges mfa_challenges_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY "auth"."mfa_challenges"
    ADD CONSTRAINT "mfa_challenges_pkey" PRIMARY KEY ("id");


--
-- Name: mfa_factors mfa_factors_last_challenged_at_key; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY "auth"."mfa_factors"
    ADD CONSTRAINT "mfa_factors_last_challenged_at_key" UNIQUE ("last_challenged_at");


--
-- Name: mfa_factors mfa_factors_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY "auth"."mfa_factors"
    ADD CONSTRAINT "mfa_factors_pkey" PRIMARY KEY ("id");


--
-- Name: oauth_authorizations oauth_authorizations_authorization_code_key; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY "auth"."oauth_authorizations"
    ADD CONSTRAINT "oauth_authorizations_authorization_code_key" UNIQUE ("authorization_code");


--
-- Name: oauth_authorizations oauth_authorizations_authorization_id_key; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY "auth"."oauth_authorizations"
    ADD CONSTRAINT "oauth_authorizations_authorization_id_key" UNIQUE ("authorization_id");


--
-- Name: oauth_authorizations oauth_authorizations_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY "auth"."oauth_authorizations"
    ADD CONSTRAINT "oauth_authorizations_pkey" PRIMARY KEY ("id");


--
-- Name: oauth_client_states oauth_client_states_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY "auth"."oauth_client_states"
    ADD CONSTRAINT "oauth_client_states_pkey" PRIMARY KEY ("id");


--
-- Name: oauth_clients oauth_clients_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY "auth"."oauth_clients"
    ADD CONSTRAINT "oauth_clients_pkey" PRIMARY KEY ("id");


--
-- Name: oauth_consents oauth_consents_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY "auth"."oauth_consents"
    ADD CONSTRAINT "oauth_consents_pkey" PRIMARY KEY ("id");


--
-- Name: oauth_consents oauth_consents_user_client_unique; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY "auth"."oauth_consents"
    ADD CONSTRAINT "oauth_consents_user_client_unique" UNIQUE ("user_id", "client_id");


--
-- Name: one_time_tokens one_time_tokens_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY "auth"."one_time_tokens"
    ADD CONSTRAINT "one_time_tokens_pkey" PRIMARY KEY ("id");


--
-- Name: refresh_tokens refresh_tokens_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY "auth"."refresh_tokens"
    ADD CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id");


--
-- Name: refresh_tokens refresh_tokens_token_unique; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY "auth"."refresh_tokens"
    ADD CONSTRAINT "refresh_tokens_token_unique" UNIQUE ("token");


--
-- Name: saml_providers saml_providers_entity_id_key; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY "auth"."saml_providers"
    ADD CONSTRAINT "saml_providers_entity_id_key" UNIQUE ("entity_id");


--
-- Name: saml_providers saml_providers_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY "auth"."saml_providers"
    ADD CONSTRAINT "saml_providers_pkey" PRIMARY KEY ("id");


--
-- Name: saml_relay_states saml_relay_states_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY "auth"."saml_relay_states"
    ADD CONSTRAINT "saml_relay_states_pkey" PRIMARY KEY ("id");


--
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY "auth"."schema_migrations"
    ADD CONSTRAINT "schema_migrations_pkey" PRIMARY KEY ("version");


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY "auth"."sessions"
    ADD CONSTRAINT "sessions_pkey" PRIMARY KEY ("id");


--
-- Name: sso_domains sso_domains_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY "auth"."sso_domains"
    ADD CONSTRAINT "sso_domains_pkey" PRIMARY KEY ("id");


--
-- Name: sso_providers sso_providers_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY "auth"."sso_providers"
    ADD CONSTRAINT "sso_providers_pkey" PRIMARY KEY ("id");


--
-- Name: users users_phone_key; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY "auth"."users"
    ADD CONSTRAINT "users_phone_key" UNIQUE ("phone");


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY "auth"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");


--
-- Name: webauthn_challenges webauthn_challenges_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY "auth"."webauthn_challenges"
    ADD CONSTRAINT "webauthn_challenges_pkey" PRIMARY KEY ("id");


--
-- Name: webauthn_credentials webauthn_credentials_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY "auth"."webauthn_credentials"
    ADD CONSTRAINT "webauthn_credentials_pkey" PRIMARY KEY ("id");


--
-- Name: live live_farm_id_meter_id_key; Type: CONSTRAINT; Schema: energy; Owner: postgres
--

ALTER TABLE ONLY "energy"."live"
    ADD CONSTRAINT "live_farm_id_meter_id_key" UNIQUE ("farm_id", "meter_id");


--
-- Name: live live_pkey; Type: CONSTRAINT; Schema: energy; Owner: postgres
--

ALTER TABLE ONLY "energy"."live"
    ADD CONSTRAINT "live_pkey" PRIMARY KEY ("id");


--
-- Name: timeseries timeseries_pkey; Type: CONSTRAINT; Schema: energy; Owner: postgres
--

ALTER TABLE ONLY "energy"."timeseries"
    ADD CONSTRAINT "timeseries_pkey" PRIMARY KEY ("id");


--
-- Name: farm_user_invitation farm_user_invitation_pkey; Type: CONSTRAINT; Schema: private; Owner: postgres
--

ALTER TABLE ONLY "private"."farm_user_invitation"
    ADD CONSTRAINT "farm_user_invitation_pkey" PRIMARY KEY ("id");


--
-- Name: _affected_systems _affected_systems_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."_affected_systems"
    ADD CONSTRAINT "_affected_systems_pkey" PRIMARY KEY ("system_id");


--
-- Name: alert_threshold alert_threshold_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."alert_threshold"
    ADD CONSTRAINT "alert_threshold_pkey" PRIMARY KEY ("id");


--
-- Name: alert_threshold alert_threshold_scope_target_check; Type: CHECK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE "public"."alert_threshold"
    ADD CONSTRAINT "alert_threshold_scope_target_check" CHECK (((("scope" = 'default'::"text") AND ("farm_id" IS NULL) AND ("system_id" IS NULL)) OR (("scope" = 'farm'::"text") AND ("farm_id" IS NOT NULL) AND ("system_id" IS NULL)) OR (("scope" = 'system'::"text") AND ("system_id" IS NOT NULL)))) NOT VALID;


--
-- Name: app_config app_config_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."app_config"
    ADD CONSTRAINT "app_config_pkey" PRIMARY KEY ("key");


--
-- Name: alert_threshold chk_alert_scope; Type: CHECK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE "public"."alert_threshold"
    ADD CONSTRAINT "chk_alert_scope" CHECK ((("scope" = ANY (ARRAY['farm'::"text", 'system'::"text", 'default'::"text"])) AND ((("scope" = 'farm'::"text") AND ("farm_id" IS NOT NULL)) OR (("scope" = 'system'::"text") AND ("system_id" IS NOT NULL)) OR ("scope" = 'default'::"text")))) NOT VALID;


--
-- Name: farm_user chk_farm_user_role; Type: CHECK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE "public"."farm_user"
    ADD CONSTRAINT "chk_farm_user_role" CHECK (("role" = ANY (ARRAY['admin'::"text", 'farm_manager'::"text", 'system_operator'::"text", 'data_analyst'::"text", 'viewer'::"text"]))) NOT VALID;


--
-- Name: daily_water_quality_rating daily_water_quality_rating_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."daily_water_quality_rating"
    ADD CONSTRAINT "daily_water_quality_rating_pkey" PRIMARY KEY ("id");


--
-- Name: daily_water_quality_rating daily_water_quality_rating_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."daily_water_quality_rating"
    ADD CONSTRAINT "daily_water_quality_rating_unique" UNIQUE ("system_id", "rating_date");


--
-- Name: dashboard_time_period dashboard_time_period_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."dashboard_time_period"
    ADD CONSTRAINT "dashboard_time_period_pkey" PRIMARY KEY ("time_period");


--
-- Name: energy_alarm_events energy_alarm_events_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."energy_alarm_events"
    ADD CONSTRAINT "energy_alarm_events_pkey" PRIMARY KEY ("id");


--
-- Name: energy_meter_timeseries energy_meter_timeseries_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."energy_meter_timeseries"
    ADD CONSTRAINT "energy_meter_timeseries_pkey" PRIMARY KEY ("id");


--
-- Name: energy_meter_timeseries energy_meter_timeseries_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."energy_meter_timeseries"
    ADD CONSTRAINT "energy_meter_timeseries_unique" UNIQUE ("farm_id", "meter_id", "measured_at");


--
-- Name: farm farm_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."farm"
    ADD CONSTRAINT "farm_pkey" PRIMARY KEY ("id");


--
-- Name: farm_user farm_user_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."farm_user"
    ADD CONSTRAINT "farm_user_pkey" PRIMARY KEY ("id");


--
-- Name: feed_inventory feed_inventory_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."feed_inventory"
    ADD CONSTRAINT "feed_inventory_pkey" PRIMARY KEY ("id");


--
-- Name: feeding_record feed_record_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."feeding_record"
    ADD CONSTRAINT "feed_record_pkey" PRIMARY KEY ("id");


--
-- Name: feed_supplier feed_supplier_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."feed_supplier"
    ADD CONSTRAINT "feed_supplier_pkey" PRIMARY KEY ("id");


--
-- Name: feed_type feed_type_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."feed_type"
    ADD CONSTRAINT "feed_type_pkey" PRIMARY KEY ("id");


--
-- Name: feeding_rate_config feeding_rate_config_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."feeding_rate_config"
    ADD CONSTRAINT "feeding_rate_config_pkey" PRIMARY KEY ("config_id");


--
-- Name: feeding_response_level feeding_response_level_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."feeding_response_level"
    ADD CONSTRAINT "feeding_response_level_pkey" PRIMARY KEY ("level");


--
-- Name: fingerling_batch fingerling_batch_name_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."fingerling_batch"
    ADD CONSTRAINT "fingerling_batch_name_unique" UNIQUE ("name");


--
-- Name: fingerling_batch fingerling_batch_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."fingerling_batch"
    ADD CONSTRAINT "fingerling_batch_pkey" PRIMARY KEY ("id");


--
-- Name: fish_harvest fish_harvest_abw_matches_total; Type: CHECK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE "public"."fish_harvest"
    ADD CONSTRAINT "fish_harvest_abw_matches_total" CHECK ((("number_of_fish_harvest" IS NULL) OR ("number_of_fish_harvest" <= 0) OR ("abs"(("abw" - (("total_weight_harvest" * (1000.0)::double precision) / ("number_of_fish_harvest")::double precision))) <= (0.01)::double precision))) NOT VALID;


--
-- Name: fish_harvest fish_harvest_batch_required; Type: CHECK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE "public"."fish_harvest"
    ADD CONSTRAINT "fish_harvest_batch_required" CHECK (("batch_id" IS NOT NULL)) NOT VALID;


--
-- Name: fish_harvest fish_harvest_cycle_required; Type: CHECK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE "public"."fish_harvest"
    ADD CONSTRAINT "fish_harvest_cycle_required" CHECK (("cycle_id" IS NOT NULL)) NOT VALID;


--
-- Name: fish_harvest fish_harvest_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."fish_harvest"
    ADD CONSTRAINT "fish_harvest_pkey" PRIMARY KEY ("id");


--
-- Name: fish_harvest fish_harvest_positive_count; Type: CHECK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE "public"."fish_harvest"
    ADD CONSTRAINT "fish_harvest_positive_count" CHECK ((("number_of_fish_harvest" IS NOT NULL) AND ("number_of_fish_harvest" > 0))) NOT VALID;


--
-- Name: fish_harvest fish_harvest_positive_weight; Type: CHECK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE "public"."fish_harvest"
    ADD CONSTRAINT "fish_harvest_positive_weight" CHECK (("total_weight_harvest" > (0)::double precision)) NOT VALID;


--
-- Name: fish_mortality fish_mortality_mass_weight_required; Type: CHECK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE "public"."fish_mortality"
    ADD CONSTRAINT "fish_mortality_mass_weight_required" CHECK ((("number_of_fish_mortality" < 100) OR ("total_weight_mortality" IS NOT NULL))) NOT VALID;


--
-- Name: fish_mortality fish_mortality_total_weight_nonnegative; Type: CHECK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE "public"."fish_mortality"
    ADD CONSTRAINT "fish_mortality_total_weight_nonnegative" CHECK ((("total_weight_mortality" IS NULL) OR ("total_weight_mortality" >= (0)::double precision))) NOT VALID;


--
-- Name: fish_sampling_weight fish_sampling_weight_abw_matches_sample; Type: CHECK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE "public"."fish_sampling_weight"
    ADD CONSTRAINT "fish_sampling_weight_abw_matches_sample" CHECK (("abs"(("abw" - (("total_weight_sampling" * (1000.0)::double precision) / (NULLIF("number_of_fish_sampling", 0))::double precision))) <= (0.01)::double precision)) NOT VALID;


--
-- Name: fish_sampling_weight fish_sampling_weight_batch_required; Type: CHECK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE "public"."fish_sampling_weight"
    ADD CONSTRAINT "fish_sampling_weight_batch_required" CHECK (("batch_id" IS NOT NULL)) NOT VALID;


--
-- Name: fish_sampling_weight fish_sampling_weight_cycle_required; Type: CHECK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE "public"."fish_sampling_weight"
    ADD CONSTRAINT "fish_sampling_weight_cycle_required" CHECK (("cycle_id" IS NOT NULL)) NOT VALID;


--
-- Name: fish_transfer fish_transfer_endpoint_check; Type: CHECK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE "public"."fish_transfer"
    ADD CONSTRAINT "fish_transfer_endpoint_check" CHECK ((("origin_system_id" IS NOT NULL) OR ("target_system_id" IS NOT NULL) OR (NULLIF("btrim"("external_origin_name"), ''::"text") IS NOT NULL) OR (NULLIF("btrim"("external_target_name"), ''::"text") IS NOT NULL))) NOT VALID;


--
-- Name: fish_transfer fish_transfer_positive_count_check; Type: CHECK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE "public"."fish_transfer"
    ADD CONSTRAINT "fish_transfer_positive_count_check" CHECK (("number_of_fish_transfer" > (0)::double precision)) NOT VALID;


--
-- Name: fish_transfer fish_transfer_whole_fish_count_check; Type: CHECK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE "public"."fish_transfer"
    ADD CONSTRAINT "fish_transfer_whole_fish_count_check" CHECK (("number_of_fish_transfer" = "trunc"("number_of_fish_transfer"))) NOT VALID;


--
-- Name: fish_sampling_weight fish_weight_sampling_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."fish_sampling_weight"
    ADD CONSTRAINT "fish_weight_sampling_pkey" PRIMARY KEY ("id");


--
-- Name: growth_phase growth_phase_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."growth_phase"
    ADD CONSTRAINT "growth_phase_pkey" PRIMARY KEY ("scenario", "phase_id");


--
-- Name: fish_mortality mortality_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."fish_mortality"
    ADD CONSTRAINT "mortality_pkey" PRIMARY KEY ("id");


--
-- Name: normalization_review normalization_review_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."normalization_review"
    ADD CONSTRAINT "normalization_review_pkey" PRIMARY KEY ("id");


--
-- Name: organization organization_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."organization"
    ADD CONSTRAINT "organization_pkey" PRIMARY KEY ("id");


--
-- Name: organization organization_slug_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."organization"
    ADD CONSTRAINT "organization_slug_key" UNIQUE ("slug");


--
-- Name: production_cycle production_cycle_no_overlap; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."production_cycle"
    ADD CONSTRAINT "production_cycle_no_overlap" EXCLUDE USING "gist" ("system_id" WITH =, "daterange"("cycle_start", COALESCE("cycle_end", 'infinity'::"date"), '[]'::"text") WITH &&);


--
-- Name: production_cycle production_cycle_pkey_cycle_id; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."production_cycle"
    ADD CONSTRAINT "production_cycle_pkey_cycle_id" PRIMARY KEY ("cycle_id");


--
-- Name: raw_uploads raw_uploads_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."raw_uploads"
    ADD CONSTRAINT "raw_uploads_pkey" PRIMARY KEY ("id");


--
-- Name: fish_stocking stocking_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."fish_stocking"
    ADD CONSTRAINT "stocking_pkey" PRIMARY KEY ("id");


--
-- Name: fingerling_supplier supplier_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."fingerling_supplier"
    ADD CONSTRAINT "supplier_name_key" UNIQUE ("company_name");


--
-- Name: fingerling_supplier supplier_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."fingerling_supplier"
    ADD CONSTRAINT "supplier_pkey" PRIMARY KEY ("id");


--
-- Name: system_name_change_log system_name_change_log_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."system_name_change_log"
    ADD CONSTRAINT "system_name_change_log_pkey" PRIMARY KEY ("id");


--
-- Name: system system_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."system"
    ADD CONSTRAINT "system_pkey" PRIMARY KEY ("id");


--
-- Name: fish_transfer transfer_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."fish_transfer"
    ADD CONSTRAINT "transfer_pkey" PRIMARY KEY ("id");


--
-- Name: user_profile user_profile_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."user_profile"
    ADD CONSTRAINT "user_profile_pkey" PRIMARY KEY ("user_id");


--
-- Name: user_settings user_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."user_settings"
    ADD CONSTRAINT "user_settings_pkey" PRIMARY KEY ("user_id");


--
-- Name: water_quality_framework water_quality_framework_parameter_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."water_quality_framework"
    ADD CONSTRAINT "water_quality_framework_parameter_unique" UNIQUE ("parameter_name");


--
-- Name: water_quality_framework water_quality_framework_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."water_quality_framework"
    ADD CONSTRAINT "water_quality_framework_pkey" PRIMARY KEY ("id");


--
-- Name: water_quality_measurement water_quality_measurement_measured_at_parts_check; Type: CHECK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE "public"."water_quality_measurement"
    ADD CONSTRAINT "water_quality_measurement_measured_at_parts_check" CHECK ((("date" = ("measured_at")::"date") AND ("time" = ("measured_at")::time without time zone))) NOT VALID;


--
-- Name: water_quality_measurement water_quality_measurement_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."water_quality_measurement"
    ADD CONSTRAINT "water_quality_measurement_unique" UNIQUE ("system_id", "parameter_name", "date", "time", "water_depth");


--
-- Name: water_quality_measurement water_quality_measurements_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."water_quality_measurement"
    ADD CONSTRAINT "water_quality_measurements_pkey" PRIMARY KEY ("id");


--
-- Name: messages messages_pkey; Type: CONSTRAINT; Schema: realtime; Owner: supabase_realtime_admin
--

ALTER TABLE ONLY "realtime"."messages"
    ADD CONSTRAINT "messages_pkey" PRIMARY KEY ("id", "inserted_at");


--
-- Name: messages_2026_06_29 messages_2026_06_29_pkey; Type: CONSTRAINT; Schema: realtime; Owner: supabase_realtime_admin
--

ALTER TABLE ONLY "realtime"."messages_2026_06_29"
    ADD CONSTRAINT "messages_2026_06_29_pkey" PRIMARY KEY ("id", "inserted_at");


--
-- Name: messages_2026_06_30 messages_2026_06_30_pkey; Type: CONSTRAINT; Schema: realtime; Owner: supabase_realtime_admin
--

ALTER TABLE ONLY "realtime"."messages_2026_06_30"
    ADD CONSTRAINT "messages_2026_06_30_pkey" PRIMARY KEY ("id", "inserted_at");


--
-- Name: messages_2026_07_01 messages_2026_07_01_pkey; Type: CONSTRAINT; Schema: realtime; Owner: supabase_realtime_admin
--

ALTER TABLE ONLY "realtime"."messages_2026_07_01"
    ADD CONSTRAINT "messages_2026_07_01_pkey" PRIMARY KEY ("id", "inserted_at");


--
-- Name: messages_2026_07_02 messages_2026_07_02_pkey; Type: CONSTRAINT; Schema: realtime; Owner: supabase_realtime_admin
--

ALTER TABLE ONLY "realtime"."messages_2026_07_02"
    ADD CONSTRAINT "messages_2026_07_02_pkey" PRIMARY KEY ("id", "inserted_at");


--
-- Name: messages_2026_07_03 messages_2026_07_03_pkey; Type: CONSTRAINT; Schema: realtime; Owner: supabase_realtime_admin
--

ALTER TABLE ONLY "realtime"."messages_2026_07_03"
    ADD CONSTRAINT "messages_2026_07_03_pkey" PRIMARY KEY ("id", "inserted_at");


--
-- Name: messages_2026_07_04 messages_2026_07_04_pkey; Type: CONSTRAINT; Schema: realtime; Owner: supabase_realtime_admin
--

ALTER TABLE ONLY "realtime"."messages_2026_07_04"
    ADD CONSTRAINT "messages_2026_07_04_pkey" PRIMARY KEY ("id", "inserted_at");


--
-- Name: messages_2026_07_05 messages_2026_07_05_pkey; Type: CONSTRAINT; Schema: realtime; Owner: supabase_realtime_admin
--

ALTER TABLE ONLY "realtime"."messages_2026_07_05"
    ADD CONSTRAINT "messages_2026_07_05_pkey" PRIMARY KEY ("id", "inserted_at");


--
-- Name: messages_2026_07_06 messages_2026_07_06_pkey; Type: CONSTRAINT; Schema: realtime; Owner: supabase_realtime_admin
--

ALTER TABLE ONLY "realtime"."messages_2026_07_06"
    ADD CONSTRAINT "messages_2026_07_06_pkey" PRIMARY KEY ("id", "inserted_at");


--
-- Name: messages messages_payload_exclusive; Type: CHECK CONSTRAINT; Schema: realtime; Owner: supabase_realtime_admin
--

ALTER TABLE "realtime"."messages"
    ADD CONSTRAINT "messages_payload_exclusive" CHECK ((("payload" IS NULL) OR ("binary_payload" IS NULL))) NOT VALID;


--
-- Name: subscription pk_subscription; Type: CONSTRAINT; Schema: realtime; Owner: supabase_admin
--

ALTER TABLE ONLY "realtime"."subscription"
    ADD CONSTRAINT "pk_subscription" PRIMARY KEY ("id");


--
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: realtime; Owner: supabase_admin
--

ALTER TABLE ONLY "realtime"."schema_migrations"
    ADD CONSTRAINT "schema_migrations_pkey" PRIMARY KEY ("version");


--
-- Name: buckets_analytics buckets_analytics_pkey; Type: CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY "storage"."buckets_analytics"
    ADD CONSTRAINT "buckets_analytics_pkey" PRIMARY KEY ("id");


--
-- Name: buckets buckets_pkey; Type: CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY "storage"."buckets"
    ADD CONSTRAINT "buckets_pkey" PRIMARY KEY ("id");


--
-- Name: buckets_vectors buckets_vectors_pkey; Type: CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY "storage"."buckets_vectors"
    ADD CONSTRAINT "buckets_vectors_pkey" PRIMARY KEY ("id");


--
-- Name: migrations migrations_name_key; Type: CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY "storage"."migrations"
    ADD CONSTRAINT "migrations_name_key" UNIQUE ("name");


--
-- Name: migrations migrations_pkey; Type: CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY "storage"."migrations"
    ADD CONSTRAINT "migrations_pkey" PRIMARY KEY ("id");


--
-- Name: objects objects_pkey; Type: CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY "storage"."objects"
    ADD CONSTRAINT "objects_pkey" PRIMARY KEY ("id");


--
-- Name: s3_multipart_uploads_parts s3_multipart_uploads_parts_pkey; Type: CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY "storage"."s3_multipart_uploads_parts"
    ADD CONSTRAINT "s3_multipart_uploads_parts_pkey" PRIMARY KEY ("id");


--
-- Name: s3_multipart_uploads s3_multipart_uploads_pkey; Type: CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY "storage"."s3_multipart_uploads"
    ADD CONSTRAINT "s3_multipart_uploads_pkey" PRIMARY KEY ("id");


--
-- Name: vector_indexes vector_indexes_pkey; Type: CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY "storage"."vector_indexes"
    ADD CONSTRAINT "vector_indexes_pkey" PRIMARY KEY ("id");


--
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: supabase_migrations; Owner: postgres
--

ALTER TABLE ONLY "supabase_migrations"."schema_migrations"
    ADD CONSTRAINT "schema_migrations_pkey" PRIMARY KEY ("version");


--
-- Name: idx_production_summary_cycle; Type: INDEX; Schema: analytics; Owner: postgres
--

CREATE INDEX "idx_production_summary_cycle" ON "analytics"."production_summary" USING "btree" ("cycle_id", "system_id");


--
-- Name: idx_production_summary_system_date; Type: INDEX; Schema: analytics; Owner: postgres
--

CREATE INDEX "idx_production_summary_system_date" ON "analytics"."production_summary" USING "btree" ("system_id", "date" DESC);


--
-- Name: idx_production_summary_system_id; Type: INDEX; Schema: analytics; Owner: postgres
--

CREATE INDEX "idx_production_summary_system_id" ON "analytics"."production_summary" USING "btree" ("system_id");


--
-- Name: audit_logs_instance_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX "audit_logs_instance_id_idx" ON "auth"."audit_log_entries" USING "btree" ("instance_id");


--
-- Name: confirmation_token_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX "confirmation_token_idx" ON "auth"."users" USING "btree" ("confirmation_token") WHERE (("confirmation_token")::"text" !~ '^[0-9 ]*$'::"text");


--
-- Name: custom_oauth_providers_created_at_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX "custom_oauth_providers_created_at_idx" ON "auth"."custom_oauth_providers" USING "btree" ("created_at");


--
-- Name: custom_oauth_providers_enabled_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX "custom_oauth_providers_enabled_idx" ON "auth"."custom_oauth_providers" USING "btree" ("enabled");


--
-- Name: custom_oauth_providers_identifier_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX "custom_oauth_providers_identifier_idx" ON "auth"."custom_oauth_providers" USING "btree" ("identifier");


--
-- Name: custom_oauth_providers_provider_type_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX "custom_oauth_providers_provider_type_idx" ON "auth"."custom_oauth_providers" USING "btree" ("provider_type");


--
-- Name: email_change_token_current_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX "email_change_token_current_idx" ON "auth"."users" USING "btree" ("email_change_token_current") WHERE (("email_change_token_current")::"text" !~ '^[0-9 ]*$'::"text");


--
-- Name: email_change_token_new_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX "email_change_token_new_idx" ON "auth"."users" USING "btree" ("email_change_token_new") WHERE (("email_change_token_new")::"text" !~ '^[0-9 ]*$'::"text");


--
-- Name: factor_id_created_at_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX "factor_id_created_at_idx" ON "auth"."mfa_factors" USING "btree" ("user_id", "created_at");


--
-- Name: flow_state_created_at_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX "flow_state_created_at_idx" ON "auth"."flow_state" USING "btree" ("created_at" DESC);


--
-- Name: identities_email_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX "identities_email_idx" ON "auth"."identities" USING "btree" ("email" "text_pattern_ops");


--
-- Name: INDEX "identities_email_idx"; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON INDEX "auth"."identities_email_idx" IS 'Auth: Ensures indexed queries on the email column';


--
-- Name: identities_user_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX "identities_user_id_idx" ON "auth"."identities" USING "btree" ("user_id");


--
-- Name: idx_auth_code; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX "idx_auth_code" ON "auth"."flow_state" USING "btree" ("auth_code");


--
-- Name: idx_oauth_client_states_created_at; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX "idx_oauth_client_states_created_at" ON "auth"."oauth_client_states" USING "btree" ("created_at");


--
-- Name: idx_user_id_auth_method; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX "idx_user_id_auth_method" ON "auth"."flow_state" USING "btree" ("user_id", "authentication_method");


--
-- Name: mfa_challenge_created_at_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX "mfa_challenge_created_at_idx" ON "auth"."mfa_challenges" USING "btree" ("created_at" DESC);


--
-- Name: mfa_factors_user_friendly_name_unique; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX "mfa_factors_user_friendly_name_unique" ON "auth"."mfa_factors" USING "btree" ("friendly_name", "user_id") WHERE (TRIM(BOTH FROM "friendly_name") <> ''::"text");


--
-- Name: mfa_factors_user_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX "mfa_factors_user_id_idx" ON "auth"."mfa_factors" USING "btree" ("user_id");


--
-- Name: oauth_auth_pending_exp_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX "oauth_auth_pending_exp_idx" ON "auth"."oauth_authorizations" USING "btree" ("expires_at") WHERE ("status" = 'pending'::"auth"."oauth_authorization_status");


--
-- Name: oauth_clients_deleted_at_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX "oauth_clients_deleted_at_idx" ON "auth"."oauth_clients" USING "btree" ("deleted_at");


--
-- Name: oauth_consents_active_client_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX "oauth_consents_active_client_idx" ON "auth"."oauth_consents" USING "btree" ("client_id") WHERE ("revoked_at" IS NULL);


--
-- Name: oauth_consents_active_user_client_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX "oauth_consents_active_user_client_idx" ON "auth"."oauth_consents" USING "btree" ("user_id", "client_id") WHERE ("revoked_at" IS NULL);


--
-- Name: oauth_consents_user_order_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX "oauth_consents_user_order_idx" ON "auth"."oauth_consents" USING "btree" ("user_id", "granted_at" DESC);


--
-- Name: one_time_tokens_relates_to_hash_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX "one_time_tokens_relates_to_hash_idx" ON "auth"."one_time_tokens" USING "hash" ("relates_to");


--
-- Name: one_time_tokens_token_hash_hash_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX "one_time_tokens_token_hash_hash_idx" ON "auth"."one_time_tokens" USING "hash" ("token_hash");


--
-- Name: one_time_tokens_user_id_token_type_key; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX "one_time_tokens_user_id_token_type_key" ON "auth"."one_time_tokens" USING "btree" ("user_id", "token_type");


--
-- Name: reauthentication_token_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX "reauthentication_token_idx" ON "auth"."users" USING "btree" ("reauthentication_token") WHERE (("reauthentication_token")::"text" !~ '^[0-9 ]*$'::"text");


--
-- Name: recovery_token_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX "recovery_token_idx" ON "auth"."users" USING "btree" ("recovery_token") WHERE (("recovery_token")::"text" !~ '^[0-9 ]*$'::"text");


--
-- Name: refresh_tokens_instance_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX "refresh_tokens_instance_id_idx" ON "auth"."refresh_tokens" USING "btree" ("instance_id");


--
-- Name: refresh_tokens_instance_id_user_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX "refresh_tokens_instance_id_user_id_idx" ON "auth"."refresh_tokens" USING "btree" ("instance_id", "user_id");


--
-- Name: refresh_tokens_parent_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX "refresh_tokens_parent_idx" ON "auth"."refresh_tokens" USING "btree" ("parent");


--
-- Name: refresh_tokens_session_id_revoked_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX "refresh_tokens_session_id_revoked_idx" ON "auth"."refresh_tokens" USING "btree" ("session_id", "revoked");


--
-- Name: refresh_tokens_updated_at_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX "refresh_tokens_updated_at_idx" ON "auth"."refresh_tokens" USING "btree" ("updated_at" DESC);


--
-- Name: saml_providers_sso_provider_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX "saml_providers_sso_provider_id_idx" ON "auth"."saml_providers" USING "btree" ("sso_provider_id");


--
-- Name: saml_relay_states_created_at_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX "saml_relay_states_created_at_idx" ON "auth"."saml_relay_states" USING "btree" ("created_at" DESC);


--
-- Name: saml_relay_states_for_email_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX "saml_relay_states_for_email_idx" ON "auth"."saml_relay_states" USING "btree" ("for_email");


--
-- Name: saml_relay_states_sso_provider_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX "saml_relay_states_sso_provider_id_idx" ON "auth"."saml_relay_states" USING "btree" ("sso_provider_id");


--
-- Name: sessions_not_after_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX "sessions_not_after_idx" ON "auth"."sessions" USING "btree" ("not_after" DESC);


--
-- Name: sessions_oauth_client_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX "sessions_oauth_client_id_idx" ON "auth"."sessions" USING "btree" ("oauth_client_id");


--
-- Name: sessions_user_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX "sessions_user_id_idx" ON "auth"."sessions" USING "btree" ("user_id");


--
-- Name: sso_domains_domain_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX "sso_domains_domain_idx" ON "auth"."sso_domains" USING "btree" ("lower"("domain"));


--
-- Name: sso_domains_sso_provider_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX "sso_domains_sso_provider_id_idx" ON "auth"."sso_domains" USING "btree" ("sso_provider_id");


--
-- Name: sso_providers_resource_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX "sso_providers_resource_id_idx" ON "auth"."sso_providers" USING "btree" ("lower"("resource_id"));


--
-- Name: sso_providers_resource_id_pattern_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX "sso_providers_resource_id_pattern_idx" ON "auth"."sso_providers" USING "btree" ("resource_id" "text_pattern_ops");


--
-- Name: unique_phone_factor_per_user; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX "unique_phone_factor_per_user" ON "auth"."mfa_factors" USING "btree" ("user_id", "phone");


--
-- Name: user_id_created_at_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX "user_id_created_at_idx" ON "auth"."sessions" USING "btree" ("user_id", "created_at");


--
-- Name: users_email_partial_key; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX "users_email_partial_key" ON "auth"."users" USING "btree" ("email") WHERE ("is_sso_user" = false);


--
-- Name: INDEX "users_email_partial_key"; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON INDEX "auth"."users_email_partial_key" IS 'Auth: A partial unique index that applies only when is_sso_user is false';


--
-- Name: users_instance_id_email_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX "users_instance_id_email_idx" ON "auth"."users" USING "btree" ("instance_id", "lower"(("email")::"text"));


--
-- Name: users_instance_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX "users_instance_id_idx" ON "auth"."users" USING "btree" ("instance_id");


--
-- Name: users_is_anonymous_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX "users_is_anonymous_idx" ON "auth"."users" USING "btree" ("is_anonymous");


--
-- Name: webauthn_challenges_expires_at_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX "webauthn_challenges_expires_at_idx" ON "auth"."webauthn_challenges" USING "btree" ("expires_at");


--
-- Name: webauthn_challenges_user_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX "webauthn_challenges_user_id_idx" ON "auth"."webauthn_challenges" USING "btree" ("user_id");


--
-- Name: webauthn_credentials_credential_id_key; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX "webauthn_credentials_credential_id_key" ON "auth"."webauthn_credentials" USING "btree" ("credential_id");


--
-- Name: webauthn_credentials_user_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX "webauthn_credentials_user_id_idx" ON "auth"."webauthn_credentials" USING "btree" ("user_id");


--
-- Name: idx_energy_live_farm_system; Type: INDEX; Schema: energy; Owner: postgres
--

CREATE INDEX "idx_energy_live_farm_system" ON "energy"."live" USING "btree" ("farm_id", "system_id");


--
-- Name: idx_energy_live_measured_at; Type: INDEX; Schema: energy; Owner: postgres
--

CREATE INDEX "idx_energy_live_measured_at" ON "energy"."live" USING "btree" ("measured_at" DESC);


--
-- Name: idx_energy_timeseries_farm_measured; Type: INDEX; Schema: energy; Owner: postgres
--

CREATE INDEX "idx_energy_timeseries_farm_measured" ON "energy"."timeseries" USING "btree" ("farm_id", "measured_at" DESC);


--
-- Name: idx_energy_timeseries_farm_system; Type: INDEX; Schema: energy; Owner: postgres
--

CREATE INDEX "idx_energy_timeseries_farm_system" ON "energy"."timeseries" USING "btree" ("farm_id", "system_id");


--
-- Name: idx_energy_timeseries_measured_at; Type: INDEX; Schema: energy; Owner: postgres
--

CREATE INDEX "idx_energy_timeseries_measured_at" ON "energy"."timeseries" USING "btree" ("measured_at" DESC);


--
-- Name: farm_user_invitation_active_unique; Type: INDEX; Schema: private; Owner: postgres
--

CREATE UNIQUE INDEX "farm_user_invitation_active_unique" ON "private"."farm_user_invitation" USING "btree" ("farm_id", "email") WHERE (("revoked_at" IS NULL) AND ("accepted_at" IS NULL));


--
-- Name: farm_user_farm_id_user_id_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "farm_user_farm_id_user_id_key" ON "public"."farm_user" USING "btree" ("farm_id", "user_id");


--
-- Name: feed_supplier_identity_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "feed_supplier_identity_idx" ON "public"."feed_supplier" USING "btree" ("lower"(TRIM(BOTH FROM "company_name")), "lower"(TRIM(BOTH FROM "location_country")), "lower"(COALESCE(TRIM(BOTH FROM "location_city"), ''::"text")));


--
-- Name: feed_type_identity_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "feed_type_identity_idx" ON "public"."feed_type" USING "btree" (COALESCE("farm_id", '00000000-0000-0000-0000-000000000000'::"uuid"), "feed_supplier_id", "lower"(COALESCE(TRIM(BOTH FROM "feed_line"), ''::"text")), "feed_category", "feed_pellet_size", COALESCE("crude_protein_percentage", '-1'::double precision), COALESCE("crude_fat_percentage", '-1'::double precision));


--
-- Name: feeding_rate_config_version_phase_valid_from_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "feeding_rate_config_version_phase_valid_from_idx" ON "public"."feeding_rate_config" USING "btree" ("version", "scenario", "phase_id", "valid_from");


--
-- Name: feeding_record_local_id_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "feeding_record_local_id_key" ON "public"."feeding_record" USING "btree" ("local_id");


--
-- Name: feeding_record_local_id_unique; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "feeding_record_local_id_unique" ON "public"."feeding_record" USING "btree" ("system_id", "local_id") WHERE ("local_id" IS NOT NULL);


--
-- Name: fish_harvest_local_id_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "fish_harvest_local_id_key" ON "public"."fish_harvest" USING "btree" ("local_id");


--
-- Name: fish_harvest_local_id_unique; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "fish_harvest_local_id_unique" ON "public"."fish_harvest" USING "btree" ("system_id", "local_id") WHERE ("local_id" IS NOT NULL);


--
-- Name: fish_mortality_farm_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "fish_mortality_farm_id_idx" ON "public"."fish_mortality" USING "btree" ("farm_id");


--
-- Name: fish_mortality_local_id_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "fish_mortality_local_id_key" ON "public"."fish_mortality" USING "btree" ("local_id");


--
-- Name: fish_mortality_local_id_unique; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "fish_mortality_local_id_unique" ON "public"."fish_mortality" USING "btree" ("system_id", "local_id") WHERE ("local_id" IS NOT NULL);


--
-- Name: fish_sampling_weight_local_id_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "fish_sampling_weight_local_id_key" ON "public"."fish_sampling_weight" USING "btree" ("local_id");


--
-- Name: fish_sampling_weight_local_id_unique; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "fish_sampling_weight_local_id_unique" ON "public"."fish_sampling_weight" USING "btree" ("system_id", "local_id") WHERE ("local_id" IS NOT NULL);


--
-- Name: fish_stocking_local_id_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "fish_stocking_local_id_key" ON "public"."fish_stocking" USING "btree" ("local_id");


--
-- Name: fish_stocking_local_id_unique; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "fish_stocking_local_id_unique" ON "public"."fish_stocking" USING "btree" ("system_id", "local_id") WHERE ("local_id" IS NOT NULL);


--
-- Name: fish_transfer_local_id_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "fish_transfer_local_id_key" ON "public"."fish_transfer" USING "btree" ("local_id");


--
-- Name: fish_transfer_local_id_unique; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "fish_transfer_local_id_unique" ON "public"."fish_transfer" USING "btree" ("origin_system_id", "local_id") WHERE ("local_id" IS NOT NULL);


--
-- Name: idx_alert_threshold_farm_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_alert_threshold_farm_id" ON "public"."alert_threshold" USING "btree" ("farm_id") WHERE ("farm_id" IS NOT NULL);


--
-- Name: idx_alert_threshold_system_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_alert_threshold_system_id" ON "public"."alert_threshold" USING "btree" ("system_id") WHERE ("system_id" IS NOT NULL);


--
-- Name: idx_daily_water_quality_rating_system_date_desc; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_daily_water_quality_rating_system_date_desc" ON "public"."daily_water_quality_rating" USING "btree" ("system_id", "rating_date" DESC, "created_at" DESC, "id" DESC);


--
-- Name: idx_daily_wq_rating_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_daily_wq_rating_date" ON "public"."daily_water_quality_rating" USING "btree" ("rating_date");


--
-- Name: idx_energy_alarm_events_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_energy_alarm_events_active" ON "public"."energy_alarm_events" USING "btree" ("farm_id", "status", "severity", "started_at" DESC) WHERE ("status" <> 'resolved'::"text");


--
-- Name: idx_energy_alarm_events_farm_started_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_energy_alarm_events_farm_started_at" ON "public"."energy_alarm_events" USING "btree" ("farm_id", "started_at" DESC);


--
-- Name: idx_energy_meter_timeseries_farm_meter_measured_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_energy_meter_timeseries_farm_meter_measured_at" ON "public"."energy_meter_timeseries" USING "btree" ("farm_id", "meter_id", "measured_at" DESC);


--
-- Name: idx_farm_org_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_farm_org_id" ON "public"."farm" USING "btree" ("organization_id");


--
-- Name: idx_farm_user_farm_user_role; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_farm_user_farm_user_role" ON "public"."farm_user" USING "btree" ("farm_id", "user_id", "role");


--
-- Name: idx_farm_user_user_farm; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_farm_user_user_farm" ON "public"."farm_user" USING "btree" ("user_id", "farm_id");


--
-- Name: idx_farm_user_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_farm_user_user_id" ON "public"."farm_user" USING "btree" ("user_id");


--
-- Name: idx_feed_inventory_farm_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_feed_inventory_farm_date" ON "public"."feed_inventory" USING "btree" ("farm_id", "inventory_date");


--
-- Name: idx_feed_inventory_feed_type_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_feed_inventory_feed_type_date" ON "public"."feed_inventory" USING "btree" ("feed_type_id", "inventory_date");


--
-- Name: idx_feed_inventory_feed_type_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_feed_inventory_feed_type_id" ON "public"."feed_inventory" USING "btree" ("feed_type_id");


--
-- Name: idx_feed_type_farm_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_feed_type_farm_id" ON "public"."feed_type" USING "btree" ("farm_id");


--
-- Name: idx_feed_type_feed_supplier; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_feed_type_feed_supplier" ON "public"."feed_type" USING "btree" ("feed_supplier_id");


--
-- Name: idx_feeding_record_batch_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_feeding_record_batch_id" ON "public"."feeding_record" USING "btree" ("batch_id");


--
-- Name: idx_feeding_record_cycle_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_feeding_record_cycle_id" ON "public"."feeding_record" USING "btree" ("cycle_id");


--
-- Name: idx_feeding_record_feed_type_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_feeding_record_feed_type_id" ON "public"."feeding_record" USING "btree" ("feed_type_id");


--
-- Name: idx_feeding_record_response_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_feeding_record_response_date" ON "public"."feeding_record" USING "btree" ("system_id", "date", "feeding_response");


--
-- Name: idx_feeding_record_system_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_feeding_record_system_date" ON "public"."feeding_record" USING "btree" ("system_id", "date");


--
-- Name: idx_fh_system_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_fh_system_date" ON "public"."fish_harvest" USING "btree" ("system_id", "date");


--
-- Name: idx_fingerling_batch_farm_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_fingerling_batch_farm_id" ON "public"."fingerling_batch" USING "btree" ("farm_id");


--
-- Name: idx_fingerling_batch_supplier_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_fingerling_batch_supplier_id" ON "public"."fingerling_batch" USING "btree" ("supplier_id");


--
-- Name: idx_fish_harvest_batch_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_fish_harvest_batch_id" ON "public"."fish_harvest" USING "btree" ("batch_id");


--
-- Name: idx_fish_harvest_cycle_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_fish_harvest_cycle_id" ON "public"."fish_harvest" USING "btree" ("cycle_id");


--
-- Name: idx_fish_harvest_system_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_fish_harvest_system_date" ON "public"."fish_harvest" USING "btree" ("system_id", "date" DESC);


--
-- Name: idx_fish_mortality_batch_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_fish_mortality_batch_id" ON "public"."fish_mortality" USING "btree" ("batch_id");


--
-- Name: idx_fish_mortality_cycle_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_fish_mortality_cycle_id" ON "public"."fish_mortality" USING "btree" ("cycle_id");


--
-- Name: idx_fish_mortality_farm_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_fish_mortality_farm_date" ON "public"."fish_mortality" USING "btree" ("farm_id", "date" DESC);


--
-- Name: idx_fish_mortality_system_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_fish_mortality_system_date" ON "public"."fish_mortality" USING "btree" ("system_id", "date");


--
-- Name: idx_fish_sampling_weight_batch_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_fish_sampling_weight_batch_id" ON "public"."fish_sampling_weight" USING "btree" ("batch_id");


--
-- Name: idx_fish_sampling_weight_cycle_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_fish_sampling_weight_cycle_id" ON "public"."fish_sampling_weight" USING "btree" ("cycle_id");


--
-- Name: idx_fish_sampling_weight_system_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_fish_sampling_weight_system_date" ON "public"."fish_sampling_weight" USING "btree" ("system_id", "date" DESC);


--
-- Name: idx_fish_stocking_batch_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_fish_stocking_batch_id" ON "public"."fish_stocking" USING "btree" ("batch_id");


--
-- Name: idx_fish_stocking_cycle_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_fish_stocking_cycle_id" ON "public"."fish_stocking" USING "btree" ("cycle_id");


--
-- Name: idx_fish_stocking_system_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_fish_stocking_system_date" ON "public"."fish_stocking" USING "btree" ("system_id", "date" DESC);


--
-- Name: idx_fish_transfer_batch_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_fish_transfer_batch_id" ON "public"."fish_transfer" USING "btree" ("batch_id");


--
-- Name: idx_fish_transfer_cycle_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_fish_transfer_cycle_id" ON "public"."fish_transfer" USING "btree" ("cycle_id");


--
-- Name: idx_fish_transfer_origin_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_fish_transfer_origin_date" ON "public"."fish_transfer" USING "btree" ("origin_system_id", "date" DESC);


--
-- Name: idx_fish_transfer_system_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_fish_transfer_system_date" ON "public"."fish_transfer" USING "btree" ("origin_system_id", "date" DESC);


--
-- Name: idx_fish_transfer_target_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_fish_transfer_target_date" ON "public"."fish_transfer" USING "btree" ("target_system_id", "date" DESC);


--
-- Name: idx_fish_transfer_type_date_desc; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_fish_transfer_type_date_desc" ON "public"."fish_transfer" USING "btree" ("transfer_type", "date" DESC);


--
-- Name: idx_fs_system_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_fs_system_date" ON "public"."fish_stocking" USING "btree" ("system_id", "date");


--
-- Name: idx_ft_origin_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_ft_origin_date" ON "public"."fish_transfer" USING "btree" ("origin_system_id", "date");


--
-- Name: idx_ft_target_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_ft_target_date" ON "public"."fish_transfer" USING "btree" ("target_system_id", "date");


--
-- Name: idx_norm_review_farm_unresolved; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_norm_review_farm_unresolved" ON "public"."normalization_review" USING "btree" ("farm_id", "resolved", "created_at" DESC);


--
-- Name: idx_normalization_review_raw_upload_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_normalization_review_raw_upload_id" ON "public"."normalization_review" USING "btree" ("raw_upload_id");


--
-- Name: idx_normalization_review_resolved_by; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_normalization_review_resolved_by" ON "public"."normalization_review" USING "btree" ("resolved_by");


--
-- Name: idx_organization_owner_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_organization_owner_id" ON "public"."organization" USING "btree" ("owner_id");


--
-- Name: idx_production_cycle_batch_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_production_cycle_batch_id" ON "public"."production_cycle" USING "btree" ("batch_id");


--
-- Name: idx_production_cycle_previous_system_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_production_cycle_previous_system_id" ON "public"."production_cycle" USING "btree" ("previous_system_id");


--
-- Name: idx_production_cycle_system_ongoing; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_production_cycle_system_ongoing" ON "public"."production_cycle" USING "btree" ("system_id") WHERE ("ongoing_cycle" = true);


--
-- Name: idx_raw_uploads_farm_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_raw_uploads_farm_status" ON "public"."raw_uploads" USING "btree" ("farm_id", "status", "uploaded_at" DESC);


--
-- Name: idx_raw_uploads_reviewed_by; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_raw_uploads_reviewed_by" ON "public"."raw_uploads" USING "btree" ("reviewed_by");


--
-- Name: idx_raw_uploads_uploaded_by; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_raw_uploads_uploaded_by" ON "public"."raw_uploads" USING "btree" ("uploaded_by");


--
-- Name: idx_system_farm_id_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_system_farm_id_id" ON "public"."system" USING "btree" ("farm_id", "id");


--
-- Name: idx_system_name_change_log_system_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_system_name_change_log_system_id" ON "public"."system_name_change_log" USING "btree" ("system_id", "changed_at" DESC);


--
-- Name: idx_user_profile_farm_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_user_profile_farm_id" ON "public"."user_profile" USING "btree" ("farm_id") WHERE ("farm_id" IS NOT NULL);


--
-- Name: idx_user_profile_organization_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_user_profile_organization_id" ON "public"."user_profile" USING "btree" ("organization_id") WHERE ("organization_id" IS NOT NULL);


--
-- Name: idx_water_quality_measurement_system_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_water_quality_measurement_system_date" ON "public"."water_quality_measurement" USING "btree" ("system_id", "date" DESC);


--
-- Name: idx_water_quality_measurement_system_measured_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_water_quality_measurement_system_measured_at" ON "public"."water_quality_measurement" USING "btree" ("system_id", "measured_at" DESC);


--
-- Name: idx_wqm_system_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_wqm_system_date" ON "public"."water_quality_measurement" USING "btree" ("system_id", "date" DESC);


--
-- Name: idx_wqm_system_date_time; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_wqm_system_date_time" ON "public"."water_quality_measurement" USING "btree" ("system_id", "date", "time");


--
-- Name: idx_wqm_system_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_wqm_system_id" ON "public"."water_quality_measurement" USING "btree" ("system_id");


--
-- Name: idx_wqm_system_measured_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_wqm_system_measured_at" ON "public"."water_quality_measurement" USING "btree" ("system_id", "measured_at");


--
-- Name: system_active_name_farm_unique; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "system_active_name_farm_unique" ON "public"."system" USING "btree" ("farm_id", "name") WHERE ("is_active" IS TRUE);


--
-- Name: uq_one_active_cycle_per_system; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "uq_one_active_cycle_per_system" ON "public"."production_cycle" USING "btree" ("system_id") WHERE ("ongoing_cycle" = true);


--
-- Name: water_quality_measurement_local_id_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "water_quality_measurement_local_id_key" ON "public"."water_quality_measurement" USING "btree" ("local_id");


--
-- Name: water_quality_measurement_local_id_unique; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "water_quality_measurement_local_id_unique" ON "public"."water_quality_measurement" USING "btree" ("system_id", "local_id") WHERE ("local_id" IS NOT NULL);


--
-- Name: ix_realtime_subscription_entity; Type: INDEX; Schema: realtime; Owner: supabase_admin
--

CREATE INDEX "ix_realtime_subscription_entity" ON "realtime"."subscription" USING "btree" ("entity");


--
-- Name: messages_inserted_at_topic_index; Type: INDEX; Schema: realtime; Owner: supabase_realtime_admin
--

CREATE INDEX "messages_inserted_at_topic_index" ON ONLY "realtime"."messages" USING "btree" ("inserted_at" DESC, "topic") WHERE (("extension" = 'broadcast'::"text") AND ("private" IS TRUE));


--
-- Name: messages_2026_06_29_inserted_at_topic_idx; Type: INDEX; Schema: realtime; Owner: supabase_realtime_admin
--

CREATE INDEX "messages_2026_06_29_inserted_at_topic_idx" ON "realtime"."messages_2026_06_29" USING "btree" ("inserted_at" DESC, "topic") WHERE (("extension" = 'broadcast'::"text") AND ("private" IS TRUE));


--
-- Name: messages_2026_06_30_inserted_at_topic_idx; Type: INDEX; Schema: realtime; Owner: supabase_realtime_admin
--

CREATE INDEX "messages_2026_06_30_inserted_at_topic_idx" ON "realtime"."messages_2026_06_30" USING "btree" ("inserted_at" DESC, "topic") WHERE (("extension" = 'broadcast'::"text") AND ("private" IS TRUE));


--
-- Name: messages_2026_07_01_inserted_at_topic_idx; Type: INDEX; Schema: realtime; Owner: supabase_realtime_admin
--

CREATE INDEX "messages_2026_07_01_inserted_at_topic_idx" ON "realtime"."messages_2026_07_01" USING "btree" ("inserted_at" DESC, "topic") WHERE (("extension" = 'broadcast'::"text") AND ("private" IS TRUE));


--
-- Name: messages_2026_07_02_inserted_at_topic_idx; Type: INDEX; Schema: realtime; Owner: supabase_realtime_admin
--

CREATE INDEX "messages_2026_07_02_inserted_at_topic_idx" ON "realtime"."messages_2026_07_02" USING "btree" ("inserted_at" DESC, "topic") WHERE (("extension" = 'broadcast'::"text") AND ("private" IS TRUE));


--
-- Name: messages_2026_07_03_inserted_at_topic_idx; Type: INDEX; Schema: realtime; Owner: supabase_realtime_admin
--

CREATE INDEX "messages_2026_07_03_inserted_at_topic_idx" ON "realtime"."messages_2026_07_03" USING "btree" ("inserted_at" DESC, "topic") WHERE (("extension" = 'broadcast'::"text") AND ("private" IS TRUE));


--
-- Name: messages_2026_07_04_inserted_at_topic_idx; Type: INDEX; Schema: realtime; Owner: supabase_realtime_admin
--

CREATE INDEX "messages_2026_07_04_inserted_at_topic_idx" ON "realtime"."messages_2026_07_04" USING "btree" ("inserted_at" DESC, "topic") WHERE (("extension" = 'broadcast'::"text") AND ("private" IS TRUE));


--
-- Name: messages_2026_07_05_inserted_at_topic_idx; Type: INDEX; Schema: realtime; Owner: supabase_realtime_admin
--

CREATE INDEX "messages_2026_07_05_inserted_at_topic_idx" ON "realtime"."messages_2026_07_05" USING "btree" ("inserted_at" DESC, "topic") WHERE (("extension" = 'broadcast'::"text") AND ("private" IS TRUE));


--
-- Name: messages_2026_07_06_inserted_at_topic_idx; Type: INDEX; Schema: realtime; Owner: supabase_realtime_admin
--

CREATE INDEX "messages_2026_07_06_inserted_at_topic_idx" ON "realtime"."messages_2026_07_06" USING "btree" ("inserted_at" DESC, "topic") WHERE (("extension" = 'broadcast'::"text") AND ("private" IS TRUE));


--
-- Name: subscription_subscription_id_entity_filters_action_filter_selec; Type: INDEX; Schema: realtime; Owner: supabase_admin
--

CREATE UNIQUE INDEX "subscription_subscription_id_entity_filters_action_filter_selec" ON "realtime"."subscription" USING "btree" ("subscription_id", "entity", "filters", "action_filter", COALESCE("selected_columns", '{}'::"text"[]));


--
-- Name: bname; Type: INDEX; Schema: storage; Owner: supabase_storage_admin
--

CREATE UNIQUE INDEX "bname" ON "storage"."buckets" USING "btree" ("name");


--
-- Name: bucketid_objname; Type: INDEX; Schema: storage; Owner: supabase_storage_admin
--

CREATE UNIQUE INDEX "bucketid_objname" ON "storage"."objects" USING "btree" ("bucket_id", "name");


--
-- Name: buckets_analytics_unique_name_idx; Type: INDEX; Schema: storage; Owner: supabase_storage_admin
--

CREATE UNIQUE INDEX "buckets_analytics_unique_name_idx" ON "storage"."buckets_analytics" USING "btree" ("name") WHERE ("deleted_at" IS NULL);


--
-- Name: idx_multipart_uploads_list; Type: INDEX; Schema: storage; Owner: supabase_storage_admin
--

CREATE INDEX "idx_multipart_uploads_list" ON "storage"."s3_multipart_uploads" USING "btree" ("bucket_id", "key", "created_at");


--
-- Name: idx_objects_bucket_id_name; Type: INDEX; Schema: storage; Owner: supabase_storage_admin
--

CREATE INDEX "idx_objects_bucket_id_name" ON "storage"."objects" USING "btree" ("bucket_id", "name" COLLATE "C");


--
-- Name: idx_objects_bucket_id_name_lower; Type: INDEX; Schema: storage; Owner: supabase_storage_admin
--

CREATE INDEX "idx_objects_bucket_id_name_lower" ON "storage"."objects" USING "btree" ("bucket_id", "lower"("name") COLLATE "C");


--
-- Name: name_prefix_search; Type: INDEX; Schema: storage; Owner: supabase_storage_admin
--

CREATE INDEX "name_prefix_search" ON "storage"."objects" USING "btree" ("name" "text_pattern_ops");


--
-- Name: vector_indexes_name_bucket_id_idx; Type: INDEX; Schema: storage; Owner: supabase_storage_admin
--

CREATE UNIQUE INDEX "vector_indexes_name_bucket_id_idx" ON "storage"."vector_indexes" USING "btree" ("name", "bucket_id");


--
-- Name: messages_2026_06_29_inserted_at_topic_idx; Type: INDEX ATTACH; Schema: realtime; Owner: supabase_realtime_admin
--

ALTER INDEX "realtime"."messages_inserted_at_topic_index" ATTACH PARTITION "realtime"."messages_2026_06_29_inserted_at_topic_idx";


--
-- Name: messages_2026_06_29_pkey; Type: INDEX ATTACH; Schema: realtime; Owner: supabase_realtime_admin
--

ALTER INDEX "realtime"."messages_pkey" ATTACH PARTITION "realtime"."messages_2026_06_29_pkey";


--
-- Name: messages_2026_06_30_inserted_at_topic_idx; Type: INDEX ATTACH; Schema: realtime; Owner: supabase_realtime_admin
--

ALTER INDEX "realtime"."messages_inserted_at_topic_index" ATTACH PARTITION "realtime"."messages_2026_06_30_inserted_at_topic_idx";


--
-- Name: messages_2026_06_30_pkey; Type: INDEX ATTACH; Schema: realtime; Owner: supabase_realtime_admin
--

ALTER INDEX "realtime"."messages_pkey" ATTACH PARTITION "realtime"."messages_2026_06_30_pkey";


--
-- Name: messages_2026_07_01_inserted_at_topic_idx; Type: INDEX ATTACH; Schema: realtime; Owner: supabase_realtime_admin
--

ALTER INDEX "realtime"."messages_inserted_at_topic_index" ATTACH PARTITION "realtime"."messages_2026_07_01_inserted_at_topic_idx";


--
-- Name: messages_2026_07_01_pkey; Type: INDEX ATTACH; Schema: realtime; Owner: supabase_realtime_admin
--

ALTER INDEX "realtime"."messages_pkey" ATTACH PARTITION "realtime"."messages_2026_07_01_pkey";


--
-- Name: messages_2026_07_02_inserted_at_topic_idx; Type: INDEX ATTACH; Schema: realtime; Owner: supabase_realtime_admin
--

ALTER INDEX "realtime"."messages_inserted_at_topic_index" ATTACH PARTITION "realtime"."messages_2026_07_02_inserted_at_topic_idx";


--
-- Name: messages_2026_07_02_pkey; Type: INDEX ATTACH; Schema: realtime; Owner: supabase_realtime_admin
--

ALTER INDEX "realtime"."messages_pkey" ATTACH PARTITION "realtime"."messages_2026_07_02_pkey";


--
-- Name: messages_2026_07_03_inserted_at_topic_idx; Type: INDEX ATTACH; Schema: realtime; Owner: supabase_realtime_admin
--

ALTER INDEX "realtime"."messages_inserted_at_topic_index" ATTACH PARTITION "realtime"."messages_2026_07_03_inserted_at_topic_idx";


--
-- Name: messages_2026_07_03_pkey; Type: INDEX ATTACH; Schema: realtime; Owner: supabase_realtime_admin
--

ALTER INDEX "realtime"."messages_pkey" ATTACH PARTITION "realtime"."messages_2026_07_03_pkey";


--
-- Name: messages_2026_07_04_inserted_at_topic_idx; Type: INDEX ATTACH; Schema: realtime; Owner: supabase_realtime_admin
--

ALTER INDEX "realtime"."messages_inserted_at_topic_index" ATTACH PARTITION "realtime"."messages_2026_07_04_inserted_at_topic_idx";


--
-- Name: messages_2026_07_04_pkey; Type: INDEX ATTACH; Schema: realtime; Owner: supabase_realtime_admin
--

ALTER INDEX "realtime"."messages_pkey" ATTACH PARTITION "realtime"."messages_2026_07_04_pkey";


--
-- Name: messages_2026_07_05_inserted_at_topic_idx; Type: INDEX ATTACH; Schema: realtime; Owner: supabase_realtime_admin
--

ALTER INDEX "realtime"."messages_inserted_at_topic_index" ATTACH PARTITION "realtime"."messages_2026_07_05_inserted_at_topic_idx";


--
-- Name: messages_2026_07_05_pkey; Type: INDEX ATTACH; Schema: realtime; Owner: supabase_realtime_admin
--

ALTER INDEX "realtime"."messages_pkey" ATTACH PARTITION "realtime"."messages_2026_07_05_pkey";


--
-- Name: messages_2026_07_06_inserted_at_topic_idx; Type: INDEX ATTACH; Schema: realtime; Owner: supabase_realtime_admin
--

ALTER INDEX "realtime"."messages_inserted_at_topic_index" ATTACH PARTITION "realtime"."messages_2026_07_06_inserted_at_topic_idx";


--
-- Name: messages_2026_07_06_pkey; Type: INDEX ATTACH; Schema: realtime; Owner: supabase_realtime_admin
--

ALTER INDEX "realtime"."messages_pkey" ATTACH PARTITION "realtime"."messages_2026_07_06_pkey";


--
-- Name: users on_auth_user_created; Type: TRIGGER; Schema: auth; Owner: supabase_auth_admin
--

CREATE TRIGGER "on_auth_user_created" AFTER INSERT ON "auth"."users" FOR EACH ROW EXECUTE FUNCTION "public"."handle_new_user"();


--
-- Name: feeding_record after_feeding_record_del_inventory; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER "after_feeding_record_del_inventory" AFTER DELETE ON "public"."feeding_record" REFERENCING OLD TABLE AS "old_rows" FOR EACH STATEMENT EXECUTE FUNCTION "public"."after_event_queue_old"();


--
-- Name: feeding_record after_feeding_record_ins_inventory; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER "after_feeding_record_ins_inventory" AFTER INSERT ON "public"."feeding_record" REFERENCING NEW TABLE AS "new_rows" FOR EACH STATEMENT EXECUTE FUNCTION "public"."after_event_queue_new"();


--
-- Name: feeding_record after_feeding_record_upd_inventory; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER "after_feeding_record_upd_inventory" AFTER UPDATE ON "public"."feeding_record" REFERENCING NEW TABLE AS "new_rows" FOR EACH STATEMENT EXECUTE FUNCTION "public"."after_event_queue_new"();


--
-- Name: fish_harvest after_fish_harvest_del_inventory; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER "after_fish_harvest_del_inventory" AFTER DELETE ON "public"."fish_harvest" REFERENCING OLD TABLE AS "old_rows" FOR EACH STATEMENT EXECUTE FUNCTION "public"."after_event_queue_old"();


--
-- Name: fish_harvest after_fish_harvest_ins_inventory; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER "after_fish_harvest_ins_inventory" AFTER INSERT ON "public"."fish_harvest" REFERENCING NEW TABLE AS "new_rows" FOR EACH STATEMENT EXECUTE FUNCTION "public"."after_event_queue_new"();


--
-- Name: fish_harvest after_fish_harvest_upd_inventory; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER "after_fish_harvest_upd_inventory" AFTER UPDATE ON "public"."fish_harvest" REFERENCING NEW TABLE AS "new_rows" FOR EACH STATEMENT EXECUTE FUNCTION "public"."after_event_queue_new"();


--
-- Name: fish_mortality after_fish_mortality_del_inventory; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER "after_fish_mortality_del_inventory" AFTER DELETE ON "public"."fish_mortality" REFERENCING OLD TABLE AS "old_rows" FOR EACH STATEMENT EXECUTE FUNCTION "public"."after_event_queue_old"();


--
-- Name: fish_mortality after_fish_mortality_ins_inventory; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER "after_fish_mortality_ins_inventory" AFTER INSERT ON "public"."fish_mortality" REFERENCING NEW TABLE AS "new_rows" FOR EACH STATEMENT EXECUTE FUNCTION "public"."after_event_queue_new"();


--
-- Name: fish_mortality after_fish_mortality_upd_inventory; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER "after_fish_mortality_upd_inventory" AFTER UPDATE ON "public"."fish_mortality" REFERENCING NEW TABLE AS "new_rows" FOR EACH STATEMENT EXECUTE FUNCTION "public"."after_event_queue_new"();


--
-- Name: fish_sampling_weight after_fish_sampling_del_inventory; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER "after_fish_sampling_del_inventory" AFTER DELETE ON "public"."fish_sampling_weight" REFERENCING OLD TABLE AS "old_rows" FOR EACH STATEMENT EXECUTE FUNCTION "public"."after_event_queue_old"();


--
-- Name: fish_sampling_weight after_fish_sampling_ins_inventory; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER "after_fish_sampling_ins_inventory" AFTER INSERT ON "public"."fish_sampling_weight" REFERENCING NEW TABLE AS "new_rows" FOR EACH STATEMENT EXECUTE FUNCTION "public"."after_event_queue_new"();


--
-- Name: fish_sampling_weight after_fish_sampling_upd_inventory; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER "after_fish_sampling_upd_inventory" AFTER UPDATE ON "public"."fish_sampling_weight" REFERENCING NEW TABLE AS "new_rows" FOR EACH STATEMENT EXECUTE FUNCTION "public"."after_event_queue_new"();


--
-- Name: fish_stocking after_fish_stocking_del_inventory; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER "after_fish_stocking_del_inventory" AFTER DELETE ON "public"."fish_stocking" REFERENCING OLD TABLE AS "old_rows" FOR EACH STATEMENT EXECUTE FUNCTION "public"."after_event_queue_old"();


--
-- Name: fish_stocking after_fish_stocking_ins_inventory; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER "after_fish_stocking_ins_inventory" AFTER INSERT ON "public"."fish_stocking" REFERENCING NEW TABLE AS "new_rows" FOR EACH STATEMENT EXECUTE FUNCTION "public"."after_event_queue_new"();


--
-- Name: fish_stocking after_fish_stocking_upd_inventory; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER "after_fish_stocking_upd_inventory" AFTER UPDATE ON "public"."fish_stocking" REFERENCING NEW TABLE AS "new_rows" FOR EACH STATEMENT EXECUTE FUNCTION "public"."after_event_queue_new"();


--
-- Name: fish_transfer after_fish_transfer_del_inventory; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER "after_fish_transfer_del_inventory" AFTER DELETE ON "public"."fish_transfer" REFERENCING OLD TABLE AS "old_rows" FOR EACH STATEMENT EXECUTE FUNCTION "public"."after_event_queue_old"();


--
-- Name: fish_transfer after_fish_transfer_ins_inventory; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER "after_fish_transfer_ins_inventory" AFTER INSERT ON "public"."fish_transfer" REFERENCING NEW TABLE AS "new_rows" FOR EACH STATEMENT EXECUTE FUNCTION "public"."after_event_queue_new"();


--
-- Name: fish_transfer after_fish_transfer_upd_inventory; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER "after_fish_transfer_upd_inventory" AFTER UPDATE ON "public"."fish_transfer" REFERENCING NEW TABLE AS "new_rows" FOR EACH STATEMENT EXECUTE FUNCTION "public"."after_event_queue_new"();


--
-- Name: daily_water_quality_rating no_manual_changes; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER "no_manual_changes" BEFORE INSERT OR DELETE OR UPDATE ON "public"."daily_water_quality_rating" FOR EACH ROW EXECUTE FUNCTION "public"."prevent_manual_wqr_changes"();


--
-- Name: system prevent_system_name_change; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER "prevent_system_name_change" BEFORE UPDATE ON "public"."system" FOR EACH ROW EXECUTE FUNCTION "public"."prevent_system_name_update"();


--
-- Name: system refresh_after_system; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER "refresh_after_system" AFTER INSERT OR DELETE OR UPDATE ON "public"."system" FOR EACH ROW EXECUTE FUNCTION "public"."refresh_after_system_if_needed"();


--
-- Name: fish_transfer trg_abw_transfer; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER "trg_abw_transfer" BEFORE INSERT OR UPDATE OF "number_of_fish_transfer", "total_weight_transfer", "abw" ON "public"."fish_transfer" FOR EACH ROW EXECUTE FUNCTION "public"."trg_compute_abw_transfer"();


--
-- Name: fish_harvest trg_close_cycle_on_final_harvest; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER "trg_close_cycle_on_final_harvest" AFTER INSERT OR UPDATE OF "type_of_harvest", "date", "system_id" ON "public"."fish_harvest" FOR EACH ROW EXECUTE FUNCTION "public"."close_cycle_on_final_harvest"();


--
-- Name: fish_stocking trg_cycle_on_stocking; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER "trg_cycle_on_stocking" BEFORE INSERT OR UPDATE OF "system_id", "batch_id", "date", "cycle_id" ON "public"."fish_stocking" FOR EACH ROW EXECUTE FUNCTION "public"."ensure_cycle_on_stocking"();


--
-- Name: energy_alarm_events trg_energy_alarm_events_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER "trg_energy_alarm_events_updated_at" BEFORE UPDATE ON "public"."energy_alarm_events" FOR EACH ROW EXECUTE FUNCTION "private"."set_updated_at"();


--
-- Name: energy_meter_timeseries trg_energy_meter_timeseries_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER "trg_energy_meter_timeseries_updated_at" BEFORE UPDATE ON "public"."energy_meter_timeseries" FOR EACH ROW EXECUTE FUNCTION "private"."set_updated_at"();


--
-- Name: farm trg_farm_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER "trg_farm_updated_at" BEFORE UPDATE ON "public"."farm" FOR EACH ROW EXECUTE FUNCTION "private"."set_updated_at"();


--
-- Name: feed_inventory trg_feed_inventory_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER "trg_feed_inventory_updated_at" BEFORE UPDATE ON "public"."feed_inventory" FOR EACH ROW EXECUTE FUNCTION "private"."set_updated_at"();


--
-- Name: feed_type trg_feed_type_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER "trg_feed_type_updated_at" BEFORE UPDATE ON "public"."feed_type" FOR EACH ROW EXECUTE FUNCTION "private"."set_updated_at"();


--
-- Name: feeding_rate_config trg_feeding_rate_config_refresh_feeding_model; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER "trg_feeding_rate_config_refresh_feeding_model" AFTER INSERT OR DELETE OR UPDATE OR TRUNCATE ON "public"."feeding_rate_config" FOR EACH STATEMENT EXECUTE FUNCTION "public"."refresh_feeding_model_after_config_change"();


--
-- Name: feeding_record trg_feeding_record_assign_lineage; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER "trg_feeding_record_assign_lineage" BEFORE INSERT OR UPDATE OF "system_id", "date", "cycle_id", "batch_id" ON "public"."feeding_record" FOR EACH ROW EXECUTE FUNCTION "public"."assign_operation_lineage_from_system"();


--
-- Name: feeding_record trg_feeding_record_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER "trg_feeding_record_updated_at" BEFORE UPDATE ON "public"."feeding_record" FOR EACH ROW EXECUTE FUNCTION "private"."set_updated_at"();


--
-- Name: fingerling_batch trg_fingerling_batch_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER "trg_fingerling_batch_updated_at" BEFORE UPDATE ON "public"."fingerling_batch" FOR EACH ROW EXECUTE FUNCTION "private"."set_updated_at"();


--
-- Name: fish_harvest trg_fish_harvest_assign_lineage; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER "trg_fish_harvest_assign_lineage" BEFORE INSERT OR UPDATE OF "system_id", "date", "cycle_id", "batch_id" ON "public"."fish_harvest" FOR EACH ROW EXECUTE FUNCTION "public"."assign_operation_lineage_from_system"();


--
-- Name: fish_harvest trg_fish_harvest_set_abw; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER "trg_fish_harvest_set_abw" BEFORE INSERT OR UPDATE OF "number_of_fish_harvest", "total_weight_harvest", "abw" ON "public"."fish_harvest" FOR EACH ROW EXECUTE FUNCTION "public"."set_harvest_abw"();


--
-- Name: fish_harvest trg_fish_harvest_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER "trg_fish_harvest_updated_at" BEFORE UPDATE ON "public"."fish_harvest" FOR EACH ROW EXECUTE FUNCTION "private"."set_updated_at"();


--
-- Name: fish_mortality trg_fish_mortality_assign_lineage; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER "trg_fish_mortality_assign_lineage" BEFORE INSERT OR UPDATE OF "system_id", "date", "cycle_id", "batch_id" ON "public"."fish_mortality" FOR EACH ROW EXECUTE FUNCTION "public"."assign_operation_lineage_from_system"();


--
-- Name: fish_mortality trg_fish_mortality_set_farm_id; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER "trg_fish_mortality_set_farm_id" BEFORE INSERT OR UPDATE ON "public"."fish_mortality" FOR EACH ROW EXECUTE FUNCTION "private"."set_fish_mortality_farm_id"();


--
-- Name: fish_mortality trg_fish_mortality_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER "trg_fish_mortality_updated_at" BEFORE UPDATE ON "public"."fish_mortality" FOR EACH ROW EXECUTE FUNCTION "private"."set_updated_at"();


--
-- Name: fish_sampling_weight trg_fish_sampling_weight_assign_lineage; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER "trg_fish_sampling_weight_assign_lineage" BEFORE INSERT OR UPDATE OF "system_id", "date", "cycle_id", "batch_id" ON "public"."fish_sampling_weight" FOR EACH ROW EXECUTE FUNCTION "public"."assign_operation_lineage_from_system"();


--
-- Name: fish_sampling_weight trg_fish_sampling_weight_set_abw; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER "trg_fish_sampling_weight_set_abw" BEFORE INSERT OR UPDATE OF "number_of_fish_sampling", "total_weight_sampling", "abw" ON "public"."fish_sampling_weight" FOR EACH ROW EXECUTE FUNCTION "public"."set_sampling_weight_abw"();


--
-- Name: fish_sampling_weight trg_fish_sampling_weight_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER "trg_fish_sampling_weight_updated_at" BEFORE UPDATE ON "public"."fish_sampling_weight" FOR EACH ROW EXECUTE FUNCTION "private"."set_updated_at"();


--
-- Name: fish_stocking trg_fish_stocking_set_abw; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER "trg_fish_stocking_set_abw" BEFORE INSERT OR UPDATE OF "number_of_fish_stocking", "total_weight_stocking", "abw" ON "public"."fish_stocking" FOR EACH ROW EXECUTE FUNCTION "public"."set_stocking_abw"();


--
-- Name: fish_stocking trg_fish_stocking_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER "trg_fish_stocking_updated_at" BEFORE UPDATE ON "public"."fish_stocking" FOR EACH ROW EXECUTE FUNCTION "private"."set_updated_at"();


--
-- Name: fish_transfer trg_fish_transfer_assign_lineage; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER "trg_fish_transfer_assign_lineage" BEFORE INSERT OR UPDATE OF "origin_system_id", "date", "cycle_id", "batch_id" ON "public"."fish_transfer" FOR EACH ROW EXECUTE FUNCTION "public"."assign_transfer_lineage_from_origin"();


--
-- Name: fish_transfer trg_fish_transfer_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER "trg_fish_transfer_updated_at" BEFORE UPDATE ON "public"."fish_transfer" FOR EACH ROW EXECUTE FUNCTION "private"."set_updated_at"();


--
-- Name: growth_phase trg_growth_phase_refresh_feeding_model; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER "trg_growth_phase_refresh_feeding_model" AFTER INSERT OR DELETE OR UPDATE OR TRUNCATE ON "public"."growth_phase" FOR EACH STATEMENT EXECUTE FUNCTION "public"."refresh_feeding_model_after_config_change"();


--
-- Name: fish_sampling_weight trg_growth_stage_on_sampling; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER "trg_growth_stage_on_sampling" AFTER INSERT OR UPDATE OF "abw", "total_weight_sampling", "number_of_fish_sampling" ON "public"."fish_sampling_weight" FOR EACH ROW EXECUTE FUNCTION "public"."trg_update_system_growth_stage"();


--
-- Name: normalization_review trg_normalization_review_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER "trg_normalization_review_updated_at" BEFORE UPDATE ON "public"."normalization_review" FOR EACH ROW EXECUTE FUNCTION "private"."set_updated_at"();


--
-- Name: organization trg_organization_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER "trg_organization_updated_at" BEFORE UPDATE ON "public"."organization" FOR EACH ROW EXECUTE FUNCTION "private"."set_updated_at"();


--
-- Name: production_cycle trg_production_cycle_set_ongoing; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER "trg_production_cycle_set_ongoing" BEFORE INSERT OR UPDATE OF "cycle_end" ON "public"."production_cycle" FOR EACH ROW EXECUTE FUNCTION "public"."production_cycle_set_ongoing"();


--
-- Name: production_cycle trg_production_cycle_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER "trg_production_cycle_updated_at" BEFORE UPDATE ON "public"."production_cycle" FOR EACH ROW EXECUTE FUNCTION "private"."set_updated_at"();


--
-- Name: raw_uploads trg_raw_uploads_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER "trg_raw_uploads_updated_at" BEFORE UPDATE ON "public"."raw_uploads" FOR EACH ROW EXECUTE FUNCTION "private"."set_updated_at"();


--
-- Name: system trg_system_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER "trg_system_updated_at" BEFORE UPDATE ON "public"."system" FOR EACH ROW EXECUTE FUNCTION "private"."set_updated_at"();


--
-- Name: user_settings trg_user_settings_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER "trg_user_settings_updated_at" BEFORE UPDATE ON "public"."user_settings" FOR EACH ROW EXECUTE FUNCTION "private"."set_updated_at"();


--
-- Name: water_quality_measurement trg_water_quality_measurement_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER "trg_water_quality_measurement_updated_at" BEFORE UPDATE ON "public"."water_quality_measurement" FOR EACH ROW EXECUTE FUNCTION "private"."set_updated_at"();


--
-- Name: water_quality_measurement trg_water_quality_sync_measured_at_parts; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER "trg_water_quality_sync_measured_at_parts" BEFORE INSERT OR UPDATE OF "measured_at", "date", "time" ON "public"."water_quality_measurement" FOR EACH ROW EXECUTE FUNCTION "public"."sync_water_quality_measured_at_parts"();


--
-- Name: water_quality_framework water_quality_framework_refresh_daily_rating; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER "water_quality_framework_refresh_daily_rating" AFTER UPDATE ON "public"."water_quality_framework" FOR EACH ROW EXECUTE FUNCTION "public"."trg_refresh_daily_water_quality_rating_from_framework"();


--
-- Name: water_quality_measurement water_quality_measurement_refresh_daily_rating; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER "water_quality_measurement_refresh_daily_rating" AFTER INSERT OR DELETE OR UPDATE ON "public"."water_quality_measurement" FOR EACH ROW EXECUTE FUNCTION "public"."trg_refresh_daily_water_quality_rating"();


--
-- Name: subscription tr_check_filters; Type: TRIGGER; Schema: realtime; Owner: supabase_admin
--

CREATE TRIGGER "tr_check_filters" BEFORE INSERT OR UPDATE ON "realtime"."subscription" FOR EACH ROW EXECUTE FUNCTION "realtime"."subscription_check_filters"();


--
-- Name: buckets enforce_bucket_name_length_trigger; Type: TRIGGER; Schema: storage; Owner: supabase_storage_admin
--

CREATE TRIGGER "enforce_bucket_name_length_trigger" BEFORE INSERT OR UPDATE OF "name" ON "storage"."buckets" FOR EACH ROW EXECUTE FUNCTION "storage"."enforce_bucket_name_length"();


--
-- Name: buckets protect_buckets_delete; Type: TRIGGER; Schema: storage; Owner: supabase_storage_admin
--

CREATE TRIGGER "protect_buckets_delete" BEFORE DELETE ON "storage"."buckets" FOR EACH STATEMENT EXECUTE FUNCTION "storage"."protect_delete"();


--
-- Name: objects protect_objects_delete; Type: TRIGGER; Schema: storage; Owner: supabase_storage_admin
--

CREATE TRIGGER "protect_objects_delete" BEFORE DELETE ON "storage"."objects" FOR EACH STATEMENT EXECUTE FUNCTION "storage"."protect_delete"();


--
-- Name: objects update_objects_updated_at; Type: TRIGGER; Schema: storage; Owner: supabase_storage_admin
--

CREATE TRIGGER "update_objects_updated_at" BEFORE UPDATE ON "storage"."objects" FOR EACH ROW EXECUTE FUNCTION "storage"."update_updated_at_column"();


--
-- Name: identities identities_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY "auth"."identities"
    ADD CONSTRAINT "identities_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;


--
-- Name: mfa_amr_claims mfa_amr_claims_session_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY "auth"."mfa_amr_claims"
    ADD CONSTRAINT "mfa_amr_claims_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "auth"."sessions"("id") ON DELETE CASCADE;


--
-- Name: mfa_challenges mfa_challenges_auth_factor_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY "auth"."mfa_challenges"
    ADD CONSTRAINT "mfa_challenges_auth_factor_id_fkey" FOREIGN KEY ("factor_id") REFERENCES "auth"."mfa_factors"("id") ON DELETE CASCADE;


--
-- Name: mfa_factors mfa_factors_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY "auth"."mfa_factors"
    ADD CONSTRAINT "mfa_factors_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;


--
-- Name: oauth_authorizations oauth_authorizations_client_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY "auth"."oauth_authorizations"
    ADD CONSTRAINT "oauth_authorizations_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "auth"."oauth_clients"("id") ON DELETE CASCADE;


--
-- Name: oauth_authorizations oauth_authorizations_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY "auth"."oauth_authorizations"
    ADD CONSTRAINT "oauth_authorizations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;


--
-- Name: oauth_consents oauth_consents_client_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY "auth"."oauth_consents"
    ADD CONSTRAINT "oauth_consents_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "auth"."oauth_clients"("id") ON DELETE CASCADE;


--
-- Name: oauth_consents oauth_consents_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY "auth"."oauth_consents"
    ADD CONSTRAINT "oauth_consents_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;


--
-- Name: one_time_tokens one_time_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY "auth"."one_time_tokens"
    ADD CONSTRAINT "one_time_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;


--
-- Name: refresh_tokens refresh_tokens_session_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY "auth"."refresh_tokens"
    ADD CONSTRAINT "refresh_tokens_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "auth"."sessions"("id") ON DELETE CASCADE;


--
-- Name: saml_providers saml_providers_sso_provider_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY "auth"."saml_providers"
    ADD CONSTRAINT "saml_providers_sso_provider_id_fkey" FOREIGN KEY ("sso_provider_id") REFERENCES "auth"."sso_providers"("id") ON DELETE CASCADE;


--
-- Name: saml_relay_states saml_relay_states_flow_state_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY "auth"."saml_relay_states"
    ADD CONSTRAINT "saml_relay_states_flow_state_id_fkey" FOREIGN KEY ("flow_state_id") REFERENCES "auth"."flow_state"("id") ON DELETE CASCADE;


--
-- Name: saml_relay_states saml_relay_states_sso_provider_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY "auth"."saml_relay_states"
    ADD CONSTRAINT "saml_relay_states_sso_provider_id_fkey" FOREIGN KEY ("sso_provider_id") REFERENCES "auth"."sso_providers"("id") ON DELETE CASCADE;


--
-- Name: sessions sessions_oauth_client_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY "auth"."sessions"
    ADD CONSTRAINT "sessions_oauth_client_id_fkey" FOREIGN KEY ("oauth_client_id") REFERENCES "auth"."oauth_clients"("id") ON DELETE CASCADE;


--
-- Name: sessions sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY "auth"."sessions"
    ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;


--
-- Name: sso_domains sso_domains_sso_provider_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY "auth"."sso_domains"
    ADD CONSTRAINT "sso_domains_sso_provider_id_fkey" FOREIGN KEY ("sso_provider_id") REFERENCES "auth"."sso_providers"("id") ON DELETE CASCADE;


--
-- Name: webauthn_challenges webauthn_challenges_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY "auth"."webauthn_challenges"
    ADD CONSTRAINT "webauthn_challenges_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;


--
-- Name: webauthn_credentials webauthn_credentials_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY "auth"."webauthn_credentials"
    ADD CONSTRAINT "webauthn_credentials_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;


--
-- Name: live live_farm_id_fkey; Type: FK CONSTRAINT; Schema: energy; Owner: postgres
--

ALTER TABLE ONLY "energy"."live"
    ADD CONSTRAINT "live_farm_id_fkey" FOREIGN KEY ("farm_id") REFERENCES "public"."farm"("id");


--
-- Name: live live_system_id_fkey; Type: FK CONSTRAINT; Schema: energy; Owner: postgres
--

ALTER TABLE ONLY "energy"."live"
    ADD CONSTRAINT "live_system_id_fkey" FOREIGN KEY ("system_id") REFERENCES "public"."system"("id");


--
-- Name: timeseries timeseries_farm_id_fkey; Type: FK CONSTRAINT; Schema: energy; Owner: postgres
--

ALTER TABLE ONLY "energy"."timeseries"
    ADD CONSTRAINT "timeseries_farm_id_fkey" FOREIGN KEY ("farm_id") REFERENCES "public"."farm"("id");


--
-- Name: timeseries timeseries_system_id_fkey; Type: FK CONSTRAINT; Schema: energy; Owner: postgres
--

ALTER TABLE ONLY "energy"."timeseries"
    ADD CONSTRAINT "timeseries_system_id_fkey" FOREIGN KEY ("system_id") REFERENCES "public"."system"("id");


--
-- Name: farm_user_invitation farm_user_invitation_farm_id_fkey; Type: FK CONSTRAINT; Schema: private; Owner: postgres
--

ALTER TABLE ONLY "private"."farm_user_invitation"
    ADD CONSTRAINT "farm_user_invitation_farm_id_fkey" FOREIGN KEY ("farm_id") REFERENCES "public"."farm"("id") ON DELETE CASCADE;


--
-- Name: _affected_systems _affected_systems_system_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."_affected_systems"
    ADD CONSTRAINT "_affected_systems_system_id_fkey" FOREIGN KEY ("system_id") REFERENCES "public"."system"("id") ON DELETE CASCADE;


--
-- Name: alert_threshold alert_threshold_farm_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."alert_threshold"
    ADD CONSTRAINT "alert_threshold_farm_id_fkey" FOREIGN KEY ("farm_id") REFERENCES "public"."farm"("id") ON DELETE CASCADE;


--
-- Name: alert_threshold alert_threshold_system_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."alert_threshold"
    ADD CONSTRAINT "alert_threshold_system_id_fkey" FOREIGN KEY ("system_id") REFERENCES "public"."system"("id") ON DELETE CASCADE;


--
-- Name: daily_water_quality_rating daily_water_quality_rating_system_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."daily_water_quality_rating"
    ADD CONSTRAINT "daily_water_quality_rating_system_id_fkey" FOREIGN KEY ("system_id") REFERENCES "public"."system"("id");


--
-- Name: energy_alarm_events energy_alarm_events_farm_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."energy_alarm_events"
    ADD CONSTRAINT "energy_alarm_events_farm_id_fkey" FOREIGN KEY ("farm_id") REFERENCES "public"."farm"("id") ON DELETE CASCADE;


--
-- Name: energy_meter_timeseries energy_meter_timeseries_farm_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."energy_meter_timeseries"
    ADD CONSTRAINT "energy_meter_timeseries_farm_id_fkey" FOREIGN KEY ("farm_id") REFERENCES "public"."farm"("id") ON DELETE CASCADE;


--
-- Name: farm farm_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."farm"
    ADD CONSTRAINT "farm_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id");


--
-- Name: farm_user farm_user_farm_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."farm_user"
    ADD CONSTRAINT "farm_user_farm_id_fkey" FOREIGN KEY ("farm_id") REFERENCES "public"."farm"("id") ON DELETE CASCADE;


--
-- Name: farm_user farm_user_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."farm_user"
    ADD CONSTRAINT "farm_user_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;


--
-- Name: feed_inventory feed_inventory_farm_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."feed_inventory"
    ADD CONSTRAINT "feed_inventory_farm_id_fkey" FOREIGN KEY ("farm_id") REFERENCES "public"."farm"("id") ON DELETE CASCADE;


--
-- Name: feed_inventory feed_inventory_feed_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."feed_inventory"
    ADD CONSTRAINT "feed_inventory_feed_type_id_fkey" FOREIGN KEY ("feed_type_id") REFERENCES "public"."feed_type"("id") ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: feeding_record feed_record_system_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."feeding_record"
    ADD CONSTRAINT "feed_record_system_id_fkey" FOREIGN KEY ("system_id") REFERENCES "public"."system"("id");


--
-- Name: feed_type feed_type_farm_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."feed_type"
    ADD CONSTRAINT "feed_type_farm_id_fkey" FOREIGN KEY ("farm_id") REFERENCES "public"."farm"("id") ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: feed_type feed_type_feed_supplier_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."feed_type"
    ADD CONSTRAINT "feed_type_feed_supplier_fkey" FOREIGN KEY ("feed_supplier_id") REFERENCES "public"."feed_supplier"("id") ON UPDATE CASCADE;


--
-- Name: feeding_rate_config feeding_rate_config_growth_phase_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."feeding_rate_config"
    ADD CONSTRAINT "feeding_rate_config_growth_phase_fkey" FOREIGN KEY ("scenario", "phase_id") REFERENCES "public"."growth_phase"("scenario", "phase_id") ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: feeding_record feeding_record_batch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."feeding_record"
    ADD CONSTRAINT "feeding_record_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "public"."fingerling_batch"("id") ON UPDATE CASCADE;


--
-- Name: feeding_record feeding_record_cycle_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."feeding_record"
    ADD CONSTRAINT "feeding_record_cycle_id_fkey" FOREIGN KEY ("cycle_id") REFERENCES "public"."production_cycle"("cycle_id");


--
-- Name: feeding_record feeding_record_feed_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."feeding_record"
    ADD CONSTRAINT "feeding_record_feed_id_fkey" FOREIGN KEY ("feed_type_id") REFERENCES "public"."feed_type"("id") ON UPDATE CASCADE;


--
-- Name: fingerling_batch fingerling_batch_farm_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."fingerling_batch"
    ADD CONSTRAINT "fingerling_batch_farm_id_fkey" FOREIGN KEY ("farm_id") REFERENCES "public"."farm"("id");


--
-- Name: fingerling_batch fingerling_batch_supplier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."fingerling_batch"
    ADD CONSTRAINT "fingerling_batch_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "public"."fingerling_supplier"("id") ON UPDATE CASCADE;


--
-- Name: fish_harvest fish_harvest_batch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."fish_harvest"
    ADD CONSTRAINT "fish_harvest_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "public"."fingerling_batch"("id") ON UPDATE CASCADE;


--
-- Name: fish_harvest fish_harvest_cycle_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."fish_harvest"
    ADD CONSTRAINT "fish_harvest_cycle_id_fkey" FOREIGN KEY ("cycle_id") REFERENCES "public"."production_cycle"("cycle_id");


--
-- Name: fish_harvest fish_harvest_system_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."fish_harvest"
    ADD CONSTRAINT "fish_harvest_system_id_fkey" FOREIGN KEY ("system_id") REFERENCES "public"."system"("id") ON UPDATE CASCADE;


--
-- Name: fish_mortality fish_mortality_batch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."fish_mortality"
    ADD CONSTRAINT "fish_mortality_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "public"."fingerling_batch"("id") ON UPDATE CASCADE;


--
-- Name: fish_mortality fish_mortality_cycle_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."fish_mortality"
    ADD CONSTRAINT "fish_mortality_cycle_id_fkey" FOREIGN KEY ("cycle_id") REFERENCES "public"."production_cycle"("cycle_id");


--
-- Name: fish_mortality fish_mortality_farm_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."fish_mortality"
    ADD CONSTRAINT "fish_mortality_farm_id_fkey" FOREIGN KEY ("farm_id") REFERENCES "public"."farm"("id");


--
-- Name: fish_sampling_weight fish_sampling_weight_batch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."fish_sampling_weight"
    ADD CONSTRAINT "fish_sampling_weight_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "public"."fingerling_batch"("id") ON UPDATE CASCADE;


--
-- Name: fish_sampling_weight fish_sampling_weight_cycle_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."fish_sampling_weight"
    ADD CONSTRAINT "fish_sampling_weight_cycle_id_fkey" FOREIGN KEY ("cycle_id") REFERENCES "public"."production_cycle"("cycle_id");


--
-- Name: fish_stocking fish_stocking_batch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."fish_stocking"
    ADD CONSTRAINT "fish_stocking_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "public"."fingerling_batch"("id") ON UPDATE CASCADE;


--
-- Name: fish_stocking fish_stocking_cycle_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."fish_stocking"
    ADD CONSTRAINT "fish_stocking_cycle_id_fkey" FOREIGN KEY ("cycle_id") REFERENCES "public"."production_cycle"("cycle_id");


--
-- Name: fish_transfer fish_transfer_batch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."fish_transfer"
    ADD CONSTRAINT "fish_transfer_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "public"."fingerling_batch"("id") ON UPDATE CASCADE;


--
-- Name: fish_transfer fish_transfer_cycle_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."fish_transfer"
    ADD CONSTRAINT "fish_transfer_cycle_id_fkey" FOREIGN KEY ("cycle_id") REFERENCES "public"."production_cycle"("cycle_id");


--
-- Name: fish_sampling_weight fish_weight_sampling_system_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."fish_sampling_weight"
    ADD CONSTRAINT "fish_weight_sampling_system_id_fkey" FOREIGN KEY ("system_id") REFERENCES "public"."system"("id");


--
-- Name: feeding_record fk_feeding_response_level; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."feeding_record"
    ADD CONSTRAINT "fk_feeding_response_level" FOREIGN KEY ("feeding_response") REFERENCES "public"."feeding_response_level"("level");


--
-- Name: fish_mortality mortality_system_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."fish_mortality"
    ADD CONSTRAINT "mortality_system_id_fkey" FOREIGN KEY ("system_id") REFERENCES "public"."system"("id");


--
-- Name: normalization_review normalization_review_farm_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."normalization_review"
    ADD CONSTRAINT "normalization_review_farm_id_fkey" FOREIGN KEY ("farm_id") REFERENCES "public"."farm"("id") ON DELETE CASCADE;


--
-- Name: normalization_review normalization_review_raw_upload_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."normalization_review"
    ADD CONSTRAINT "normalization_review_raw_upload_id_fkey" FOREIGN KEY ("raw_upload_id") REFERENCES "public"."raw_uploads"("id") ON DELETE SET NULL;


--
-- Name: normalization_review normalization_review_resolved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."normalization_review"
    ADD CONSTRAINT "normalization_review_resolved_by_fkey" FOREIGN KEY ("resolved_by") REFERENCES "auth"."users"("id");


--
-- Name: organization organization_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."organization"
    ADD CONSTRAINT "organization_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;


--
-- Name: production_cycle production_cycle_batch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."production_cycle"
    ADD CONSTRAINT "production_cycle_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "public"."fingerling_batch"("id") ON UPDATE CASCADE;


--
-- Name: production_cycle production_cycle_previous_system_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."production_cycle"
    ADD CONSTRAINT "production_cycle_previous_system_id_fkey" FOREIGN KEY ("previous_system_id") REFERENCES "public"."system"("id");


--
-- Name: production_cycle production_cycle_system_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."production_cycle"
    ADD CONSTRAINT "production_cycle_system_id_fkey" FOREIGN KEY ("system_id") REFERENCES "public"."system"("id") ON UPDATE CASCADE;


--
-- Name: raw_uploads raw_uploads_farm_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."raw_uploads"
    ADD CONSTRAINT "raw_uploads_farm_id_fkey" FOREIGN KEY ("farm_id") REFERENCES "public"."farm"("id") ON DELETE CASCADE;


--
-- Name: raw_uploads raw_uploads_reviewed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."raw_uploads"
    ADD CONSTRAINT "raw_uploads_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "auth"."users"("id");


--
-- Name: raw_uploads raw_uploads_uploaded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."raw_uploads"
    ADD CONSTRAINT "raw_uploads_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "auth"."users"("id");


--
-- Name: fish_stocking stocking_system_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."fish_stocking"
    ADD CONSTRAINT "stocking_system_id_fkey" FOREIGN KEY ("system_id") REFERENCES "public"."system"("id");


--
-- Name: system system_farm_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."system"
    ADD CONSTRAINT "system_farm_id_fkey" FOREIGN KEY ("farm_id") REFERENCES "public"."farm"("id") ON DELETE SET NULL;


--
-- Name: system_name_change_log system_name_change_log_changed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."system_name_change_log"
    ADD CONSTRAINT "system_name_change_log_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "auth"."users"("id");


--
-- Name: system_name_change_log system_name_change_log_system_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."system_name_change_log"
    ADD CONSTRAINT "system_name_change_log_system_id_fkey" FOREIGN KEY ("system_id") REFERENCES "public"."system"("id") ON DELETE CASCADE;


--
-- Name: fish_transfer transfer_origin_system_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."fish_transfer"
    ADD CONSTRAINT "transfer_origin_system_id_fkey" FOREIGN KEY ("origin_system_id") REFERENCES "public"."system"("id");


--
-- Name: fish_transfer transfer_target_system_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."fish_transfer"
    ADD CONSTRAINT "transfer_target_system_id_fkey" FOREIGN KEY ("target_system_id") REFERENCES "public"."system"("id");


--
-- Name: user_profile user_profile_farm_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."user_profile"
    ADD CONSTRAINT "user_profile_farm_id_fkey" FOREIGN KEY ("farm_id") REFERENCES "public"."farm"("id");


--
-- Name: user_profile user_profile_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."user_profile"
    ADD CONSTRAINT "user_profile_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id");


--
-- Name: user_profile user_profile_user_id_auth_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."user_profile"
    ADD CONSTRAINT "user_profile_user_id_auth_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE NOT VALID;


--
-- Name: user_settings user_settings_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."user_settings"
    ADD CONSTRAINT "user_settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."user_profile"("user_id");


--
-- Name: water_quality_measurement water_quality_measurement_parameter_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."water_quality_measurement"
    ADD CONSTRAINT "water_quality_measurement_parameter_fkey" FOREIGN KEY ("parameter_name") REFERENCES "public"."water_quality_framework"("parameter_name");


--
-- Name: water_quality_measurement water_quality_measurements_system_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."water_quality_measurement"
    ADD CONSTRAINT "water_quality_measurements_system_id_fkey" FOREIGN KEY ("system_id") REFERENCES "public"."system"("id");


--
-- Name: objects objects_bucketId_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY "storage"."objects"
    ADD CONSTRAINT "objects_bucketId_fkey" FOREIGN KEY ("bucket_id") REFERENCES "storage"."buckets"("id");


--
-- Name: s3_multipart_uploads s3_multipart_uploads_bucket_id_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY "storage"."s3_multipart_uploads"
    ADD CONSTRAINT "s3_multipart_uploads_bucket_id_fkey" FOREIGN KEY ("bucket_id") REFERENCES "storage"."buckets"("id");


--
-- Name: s3_multipart_uploads_parts s3_multipart_uploads_parts_bucket_id_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY "storage"."s3_multipart_uploads_parts"
    ADD CONSTRAINT "s3_multipart_uploads_parts_bucket_id_fkey" FOREIGN KEY ("bucket_id") REFERENCES "storage"."buckets"("id");


--
-- Name: s3_multipart_uploads_parts s3_multipart_uploads_parts_upload_id_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY "storage"."s3_multipart_uploads_parts"
    ADD CONSTRAINT "s3_multipart_uploads_parts_upload_id_fkey" FOREIGN KEY ("upload_id") REFERENCES "storage"."s3_multipart_uploads"("id") ON DELETE CASCADE;


--
-- Name: vector_indexes vector_indexes_bucket_id_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY "storage"."vector_indexes"
    ADD CONSTRAINT "vector_indexes_bucket_id_fkey" FOREIGN KEY ("bucket_id") REFERENCES "storage"."buckets_vectors"("id");


--
-- Name: audit_log_entries; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE "auth"."audit_log_entries" ENABLE ROW LEVEL SECURITY;

--
-- Name: flow_state; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE "auth"."flow_state" ENABLE ROW LEVEL SECURITY;

--
-- Name: identities; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE "auth"."identities" ENABLE ROW LEVEL SECURITY;

--
-- Name: instances; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE "auth"."instances" ENABLE ROW LEVEL SECURITY;

--
-- Name: mfa_amr_claims; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE "auth"."mfa_amr_claims" ENABLE ROW LEVEL SECURITY;

--
-- Name: mfa_challenges; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE "auth"."mfa_challenges" ENABLE ROW LEVEL SECURITY;

--
-- Name: mfa_factors; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE "auth"."mfa_factors" ENABLE ROW LEVEL SECURITY;

--
-- Name: one_time_tokens; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE "auth"."one_time_tokens" ENABLE ROW LEVEL SECURITY;

--
-- Name: refresh_tokens; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE "auth"."refresh_tokens" ENABLE ROW LEVEL SECURITY;

--
-- Name: saml_providers; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE "auth"."saml_providers" ENABLE ROW LEVEL SECURITY;

--
-- Name: saml_relay_states; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE "auth"."saml_relay_states" ENABLE ROW LEVEL SECURITY;

--
-- Name: schema_migrations; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE "auth"."schema_migrations" ENABLE ROW LEVEL SECURITY;

--
-- Name: sessions; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE "auth"."sessions" ENABLE ROW LEVEL SECURITY;

--
-- Name: sso_domains; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE "auth"."sso_domains" ENABLE ROW LEVEL SECURITY;

--
-- Name: sso_providers; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE "auth"."sso_providers" ENABLE ROW LEVEL SECURITY;

--
-- Name: users; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE "auth"."users" ENABLE ROW LEVEL SECURITY;

--
-- Name: live energy_live: farm members all; Type: POLICY; Schema: energy; Owner: postgres
--

CREATE POLICY "energy_live: farm members all" ON "energy"."live" TO "authenticated" USING ("private"."is_farm_member"("farm_id", ( SELECT "auth"."uid"() AS "uid")));


--
-- Name: live energy_live_farm_members_all; Type: POLICY; Schema: energy; Owner: postgres
--

CREATE POLICY "energy_live_farm_members_all" ON "energy"."live" TO "authenticated" USING ("private"."is_farm_member"("farm_id")) WITH CHECK ("private"."is_farm_member"("farm_id"));


--
-- Name: timeseries energy_timeseries: farm members all; Type: POLICY; Schema: energy; Owner: postgres
--

CREATE POLICY "energy_timeseries: farm members all" ON "energy"."timeseries" TO "authenticated" USING ("private"."is_farm_member"("farm_id", ( SELECT "auth"."uid"() AS "uid")));


--
-- Name: timeseries energy_timeseries_farm_members_all; Type: POLICY; Schema: energy; Owner: postgres
--

CREATE POLICY "energy_timeseries_farm_members_all" ON "energy"."timeseries" TO "authenticated" USING ("private"."is_farm_member"("farm_id")) WITH CHECK ("private"."is_farm_member"("farm_id"));


--
-- Name: live; Type: ROW SECURITY; Schema: energy; Owner: postgres
--

ALTER TABLE "energy"."live" ENABLE ROW LEVEL SECURITY;

--
-- Name: timeseries; Type: ROW SECURITY; Schema: energy; Owner: postgres
--

ALTER TABLE "energy"."timeseries" ENABLE ROW LEVEL SECURITY;

--
-- Name: water_quality_framework Authenticated users can read water_quality_framework; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Authenticated users can read water_quality_framework" ON "public"."water_quality_framework" FOR SELECT TO "authenticated" USING (true);


--
-- Name: alert_threshold; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."alert_threshold" ENABLE ROW LEVEL SECURITY;

--
-- Name: alert_threshold alert_threshold_delete; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "alert_threshold_delete" ON "public"."alert_threshold" FOR DELETE TO "authenticated" USING (((("scope" = 'farm'::"text") AND "private"."has_farm_role"("farm_id", ARRAY['admin'::"text", 'farm_manager'::"text"], ( SELECT "auth"."uid"() AS "uid"))) OR (("scope" = 'system'::"text") AND (EXISTS ( SELECT 1
   FROM "public"."system" "s"
  WHERE (("s"."id" = "alert_threshold"."system_id") AND "private"."has_farm_role"("s"."farm_id", ARRAY['admin'::"text", 'farm_manager'::"text"], ( SELECT "auth"."uid"() AS "uid"))))))));


--
-- Name: alert_threshold alert_threshold_select_farm_member; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "alert_threshold_select_farm_member" ON "public"."alert_threshold" FOR SELECT TO "authenticated" USING (((("farm_id" IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM "public"."farm_user" "fu"
  WHERE (("fu"."farm_id" = "alert_threshold"."farm_id") AND ("fu"."user_id" = ( SELECT "auth"."uid"() AS "uid")))))) OR (("system_id" IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM ("public"."system" "s"
     JOIN "public"."farm_user" "fu" ON (("fu"."farm_id" = "s"."farm_id")))
  WHERE (("s"."id" = "alert_threshold"."system_id") AND ("fu"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))))));


--
-- Name: alert_threshold alert_threshold_update_admin_manager; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "alert_threshold_update_admin_manager" ON "public"."alert_threshold" FOR UPDATE TO "authenticated" USING (((("farm_id" IS NOT NULL) AND "private"."has_farm_role"("farm_id", ARRAY['admin'::"text", 'farm_manager'::"text"])) OR (("system_id" IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM "public"."system" "s"
  WHERE (("s"."id" = "alert_threshold"."system_id") AND "private"."has_farm_role"("s"."farm_id", ARRAY['admin'::"text", 'farm_manager'::"text"]))))))) WITH CHECK (((("farm_id" IS NOT NULL) AND "private"."has_farm_role"("farm_id", ARRAY['admin'::"text", 'farm_manager'::"text"])) OR (("system_id" IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM "public"."system" "s"
  WHERE (("s"."id" = "alert_threshold"."system_id") AND "private"."has_farm_role"("s"."farm_id", ARRAY['admin'::"text", 'farm_manager'::"text"])))))));


--
-- Name: alert_threshold alert_threshold_write_admin_manager; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "alert_threshold_write_admin_manager" ON "public"."alert_threshold" FOR INSERT TO "authenticated" WITH CHECK (((("farm_id" IS NOT NULL) AND "private"."has_farm_role"("farm_id", ARRAY['admin'::"text", 'farm_manager'::"text"])) OR (("system_id" IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM "public"."system" "s"
  WHERE (("s"."id" = "alert_threshold"."system_id") AND "private"."has_farm_role"("s"."farm_id", ARRAY['admin'::"text", 'farm_manager'::"text"])))))));


--
-- Name: app_config; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."app_config" ENABLE ROW LEVEL SECURITY;

--
-- Name: app_config app_config_select; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "app_config_select" ON "public"."app_config" FOR SELECT TO "authenticated" USING (true);


--
-- Name: daily_water_quality_rating; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."daily_water_quality_rating" ENABLE ROW LEVEL SECURITY;

--
-- Name: dashboard_time_period; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."dashboard_time_period" ENABLE ROW LEVEL SECURITY;

--
-- Name: dashboard_time_period dashboard_time_period: authenticated read; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "dashboard_time_period: authenticated read" ON "public"."dashboard_time_period" FOR SELECT TO "authenticated" USING (true);


--
-- Name: daily_water_quality_rating dwr_select_farm_member; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "dwr_select_farm_member" ON "public"."daily_water_quality_rating" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."system" "s"
     JOIN "public"."farm_user" "fu" ON (("fu"."farm_id" = "s"."farm_id")))
  WHERE (("s"."id" = "daily_water_quality_rating"."system_id") AND ("fu"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));


--
-- Name: energy_alarm_events; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."energy_alarm_events" ENABLE ROW LEVEL SECURITY;

--
-- Name: energy_alarm_events energy_alarm_events_farm_members_all; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "energy_alarm_events_farm_members_all" ON "public"."energy_alarm_events" TO "authenticated" USING ("private"."is_farm_member"("farm_id")) WITH CHECK ("private"."is_farm_member"("farm_id"));


--
-- Name: energy_meter_timeseries; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."energy_meter_timeseries" ENABLE ROW LEVEL SECURITY;

--
-- Name: energy_meter_timeseries energy_meter_timeseries_farm_members_all; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "energy_meter_timeseries_farm_members_all" ON "public"."energy_meter_timeseries" TO "authenticated" USING ("private"."is_farm_member"("farm_id")) WITH CHECK ("private"."is_farm_member"("farm_id"));


--
-- Name: farm; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."farm" ENABLE ROW LEVEL SECURITY;

--
-- Name: farm farm_delete; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "farm_delete" ON "public"."farm" FOR DELETE USING ("private"."has_farm_role"("id", ARRAY['admin'::"text", 'farm_manager'::"text"], ( SELECT "auth"."uid"() AS "uid")));


--
-- Name: farm farm_insert; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "farm_insert" ON "public"."farm" FOR INSERT WITH CHECK ((( SELECT "auth"."uid"() AS "uid") IS NOT NULL));


--
-- Name: farm farm_select; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "farm_select" ON "public"."farm" FOR SELECT USING ("private"."is_farm_member"("id", ( SELECT "auth"."uid"() AS "uid")));


--
-- Name: farm farm_update; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "farm_update" ON "public"."farm" FOR UPDATE USING ("private"."has_farm_role"("id", ARRAY['admin'::"text", 'farm_manager'::"text"], ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK ("private"."has_farm_role"("id", ARRAY['admin'::"text", 'farm_manager'::"text"], ( SELECT "auth"."uid"() AS "uid")));


--
-- Name: farm_user; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."farm_user" ENABLE ROW LEVEL SECURITY;

--
-- Name: farm_user farm_user: read own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "farm_user: read own" ON "public"."farm_user" FOR SELECT TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));


--
-- Name: farm_user farm_user_delete; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "farm_user_delete" ON "public"."farm_user" FOR DELETE TO "authenticated" USING ("private"."has_farm_role"("farm_id", ARRAY['admin'::"text"], ( SELECT "auth"."uid"() AS "uid")));


--
-- Name: farm_user farm_user_insert; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "farm_user_insert" ON "public"."farm_user" FOR INSERT TO "authenticated" WITH CHECK ("private"."has_farm_role"("farm_id", ARRAY['admin'::"text"], ( SELECT "auth"."uid"() AS "uid")));


--
-- Name: farm_user farm_user_update; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "farm_user_update" ON "public"."farm_user" FOR UPDATE TO "authenticated" USING ("private"."has_farm_role"("farm_id", ARRAY['admin'::"text"], ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK ("private"."has_farm_role"("farm_id", ARRAY['admin'::"text"], ( SELECT "auth"."uid"() AS "uid")));


--
-- Name: feed_inventory; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."feed_inventory" ENABLE ROW LEVEL SECURITY;

--
-- Name: feed_inventory feed_inventory: delete managers; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "feed_inventory: delete managers" ON "public"."feed_inventory" FOR DELETE TO "authenticated" USING ("private"."has_farm_role"("farm_id", ARRAY['admin'::"text", 'farm_manager'::"text"]));


--
-- Name: feed_inventory feed_inventory: insert write roles; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "feed_inventory: insert write roles" ON "public"."feed_inventory" FOR INSERT TO "authenticated" WITH CHECK ("private"."has_farm_role"("farm_id", ARRAY['admin'::"text", 'farm_manager'::"text", 'farm_technician'::"text"]));


--
-- Name: feed_inventory feed_inventory: read farm members; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "feed_inventory: read farm members" ON "public"."feed_inventory" FOR SELECT TO "authenticated" USING ("private"."is_farm_member"("farm_id"));


--
-- Name: feed_inventory feed_inventory: update managers; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "feed_inventory: update managers" ON "public"."feed_inventory" FOR UPDATE TO "authenticated" USING ("private"."has_farm_role"("farm_id", ARRAY['admin'::"text", 'farm_manager'::"text"])) WITH CHECK ("private"."has_farm_role"("farm_id", ARRAY['admin'::"text", 'farm_manager'::"text"]));


--
-- Name: feed_supplier; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."feed_supplier" ENABLE ROW LEVEL SECURITY;

--
-- Name: feed_supplier feed_supplier: delete by managers; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "feed_supplier: delete by managers" ON "public"."feed_supplier" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."farm_user" "fu"
  WHERE (("fu"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("fu"."role" = ANY (ARRAY['admin'::"text", 'farm_manager'::"text"]))))));


--
-- Name: feed_supplier feed_supplier: insert by managers; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "feed_supplier: insert by managers" ON "public"."feed_supplier" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."farm_user" "fu"
  WHERE (("fu"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("fu"."role" = ANY (ARRAY['admin'::"text", 'farm_manager'::"text"]))))));


--
-- Name: feed_supplier feed_supplier: update by managers; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "feed_supplier: update by managers" ON "public"."feed_supplier" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."farm_user" "fu"
  WHERE (("fu"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("fu"."role" = ANY (ARRAY['admin'::"text", 'farm_manager'::"text"])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."farm_user" "fu"
  WHERE (("fu"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("fu"."role" = ANY (ARRAY['admin'::"text", 'farm_manager'::"text"]))))));


--
-- Name: feed_supplier feed_supplier_select; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "feed_supplier_select" ON "public"."feed_supplier" FOR SELECT TO "authenticated" USING (true);


--
-- Name: feed_type; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."feed_type" ENABLE ROW LEVEL SECURITY;

--
-- Name: feed_type feed_type: delete by farm managers; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "feed_type: delete by farm managers" ON "public"."feed_type" FOR DELETE TO "authenticated" USING ((("farm_id" IS NOT NULL) AND "private"."has_farm_role"("farm_id", ARRAY['admin'::"text", 'farm_manager'::"text"])));


--
-- Name: feed_type feed_type: insert by farm managers; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "feed_type: insert by farm managers" ON "public"."feed_type" FOR INSERT TO "authenticated" WITH CHECK ((("farm_id" IS NOT NULL) AND "private"."has_farm_role"("farm_id", ARRAY['admin'::"text", 'farm_manager'::"text"])));


--
-- Name: feed_type feed_type: read shared or farm scoped; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "feed_type: read shared or farm scoped" ON "public"."feed_type" FOR SELECT TO "authenticated" USING ((("farm_id" IS NULL) OR "private"."is_farm_member"("farm_id")));


--
-- Name: feed_type feed_type: update by farm managers; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "feed_type: update by farm managers" ON "public"."feed_type" FOR UPDATE TO "authenticated" USING ((("farm_id" IS NOT NULL) AND "private"."has_farm_role"("farm_id", ARRAY['admin'::"text", 'farm_manager'::"text"]))) WITH CHECK ((("farm_id" IS NOT NULL) AND "private"."has_farm_role"("farm_id", ARRAY['admin'::"text", 'farm_manager'::"text"])));


--
-- Name: feeding_rate_config; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."feeding_rate_config" ENABLE ROW LEVEL SECURITY;

--
-- Name: feeding_record; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."feeding_record" ENABLE ROW LEVEL SECURITY;

--
-- Name: feeding_record feeding_record: delete by managers; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "feeding_record: delete by managers" ON "public"."feeding_record" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM ("public"."system" "s"
     JOIN "public"."farm_user" "fu" ON (("fu"."farm_id" = "s"."farm_id")))
  WHERE (("s"."id" = "feeding_record"."system_id") AND ("fu"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("fu"."role" = ANY (ARRAY['admin'::"text", 'farm_manager'::"text"]))))));


--
-- Name: feeding_record feeding_record: insert by write roles; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "feeding_record: insert by write roles" ON "public"."feeding_record" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."system" "s"
     JOIN "public"."farm_user" "fu" ON (("fu"."farm_id" = "s"."farm_id")))
  WHERE (("s"."id" = "feeding_record"."system_id") AND ("fu"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("fu"."role" = ANY (ARRAY['admin'::"text", 'farm_manager'::"text", 'system_operator'::"text"]))))));


--
-- Name: feeding_record feeding_record: read if farm member; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "feeding_record: read if farm member" ON "public"."feeding_record" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."system" "s"
     JOIN "public"."farm_user" "fu" ON (("fu"."farm_id" = "s"."farm_id")))
  WHERE (("s"."id" = "feeding_record"."system_id") AND ("fu"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));


--
-- Name: feeding_record feeding_record: update by managers; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "feeding_record: update by managers" ON "public"."feeding_record" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM ("public"."system" "s"
     JOIN "public"."farm_user" "fu" ON (("fu"."farm_id" = "s"."farm_id")))
  WHERE (("s"."id" = "feeding_record"."system_id") AND ("fu"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("fu"."role" = ANY (ARRAY['admin'::"text", 'farm_manager'::"text"])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."system" "s"
     JOIN "public"."farm_user" "fu" ON (("fu"."farm_id" = "s"."farm_id")))
  WHERE (("s"."id" = "feeding_record"."system_id") AND ("fu"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("fu"."role" = ANY (ARRAY['admin'::"text", 'farm_manager'::"text"]))))));


--
-- Name: feeding_response_level; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."feeding_response_level" ENABLE ROW LEVEL SECURITY;

--
-- Name: feeding_response_level feeding_response_level: read authenticated; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "feeding_response_level: read authenticated" ON "public"."feeding_response_level" FOR SELECT TO "authenticated" USING (true);


--
-- Name: fingerling_batch; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."fingerling_batch" ENABLE ROW LEVEL SECURITY;

--
-- Name: fingerling_batch fingerling_batch: delete by managers; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "fingerling_batch: delete by managers" ON "public"."fingerling_batch" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."farm_user" "fu"
  WHERE (("fu"."farm_id" = "fingerling_batch"."farm_id") AND ("fu"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("fu"."role" = ANY (ARRAY['admin'::"text", 'farm_manager'::"text"]))))));


--
-- Name: fingerling_batch fingerling_batch: insert by write roles; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "fingerling_batch: insert by write roles" ON "public"."fingerling_batch" FOR INSERT WITH CHECK ((("farm_id" IS NOT NULL) AND "private"."has_farm_role"("farm_id", ARRAY['admin'::"text", 'farm_manager'::"text", 'system_operator'::"text"], "auth"."uid"())));


--
-- Name: fingerling_batch fingerling_batch: read if user is farm member; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "fingerling_batch: read if user is farm member" ON "public"."fingerling_batch" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."farm_user" "fu"
  WHERE ("fu"."user_id" = ( SELECT "auth"."uid"() AS "uid")))));


--
-- Name: fingerling_batch fingerling_batch: update by managers; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "fingerling_batch: update by managers" ON "public"."fingerling_batch" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."farm_user" "fu"
  WHERE (("fu"."farm_id" = "fingerling_batch"."farm_id") AND ("fu"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("fu"."role" = ANY (ARRAY['admin'::"text", 'farm_manager'::"text"])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."farm_user" "fu"
  WHERE (("fu"."farm_id" = "fingerling_batch"."farm_id") AND ("fu"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("fu"."role" = ANY (ARRAY['admin'::"text", 'farm_manager'::"text"]))))));


--
-- Name: fingerling_supplier; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."fingerling_supplier" ENABLE ROW LEVEL SECURITY;

--
-- Name: fingerling_supplier fingerling_supplier: delete by managers; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "fingerling_supplier: delete by managers" ON "public"."fingerling_supplier" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."farm_user" "fu"
  WHERE (("fu"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("fu"."role" = ANY (ARRAY['admin'::"text", 'farm_manager'::"text"]))))));


--
-- Name: fingerling_supplier fingerling_supplier: insert by write roles; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "fingerling_supplier: insert by write roles" ON "public"."fingerling_supplier" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."farm_user" "fu"
  WHERE (("fu"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("fu"."role" = ANY (ARRAY['admin'::"text", 'farm_manager'::"text", 'system_operator'::"text"]))))));


--
-- Name: fingerling_supplier fingerling_supplier: update by managers; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "fingerling_supplier: update by managers" ON "public"."fingerling_supplier" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."farm_user" "fu"
  WHERE (("fu"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("fu"."role" = ANY (ARRAY['admin'::"text", 'farm_manager'::"text"])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."farm_user" "fu"
  WHERE (("fu"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("fu"."role" = ANY (ARRAY['admin'::"text", 'farm_manager'::"text"]))))));


--
-- Name: fingerling_supplier fingerling_supplier_select; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "fingerling_supplier_select" ON "public"."fingerling_supplier" FOR SELECT TO "authenticated" USING (true);


--
-- Name: fish_harvest; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."fish_harvest" ENABLE ROW LEVEL SECURITY;

--
-- Name: fish_harvest fish_harvest: delete by managers; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "fish_harvest: delete by managers" ON "public"."fish_harvest" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM ("public"."system" "s"
     JOIN "public"."farm_user" "fu" ON (("fu"."farm_id" = "s"."farm_id")))
  WHERE (("s"."id" = "fish_harvest"."system_id") AND ("fu"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("fu"."role" = ANY (ARRAY['admin'::"text", 'farm_manager'::"text"]))))));


--
-- Name: fish_harvest fish_harvest: insert by write roles; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "fish_harvest: insert by write roles" ON "public"."fish_harvest" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."system" "s"
     JOIN "public"."farm_user" "fu" ON (("fu"."farm_id" = "s"."farm_id")))
  WHERE (("s"."id" = "fish_harvest"."system_id") AND ("fu"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("fu"."role" = ANY (ARRAY['admin'::"text", 'farm_manager'::"text", 'system_operator'::"text"]))))));


--
-- Name: fish_harvest fish_harvest: read if farm member; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "fish_harvest: read if farm member" ON "public"."fish_harvest" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."system" "s"
     JOIN "public"."farm_user" "fu" ON (("fu"."farm_id" = "s"."farm_id")))
  WHERE (("s"."id" = "fish_harvest"."system_id") AND ("fu"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));


--
-- Name: fish_harvest fish_harvest: update by managers; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "fish_harvest: update by managers" ON "public"."fish_harvest" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM ("public"."system" "s"
     JOIN "public"."farm_user" "fu" ON (("fu"."farm_id" = "s"."farm_id")))
  WHERE (("s"."id" = "fish_harvest"."system_id") AND ("fu"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("fu"."role" = ANY (ARRAY['admin'::"text", 'farm_manager'::"text"])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."system" "s"
     JOIN "public"."farm_user" "fu" ON (("fu"."farm_id" = "s"."farm_id")))
  WHERE (("s"."id" = "fish_harvest"."system_id") AND ("fu"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("fu"."role" = ANY (ARRAY['admin'::"text", 'farm_manager'::"text"]))))));


--
-- Name: fish_mortality; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."fish_mortality" ENABLE ROW LEVEL SECURITY;

--
-- Name: fish_mortality fish_mortality: delete by managers; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "fish_mortality: delete by managers" ON "public"."fish_mortality" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM ("public"."system" "s"
     JOIN "public"."farm_user" "fu" ON (("fu"."farm_id" = "s"."farm_id")))
  WHERE (("s"."id" = "fish_mortality"."system_id") AND ("fu"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("fu"."role" = ANY (ARRAY['admin'::"text", 'farm_manager'::"text"]))))));


--
-- Name: fish_mortality fish_mortality: insert by write roles; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "fish_mortality: insert by write roles" ON "public"."fish_mortality" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."system" "s"
     JOIN "public"."farm_user" "fu" ON (("fu"."farm_id" = "s"."farm_id")))
  WHERE (("s"."id" = "fish_mortality"."system_id") AND ("fu"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("fu"."role" = ANY (ARRAY['admin'::"text", 'farm_manager'::"text", 'system_operator'::"text"]))))));


--
-- Name: fish_mortality fish_mortality: read if farm member; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "fish_mortality: read if farm member" ON "public"."fish_mortality" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."system" "s"
     JOIN "public"."farm_user" "fu" ON (("fu"."farm_id" = "s"."farm_id")))
  WHERE (("s"."id" = "fish_mortality"."system_id") AND ("fu"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));


--
-- Name: fish_mortality fish_mortality: update by managers; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "fish_mortality: update by managers" ON "public"."fish_mortality" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM ("public"."system" "s"
     JOIN "public"."farm_user" "fu" ON (("fu"."farm_id" = "s"."farm_id")))
  WHERE (("s"."id" = "fish_mortality"."system_id") AND ("fu"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("fu"."role" = ANY (ARRAY['admin'::"text", 'farm_manager'::"text"])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."system" "s"
     JOIN "public"."farm_user" "fu" ON (("fu"."farm_id" = "s"."farm_id")))
  WHERE (("s"."id" = "fish_mortality"."system_id") AND ("fu"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("fu"."role" = ANY (ARRAY['admin'::"text", 'farm_manager'::"text"]))))));


--
-- Name: fish_sampling_weight; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."fish_sampling_weight" ENABLE ROW LEVEL SECURITY;

--
-- Name: fish_sampling_weight fish_sampling_weight: delete by managers; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "fish_sampling_weight: delete by managers" ON "public"."fish_sampling_weight" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM ("public"."system" "s"
     JOIN "public"."farm_user" "fu" ON (("fu"."farm_id" = "s"."farm_id")))
  WHERE (("s"."id" = "fish_sampling_weight"."system_id") AND ("fu"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("fu"."role" = ANY (ARRAY['admin'::"text", 'farm_manager'::"text"]))))));


--
-- Name: fish_sampling_weight fish_sampling_weight: insert by write roles; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "fish_sampling_weight: insert by write roles" ON "public"."fish_sampling_weight" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."system" "s"
     JOIN "public"."farm_user" "fu" ON (("fu"."farm_id" = "s"."farm_id")))
  WHERE (("s"."id" = "fish_sampling_weight"."system_id") AND ("fu"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("fu"."role" = ANY (ARRAY['admin'::"text", 'farm_manager'::"text", 'system_operator'::"text"]))))));


--
-- Name: fish_sampling_weight fish_sampling_weight: read if farm member; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "fish_sampling_weight: read if farm member" ON "public"."fish_sampling_weight" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."system" "s"
     JOIN "public"."farm_user" "fu" ON (("fu"."farm_id" = "s"."farm_id")))
  WHERE (("s"."id" = "fish_sampling_weight"."system_id") AND ("fu"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));


--
-- Name: fish_sampling_weight fish_sampling_weight: update by managers; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "fish_sampling_weight: update by managers" ON "public"."fish_sampling_weight" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM ("public"."system" "s"
     JOIN "public"."farm_user" "fu" ON (("fu"."farm_id" = "s"."farm_id")))
  WHERE (("s"."id" = "fish_sampling_weight"."system_id") AND ("fu"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("fu"."role" = ANY (ARRAY['admin'::"text", 'farm_manager'::"text"])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."system" "s"
     JOIN "public"."farm_user" "fu" ON (("fu"."farm_id" = "s"."farm_id")))
  WHERE (("s"."id" = "fish_sampling_weight"."system_id") AND ("fu"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("fu"."role" = ANY (ARRAY['admin'::"text", 'farm_manager'::"text"]))))));


--
-- Name: fish_stocking; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."fish_stocking" ENABLE ROW LEVEL SECURITY;

--
-- Name: fish_stocking fish_stocking: delete by managers; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "fish_stocking: delete by managers" ON "public"."fish_stocking" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM ("public"."system" "s"
     JOIN "public"."farm_user" "fu" ON (("fu"."farm_id" = "s"."farm_id")))
  WHERE (("s"."id" = "fish_stocking"."system_id") AND ("fu"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("fu"."role" = ANY (ARRAY['admin'::"text", 'farm_manager'::"text"]))))));


--
-- Name: fish_stocking fish_stocking: insert by write roles; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "fish_stocking: insert by write roles" ON "public"."fish_stocking" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."system" "s"
     JOIN "public"."farm_user" "fu" ON (("fu"."farm_id" = "s"."farm_id")))
  WHERE (("s"."id" = "fish_stocking"."system_id") AND ("fu"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("fu"."role" = ANY (ARRAY['admin'::"text", 'farm_manager'::"text", 'system_operator'::"text"]))))));


--
-- Name: fish_stocking fish_stocking: read if farm member; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "fish_stocking: read if farm member" ON "public"."fish_stocking" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."system" "s"
     JOIN "public"."farm_user" "fu" ON (("fu"."farm_id" = "s"."farm_id")))
  WHERE (("s"."id" = "fish_stocking"."system_id") AND ("fu"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));


--
-- Name: fish_stocking fish_stocking: update by managers; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "fish_stocking: update by managers" ON "public"."fish_stocking" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM ("public"."system" "s"
     JOIN "public"."farm_user" "fu" ON (("fu"."farm_id" = "s"."farm_id")))
  WHERE (("s"."id" = "fish_stocking"."system_id") AND ("fu"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("fu"."role" = ANY (ARRAY['admin'::"text", 'farm_manager'::"text"])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."system" "s"
     JOIN "public"."farm_user" "fu" ON (("fu"."farm_id" = "s"."farm_id")))
  WHERE (("s"."id" = "fish_stocking"."system_id") AND ("fu"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("fu"."role" = ANY (ARRAY['admin'::"text", 'farm_manager'::"text"]))))));


--
-- Name: fish_transfer; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."fish_transfer" ENABLE ROW LEVEL SECURITY;

--
-- Name: fish_transfer fish_transfer: delete by managers; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "fish_transfer: delete by managers" ON "public"."fish_transfer" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM ("public"."system" "s"
     JOIN "public"."farm_user" "fu" ON (("fu"."farm_id" = "s"."farm_id")))
  WHERE (("s"."id" = "fish_transfer"."origin_system_id") AND ("fu"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("fu"."role" = ANY (ARRAY['admin'::"text", 'farm_manager'::"text"]))))));


--
-- Name: fish_transfer fish_transfer: insert by write roles; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "fish_transfer: insert by write roles" ON "public"."fish_transfer" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."system" "s"
     JOIN "public"."farm_user" "fu" ON (("fu"."farm_id" = "s"."farm_id")))
  WHERE (("s"."id" = "fish_transfer"."origin_system_id") AND ("fu"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("fu"."role" = ANY (ARRAY['admin'::"text", 'farm_manager'::"text", 'system_operator'::"text"]))))));


--
-- Name: fish_transfer fish_transfer: read if farm member; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "fish_transfer: read if farm member" ON "public"."fish_transfer" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."system" "s"
     JOIN "public"."farm_user" "fu" ON (("fu"."farm_id" = "s"."farm_id")))
  WHERE (("fu"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND (("s"."id" = "fish_transfer"."origin_system_id") OR ("s"."id" = "fish_transfer"."target_system_id"))))));


--
-- Name: fish_transfer fish_transfer: update by managers; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "fish_transfer: update by managers" ON "public"."fish_transfer" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM ("public"."system" "s"
     JOIN "public"."farm_user" "fu" ON (("fu"."farm_id" = "s"."farm_id")))
  WHERE (("s"."id" = "fish_transfer"."origin_system_id") AND ("fu"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("fu"."role" = ANY (ARRAY['admin'::"text", 'farm_manager'::"text"])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."system" "s"
     JOIN "public"."farm_user" "fu" ON (("fu"."farm_id" = "s"."farm_id")))
  WHERE (("s"."id" = "fish_transfer"."origin_system_id") AND ("fu"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("fu"."role" = ANY (ARRAY['admin'::"text", 'farm_manager'::"text"]))))));


--
-- Name: growth_phase; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."growth_phase" ENABLE ROW LEVEL SECURITY;

--
-- Name: normalization_review norm_review_farm_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "norm_review_farm_isolation" ON "public"."normalization_review" USING (("farm_id" IN ( SELECT "farm_user"."farm_id"
   FROM "public"."farm_user"
  WHERE ("farm_user"."user_id" = ( SELECT "auth"."uid"() AS "uid")))));


--
-- Name: normalization_review; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."normalization_review" ENABLE ROW LEVEL SECURITY;

--
-- Name: organization; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."organization" ENABLE ROW LEVEL SECURITY;

--
-- Name: organization organization_select_owner_or_farm_member; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "organization_select_owner_or_farm_member" ON "public"."organization" FOR SELECT TO "authenticated" USING ((("owner_id" = ( SELECT "auth"."uid"() AS "uid")) OR (EXISTS ( SELECT 1
   FROM ("public"."farm" "f"
     JOIN "public"."farm_user" "fu" ON (("fu"."farm_id" = "f"."id")))
  WHERE (("f"."organization_id" = "organization"."id") AND ("fu"."user_id" = ( SELECT "auth"."uid"() AS "uid")))))));


--
-- Name: production_cycle; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."production_cycle" ENABLE ROW LEVEL SECURITY;

--
-- Name: production_cycle production_cycle: delete by managers; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "production_cycle: delete by managers" ON "public"."production_cycle" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM ("public"."system" "s"
     JOIN "public"."farm_user" "fu" ON (("fu"."farm_id" = "s"."farm_id")))
  WHERE (("s"."id" = "production_cycle"."system_id") AND ("fu"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("fu"."role" = ANY (ARRAY['admin'::"text", 'farm_manager'::"text"]))))));


--
-- Name: production_cycle production_cycle_insert; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "production_cycle_insert" ON "public"."production_cycle" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."system" "s"
     JOIN "public"."farm_user" "fu" ON (("fu"."farm_id" = "s"."farm_id")))
  WHERE (("s"."id" = "production_cycle"."system_id") AND ("fu"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));


--
-- Name: production_cycle production_cycle_select; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "production_cycle_select" ON "public"."production_cycle" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."system" "s"
     JOIN "public"."farm_user" "fu" ON (("fu"."farm_id" = "s"."farm_id")))
  WHERE (("s"."id" = "production_cycle"."system_id") AND ("fu"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));


--
-- Name: production_cycle production_cycle_update; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "production_cycle_update" ON "public"."production_cycle" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."system" "s"
     JOIN "public"."farm_user" "fu" ON (("fu"."farm_id" = "s"."farm_id")))
  WHERE (("s"."id" = "production_cycle"."system_id") AND ("fu"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));


--
-- Name: raw_uploads; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."raw_uploads" ENABLE ROW LEVEL SECURITY;

--
-- Name: raw_uploads raw_uploads_farm_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "raw_uploads_farm_isolation" ON "public"."raw_uploads" USING (("farm_id" IN ( SELECT "farm_user"."farm_id"
   FROM "public"."farm_user"
  WHERE ("farm_user"."user_id" = ( SELECT "auth"."uid"() AS "uid")))));


--
-- Name: system; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."system" ENABLE ROW LEVEL SECURITY;

--
-- Name: system system_delete; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "system_delete" ON "public"."system" FOR DELETE USING ("private"."has_farm_role"("farm_id", ARRAY['admin'::"text", 'farm_manager'::"text"], ( SELECT "auth"."uid"() AS "uid")));


--
-- Name: system system_insert; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "system_insert" ON "public"."system" FOR INSERT WITH CHECK ("private"."has_farm_role"("farm_id", ARRAY['admin'::"text", 'farm_manager'::"text", 'system_operator'::"text"], ( SELECT "auth"."uid"() AS "uid")));


--
-- Name: system system_select; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "system_select" ON "public"."system" FOR SELECT TO "authenticated" USING ("private"."is_farm_member"("farm_id", ( SELECT "auth"."uid"() AS "uid")));


--
-- Name: system system_update; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "system_update" ON "public"."system" FOR UPDATE USING ("private"."has_farm_role"("farm_id", ARRAY['admin'::"text", 'farm_manager'::"text", 'system_operator'::"text"], ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK ("private"."has_farm_role"("farm_id", ARRAY['admin'::"text", 'farm_manager'::"text", 'system_operator'::"text"], ( SELECT "auth"."uid"() AS "uid")));


--
-- Name: user_profile; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."user_profile" ENABLE ROW LEVEL SECURITY;

--
-- Name: user_profile user_profile_insert; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "user_profile_insert" ON "public"."user_profile" FOR INSERT WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));


--
-- Name: user_profile user_profile_select; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "user_profile_select" ON "public"."user_profile" FOR SELECT TO "authenticated" USING ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) OR (EXISTS ( SELECT 1
   FROM ("public"."farm_user" "fu1"
     JOIN "public"."farm_user" "fu2" ON (("fu1"."farm_id" = "fu2"."farm_id")))
  WHERE (("fu1"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("fu2"."user_id" = "user_profile"."user_id"))))));


--
-- Name: user_profile user_profile_update; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "user_profile_update" ON "public"."user_profile" FOR UPDATE USING (("user_id" = ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));


--
-- Name: user_settings; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."user_settings" ENABLE ROW LEVEL SECURITY;

--
-- Name: user_settings user_settings: delete own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "user_settings: delete own" ON "public"."user_settings" FOR DELETE TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));


--
-- Name: user_settings user_settings: insert own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "user_settings: insert own" ON "public"."user_settings" FOR INSERT TO "authenticated" WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));


--
-- Name: user_settings user_settings: select own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "user_settings: select own" ON "public"."user_settings" FOR SELECT TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));


--
-- Name: user_settings user_settings: update own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "user_settings: update own" ON "public"."user_settings" FOR UPDATE TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id")) WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));


--
-- Name: user_settings user_settings_delete_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "user_settings_delete_own" ON "public"."user_settings" FOR DELETE TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));


--
-- Name: user_settings user_settings_insert_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "user_settings_insert_own" ON "public"."user_settings" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));


--
-- Name: user_settings user_settings_select_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "user_settings_select_own" ON "public"."user_settings" FOR SELECT TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));


--
-- Name: user_settings user_settings_update_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "user_settings_update_own" ON "public"."user_settings" FOR UPDATE TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));


--
-- Name: water_quality_framework; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."water_quality_framework" ENABLE ROW LEVEL SECURITY;

--
-- Name: water_quality_measurement; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."water_quality_measurement" ENABLE ROW LEVEL SECURITY;

--
-- Name: water_quality_measurement water_quality_measurement: delete by managers; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "water_quality_measurement: delete by managers" ON "public"."water_quality_measurement" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM ("public"."system" "s"
     JOIN "public"."farm_user" "fu" ON (("fu"."farm_id" = "s"."farm_id")))
  WHERE (("s"."id" = "water_quality_measurement"."system_id") AND ("fu"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("fu"."role" = ANY (ARRAY['admin'::"text", 'farm_manager'::"text"]))))));


--
-- Name: water_quality_measurement water_quality_measurement: insert by write roles; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "water_quality_measurement: insert by write roles" ON "public"."water_quality_measurement" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."system" "s"
     JOIN "public"."farm_user" "fu" ON (("fu"."farm_id" = "s"."farm_id")))
  WHERE (("s"."id" = "water_quality_measurement"."system_id") AND ("fu"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("fu"."role" = ANY (ARRAY['admin'::"text", 'farm_manager'::"text", 'system_operator'::"text"]))))));


--
-- Name: water_quality_measurement water_quality_measurement: update by managers; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "water_quality_measurement: update by managers" ON "public"."water_quality_measurement" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM ("public"."system" "s"
     JOIN "public"."farm_user" "fu" ON (("fu"."farm_id" = "s"."farm_id")))
  WHERE (("s"."id" = "water_quality_measurement"."system_id") AND ("fu"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("fu"."role" = ANY (ARRAY['admin'::"text", 'farm_manager'::"text"])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."system" "s"
     JOIN "public"."farm_user" "fu" ON (("fu"."farm_id" = "s"."farm_id")))
  WHERE (("s"."id" = "water_quality_measurement"."system_id") AND ("fu"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("fu"."role" = ANY (ARRAY['admin'::"text", 'farm_manager'::"text"]))))));


--
-- Name: water_quality_measurement wqm_select_farm_member; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "wqm_select_farm_member" ON "public"."water_quality_measurement" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."system" "s"
     JOIN "public"."farm_user" "fu" ON (("fu"."farm_id" = "s"."farm_id")))
  WHERE (("s"."id" = "water_quality_measurement"."system_id") AND ("fu"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));


--
-- Name: messages; Type: ROW SECURITY; Schema: realtime; Owner: supabase_realtime_admin
--

ALTER TABLE "realtime"."messages" ENABLE ROW LEVEL SECURITY;

--
-- Name: objects auth_insert_raw_uploads; Type: POLICY; Schema: storage; Owner: supabase_storage_admin
--

CREATE POLICY "auth_insert_raw_uploads" ON "storage"."objects" FOR INSERT WITH CHECK ((("bucket_id" = 'raw-uploads'::"text") AND ("auth"."role"() = 'authenticated'::"text")));


--
-- Name: objects auth_read_raw_uploads; Type: POLICY; Schema: storage; Owner: supabase_storage_admin
--

CREATE POLICY "auth_read_raw_uploads" ON "storage"."objects" FOR SELECT USING ((("bucket_id" = 'raw-uploads'::"text") AND ("auth"."role"() = 'authenticated'::"text")));


--
-- Name: objects auth_update_raw_uploads; Type: POLICY; Schema: storage; Owner: supabase_storage_admin
--

CREATE POLICY "auth_update_raw_uploads" ON "storage"."objects" FOR UPDATE USING ((("bucket_id" = 'raw-uploads'::"text") AND ("auth"."role"() = 'authenticated'::"text")));


--
-- Name: buckets; Type: ROW SECURITY; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE "storage"."buckets" ENABLE ROW LEVEL SECURITY;

--
-- Name: buckets_analytics; Type: ROW SECURITY; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE "storage"."buckets_analytics" ENABLE ROW LEVEL SECURITY;

--
-- Name: buckets_vectors; Type: ROW SECURITY; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE "storage"."buckets_vectors" ENABLE ROW LEVEL SECURITY;

--
-- Name: migrations; Type: ROW SECURITY; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE "storage"."migrations" ENABLE ROW LEVEL SECURITY;

--
-- Name: objects; Type: ROW SECURITY; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE "storage"."objects" ENABLE ROW LEVEL SECURITY;

--
-- Name: s3_multipart_uploads; Type: ROW SECURITY; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE "storage"."s3_multipart_uploads" ENABLE ROW LEVEL SECURITY;

--
-- Name: s3_multipart_uploads_parts; Type: ROW SECURITY; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE "storage"."s3_multipart_uploads_parts" ENABLE ROW LEVEL SECURITY;

--
-- Name: objects svc_all_raw_uploads; Type: POLICY; Schema: storage; Owner: supabase_storage_admin
--

CREATE POLICY "svc_all_raw_uploads" ON "storage"."objects" USING ((("bucket_id" = 'raw-uploads'::"text") AND ("auth"."role"() = 'service_role'::"text")));


--
-- Name: vector_indexes; Type: ROW SECURITY; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE "storage"."vector_indexes" ENABLE ROW LEVEL SECURITY;

--
-- Name: SCHEMA "analytics"; Type: ACL; Schema: -; Owner: postgres
--

GRANT USAGE ON SCHEMA "analytics" TO "service_role";


--
-- Name: SCHEMA "auth"; Type: ACL; Schema: -; Owner: supabase_admin
--

GRANT USAGE ON SCHEMA "auth" TO "anon";
GRANT USAGE ON SCHEMA "auth" TO "authenticated";
GRANT USAGE ON SCHEMA "auth" TO "service_role";
GRANT ALL ON SCHEMA "auth" TO "supabase_auth_admin";
GRANT ALL ON SCHEMA "auth" TO "dashboard_user";
GRANT USAGE ON SCHEMA "auth" TO "postgres";


--
-- Name: SCHEMA "extensions"; Type: ACL; Schema: -; Owner: postgres
--

GRANT USAGE ON SCHEMA "extensions" TO "anon";
GRANT USAGE ON SCHEMA "extensions" TO "authenticated";
GRANT USAGE ON SCHEMA "extensions" TO "service_role";
GRANT ALL ON SCHEMA "extensions" TO "dashboard_user";


--
-- Name: SCHEMA "private"; Type: ACL; Schema: -; Owner: postgres
--

GRANT USAGE ON SCHEMA "private" TO "service_role";
GRANT USAGE ON SCHEMA "private" TO "authenticated";


--
-- Name: SCHEMA "public"; Type: ACL; Schema: -; Owner: pg_database_owner
--

GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";


--
-- Name: SCHEMA "realtime"; Type: ACL; Schema: -; Owner: supabase_admin
--

GRANT USAGE ON SCHEMA "realtime" TO "postgres";
GRANT USAGE ON SCHEMA "realtime" TO "anon";
GRANT USAGE ON SCHEMA "realtime" TO "authenticated";
GRANT USAGE ON SCHEMA "realtime" TO "service_role";
GRANT ALL ON SCHEMA "realtime" TO "supabase_realtime_admin";


--
-- Name: SCHEMA "storage"; Type: ACL; Schema: -; Owner: supabase_admin
--

GRANT USAGE ON SCHEMA "storage" TO "postgres" WITH GRANT OPTION;
GRANT USAGE ON SCHEMA "storage" TO "anon";
GRANT USAGE ON SCHEMA "storage" TO "authenticated";
GRANT USAGE ON SCHEMA "storage" TO "service_role";
GRANT ALL ON SCHEMA "storage" TO "supabase_storage_admin";
GRANT ALL ON SCHEMA "storage" TO "dashboard_user";


--
-- Name: SCHEMA "vault"; Type: ACL; Schema: -; Owner: supabase_admin
--

GRANT USAGE ON SCHEMA "vault" TO "postgres" WITH GRANT OPTION;
GRANT USAGE ON SCHEMA "vault" TO "service_role";


--
-- Name: FUNCTION "email"(); Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON FUNCTION "auth"."email"() TO "dashboard_user";
GRANT ALL ON FUNCTION "auth"."email"() TO "postgres";


--
-- Name: FUNCTION "jwt"(); Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON FUNCTION "auth"."jwt"() TO "postgres";
GRANT ALL ON FUNCTION "auth"."jwt"() TO "dashboard_user";


--
-- Name: FUNCTION "role"(); Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON FUNCTION "auth"."role"() TO "dashboard_user";
GRANT ALL ON FUNCTION "auth"."role"() TO "postgres";


--
-- Name: FUNCTION "uid"(); Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON FUNCTION "auth"."uid"() TO "dashboard_user";
GRANT ALL ON FUNCTION "auth"."uid"() TO "postgres";


--
-- Name: FUNCTION "grant_pg_cron_access"(); Type: ACL; Schema: extensions; Owner: supabase_admin
--

REVOKE ALL ON FUNCTION "extensions"."grant_pg_cron_access"() FROM "supabase_admin";
GRANT ALL ON FUNCTION "extensions"."grant_pg_cron_access"() TO "supabase_admin" WITH GRANT OPTION;
GRANT ALL ON FUNCTION "extensions"."grant_pg_cron_access"() TO "dashboard_user";


--
-- Name: FUNCTION "grant_pg_graphql_access"(); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION "extensions"."grant_pg_graphql_access"() TO "postgres" WITH GRANT OPTION;


--
-- Name: FUNCTION "grant_pg_net_access"(); Type: ACL; Schema: extensions; Owner: supabase_admin
--

REVOKE ALL ON FUNCTION "extensions"."grant_pg_net_access"() FROM "supabase_admin";
GRANT ALL ON FUNCTION "extensions"."grant_pg_net_access"() TO "supabase_admin" WITH GRANT OPTION;
GRANT ALL ON FUNCTION "extensions"."grant_pg_net_access"() TO "dashboard_user";


--
-- Name: FUNCTION "pgrst_ddl_watch"(); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION "extensions"."pgrst_ddl_watch"() TO "postgres" WITH GRANT OPTION;


--
-- Name: FUNCTION "pgrst_drop_watch"(); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION "extensions"."pgrst_drop_watch"() TO "postgres" WITH GRANT OPTION;


--
-- Name: FUNCTION "set_graphql_placeholder"(); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION "extensions"."set_graphql_placeholder"() TO "postgres" WITH GRANT OPTION;


--
-- Name: FUNCTION "graphql"("operationName" "text", "query" "text", "variables" "jsonb", "extensions" "jsonb"); Type: ACL; Schema: graphql_public; Owner: supabase_admin
--

GRANT ALL ON FUNCTION "graphql_public"."graphql"("operationName" "text", "query" "text", "variables" "jsonb", "extensions" "jsonb") TO "postgres";
GRANT ALL ON FUNCTION "graphql_public"."graphql"("operationName" "text", "query" "text", "variables" "jsonb", "extensions" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "graphql_public"."graphql"("operationName" "text", "query" "text", "variables" "jsonb", "extensions" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "graphql_public"."graphql"("operationName" "text", "query" "text", "variables" "jsonb", "extensions" "jsonb") TO "service_role";


--
-- Name: FUNCTION "apply_pending_farm_user_invitations"("p_user_id" "uuid", "p_email" "text"); Type: ACL; Schema: private; Owner: postgres
--

GRANT ALL ON FUNCTION "private"."apply_pending_farm_user_invitations"("p_user_id" "uuid", "p_email" "text") TO "service_role";


--
-- Name: FUNCTION "has_farm_role"("farm" "uuid", "roles" "text"[]); Type: ACL; Schema: private; Owner: postgres
--

REVOKE ALL ON FUNCTION "private"."has_farm_role"("farm" "uuid", "roles" "text"[]) FROM PUBLIC;
GRANT ALL ON FUNCTION "private"."has_farm_role"("farm" "uuid", "roles" "text"[]) TO "service_role";
GRANT ALL ON FUNCTION "private"."has_farm_role"("farm" "uuid", "roles" "text"[]) TO "authenticated";


--
-- Name: FUNCTION "has_farm_role"("farm" "uuid", "roles" "text"[], "_user_id" "uuid"); Type: ACL; Schema: private; Owner: postgres
--

REVOKE ALL ON FUNCTION "private"."has_farm_role"("farm" "uuid", "roles" "text"[], "_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "private"."has_farm_role"("farm" "uuid", "roles" "text"[], "_user_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "private"."has_farm_role"("farm" "uuid", "roles" "text"[], "_user_id" "uuid") TO "authenticated";


--
-- Name: FUNCTION "is_farm_member"("farm" "uuid"); Type: ACL; Schema: private; Owner: postgres
--

REVOKE ALL ON FUNCTION "private"."is_farm_member"("farm" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "private"."is_farm_member"("farm" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "private"."is_farm_member"("farm" "uuid") TO "authenticated";


--
-- Name: FUNCTION "is_farm_member"("farm" "uuid", "_user_id" "uuid"); Type: ACL; Schema: private; Owner: postgres
--

REVOKE ALL ON FUNCTION "private"."is_farm_member"("farm" "uuid", "_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "private"."is_farm_member"("farm" "uuid", "_user_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "private"."is_farm_member"("farm" "uuid", "_user_id" "uuid") TO "authenticated";


--
-- Name: FUNCTION "after_event_update_inventory"(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."after_event_update_inventory"() TO "anon";
GRANT ALL ON FUNCTION "public"."after_event_update_inventory"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."after_event_update_inventory"() TO "service_role";


--
-- Name: FUNCTION "api_batch_system_ids"("p_batch_id" bigint); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION "public"."api_batch_system_ids"("p_batch_id" bigint) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."api_batch_system_ids"("p_batch_id" bigint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."api_batch_system_ids"("p_batch_id" bigint) TO "service_role";


--
-- Name: FUNCTION "api_farm_options_rpc"(); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION "public"."api_farm_options_rpc"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."api_farm_options_rpc"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."api_farm_options_rpc"() TO "service_role";


--
-- Name: FUNCTION "api_farm_user_invitations"("p_farm_id" "uuid"); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION "public"."api_farm_user_invitations"("p_farm_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."api_farm_user_invitations"("p_farm_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."api_farm_user_invitations"("p_farm_id" "uuid") TO "service_role";


--
-- Name: FUNCTION "api_feed_dashboard_kpis"("p_farm_id" "uuid", "p_system_ids" bigint[], "p_start_date" "date", "p_end_date" "date"); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION "public"."api_feed_dashboard_kpis"("p_farm_id" "uuid", "p_system_ids" bigint[], "p_start_date" "date", "p_end_date" "date") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."api_feed_dashboard_kpis"("p_farm_id" "uuid", "p_system_ids" bigint[], "p_start_date" "date", "p_end_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."api_feed_dashboard_kpis"("p_farm_id" "uuid", "p_system_ids" bigint[], "p_start_date" "date", "p_end_date" "date") TO "service_role";


--
-- Name: FUNCTION "api_feed_efcr_trend"("p_farm_id" "uuid", "p_system_ids" bigint[], "p_start_date" "date", "p_end_date" "date"); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION "public"."api_feed_efcr_trend"("p_farm_id" "uuid", "p_system_ids" bigint[], "p_start_date" "date", "p_end_date" "date") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."api_feed_efcr_trend"("p_farm_id" "uuid", "p_system_ids" bigint[], "p_start_date" "date", "p_end_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."api_feed_efcr_trend"("p_farm_id" "uuid", "p_system_ids" bigint[], "p_start_date" "date", "p_end_date" "date") TO "service_role";


--
-- Name: FUNCTION "api_feed_plan_vs_actual"("p_farm_id" "uuid", "p_system_ids" bigint[], "p_start_date" "date", "p_end_date" "date"); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION "public"."api_feed_plan_vs_actual"("p_farm_id" "uuid", "p_system_ids" bigint[], "p_start_date" "date", "p_end_date" "date") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."api_feed_plan_vs_actual"("p_farm_id" "uuid", "p_system_ids" bigint[], "p_start_date" "date", "p_end_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."api_feed_plan_vs_actual"("p_farm_id" "uuid", "p_system_ids" bigint[], "p_start_date" "date", "p_end_date" "date") TO "service_role";


--
-- Name: FUNCTION "api_feed_type_options_rpc"("p_farm_id" "uuid"); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION "public"."api_feed_type_options_rpc"("p_farm_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."api_feed_type_options_rpc"("p_farm_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."api_feed_type_options_rpc"("p_farm_id" "uuid") TO "service_role";


--
-- Name: FUNCTION "api_feed_vs_biomass_gain"("p_farm_id" "uuid", "p_system_ids" bigint[], "p_start_date" "date", "p_end_date" "date"); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION "public"."api_feed_vs_biomass_gain"("p_farm_id" "uuid", "p_system_ids" bigint[], "p_start_date" "date", "p_end_date" "date") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."api_feed_vs_biomass_gain"("p_farm_id" "uuid", "p_system_ids" bigint[], "p_start_date" "date", "p_end_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."api_feed_vs_biomass_gain"("p_farm_id" "uuid", "p_system_ids" bigint[], "p_start_date" "date", "p_end_date" "date") TO "service_role";


--
-- Name: FUNCTION "api_feeding_alerts"("p_farm_id" "uuid", "p_system_ids" bigint[], "p_start_date" "date", "p_end_date" "date"); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION "public"."api_feeding_alerts"("p_farm_id" "uuid", "p_system_ids" bigint[], "p_start_date" "date", "p_end_date" "date") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."api_feeding_alerts"("p_farm_id" "uuid", "p_system_ids" bigint[], "p_start_date" "date", "p_end_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."api_feeding_alerts"("p_farm_id" "uuid", "p_system_ids" bigint[], "p_start_date" "date", "p_end_date" "date") TO "service_role";


--
-- Name: FUNCTION "api_feeding_rate_vs_target"("p_farm_id" "uuid", "p_system_ids" bigint[], "p_start_date" "date", "p_end_date" "date"); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION "public"."api_feeding_rate_vs_target"("p_farm_id" "uuid", "p_system_ids" bigint[], "p_start_date" "date", "p_end_date" "date") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."api_feeding_rate_vs_target"("p_farm_id" "uuid", "p_system_ids" bigint[], "p_start_date" "date", "p_end_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."api_feeding_rate_vs_target"("p_farm_id" "uuid", "p_system_ids" bigint[], "p_start_date" "date", "p_end_date" "date") TO "service_role";


--
-- Name: FUNCTION "api_feeding_response_distribution"("p_farm_id" "uuid", "p_system_ids" bigint[], "p_start_date" "date", "p_end_date" "date"); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION "public"."api_feeding_response_distribution"("p_farm_id" "uuid", "p_system_ids" bigint[], "p_start_date" "date", "p_end_date" "date") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."api_feeding_response_distribution"("p_farm_id" "uuid", "p_system_ids" bigint[], "p_start_date" "date", "p_end_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."api_feeding_response_distribution"("p_farm_id" "uuid", "p_system_ids" bigint[], "p_start_date" "date", "p_end_date" "date") TO "service_role";


--
-- Name: FUNCTION "api_fingerling_batch_options_rpc"("p_farm_id" "uuid", "p_active_only" boolean); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION "public"."api_fingerling_batch_options_rpc"("p_farm_id" "uuid", "p_active_only" boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."api_fingerling_batch_options_rpc"("p_farm_id" "uuid", "p_active_only" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."api_fingerling_batch_options_rpc"("p_farm_id" "uuid", "p_active_only" boolean) TO "service_role";


--
-- Name: FUNCTION "api_recent_activity_feed"("p_farm_id" "uuid", "p_limit" integer, "p_mode" "text", "p_date_from" "date", "p_date_to" "date", "p_table" "text"); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION "public"."api_recent_activity_feed"("p_farm_id" "uuid", "p_limit" integer, "p_mode" "text", "p_date_from" "date", "p_date_to" "date", "p_table" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."api_recent_activity_feed"("p_farm_id" "uuid", "p_limit" integer, "p_mode" "text", "p_date_from" "date", "p_date_to" "date", "p_table" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."api_recent_activity_feed"("p_farm_id" "uuid", "p_limit" integer, "p_mode" "text", "p_date_from" "date", "p_date_to" "date", "p_table" "text") TO "service_role";


--
-- Name: FUNCTION "api_recommended_actions"("p_farm_id" "uuid", "p_system_id" bigint); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."api_recommended_actions"("p_farm_id" "uuid", "p_system_id" bigint) TO "authenticated";


--
-- Name: FUNCTION "api_system_feed_status"("p_farm_id" "uuid", "p_system_ids" bigint[], "p_start_date" "date", "p_end_date" "date"); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION "public"."api_system_feed_status"("p_farm_id" "uuid", "p_system_ids" bigint[], "p_start_date" "date", "p_end_date" "date") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."api_system_feed_status"("p_farm_id" "uuid", "p_system_ids" bigint[], "p_start_date" "date", "p_end_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."api_system_feed_status"("p_farm_id" "uuid", "p_system_ids" bigint[], "p_start_date" "date", "p_end_date" "date") TO "service_role";


--
-- Name: FUNCTION "api_system_options_rpc"("p_farm_id" "uuid", "p_stage" "public"."system_growth_stage", "p_active_only" boolean); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."api_system_options_rpc"("p_farm_id" "uuid", "p_stage" "public"."system_growth_stage", "p_active_only" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."api_system_options_rpc"("p_farm_id" "uuid", "p_stage" "public"."system_growth_stage", "p_active_only" boolean) TO "service_role";


--
-- Name: FUNCTION "api_system_timeline_bounds"("p_farm_id" "uuid", "p_system_id" bigint); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION "public"."api_system_timeline_bounds"("p_farm_id" "uuid", "p_system_id" bigint) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."api_system_timeline_bounds"("p_farm_id" "uuid", "p_system_id" bigint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."api_system_timeline_bounds"("p_farm_id" "uuid", "p_system_id" bigint) TO "service_role";


--
-- Name: FUNCTION "api_time_period_bounds_scoped"("p_farm_id" "uuid", "p_time_period" "text", "p_scope" "text", "p_anchor_date" "date", "p_system_id" bigint, "p_batch_id" bigint); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION "public"."api_time_period_bounds_scoped"("p_farm_id" "uuid", "p_time_period" "text", "p_scope" "text", "p_anchor_date" "date", "p_system_id" bigint, "p_batch_id" bigint) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."api_time_period_bounds_scoped"("p_farm_id" "uuid", "p_time_period" "text", "p_scope" "text", "p_anchor_date" "date", "p_system_id" bigint, "p_batch_id" bigint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."api_time_period_bounds_scoped"("p_farm_id" "uuid", "p_time_period" "text", "p_scope" "text", "p_anchor_date" "date", "p_system_id" bigint, "p_batch_id" bigint) TO "service_role";


--
-- Name: FUNCTION "claim_my_farm_user_invitations"(); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION "public"."claim_my_farm_user_invitations"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."claim_my_farm_user_invitations"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."claim_my_farm_user_invitations"() TO "service_role";


--
-- Name: FUNCTION "classify_growth_stage_tanganicae"("p_abw_g" numeric); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION "public"."classify_growth_stage_tanganicae"("p_abw_g" numeric) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."classify_growth_stage_tanganicae"("p_abw_g" numeric) TO "authenticated";
GRANT ALL ON FUNCTION "public"."classify_growth_stage_tanganicae"("p_abw_g" numeric) TO "service_role";


--
-- Name: FUNCTION "classify_water_quality_measurement"("p_parameter_value" double precision, "p_optimal" "jsonb", "p_acceptable" "jsonb", "p_critical" "jsonb", "p_lethal" "jsonb"); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."classify_water_quality_measurement"("p_parameter_value" double precision, "p_optimal" "jsonb", "p_acceptable" "jsonb", "p_critical" "jsonb", "p_lethal" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."classify_water_quality_measurement"("p_parameter_value" double precision, "p_optimal" "jsonb", "p_acceptable" "jsonb", "p_critical" "jsonb", "p_lethal" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."classify_water_quality_measurement"("p_parameter_value" double precision, "p_optimal" "jsonb", "p_acceptable" "jsonb", "p_critical" "jsonb", "p_lethal" "jsonb") TO "service_role";


--
-- Name: FUNCTION "close_cycle_on_final_harvest"(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."close_cycle_on_final_harvest"() TO "anon";
GRANT ALL ON FUNCTION "public"."close_cycle_on_final_harvest"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."close_cycle_on_final_harvest"() TO "service_role";


--
-- Name: FUNCTION "create_farm_user_invitation"("p_farm_id" "uuid", "p_email" "text", "p_role" "text"); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION "public"."create_farm_user_invitation"("p_farm_id" "uuid", "p_email" "text", "p_role" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."create_farm_user_invitation"("p_farm_id" "uuid", "p_email" "text", "p_role" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_farm_user_invitation"("p_farm_id" "uuid", "p_email" "text", "p_role" "text") TO "service_role";


--
-- Name: FUNCTION "ensure_cycle_on_stocking"(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."ensure_cycle_on_stocking"() TO "anon";
GRANT ALL ON FUNCTION "public"."ensure_cycle_on_stocking"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."ensure_cycle_on_stocking"() TO "service_role";


--
-- Name: FUNCTION "get_running_stock"("p_farm_id" "uuid"); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION "public"."get_running_stock"("p_farm_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_running_stock"("p_farm_id" "uuid") TO "service_role";


--
-- Name: FUNCTION "handle_new_user"(); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION "public"."handle_new_user"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";


--
-- Name: FUNCTION "mark_farm_user_invitation_sent"("p_invitation_id" "uuid"); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION "public"."mark_farm_user_invitation_sent"("p_invitation_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."mark_farm_user_invitation_sent"("p_invitation_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."mark_farm_user_invitation_sent"("p_invitation_id" "uuid") TO "service_role";


--
-- Name: FUNCTION "prevent_system_name_update"(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."prevent_system_name_update"() TO "anon";
GRANT ALL ON FUNCTION "public"."prevent_system_name_update"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."prevent_system_name_update"() TO "service_role";


--
-- Name: FUNCTION "production_cycle_set_ongoing"(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."production_cycle_set_ongoing"() TO "anon";
GRANT ALL ON FUNCTION "public"."production_cycle_set_ongoing"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."production_cycle_set_ongoing"() TO "service_role";


--
-- Name: FUNCTION "provision_default_farm_membership"(); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION "public"."provision_default_farm_membership"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."provision_default_farm_membership"() TO "service_role";


--
-- Name: FUNCTION "refresh_after_system_if_needed"(); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION "public"."refresh_after_system_if_needed"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."refresh_after_system_if_needed"() TO "service_role";


--
-- Name: FUNCTION "refresh_daily_water_quality_rating"("p_system_id" bigint, "p_from" "date", "p_to" "date"); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."refresh_daily_water_quality_rating"("p_system_id" bigint, "p_from" "date", "p_to" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."refresh_daily_water_quality_rating"("p_system_id" bigint, "p_from" "date", "p_to" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."refresh_daily_water_quality_rating"("p_system_id" bigint, "p_from" "date", "p_to" "date") TO "service_role";


--
-- Name: FUNCTION "resolve_sampling_abw_g"("p_abw" double precision, "p_total_weight_sampling" double precision, "p_number_of_fish_sampling" numeric); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION "public"."resolve_sampling_abw_g"("p_abw" double precision, "p_total_weight_sampling" double precision, "p_number_of_fish_sampling" numeric) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."resolve_sampling_abw_g"("p_abw" double precision, "p_total_weight_sampling" double precision, "p_number_of_fish_sampling" numeric) TO "authenticated";
GRANT ALL ON FUNCTION "public"."resolve_sampling_abw_g"("p_abw" double precision, "p_total_weight_sampling" double precision, "p_number_of_fish_sampling" numeric) TO "service_role";


--
-- Name: FUNCTION "resolve_sampling_abw_g"("p_abw" numeric, "p_total_weight_sampling" numeric, "p_number_of_fish_sampling" numeric); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION "public"."resolve_sampling_abw_g"("p_abw" numeric, "p_total_weight_sampling" numeric, "p_number_of_fish_sampling" numeric) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."resolve_sampling_abw_g"("p_abw" numeric, "p_total_weight_sampling" numeric, "p_number_of_fish_sampling" numeric) TO "authenticated";
GRANT ALL ON FUNCTION "public"."resolve_sampling_abw_g"("p_abw" numeric, "p_total_weight_sampling" numeric, "p_number_of_fish_sampling" numeric) TO "service_role";


--
-- Name: FUNCTION "revoke_farm_user_invitation"("p_invitation_id" "uuid"); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION "public"."revoke_farm_user_invitation"("p_invitation_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."revoke_farm_user_invitation"("p_invitation_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."revoke_farm_user_invitation"("p_invitation_id" "uuid") TO "service_role";


--
-- Name: FUNCTION "transfer_impacts_efcr"("p_transfer_type" "public"."transfer_type", "p_origin_system_id" bigint, "p_target_system_id" bigint); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."transfer_impacts_efcr"("p_transfer_type" "public"."transfer_type", "p_origin_system_id" bigint, "p_target_system_id" bigint) TO "anon";
GRANT ALL ON FUNCTION "public"."transfer_impacts_efcr"("p_transfer_type" "public"."transfer_type", "p_origin_system_id" bigint, "p_target_system_id" bigint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."transfer_impacts_efcr"("p_transfer_type" "public"."transfer_type", "p_origin_system_id" bigint, "p_target_system_id" bigint) TO "service_role";


--
-- Name: FUNCTION "transfer_weight_kg"("p_total_weight_transfer" double precision, "p_number_of_fish_transfer" double precision, "p_abw" double precision); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION "public"."transfer_weight_kg"("p_total_weight_transfer" double precision, "p_number_of_fish_transfer" double precision, "p_abw" double precision) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."transfer_weight_kg"("p_total_weight_transfer" double precision, "p_number_of_fish_transfer" double precision, "p_abw" double precision) TO "authenticated";
GRANT ALL ON FUNCTION "public"."transfer_weight_kg"("p_total_weight_transfer" double precision, "p_number_of_fish_transfer" double precision, "p_abw" double precision) TO "service_role";


--
-- Name: FUNCTION "trg_refresh_daily_water_quality_rating"(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."trg_refresh_daily_water_quality_rating"() TO "anon";
GRANT ALL ON FUNCTION "public"."trg_refresh_daily_water_quality_rating"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trg_refresh_daily_water_quality_rating"() TO "service_role";


--
-- Name: FUNCTION "trg_refresh_daily_water_quality_rating_from_framework"(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."trg_refresh_daily_water_quality_rating_from_framework"() TO "anon";
GRANT ALL ON FUNCTION "public"."trg_refresh_daily_water_quality_rating_from_framework"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trg_refresh_daily_water_quality_rating_from_framework"() TO "service_role";


--
-- Name: FUNCTION "trg_update_system_growth_stage"(); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION "public"."trg_update_system_growth_stage"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."trg_update_system_growth_stage"() TO "service_role";


--
-- Name: FUNCTION "apply_rls"("wal" "jsonb", "max_record_bytes" integer); Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON FUNCTION "realtime"."apply_rls"("wal" "jsonb", "max_record_bytes" integer) TO "postgres";
GRANT ALL ON FUNCTION "realtime"."apply_rls"("wal" "jsonb", "max_record_bytes" integer) TO "dashboard_user";
GRANT ALL ON FUNCTION "realtime"."apply_rls"("wal" "jsonb", "max_record_bytes" integer) TO "anon";
GRANT ALL ON FUNCTION "realtime"."apply_rls"("wal" "jsonb", "max_record_bytes" integer) TO "authenticated";
GRANT ALL ON FUNCTION "realtime"."apply_rls"("wal" "jsonb", "max_record_bytes" integer) TO "service_role";
GRANT ALL ON FUNCTION "realtime"."apply_rls"("wal" "jsonb", "max_record_bytes" integer) TO "supabase_realtime_admin";


--
-- Name: FUNCTION "broadcast_changes"("topic_name" "text", "event_name" "text", "operation" "text", "table_name" "text", "table_schema" "text", "new" "record", "old" "record", "level" "text"); Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON FUNCTION "realtime"."broadcast_changes"("topic_name" "text", "event_name" "text", "operation" "text", "table_name" "text", "table_schema" "text", "new" "record", "old" "record", "level" "text") TO "postgres";
GRANT ALL ON FUNCTION "realtime"."broadcast_changes"("topic_name" "text", "event_name" "text", "operation" "text", "table_name" "text", "table_schema" "text", "new" "record", "old" "record", "level" "text") TO "dashboard_user";


--
-- Name: FUNCTION "build_prepared_statement_sql"("prepared_statement_name" "text", "entity" "regclass", "columns" "realtime"."wal_column"[]); Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON FUNCTION "realtime"."build_prepared_statement_sql"("prepared_statement_name" "text", "entity" "regclass", "columns" "realtime"."wal_column"[]) TO "postgres";
GRANT ALL ON FUNCTION "realtime"."build_prepared_statement_sql"("prepared_statement_name" "text", "entity" "regclass", "columns" "realtime"."wal_column"[]) TO "dashboard_user";
GRANT ALL ON FUNCTION "realtime"."build_prepared_statement_sql"("prepared_statement_name" "text", "entity" "regclass", "columns" "realtime"."wal_column"[]) TO "anon";
GRANT ALL ON FUNCTION "realtime"."build_prepared_statement_sql"("prepared_statement_name" "text", "entity" "regclass", "columns" "realtime"."wal_column"[]) TO "authenticated";
GRANT ALL ON FUNCTION "realtime"."build_prepared_statement_sql"("prepared_statement_name" "text", "entity" "regclass", "columns" "realtime"."wal_column"[]) TO "service_role";
GRANT ALL ON FUNCTION "realtime"."build_prepared_statement_sql"("prepared_statement_name" "text", "entity" "regclass", "columns" "realtime"."wal_column"[]) TO "supabase_realtime_admin";


--
-- Name: FUNCTION "cast"("val" "text", "type_" "regtype"); Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON FUNCTION "realtime"."cast"("val" "text", "type_" "regtype") TO "postgres";
GRANT ALL ON FUNCTION "realtime"."cast"("val" "text", "type_" "regtype") TO "dashboard_user";
GRANT ALL ON FUNCTION "realtime"."cast"("val" "text", "type_" "regtype") TO "anon";
GRANT ALL ON FUNCTION "realtime"."cast"("val" "text", "type_" "regtype") TO "authenticated";
GRANT ALL ON FUNCTION "realtime"."cast"("val" "text", "type_" "regtype") TO "service_role";
GRANT ALL ON FUNCTION "realtime"."cast"("val" "text", "type_" "regtype") TO "supabase_realtime_admin";


--
-- Name: FUNCTION "check_equality_op"("op" "realtime"."equality_op", "type_" "regtype", "val_1" "text", "val_2" "text"); Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON FUNCTION "realtime"."check_equality_op"("op" "realtime"."equality_op", "type_" "regtype", "val_1" "text", "val_2" "text") TO "postgres";
GRANT ALL ON FUNCTION "realtime"."check_equality_op"("op" "realtime"."equality_op", "type_" "regtype", "val_1" "text", "val_2" "text") TO "dashboard_user";
GRANT ALL ON FUNCTION "realtime"."check_equality_op"("op" "realtime"."equality_op", "type_" "regtype", "val_1" "text", "val_2" "text") TO "anon";
GRANT ALL ON FUNCTION "realtime"."check_equality_op"("op" "realtime"."equality_op", "type_" "regtype", "val_1" "text", "val_2" "text") TO "authenticated";
GRANT ALL ON FUNCTION "realtime"."check_equality_op"("op" "realtime"."equality_op", "type_" "regtype", "val_1" "text", "val_2" "text") TO "service_role";
GRANT ALL ON FUNCTION "realtime"."check_equality_op"("op" "realtime"."equality_op", "type_" "regtype", "val_1" "text", "val_2" "text") TO "supabase_realtime_admin";


--
-- Name: FUNCTION "check_equality_op"("op" "realtime"."equality_op", "type_" "regtype", "val_1" "text", "val_2" "text", "negate" boolean); Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON FUNCTION "realtime"."check_equality_op"("op" "realtime"."equality_op", "type_" "regtype", "val_1" "text", "val_2" "text", "negate" boolean) TO "postgres";
GRANT ALL ON FUNCTION "realtime"."check_equality_op"("op" "realtime"."equality_op", "type_" "regtype", "val_1" "text", "val_2" "text", "negate" boolean) TO "dashboard_user";


--
-- Name: FUNCTION "is_visible_through_filters"("columns" "realtime"."wal_column"[], "filters" "realtime"."user_defined_filter"[]); Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON FUNCTION "realtime"."is_visible_through_filters"("columns" "realtime"."wal_column"[], "filters" "realtime"."user_defined_filter"[]) TO "postgres";
GRANT ALL ON FUNCTION "realtime"."is_visible_through_filters"("columns" "realtime"."wal_column"[], "filters" "realtime"."user_defined_filter"[]) TO "dashboard_user";
GRANT ALL ON FUNCTION "realtime"."is_visible_through_filters"("columns" "realtime"."wal_column"[], "filters" "realtime"."user_defined_filter"[]) TO "anon";
GRANT ALL ON FUNCTION "realtime"."is_visible_through_filters"("columns" "realtime"."wal_column"[], "filters" "realtime"."user_defined_filter"[]) TO "authenticated";
GRANT ALL ON FUNCTION "realtime"."is_visible_through_filters"("columns" "realtime"."wal_column"[], "filters" "realtime"."user_defined_filter"[]) TO "service_role";
GRANT ALL ON FUNCTION "realtime"."is_visible_through_filters"("columns" "realtime"."wal_column"[], "filters" "realtime"."user_defined_filter"[]) TO "supabase_realtime_admin";


--
-- Name: FUNCTION "list_changes"("publication" "name", "slot_name" "name", "max_changes" integer, "max_record_bytes" integer); Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON FUNCTION "realtime"."list_changes"("publication" "name", "slot_name" "name", "max_changes" integer, "max_record_bytes" integer) TO "postgres";
GRANT ALL ON FUNCTION "realtime"."list_changes"("publication" "name", "slot_name" "name", "max_changes" integer, "max_record_bytes" integer) TO "dashboard_user";


--
-- Name: FUNCTION "quote_wal2json"("entity" "regclass"); Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON FUNCTION "realtime"."quote_wal2json"("entity" "regclass") TO "postgres";
GRANT ALL ON FUNCTION "realtime"."quote_wal2json"("entity" "regclass") TO "dashboard_user";
GRANT ALL ON FUNCTION "realtime"."quote_wal2json"("entity" "regclass") TO "anon";
GRANT ALL ON FUNCTION "realtime"."quote_wal2json"("entity" "regclass") TO "authenticated";
GRANT ALL ON FUNCTION "realtime"."quote_wal2json"("entity" "regclass") TO "service_role";
GRANT ALL ON FUNCTION "realtime"."quote_wal2json"("entity" "regclass") TO "supabase_realtime_admin";


--
-- Name: FUNCTION "send"("payload" "jsonb", "event" "text", "topic" "text", "private" boolean); Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON FUNCTION "realtime"."send"("payload" "jsonb", "event" "text", "topic" "text", "private" boolean) TO "postgres";
GRANT ALL ON FUNCTION "realtime"."send"("payload" "jsonb", "event" "text", "topic" "text", "private" boolean) TO "dashboard_user";


--
-- Name: FUNCTION "send_binary"("payload" "bytea", "event" "text", "topic" "text", "private" boolean); Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON FUNCTION "realtime"."send_binary"("payload" "bytea", "event" "text", "topic" "text", "private" boolean) TO "postgres";
GRANT ALL ON FUNCTION "realtime"."send_binary"("payload" "bytea", "event" "text", "topic" "text", "private" boolean) TO "dashboard_user";


--
-- Name: FUNCTION "subscription_check_filters"(); Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON FUNCTION "realtime"."subscription_check_filters"() TO "postgres";
GRANT ALL ON FUNCTION "realtime"."subscription_check_filters"() TO "dashboard_user";
GRANT ALL ON FUNCTION "realtime"."subscription_check_filters"() TO "anon";
GRANT ALL ON FUNCTION "realtime"."subscription_check_filters"() TO "authenticated";
GRANT ALL ON FUNCTION "realtime"."subscription_check_filters"() TO "service_role";
GRANT ALL ON FUNCTION "realtime"."subscription_check_filters"() TO "supabase_realtime_admin";


--
-- Name: FUNCTION "to_regrole"("role_name" "text"); Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON FUNCTION "realtime"."to_regrole"("role_name" "text") TO "postgres";
GRANT ALL ON FUNCTION "realtime"."to_regrole"("role_name" "text") TO "dashboard_user";
GRANT ALL ON FUNCTION "realtime"."to_regrole"("role_name" "text") TO "anon";
GRANT ALL ON FUNCTION "realtime"."to_regrole"("role_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "realtime"."to_regrole"("role_name" "text") TO "service_role";
GRANT ALL ON FUNCTION "realtime"."to_regrole"("role_name" "text") TO "supabase_realtime_admin";


--
-- Name: FUNCTION "topic"(); Type: ACL; Schema: realtime; Owner: supabase_realtime_admin
--

GRANT ALL ON FUNCTION "realtime"."topic"() TO "postgres";
GRANT ALL ON FUNCTION "realtime"."topic"() TO "dashboard_user";


--
-- Name: FUNCTION "wal2json_escape_identifier"("name" "text"); Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON FUNCTION "realtime"."wal2json_escape_identifier"("name" "text") TO "postgres";
GRANT ALL ON FUNCTION "realtime"."wal2json_escape_identifier"("name" "text") TO "dashboard_user";


--
-- Name: FUNCTION "can_insert_object"("bucketid" "text", "name" "text", "owner" "uuid", "metadata" "jsonb"); Type: ACL; Schema: storage; Owner: supabase_storage_admin
--

GRANT ALL ON FUNCTION "storage"."can_insert_object"("bucketid" "text", "name" "text", "owner" "uuid", "metadata" "jsonb") TO "postgres";


--
-- Name: FUNCTION "enforce_bucket_name_length"(); Type: ACL; Schema: storage; Owner: supabase_storage_admin
--

GRANT ALL ON FUNCTION "storage"."enforce_bucket_name_length"() TO "postgres";


--
-- Name: FUNCTION "extension"("name" "text"); Type: ACL; Schema: storage; Owner: supabase_storage_admin
--

GRANT ALL ON FUNCTION "storage"."extension"("name" "text") TO "postgres";


--
-- Name: FUNCTION "filename"("name" "text"); Type: ACL; Schema: storage; Owner: supabase_storage_admin
--

GRANT ALL ON FUNCTION "storage"."filename"("name" "text") TO "postgres";


--
-- Name: FUNCTION "foldername"("name" "text"); Type: ACL; Schema: storage; Owner: supabase_storage_admin
--

GRANT ALL ON FUNCTION "storage"."foldername"("name" "text") TO "postgres";


--
-- Name: FUNCTION "get_common_prefix"("p_key" "text", "p_prefix" "text", "p_delimiter" "text"); Type: ACL; Schema: storage; Owner: supabase_storage_admin
--

GRANT ALL ON FUNCTION "storage"."get_common_prefix"("p_key" "text", "p_prefix" "text", "p_delimiter" "text") TO "postgres";


--
-- Name: FUNCTION "get_size_by_bucket"(); Type: ACL; Schema: storage; Owner: supabase_storage_admin
--

GRANT ALL ON FUNCTION "storage"."get_size_by_bucket"() TO "postgres";


--
-- Name: FUNCTION "list_multipart_uploads_with_delimiter"("bucket_id" "text", "prefix_param" "text", "delimiter_param" "text", "max_keys" integer, "next_key_token" "text", "next_upload_token" "text"); Type: ACL; Schema: storage; Owner: supabase_storage_admin
--

GRANT ALL ON FUNCTION "storage"."list_multipart_uploads_with_delimiter"("bucket_id" "text", "prefix_param" "text", "delimiter_param" "text", "max_keys" integer, "next_key_token" "text", "next_upload_token" "text") TO "postgres";


--
-- Name: FUNCTION "list_objects_with_delimiter"("_bucket_id" "text", "prefix_param" "text", "delimiter_param" "text", "max_keys" integer, "start_after" "text", "next_token" "text", "sort_order" "text"); Type: ACL; Schema: storage; Owner: supabase_storage_admin
--

GRANT ALL ON FUNCTION "storage"."list_objects_with_delimiter"("_bucket_id" "text", "prefix_param" "text", "delimiter_param" "text", "max_keys" integer, "start_after" "text", "next_token" "text", "sort_order" "text") TO "postgres";


--
-- Name: FUNCTION "operation"(); Type: ACL; Schema: storage; Owner: supabase_storage_admin
--

GRANT ALL ON FUNCTION "storage"."operation"() TO "postgres";


--
-- Name: FUNCTION "protect_delete"(); Type: ACL; Schema: storage; Owner: supabase_storage_admin
--

GRANT ALL ON FUNCTION "storage"."protect_delete"() TO "postgres";


--
-- Name: FUNCTION "search"("prefix" "text", "bucketname" "text", "limits" integer, "levels" integer, "offsets" integer, "search" "text", "sortcolumn" "text", "sortorder" "text"); Type: ACL; Schema: storage; Owner: supabase_storage_admin
--

GRANT ALL ON FUNCTION "storage"."search"("prefix" "text", "bucketname" "text", "limits" integer, "levels" integer, "offsets" integer, "search" "text", "sortcolumn" "text", "sortorder" "text") TO "postgres";


--
-- Name: FUNCTION "search_by_timestamp"("p_prefix" "text", "p_bucket_id" "text", "p_limit" integer, "p_level" integer, "p_start_after" "text", "p_sort_order" "text", "p_sort_column" "text", "p_sort_column_after" "text"); Type: ACL; Schema: storage; Owner: supabase_storage_admin
--

GRANT ALL ON FUNCTION "storage"."search_by_timestamp"("p_prefix" "text", "p_bucket_id" "text", "p_limit" integer, "p_level" integer, "p_start_after" "text", "p_sort_order" "text", "p_sort_column" "text", "p_sort_column_after" "text") TO "postgres";


--
-- Name: FUNCTION "search_v2"("prefix" "text", "bucket_name" "text", "limits" integer, "levels" integer, "start_after" "text", "sort_order" "text", "sort_column" "text", "sort_column_after" "text"); Type: ACL; Schema: storage; Owner: supabase_storage_admin
--

GRANT ALL ON FUNCTION "storage"."search_v2"("prefix" "text", "bucket_name" "text", "limits" integer, "levels" integer, "start_after" "text", "sort_order" "text", "sort_column" "text", "sort_column_after" "text") TO "postgres";


--
-- Name: FUNCTION "update_updated_at_column"(); Type: ACL; Schema: storage; Owner: supabase_storage_admin
--

GRANT ALL ON FUNCTION "storage"."update_updated_at_column"() TO "postgres";


--
-- Name: TABLE "feeding_record"; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,UPDATE ON TABLE "public"."feeding_record" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."feeding_record" TO "service_role";


--
-- Name: TABLE "fingerling_batch"; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,UPDATE ON TABLE "public"."fingerling_batch" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."fingerling_batch" TO "service_role";


--
-- Name: TABLE "fish_harvest"; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,UPDATE ON TABLE "public"."fish_harvest" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."fish_harvest" TO "service_role";


--
-- Name: TABLE "fish_mortality"; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,UPDATE ON TABLE "public"."fish_mortality" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."fish_mortality" TO "service_role";


--
-- Name: TABLE "fish_sampling_weight"; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,UPDATE ON TABLE "public"."fish_sampling_weight" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."fish_sampling_weight" TO "service_role";


--
-- Name: TABLE "fish_stocking"; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,UPDATE ON TABLE "public"."fish_stocking" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."fish_stocking" TO "service_role";


--
-- Name: TABLE "fish_transfer"; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,UPDATE ON TABLE "public"."fish_transfer" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."fish_transfer" TO "service_role";


--
-- Name: TABLE "system"; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,UPDATE ON TABLE "public"."system" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."system" TO "service_role";


--
-- Name: TABLE "production_cycle"; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,UPDATE ON TABLE "public"."production_cycle" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."production_cycle" TO "service_role";


--
-- Name: TABLE "feeding_rate_config"; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE ON TABLE "public"."feeding_rate_config" TO "service_role";


--
-- Name: TABLE "audit_log_entries"; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "auth"."audit_log_entries" TO "dashboard_user";
GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "auth"."audit_log_entries" TO "postgres";
GRANT SELECT ON TABLE "auth"."audit_log_entries" TO "postgres" WITH GRANT OPTION;


--
-- Name: TABLE "custom_oauth_providers"; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "auth"."custom_oauth_providers" TO "postgres";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "auth"."custom_oauth_providers" TO "dashboard_user";


--
-- Name: TABLE "flow_state"; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "auth"."flow_state" TO "postgres";
GRANT SELECT ON TABLE "auth"."flow_state" TO "postgres" WITH GRANT OPTION;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "auth"."flow_state" TO "dashboard_user";


--
-- Name: TABLE "identities"; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "auth"."identities" TO "postgres";
GRANT SELECT ON TABLE "auth"."identities" TO "postgres" WITH GRANT OPTION;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "auth"."identities" TO "dashboard_user";


--
-- Name: TABLE "instances"; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "auth"."instances" TO "dashboard_user";
GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "auth"."instances" TO "postgres";
GRANT SELECT ON TABLE "auth"."instances" TO "postgres" WITH GRANT OPTION;


--
-- Name: TABLE "mfa_amr_claims"; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "auth"."mfa_amr_claims" TO "postgres";
GRANT SELECT ON TABLE "auth"."mfa_amr_claims" TO "postgres" WITH GRANT OPTION;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "auth"."mfa_amr_claims" TO "dashboard_user";


--
-- Name: TABLE "mfa_challenges"; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "auth"."mfa_challenges" TO "postgres";
GRANT SELECT ON TABLE "auth"."mfa_challenges" TO "postgres" WITH GRANT OPTION;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "auth"."mfa_challenges" TO "dashboard_user";


--
-- Name: TABLE "mfa_factors"; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "auth"."mfa_factors" TO "postgres";
GRANT SELECT ON TABLE "auth"."mfa_factors" TO "postgres" WITH GRANT OPTION;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "auth"."mfa_factors" TO "dashboard_user";


--
-- Name: TABLE "oauth_authorizations"; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "auth"."oauth_authorizations" TO "postgres";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "auth"."oauth_authorizations" TO "dashboard_user";


--
-- Name: TABLE "oauth_client_states"; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "auth"."oauth_client_states" TO "postgres";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "auth"."oauth_client_states" TO "dashboard_user";


--
-- Name: TABLE "oauth_clients"; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "auth"."oauth_clients" TO "postgres";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "auth"."oauth_clients" TO "dashboard_user";


--
-- Name: TABLE "oauth_consents"; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "auth"."oauth_consents" TO "postgres";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "auth"."oauth_consents" TO "dashboard_user";


--
-- Name: TABLE "one_time_tokens"; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "auth"."one_time_tokens" TO "postgres";
GRANT SELECT ON TABLE "auth"."one_time_tokens" TO "postgres" WITH GRANT OPTION;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "auth"."one_time_tokens" TO "dashboard_user";


--
-- Name: TABLE "refresh_tokens"; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "auth"."refresh_tokens" TO "dashboard_user";
GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "auth"."refresh_tokens" TO "postgres";
GRANT SELECT ON TABLE "auth"."refresh_tokens" TO "postgres" WITH GRANT OPTION;


--
-- Name: SEQUENCE "refresh_tokens_id_seq"; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON SEQUENCE "auth"."refresh_tokens_id_seq" TO "dashboard_user";
GRANT ALL ON SEQUENCE "auth"."refresh_tokens_id_seq" TO "postgres";


--
-- Name: TABLE "saml_providers"; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "auth"."saml_providers" TO "postgres";
GRANT SELECT ON TABLE "auth"."saml_providers" TO "postgres" WITH GRANT OPTION;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "auth"."saml_providers" TO "dashboard_user";


--
-- Name: TABLE "saml_relay_states"; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "auth"."saml_relay_states" TO "postgres";
GRANT SELECT ON TABLE "auth"."saml_relay_states" TO "postgres" WITH GRANT OPTION;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "auth"."saml_relay_states" TO "dashboard_user";


--
-- Name: TABLE "sessions"; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "auth"."sessions" TO "postgres";
GRANT SELECT ON TABLE "auth"."sessions" TO "postgres" WITH GRANT OPTION;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "auth"."sessions" TO "dashboard_user";


--
-- Name: TABLE "sso_domains"; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "auth"."sso_domains" TO "postgres";
GRANT SELECT ON TABLE "auth"."sso_domains" TO "postgres" WITH GRANT OPTION;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "auth"."sso_domains" TO "dashboard_user";


--
-- Name: TABLE "sso_providers"; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "auth"."sso_providers" TO "postgres";
GRANT SELECT ON TABLE "auth"."sso_providers" TO "postgres" WITH GRANT OPTION;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "auth"."sso_providers" TO "dashboard_user";


--
-- Name: TABLE "users"; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "auth"."users" TO "dashboard_user";
GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "auth"."users" TO "postgres";
GRANT SELECT ON TABLE "auth"."users" TO "postgres" WITH GRANT OPTION;


--
-- Name: TABLE "webauthn_challenges"; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "auth"."webauthn_challenges" TO "postgres";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "auth"."webauthn_challenges" TO "dashboard_user";


--
-- Name: TABLE "webauthn_credentials"; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "auth"."webauthn_credentials" TO "postgres";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "auth"."webauthn_credentials" TO "dashboard_user";


--
-- Name: TABLE "_affected_systems"; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."_affected_systems" TO "service_role";


--
-- Name: TABLE "alert_threshold"; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,UPDATE ON TABLE "public"."alert_threshold" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."alert_threshold" TO "service_role";


--
-- Name: TABLE "farm_user"; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,UPDATE ON TABLE "public"."farm_user" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."farm_user" TO "service_role";


--
-- Name: TABLE "api_alert_thresholds"; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE "public"."api_alert_thresholds" TO "authenticated";
GRANT SELECT ON TABLE "public"."api_alert_thresholds" TO "service_role";


--
-- Name: TABLE "daily_water_quality_rating"; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,UPDATE ON TABLE "public"."daily_water_quality_rating" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."daily_water_quality_rating" TO "service_role";


--
-- Name: TABLE "user_profile"; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,UPDATE ON TABLE "public"."user_profile" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."user_profile" TO "service_role";


--
-- Name: TABLE "water_quality_measurement"; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,UPDATE ON TABLE "public"."water_quality_measurement" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."water_quality_measurement" TO "service_role";


--
-- Name: TABLE "api_daily_water_quality_rating"; Type: ACL; Schema: public; Owner: postgres
--

GRANT REFERENCES,TRIGGER,TRUNCATE ON TABLE "public"."api_daily_water_quality_rating" TO "anon";
GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE ON TABLE "public"."api_daily_water_quality_rating" TO "authenticated";
GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE ON TABLE "public"."api_daily_water_quality_rating" TO "service_role";


--
-- Name: TABLE "water_quality_framework"; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,REFERENCES,TRIGGER ON TABLE "public"."water_quality_framework" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."water_quality_framework" TO "service_role";


--
-- Name: TABLE "api_water_quality_measurements"; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE "public"."api_water_quality_measurements" TO "authenticated";
GRANT SELECT ON TABLE "public"."api_water_quality_measurements" TO "service_role";


--
-- Name: TABLE "app_config"; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,REFERENCES,TRIGGER ON TABLE "public"."app_config" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."app_config" TO "service_role";


--
-- Name: SEQUENCE "daily_water_quality_rating_id_seq"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE "public"."daily_water_quality_rating_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."daily_water_quality_rating_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."daily_water_quality_rating_id_seq" TO "service_role";


--
-- Name: TABLE "dashboard_time_period"; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,REFERENCES,TRIGGER ON TABLE "public"."dashboard_time_period" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."dashboard_time_period" TO "service_role";


--
-- Name: TABLE "energy_alarm_events"; Type: ACL; Schema: public; Owner: postgres
--

GRANT REFERENCES,TRIGGER,TRUNCATE ON TABLE "public"."energy_alarm_events" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."energy_alarm_events" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."energy_alarm_events" TO "service_role";


--
-- Name: SEQUENCE "energy_alarm_events_id_seq"; Type: ACL; Schema: public; Owner: postgres
--

GRANT UPDATE ON SEQUENCE "public"."energy_alarm_events_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."energy_alarm_events_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."energy_alarm_events_id_seq" TO "service_role";


--
-- Name: TABLE "energy_meter_timeseries"; Type: ACL; Schema: public; Owner: postgres
--

GRANT REFERENCES,TRIGGER,TRUNCATE ON TABLE "public"."energy_meter_timeseries" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."energy_meter_timeseries" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."energy_meter_timeseries" TO "service_role";


--
-- Name: SEQUENCE "energy_meter_timeseries_id_seq"; Type: ACL; Schema: public; Owner: postgres
--

GRANT UPDATE ON SEQUENCE "public"."energy_meter_timeseries_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."energy_meter_timeseries_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."energy_meter_timeseries_id_seq" TO "service_role";


--
-- Name: TABLE "farm"; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,UPDATE ON TABLE "public"."farm" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."farm" TO "service_role";


--
-- Name: TABLE "feed_inventory"; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."feed_inventory" TO "service_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."feed_inventory" TO "authenticated";


--
-- Name: SEQUENCE "feed_inventory_id_seq"; Type: ACL; Schema: public; Owner: postgres
--

GRANT UPDATE ON SEQUENCE "public"."feed_inventory_id_seq" TO "anon";
GRANT UPDATE ON SEQUENCE "public"."feed_inventory_id_seq" TO "authenticated";
GRANT UPDATE ON SEQUENCE "public"."feed_inventory_id_seq" TO "service_role";


--
-- Name: TABLE "feed_supplier"; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,UPDATE ON TABLE "public"."feed_supplier" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."feed_supplier" TO "service_role";


--
-- Name: SEQUENCE "feed_supplier_id_seq"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE "public"."feed_supplier_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."feed_supplier_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."feed_supplier_id_seq" TO "service_role";


--
-- Name: TABLE "feed_type"; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,UPDATE ON TABLE "public"."feed_type" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."feed_type" TO "service_role";


--
-- Name: SEQUENCE "feed_type_id_seq"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE "public"."feed_type_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."feed_type_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."feed_type_id_seq" TO "service_role";


--
-- Name: SEQUENCE "feeding_rate_config_config_id_seq"; Type: ACL; Schema: public; Owner: postgres
--

GRANT UPDATE ON SEQUENCE "public"."feeding_rate_config_config_id_seq" TO "anon";
GRANT UPDATE ON SEQUENCE "public"."feeding_rate_config_config_id_seq" TO "authenticated";
GRANT UPDATE ON SEQUENCE "public"."feeding_rate_config_config_id_seq" TO "service_role";


--
-- Name: SEQUENCE "feeding_record_id_seq"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE "public"."feeding_record_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."feeding_record_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."feeding_record_id_seq" TO "service_role";


--
-- Name: TABLE "feeding_response_level"; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."feeding_response_level" TO "service_role";
GRANT SELECT ON TABLE "public"."feeding_response_level" TO "authenticated";


--
-- Name: SEQUENCE "fingerling_batch_id_seq"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE "public"."fingerling_batch_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."fingerling_batch_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."fingerling_batch_id_seq" TO "service_role";


--
-- Name: TABLE "fingerling_supplier"; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,UPDATE ON TABLE "public"."fingerling_supplier" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."fingerling_supplier" TO "service_role";


--
-- Name: SEQUENCE "fingerling_supplier_id_seq"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE "public"."fingerling_supplier_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."fingerling_supplier_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."fingerling_supplier_id_seq" TO "service_role";


--
-- Name: SEQUENCE "fish_harvest_id_seq"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE "public"."fish_harvest_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."fish_harvest_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."fish_harvest_id_seq" TO "service_role";


--
-- Name: SEQUENCE "fish_mortality_id_seq"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE "public"."fish_mortality_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."fish_mortality_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."fish_mortality_id_seq" TO "service_role";


--
-- Name: SEQUENCE "fish_sampling_weight_id_seq"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE "public"."fish_sampling_weight_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."fish_sampling_weight_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."fish_sampling_weight_id_seq" TO "service_role";


--
-- Name: SEQUENCE "fish_stocking_id_seq"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE "public"."fish_stocking_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."fish_stocking_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."fish_stocking_id_seq" TO "service_role";


--
-- Name: SEQUENCE "fish_transfer_id_seq"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE "public"."fish_transfer_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."fish_transfer_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."fish_transfer_id_seq" TO "service_role";


--
-- Name: TABLE "growth_phase"; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE ON TABLE "public"."growth_phase" TO "service_role";


--
-- Name: TABLE "normalization_review"; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."normalization_review" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."normalization_review" TO "service_role";


--
-- Name: TABLE "organization"; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."organization" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."organization" TO "service_role";


--
-- Name: SEQUENCE "production_cycle_cycle_id_seq"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE "public"."production_cycle_cycle_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."production_cycle_cycle_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."production_cycle_cycle_id_seq" TO "service_role";


--
-- Name: TABLE "raw_uploads"; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."raw_uploads" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."raw_uploads" TO "service_role";


--
-- Name: SEQUENCE "system_id_seq"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE "public"."system_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."system_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."system_id_seq" TO "service_role";


--
-- Name: TABLE "system_name_change_log"; Type: ACL; Schema: public; Owner: postgres
--

GRANT REFERENCES,TRIGGER,TRUNCATE ON TABLE "public"."system_name_change_log" TO "anon";
GRANT REFERENCES,TRIGGER,TRUNCATE ON TABLE "public"."system_name_change_log" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE ON TABLE "public"."system_name_change_log" TO "service_role";


--
-- Name: SEQUENCE "system_name_change_log_id_seq"; Type: ACL; Schema: public; Owner: postgres
--

GRANT UPDATE ON SEQUENCE "public"."system_name_change_log_id_seq" TO "anon";
GRANT UPDATE ON SEQUENCE "public"."system_name_change_log_id_seq" TO "authenticated";
GRANT UPDATE ON SEQUENCE "public"."system_name_change_log_id_seq" TO "service_role";


--
-- Name: TABLE "user_settings"; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."user_settings" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."user_settings" TO "service_role";


--
-- Name: SEQUENCE "water_quality_framework_id_seq"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE "public"."water_quality_framework_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."water_quality_framework_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."water_quality_framework_id_seq" TO "service_role";


--
-- Name: SEQUENCE "water_quality_measurement_id_seq"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE "public"."water_quality_measurement_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."water_quality_measurement_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."water_quality_measurement_id_seq" TO "service_role";


--
-- Name: SEQUENCE "water_quality_measurements_id_seq"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE "public"."water_quality_measurements_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."water_quality_measurements_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."water_quality_measurements_id_seq" TO "service_role";


--
-- Name: TABLE "messages"; Type: ACL; Schema: realtime; Owner: supabase_realtime_admin
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "realtime"."messages" TO "postgres";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "realtime"."messages" TO "dashboard_user";
GRANT SELECT,INSERT,UPDATE ON TABLE "realtime"."messages" TO "anon";
GRANT SELECT,INSERT,UPDATE ON TABLE "realtime"."messages" TO "authenticated";
GRANT SELECT,INSERT,UPDATE ON TABLE "realtime"."messages" TO "service_role";


--
-- Name: TABLE "messages_2026_06_29"; Type: ACL; Schema: realtime; Owner: supabase_realtime_admin
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "realtime"."messages_2026_06_29" TO "postgres";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "realtime"."messages_2026_06_29" TO "dashboard_user";


--
-- Name: TABLE "messages_2026_06_30"; Type: ACL; Schema: realtime; Owner: supabase_realtime_admin
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "realtime"."messages_2026_06_30" TO "postgres";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "realtime"."messages_2026_06_30" TO "dashboard_user";


--
-- Name: TABLE "messages_2026_07_01"; Type: ACL; Schema: realtime; Owner: supabase_realtime_admin
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "realtime"."messages_2026_07_01" TO "postgres";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "realtime"."messages_2026_07_01" TO "dashboard_user";


--
-- Name: TABLE "messages_2026_07_02"; Type: ACL; Schema: realtime; Owner: supabase_realtime_admin
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "realtime"."messages_2026_07_02" TO "postgres";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "realtime"."messages_2026_07_02" TO "dashboard_user";


--
-- Name: TABLE "messages_2026_07_03"; Type: ACL; Schema: realtime; Owner: supabase_realtime_admin
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "realtime"."messages_2026_07_03" TO "postgres";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "realtime"."messages_2026_07_03" TO "dashboard_user";


--
-- Name: TABLE "messages_2026_07_04"; Type: ACL; Schema: realtime; Owner: supabase_realtime_admin
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "realtime"."messages_2026_07_04" TO "postgres";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "realtime"."messages_2026_07_04" TO "dashboard_user";


--
-- Name: TABLE "messages_2026_07_05"; Type: ACL; Schema: realtime; Owner: supabase_realtime_admin
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "realtime"."messages_2026_07_05" TO "postgres";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "realtime"."messages_2026_07_05" TO "dashboard_user";


--
-- Name: TABLE "messages_2026_07_06"; Type: ACL; Schema: realtime; Owner: supabase_realtime_admin
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "realtime"."messages_2026_07_06" TO "postgres";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "realtime"."messages_2026_07_06" TO "dashboard_user";


--
-- Name: TABLE "schema_migrations"; Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "realtime"."schema_migrations" TO "postgres";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "realtime"."schema_migrations" TO "dashboard_user";
GRANT SELECT ON TABLE "realtime"."schema_migrations" TO "anon";
GRANT SELECT ON TABLE "realtime"."schema_migrations" TO "authenticated";
GRANT SELECT ON TABLE "realtime"."schema_migrations" TO "service_role";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "realtime"."schema_migrations" TO "supabase_realtime_admin";


--
-- Name: TABLE "subscription"; Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "realtime"."subscription" TO "postgres";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "realtime"."subscription" TO "dashboard_user";
GRANT SELECT ON TABLE "realtime"."subscription" TO "anon";
GRANT SELECT ON TABLE "realtime"."subscription" TO "authenticated";
GRANT SELECT ON TABLE "realtime"."subscription" TO "service_role";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "realtime"."subscription" TO "supabase_realtime_admin";


--
-- Name: SEQUENCE "subscription_id_seq"; Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON SEQUENCE "realtime"."subscription_id_seq" TO "postgres";
GRANT ALL ON SEQUENCE "realtime"."subscription_id_seq" TO "dashboard_user";
GRANT USAGE ON SEQUENCE "realtime"."subscription_id_seq" TO "anon";
GRANT USAGE ON SEQUENCE "realtime"."subscription_id_seq" TO "authenticated";
GRANT USAGE ON SEQUENCE "realtime"."subscription_id_seq" TO "service_role";
GRANT ALL ON SEQUENCE "realtime"."subscription_id_seq" TO "supabase_realtime_admin";


--
-- Name: TABLE "buckets"; Type: ACL; Schema: storage; Owner: supabase_storage_admin
--

REVOKE SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "storage"."buckets" FROM "supabase_storage_admin";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "storage"."buckets" TO "supabase_storage_admin" WITH GRANT OPTION;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "storage"."buckets" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "storage"."buckets" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "storage"."buckets" TO "service_role";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "storage"."buckets" TO "postgres" WITH GRANT OPTION;


--
-- Name: TABLE "buckets_analytics"; Type: ACL; Schema: storage; Owner: supabase_storage_admin
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "storage"."buckets_analytics" TO "service_role";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "storage"."buckets_analytics" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "storage"."buckets_analytics" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "storage"."buckets_analytics" TO "postgres";


--
-- Name: TABLE "buckets_vectors"; Type: ACL; Schema: storage; Owner: supabase_storage_admin
--

GRANT SELECT ON TABLE "storage"."buckets_vectors" TO "service_role";
GRANT SELECT ON TABLE "storage"."buckets_vectors" TO "authenticated";
GRANT SELECT ON TABLE "storage"."buckets_vectors" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "storage"."buckets_vectors" TO "postgres";


--
-- Name: TABLE "objects"; Type: ACL; Schema: storage; Owner: supabase_storage_admin
--

REVOKE SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "storage"."objects" FROM "supabase_storage_admin";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "storage"."objects" TO "supabase_storage_admin" WITH GRANT OPTION;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "storage"."objects" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "storage"."objects" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "storage"."objects" TO "service_role";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "storage"."objects" TO "postgres" WITH GRANT OPTION;


--
-- Name: TABLE "s3_multipart_uploads"; Type: ACL; Schema: storage; Owner: supabase_storage_admin
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "storage"."s3_multipart_uploads" TO "service_role";
GRANT SELECT ON TABLE "storage"."s3_multipart_uploads" TO "authenticated";
GRANT SELECT ON TABLE "storage"."s3_multipart_uploads" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "storage"."s3_multipart_uploads" TO "postgres";


--
-- Name: TABLE "s3_multipart_uploads_parts"; Type: ACL; Schema: storage; Owner: supabase_storage_admin
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "storage"."s3_multipart_uploads_parts" TO "service_role";
GRANT SELECT ON TABLE "storage"."s3_multipart_uploads_parts" TO "authenticated";
GRANT SELECT ON TABLE "storage"."s3_multipart_uploads_parts" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "storage"."s3_multipart_uploads_parts" TO "postgres";


--
-- Name: TABLE "vector_indexes"; Type: ACL; Schema: storage; Owner: supabase_storage_admin
--

GRANT SELECT ON TABLE "storage"."vector_indexes" TO "service_role";
GRANT SELECT ON TABLE "storage"."vector_indexes" TO "authenticated";
GRANT SELECT ON TABLE "storage"."vector_indexes" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "storage"."vector_indexes" TO "postgres";


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: auth; Owner: supabase_auth_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_auth_admin" IN SCHEMA "auth" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_auth_admin" IN SCHEMA "auth" GRANT ALL ON SEQUENCES TO "dashboard_user";


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: auth; Owner: supabase_auth_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_auth_admin" IN SCHEMA "auth" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_auth_admin" IN SCHEMA "auth" GRANT ALL ON FUNCTIONS TO "dashboard_user";


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: auth; Owner: supabase_auth_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_auth_admin" IN SCHEMA "auth" GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_auth_admin" IN SCHEMA "auth" GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLES TO "dashboard_user";


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: cron; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "cron" GRANT ALL ON SEQUENCES TO "postgres" WITH GRANT OPTION;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: cron; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "cron" GRANT ALL ON FUNCTIONS TO "postgres" WITH GRANT OPTION;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: cron; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "cron" GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLES TO "postgres" WITH GRANT OPTION;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: extensions; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "extensions" GRANT ALL ON SEQUENCES TO "postgres" WITH GRANT OPTION;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: extensions; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "extensions" GRANT ALL ON FUNCTIONS TO "postgres" WITH GRANT OPTION;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: extensions; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "extensions" GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLES TO "postgres" WITH GRANT OPTION;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: graphql; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "graphql" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "graphql" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "graphql" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "graphql" GRANT ALL ON SEQUENCES TO "service_role";


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: graphql; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "graphql" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "graphql" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "graphql" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "graphql" GRANT ALL ON FUNCTIONS TO "service_role";


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: graphql; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "graphql" GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "graphql" GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "graphql" GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "graphql" GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLES TO "service_role";


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: graphql_public; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "graphql_public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "graphql_public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "graphql_public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "graphql_public" GRANT ALL ON SEQUENCES TO "service_role";


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: graphql_public; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "graphql_public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "graphql_public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "graphql_public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "graphql_public" GRANT ALL ON FUNCTIONS TO "service_role";


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: graphql_public; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "graphql_public" GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "graphql_public" GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "graphql_public" GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "graphql_public" GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLES TO "service_role";


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT UPDATE ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT UPDATE ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT UPDATE ON SEQUENCES TO "service_role";


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT REFERENCES,TRIGGER,TRUNCATE ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT REFERENCES,TRIGGER,TRUNCATE ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT REFERENCES,TRIGGER,TRUNCATE ON TABLES TO "service_role";


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public" GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public" GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public" GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public" GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLES TO "service_role";


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: realtime; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "realtime" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "realtime" GRANT ALL ON SEQUENCES TO "dashboard_user";


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: realtime; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "realtime" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "realtime" GRANT ALL ON FUNCTIONS TO "dashboard_user";


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: realtime; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "realtime" GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "realtime" GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLES TO "dashboard_user";


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: storage; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "storage" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "storage" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "storage" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "storage" GRANT ALL ON SEQUENCES TO "service_role";


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: storage; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "storage" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "storage" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "storage" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "storage" GRANT ALL ON FUNCTIONS TO "service_role";


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: storage; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "storage" GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "storage" GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "storage" GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "storage" GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLES TO "service_role";


--
-- PostgreSQL database dump complete
--

\unrestrict CouupSSGDpmglWEAyPe27LpacuD8dfs3vajNzPT0jx58YpMc2d8Os9ZG2QTi4WR

