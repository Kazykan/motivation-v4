import { NextResponse } from "next/server"
import { api } from "@/lib/axios"

const isTestMode = process.env.NEXT_PUBLIC_TEST_MODE === "true"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const childId = searchParams.get("child_id")

    const headers: Record<string, string> = {}

    if (isTestMode) {
      headers["X-Parent-Telegram-Id"] = process.env.NEXT_PUBLIC_PARENT_TELEGRAM_ID || ""
    }

    const params: Record<string, any> = {}
    if (childId) {
      params.child_id = childId
    }

    const res = await api.get("/api/tasks/", {
      params,
      headers,
    })

    return NextResponse.json(res.data)
  } catch (error: any) {
    return NextResponse.json(
      { error: "Ошибка при получении задач" },
      { status: error.response?.status || 500 },
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const headers: Record<string, string> = {}

    if (isTestMode) {
      headers["X-Parent-Telegram-Id"] = process.env.NEXT_PUBLIC_PARENT_TELEGRAM_ID || ""
    }

    const res = await api.post("/api/tasks/", body, { headers })

    return NextResponse.json(res.data)
  } catch (error: any) {
    return NextResponse.json(
      { error: "Ошибка при создании задачи" },
      { status: error.response?.status || 500 },
    )
  }
}
