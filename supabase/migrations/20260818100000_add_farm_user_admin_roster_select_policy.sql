-- The only SELECT policy on farm_user is "read own row"
-- (user_id = auth.uid()) -- correct for a member checking their own
-- membership, but it also means an admin viewing their farm's user list
-- can only ever see themselves via a session-scoped client. That's why
-- listFarmMembersForFarm() in src/features/settings/users.server.ts still
-- reads through the service-role client: there was no policy that let an
-- admin see a co-member's row.
--
-- This adds exactly that, scoped the same way the app already gates it --
-- listFarmMembersAction/updateFarmMemberRoleAction/removeFarmMemberAction
-- all sit behind assertAdminMembership() (admin only), so the policy
-- matches that boundary rather than opening the roster to every member.
-- It's a second, additive permissive policy alongside "farm_user: read
-- own" (Postgres ORs permissive policies for the same command together),
-- so the existing own-row visibility is untouched.

CREATE POLICY "farm_user_select_admin_roster" ON "public"."farm_user"
FOR SELECT TO "authenticated"
USING ("private"."has_farm_role"("farm_id", ARRAY['admin'::"text"]));
