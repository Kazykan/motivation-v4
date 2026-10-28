// frontend/src/app/api/children/route.ts
import { NextResponse } from "next/server"
import { serverApi } from "@/lib/axios"

export async function GET() {
  try {
    const headers: Record<string, string> = {}

    const res = await serverApi.get("/api/v1/users/", {
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
