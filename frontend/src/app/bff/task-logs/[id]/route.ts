import { NextResponse } from "next/server"
import { serverApi } from "@/lib/axios"
import { buildDjangoHeaders } from "@/lib/bffAuth"

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params
    const body = await request.json()
    const headers = await buildDjangoHeaders(request)

    const res = await serverApi.patch(`/api/v1/task-logs/${id}/`, body, { headers })
    return NextResponse.json(res.data)
  } catch (error: any) {
    return NextResponse.json(
      { error: "Ошибка обновления статуса лога" },
      { status: error.response?.status || 500 },
    )
  }
}
