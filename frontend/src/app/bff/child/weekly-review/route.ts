import { NextResponse } from "next/server"
import { serverApi } from "@/lib/axios"
import { buildDjangoHeaders } from "@/lib/bffAuth"
import { readSessionCookie } from "@/lib/session"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const weekStart = searchParams.get("week_start")

    const session = await readSessionCookie()
    const childId = session?.django_user_id
    if (!childId) {
      return NextResponse.json({ error: "Нет сессии" }, { status: 401 })
    }

    const params: Record<string, any> = { child_id: childId }
    if (weekStart) params.week_start = weekStart

    const res = await serverApi.get("/api/v1/tasks/weekly-review/", {
      params,
      headers: await buildDjangoHeaders(request),
    })
    return NextResponse.json(res.data)
  } catch (error: any) {
    return NextResponse.json(
      { error: error.response?.data?.detail || "Ошибка получения обзора недели" },
      { status: error.response?.status || 500 },
    )
  }
}
