import { createHmac, timingSafeEqual } from "crypto"
import { cookies } from "next/headers"

const COOKIE_NAME = "bff_session"
const SECRET = process.env.AUTH_SESSION_SECRET ?? ""

function sign(payload: string): string {
  return createHmac("sha256", SECRET).update(payload).digest("hex")
}

export function encodeSession(data: Record<string, unknown>): string {
  const body = Buffer.from(JSON.stringify(data)).toString("base64url")
  return `${body}.${sign(body)}`
}

export function decodeSession(raw: string | undefined): Record<string, any> | null {
  if (!raw || !SECRET) return null
  const [body, sig] = raw.split(".")
  if (!body || !sig) return null
  const expected = sign(body)
  if (expected.length !== sig.length || !timingSafeEqual(Buffer.from(expected), Buffer.from(sig))) {
    return null
  }
  try {
    return JSON.parse(Buffer.from(body, "base64url").toString())
  } catch {
    return null
  }
}

export async function setSessionCookie(data: Record<string, unknown>) {
  const jar = await cookies()
  jar.set(COOKIE_NAME, encodeSession(data), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  })
}

export async function readSessionCookie() {
  const jar = await cookies()
  return decodeSession(jar.get(COOKIE_NAME)?.value)
}

export async function clearSessionCookie() {
  const jar = await cookies()
  jar.delete(COOKIE_NAME)
}
