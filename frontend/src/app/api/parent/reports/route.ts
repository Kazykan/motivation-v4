import { NextResponse } from "next/server"
import { serverApi } from "@/lib/axios"
import { buildDjangoHeaders } from "@/lib/bffAuth"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const childId = searchParams.get("child_id")
    const weekStart = searchParams.get("week_start")

    const params: Record<string, any> = {}
    if (childId) params.child_id = childId
    if (weekStart) params.week_start = weekStart

    const res = await serverApi.get("/api/v1/tasks/reports-overview/", {
      params,
      headers: buildDjangoHeaders(request),
    })
    return NextResponse.json(res.data)
  } catch (error: any) {
    return NextResponse.json(
      { error: error.response?.data?.detail || "Ошибка при получении недельных отчетов" },
      { status: error.response?.status || 500 },
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()

    // Если пришёл child_id + week_start — создаём/закрываем неделю
    // через специализированный action (рассчитывает суммы сам).
    // Иначе — старое поведение: прямое создание WeeklyReport.
    if (body?.child_id && body?.week_start) {
      const res = await serverApi.post("/api/v1/tasks/close-week/", body, {
        headers: buildDjangoHeaders(request),
      })
      return NextResponse.json(res.data)
    }

    const res = await serverApi.post("/api/v1/weekly-reports/", body, {
      headers: buildDjangoHeaders(request),
    })
    return NextResponse.json(res.data)
  } catch (error: any) {
    return NextResponse.json(
      { error: error.response?.data?.detail || "Ошибка при создании/обновлении отчета" },
      { status: error.response?.status || 500 },
    )
  }
}
