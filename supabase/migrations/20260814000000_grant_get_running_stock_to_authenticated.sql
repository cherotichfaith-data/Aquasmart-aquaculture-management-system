-- get_running_stock() is SECURITY DEFINER and already checks
-- private.is_farm_member(p_farm_id) internally (see auth_check / the final
-- `WHERE ac.ok = true` in its body), so it's safe to call from the
-- authenticated role the same way every other api_* dashboard RPC is -- but
-- unlike its siblings, the original migration never granted EXECUTE to
-- authenticated, only to service_role. That makes every authenticated call
-- fail with 42501 ("permission denied for function get_running_stock").
--
-- Drafted for review -- not applied by Claude. Run this in the Supabase SQL
-- editor (or `supabase db push`) when ready; it only adds a grant, no table
-- or data changes.

GRANT EXECUTE ON FUNCTION "public"."get_running_stock"("p_farm_id" "uuid") TO "authenticated";
