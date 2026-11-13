import { NextResponse } from "next/server"
import { serverApi } from "@/lib/axios"
import { buildDjangoHeaders, extractInitData } from "@/lib/bffAuth"
import { readSessionCookie, setSessionCookie } from "@/lib/session"

export async function GET(request: Request) {
  const session = await readSessionCookie()
  const initData = extractInitData(request)

  // Ни сессии, ни initData — аутентификации нет, Django дёргать незачем.
  if (!session?.django_user_id && !initData) {
    return NextResponse.json({ error: "Нет аутентификации" }, { status: 401 })
  }

  try {
    const res = await serverApi.get("/api/v1/auth/me/", {
      headers: await buildDjangoHeaders(request),
    })

    if (!session?.django_user_id) {
      await setSessionCookie({
        provider: "telegram",
        provider_user_id: String(res.data.telegram_id ?? ""),
        django_user_id: res.data.id,
      })
    }

    return NextResponse.json(res.data)
  } catch (error: any) {
    return NextResponse.json(
      { error: error.response?.data?.detail || "Ошибка профиля" },
      { status: error.response?.status || 500 },
    )
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json()
    const res = await serverApi.patch("/api/v1/auth/me/", body, {
      headers: await buildDjangoHeaders(request),
    })
    return NextResponse.json(res.data)
  } catch (error: any) {
    return NextResponse.json(
      { error: error.response?.data?.detail || "Ошибка обновления профиля" },
      { status: error.response?.status || 500 },
    )
  }
}
