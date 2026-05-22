-- The invitation claim RPC uses `on conflict (farm_id, user_id)`, which
-- requires a matching unique/exclusion constraint. Keep one membership row per
-- farm/user pair before adding the unique index so production can migrate even
-- if duplicate rows already exist.
with ranked_memberships as (
  select
    id,
    row_number() over (
      partition by farm_id, user_id
      order by created_at asc nulls last, id asc
    ) as row_number
  from public.farm_user
)
delete from public.farm_user fu
using ranked_memberships ranked
where fu.id = ranked.id
  and ranked.row_number > 1;

create unique index if not exists farm_user_farm_id_user_id_key
  on public.farm_user (farm_id, user_id);
