import { NextResponse } from "next/server"
import { serverApi } from "@/lib/axios"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const headers: Record<string, string> = {}

    const authHeader = request.headers.get("Authorization")
    if (authHeader) headers["Authorization"] = authHeader

    const params: Record<string, any> = {}
    const childId = searchParams.get("child_id")
    const date = searchParams.get("date")
    if (childId) params.child_id = childId
    if (date) params.date = date

    const res = await serverApi.get("/api/v1/task-logs/", { params, headers })
    return NextResponse.json(res.data)
  } catch (error: any) {
    return NextResponse.json(
      { error: "Ошибка получения логов" },
      { status: error.response?.status || 500 },
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const headers: Record<string, string> = {}

    const authHeader = request.headers.get("Authorization")
    if (authHeader) headers["Authorization"] = authHeader

    const res = await serverApi.post("/api/v1/task-logs/", body, { headers })
    return NextResponse.json(res.data)
  } catch (error: any) {
    return NextResponse.json(
      { error: error.response?.data?.detail || "Ошибка создания лога" },
      { status: error.response?.status || 500 },
    )
  }
}
