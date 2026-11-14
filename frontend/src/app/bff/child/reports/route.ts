import { NextResponse } from "next/server"
import { serverApi } from "@/lib/axios"
import { buildDjangoHeaders } from "@/lib/bffAuth"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const params: Record<string, any> = {}
    const weekStart = searchParams.get("week_start")
    if (weekStart) params.week_start = weekStart

    const res = await serverApi.get("/api/v1/weekly-reports/", {
      params,
      headers: await buildDjangoHeaders(request),
    })
    return NextResponse.json(res.data)
  } catch (error: any) {
    return NextResponse.json(
      { error: error.response?.data?.detail || "Ошибка получения отчётов" },
      { status: error.response?.status || 500 },
    )
  }
}