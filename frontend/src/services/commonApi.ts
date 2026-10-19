import { api } from "@/lib/axios"

export const commonApi = {
  async getMe() {
    const res = await api.get("/api/users/me/")
    return res.data
  },

  async joinFamily(code: string) {
    const res = await api.post("/api/family-invite-codes/join/", { code })
    return res.data
  },
}
