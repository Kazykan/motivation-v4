import { NextResponse } from "next/server"
import { serverApi } from "@/lib/axios"

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params
    const headers: Record<string, string> = {}

    const authHeader = request.headers.get("Authorization")
    if (authHeader) headers["Authorization"] = authHeader

    const res = await serverApi.get(`/api/v1/task-logs/${id}/history/`, { headers })
    return NextResponse.json(res.data)
  } catch (error: any) {
    return NextResponse.json(
      { error: "Ошибка получения истории" },
      { status: error.response?.status || 500 },
    )
  }
}
