-- api_feed_dashboard (migration 20260907131912) replaced these 8 per-section
-- feed RPCs; api_feed_recommendations was never called by the app. The
-- analytics.* views they wrapped stay -- api_feed_dashboard reads them.
-- Plain DROP (no CASCADE): fails loudly if anything still depends on them.

drop function if exists "public"."api_feed_dashboard_kpis"("p_farm_id" "uuid", "p_system_ids" bigint[], "p_start_date" "date", "p_end_date" "date");
drop function if exists "public"."api_feed_plan_vs_actual"("p_farm_id" "uuid", "p_system_ids" bigint[], "p_start_date" "date", "p_end_date" "date");
drop function if exists "public"."api_system_feed_status"("p_farm_id" "uuid", "p_system_ids" bigint[], "p_start_date" "date", "p_end_date" "date");
drop function if exists "public"."api_feed_efcr_trend"("p_farm_id" "uuid", "p_system_ids" bigint[], "p_start_date" "date", "p_end_date" "date");
drop function if exists "public"."api_feeding_rate_vs_target"("p_farm_id" "uuid", "p_system_ids" bigint[], "p_start_date" "date", "p_end_date" "date");
drop function if exists "public"."api_feeding_response_distribution"("p_farm_id" "uuid", "p_system_ids" bigint[], "p_start_date" "date", "p_end_date" "date");
drop function if exists "public"."api_feed_vs_biomass_gain"("p_farm_id" "uuid", "p_system_ids" bigint[], "p_start_date" "date", "p_end_date" "date");
drop function if exists "public"."api_feeding_alerts"("p_farm_id" "uuid", "p_system_ids" bigint[], "p_start_date" "date", "p_end_date" "date");
drop function if exists "public"."api_feed_recommendations"("p_farm_id" "uuid", "p_system_ids" bigint[], "p_date" "date");
