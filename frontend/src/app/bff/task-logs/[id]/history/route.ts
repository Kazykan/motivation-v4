import { NextResponse } from "next/server"
import { serverApi } from "@/lib/axios"
import { buildDjangoHeaders } from "@/lib/bffAuth"

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params
    const headers = await buildDjangoHeaders(request)
    const res = await serverApi.get(`/api/v1/task-logs/${id}/history/`, { headers })
    return NextResponse.json(res.data)
  } catch (error: any) {
    return NextResponse.json(
      { error: "Ошибка получения истории" },
      { status: error.response?.status || 500 },
    )
  }
}
