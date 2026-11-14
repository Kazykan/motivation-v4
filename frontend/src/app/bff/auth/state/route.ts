// frontend/src/app/api/auth/state/route.ts
import { NextResponse } from "next/server"
import { readSessionCookie } from "@/lib/session"

export async function GET() {
  const session = await readSessionCookie()
  return NextResponse.json({
    hasBffSession: Boolean(session?.django_user_id),
  })
}
