import type { NextRequest } from "next/server"
import { buildLogoutResponse } from "@/lib/server/logout"

export async function POST(request: NextRequest) {
  return buildLogoutResponse(request)
}
