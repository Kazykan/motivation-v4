// frontend/src/app/api/children/route.ts
import { NextResponse } from "next/server"
import { serverApi } from "@/lib/axios"
import { buildDjangoHeaders } from "@/lib/bffAuth"

export async function GET(request: Request) {
  try {
    const res = await serverApi.get("/api/v1/users/", {
      params: { is_child: true },
      headers: buildDjangoHeaders(request),
    })
    return NextResponse.json(res.data)
  } catch (error: any) {
    return NextResponse.json(
      { error: error.response?.data || "Ошибка при получении данных" },
      { status: error.response?.status || 500 },
    )
  }
}
