import { NextResponse } from "next/server"
import { randomBytes } from "crypto"
import { cookies } from "next/headers"

export async function GET(request: Request) {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const redirectUri = process.env.GOOGLE_REDIRECT_URI
  if (!clientId || !redirectUri) {
    return NextResponse.json({ error: "Google OAuth не настроен" }, { status: 500 })
  }

  const state = randomBytes(16).toString("hex")
  const jar = await cookies()
  jar.set("google_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 600,
  })

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state,
    access_type: "online",
    prompt: "select_account",
  })

  return NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`)
}
