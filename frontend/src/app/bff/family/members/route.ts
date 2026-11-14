import { NextResponse } from "next/server"
import { serverApi } from "@/lib/axios"
import { buildDjangoHeaders } from "@/lib/bffAuth"

export async function GET(request: Request) {
  try {
    const res = await serverApi.get("/api/v1/users/family-members/", {
      headers: await buildDjangoHeaders(request), // <-- Это обязательно
    })
    return NextResponse.json(res.data)
  } catch (error: any) {
    return NextResponse.json(
      { error: error.response?.data?.detail || "Ошибка получения членов семьи" },
      { status: error.response?.status || 500 },
    )
  }
}
