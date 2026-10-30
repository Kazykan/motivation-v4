import { NextResponse } from "next/server"
import { serverApi } from "@/lib/axios"

const isTestMode = process.env.NEXT_PUBLIC_TEST_MODE === "true"

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params
    const body = await request.json()
    const headers: Record<string, string> = {}
    if (isTestMode) {
      headers["X-Parent-Telegram-Id"] = process.env.NEXT_PUBLIC_PARENT_TELEGRAM_ID || ""
    }

    const authHeader = request.headers.get("Authorization")
    if (authHeader) headers["Authorization"] = authHeader

    const res = await serverApi.patch(`/api/v1/task-logs/${id}/`, body, { headers })
    return NextResponse.json(res.data)
  } catch (error: any) {
    return NextResponse.json(
      { error: "Ошибка обновления статуса лога" },
      { status: error.response?.status || 500 },
    )
  }
}
