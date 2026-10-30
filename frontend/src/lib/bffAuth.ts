// frontend/src/lib/bffAuth.ts
import { NextRequest } from "next/server"

export function extractInitData(request: Request): string | null {
  const auth = request.headers.get("Authorization")
  if (!auth) return null
  const [type, value] = auth.split(" ", 2)
  if (type?.toLowerCase() !== "tma" || !value) return null
  return value
}

export function buildDjangoHeaders(request: Request): Record<string, string> {
  const initData = extractInitData(request)
  const headers: Record<string, string> = {}
  if (initData) {
    headers["X-Telegram-Init-Data"] = initData
  }
  return headers
}
