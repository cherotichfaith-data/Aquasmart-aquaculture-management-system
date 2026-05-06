import { runServerReadThrough } from "@/lib/cache/server"
import { cacheTags } from "@/lib/cache/tags"
import { createAccessTokenClient } from "@/lib/supabase/server"
import { requireUserContext } from "@/lib/supabase/require-user"
import { getFarmUserRole } from "@/features/shared/query-seed.server"
import { listFarmMembersForFarm, listPendingFarmInvitationsForFarm } from "@/features/settings/users.server"

export async function getSettingsPageInitialData(params: { farmId: string | null }) {
  const { user, accessToken } = await requireUserContext()

  return runServerReadThrough({
    keyParts: ["settings-page", user.id, params.farmId],
    tags: params.farmId ? [cacheTags.farm(params.farmId)] : [],
    loader: async () => {
      const supabase = createAccessTokenClient(accessToken)
      const farmRole = await getFarmUserRole(supabase, { farmId: params.farmId, userId: user.id })
      const thresholdRow = params.farmId
        ? await supabase
            .from("alert_threshold")
            .select("*")
            .eq("scope", "farm")
            .eq("farm_id", params.farmId)
            .maybeSingle()
        : { data: null }

      return {
        farmRole,
        settingsLoad: {
          thresholdRow: thresholdRow.data ?? null,
          nextThresholdDenied: false,
        },
      }
    },
  })
}

export async function getSettingsUsersPageInitialData(params: { farmId: string | null }) {
  const { user, accessToken } = await requireUserContext()

  return runServerReadThrough({
    keyParts: ["settings-users-page", user.id, params.farmId],
    tags: params.farmId ? [cacheTags.farm(params.farmId)] : [],
    loader: async () => {
      const supabase = createAccessTokenClient(accessToken)
      const farmRole = await getFarmUserRole(supabase, { farmId: params.farmId, userId: user.id })
      const [members, pendingInvites] =
        params.farmId && farmRole === "admin"
          ? await Promise.all([
              listFarmMembersForFarm(params.farmId),
              listPendingFarmInvitationsForFarm(params.farmId),
            ])
          : [[], []]

      return { farmRole, members, pendingInvites }
    },
  })
}
