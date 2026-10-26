-- The feed_inventory insert policy still checks for the legacy role name
-- `farm_technician`, which the app renamed to `system_operator` (see
-- normalizeRole() in src/lib/app-entry.ts). The rename never reached this
-- policy, and farm_user.role's own check constraint
-- (farm_user_role_check / chk_farm_user_role) no longer permits
-- `farm_technician` as a stored value at all -- so that branch of the
-- policy has been permanently unreachable, and a system_operator has never
-- actually been able to satisfy this check. It's only worked in the app so
-- far because feed-inventory writes go through the service-role client,
-- which bypasses RLS entirely; this fixes the policy itself so a
-- session-scoped client can rely on it directly.
--
-- Same WITH CHECK shape and role set the app already enforces by hand in
-- recordFeedInventorySnapshotAction (FEED_INVENTORY_ALLOWED_ROLES:
-- admin, farm_manager, system_operator) -- just moving the source of truth
-- into the database policy instead of leaving it duplicated in TypeScript.

DROP POLICY IF EXISTS "feed_inventory: insert write roles" ON "public"."feed_inventory";

CREATE POLICY "feed_inventory: insert write roles" ON "public"."feed_inventory"
FOR INSERT TO "authenticated"
WITH CHECK ("private"."has_farm_role"("farm_id", ARRAY['admin'::"text", 'farm_manager'::"text", 'system_operator'::"text"]));
