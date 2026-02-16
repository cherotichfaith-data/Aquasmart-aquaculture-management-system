import { type NextRequest, NextResponse } from "next/server";

export async function updateSession(_request: NextRequest) {
  return NextResponse.next();
}
