import { NextResponse } from "next/server"
import { serverApi } from "@/lib/axios"
import { buildDjangoHeaders } from "@/lib/bffAuth"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const res = await serverApi.post("/api/v1/tasks/close-week/", body, {
      headers: await buildDjangoHeaders(request),
    })
    return NextResponse.json(res.data)
  } catch (error: any) {
    return NextResponse.json(
      { error: error.response?.data?.detail || "Ошибка закрытия недели" },
      { status: error.response?.status || 500 },
    )
  }
}
