import { NextResponse } from "next/server"
import { api } from "@/lib/axios"

const isTestMode = process.env.NEXT_PUBLIC_TEST_MODE === "true"

export async function GET(request: Request) {
  try {
    const headers: Record<string, string> = {}
    
    if (isTestMode) {
      headers["X-Parent-Telegram-Id"] = process.env.NEXT_PUBLIC_PARENT_TELEGRAM_ID || ""
    }

    const res = await api.get("/api/users/", {
      params: { is_child: true },
      headers,
    })

    return NextResponse.json(res.data)
  } catch (error: any) {
    return NextResponse.json(
      { error: "Ошибка при получении данных" },
      { status: error.response?.status || 500 },
    )
  }
}