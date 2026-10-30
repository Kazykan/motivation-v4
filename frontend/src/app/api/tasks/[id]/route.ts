import { NextResponse } from "next/server"
import { serverApi } from "@/lib/axios"
import { buildDjangoHeaders } from "@/lib/bffAuth"

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params
    const body = await request.json()
    const res = await serverApi.put(`/api/v1/tasks/${id}/`, body, {
      headers: buildDjangoHeaders(request),
    })
    return NextResponse.json(res.data)
  } catch (error: any) {
    return NextResponse.json(
      { error: error.response?.data || "Ошибка при обновлении задачи" },
      { status: error.response?.status || 500 },
    )
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params
    await serverApi.delete(`/api/v1/tasks/${id}/`, {
      headers: buildDjangoHeaders(request),
    })
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.response?.data || "Ошибка при удалении задачи" },
      { status: error.response?.status || 500 },
    )
  }
}
