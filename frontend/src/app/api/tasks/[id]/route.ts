import { NextResponse } from "next/server"
import { serverApi } from "@/lib/axios"


export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params
    const body = await request.json()
    const headers: Record<string, string> = {}

    const authHeader = request.headers.get("Authorization")
    if (authHeader) headers["Authorization"] = authHeader

    const res = await serverApi.put(`/api/v1/tasks/${id}/`, body, { headers })
    return NextResponse.json(res.data)
  } catch (error: any) {
    return NextResponse.json(
      { error: error.response?.data?.detail || "Ошибка при обновлении задачи" },
      { status: error.response?.status || 500 },
    )
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params
    const headers: Record<string, string> = {}

    const authHeader = request.headers.get("Authorization")
    if (authHeader) headers["Authorization"] = authHeader

    await serverApi.delete(`/api/v1/tasks/${id}/`, { headers })
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json(
      { error: "Ошибка при удалении задачи" },
      { status: error.response?.status || 500 },
    )
  }
}
