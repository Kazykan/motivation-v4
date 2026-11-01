import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { serverApi } from "@/lib/axios"
import { setSessionCookie } from "@/lib/session"

export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get("code")
  const state = url.searchParams.get("state")
  const error = url.searchParams.get("error")

  const base = process.env.NEXT_PUBLIC_APP_URL || url.origin

  if (error || !code) {
    return NextResponse.redirect(`${base}/?auth_error=google_cancelled`)
  }

  const jar = await cookies()
  const expectedState = jar.get("google_oauth_state")?.value
  jar.delete("google_oauth_state")

  if (!state || !expectedState || state !== expectedState) {
    return NextResponse.redirect(`${base}/?auth_error=google_state`)
  }

  const clientId = process.env.GOOGLE_CLIENT_ID!
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET!
  const redirectUri = process.env.GOOGLE_REDIRECT_URI!

  try {
    // 1. Обмен code → tokens
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    })
    if (!tokenRes.ok) throw new Error("token_exchange_failed")
    const tokens = await tokenRes.json()

    // 2. Валидация id_token через официальный endpoint Google
    const infoRes = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${tokens.id_token}`,
    )
    if (!infoRes.ok) throw new Error("id_token_invalid")
    const info = await infoRes.json()

    if (info.aud !== clientId) throw new Error("aud_mismatch")
    if (!["accounts.google.com", "https://accounts.google.com"].includes(info.iss)) {
      throw new Error("iss_mismatch")
    }
    if (!info.sub) throw new Error("sub_missing")

    // 3. Вызов Django: находит/создаёт пользователя по google_id
    const djangoRes = await serverApi.post("/api/v1/auth/oauth/", {
      provider: "google",
      provider_user_id: info.sub,
      email: info.email ?? "",
      first_name: info.given_name ?? "",
      last_name: info.family_name ?? "",
    })

    // 4. Сохраняем сессию BFF (Django вернул user payload)
    await setSessionCookie({
      provider: "google",
      provider_user_id: info.sub,
      django_user_id: djangoRes.data.id,
    })

    return NextResponse.redirect(`${base}/`)
  } catch (e: any) {
    console.error("[google callback]", e?.message ?? e)
    return NextResponse.redirect(`${base}/?auth_error=google_failed`)
  }
}
