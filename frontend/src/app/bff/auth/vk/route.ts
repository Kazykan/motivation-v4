import { NextResponse } from "next/server"
import { randomBytes, createHash } from "crypto"
import { cookies } from "next/headers"

function base64url(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}

export async function GET(request: Request) {
  const clientId = process.env.VK_CLIENT_ID
  const redirectUri = process.env.VK_REDIRECT_URI
  if (!clientId || !redirectUri) {
    return NextResponse.json({ error: "VK OAuth не настроен" }, { status: 500 })
  }

  // PKCE
  const codeVerifier = base64url(randomBytes(32))
  const codeChallenge = base64url(createHash("sha256").update(codeVerifier).digest())

  const state = randomBytes(16).toString("hex")

  const jar = await cookies()
  jar.set("vk_code_verifier", codeVerifier, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 600,
  })
  jar.set("vk_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 600,
  })

  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: "email",
    state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  })

  return NextResponse.redirect(`https://id.vk.com/authorize?${params.toString()}`)
}
