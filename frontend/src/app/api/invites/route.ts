import { NextResponse } from "next/server"
import { serverApi } from "@/lib/axios"
import { buildDjangoHeaders } from "@/lib/bffAuth"

export async function GET(request: Request) {
  try {
    const res = await serverApi.get("/api/v1/invites/current/", {
      headers: buildDjangoHeaders(request),
    })
    return NextResponse.json(res.data)
  } catch (error: any) {
    return NextResponse.json(
      { error: error.response?.data?.detail || "Ошибка получения кода" },
      { status: error.response?.status || 500 },
    )
  }
}

export async function POST(request: Request) {
  try {
    const res = await serverApi.post(
      "/api/v1/invites/",
      {},
      { headers: buildDjangoHeaders(request) },
    )
    return NextResponse.json(res.data)
  } catch (error: any) {
    return NextResponse.json(
      { error: error.response?.data?.detail || "Ошибка создания кода" },
      { status: error.response?.status || 500 },
    )
  }
}
