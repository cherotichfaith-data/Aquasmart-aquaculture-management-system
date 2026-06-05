"use server"

import { z } from "zod"
import { cacheTags } from "@/lib/cache/tags"
import { requireMutationActionUser } from "@/lib/server/mutation-actions"
import { revalidateWriteTags } from "@/lib/server/write-through"
import { createAdminClient } from "@/lib/supabase/admin"
import { isSbPermissionDenied, logSbError } from "@/lib/supabase/log"
import { BIOLOGICAL_GROWTH_STAGE_VALUES } from "@/lib/stage-filter"
import type { Database } from "@/lib/types/database"

type Row<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Row"]
type Insert<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Insert"]

type MutationMeta = {
  farmId: string
  systemId?: number | null
  date: string
}

type DbErrorLike = {
  code?: string
  message?: string
  details?: string
}

export type SystemInput = Insert<"system">
export type FingerlingSupplierInput = Insert<"fingerling_supplier">
export type FingerlingBatchInput = Insert<"fingerling_batch">

const systemSchema = z.object({
  farm_id: z.string().uuid(),
  commissioned_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  unit: z.string().max(120).nullable().optional(),
  name: z.string().min(1).max(120),
  type: z.enum(["rectangular_cage", "circular_cage", "pond", "tank"]),
  growth_stage: z.enum(BIOLOGICAL_GROWTH_STAGE_VALUES),
  volume: z.number().min(0).nullable().optional(),
  depth: z.number().min(0).nullable().optional(),
  is_active: z.boolean().optional(),
})

const fingerlingSupplierSchema = z.object({
  company_name: z.string().trim().min(1).max(255),
  location_country: z.string().trim().min(1).max(255),
  location_city: z.string().trim().max(255).nullable().optional(),
})

const fingerlingBatchSchema = z.object({
  farm_id: z.string().uuid(),
  name: z.string().trim().min(1).max(255),
  date_of_delivery: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  supplier_id: z.number().int().positive(),
  number_of_fish: z.number().finite().positive(),
  abw: z.number().finite().positive(),
})

const farmWorkspaceSchema = z.object({
  name: z.string().trim().min(2, "Farm name is required.").max(120),
  location: z.string().trim().min(2, "Location is required.").max(255),
  organizationId: z.string().uuid().nullable().optional(),
  organizationName: z.string().trim().min(2).max(120).optional(),
})

type FarmWorkspaceInput = z.infer<typeof farmWorkspaceSchema>

function isDuplicateSystemNameError(error: unknown) {
  if (!error || typeof error !== "object") return false
  const dbError = error as DbErrorLike
  return (
    dbError.code === "23505" &&
    /system_active_name_farm_unique|system_name_farm_unique|farm_id, name|duplicate key/i.test(
      `${dbError.message ?? ""}\n${dbError.details ?? ""}`,
    )
  )
}

function isDuplicateFingerlingSupplierNameError(error: unknown) {
  if (!error || typeof error !== "object") return false
  const dbError = error as DbErrorLike
  return (
    dbError.code === "23505" &&
    /supplier_name_key|fingerling_supplier.*company_name|duplicate key/i.test(
      `${dbError.message ?? ""}\n${dbError.details ?? ""}`,
    )
  )
}

function slugify(value: string) {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")

  return slug || "organization"
}

export async function createFarmWorkspaceAction(input: FarmWorkspaceInput): Promise<{ farmId: string; organizationId: string }> {
  const { user } = await requireMutationActionUser("farm:workspace:create")

  let payload: FarmWorkspaceInput
  try {
    payload = farmWorkspaceSchema.parse(input)
  } catch (error) {
    throw new Error(
      error instanceof z.ZodError
        ? error.issues[0]?.message ?? "Invalid farm workspace payload."
        : "Invalid request body.",
    )
  }

  let admin: ReturnType<typeof createAdminClient>
  try {
    admin = createAdminClient()
  } catch (error) {
    logSbError("farm:workspace:createAdminClient", error)
    throw new Error("Server farm creation is not configured. Set SUPABASE_SERVICE_ROLE_KEY.")
  }

  const fallbackOwner =
    typeof user.user_metadata?.full_name === "string"
      ? user.user_metadata.full_name
      : typeof user.user_metadata?.name === "string"
        ? user.user_metadata.name
        : user.email ?? ""

  const { error: baseProfileError } = await admin.from("user_profile").upsert(
    {
      user_id: user.id,
      full_name: fallbackOwner || null,
      email: user.email ?? null,
    },
    { onConflict: "user_id" },
  )

  if (baseProfileError) {
    logSbError("farm:workspace:upsertBaseProfile", baseProfileError)
  }

  let organizationId = payload.organizationId ?? null
  let organizationName = payload.organizationName?.trim() || `${fallbackOwner || "AquaSmart"} Organization`

  if (organizationId) {
    const { data: organization, error: organizationError } = await admin
      .from("organization")
      .select("id, name, owner_id")
      .eq("id", organizationId)
      .maybeSingle()

    if (organizationError || !organization) {
      logSbError("farm:workspace:getOrganization", organizationError)
      throw new Error("Selected organization was not found.")
    }

    const { data: organizationFarms, error: organizationFarmsError } = await admin
      .from("farm")
      .select("id")
      .eq("organization_id", organizationId)

    if (organizationFarmsError) {
      logSbError("farm:workspace:getOrganizationFarms", organizationFarmsError)
    }

    const organizationFarmIds = (organizationFarms ?? []).map((row) => row.id)
    const { data: membership, error: membershipError } =
      organizationFarmIds.length > 0
        ? await admin
            .from("farm_user")
            .select("id")
            .eq("user_id", user.id)
            .in("farm_id", organizationFarmIds)
            .limit(1)
            .maybeSingle()
        : { data: null, error: null }

    if (membershipError) {
      logSbError("farm:workspace:getOrganizationMembership", membershipError)
    }

    if (!membership?.id && organization.owner_id !== user.id) {
      throw new Error("You do not have access to create farms in this organization.")
    }

    organizationName = organization.name
  } else {
    const organizationSlug = `${slugify(organizationName)}-${user.id.slice(0, 8)}-${Date.now().toString(36)}`
    const { data: organization, error: organizationError } = await admin
      .from("organization")
      .insert({
        name: organizationName,
        slug: organizationSlug,
        owner_id: user.id,
        is_active: true,
      })
      .select("id, name")
      .single()

    if (organizationError || !organization?.id) {
      logSbError("farm:workspace:createOrganization", organizationError)
      throw new Error("Unable to create the organization workspace.")
    }

    organizationId = organization.id
    organizationName = organization.name
  }

  const { data: farm, error: farmError } = await admin
    .from("farm")
    .insert({
      name: payload.name,
      location: payload.location,
      organization_id: organizationId,
    })
    .select("id")
    .single()

  if (farmError || !farm?.id) {
    logSbError("farm:workspace:createFarm", farmError)
    throw new Error("Unable to create the farm workspace.")
  }

  const { error: membershipError } = await admin.from("farm_user").upsert(
    {
      farm_id: farm.id,
      user_id: user.id,
      role: "admin",
    },
    { onConflict: "farm_id,user_id" },
  )

  if (membershipError) {
    logSbError("farm:workspace:createMembership", membershipError)
    throw new Error("Farm created, but owner access setup failed.")
  }

  const { error: thresholdError } = await admin.from("alert_threshold").insert({
    scope: "farm",
    farm_id: farm.id,
    low_do_threshold: 5,
    high_ammonia_threshold: 0.05,
    high_mortality_threshold: 2,
  } as Insert<"alert_threshold">)

  if (thresholdError) {
    logSbError("farm:workspace:createThresholds", thresholdError)
  }

  const role = "admin"
  const { error: profileError } = await admin.from("user_profile").upsert(
    {
      user_id: user.id,
      full_name: fallbackOwner || null,
      email: user.email ?? null,
      role,
      organization_id: organizationId,
      farm_id: farm.id,
    },
    { onConflict: "user_id" },
  )

  if (profileError) {
    logSbError("farm:workspace:upsertProfile", profileError)
  }

  const { error: metadataError } = await admin.auth.admin.updateUserById(user.id, {
    user_metadata: {
      ...(typeof user.user_metadata === "object" && user.user_metadata ? user.user_metadata : {}),
      role,
      organization_id: organizationId,
      organization_name: organizationName,
      farm_id: farm.id,
      farm_name: payload.name,
      location: payload.location,
    },
  })

  if (metadataError) {
    logSbError("farm:workspace:updateUserMetadata", metadataError)
  }

  revalidateWriteTags([cacheTags.farmOptions(user.id), cacheTags.farm(farm.id)])

  return { farmId: farm.id, organizationId }
}

export async function createSystemAction(
  payload: SystemInput,
): Promise<{ data: Row<"system">; meta: MutationMeta }> {
  const { supabase } = await requireMutationActionUser("system:create")

  let parsedPayload: z.infer<typeof systemSchema>
  try {
    parsedPayload = systemSchema.parse(payload)
  } catch (error) {
    throw new Error(
      error instanceof z.ZodError ? error.issues[0]?.message ?? "Invalid system payload." : "Invalid request body.",
    )
  }

  const { data, error } = await supabase
    .from("system")
    .insert({
      farm_id: parsedPayload.farm_id,
      name: parsedPayload.name,
      type: parsedPayload.type,
      growth_stage: parsedPayload.growth_stage,
      commissioned_at: parsedPayload.commissioned_at ?? null,
      unit: parsedPayload.unit?.trim() ? parsedPayload.unit.trim() : null,
      is_active: parsedPayload.is_active ?? true,
      cage_status: "available",
      volume: parsedPayload.volume ?? null,
      depth: parsedPayload.depth ?? null,
    })
    .select()
    .single()

  if (error || !data) {
    logSbError("system:create:insert", error)
    if (isDuplicateSystemNameError(error)) {
      throw new Error(`A system named "${parsedPayload.name}" already exists in this farm.`)
    }
    if (isSbPermissionDenied(error)) {
      throw new Error("Unable to create system.")
    }
    throw new Error("Unable to create system.")
  }

  revalidateWriteTags([
    cacheTags.farm(parsedPayload.farm_id),
    cacheTags.systems(parsedPayload.farm_id),
    cacheTags.dashboard(parsedPayload.farm_id),
    cacheTags.reports(parsedPayload.farm_id, "recent-entries"),
  ])

  return {
    data,
    meta: {
      farmId: parsedPayload.farm_id,
      systemId: data.id,
      date: data.created_at,
    },
  }
}

export async function createFingerlingSupplierAction(
  payload: FingerlingSupplierInput,
): Promise<{ data: Row<"fingerling_supplier"> }> {
  const { supabase } = await requireMutationActionUser("fingerling-supplier:create")

  let parsedPayload: z.infer<typeof fingerlingSupplierSchema>
  try {
    parsedPayload = fingerlingSupplierSchema.parse(payload)
  } catch (error) {
    throw new Error(
      error instanceof z.ZodError
        ? error.issues[0]?.message ?? "Invalid fingerling supplier payload."
        : "Invalid request body.",
    )
  }

  const { data: existingSupplier, error: existingSupplierError } = await supabase
    .from("fingerling_supplier")
    .select()
    .eq("company_name", parsedPayload.company_name)
    .maybeSingle()

  if (!existingSupplierError && existingSupplier) {
    return { data: existingSupplier }
  }

  const { data, error } = await supabase
    .from("fingerling_supplier")
    .insert({
      company_name: parsedPayload.company_name,
      location_country: parsedPayload.location_country,
      location_city: parsedPayload.location_city?.trim() ? parsedPayload.location_city.trim() : null,
    })
    .select()
    .single()

  if (error || !data) {
    logSbError("fingerling-supplier:create:insert", error)
    if (isDuplicateFingerlingSupplierNameError(error)) {
      const { data: existing, error: existingError } = await supabase
        .from("fingerling_supplier")
        .select()
        .eq("company_name", parsedPayload.company_name)
        .maybeSingle()

      if (!existingError && existing) {
        return { data: existing }
      }
    }
    if (isSbPermissionDenied(error)) {
      throw new Error("Unable to create fingerling supplier.")
    }
    throw new Error("Unable to create fingerling supplier.")
  }

  revalidateWriteTags([cacheTags.fingerlingSuppliers()])

  return { data }
}

export async function createFingerlingBatchAction(
  payload: FingerlingBatchInput,
): Promise<{ data: Row<"fingerling_batch"> }> {
  const { supabase } = await requireMutationActionUser("fingerling-batch:create")

  let parsedPayload: z.infer<typeof fingerlingBatchSchema>
  try {
    parsedPayload = fingerlingBatchSchema.parse(payload)
  } catch (error) {
    throw new Error(
      error instanceof z.ZodError
        ? error.issues[0]?.message ?? "Invalid fingerling batch payload."
        : "Invalid request body.",
    )
  }

  const { data, error } = await supabase
    .from("fingerling_batch")
    .insert({
      farm_id: parsedPayload.farm_id,
      name: parsedPayload.name,
      date_of_delivery: parsedPayload.date_of_delivery,
      supplier_id: parsedPayload.supplier_id,
      number_of_fish: parsedPayload.number_of_fish,
      abw: parsedPayload.abw,
    })
    .select()
    .single()

  if (error || !data) {
    logSbError("fingerling-batch:create:insert", error)
    if (isSbPermissionDenied(error)) {
      throw new Error("Unable to create fingerling batch.")
    }
    throw new Error("Unable to create fingerling batch.")
  }

  revalidateWriteTags([cacheTags.batchOptions(parsedPayload.farm_id)])

  return { data }
}
