import { NextResponse } from "next/server"
import { serverApi } from "@/lib/axios"

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params
    const body = await request.json()
    const headers: Record<string, string> = {}

    const res = await serverApi.patch(`/weekly-reports/${id}/`, body, { headers })
    return NextResponse.json(res.data)
  } catch (error: any) {
    return NextResponse.json(
      { error: "Ошибка при закрытии недели" },
      { status: error.response?.status || 500 },
    )
  }
}
