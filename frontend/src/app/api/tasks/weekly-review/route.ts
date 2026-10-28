import { NextResponse } from "next/server"
import { serverApi } from "@/lib/axios"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const childId = searchParams.get("child_id")
    const weekStart = searchParams.get("week_start")

    const headers: Record<string, string> = {}

    const authHeader = request.headers.get("Authorization")
    if (authHeader) headers["Authorization"] = authHeader

    const params: Record<string, any> = {}
    if (childId) params.child_id = childId
    if (weekStart) params.week_start = weekStart

    const res = await serverApi.get("/api/v1/tasks/weekly-review/", { params, headers })
    return NextResponse.json(res.data)
  } catch (error: any) {
    return NextResponse.json(
      { error: error.response?.data?.detail || "Ошибка получения обзора недели" },
      { status: error.response?.status || 500 },
    )
  }
}
