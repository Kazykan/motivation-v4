import { NextResponse } from "next/server"
import { serverApi } from "@/lib/axios"
import { buildDjangoHeaders } from "@/lib/bffAuth"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const childId = searchParams.get("child_id")

    const params: Record<string, any> = {}
    if (childId) params.child_id = childId

    const res = await serverApi.get("/api/v1/tasks/", {
      params,
      headers: buildDjangoHeaders(request),
    })
    return NextResponse.json(res.data)
  } catch (error: any) {
    return NextResponse.json(
      { error: error.response?.data || "Ошибка при получении задач" },
      { status: error.response?.status || 500 },
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const res = await serverApi.post("/api/v1/tasks/", body, {
      headers: buildDjangoHeaders(request),
    })
    return NextResponse.json(res.data)
  } catch (error: any) {
    return NextResponse.json(
      { error: error.response?.data || "Ошибка при создании задачи" },
      { status: error.response?.status || 500 },
    )
  }
}
