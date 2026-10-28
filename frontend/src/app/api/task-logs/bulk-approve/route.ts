import { NextResponse } from "next/server"
import { serverApi } from "@/lib/axios"


export async function POST(request: Request) {
  try {
    const body = await request.json()
    const headers: Record<string, string> = {}

    const authHeader = request.headers.get("Authorization")
    if (authHeader) headers["Authorization"] = authHeader

    const res = await serverApi.post("/api/v1/task-logs/bulk-approve/", body, { headers })
    return NextResponse.json(res.data)
  } catch (error: any) {
    return NextResponse.json(
      { error: "Ошибка массового подтверждения" },
      { status: error.response?.status || 500 },
    )
  }
}
