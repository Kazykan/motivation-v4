import { readSessionCookie } from "./session"

export function extractInitData(request: Request): string | null {
  const auth = request.headers.get("Authorization")
  if (!auth) return null
  const [type, value] = auth.split(" ", 2)
  if (type?.toLowerCase() !== "tma" || !value) return null
  return value
}

export async function buildDjangoHeaders(request: Request): Promise<Record<string, string>> {
  const headers: Record<string, string> = {}
  const initData = extractInitData(request)
  if (initData) headers["X-Telegram-Init-Data"] = initData

  const session = await readSessionCookie() // ← await внутри
  if (session?.django_user_id) {
    headers["X-BFF-User-Id"] = String(session.django_user_id)
  }
  return headers
}
