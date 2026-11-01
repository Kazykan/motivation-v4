import { api } from "@/lib/axios"

export type UserRole = "PARENT" | "CHILD"

export interface MeResponse {
  id: number
  telegram_id: number | null
  first_name: string
  last_name: string
  role: UserRole | ""
  onboarded: boolean
  family_id: number | null
  invite_code?: string
}

export const authApi = {
  async me(): Promise<MeResponse> {
    const res = await api.get("/api/auth/me")
    return res.data
  },
  async registerParent(): Promise<MeResponse> {
    const res = await api.post("/api/auth/me/register-parent")
    return res.data
  },
  async joinFamily(code: string, role: UserRole): Promise<MeResponse> {
    const res = await api.post("/api/auth/me/join-family", { code, role })
    return res.data
  },
}
