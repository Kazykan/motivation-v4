import { api } from "@/lib/axios"

export const authApi = {
  async me() {
    const res = await api.get("/api/auth/me")
    return res.data
  },
  async registerParent() {
    const res = await api.post("/api/auth/register-parent")
    return res.data
  },
  async joinFamily(code: string) {
    const res = await api.post("/api/auth/join-family", { code })
    return res.data
  },
}
