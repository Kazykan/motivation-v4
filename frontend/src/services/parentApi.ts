import { api } from "@/lib/axios"
import { LogStatusValue } from "@/types/props"

export const parentApi = {
  // Все запросы — строго на BFF-роуты Next.js (/...).
  // Заголовки авторизации (X-Parent-Telegram-Id и т.п.) подставляются
  // на стороне Route Handlers, см. AI.md / BFF Pattern.

  async getChildren() {
    const res = await api.get("/children")
    return res.data
  },

  async getTasks(childId?: number) {
    const res = await api.get("/tasks", childId ? { params: { child_id: childId } } : undefined)
    return res.data
  },

  async createTask(data: {
    title: string
    description: string
    weekly_price: number
    child: number
    schedule_type: "FLEXIBLE" | "FIXED"
    target_count?: number | null
    target_days?: number[]
    is_active?: boolean
  }) {
    const res = await api.post("/tasks", data)
    return res.data
  },

  async updateTask(id: number, data: any) {
    const res = await api.put(`/tasks/${id}`, data)
    return res.data
  },

  async deleteTask(id: number) {
    await api.delete(`/tasks/${id}`)
  },

  async getTaskLogs(childId?: number, date?: string) {
    const params: Record<string, any> = {}
    if (childId) params.child_id = childId
    if (date) params.date = date
    const res = await api.get("/task-logs", { params })
    return res.data
  },

  async createTaskLog(data: { task: number; date: string; status: LogStatusValue }) {
    const res = await api.post("/task-logs", data)
    return res.data
  },

  async bulkApproveLogs(logIds: number[]) {
    const res = await api.post("/task-logs/bulk-approve", {
      log_ids: logIds,
    })
    return res.data
  },

  async updateTaskLogStatus(logId: number, status: LogStatusValue) {
    const res = await api.patch(`/task-logs/${logId}`, { status })
    return res.data
  },

  async getWeeklyReports(childId?: number, weekStart?: string) {
    const params: Record<string, any> = {}
    if (childId) params.child_id = childId
    if (weekStart) params.week_start = weekStart
    const res = await api.get("/parent/reports", { params })
    return res.data
  },

  async closeWeeklyReport(
    reportId: number,
    data: { is_payout_confirmed: boolean; manual_adjustment?: number; comment?: string },
  ) {
    const res = await api.patch(`/parent/reports/${reportId}/close`, data)
    return res.data
  },

  async getWeeklyReview(childId: number, weekStart?: string) {
    const params: Record<string, any> = { child_id: childId }
    if (weekStart) params.week_start = weekStart
    const res = await api.get("/tasks/weekly-review", { params })
    return res.data
  },

  async getTaskLogHistory(logId: number) {
    const res = await api.get(`/task-logs/${logId}/history`)
    return res.data
  },
  async closeWeek(payload: {
    child_id: number
    week_start: string
    is_payout_confirmed: boolean
    manual_adjustment?: number
    comment?: string
  }) {
    const res = await api.post("/tasks/close-week", payload)
    return res.data
  },
  async getCurrentInvite() {
    const res = await api.get("/invites")
    return res.data as {
      id: number
      code: string
      expires_at: string
      is_used: boolean
    }
  },

  async createInvite() {
    const res = await api.post("/invites")
    return res.data as {
      id: number
      code: string
      expires_at: string
      is_used: boolean
    }
  },

  async getFamilyMembers() {
    const res = await api.get("/family/members")
    return res.data
  },
}
