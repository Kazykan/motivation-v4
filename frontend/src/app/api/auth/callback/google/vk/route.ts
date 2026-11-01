import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { serverApi } from "@/lib/axios"
import { setSessionCookie } from "@/lib/session"

export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get("code")
  const deviceId = url.searchParams.get("device_id")
  const state = url.searchParams.get("state")
  const error = url.searchParams.get("error")

  const base = process.env.NEXT_PUBLIC_APP_URL || url.origin

  if (error || !code || !deviceId) {
    return NextResponse.redirect(`${base}/?auth_error=vk_cancelled`)
  }

  const jar = await cookies()
  const expectedState = jar.get("vk_oauth_state")?.value
  const codeVerifier = jar.get("vk_code_verifier")?.value
  jar.delete("vk_oauth_state")
  jar.delete("vk_code_verifier")

  if (!state || !expectedState || state !== expectedState) {
    return NextResponse.redirect(`${base}/?auth_error=vk_state`)
  }
  if (!codeVerifier) {
    return NextResponse.redirect(`${base}/?auth_error=vk_pkce`)
  }

  const clientId = process.env.VK_CLIENT_ID!
  const redirectUri = process.env.VK_REDIRECT_URI!

  try {
    // Обмен code → tokens
    const tokenRes = await fetch("https://id.vk.com/oauth2/auth", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        client_id: clientId,
        redirect_uri: redirectUri,
        device_id: deviceId,
        code_verifier: codeVerifier,
      }),
    })
    if (!tokenRes.ok) throw new Error("vk_token_exchange_failed")
    const tokens = await tokenRes.json()

    // Получаем профиль по access_token
    const infoRes = await fetch(
      `https://id.vk.com/oauth2/user_info?access_token=${encodeURIComponent(tokens.access_token)}&client_id=${clientId}`,
    )
    if (!infoRes.ok) throw new Error("vk_userinfo_failed")
    const info = await infoRes.json()

    // В ответе VK ID: { user: { user_id, first_name, last_name, email? } }
    const user = info.user ?? info
    if (!user?.user_id) throw new Error("vk_user_id_missing")

    const djangoRes = await serverApi.post("/api/v1/auth/oauth/", {
      provider: "vk",
      provider_user_id: String(user.user_id),
      email: user.email ?? "",
      first_name: user.first_name ?? "",
      last_name: user.last_name ?? "",
    })

    await setSessionCookie({
      provider: "vk",
      provider_user_id: String(user.user_id),
      django_user_id: djangoRes.data.id,
    })

    return NextResponse.redirect(`${base}/`)
  } catch (e: any) {
    console.error("[vk callback]", e?.message ?? e)
    return NextResponse.redirect(`${base}/?auth_error=vk_failed`)
  }
}
